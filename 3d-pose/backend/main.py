"""
BadmintonIQ 3D Pose Pipeline — FastAPI backend
Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import json
import re
import shutil
import queue as std_queue
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiofiles
import cv2
from fastapi import BackgroundTasks, FastAPI, File, Query, UploadFile, WebSocket, WebSocketDisconnect

# ── Auto-generate self-signed TLS cert so phone camera works over HTTPS ───────
def _ensure_cert(cert_path, key_path):
    """Create cert.pem / key.pem if missing. Requires `cryptography` package."""
    if cert_path.exists() and key_path.exists():
        return
    try:
        import datetime, ipaddress, socket as _socket
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa

        # Collect all local IPs for the SAN list
        san_ips = [ipaddress.IPv4Address("127.0.0.1")]
        try:
            s = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
            s.settimeout(0.1); s.connect(("8.8.8.8", 80))
            san_ips.append(ipaddress.IPv4Address(s.getsockname()[0])); s.close()
        except Exception:
            pass

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "BadmintonIQ-local")])
        cert = (
            x509.CertificateBuilder()
            .subject_name(name).issuer_name(name)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.datetime.utcnow())
            .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=825))
            .add_extension(
                x509.SubjectAlternativeName(
                    [x509.IPAddress(ip) for ip in san_ips] +
                    [x509.DNSName("localhost")]
                ), critical=False,
            )
            .sign(key, hashes.SHA256())
        )
        cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
        key_path.write_bytes(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ))
        print(f"[SSL] Self-signed cert generated → {cert_path}")
    except Exception as exc:
        print(f"[SSL] Could not generate cert: {exc}")
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from app.pose.extractor import PoseExtractor

app = FastAPI(title="BadmintonIQ Pose Pipeline")

_CERT_DIR = Path(__file__).parent
SSL_CERT = _CERT_DIR / "cert.pem"
SSL_KEY  = _CERT_DIR / "key.pem"
_ensure_cert(SSL_CERT, SSL_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "sessions").mkdir(exist_ok=True)
(DATA_DIR / "labels").mkdir(exist_ok=True)

# session_id → thread-safe queue used to stream frames to the WebSocket handler
_process_queues: dict[str, std_queue.Queue] = {}
# session_id → cancel event; set() to stop the processing thread
_cancel_events: dict[str, threading.Event] = {}
# session_id → list of asyncio Queues (one per PC watcher) for live camera broadcast
_camera_watchers: dict[str, list] = {}

# ── WebRTC signaling rooms  session_id → {"phone": ws, "pc": ws} ─────────────
_rtc_rooms: dict[str, dict] = {}

JOINT_NAMES_17 = [
    "Hips", "Spine1", "Spine2", "Neck", "Head",
    "LeftArm", "LeftForeArm", "LeftHand",
    "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot",
]


def _slugify_label(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:48] or "label"


def _normalize_pose(kp: dict | None):
    if not kp or "Hips" not in kp:
        return None
    hips = kp.get("Hips")
    if not isinstance(hips, list) or len(hips) < 3:
        return None

    def dist(a, b):
        return sum((a[i] - b[i]) ** 2 for i in range(3)) ** 0.5

    scale = None
    for a, b in (("Hips", "Neck"), ("LeftArm", "RightArm"), ("LeftUpLeg", "RightUpLeg")):
        if a in kp and b in kp:
            d = dist(kp[a], kp[b])
            if d > 1e-6:
                scale = d
                break
    if not scale:
        scale = 1.0

    out = {}
    for name in JOINT_NAMES_17:
        p = kp.get(name)
        if isinstance(p, list) and len(p) >= 3:
            out[name] = [
                round((float(p[0]) - float(hips[0])) / scale, 5),
                round((float(p[1]) - float(hips[1])) / scale, 5),
                round((float(p[2]) - float(hips[2])) / scale, 5),
            ]
    return out if len(out) >= 8 else None


def _label_summary(path: Path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

    if data.get("schema") == "label_clip_v1":
        frames = data.get("frames") or []
        return {
            "label_id": data.get("label_id") or path.stem,
            "name": data.get("name") or path.stem,
            "color": data.get("color") or "#f59e0b",
            "enabled": data.get("enabled", True),
            "schema": "label_clip_v1",
            "frame_count": len(frames),
            "duration_ms": data.get("duration_ms"),
            "source_session_id": data.get("source_session_id"),
            "start_frame": data.get("start_frame"),
            "end_frame": data.get("end_frame"),
            "filename": path.name,
            "match_ready": bool(data.get("normalized_sequence")),
        }

    # Legacy pose JSON in data/labels: expose for preview/import list, but do not match.
    frames = data.get("frames") or []
    return {
        "label_id": path.stem,
        "name": path.stem,
        "color": "#64748b",
        "enabled": data.get("enabled", True),
        "schema": data.get("schema") or "legacy_pose_json",
        "frame_count": len(frames),
        "duration_ms": None,
        "source_session_id": None,
        "start_frame": None,
        "end_frame": None,
        "filename": path.name,
        "match_ready": False,
        "importable": True,
    }


def _legacy_frame_to_kp(frame: dict, keypoint_names: list[str]):
    persons = frame.get("persons") or []
    if not persons:
        return None
    person = persons[0]
    kps = person.get("kps") or []
    raw = {}
    for idx, name in enumerate(keypoint_names):
        if idx < len(kps):
            kp = kps[idx]
            if isinstance(kp, list) and len(kp) >= 2:
                x = float(kp[0])
                y = float(kp[1])
                z = float(kp[2]) if len(kp) >= 3 else 0.0
                raw[name] = [x, y, z]
    if not raw:
        return None

    def avg(a, b):
        if a in raw and b in raw:
            return [(raw[a][i] + raw[b][i]) / 2 for i in range(3)]
        return raw.get(a) or raw.get(b)

    shoulder_mid = avg("l_shoulder", "r_shoulder")
    hip_mid = avg("l_hip", "r_hip")

    out = {}
    if hip_mid:
        out["Hips"] = hip_mid
    if hip_mid and shoulder_mid:
        out["Spine1"] = [(hip_mid[i] * 0.67 + shoulder_mid[i] * 0.33) for i in range(3)]
        out["Spine2"] = [(hip_mid[i] * 0.33 + shoulder_mid[i] * 0.67) for i in range(3)]
        out["Neck"] = shoulder_mid
    elif shoulder_mid:
        out["Neck"] = shoulder_mid
    if raw.get("nose"):
        out["Head"] = raw["nose"]

    mapping = {
        "LeftArm": "l_shoulder",
        "LeftForeArm": "l_elbow",
        "LeftHand": "l_wrist",
        "RightArm": "r_shoulder",
        "RightForeArm": "r_elbow",
        "RightHand": "r_wrist",
        "LeftUpLeg": "l_hip",
        "LeftLeg": "l_knee",
        "LeftFoot": "l_ankle",
        "RightUpLeg": "r_hip",
        "RightLeg": "r_knee",
        "RightFoot": "r_ankle",
    }
    for canonical, source in mapping.items():
        if source in raw:
            out[canonical] = raw[source]

    return out if len(out) >= 8 else None


# ── Network info ─────────────────────────────────────────────────────────────

@app.get("/api/network-info")
async def network_info():
    import socket
    ips = []
    # Best-effort: connect to external address to discover outbound interface IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            ips.append(ip)
    except Exception:
        pass
    # Fallback: enumerate all AF_INET addresses for this hostname
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    return {"ips": ips, "port": 8000, "scheme": "https"}

# ── Gemini Connect ───────────────────────────────────────────────────────────

class GeminiConnectRequest(BaseModel):
    model: str = "gemini-2.5-flash"
    player: str = "Player"
    session: dict = {}
    systemPrompt: str = ""

@app.post("/api/gemini-connect")
async def gemini_connect(req: GeminiConnectRequest):
    import os
    import json
    import urllib.request
    import urllib.error
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return JSONResponse(status_code=500, content={"ok": False, "error": "Missing GEMINI_API_KEY on the server."})
    
    coach_prompt = f"""{req.systemPrompt}

คุณคือผู้เชี่ยวชาญวิเคราะห์การตีแบดมินตันจากข้อมูลเซนเซอร์ ให้ Feedback สั้น กระชับ เข้าใจง่าย ทั้งภาษาไทยและอังกฤษ

## เกณฑ์การประเมิน

### 1. มุมองศา GYRO
- ✅ ดี: 80°–120° → ฟอร์มสวิงถูกต้อง
- ⚠️ ต่ำกว่า 80°: สวิงสั้นเกินไป ควรเพิ่มช่วงสวิง
- ⚠️ สูงกว่า 120°: สวิงมากเกินไป ควรควบคุมแรง

### 2. จุดกระทบลูก (Hit Spot)
- ✅ Sweet Spot: ลูกออกเร็ว แม่นยำ พลังงานถ่ายโอนสูงสุด ลดการบาดเจ็บ
- 🔶 Off Spot: ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง ต้องใช้แรงเพิ่มขึ้น
- ❌ Frame Hit: ตีโดนขอบไม้ ลูกไม่แม่น มีโอกาสเสียแต้ม ต้องปรับท่าตี

### 3. ความเร็วลูก (Shuttlecock Speed)
- ✅ สูง (≥100 km/h): ถ่ายโอนพลังงานดีเยี่ยม
- 🔶 ปานกลาง (60–99 km/h): พลังปานกลาง
- ❌ ต่ำ (<60 km/h): ควรเพิ่มพลังการตี

### 4. ความแน่นการจับกริป (Grip Intensity)
- ✅ สูง (≥65%): จับแน่น ควบคุมได้ดี มีพลัง
- 🔶 ปานกลาง (40–64%): อาจเสียการควบคุม
- ❌ ต่ำ (<40%): จับหลวมเกิน ลูกอาจหลุด แรงน้อย

## ตัวอย่าง Feedback (Few-shot Examples)

### ตัวอย่างที่ 1 — ช็อตดีเยี่ยม
Input:
- GYRO: 102° | Hit: Sweet Spot | Shuttlecock: 118 km/h | Grip: 80%

Output:
🏸 ตีได้ สต็อกดี ลูกที่ออกจากไม้แบตมีความเร็วและแม่นยำ
เนื่องจากตีถูกจุด Sweet Spot หากตีถูกท่าอย่างสม่ำเสมอ
จะช่วยลดอัตราการบาดเจ็บได้ดี
[Excellent stroke! High speed and accuracy from Sweet Spot contact.
Consistent form like this also reduces injury risk.]
คะแนน: 100/100 ✅

### ตัวอย่างที่ 2 — ช็อตแย่ทุกด้าน
Input:
- GYRO: 55° | Hit: Frame Hit | Shuttlecock: 38 km/h | Grip: 28%

Output:
🏸 ตีโดนขอบไม้ สต็อกไม่ดี ลูกที่ออกไม่มีความแม่นยำ
มีโอกาสเสียแต้ม ควรปรับท่าตีและจับกริปให้แน่นขึ้น
[Frame Hit detected. Poor stroke quality — inaccurate shuttlecock,
high chance of losing the point. Adjust swing form and grip pressure.]
คะแนน: 0/100 ❌

### ตัวอย่างที่ 3 — ช็อตปานกลาง
Input:
- GYRO: 95° | Hit: Off Spot | Shuttlecock: 65 km/h | Grip: 70%

Output:
🏸 ตีไม่โดน Sweet Spot ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง
และต้องใช้แรงเพิ่มขึ้น ฟอร์มการสวิงและกริปดี แต่ควรปรับ
จุดกระทบให้ตรง Sweet Spot มากขึ้น
[Off Spot contact — reduced power and accuracy. Swing angle and
grip are good. Focus on hitting the Sweet Spot consistently.]
คะแนน: 50/100 🔶

## รูปแบบการตอบ
1. สรุป Hit Spot และ GYRO ก่อน
2. ระบุ Shuttlecock Speed และ Grip
3. ให้คำแนะนำ 1–2 ประโยค
4. แสดงคะแนน X/100
5. ตอบทั้งภาษาไทยและอังกฤษ"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{req.model}:generateContent"
    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    payload = {
        "system_instruction": {
            "parts": [{"text": coach_prompt}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": f"Analyze this badminton session for {req.player}.\nAnswer in English only.\nBase every recommendation on the provided real session metrics: latest impact result, Sweet Spot score, Avg Intensity, Acceleration, Arm Gyro, and Timing.\nGive practical badminton actions the player can perform in the next set. Do not explain the data pipeline.\nUse the numbers directly. Do not say you need more data.\nSession data: {json.dumps(req.session)}"
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.35,
            "maxOutputTokens": 760,
        }
    }
    
    try:
        def fetch_gemini():
            req_obj = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
            try:
                with urllib.request.urlopen(req_obj, timeout=30.0) as response:
                    return response.read(), response.status
            except urllib.error.HTTPError as e:
                return e.read(), e.code
                
        import asyncio
        resp_data, status_code = await asyncio.to_thread(fetch_gemini)
        
        data = json.loads(resp_data.decode('utf-8'))
        
        if status_code != 200:
            return JSONResponse(status_code=status_code, content={"ok": False, "error": data.get("error", {}).get("message", "Gemini API request failed.")})
            
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        reply = "".join(p.get("text", "") for p in parts).strip()
        
        if not reply:
            return JSONResponse(status_code=500, content={"ok": False, "error": "Empty reply from Gemini"})
            
        return {"ok": True, "model": req.model, "reply": reply}
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


# ── Sessions ─────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
async def list_sessions():
    sessions_dir = DATA_DIR / "sessions"
    sessions = []
    if sessions_dir.exists():
        for d in sorted(sessions_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            mp = d / "meta.json"
            if mp.exists():
                async with aiofiles.open(mp) as f:
                    sessions.append(json.loads(await f.read()))
    return {"sessions": sessions}


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    session_dir = (DATA_DIR / "sessions" / session_id).resolve()
    sessions_root = (DATA_DIR / "sessions").resolve()
    if sessions_root not in session_dir.parents and session_dir != sessions_root:
        return JSONResponse(status_code=400, content={"error": "Invalid session path"})
    if not session_dir.exists():
        return JSONResponse(status_code=404, content={"error": "Session not found"})

    ev = _cancel_events.get(session_id)
    if ev:
        ev.set()
    _process_queues.pop(session_id, None)
    _cancel_events.pop(session_id, None)
    _camera_watchers.pop(session_id, None)

    try:
        shutil.rmtree(session_dir)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Could not delete session: {exc}"})

    return {"status": "deleted", "session_id": session_id}


@app.post("/api/sessions/upload")
async def upload_video(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())[:8]
    session_dir = DATA_DIR / "sessions" / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    video_path = session_dir / f"video{suffix}"
    async with aiofiles.open(video_path, "wb") as f:
        await f.write(await file.read())

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    meta = {
        "session_id": session_id,
        "filename": file.filename,
        "status": "uploaded",
        "video_path": str(video_path),
        "source_fps": fps,
        "source_width": w,
        "source_height": h,
        "total_frames": total,
        "frame_count": 0,
    }
    async with aiofiles.open(session_dir / "meta.json", "w") as f:
        await f.write(json.dumps(meta))

    duration_s = round(total / fps, 1) if fps else 0
    return {
        "session_id": session_id,
        "status": "uploaded",
        "total_frames": total,
        "source_fps": round(fps, 2),
        "source_width": w,
        "source_height": h,
        "duration_s": duration_s,
    }


class ProcessOptions(BaseModel):
    frame_skip: int = 1
    single_person: bool = True
    crop: dict | None = None   # {x, y, w, h} normalized 0-1; None = full frame


class ProbeRequest(BaseModel):
    frame: int = 0
    crop: dict | None = None


class LabelClipRequest(BaseModel):
    name: str
    color: str = "#f59e0b"
    start_frame: int
    end_frame: int


@app.post("/api/sessions/{session_id}/process")
async def start_processing(session_id: str, background_tasks: BackgroundTasks, opts: ProcessOptions = ProcessOptions()):
    meta_path = DATA_DIR / "sessions" / session_id / "meta.json"
    if not meta_path.exists():
        return JSONResponse(status_code=404, content={"error": "Session not found"})

    async with aiofiles.open(meta_path) as f:
        meta = json.loads(await f.read())

    if meta.get("status") == "done":
        return {"session_id": session_id, "status": "already_done"}

    frame_skip = max(1, min(opts.frame_skip, 30))

    meta["status"] = "processing"
    meta["frame_skip"] = frame_skip
    meta["single_person"] = opts.single_person
    async with aiofiles.open(meta_path, "w") as f:
        await f.write(json.dumps(meta))

    q: std_queue.Queue = std_queue.Queue(maxsize=300)
    cancel = threading.Event()
    _process_queues[session_id] = q
    _cancel_events[session_id]  = cancel
    background_tasks.add_task(_start_processing_async, session_id, meta["video_path"], q, cancel, frame_skip, opts.single_person, opts.crop)

    return {"session_id": session_id, "status": "processing", "frame_skip": frame_skip}


@app.post("/api/sessions/{session_id}/cancel")
async def cancel_processing(session_id: str):
    ev = _cancel_events.get(session_id)
    if not ev:
        return JSONResponse(status_code=404, content={"error": "No active job"})
    ev.set()
    # Update meta so the UI reflects cancellation
    meta_path = DATA_DIR / "sessions" / session_id / "meta.json"
    if meta_path.exists():
        async with aiofiles.open(meta_path) as f:
            meta = json.loads(await f.read())
        meta["status"] = "cancelled"
        async with aiofiles.open(meta_path, "w") as f:
            await f.write(json.dumps(meta))
    return {"session_id": session_id, "status": "cancelling"}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    mp = DATA_DIR / "sessions" / session_id / "meta.json"
    if not mp.exists():
        return JSONResponse(status_code=404, content={"error": "Not found"})
    async with aiofiles.open(mp) as f:
        return json.loads(await f.read())


@app.get("/api/sessions/{session_id}/video")
async def get_session_video(session_id: str):
    import mimetypes
    mp = DATA_DIR / "sessions" / session_id / "meta.json"
    if not mp.exists():
        return JSONResponse(status_code=404, content={"error": "Not found"})
    async with aiofiles.open(mp) as f:
        meta = json.loads(await f.read())
    vp = meta.get("video_path")
    if not vp or not Path(vp).exists():
        return JSONResponse(status_code=404, content={"error": "No video file"})
    mt, _ = mimetypes.guess_type(vp)
    return FileResponse(vp, media_type=mt or "video/mp4")


@app.get("/api/sessions/{session_id}/thumbnail")
async def get_thumbnail(session_id: str):
    mp = DATA_DIR / "sessions" / session_id / "meta.json"
    if not mp.exists():
        return JSONResponse(status_code=404, content={"error": "Not found"})
    async with aiofiles.open(mp) as f:
        meta = json.loads(await f.read())
    vp = meta.get("video_path")
    if not vp or not Path(vp).exists():
        return JSONResponse(status_code=404, content={"error": "No video"})

    def _read_first_frame(path):
        cap = cv2.VideoCapture(path)
        ret, frame = cap.read()
        cap.release()
        if not ret:
            return None
        h, w = frame.shape[:2]
        if max(h, w) > 960:
            s = 960 / max(h, w)
            frame = cv2.resize(frame, (int(w * s), int(h * s)))
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
        return buf.tobytes()

    data = await asyncio.to_thread(_read_first_frame, vp)
    if data is None:
        return JSONResponse(status_code=500, content={"error": "Cannot read frame"})
    return Response(content=data, media_type="image/jpeg")


def _probe_frame(video_path: str, frame_idx: int, crop: dict | None) -> dict:
    import base64
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"pose_detected": False, "error": "Cannot open video"}
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, min(frame_idx, total - 1)))
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return {"pose_detected": False, "error": "Cannot read frame"}

    fh, fw = frame.shape[:2]
    cx0, cy0, cw_n, ch_n = 0.0, 0.0, 1.0, 1.0
    if crop:
        cx0 = max(0.0, min(1.0, float(crop.get("x", 0))))
        cy0 = max(0.0, min(1.0, float(crop.get("y", 0))))
        cw_n = max(0.02, min(1.0 - cx0, float(crop.get("w", 1))))
        ch_n = max(0.02, min(1.0 - cy0, float(crop.get("h", 1))))
        x1, y1 = int(cx0 * fw), int(cy0 * fh)
        x2, y2 = int((cx0 + cw_n) * fw), int((cy0 + ch_n) * fh)
        crop_frame = frame[y1:y2, x1:x2]
    else:
        crop_frame = frame

    ph, pw = crop_frame.shape[:2]
    mp_s = min(1.0, 1280 / max(pw, ph))
    mp_frame = cv2.resize(crop_frame, (int(pw * mp_s), int(ph * mp_s))) if mp_s < 1 else crop_frame

    extractor = PoseExtractor(model_complexity=1)
    keypoints, img_kp, pose_detected, vis_mean = extractor.process_frame(mp_frame)
    extractor.close()

    # Remap image keypoints from crop-space → full-frame normalized
    img_kp_full = {}
    if img_kp:
        for name, pos in img_kp.items():
            img_kp_full[name] = [
                round(cx0 + float(pos[0]) * cw_n, 4),
                round(cy0 + float(pos[1]) * ch_n, 4),
            ]

    # Draw skeleton on the cropped frame for the debug preview
    debug = crop_frame.copy()
    if img_kp:
        dh, dw = debug.shape[:2]
        CONNS = [
            ("Hips","Spine1"),("Spine1","Spine2"),("Spine2","Neck"),("Neck","Head"),
            ("Neck","LeftArm"),("LeftArm","LeftForeArm"),("LeftForeArm","LeftHand"),
            ("Neck","RightArm"),("RightArm","RightForeArm"),("RightForeArm","RightHand"),
            ("Hips","LeftUpLeg"),("LeftUpLeg","LeftLeg"),("LeftLeg","LeftFoot"),
            ("Hips","RightUpLeg"),("RightUpLeg","RightLeg"),("RightLeg","RightFoot"),
        ]
        for a, b in CONNS:
            if a in img_kp and b in img_kp:
                pa = (int(img_kp[a][0] * dw), int(img_kp[a][1] * dh))
                pb = (int(img_kp[b][0] * dw), int(img_kp[b][1] * dh))
                cv2.line(debug, pa, pb, (34, 211, 238), 2)
        for pos in img_kp.values():
            cv2.circle(debug, (int(pos[0] * dw), int(pos[1] * dh)), 5, (240, 171, 252), -1)
    if max(debug.shape[:2]) > 640:
        s = 640 / max(debug.shape[:2])
        debug = cv2.resize(debug, (int(debug.shape[1] * s), int(debug.shape[0] * s)))
    _, jpeg = cv2.imencode(".jpg", debug, [cv2.IMWRITE_JPEG_QUALITY, 82])
    debug_b64 = "data:image/jpeg;base64," + base64.b64encode(jpeg.tobytes()).decode()

    return {
        "pose_detected": pose_detected,
        "joint_count": len(keypoints),
        "pose_visibility_mean": round(vis_mean, 3),
        "keypoints_image_full": img_kp_full,
        "debug_image": debug_b64,
    }


@app.post("/api/sessions/{session_id}/probe")
async def probe_pose(session_id: str, body: ProbeRequest):
    mp = DATA_DIR / "sessions" / session_id / "meta.json"
    if not mp.exists():
        return JSONResponse(status_code=404, content={"error": "Not found"})
    async with aiofiles.open(mp) as f:
        meta = json.loads(await f.read())
    vp = meta.get("video_path")
    if not vp or not Path(vp).exists():
        return JSONResponse(status_code=404, content={"error": "No video"})
    result = await asyncio.to_thread(_probe_frame, vp, body.frame, body.crop)
    return result


@app.get("/api/sessions/{session_id}/keypoints")
async def get_keypoints(session_id: str):
    kp_path = DATA_DIR / "sessions" / session_id / "keypoints.jsonl"
    if not kp_path.exists():
        return JSONResponse(status_code=404, content={"error": "No keypoints yet"})
    frames = [json.loads(l) for l in kp_path.read_text().splitlines() if l.strip()]
    return {"session_id": session_id, "frames": frames, "count": len(frames)}


@app.get("/api/labels")
async def list_label_library():
    labels_dir = DATA_DIR / "labels"
    labels = []
    for path in sorted(labels_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        summary = _label_summary(path)
        if summary:
            labels.append(summary)
    return {"labels": labels}


@app.get("/api/labels/{label_id}")
async def get_label_clip(label_id: str):
    safe_id = Path(label_id).stem
    labels_dir = DATA_DIR / "labels"
    candidates = [labels_dir / f"{safe_id}.json", *labels_dir.glob(f"{safe_id}-*.json")]
    path = next((p for p in candidates if p.exists()), None)
    if not path:
        return JSONResponse(status_code=404, content={"error": "Label not found"})
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Could not read label: {exc}"})


@app.patch("/api/labels/{label_id}")
async def update_label(label_id: str, body: dict):
    safe_id = Path(label_id).stem
    labels_dir = DATA_DIR / "labels"
    path = next((p for p in [labels_dir / f"{safe_id}.json", *labels_dir.glob(f"{safe_id}-*.json")] if p.exists()), None)
    if not path:
        return JSONResponse(status_code=404, content={"error": "Label not found"})
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Could not read: {exc}"})
    if "name" in body:
        data["name"] = str(body["name"]).strip()[:80]
    if "color" in body:
        data["color"] = str(body["color"])[:20]
    if "enabled" in body:
        data["enabled"] = bool(body["enabled"])
    if "phases" in body:
        # Store key frame indices: {backswingStart, backswingPeak, impact, followEnd}
        p = body["phases"]
        if isinstance(p, dict):
            data["phases"] = {k: int(v) for k, v in p.items() if isinstance(v, (int, float))}
        elif p is None:
            data.pop("phases", None)
    path.write_text(json.dumps(data), encoding="utf-8")
    return {"status": "updated", "label": _label_summary(path)}


@app.delete("/api/labels/{label_id}")
async def delete_label(label_id: str):
    safe_id = Path(label_id).stem
    labels_dir = DATA_DIR / "labels"
    path = next((p for p in [labels_dir / f"{safe_id}.json", *labels_dir.glob(f"{safe_id}-*.json")] if p.exists()), None)
    if not path:
        return JSONResponse(status_code=404, content={"error": "Label not found"})
    path.unlink()
    return {"status": "deleted", "label_id": safe_id}


@app.post("/api/labels/{label_id}/import")
async def import_label_clip(label_id: str, body: dict | None = None):
    safe_id = Path(label_id).stem
    labels_dir = DATA_DIR / "labels"
    path = next((p for p in [labels_dir / f"{safe_id}.json", *labels_dir.glob(f"{safe_id}-*.json")] if p.exists()), None)
    if not path:
        return JSONResponse(status_code=404, content={"error": "Label not found"})

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Could not read label: {exc}"})

    if data.get("schema") == "label_clip_v1":
        return {"status": "already_imported", "label_id": data.get("label_id") or safe_id}

    keypoint_names = data.get("keypoint_names") or []
    frames = data.get("frames") or []
    if not keypoint_names or not frames:
        return JSONResponse(status_code=400, content={"error": "Legacy label is missing keypoint_names or frames"})

    imported_frames = []
    for frame in frames:
        persons = frame.get("persons") or []
        if not persons:
            continue
        kp = _legacy_frame_to_kp(frame, keypoint_names)
        if kp:
            kps = persons[0].get("kps", [])
            vis_scores = [
                float(p[2]) for p in kps
                if isinstance(p, list) and len(p) >= 3
            ]
            imported_frames.append({
                "frame_index": len(imported_frames),
                "timestamp_ms": round(float(frame.get("t", len(imported_frames) / max(1, data.get("fps", 30)))) * 1000, 1),
                "keypoints_17": kp,
                "pose_detected": True,
                "pose_visibility_mean": round(sum(vis_scores) / max(1, len(vis_scores)), 3) if vis_scores else 0.0,
            })

    if not imported_frames:
        return JSONResponse(status_code=400, content={"error": "Could not map any legacy frames"})

    start_frame = 0
    end_frame = len(imported_frames) - 1
    name = (body or {}).get("name") if isinstance(body, dict) else None
    color = (body or {}).get("color") if isinstance(body, dict) else None
    target_name = (name or data.get("source") or safe_id).strip()
    label_id = f"{_slugify_label(target_name)}-{uuid.uuid4().hex[:6]}"
    norm = []
    for fd in imported_frames:
        pose = _normalize_pose(fd.get("keypoints_17"))
        if pose:
            norm.append({
                "frame_index": fd.get("frame_index"),
                "timestamp_ms": fd.get("timestamp_ms"),
                "pose": pose,
            })

    if not norm:
        return JSONResponse(status_code=400, content={"error": "Imported label has no matchable 17-joint poses"})

    clip = {
        "schema": "label_clip_v1",
        "label_id": label_id,
        "name": target_name,
        "color": color or "#64748b",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_session_id": None,
        "source_filename": data.get("source") or path.name,
        "fps": float(data.get("fps") or 30.0),
        "start_frame": start_frame,
        "end_frame": end_frame,
        "duration_ms": round(((end_frame - start_frame + 1) / float(data.get("fps") or 30.0)) * 1000, 1),
        "joint_names": JOINT_NAMES_17,
        "normalized_sequence": norm,
        "frames": imported_frames,
        "imported_from": path.name,
        "legacy_schema": True,
    }
    out_path = DATA_DIR / "labels" / f"{label_id}.json"
    out_path.write_text(json.dumps(clip), encoding="utf-8")
    return {"status": "imported", "label": _label_summary(out_path)}


@app.post("/api/sessions/{session_id}/label-clips")
async def save_label_clip(session_id: str, body: LabelClipRequest):
    name = body.name.strip()
    if not name:
        return JSONResponse(status_code=400, content={"error": "Label name is required"})

    session_dir = DATA_DIR / "sessions" / session_id
    kp_path = session_dir / "keypoints.jsonl"
    meta_path = session_dir / "meta.json"
    if not kp_path.exists():
        return JSONResponse(status_code=404, content={"error": "No keypoints found for session"})

    start = max(0, min(body.start_frame, body.end_frame))
    end = max(body.start_frame, body.end_frame)
    frames = []
    for line in kp_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        fd = json.loads(line)
        idx = int(fd.get("frame_index", -1))
        if start <= idx <= end:
            frames.append(fd)
        elif idx > end:
            break

    if not frames:
        return JSONResponse(status_code=400, content={"error": "Selected frame range has no keypoints"})

    norm = []
    for fd in frames:
        pose = _normalize_pose(fd.get("keypoints_17"))
        if pose:
            norm.append({
                "frame_index": fd.get("frame_index"),
                "timestamp_ms": fd.get("timestamp_ms"),
                "pose": pose,
            })

    if not norm:
        return JSONResponse(status_code=400, content={"error": "Selected range has no matchable 17-joint poses"})

    meta = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}

    label_id = f"{_slugify_label(name)}-{uuid.uuid4().hex[:6]}"
    fps = float(meta.get("source_fps") or frames[0].get("source_fps") or 30.0)
    clip = {
        "schema": "label_clip_v1",
        "label_id": label_id,
        "name": name,
        "color": body.color or "#f59e0b",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_session_id": session_id,
        "source_filename": meta.get("filename") or meta.get("source"),
        "fps": fps,
        "start_frame": start,
        "end_frame": end,
        "duration_ms": round(((end - start + 1) / fps) * 1000, 1) if fps else None,
        "joint_names": JOINT_NAMES_17,
        "normalized_sequence": norm,
        "frames": frames,
    }
    path = DATA_DIR / "labels" / f"{label_id}.json"
    path.write_text(json.dumps(clip), encoding="utf-8")
    return {"status": "saved", "label": _label_summary(path)}


@app.get("/api/sessions/{session_id}/labels")
async def get_labels(session_id: str):
    lp = DATA_DIR / "sessions" / session_id / "hit_events.json"
    if not lp.exists():
        return {"session_id": session_id, "events": []}
    async with aiofiles.open(lp) as f:
        return json.loads(await f.read())


@app.post("/api/sessions/{session_id}/labels")
async def save_labels(session_id: str, body: dict):
    session_dir = DATA_DIR / "sessions" / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(session_dir / "hit_events.json", "w") as f:
        await f.write(json.dumps(body))
    return {"status": "saved"}


# ── WebSocket: live processing stream ────────────────────────────────────────

@app.websocket("/ws/process/{session_id}")
async def ws_process_stream(websocket: WebSocket, session_id: str):
    """Client connects here to receive keypoints as the video processes."""
    await websocket.accept()

    # Wait up to 3 s for the background task to register its queue
    for _ in range(60):
        if session_id in _process_queues:
            break
        await asyncio.sleep(0.05)

    q = _process_queues.get(session_id)
    if not q:
        await websocket.send_json({"type": "error", "message": "Processing queue not found"})
        return

    ping_counter = 0
    try:
        while True:
            try:
                item = q.get_nowait()
            except std_queue.Empty:
                await asyncio.sleep(0.016)
                ping_counter += 1
                if ping_counter % 60 == 0:
                    await websocket.send_json({"type": "ping"})
                continue

            if item is None:
                await websocket.send_json({"type": "done"})
                break

            await websocket.send_json({"type": "frame", "data": item})
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        _process_queues.pop(session_id, None)


# ── WebSocket: file replay ───────────────────────────────────────────────────

@app.websocket("/ws/replay/{session_id}")
async def ws_replay(websocket: WebSocket, session_id: str):
    """Client connects here to replay saved keypoints at any speed."""
    await websocket.accept()

    kp_path = DATA_DIR / "sessions" / session_id / "keypoints.jsonl"
    if not kp_path.exists():
        await websocket.send_json({"type": "error", "message": "No keypoints found"})
        return

    frames = [json.loads(l) for l in kp_path.read_text().splitlines() if l.strip()]
    await websocket.send_json({"type": "ready", "total_frames": len(frames)})

    play_task = None  # type: asyncio.Task

    async def stream_frames(start: int, speed: float, fps: float):
        delay = 1.0 / (fps * max(speed, 0.1))
        for i in range(start, len(frames)):
            try:
                await websocket.send_json({"type": "frame", "data": frames[i], "index": i})
            except Exception:
                return
            await asyncio.sleep(delay)
        try:
            await websocket.send_json({"type": "replay_done"})
        except Exception:
            pass

    try:
        while True:
            msg = await websocket.receive_json()
            cmd = msg.get("type")

            if cmd == "play":
                if play_task and not play_task.done():
                    play_task.cancel()
                start = max(0, msg.get("start_frame", 0))
                speed = float(msg.get("speed", 1.0))
                fps = float(msg.get("fps", 30.0))
                play_task = asyncio.create_task(stream_frames(start, speed, fps))

            elif cmd == "pause":
                if play_task and not play_task.done():
                    play_task.cancel()

            elif cmd == "seek":
                if play_task and not play_task.done():
                    play_task.cancel()
                idx = max(0, min(msg.get("frame", 0), len(frames) - 1))
                await websocket.send_json({"type": "frame", "data": frames[idx], "index": idx})

            elif cmd == "close":
                break

    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if play_task and not play_task.done():
            play_task.cancel()


# ── WebSocket: live camera stream from phone ─────────────────────────────────

@app.websocket("/ws/camera")
async def ws_camera(websocket: WebSocket, session: str = Query(default=None)):
    """Phone streams JPEG frames here; backend returns keypoints and broadcasts to PC watchers."""
    await websocket.accept()
    import base64
    import numpy as np

    # session comes from the QR URL (?session=XXXX) so the PC watcher and phone share the same ID
    session_id = session or str(uuid.uuid4())[:8]
    session_dir = DATA_DIR / "sessions" / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    extractor = PoseExtractor(model_complexity=0)
    kp_file = open(session_dir / "keypoints.jsonl", "w")
    frame_idx = 0

    await websocket.send_json({"type": "session_start", "session_id": session_id})

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("type") == "frame":
                img_bytes = base64.b64decode(msg["image"])
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is None:
                    continue

                ts_ms = msg.get("timestamp_ms", frame_idx * 33)

                # Run blocking MediaPipe call in a thread so the event loop stays free
                keypoints, img_kp, pose_detected, vis_mean = await asyncio.to_thread(
                    extractor.process_frame, frame
                )

                fd = {
                    "session_id": session_id,
                    "frame_index": frame_idx,
                    "timestamp_ms": round(float(ts_ms), 1),
                    "pose_detected": pose_detected,
                    "pose_visibility_mean": round(vis_mean, 3),
                    "keypoints_17": keypoints,
                    "keypoints_image": img_kp,
                }
                kp_file.write(json.dumps(fd) + "\n")
                kp_file.flush()
                frame_idx += 1

                if pose_detected:
                    out = {"type": "keypoints", "data": fd}
                    await websocket.send_json(out)
                    # Broadcast to every PC watching this session
                    for q in list(_camera_watchers.get(session_id, [])):
                        try:
                            q.put_nowait(out)
                        except asyncio.QueueFull:
                            pass

            elif msg.get("type") == "stop":
                break

    except (WebSocketDisconnect, Exception):
        pass
    finally:
        kp_file.close()
        extractor.close()
        meta = {
            "session_id": session_id,
            "status": "done",
            "source": "camera",
            "frame_count": frame_idx,
            "filename": "live-camera",
        }
        with open(session_dir / "meta.json", "w") as mf:
            json.dump(meta, mf)
        # Notify watchers that the phone stream ended
        for q in list(_camera_watchers.get(session_id, [])):
            try:
                q.put_nowait({"type": "phone_disconnected"})
            except asyncio.QueueFull:
                pass


# ── WebSocket: PC watcher — receives live keypoints from phone camera ─────────

@app.websocket("/ws/watch/{session_id}")
async def ws_watch_camera(websocket: WebSocket, session_id: str):
    """PC subscribes here to receive live keypoints while the phone streams."""
    await websocket.accept()
    q: asyncio.Queue = asyncio.Queue(maxsize=120)

    _camera_watchers.setdefault(session_id, []).append(q)
    await websocket.send_json({"type": "watching", "session_id": session_id})

    try:
        while True:
            # await q.get() yields properly to the event loop — no busy-polling needed
            msg = await asyncio.wait_for(q.get(), timeout=60.0)
            await websocket.send_json(msg)
            if msg.get("type") == "phone_disconnected":
                break
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    except Exception:
        pass
    finally:
        watchers = _camera_watchers.get(session_id, [])
        if q in watchers:
            watchers.remove(q)
        if not watchers:
            _camera_watchers.pop(session_id, None)


# ── WebRTC Signaling relay ────────────────────────────────────────────────────

@app.websocket("/ws/rtc-signal/{session_id}")
async def ws_rtc_signal(websocket: WebSocket, session_id: str, role: str = Query(default="phone")):
    """WebRTC signaling relay. role='phone' or role='pc'.
    Any JSON message received from one peer is forwarded to the other.
    """
    await websocket.accept()

    room = _rtc_rooms.setdefault(session_id, {})
    room[role] = websocket
    other_role = "pc" if role == "phone" else "phone"

    await websocket.send_json({"type": "ready", "role": role, "session_id": session_id,
                               "peer_connected": other_role in room})

    # Notify the other peer that we joined
    other_ws = room.get(other_role)
    if other_ws:
        try:
            await other_ws.send_json({"type": "peer_joined", "role": role})
        except Exception:
            pass

    try:
        while True:
            raw = await websocket.receive_text()
            # Forward raw signal to the other peer
            other_ws = room.get(other_role)
            if other_ws:
                try:
                    await other_ws.send_text(raw)
                except Exception:
                    pass
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if room.get(role) is websocket:
            room.pop(role, None)
        if not room:
            _rtc_rooms.pop(session_id, None)
        # Notify remaining peer
        other_ws = room.get(other_role)
        if other_ws:
            try:
                await other_ws.send_json({"type": "peer_left", "role": role})
            except Exception:
                pass


# ── Background video processing ──────────────────────────────────────────────

async def _start_processing_async(session_id: str, video_path: str, q: std_queue.Queue,
                                   cancel: threading.Event,
                                   frame_skip: int = 1, single_person: bool = True,
                                   crop: dict | None = None):
    """Async wrapper so FastAPI BackgroundTasks doesn't block the event loop."""
    await asyncio.to_thread(_run_processing_thread, session_id, video_path, q, cancel, frame_skip, single_person, crop)


def _run_processing_thread(session_id: str, video_path: str, q: std_queue.Queue,
                           cancel: threading.Event,
                           frame_skip: int = 1, single_person: bool = True,
                           crop: dict | None = None):
    """Runs in a dedicated thread so OpenCV/MediaPipe don't block the event loop."""
    import json as _json
    import traceback

    session_dir = Path(video_path).parent
    kp_path   = session_dir / "keypoints.jsonl"
    meta_path = session_dir / "meta.json"

    print(f"[{session_id}] ▶ Processing started  skip={frame_skip}  single={single_person}")

    # ── Init MediaPipe ────────────────────────────────────────────────────────
    det_conf = 0.7 if single_person else 0.5
    print(f"[{session_id}] Initializing MediaPipe (complexity=1, det_conf={det_conf}) ...")
    try:
        extractor = PoseExtractor(use_kalman=True, model_complexity=1,
                                  min_detection_confidence=det_conf)
        print(f"[{session_id}] MediaPipe ready ✓")
    except Exception as exc:
        print(f"[{session_id}] ✗ MediaPipe init FAILED: {exc}")
        traceback.print_exc()
        q.put(None)
        return

    # ── Open video ────────────────────────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[{session_id}] ✗ Cannot open video: {video_path}")
        q.put(None)
        extractor.close()
        return

    fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Pre-compute crop pixel box (fixed for all frames)
    crop_box = None
    if crop:
        cx = max(0.0, min(1.0, float(crop.get("x", 0))))
        cy = max(0.0, min(1.0, float(crop.get("y", 0))))
        cw = max(0.02, min(1.0 - cx, float(crop.get("w", 1))))
        ch = max(0.02, min(1.0 - cy, float(crop.get("h", 1))))
        crop_box = (int(cx * width), int(cy * height),
                    int((cx + cw) * width), int((cy + ch) * height))
        inp_w, inp_h = crop_box[2] - crop_box[0], crop_box[3] - crop_box[1]
        print(f"[{session_id}] Crop: {cx:.2f},{cy:.2f}+{cw:.2f}×{ch:.2f} → px {crop_box}")
    else:
        inp_w, inp_h = width, height

    # Scale for MediaPipe (max 1280px on long side)
    MP_MAX = 1280
    mp_scale = MP_MAX / max(inp_w, inp_h) if max(inp_w, inp_h) > MP_MAX else 1.0
    mp_w = int(inp_w * mp_scale)
    mp_h = int(inp_h * mp_scale)

    print(f"[{session_id}] Video: {width}×{height} @ {fps:.1f}fps  total={total}  "
          f"MP input: {mp_w}×{mp_h}  skip={frame_skip}")

    frame_idx     = 0
    detected_count = 0
    last_kp:  dict  = {}
    last_img: dict  = {}
    last_vis: float = 0.0

    def _put(fd):
        try:
            q.put_nowait(fd)
        except std_queue.Full:
            pass

    # ── Main loop ─────────────────────────────────────────────────────────────
    cancelled = False
    try:
        with open(kp_path, "w") as f:
            while frame_idx < total:
                if cancel.is_set():
                    cancelled = True
                    print(f"[{session_id}] Cancelled at frame {frame_idx}")
                    break

                # Read the frame we actually process
                ret, frame = cap.read()
                if not ret:
                    break

                ts_ms = (frame_idx / fps) * 1000.0

                # Apply crop then scale for MediaPipe
                frame_proc = frame[crop_box[1]:crop_box[3], crop_box[0]:crop_box[2]] if crop_box else frame
                frame_mp = cv2.resize(frame_proc, (mp_w, mp_h)) if mp_scale < 1.0 else frame_proc
                keypoints, img_kp, pose_detected, vis_mean = extractor.process_frame(frame_mp)
                if pose_detected:
                    last_kp  = keypoints
                    # Remap image keypoints from crop-space → full-frame normalized
                    if img_kp and crop_box:
                        x1, y1, x2, y2 = crop_box
                        cw_px, ch_px = x2 - x1, y2 - y1
                        img_kp = {
                            n: [round((x1 + p[0] * cw_px) / width, 4),
                                round((y1 + p[1] * ch_px) / height, 4)]
                            for n, p in img_kp.items()
                        }
                    last_img = img_kp
                    last_vis = vis_mean
                    detected_count += 1

                fd = {
                    "session_id": session_id,
                    "frame_index": frame_idx,
                    "timestamp_ms": round(ts_ms, 1),
                    "source_fps": fps,
                    "source_width": width,
                    "source_height": height,
                    "pose_detected": pose_detected,
                    "pose_visibility_mean": round(vis_mean, 3),
                    "keypoints_17": keypoints,
                    "keypoints_image": img_kp if img_kp else last_img,
                    "skipped": False,
                    "joint_count": len(keypoints),
                }
                f.write(_json.dumps(fd) + "\n")
                f.flush()
                _put(fd)

                # Log every 10 processed frames
                if (frame_idx // frame_skip) % 10 == 0:
                    rate = detected_count / max(1, frame_idx // frame_skip + 1) * 100
                    pct  = frame_idx / max(1, total) * 100
                    print(f"[{session_id}] frame={frame_idx}/{total} ({pct:.0f}%)  "
                          f"pose={pose_detected}  rate={rate:.0f}%  "
                          f"vis={vis_mean:.2f}  joints={len(keypoints)}")

                # Advance through skipped frames using grab() — no pixel decode
                for si in range(1, frame_skip):
                    si_idx = frame_idx + si
                    if si_idx >= total:
                        break
                    grabbed = cap.grab()
                    si_fd = {
                        "session_id": session_id,
                        "frame_index": si_idx,
                        "timestamp_ms": round((si_idx / fps) * 1000.0, 1),
                        "source_fps": fps,
                        "source_width": width,
                        "source_height": height,
                        "pose_detected": bool(last_kp),
                        "pose_visibility_mean": round(last_vis, 3),
                        "keypoints_17": last_kp,
                        "keypoints_image": last_img,
                        "skipped": True,
                        "joint_count": len(last_kp),
                    }
                    f.write(_json.dumps(si_fd) + "\n")
                    f.flush()
                    _put(si_fd)
                    if not grabbed:
                        break

                frame_idx += frame_skip

    except Exception as exc:
        print(f"[{session_id}] ✗ Error at frame {frame_idx}: {exc}")
        traceback.print_exc()
    finally:
        cap.release()
        extractor.close()
        _cancel_events.pop(session_id, None)

    rate = detected_count / max(1, frame_idx // frame_skip) * 100
    status = "cancelled" if cancelled else "done"
    print(f"[{session_id}] {status}: {frame_idx} frames  detected={detected_count} ({rate:.0f}%)")

    if meta_path.exists():
        with open(meta_path) as f:
            meta = _json.load(f)
        meta.update({"status": status, "frame_count": frame_idx,
                     "source_fps": fps, "source_width": width, "source_height": height})
        with open(meta_path, "w") as f:
            _json.dump(meta, f)

    q.put(None)  # signal completion / cancellation


# ── Serve built frontend ──────────────────────────────────────────────────────

_models = Path(__file__).parent.parent / "models"
if _models.exists():
    app.mount("/models", StaticFiles(directory=str(_models)), name="models")

_static = Path(__file__).parent.parent / "frontend" / "dist"

# Serve actual static assets (JS/CSS/images) directly; everything else → index.html
# This makes React Router work when the phone navigates directly to /camera.
if _static.exists():
    app.mount("/assets", StaticFiles(directory=str(_static / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        # Serve a real file if it exists (e.g. favicon.ico, manifest.json)
        candidate = _static / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        # All other paths → index.html so React Router handles them
        return FileResponse(str(_static / "index.html"))

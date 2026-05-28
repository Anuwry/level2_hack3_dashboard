import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'

const MS_PER_FRAME = 50

const SKIP_OPTIONS = [
  { value: 1,  label: 'Every frame',   note: 'Best quality' },
  { value: 2,  label: 'Every 2nd',     note: 'Faster' },
  { value: 3,  label: 'Every 3rd',     note: 'Fast' },
  { value: 5,  label: 'Every 5th',     note: 'Very fast' },
  { value: 10, label: 'Every 10th',    note: 'Fastest' },
]

function fmtTime(ms) {
  if (ms < 60000) return `~${Math.round(ms / 1000)}s`
  return `~${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}
function fmtDuration(s) {
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function getWsBase() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

// Random 8-char hex session ID
function makeSessionId() {
  return Math.random().toString(16).slice(2, 10)
}

// ── ROI selector + 1-frame probe panel ───────────────────────────────────────
function ROIPanel({ sessionId, crop, onCropChange, probeResult, onProbe, probing }) {
  const containerRef = useRef(null)
  const dragRef = useRef({ active: false, sx: 0, sy: 0 })
  const [live, setLive] = useState(null)   // rect while dragging

  function rel(e) {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.max(0, Math.min(1, (cx - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (cy - r.top)  / r.height)),
    }
  }

  function onDown(e) {
    e.preventDefault()
    const p = rel(e)
    dragRef.current = { active: true, sx: p.x, sy: p.y }
    setLive({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  function onMove(e) {
    if (!dragRef.current.active) return
    e.preventDefault()
    const p = rel(e)
    const { sx, sy } = dragRef.current
    setLive({ x: Math.min(sx, p.x), y: Math.min(sy, p.y), w: Math.abs(p.x - sx), h: Math.abs(p.y - sy) })
  }

  function onUp() {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    if (live && live.w > 0.04 && live.h > 0.04) onCropChange(live)
    else if (!live || (live.w < 0.04 && live.h < 0.04)) onCropChange(null)
    setLive(null)
  }

  const display = live || crop

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{background:"var(--panel)",border:"1px solid var(--line)"}}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Detection Preview</p>
          <p className="text-xs text-slate-400">Drag to crop · test on 1 frame before processing</p>
        </div>
        {crop && (
          <button onClick={() => { onCropChange(null) }} className="text-xs text-slate-400 hover:text-red-300 px-2 py-1 rounded">
            Clear ROI
          </button>
        )}
      </div>

      {/* Thumbnail + ROI overlay */}
      <div
        ref={containerRef}
        className="relative select-none rounded-lg overflow-hidden cursor-crosshair bg-black"
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        style={{ touchAction: 'none' }}
      >
        <img
          src={`/api/sessions/${sessionId}/thumbnail`}
          className="w-full block pointer-events-none"
          alt="First video frame"
          draggable={false}
        />

        {/* Probe debug overlay inside the crop area */}
        {probeResult?.debug_image && crop && (
          <img
            src={probeResult.debug_image}
            className="absolute pointer-events-none"
            style={{
              left: `${crop.x * 100}%`, top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`, height: `${crop.h * 100}%`,
              objectFit: 'fill',
            }}
            alt=""
          />
        )}
        {probeResult?.debug_image && !crop && (
          <img src={probeResult.debug_image} className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'fill' }} alt="" />
        )}

        {/* ROI rectangle */}
        {display && (display.w > 0.005 || display.h > 0.005) && (
          <div
            className="absolute border-2 border-indigo-400 pointer-events-none"
            style={{
              left: `${display.x * 100}%`, top: `${display.y * 100}%`,
              width: `${display.w * 100}%`, height: `${display.h * 100}%`,
              background: probeResult && !live ? 'transparent' : 'rgba(129,140,248,0.08)',
            }}
          />
        )}

        {/* Hint when nothing drawn yet */}
        {!crop && !live && (
          <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
            <span className="bg-black/60 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              Drag to select region · or test full frame
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onProbe}
          disabled={probing}
          className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-sm py-2.5 rounded-lg font-medium transition-colors"
        >
          {probing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running MediaPipe…
            </span>
          ) : 'Test Detection (1 frame)'}
        </button>
      </div>

      {probeResult && (
        <div className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
          probeResult.pose_detected ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${probeResult.pose_detected ? 'bg-green-400' : 'bg-red-400'}`} />
          {probeResult.pose_detected
            ? `Detected ${probeResult.joint_count}/17 joints · visibility ${(probeResult.pose_visibility_mean * 100).toFixed(0)}%`
            : 'No pose detected — try a different ROI or a different frame'
          }
        </div>
      )}
    </div>
  )
}

// ── Phone Camera Setup panel ──────────────────────────────────────────────────
function PhoneCameraSetup({ onBack, onThisDevice }) {
  const navigate = useNavigate()
  const [sessionId]   = useState(makeSessionId)
  const [qrDataUrl,  setQrDataUrl]  = useState(null)
  const [cameraUrl,  setCameraUrl]  = useState('')
  const [copied,     setCopied]     = useState(false)
  const [qrLoading,  setQrLoading]  = useState(true)

  // Generate QR code with session ID embedded
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/network-info')
        const data = await res.json()
        const ip   = data.ips?.[0]
        const port = data.port || 8000
        const url  = ip
          ? `https://${ip}:${port}/camera?session=${sessionId}`
          : `${window.location.origin}/camera?session=${sessionId}`
        setCameraUrl(url)
        const qr = await QRCode.toDataURL(url, {
          width: 240, margin: 2,
          color: { dark: '#e2e8f0', light: '#0f172a' },
        })
        setQrDataUrl(qr)
      } catch (_) {
        const fallback = window.location.origin.replace('http://', 'https://')
        const url = `${fallback}/camera?session=${sessionId}`
        setCameraUrl(url)
        const qr = await QRCode.toDataURL(url, {
          width: 240, margin: 2,
          color: { dark: '#e2e8f0', light: '#0f172a' },
        })
        setQrDataUrl(qr)
      } finally {
        setQrLoading(false)
      }
    }
    load()
  }, [sessionId])

  // PC side: navigate to the WebRTC watch page for this session

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(cameraUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {}
  }

  // ── Show QR + link ────────────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col" style={{background:"var(--bg)"}}>
      <header className="px-4 pt-6 pb-4 flex items-center gap-3" style={{background:"var(--sidebar)",borderBottom:"1px solid var(--line)"}}>
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1 -ml-1">←</button>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <div className="flex-1">
          <h1 className="text-base font-bold">Phone as Camera</h1>
          <p className="text-xs text-slate-400">Scan QR on phone → tap Watch on PC</p>
        </div>
      </header>

        <main className="flex-1 px-4 pb-8 flex flex-col gap-5 max-w-lg mx-auto w-full">
          <div className="rounded-2xl p-5 flex flex-col items-center gap-4" style={{background:"var(--panel)",border:"1px solid var(--line)"}}>


            {qrLoading ? (
              <div className="w-[240px] h-[240px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code" className="rounded-xl" width={240} height={240} />
            ) : null}

            <div className="w-full bg-slate-700 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <p className="flex-1 text-xs font-mono text-indigo-300 break-all leading-relaxed">
                {cameraUrl || '...'}
              </p>
              <button
                onClick={copyUrl}
                className="flex-shrink-0 bg-slate-600 hover:bg-slate-500 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Phone and computer must be on the same Wi-Fi
            </p>
          </div>

          {/* Watch button for the PC */}
          <button
            onClick={() => navigate(`/watch/${sessionId}`)}
            className="flex items-center gap-3 active:scale-95 rounded-xl px-5 py-4 font-medium transition-all text-left w-full" style={{background:"rgba(40,215,245,0.12)",border:"1px solid rgba(40,215,245,0.35)",color:"var(--cyan)"}}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
            <div>
              <p className="font-semibold">Watch on this PC (WebRTC)</p>
              <p className="text-xs text-indigo-200">Click here after scanning QR on the phone</p>
            </div>
          </button>

          {/* HTTPS cert warning instructions */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex flex-col gap-2">
            <p className="text-xs font-semibold" style={{color:"var(--orange)"}}>First-time setup on phone</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              The link uses a self-signed HTTPS cert (required for camera).
              Your phone browser will show a security warning — this is normal.
            </p>
            <ol className="text-xs text-amber-200/70 flex flex-col gap-1 list-decimal list-inside">
              <li>Open the link / scan QR</li>
              <li>Tap <b className="text-amber-200">Advanced</b> on the warning page</li>
              <li>Tap <b className="text-amber-200">Proceed to … (unsafe)</b></li>
              <li>Allow camera permission when prompted</li>
              <li>Tap <b className="text-amber-200">Start Streaming</b></li>
            </ol>
          </div>

          <button
            onClick={onThisDevice}
            className="flex items-center gap-3 active:scale-95 rounded-xl px-5 py-4 font-medium transition-all text-left w-full" style={{background:"var(--panel)",border:"1px solid var(--line)",color:"var(--text)"}}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            <div>
              <p className="font-semibold">Use this device's webcam instead</p>
              <p className="text-xs text-slate-300">Skip the QR — open camera on this computer</p>
            </div>
          </button>
        </main>
      </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const [sessions, setSessions]       = useState([])
  const [phase, setPhase]             = useState('idle') // idle | uploading | configure | camera-setup
  const [videoInfo, setVideoInfo]     = useState(null)
  const [frameSkip, setFrameSkip]     = useState(2)
  const [singlePerson, setSinglePerson] = useState(true)
  const [crop, setCrop]               = useState(null)
  const [probeResult, setProbeResult] = useState(null)
  const [probing, setProbing]         = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    fetchSessions()
    const id = setInterval(fetchSessions, 3000)
    return () => clearInterval(id)
  }, [])

  async function fetchSessions() {
    try {
      const r = await fetch('/api/sessions')
      setSessions((await r.json()).sessions || [])
    } catch (_) {}
  }

  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected]     = useState(new Set())

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  async function deleteSession(sessionId, filename) {
    const label = filename || sessionId
    if (!window.confirm(`Delete session "${label}"? This removes the session files from disk.`)) return
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch (err) {
      alert(`Delete failed: ${err.message || err}`)
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} session${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    const ids = [...selected]
    await Promise.all(ids.map(id => fetch(`/api/sessions/${id}`, { method: 'DELETE' }).catch(() => {})))
    setSessions(prev => prev.filter(s => !selected.has(s.session_id)))
    exitSelectMode()
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhase('uploading')
    setCrop(null)
    setProbeResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/sessions/upload', { method: 'POST', body: form })
      if (!r.ok) throw new Error('Upload failed')
      setVideoInfo(await r.json())
      setPhase('configure')
    } catch (err) {
      alert('Upload failed: ' + err.message)
      setPhase('idle')
    }
  }

  async function handleProbe() {
    if (!videoInfo) return
    setProbing(true)
    setProbeResult(null)
    try {
      const res = await fetch(`/api/sessions/${videoInfo.session_id}/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: 0, crop }),
      })
      setProbeResult(await res.json())
    } catch (_) {}
    setProbing(false)
  }

  async function startProcessing() {
    if (!videoInfo) return
    await fetch(`/api/sessions/${videoInfo.session_id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame_skip: frameSkip, single_person: singlePerson, crop }),
    })
    navigate(`/session/${videoInfo.session_id}?mode=process`)
  }

  function statusBadge(status) {
    const s = {
      uploaded:   'bg-slate-600 text-slate-300',
      processing: 'bg-yellow-500/20 text-yellow-300 animate-pulse',
      done:       'bg-green-500/20 text-green-300',
    }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${s[status] || 'bg-slate-600 text-slate-300'}`}>{status}</span>
  }

  // ── Camera setup panel ─────────────────────────────────────────────────────
  if (phase === 'camera-setup') {
    return (
      <PhoneCameraSetup
        onBack={() => setPhase('idle')}
        onThisDevice={() => navigate('/camera')}
      />
    )
  }

  // ── Configure panel ────────────────────────────────────────────────────────
  if (phase === 'configure' && videoInfo) {
    const { total_frames, source_fps, duration_s, source_width, source_height } = videoInfo
    const detectedFrames = Math.ceil(total_frames / frameSkip)
    const estimatedMs    = detectedFrames * MS_PER_FRAME

    return (
      <div className="min-h-full flex flex-col" style={{background:"var(--bg)"}}>
        <header className="px-4 pt-6 pb-4 flex items-center gap-3" style={{background:"var(--sidebar)",borderBottom:"1px solid var(--line)"}}>
          <button onClick={() => setPhase('idle')} className="text-slate-400 hover:text-white p-1 -ml-1">←</button>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>
          <h1 className="text-base font-bold">Processing Settings</h1>
        </header>

        <main className="flex-1 px-4 pb-8 flex flex-col gap-4 max-w-lg mx-auto w-full">
          <div className="rounded-xl p-4 grid grid-cols-2 gap-3 text-sm" style={{background:"var(--panel)",border:"1px solid var(--line)"}}>
            <div>
              <p className="text-slate-400 text-xs">File</p>
              <p className="font-medium truncate">{videoInfo.filename || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Duration</p>
              <p className="font-medium">{fmtDuration(duration_s || 0)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total frames</p>
              <p className="font-medium text-indigo-300">{total_frames.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Resolution / FPS</p>
              <p className="font-medium">{source_width}×{source_height} @ {Math.round(source_fps)}fps</p>
            </div>
          </div>

          <div className="rounded-xl p-4 flex flex-col gap-3" style={{background:"var(--panel)",border:"1px solid var(--line)"}}>
            <p className="text-sm font-semibold">Frame Skip</p>
            <div className="grid grid-cols-1 gap-1.5">
              {SKIP_OPTIONS.map(opt => {
                const det   = Math.ceil(total_frames / opt.value)
                const estMs = det * MS_PER_FRAME
                const active = frameSkip === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFrameSkip(opt.value)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left ${
                      active
                        ? 'border-indigo-500 bg-indigo-500/15 text-white'
                        : 'border-slate-600 text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'}`} />
                      <div>
                        <span className="font-medium text-sm">{opt.label}</span>
                        <span className="text-xs text-slate-400 ml-2">{opt.note}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{det.toLocaleString()} detected</p>
                      <p>{fmtTime(estMs)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => setSinglePerson(v => !v)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3.5 border transition-all text-left ${
              singlePerson
                ? 'border-indigo-500 bg-indigo-500/15'
                : 'border-slate-600 bg-slate-800'
            }`}
          >
            <div className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative ${singlePerson ? 'bg-indigo-500' : 'bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${singlePerson ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Single person mode</p>
              <p className="text-xs text-slate-400">Raises detection threshold — ignores background people in frame</p>
            </div>
          </button>

          <div className="bg-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-300 flex justify-between">
            <span>Detecting on <b className="text-white">{Math.ceil(total_frames / frameSkip).toLocaleString()}</b> / {total_frames.toLocaleString()} frames</span>
            <span>Est. <b className="text-white">{fmtTime(estimatedMs)}</b></span>
          </div>

          <ROIPanel
            sessionId={videoInfo.session_id}
            crop={crop}
            onCropChange={c => { setCrop(c); setProbeResult(null) }}
            probeResult={probeResult}
            onProbe={handleProbe}
            probing={probing}
          />

          <button
            onClick={startProcessing}
            className="py-4 rounded-xl font-semibold text-base transition-all active:scale-95" style={{background:probeResult?.pose_detected?'var(--green)':'rgba(40,215,245,0.15)',border:'1px solid '+(probeResult?.pose_detected?'var(--green)':'rgba(40,215,245,0.4)'),color:probeResult?.pose_detected?'#061119':'var(--cyan)'}}
          >
            {crop ? 'Start Processing (with ROI crop)' : 'Start Processing'}
          </button>
        </main>
      </div>
    )
  }

  // ── Main home ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col" style={{background:"var(--bg)"}}>
      <header className="px-5 pt-8 pb-6 flex items-start justify-between gap-3 max-w-lg mx-auto w-full" style={{ borderBottom: "1px solid var(--line)" }}>
        <div>
          <p style={{ color: "var(--green)", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Badminton AI Coach</p>
          <h1 style={{ marginTop: 4, fontSize: "clamp(28px, 2.5vw, 38px)", lineHeight: 1.08, margin: 0, fontWeight: "bold" }}>Pose Analysis</h1>
          <span style={{ display: "block", marginTop: 5, color: "var(--muted)", fontSize: 14 }}>Analyze movement and generate training data.</span>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ border: "1px solid var(--line)", color: "var(--muted)", fontSize: "12px", fontWeight: "bold" }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Dashboard
        </button>
      </header>


      <main className="flex-1 px-4 pb-8 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={phase === 'uploading'}
            className="flex items-center gap-3 active:scale-95 disabled:opacity-60 rounded-xl px-5 py-4 font-medium transition-all text-left w-full" style={{background:"rgba(40,215,245,0.12)",border:"1px solid rgba(40,215,245,0.35)",color:"var(--cyan)"}}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <div>
              <p className="font-semibold">Upload Video</p>
              <p className="text-xs text-indigo-200">MP4 · MOV · AVI from phone or computer</p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={handleFileSelect} capture="environment" />

          <button
            onClick={() => setPhase('camera-setup')}
            className="flex items-center gap-3 active:scale-95 rounded-xl px-5 py-4 font-medium transition-all text-left w-full" style={{background:"var(--panel)",border:"1px solid var(--line)",color:"var(--text)"}}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <div>
              <p className="font-semibold">Live Camera</p>
              <p className="text-xs text-slate-300">Use phone or webcam · Smooth real-time skeleton</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/test')}
            className="flex items-center gap-3 active:scale-95 rounded-xl px-5 py-4 font-medium transition-all text-left w-full" style={{background:"var(--panel-soft)",border:"1px solid var(--line)",color:"var(--muted)"}}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6l1 9H8L9 3z"/><path d="M6.5 14a5.5 5.5 0 0 0 11 0"/><line x1="12" y1="3" x2="12" y2="14"/></svg>
            <div>
              <p className="font-semibold">Test Rig</p>
              <p className="text-xs text-slate-400">Synthetic walk-cycle to verify bone animation</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/labels')}
            className="flex items-center gap-3 active:scale-95 rounded-xl px-5 py-4 font-medium transition-all text-left w-full" style={{background:"var(--panel)",border:"1px solid var(--line)",color:"var(--text)"}}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <div>
              <p className="font-semibold">Label Editor</p>
              <p className="text-xs text-slate-300">Import legacy label clips and convert them to match-ready markers</p>
            </div>
          </button>
        </div>

        {phase === 'uploading' && (
          <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-300">Uploading video...</p>
          </div>
        )}

        {sessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Sessions ({sessions.length})
              </h2>
              <div className="flex items-center gap-2">
                {selectMode && selected.size > 0 && (
                  <button
                    onClick={deleteSelected}
                    className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Delete {selected.size}
                  </button>
                )}
                <button
                  onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    selectMode
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {selectMode ? 'Done' : 'Select'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {sessions.map(s => {
                const isSelected = selected.has(s.session_id)
                const label = s.filename || s.source || s.session_id
                return (
                  <div
                    key={s.session_id}
                    className={`flex items-stretch gap-2 rounded-xl transition-colors ${
                      selectMode && isSelected ? 'ring-1 ring-indigo-500' : ''
                    }`}
                  >
                    {/* Checkbox in select mode */}
                    {selectMode && (
                      <button
                        onClick={() => toggleSelect(s.session_id)}
                        className={`w-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 border border-slate-700 text-slate-500'
                        }`}
                      >
                        {isSelected
                          ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                          : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                        }
                      </button>
                    )}

                    <button
                      onClick={() => selectMode ? toggleSelect(s.session_id) : navigate(`/session/${s.session_id}`)}
                      className={`flex-1 bg-slate-800 rounded-xl px-4 py-3 text-left transition-all min-w-0 ${
                        selectMode
                          ? isSelected ? 'bg-slate-700' : 'hover:bg-slate-750'
                          : 'hover:bg-slate-700 active:scale-95'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-medium truncate min-w-0">{label}</p>
                        {statusBadge(s.status)}
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
                        <span>ID: {s.session_id}</span>
                        {s.frame_count > 0 && <span>{s.frame_count.toLocaleString()} frames</span>}
                        {s.source_fps && <span>{Math.round(s.source_fps)}fps</span>}
                        {s.frame_skip > 1 && <span>skip={s.frame_skip}</span>}
                      </div>
                    </button>

                    {/* Single delete — hidden in select mode */}
                    {!selectMode && (
                      <button
                        type="button"
                        onClick={() => deleteSession(s.session_id, label)}
                        className="w-11 shrink-0 rounded-xl bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-300 transition-colors flex items-center justify-center"
                        title="Delete session"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" />
                          <path d="M10 11v5" /><path d="M14 11v5" />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {sessions.length === 0 && phase === 'idle' && (
          <div className="text-center py-12 text-slate-500">
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="4" rx="3" ry="2"/><path d="M12 6v8"/><path d="M8 18h8"/><path d="M9 14l-4 4"/><path d="M15 14l4 4"/></svg></div>
            <p className="text-sm">Upload a badminton video to get started</p>
          </div>
        )}
      </main>
    </div>
  )
}

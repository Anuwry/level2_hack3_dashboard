/**
 * CameraPage — phone sends JPEG frames via native WebRTC data channel.
 * Redesigned to match level2_hack3_dashboard design system.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AvatarViewer from '../components/AvatarViewer.jsx'
import DraggableWindow from '../components/DraggableWindow.jsx'
import { BONE_CHAIN } from '../lib/boneAnimation.js'
import { drawSkeletonImage, drawSkeletonWorld } from '../lib/drawSkeleton.js'

const TARGET_FPS = 30
const JPEG_QUALITY = 0.65
const MAX_DIM = 640
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
const RT_BUFFER_MAX = 32768

function getWsBase() {
  const p = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${p}//${window.location.host}`
}

function useFps() {
  const ts = useRef([])
  const [fps, setFps] = useState(0)
  const tick = useCallback(() => {
    const now = performance.now()
    ts.current = [...ts.current.filter(t => t > now - 2000), now]
    setFps(Math.round(ts.current.length / 2))
  }, [])
  return { fps, tick }
}

// ── SVG icons ────────────────────────────────────────────────────────────────
const IconArrow = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
)
const IconFlip = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
)
const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>
)
const IconStop = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
  </svg>
)
const IconSpinner = () => (
  <span style={{display:'inline-block',width:16,height:16,border:'2px solid var(--cyan)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
)

export default function CameraPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionParam = searchParams.get('session')

  const videoRef = useRef(null), canvasRef = useRef(null), overlayRef = useRef(null)
  const pcRef = useRef(null), channelRef = useRef(null)
  const sigWsRef = useRef(null), fallbackWsRef = useRef(null)
  const intervalRef = useRef(null), streamRef = useRef(null)
  const lastSendAt = useRef(0)
  const realtimeMode = useRef(true)

  const [status, setStatus] = useState('idle')
  const [connMode, setConnMode] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [frameCount, setFrameCount] = useState(0)
  const [poseQuality, setPoseQuality] = useState(0)
  const [keypoints, setKeypoints] = useState(null)
  const [imageKp, setImageKp] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [facingMode, setFacingMode] = useState('environment')
  const [showModel, setShowModel] = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [peerState, setPeerState] = useState('—')
  const [isRealtime, setIsRealtime] = useState(true)
  const [delayMs, setDelayMs] = useState(null)
  const { fps: captureFps, tick: tickFps } = useFps()

  async function startCamera(mode) {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'Camera API unavailable — open over HTTPS first.'
      setCameraError(msg); setStatus('error'); throw new Error(msg)
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode, width: { ideal: MAX_DIM }, height: { ideal: MAX_DIM } },
    }).catch(err => {
      const msg = err.name === 'NotAllowedError' ? 'Camera permission denied.'
                : err.name === 'NotFoundError' ? 'No camera found.'
                : err.message || String(err)
      setCameraError(msg); setStatus('error'); throw new Error(msg)
    })
    streamRef.current = stream
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
  }

  function captureJpeg() {
    const v = videoRef.current, c = canvasRef.current
    if (!c || !v || !v.videoWidth) return null
    const s = Math.min(1, MAX_DIM / Math.max(v.videoWidth, v.videoHeight))
    c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s)
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    const b64 = c.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]
    const raw = atob(b64), buf = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
    return buf
  }

  function startCapturingRTC() {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const ch = channelRef.current
      if (!ch || ch.readyState !== 'open') return
      if (realtimeMode.current && ch.bufferedAmount > RT_BUFFER_MAX) return
      const jpeg = captureJpeg()
      if (!jpeg) return
      try { lastSendAt.current = performance.now(); ch.send(jpeg); setFrameCount(c => c + 1); tickFps() } catch (_) {}
    }, Math.round(1000 / TARGET_FPS))
  }

  function startCapturingWS(ws) {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const v = videoRef.current, c = canvasRef.current
      if (!v?.videoWidth || ws.readyState !== WebSocket.OPEN) return
      const s = Math.min(1, MAX_DIM / Math.max(v.videoWidth, v.videoHeight))
      c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s)
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
      const now = performance.now(); lastSendAt.current = now
      ws.send(JSON.stringify({ type: 'frame', image: c.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1], timestamp_ms: now }))
      setFrameCount(c => c + 1); tickFps()
    }, Math.round(1000 / TARGET_FPS))
  }

  function startFallbackWS(sid) {
    setConnMode('websocket')
    const ws = new WebSocket(`${getWsBase()}/ws/camera?session=${sid}`)
    fallbackWsRef.current = ws
    ws.onopen = () => { setStatus('streaming'); startCapturingWS(ws) }
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data)
        if (m.type === 'session_start') setSessionId(m.session_id)
        else if (m.type === 'keypoints' && m.data) {
          if (lastSendAt.current) setDelayMs(Math.round(performance.now() - lastSendAt.current))
          if (m.data.keypoints_17) setKeypoints(m.data.keypoints_17)
          if (m.data.keypoints_image) setImageKp(m.data.keypoints_image)
          setPoseQuality(m.data.pose_visibility_mean || 0)
        }
      } catch (_) {}
    }
    ws.onerror = () => { setStatus('error'); setCameraError('WebSocket connection failed') }
  }

  async function startWebRTC(sid) {
    const sigWs = new WebSocket(`${getWsBase()}/ws/rtc-signal/${sid}?role=phone`)
    sigWsRef.current = sigWs
    setPeerState('connecting…')
    sigWs.onopen = () => setStatus('signaling')
    sigWs.onerror = () => { console.warn('signal WS error — fallback'); startFallbackWS(sid) }
    sigWs.onmessage = async (e) => {
      const msg = JSON.parse(e.data)
      if ((msg.type === 'ready' || msg.type === 'peer_joined') && !pcRef.current) {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
        pcRef.current = pc
        const ch = pc.createDataChannel('frames', { ordered: false, maxRetransmits: 0 })
        channelRef.current = ch
        ch.onopen = () => { setPeerState('connected'); setConnMode('webrtc'); setStatus('streaming'); startCapturingRTC() }
        ch.onmessage = (ev) => {
          try {
            const m = JSON.parse(ev.data)
            if (m.type === 'keypoints' && m.data) {
              if (lastSendAt.current) setDelayMs(Math.round(performance.now() - lastSendAt.current))
              if (m.data.keypoints_17) setKeypoints(m.data.keypoints_17)
              if (m.data.keypoints_image) setImageKp(m.data.keypoints_image)
              setPoseQuality(m.data.pose_visibility_mean || 0)
            }
          } catch (_) {}
        }
        pc.onicecandidate = ({ candidate }) => {
          if (candidate && sigWs.readyState === WebSocket.OPEN)
            sigWs.send(JSON.stringify({ type: 'ice', candidate }))
        }
        pc.oniceconnectionstatechange = () => setPeerState(pc.iceConnectionState)
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') { pc.close(); pcRef.current = null; startFallbackWS(sid) }
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sigWs.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }))
        setPeerState('offer sent…')
      } else if (msg.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }))
        setPeerState('negotiated')
      } else if (msg.type === 'ice' && pcRef.current && msg.candidate) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate)) } catch (_) {}
      } else if (msg.type === 'peer_left') {
        setPeerState('PC disconnected')
      }
    }
  }

  async function startStreaming() {
    setStatus('starting'); setFrameCount(0); setSessionId(null); setCameraError('')
    try { await startCamera(facingMode) } catch (_) { return }
    const sid = sessionParam || Math.random().toString(36).slice(2, 10)
    setSessionId(sid)
    startWebRTC(sid)
  }

  function stopStreaming() {
    setStatus('stopping')
    clearInterval(intervalRef.current)
    channelRef.current?.close(); pcRef.current?.close()
    sigWsRef.current?.close()
    if (fallbackWsRef.current?.readyState === WebSocket.OPEN)
      fallbackWsRef.current.send(JSON.stringify({ type: 'stop' }))
    fallbackWsRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current = null; channelRef.current = null
    setStatus('done')
  }

  async function switchCamera() {
    const m = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(m)
    if (status === 'streaming' || status === 'signaling') {
      streamRef.current?.getTracks().forEach(t => t.stop())
      await startCamera(m)
    }
  }

  useEffect(() => {
    const canvas = overlayRef.current; if (!canvas) return
    canvas.width = canvas.offsetWidth || 112; canvas.height = canvas.offsetHeight || 160
    if (imageKp && Object.keys(imageKp).length > 0) drawSkeletonImage(canvas, imageKp, facingMode === 'user')
    else drawSkeletonWorld(canvas, keypoints, facingMode === 'user')
  }, [imageKp, keypoints, facingMode])

  useEffect(() => () => {
    clearInterval(intervalRef.current)
    channelRef.current?.close(); pcRef.current?.close()
    sigWsRef.current?.close(); fallbackWsRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const isActive = status === 'streaming' || status === 'signaling'
  const qColor = poseQuality > 0.7 ? 'var(--green)' : poseQuality > 0.4 ? 'var(--orange)' : 'var(--red)'
  const cColor = connMode === 'webrtc' ? 'var(--cyan)' : connMode === 'websocket' ? 'var(--green)' : 'var(--muted)'
  const cLabel = connMode === 'webrtc' ? 'WebRTC' : connMode === 'websocket' ? 'WebSocket' : '—'

  // shared button chip style
  const chip = (active, activeStyle) => ({
    fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `1px solid`,
    cursor: 'pointer', fontWeight: 600, transition: 'all 160ms ease',
    ...(active
      ? { background: 'rgba(40,215,245,0.12)', borderColor: 'rgba(40,215,245,0.4)', color: 'var(--cyan)', ...activeStyle }
      : { background: 'rgba(13,26,38,0.6)', borderColor: 'var(--line)', color: 'var(--muted)' })
  })

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)', color:'var(--text)', fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px 8px', flexShrink:0, background:'var(--sidebar)', borderBottom:'1px solid var(--line)' }}>
        <button onClick={() => navigate('/pose')} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', padding:'2px 4px', display:'flex', alignItems:'center' }}>
          <IconArrow />
        </button>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:14, color:'var(--text)' }}>Live Camera</p>
          <p style={{ margin:0, fontSize:11, color:cColor }}>
            {cLabel}{peerState !== '—' ? ` · ${peerState}` : ''}{sessionId ? ` · ${sessionId}` : ''}
          </p>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button
            onClick={() => setShowModel(v => !v)}
            style={chip(showModel)}
          >3D</button>
          <button
            onClick={() => setShowSkeleton(v => !v)}
            style={chip(showSkeleton, { background:'rgba(40,215,245,0.1)', borderColor:'rgba(40,215,245,0.35)', color:'var(--cyan)' })}
          >Skel</button>
          <button
            onClick={() => { const next = !isRealtime; setIsRealtime(next); realtimeMode.current = next }}
            style={chip(isRealtime, { background:'rgba(41,227,140,0.1)', borderColor:'rgba(41,227,140,0.35)', color:'var(--green)' })}
            title={isRealtime ? 'Real-time: drops stale frames' : 'Collect all: sends every frame'}
          >
            {isRealtime ? 'RT' : 'All'}
          </button>
          <button
            onClick={switchCamera}
            style={{ background:'rgba(13,26,38,0.6)', border:'1px solid var(--line)', color:'var(--muted)', padding:'5px 8px', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}
          >
            <IconFlip />
          </button>
        </div>
      </div>

      {/* Main 3D view */}
      <div style={{ flex:1, position:'relative', overflow:'hidden', minHeight:0 }}>
        <AvatarViewer keypoints={keypoints} boneChain={BONE_CHAIN} showModel={showModel} showSkeleton={showSkeleton} style={{ width:'100%', height:'100%' }} />

        {/* Camera thumbnail — draggable/resizable */}
        <DraggableWindow
          defaultSize={{ w: 180, h: 260 }}
          defaultPos={{ x: null, y: null }}
          title="Pose Preview"
          style={{ background:'#000' }}
        >
          <video
            ref={videoRef}
            autoPlay muted playsInline
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transform:facingMode==='user'?'scaleX(-1)':'none' }}
          />
          <canvas
            ref={overlayRef}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', mixBlendMode:'screen' }}
          />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(7,18,29,0.82)', textAlign:'center', fontSize:9, color:'var(--muted)', padding:'2px 0' }}>
            {keypoints ? '● pose detected' : '○ no pose'}
          </div>
        </DraggableWindow>

        {/* FPS / quality HUD — top left — only when active */}
        {isActive && (
          <div style={{ position:'absolute', top:12, left:12, background:'rgba(7,18,29,0.82)', backdropFilter:'blur(8px)', borderRadius:10, padding:'10px 13px', border:'1px solid var(--line)', display:'flex', flexDirection:'column', gap:5, minWidth:130 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontSize:30, fontWeight:800, color:'var(--cyan)', lineHeight:1 }}>{captureFps}</span>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text)' }}>FPS</div>
                <div style={{ fontSize:10, color:'var(--muted)' }}>/ {TARGET_FPS}</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>
              Frames: <span style={{ color:'var(--text)', fontWeight:600 }}>{frameCount}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>
              Delay:{' '}
              <span style={{ fontWeight:600, color: delayMs == null ? 'var(--muted)' : delayMs < 200 ? 'var(--green)' : delayMs < 500 ? 'var(--orange)' : 'var(--red)' }}>
                {delayMs == null ? '—' : delayMs < 1000 ? `${delayMs}ms` : `${(delayMs/1000).toFixed(1)}s`}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:qColor, flexShrink:0 }} />
              <span style={{ fontSize:11, color:'var(--muted)' }}>
                Pose <span style={{ color:qColor, fontWeight:600 }}>{(poseQuality*100).toFixed(0)}%</span>
              </span>
            </div>
            <div style={{ fontSize:10, color:cColor }}>{cLabel} · {isRealtime ? 'RT' : 'All'}</div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display:'none' }} />

      {/* Bottom action bar */}
      <div style={{ flexShrink:0, background:'var(--sidebar)', borderTop:'1px solid var(--line)', padding:'14px 16px' }}>
        {(status === 'idle' || status === 'starting') && (
          <button
            onClick={startStreaming}
            disabled={status === 'starting'}
            style={{ width:'100%', background: status==='starting' ? 'rgba(40,215,245,0.1)' : 'var(--cyan)', border:'none', color: status==='starting' ? 'var(--cyan)' : '#061119', padding:'14px 0', borderRadius:12, fontWeight:800, fontSize:15, cursor:'pointer', opacity: status==='starting' ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all 160ms ease' }}
          >
            {status === 'starting' ? <><IconSpinner /> Starting…</> : <><IconPlay /> Start Streaming</>}
          </button>
        )}

        {status === 'signaling' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(40,215,245,0.06)', border:'1px solid rgba(40,215,245,0.2)', borderRadius:10 }}>
              <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'var(--cyan)', animation:'pulse 1.2s ease infinite' }} />
              <div>
                <p style={{ margin:0, fontSize:13, color:'var(--cyan)', fontWeight:600 }}>Waiting for PC viewer…</p>
                <p style={{ margin:0, fontSize:11, color:'var(--muted)' }}>Open <code style={{ color:'var(--cyan)' }}>/watch/{sessionId}</code> on PC</p>
              </div>
            </div>
            <button onClick={stopStreaming} style={{ width:'100%', background:'rgba(255,92,98,0.15)', border:'1px solid rgba(255,92,98,0.4)', color:'var(--red)', padding:'11px 0', borderRadius:12, fontWeight:700, cursor:'pointer', fontSize:14 }}>
              Cancel
            </button>
          </div>
        )}

        {status === 'streaming' && (
          <button onClick={stopStreaming} style={{ width:'100%', background:'rgba(255,92,98,0.15)', border:'1px solid rgba(255,92,98,0.4)', color:'var(--red)', padding:'14px 0', borderRadius:12, fontWeight:800, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <IconStop /> Stop &amp; Save
          </button>
        )}

        {status === 'done' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(41,227,140,0.08)', border:'1px solid rgba(41,227,140,0.25)', borderRadius:10 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              <p style={{ margin:0, fontSize:13, color:'var(--green)', fontWeight:600 }}>Session saved — {frameCount} frames</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {sessionId && (
                <button onClick={() => navigate(`/session/${sessionId}`)} style={{ flex:1, background:'rgba(40,215,245,0.12)', border:'1px solid rgba(40,215,245,0.35)', color:'var(--cyan)', padding:'12px 0', borderRadius:12, fontWeight:700, cursor:'pointer' }}>
                  View Replay
                </button>
              )}
              <button onClick={() => { setStatus('idle'); setKeypoints(null); setFrameCount(0); setSessionId(null); setConnMode(null); setPeerState('—') }} style={{ flex:1, background:'rgba(13,26,38,0.6)', border:'1px solid var(--line)', color:'var(--text)', padding:'12px 0', borderRadius:12, fontWeight:700, cursor:'pointer' }}>
                New Session
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {cameraError && (
              <div style={{ background:'rgba(255,92,98,0.1)', border:'1px solid rgba(255,92,98,0.3)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#fca5a5', lineHeight:1.5 }}>
                {cameraError}
              </div>
            )}
            <button onClick={() => { setStatus('idle'); setCameraError('') }} style={{ width:'100%', background:'rgba(40,215,245,0.12)', border:'1px solid rgba(40,215,245,0.35)', color:'var(--cyan)', padding:'12px 0', borderRadius:12, fontWeight:700, cursor:'pointer' }}>
              Try Again
            </button>
            <button onClick={() => navigate('/pose')} style={{ width:'100%', background:'rgba(13,26,38,0.6)', border:'1px solid var(--line)', color:'var(--muted)', padding:'11px 0', borderRadius:12, fontWeight:600, cursor:'pointer' }}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

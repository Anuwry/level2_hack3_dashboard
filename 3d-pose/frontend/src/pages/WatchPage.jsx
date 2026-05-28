/**
 * WatchPage — PC-side WebRTC receiver.
 * Uses native RTCPeerConnection — no simple-peer.
 * Receives JPEG frames from phone, forwards to backend /ws/camera for MediaPipe.
 * Shows incoming FPS + pose quality.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AvatarViewer from '../components/AvatarViewer.jsx'
import { BONE_CHAIN } from '../lib/boneAnimation.js'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]

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

export default function WatchPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const sigWsRef    = useRef(null)
  const cameraWsRef = useRef(null)
  const pcRef       = useRef(null)

  const [status, setStatus]       = useState('connecting')
  const [peerState, setPeerState] = useState('')
  const [frameCount, setFrameCount] = useState(0)
  const [poseQuality, setPoseQuality] = useState(0)
  const [keypoints, setKeypoints]   = useState(null)
  const [imageKp, setImageKp]       = useState(null)
  const [showModel, setShowModel]   = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(true)

  const { fps, tick: tickFps } = useFps()

  // Forward JPEG bytes to backend /ws/camera for MediaPipe pose extraction
  function forwardFrame(bytes) {
    const ws = cameraWsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    let bin = ''
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
    ws.send(JSON.stringify({ type: 'frame', image: btoa(bin), timestamp_ms: performance.now() }))
  }

  function openCameraWS() {
    const ws = new WebSocket(`${getWsBase()}/ws/camera?session=${sessionId}`)
    cameraWsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data)
        if (m.type === 'keypoints' && m.data) {
          if (m.data.keypoints_17)    setKeypoints(m.data.keypoints_17)
          if (m.data.keypoints_image) setImageKp(m.data.keypoints_image)
          setPoseQuality(m.data.pose_visibility_mean || 0)
          // Send keypoints back to phone via data channel
          const pc = pcRef.current
          pc?.getSenders?.() // keep-alive hack
          const ch = pc?._dataChannel
          if (ch?.readyState === 'open') {
            try { ch.send(JSON.stringify({ type: 'keypoints', data: m.data })) } catch (_) {}
          }
        }
      } catch (_) {}
    }
    ws.onerror = () => console.warn('[Watch] camera WS error')
  }

  async function createPeerConnection(sigWs) {
    if (pcRef.current) return
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && sigWs.readyState === WebSocket.OPEN)
        sigWs.send(JSON.stringify({ type: 'ice', candidate }))
    }
    pc.oniceconnectionstatechange = () => setPeerState(pc.iceConnectionState)
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected')
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') setStatus('done')
    }

    pc.ondatachannel = (ev) => {
      const ch = ev.channel
      pc._dataChannel = ch
      ch.binaryType = 'arraybuffer'
      ch.onopen = () => { setPeerState('connected ✓'); setStatus('connected') }
      ch.onmessage = (ev) => {
        if (ev.data instanceof ArrayBuffer) {
          // Binary = JPEG frame
          tickFps()
          setFrameCount(c => c + 1)
          forwardFrame(new Uint8Array(ev.data))
        }
        // Text messages ignored (metadata if any)
      }
      ch.onclose = () => setStatus('done')
    }
  }

  useEffect(() => {
    if (!sessionId) return

    openCameraWS()

    const sigWs = new WebSocket(`${getWsBase()}/ws/rtc-signal/${sessionId}?role=pc`)
    sigWsRef.current = sigWs
    sigWs.onopen = () => setStatus('waiting')
    sigWs.onerror = () => setStatus('error')

    sigWs.onmessage = async (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'ready') {
        setPeerState('waiting for phone…')
        if (msg.peer_connected) await createPeerConnection(sigWs)

      } else if (msg.type === 'peer_joined') {
        await createPeerConnection(sigWs)

      } else if (msg.type === 'offer') {
        const pc = pcRef.current
        if (!pc) return
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sigWs.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }))
        setPeerState('answer sent…')

      } else if (msg.type === 'ice' && msg.candidate) {
        try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate)) } catch (_) {}

      } else if (msg.type === 'peer_left') {
        setPeerState('phone disconnected'); setStatus('done')
      }
    }

    return () => {
      sigWs.close()
      pcRef.current?.close()
      cameraWsRef.current?.close()
    }
  }, [sessionId])

  const qColor = poseQuality > 0.7 ? '#4ade80' : poseQuality > 0.4 ? '#facc15' : '#f87171'

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'#0f172a', color:'#f1f5f9', fontFamily:'system-ui,sans-serif' }}>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px 8px', flexShrink:0, background:'#1e293b', borderBottom:'1px solid #334155' }}>
        <button onClick={() => navigate('/pose')} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:600, fontSize:15 }}>📡 PC Watcher</p>
          <p style={{ margin:0, fontSize:11, color:'#818cf8' }}>Session: <code style={{ color:'#a5b4fc' }}>{sessionId}</code>{peerState ? ` · ${peerState}` : ''}</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setShowModel(v => !v)} style={{ fontSize:11, padding:'4px 8px', borderRadius:8, border:'none', cursor:'pointer', background:showModel?'#475569':'#1e293b', color:showModel?'#fff':'#64748b' }}>3D</button>
          <button onClick={() => setShowSkeleton(v => !v)} style={{ fontSize:11, padding:'4px 8px', borderRadius:8, border:'none', cursor:'pointer', background:showSkeleton?'#3730a3':'#1e293b', color:showSkeleton?'#fff':'#64748b' }}>Skel</button>
        </div>
      </div>

      {/* Avatar */}
      <div style={{ flex:1, position:'relative', overflow:'hidden', minHeight:0 }}>
        <AvatarViewer keypoints={keypoints} boneChain={BONE_CHAIN} showModel={showModel} showSkeleton={showSkeleton} style={{ width:'100%', height:'100%' }} />

        {/* Waiting / error overlay */}
        {status !== 'connected' && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(15,23,42,0.78)', backdropFilter:'blur(4px)', flexDirection:'column', gap:14 }}>
            {status === 'done' ? (
              <>
                <div style={{ fontSize:48 }}>✅</div>
                <p style={{ color:'#4ade80', fontWeight:600, margin:0 }}>Stream ended</p>
                <p style={{ color:'#94a3b8', fontSize:13, margin:0 }}>{frameCount} frames received</p>
                <button onClick={() => navigate(`/session/${sessionId}`)} style={{ background:'#4f46e5', border:'none', color:'#fff', padding:'10px 24px', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:14 }}>View Replay →</button>
              </>
            ) : status === 'error' ? (
              <>
                <div style={{ fontSize:40 }}>⚠️</div>
                <p style={{ color:'#f87171', fontWeight:600, margin:0 }}>Connection error</p>
                <button onClick={() => window.location.reload()} style={{ background:'#4f46e5', border:'none', color:'#fff', padding:'10px 24px', borderRadius:10, fontWeight:600, cursor:'pointer' }}>Retry</button>
              </>
            ) : (
              <>
                <div style={{ width:48, height:48, border:'3px solid #4f46e5', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
                <p style={{ color:'#818cf8', fontWeight:600, margin:0, fontSize:15 }}>
                  {status === 'waiting' ? 'Waiting for phone…' : 'Connecting…'}
                </p>
                <p style={{ color:'#64748b', fontSize:12, margin:0 }}>
                  On phone: open <code style={{ color:'#a5b4fc' }}>/camera?session={sessionId}</code>
                </p>
              </>
            )}
          </div>
        )}

        {/* FPS overlay */}
        {status === 'connected' && (
          <div style={{ position:'absolute', top:12, left:12, background:'rgba(15,23,42,0.85)', backdropFilter:'blur(8px)', borderRadius:12, padding:'10px 14px', border:'1px solid #334155', display:'flex', flexDirection:'column', gap:6, minWidth:140 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontSize:36, fontWeight:800, color:'#818cf8', lineHeight:1 }}>{fps}</span>
              <div><div style={{ fontSize:12, fontWeight:700, color:'#c7d2fe' }}>FPS</div><div style={{ fontSize:10, color:'#64748b' }}>incoming</div></div>
            </div>
            <div style={{ fontSize:12, color:'#94a3b8' }}>Frames: <span style={{ color:'#e2e8f0', fontWeight:600 }}>{frameCount}</span></div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:qColor }} />
              <span style={{ fontSize:12, color:'#94a3b8' }}>Pose <span style={{ color:qColor, fontWeight:600 }}>{(poseQuality*100).toFixed(0)}%</span></span>
            </div>
            <div style={{ fontSize:10, color:'#818cf8' }}>⚡ WebRTC P2P</div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

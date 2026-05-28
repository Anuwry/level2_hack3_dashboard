import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const SKELETON = [
  [0,1],[0,2],[1,3],[2,4],
  [5,6],[5,7],[7,9],[6,8],[8,10],
  [5,11],[6,12],[11,12],
  [11,13],[13,15],[12,14],[14,16],
]
const CONF = 0.3

function computeBounds(frames) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const { persons } of frames) {
    for (const { kps } of persons) {
      for (const [x, y, c] of kps) {
        if (c > CONF) {
          if (x < x0) x0 = x
          if (y < y0) y0 = y
          if (x > x1) x1 = x
          if (y > y1) y1 = y
        }
      }
    }
  }
  const pw = (x1 - x0) * 0.10
  const ph = (y1 - y0) * 0.10
  return { x0: x0 - pw, y0: y0 - ph, x1: x1 + pw, y1: y1 + ph }
}

function paint(ctx, W, H, frame, b) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#040f1a'
  ctx.fillRect(0, 0, W, H)

  if (!frame || !frame.persons || frame.persons.length === 0) return
  const { kps } = frame.persons[0]
  if (!kps || kps.length < 17) return

  const rX = (b.x1 - b.x0) || 0.01
  const rY = (b.y1 - b.y0) || 0.01
  const sc = Math.min(W / rX, H / rY)
  const dx = (W - rX * sc) / 2
  const dy = (H - rY * sc) / 2

  const pts = kps.map(([x, y, c]) => [dx + (x - b.x0) * sc, dy + (y - b.y0) * sc, c])

  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (const [a, b2] of SKELETON) {
    const [ax, ay, ac] = pts[a] || [0,0,0]
    const [bx, by, bc] = pts[b2] || [0,0,0]
    if (ac > CONF && bc > CONF) {
      ctx.strokeStyle = '#28d7f5'
      ctx.shadowColor = '#28d7f5'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
  }
  ctx.shadowBlur = 0

  for (const [px, py, pc] of pts) {
    if (pc > CONF) {
      ctx.fillStyle = '#29e38c'
      ctx.shadowColor = '#29e38c'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.shadowBlur = 0
}

export default function StrokeAnimator({ stroke, mode, onClose }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({ frame: 0, last: 0, raf: null, data: null, bounds: null })
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true
    setStatus('loading')
    const st = stateRef.current
    st.frame = 0; st.last = 0
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = null }

    fetch(`/keypoints/${stroke}/${mode}/sample.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        if (!alive) return
        st.data   = data
        st.bounds = computeBounds(data.frames)
        setStatus('ready')
      })
      .catch(() => { if (alive) setStatus('error') })

    return () => { alive = false }
  }, [stroke, mode])

  useEffect(() => {
    if (status !== 'ready') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const st  = stateRef.current
    if (!st.data || !st.bounds) return
    const interval = 1000 / (st.data.fps || 25)

    function loop(ts) {
      if (ts - st.last >= interval) {
        st.last = ts
        paint(ctx, canvas.width, canvas.height,
              st.data.frames[st.frame], st.bounds)
        st.frame = (st.frame + 1) % st.data.frames.length
      }
      st.raf = requestAnimationFrame(loop)
    }
    st.raf = requestAnimationFrame(loop)
    return () => { if (st.raf) { cancelAnimationFrame(st.raf); st.raf = null } }
  }, [status])

  const title = stroke ? stroke.charAt(0).toUpperCase() + stroke.slice(1) : ''

  return (
    <div className="animOverlay" onClick={onClose}>
      <div className="animPanel" onClick={e => e.stopPropagation()}>

        <div className="animHeader">
          <div className="animHeaderLeft">
            <span className="animTitle">{title}</span>
            <span className="animMode">{mode}</span>
          </div>
          <button className="animClose" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="animBody">
          {status === 'loading' && (
            <div className="animStatus">Loading…</div>
          )}
          {status === 'error' && (
            <div className="animStatus animStatusErr">
              No movement data recorded yet.
              <small>Save a clip in Pose Viewer first.</small>
            </div>
          )}
          {status === 'ready' && (
            <canvas ref={canvasRef} width={540} height={380} className="animCanvas" />
          )}
        </div>

        <p className="animHint">Real recorded movement · click outside to close</p>
      </div>
    </div>
  )
}

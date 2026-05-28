/**
 * DraggableWindow — a floating, draggable, resizable window overlay.
 * Drag the header bar to reposition. Drag the bottom-right handle to resize.
 * Works with mouse and touch.
 */
import { useState, useRef, useCallback, useEffect } from 'react'

const MIN_W = 120
const MIN_H = 100

export default function DraggableWindow({
  children,
  defaultPos = { x: null, y: null },   // null = anchor to bottom-right
  defaultSize = { w: 180, h: 250 },
  title = '',
  style = {},
}) {
  const [pos, setPos] = useState(defaultPos)
  const [size, setSize] = useState(defaultSize)
  const [anchored, setAnchored] = useState(defaultPos.x === null) // start anchored bottom-right

  const dragRef = useRef(null)    // { startX, startY, startPosX, startPosY }
  const resizeRef = useRef(null)  // { startX, startY, startW, startH }
  const containerRef = useRef(null)

  // Compute actual position for anchored mode
  const getStyle = () => {
    const s = {
      position: 'absolute',
      width: size.w,
      height: size.h,
      zIndex: 50,
      ...style,
    }
    if (anchored) {
      s.bottom = 12
      s.right = 12
    } else {
      s.top = pos.y
      s.left = pos.x
    }
    return s
  }

  // ── Drag (move) ─────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e) => {
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Switch from anchored to absolute on first drag
    setAnchored(false)
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: rect.left,
      startPosY: rect.top,
    }
  }, [])

  const onDragMove = useCallback((e) => {
    if (!dragRef.current) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const dx = clientX - dragRef.current.startX
    const dy = clientY - dragRef.current.startY
    const newX = Math.max(0, dragRef.current.startPosX + dx)
    const newY = Math.max(0, dragRef.current.startPosY + dy)
    setPos({ x: newX, y: newY })
  }, [])

  const onDragEnd = useCallback(() => {
    dragRef.current = null
  }, [])

  // ── Resize ──────────────────────────────────────────────────────────────────
  const onResizeStart = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      startW: size.w,
      startH: size.h,
    }
  }, [size])

  const onResizeMove = useCallback((e) => {
    if (!resizeRef.current) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const dx = clientX - resizeRef.current.startX
    const dy = clientY - resizeRef.current.startY
    setSize({
      w: Math.max(MIN_W, resizeRef.current.startW + dx),
      h: Math.max(MIN_H, resizeRef.current.startH + dy),
    })
  }, [])

  const onResizeEnd = useCallback(() => {
    resizeRef.current = null
  }, [])

  // Global event listeners
  useEffect(() => {
    const mm = (e) => { onDragMove(e); onResizeMove(e) }
    const mu = () => { onDragEnd(); onResizeEnd() }
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    window.addEventListener('touchmove', mm, { passive: false })
    window.addEventListener('touchend', mu)
    return () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
      window.removeEventListener('touchmove', mm)
      window.removeEventListener('touchend', mu)
    }
  }, [onDragMove, onResizeMove, onDragEnd, onResizeEnd])

  return (
    <div ref={containerRef} style={getStyle()}>
      {/* Drag handle header */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 20,
          background: 'rgba(7,18,29,0.85)',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid var(--line)',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: 'grab',
          userSelect: 'none',
          zIndex: 2,
          touchAction: 'none',
        }}
      >
        {/* Grip dots */}
        <div style={{ display:'flex', gap:3 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:4, height:4, borderRadius:'50%', background:'var(--line)' }}/>
          ))}
        </div>
        {title && (
          <span style={{ fontSize:9, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            {title}
          </span>
        )}
        <div style={{ width:12 }}/>
      </div>

      {/* Content area */}
      <div style={{
        position: 'absolute',
        top: 20, left: 0, right: 0, bottom: 0,
        overflow: 'hidden',
        borderRadius: '0 0 12px 12px',
      }}>
        {children}
      </div>

      {/* Resize handle — bottom-right corner */}
      <div
        onMouseDown={onResizeStart}
        onTouchStart={onResizeStart}
        style={{
          position: 'absolute',
          bottom: 0, right: 0,
          width: 20, height: 20,
          cursor: 'se-resize',
          zIndex: 3,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 3,
          touchAction: 'none',
        }}
      >
        <svg viewBox="0 0 10 10" width="10" height="10">
          <line x1="10" y1="2" x2="2" y2="10" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="10" y1="6" x2="6" y2="10" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Border / outer frame */}
      <div style={{
        position:'absolute', inset:0,
        border:'1px solid var(--line)',
        borderRadius:12,
        pointerEvents:'none',
        boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
      }}/>
    </div>
  )
}

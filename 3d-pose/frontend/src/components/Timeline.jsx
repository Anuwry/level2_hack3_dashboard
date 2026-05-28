/**
 * Timeline — playback scrubber + hit event markers.
 */

import { useRef, useCallback } from 'react'

export default function Timeline({
  totalFrames = 0,
  currentFrame = 0,
  fps = 30,
  hitEvents = [],
  onSeek,
  onEventClick,
  labelMode = false,
  onAddLabel,
}) {
  const barRef = useRef(null)

  const progress = totalFrames > 0 ? currentFrame / totalFrames : 0
  const totalMs = (totalFrames / fps) * 1000
  const currentMs = (currentFrame / fps) * 1000

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000)
    const centis = Math.floor((ms % 1000) / 10)
    return `${s}.${String(centis).padStart(2, '0')}s`
  }

  function getFrameFromEvent(e) {
    const bar = barRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    return Math.round(ratio * totalFrames)
  }

  function handleBarClick(e) {
    const frame = getFrameFromEvent(e)
    if (labelMode && onAddLabel) {
      onAddLabel(frame)
    } else if (onSeek) {
      onSeek(frame)
    }
  }

  function handleBarTouch(e) {
    e.preventDefault()
    const frame = getFrameFromEvent(e)
    if (labelMode && onAddLabel) {
      onAddLabel(frame)
    } else if (onSeek) {
      onSeek(frame)
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full select-none">
      {/* Time display */}
      <div className="flex justify-between text-xs text-slate-400 px-1">
        <span>{fmtTime(currentMs)}</span>
        <span>{labelMode ? '📍 Tap to add hit marker' : ''}</span>
        <span>{fmtTime(totalMs)}</span>
      </div>

      {/* Scrubber bar */}
      <div
        ref={barRef}
        className="relative w-full h-10 bg-slate-700 rounded-lg cursor-pointer overflow-hidden"
        onClick={handleBarClick}
        onTouchStart={handleBarTouch}
        style={{ touchAction: 'none' }}
      >
        {/* Progress fill */}
        <div
          className="absolute left-0 top-0 h-full bg-indigo-600 transition-none"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-md"
          style={{ left: `${progress * 100}%` }}
        />

        {/* Hit event markers and ranges */}
        {hitEvents.map((ev, i) => {
          const evFrame = ev.frame_index ?? Math.round((ev.timestamp_ms / 1000) * fps)
          const startFrame = ev.start_frame ?? evFrame
          const endFrame = ev.end_frame ?? evFrame
          const left = totalFrames > 0 ? (evFrame / totalFrames) * 100 : 0
          const rangeLeft = totalFrames > 0 ? (startFrame / totalFrames) * 100 : left
          const rangeWidth = totalFrames > 0
            ? Math.max(0.35, ((endFrame - startFrame + 1) / totalFrames) * 100)
            : 0.35
          const isRange = endFrame > startFrame
          const isAuto = ev.source === 'auto_similarity'
          const scoreText = ev.score != null ? `${(ev.score * 100).toFixed(0)}%` : null
          return (
            <div
              key={i}
              className={`absolute top-0 h-full rounded-sm overflow-hidden ${isRange ? '' : 'w-1'} ${onEventClick && isAuto ? 'cursor-pointer hover:brightness-125' : ''}`}
              style={{
                left: `${isRange ? rangeLeft : left}%`,
                width: isRange ? `${rangeWidth}%` : undefined,
                background: ev.color || '#f59e0b',
                opacity: isAuto ? 0.75 : 0.9,
              }}
              title={`${ev.label || 'Hit'} @ ${fmtTime((evFrame / fps) * 1000)}${ev.score != null ? ` · score ${ev.score.toFixed(3)}` : ''}${isAuto ? ' · click to compare' : ''}`}
              onClick={onEventClick && isAuto ? e => { e.stopPropagation(); onEventClick(ev) } : undefined}
            >
              {scoreText && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/90 pointer-events-none leading-none">
                  {scoreText}
                </span>
              )}
            </div>
          )
        })}

        {/* Click ripple in label mode */}
        {labelMode && (
          <div className="absolute inset-0 bg-yellow-400 opacity-0 hover:opacity-5 transition-opacity" />
        )}
      </div>

      {/* Frame counter */}
      <div className="text-center text-xs text-slate-500">
        Frame {currentFrame} / {totalFrames}
      </div>
    </div>
  )
}

import { useMemo } from 'react'

function fmtTime(frame, fps) {
  return `${(frame / Math.max(1, fps)).toFixed(2)}s`
}

export default function LabelPanel({
  events = [],
  autoEvents = [],
  labelLibrary = [],
  fps = 30,
  currentFrame = 0,
  totalFrames = 0,
  clipStart = null,
  clipEnd = null,
  labelName = '',
  labelColor = '#f59e0b',
  libraryStatus = '',
  onClipStart,
  onClipEnd,
  onNameChange,
  onColorChange,
  onSaveClip,
  onRefreshLibrary,
  onRunAutoMatch,
  onKeepAuto,
  onPreviewLabel,
  onImportLabel,
  onEventClick,
  onUpdate,
  onClose,
}) {
  const range = useMemo(() => {
    if (clipStart == null || clipEnd == null) return null
    return [Math.min(clipStart, clipEnd), Math.max(clipStart, clipEnd)]
  }, [clipStart, clipEnd])

  function removeEvent(id) {
    onUpdate(events.filter(e => e.id !== id))
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-200">Clip Crop</h3>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">x</button>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg p-3 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onClipStart?.(currentFrame)}
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-lg"
          >
            Set Start {clipStart != null ? clipStart : ''}
          </button>
          <button
            onClick={() => onClipEnd?.(currentFrame)}
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-lg"
          >
            Set End {clipEnd != null ? clipEnd : ''}
          </button>
        </div>
        <div className="text-xs text-slate-400">
          {range
            ? `Range ${range[0]}-${range[1]} (${fmtTime(range[0], fps)}-${fmtTime(range[1], fps)})`
            : `Current frame ${currentFrame} / ${totalFrames}`}
        </div>
        <div className="flex gap-2">
          <input
            value={labelName}
            onChange={e => onNameChange?.(e.target.value)}
            placeholder="forehead clear"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            type="color"
            value={labelColor}
            onChange={e => onColorChange?.(e.target.value)}
            className="w-12 h-10 bg-slate-900 border border-slate-700 rounded-lg"
            title="Label color"
          />
        </div>
        <button
          onClick={onSaveClip}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg font-medium"
        >
          Save Clip To Library
        </button>
        {libraryStatus && <p className="text-xs text-slate-400">{libraryStatus}</p>}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 uppercase tracking-wide">Library</p>
        <div className="flex gap-1">
          <button onClick={onRefreshLibrary} className="text-xs bg-slate-800 px-2 py-1 rounded-lg">Refresh</button>
          <button onClick={onRunAutoMatch} className="text-xs bg-amber-600 px-2 py-1 rounded-lg text-white">Auto</button>
        </div>
      </div>

      <div className="max-h-36 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {labelLibrary.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-3">No saved label clips</p>
        )}
        {labelLibrary.map(label => (
          <div
            key={label.label_id}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-left"
          >
            <button className="flex-1 flex items-center gap-2 text-left min-w-0" onClick={() => onPreviewLabel?.(label)}>
            <span className="w-2 h-7 rounded-sm flex-shrink-0" style={{ background: label.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{label.name}</p>
              <p className="text-xs text-slate-400">
                {label.frame_count || 0} frames {label.match_ready ? '' : 'legacy/importable'}
              </p>
            </div>
            </button>
            {!label.match_ready && (
              <button
                onClick={() => onImportLabel?.(label)}
                className="flex-shrink-0 bg-amber-600 text-white text-xs px-2 py-1 rounded-lg"
              >
                Import
              </button>
            )}
          </div>
        ))}
      </div>

      {autoEvents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              Auto Matches ({autoEvents.length})
            </p>
            <button onClick={onKeepAuto} className="bg-amber-600 text-white text-xs px-2 py-1 rounded-lg">
              Keep All
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar">
            {autoEvents.map((ev, i) => (
              <div
                key={ev.id ?? i}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <span className="w-1.5 h-6 rounded-sm flex-shrink-0" style={{ background: ev.color || '#f59e0b' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ev.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {fmtTime(ev.start_frame ?? ev.frame_index ?? 0, fps)}
                    {ev.end_frame != null ? ` – ${fmtTime(ev.end_frame, fps)}` : ''}
                    {ev.score != null && <span className="ml-1 text-amber-300">{(ev.score * 100).toFixed(0)}%</span>}
                  </p>
                </div>
                {onEventClick && (
                  <button
                    onClick={() => onEventClick(ev)}
                    className="flex-shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-lg font-medium transition-colors"
                    title="Seek to match and open compare mode"
                  >
                    ▶ Compare
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 uppercase tracking-wide">Session Events</p>
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {events.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No saved session events</p>
        )}
        {events.map((ev, i) => (
          <div key={ev.id ?? i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <span className="w-2 h-6 rounded-sm flex-shrink-0" style={{ background: ev.color || '#64748b' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ev.label}</p>
              <p className="text-xs text-slate-400">
                {fmtTime(ev.frame_index ?? 0, fps)} frame {ev.frame_index}
              </p>
            </div>
            <button onClick={() => removeEvent(ev.id ?? i)} className="text-slate-500 hover:text-red-400 text-xs p-1">
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { legacyKeypointsToCanonical, LEGACY_TO_CANONICAL } from '../lib/labelMapping.js'
import SkeletonViewer3D from '../components/SkeletonViewer3D.jsx'
import { detectForehandPhases, PHASE_COLORS, PHASE_LABELS } from '../lib/strokePhaseDetector.js'

const COMPUTED_BONES = {
  Hips:   { desc: 'avg(l_hip, r_hip)',            deps: ['l_hip', 'r_hip'] },
  Spine1: { desc: '33% lerp(Hips→Neck)',          deps: ['l_hip', 'r_hip', 'l_shoulder', 'r_shoulder'] },
  Spine2: { desc: '66% lerp(Hips→Neck)',          deps: ['l_hip', 'r_hip', 'l_shoulder', 'r_shoulder'] },
  Neck:   { desc: 'avg(l_shoulder, r_shoulder)',  deps: ['l_shoulder', 'r_shoulder'] },
  Head:   { desc: 'nose',                          deps: ['nose'] },
}

// ── Enable/Disable toggle ─────────────────────────────────────────────────────
function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!enabled) }}
      className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${enabled ? 'bg-indigo-500' : 'bg-slate-600'}`}
      title={enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

// ── Auto Map panel (legacy label only) ───────────────────────────────────────
function AutoMapPanel({ labelDetail }) {
  if (!labelDetail) return null
  if (labelDetail.schema === 'label_clip_v1') {
    return (
      <div className="bg-slate-800 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Auto Map</p>
        <p className="text-xs text-green-400">Already canonical — no remapping needed.</p>
      </div>
    )
  }
  const kpNames = new Set(labelDetail.keypoint_names || [])
  const rows = Object.keys(LEGACY_TO_CANONICAL).map(dst => {
    const computed = COMPUTED_BONES[dst]
    const deps = computed ? computed.deps : LEGACY_TO_CANONICAL[dst]
    const desc = computed ? computed.desc : LEGACY_TO_CANONICAL[dst].join(' + ')
    const ok = deps.some(d => kpNames.has(d))
    return { dst, desc, ok }
  })
  const okCount = rows.filter(r => r.ok).length
  return (
    <div className="bg-slate-800 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto no-scrollbar">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Auto Map</p>
      {kpNames.size === 0
        ? <p className="text-xs text-red-400 mb-2">No keypoint_names — cannot auto-map.</p>
        : <p className="text-xs text-slate-500 mb-2">{okCount}/{rows.length} bones mapped
            {okCount < rows.length && <span className="text-yellow-400"> · {rows.length - okCount} missing</span>}
          </p>
      }
      {kpNames.size > 0 && (
        <p className="text-[10px] text-slate-600 mb-2 break-all">{[...kpNames].join(', ')}</p>
      )}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {rows.map(({ dst, desc, ok }) => (
          <div key={dst} className={`rounded-md border px-2 py-1.5 ${ok ? 'bg-slate-950 border-slate-700' : 'bg-red-950/30 border-red-700/40'}`}>
            <div className={`font-medium truncate ${ok ? 'text-slate-300' : 'text-red-400'}`}>{dst}</div>
            <div className={`truncate text-[10px] ${ok ? 'text-slate-500' : 'text-red-600/70'}`}>{desc}{!ok && ' ✗'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Session → Label panel ─────────────────────────────────────────────────────
function SessionLabelPanel({ session, onSaved }) {
  const [frames, setFrames] = useState([])
  const [loadingFrames, setLoadingFrames] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [clipStart, setClipStart] = useState(null)
  const [clipEnd, setClipEnd] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#f59e0b')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    if (!session) return
    setFrames([])
    setPreviewIdx(0)
    setClipStart(null)
    setClipEnd(null)
    setSaveStatus('')
    // pre-fill name from session filename
    setName(session.filename || session.source || session.session_id || '')
    setLoadingFrames(true)
    fetch(`/api/sessions/${session.session_id}/keypoints`)
      .then(r => r.ok ? r.json() : { frames: [] })
      .then(d => { setFrames(d.frames || []); setLoadingFrames(false) })
      .catch(() => setLoadingFrames(false))
  }, [session])

  const previewKp = useMemo(() => {
    return frames[Math.min(previewIdx, frames.length - 1)]?.keypoints_17 || null
  }, [frames, previewIdx])

  const fps = session?.source_fps || 30
  const total = frames.length

  function fmtTime(f) { return `${(f / Math.max(1, fps)).toFixed(2)}s` }

  async function saveLabel() {
    if (!name.trim()) { setSaveStatus('Name required'); return }
    if (clipStart == null || clipEnd == null) { setSaveStatus('Set start and end frames'); return }
    setSaving(true); setSaveStatus('Saving…')
    try {
      const res = await fetch(`/api/sessions/${session.session_id}/label-clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), color,
          start_frame: Math.min(clipStart, clipEnd),
          end_frame: Math.max(clipStart, clipEnd),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaveStatus('Saved!')
      onSaved?.()
    } catch (err) {
      setSaveStatus(err.message || 'Save failed')
    }
    setSaving(false)
    setTimeout(() => setSaveStatus(''), 2500)
  }

  if (!session) return <div className="flex-1 flex items-center justify-center text-slate-500">Select a session</div>

  return (
    <div className="flex-1 grid grid-rows-[1fr_auto] min-h-0">
      <div className="grid grid-cols-[1.2fr_0.8fr] min-h-0">
        {/* 3D skeleton preview */}
        <div className="relative min-h-0 bg-slate-950">
          {loadingFrames ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <SkeletonViewer3D keypoints={previewKp} isWorldCoords className="absolute inset-0" />
          )}
          <div className="absolute top-2 left-2 bg-black/60 rounded-lg px-2 py-1 text-xs text-slate-200 pointer-events-none truncate max-w-[60%]">
            {session.filename || session.source || session.session_id}
          </div>
          <div className="absolute top-2 right-2 bg-black/60 rounded-lg px-2 py-1 text-xs text-slate-400 pointer-events-none">
            drag · scroll to zoom
          </div>
        </div>

        {/* Controls */}
        <div className="border-l border-slate-700 bg-slate-900 p-3 flex flex-col gap-3 min-h-0 overflow-y-auto no-scrollbar">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Create Label</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2"
              placeholder="label name"
            />
            <div className="flex gap-2 mb-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-12 h-9 bg-slate-950 border border-slate-700 rounded-lg" />
              <div className="flex-1 grid grid-cols-2 gap-1">
                <button
                  onClick={() => setClipStart(previewIdx)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-lg"
                >
                  Set Start{clipStart != null ? ` ${clipStart}` : ''}
                </button>
                <button
                  onClick={() => setClipEnd(previewIdx)}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-lg"
                >
                  Set End{clipEnd != null ? ` ${clipEnd}` : ''}
                </button>
              </div>
            </div>
            {clipStart != null && clipEnd != null && (
              <p className="text-xs text-slate-400 mb-2">
                {fmtTime(Math.min(clipStart, clipEnd))} → {fmtTime(Math.max(clipStart, clipEnd))}
                {' '}({Math.abs(clipEnd - clipStart) + 1} frames)
              </p>
            )}
            <button
              onClick={saveLabel}
              disabled={saving || !total}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm py-2 rounded-lg font-medium"
            >
              {saving ? 'Saving…' : 'Save as Label'}
            </button>
            {saveStatus && <p className="text-xs text-slate-400 mt-2">{saveStatus}</p>}
          </div>

          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 flex flex-col gap-1">
            <p><span className="text-slate-500">ID</span> {session.session_id}</p>
            <p><span className="text-slate-500">FPS</span> {fps}</p>
            <p><span className="text-slate-500">Frames</span> {total || '…'}</p>
            {session.source_width && <p><span className="text-slate-500">Size</span> {session.source_width}×{session.source_height}</p>}
          </div>
        </div>
      </div>

      {/* Frame scrubber */}
      <div className="border-t border-slate-700 bg-slate-900 px-3 py-3">
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={Math.max(0, total - 1)} value={previewIdx}
            onChange={e => setPreviewIdx(parseInt(e.target.value, 10))}
            className="flex-1"
            disabled={!total}
          />
          <div className="text-xs text-slate-400 w-28 text-right">
            {previewIdx + 1} / {total || 0}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phase Panel ───────────────────────────────────────────────────────────────
const KEY_FRAME_KEYS = ['backswingStart', 'backswingPeak', 'impact', 'followEnd']
const KEY_FRAME_LABELS = { backswingStart: 'Backswing Start', backswingPeak: 'Backswing Peak', impact: 'Impact', followEnd: 'Follow End' }
const KEY_FRAME_SHORT  = { backswingStart: 'BS', backswingPeak: 'BP', impact: '⚡', followEnd: 'FE' }

function PhasePanel({ labelDetail, currentFrameIdx, onSaved }) {
  const totalFrames = labelDetail?.frames?.length || 0

  // Auto-detected phases from pose data
  const autoPhases = useMemo(() => {
    if (labelDetail?.schema !== 'label_clip_v1' || !labelDetail.frames?.length) return null
    return detectForehandPhases(labelDetail.frames)
  }, [labelDetail])

  // Manual overrides (start from saved phases, or auto-detected, or null)
  const [manual, setManual] = useState(null)  // null = not overridden
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  // Sync manual state when a label is loaded that already has saved phases
  useEffect(() => {
    if (labelDetail?.phases) {
      setManual(labelDetail.phases)
    } else {
      setManual(null)
    }
  }, [labelDetail?.label_id])

  // Active key frames = manual override if set, otherwise auto-detected
  const activeKeyFrames = manual ?? autoPhases?.keyFrames ?? null

  // Derive phaseAtFrame from activeKeyFrames
  const phaseAtFrame = useMemo(() => {
    if (!activeKeyFrames || !totalFrames) return null
    const { backswingStart, backswingPeak, impact, followEnd } = activeKeyFrames
    return Array.from({ length: totalFrames }, (_, i) => {
      if (i === impact)            return 'impact'
      if (i >= impact && i <= followEnd) return 'followThrough'
      if (i >= backswingPeak)      return 'acceleration'
      if (i >= backswingStart)     return 'backswing'
      return 'preparation'
    })
  }, [activeKeyFrames, totalFrames])

  const currentPhase = phaseAtFrame?.[currentFrameIdx] ?? null

  function setKeyFrame(key) {
    const base = manual ?? autoPhases?.keyFrames ?? {}
    setManual({ ...base, [key]: currentFrameIdx })
  }

  function resetToAuto() {
    setManual(null)
  }

  async function savePhases() {
    if (!activeKeyFrames) return
    setSaving(true); setSaveStatus('Saving…')
    try {
      const res = await fetch(`/api/labels/${labelDetail.label_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phases: activeKeyFrames }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaveStatus('Saved')
      onSaved?.()
    } catch (err) {
      setSaveStatus(err.message || 'Save failed')
    }
    setSaving(false)
    setTimeout(() => setSaveStatus(''), 2000)
  }

  async function clearPhases() {
    setSaving(true); setSaveStatus('Clearing…')
    try {
      await fetch(`/api/labels/${labelDetail.label_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phases: null }),
      })
      setManual(null)
      setSaveStatus('Cleared')
      onSaved?.()
    } catch (_) { setSaveStatus('Failed') }
    setSaving(false)
    setTimeout(() => setSaveStatus(''), 2000)
  }

  if (!autoPhases && !labelDetail?.phases) {
    return (
      <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-500">
        Phase detection requires a match-ready label with pose data
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">Phases</p>
        <div className="flex items-center gap-1.5">
          {manual && (
            <button onClick={resetToAuto} className="text-[10px] text-amber-400 hover:text-amber-300">
              reset auto
            </button>
          )}
          {currentPhase && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: PHASE_COLORS[currentPhase] + 'cc', color: '#fff' }}
            >
              {PHASE_LABELS[currentPhase]}
            </span>
          )}
        </div>
      </div>

      {/* Phase strip */}
      {activeKeyFrames && totalFrames > 0 && (() => {
        const { backswingStart, backswingPeak, impact, followEnd } = activeKeyFrames
        const bands = [
          { key: 'preparation',   start: 0,              end: backswingStart  },
          { key: 'backswing',     start: backswingStart,  end: backswingPeak   },
          { key: 'acceleration',  start: backswingPeak,   end: impact          },
          { key: 'impact',        start: impact,          end: impact          },
          { key: 'followThrough', start: impact,          end: followEnd       },
        ]
        return (
          <div className="flex h-5 rounded overflow-hidden gap-px">
            {bands.map(({ key, start, end }) => {
              const w = ((end - start + 1) / totalFrames * 100).toFixed(1)
              const isActive = key === currentPhase
              return (
                <div
                  key={key}
                  title={`${PHASE_LABELS[key]}: frames ${start}–${end}`}
                  className="flex items-center justify-center text-[8px] font-bold overflow-hidden whitespace-nowrap transition-all"
                  style={{
                    width: w + '%',
                    minWidth: 3,
                    background: PHASE_COLORS[key] + (isActive ? 'ee' : '55'),
                    color: isActive ? '#fff' : PHASE_COLORS[key],
                    outline: isActive ? `1px solid ${PHASE_COLORS[key]}` : 'none',
                  }}
                >
                  {parseFloat(w) > 10 ? PHASE_LABELS[key] : ''}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Key frame setters */}
      {activeKeyFrames && (
        <div className="grid grid-cols-1 gap-1 mt-1">
          {KEY_FRAME_KEYS.map(key => {
            const fi = activeKeyFrames[key]
            const isHere = fi === currentFrameIdx
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-5 text-center text-[9px] font-bold rounded"
                  style={{ background: PHASE_COLORS[
                    key === 'backswingStart' || key === 'backswingPeak' ? 'backswing'
                    : key === 'impact' ? 'impact' : 'followThrough'
                  ] + '88', color: '#fff' }}
                >
                  {KEY_FRAME_SHORT[key]}
                </span>
                <span className="text-[10px] text-slate-400 flex-1 truncate">{KEY_FRAME_LABELS[key]}</span>
                <span className="text-[10px] text-slate-300 font-mono w-6 text-right">{fi ?? '—'}</span>
                <button
                  onClick={() => setKeyFrame(key)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    isHere
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                  title={`Set ${KEY_FRAME_LABELS[key]} to frame ${currentFrameIdx}`}
                >
                  ← {currentFrameIdx}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Save / clear */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={savePhases}
          disabled={saving || !activeKeyFrames}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs py-1.5 rounded-lg font-medium"
        >
          {saving ? '…' : 'Save Phases'}
        </button>
        {labelDetail?.phases && (
          <button
            onClick={clearPhases}
            disabled={saving}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-2 py-1.5 rounded-lg"
            title="Remove saved phases (revert to auto)"
          >
            ✕
          </button>
        )}
      </div>
      {saveStatus && <p className="text-[10px] text-slate-400">{saveStatus}</p>}

      {!manual && autoPhases && (
        <p className="text-[10px] text-slate-500">Auto-detected · drag scrubber then click ← to override</p>
      )}
      {manual && (
        <p className="text-[10px] text-amber-500">Manual overrides active</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LabelEditorPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('labels') // 'labels' | 'sessions'

  // Labels
  const [labels, setLabels] = useState([])
  const [selected, setSelected] = useState(null)
  const [labelDetail, setLabelDetail] = useState(null)
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0)
  const [importName, setImportName] = useState('')
  const [importColor, setImportColor] = useState('#f59e0b')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  // Sessions
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)

  const selectedFrame = useMemo(() => {
    if (!labelDetail?.frames?.length) return null
    return labelDetail.frames[Math.min(previewFrameIndex, labelDetail.frames.length - 1)]
  }, [labelDetail, previewFrameIndex])

  const canonicalPreview = useMemo(() => {
    if (!selectedFrame || !labelDetail) return null
    if (labelDetail.schema === 'label_clip_v1') return selectedFrame.keypoints_17 || null
    return legacyKeypointsToCanonical(selectedFrame, labelDetail.keypoint_names || [])
  }, [selectedFrame, labelDetail])

  // Auto-detected phases for the scrubber phase track (only for label_clip_v1 without saved phases)
  const scrubberPhaseKf = useMemo(() => {
    if (labelDetail?.phases) return labelDetail.phases
    if (labelDetail?.schema !== 'label_clip_v1' || !labelDetail.frames?.length) return null
    return detectForehandPhases(labelDetail.frames)?.keyFrames ?? null
  }, [labelDetail])

  const isWorldCoords = labelDetail?.schema === 'label_clip_v1'

  async function loadLabels() {
    try {
      const res = await fetch('/api/labels')
      const data = await res.json()
      setLabels(data.labels || [])
    } catch (_) {}
  }

  async function loadSessions() {
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (_) {}
  }

  useEffect(() => { loadLabels() }, [])
  useEffect(() => { if (activeTab === 'sessions') loadSessions() }, [activeTab])

  useEffect(() => {
    if (!selected) return
    async function loadDetail() {
      try {
        const res = await fetch(`/api/labels/${selected.label_id}`)
        if (res.ok) {
          const data = await res.json()
          setLabelDetail(data)
          setPreviewFrameIndex(0)
          setImportName(data.name || selected.name || '')
          setImportColor(data.color || '#f59e0b')
        }
      } catch (_) {}
    }
    loadDetail()
  }, [selected])

  async function toggleEnabled(label) {
    const newEnabled = label.enabled === false ? true : false
    try {
      await fetch(`/api/labels/${label.label_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })
      setLabels(prev => prev.map(l => l.label_id === label.label_id ? { ...l, enabled: newEnabled } : l))
      if (selected?.label_id === label.label_id) {
        setSelected(prev => prev ? { ...prev, enabled: newEnabled } : prev)
      }
    } catch (_) {}
  }

  async function importSelected() {
    if (!selected) return
    setLoading(true); setStatus('Importing…')
    try {
      const res = await fetch(`/api/labels/${selected.label_id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: importName, color: importColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setStatus(`Imported ${selected.name}`)
      await loadLabels()
      if (data.label?.label_id) setSelected(data.label)
    } catch (err) {
      setStatus(err.message || 'Import failed')
    } finally {
      setLoading(false)
      setTimeout(() => setStatus(''), 2200)
    }
  }

  async function saveChanges() {
    if (!selected) return
    setLoading(true); setStatus('Saving…')
    try {
      const res = await fetch(`/api/labels/${selected.label_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: importName, color: importColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setStatus('Saved')
      await loadLabels()
      if (data.label) {
        setSelected(data.label)
        setLabelDetail(prev => prev ? { ...prev, name: importName, color: importColor } : prev)
      }
    } catch (err) {
      setStatus(err.message || 'Save failed')
    } finally {
      setLoading(false)
      setTimeout(() => setStatus(''), 2200)
    }
  }

  async function deleteLabel(label) {
    if (!confirm(`Delete "${label.name}"?`)) return
    try {
      const res = await fetch(`/api/labels/${label.label_id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setStatus(d.error || 'Delete failed'); return }
      await loadLabels()
      if (selected?.label_id === label.label_id) { setSelected(null); setLabelDetail(null) }
    } catch (_) { setStatus('Delete failed') }
    setTimeout(() => setStatus(''), 2200)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
        <button onClick={() => navigate('/pose')} className="text-slate-400 hover:text-white p-1 -ml-1">←</button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Label Editor</p>
          <p className="text-xs text-slate-400">Manage labels · import legacy · create from sessions</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr] gap-0">
        {/* ── Left sidebar ───────────────────────────────────────────────── */}
        <aside className="border-r border-slate-700 bg-slate-900 flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => { setActiveTab('labels'); setSelectedSession(null) }}
              className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
                activeTab === 'labels' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Labels ({labels.length})
            </button>
            <button
              onClick={() => { setActiveTab('sessions'); setSelected(null); setLabelDetail(null) }}
              className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
                activeTab === 'sessions' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sessions
            </button>
          </div>

          {/* Labels list */}
          {activeTab === 'labels' && (
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 flex flex-col gap-1.5">
              {labels.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-6">No labels yet</p>
              )}
              {labels.map(label => {
                const enabled = label.enabled !== false
                const isSelected = selected?.label_id === label.label_id
                return (
                  <div
                    key={label.label_id}
                    className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 border transition-colors ${
                      isSelected ? 'bg-slate-700 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    } ${!enabled ? 'opacity-50' : ''}`}
                  >
                    {/* Enable toggle */}
                    <Toggle enabled={enabled} onChange={() => toggleEnabled(label)} />

                    {/* Name / info */}
                    <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => setSelected(label)}>
                      <span className="w-2 h-5 rounded-sm flex-shrink-0" style={{ background: label.color || '#64748b' }} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${!enabled ? 'line-through text-slate-500' : ''}`}>{label.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {label.frame_count || 0}fr · {label.match_ready ? 'match-ready' : 'legacy'}
                        </p>
                      </div>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteLabel(label)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs p-1 flex-shrink-0 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sessions list */}
          {activeTab === 'sessions' && (
            <div className="flex-1 overflow-y-auto no-scrollbar p-2 flex flex-col gap-1.5">
              {sessions.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-6">No sessions</p>
              )}
              {sessions.filter(s => s.status === 'done').map(s => (
                <button
                  key={s.session_id}
                  onClick={() => setSelectedSession(s)}
                  className={`text-left rounded-lg px-2.5 py-2 border transition-colors flex flex-col gap-0.5 w-full ${
                    selectedSession?.session_id === s.session_id
                      ? 'bg-slate-700 border-indigo-500'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <p className="text-xs font-medium truncate">{s.filename || s.source || s.session_id}</p>
                  <p className="text-[10px] text-slate-500">
                    {s.frame_count || 0} frames · {Math.round(s.source_fps || 30)}fps
                  </p>
                </button>
              ))}
              {sessions.filter(s => s.status !== 'done').length > 0 && (
                <p className="text-[10px] text-slate-600 px-1 mt-1">
                  {sessions.filter(s => s.status !== 'done').length} unprocessed session(s) hidden
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ── Main panel ─────────────────────────────────────────────────── */}
        <main className="min-h-0 flex flex-col overflow-hidden">
          {/* Sessions tab — session selected */}
          {activeTab === 'sessions' && (
            <SessionLabelPanel
              session={selectedSession}
              onSaved={() => { loadLabels(); setActiveTab('labels') }}
            />
          )}

          {/* Labels tab — nothing selected */}
          {activeTab === 'labels' && !labelDetail && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500">
              <p className="text-sm">Select a label to inspect</p>
              <p className="text-xs text-slate-600">or switch to Sessions to create from a recording</p>
            </div>
          )}

          {/* Labels tab — label selected */}
          {activeTab === 'labels' && labelDetail && (
            <div className="flex-1 grid grid-rows-[1fr_auto] min-h-0">
              <div className="grid grid-cols-[1.2fr_0.8fr] min-h-0">
                {/* 3D preview */}
                <div className="relative min-h-0 bg-slate-950">
                  <SkeletonViewer3D
                    keypoints={canonicalPreview}
                    isWorldCoords={isWorldCoords}
                    className="absolute inset-0"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 rounded-lg px-2 py-1 text-xs text-slate-200 pointer-events-none">
                    {labelDetail.name}
                  </div>
                  {selected?.enabled === false && (
                    <div className="absolute top-2 right-2 bg-red-900/80 rounded-lg px-2 py-1 text-xs text-red-300 pointer-events-none">
                      Disabled — not matched
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="border-l border-slate-700 bg-slate-900 p-3 flex flex-col gap-3 min-h-0 overflow-y-auto no-scrollbar">
                  {/* Enable toggle in detail */}
                  {selected && (
                    <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Use in auto-match</span>
                      <Toggle
                        enabled={selected.enabled !== false}
                        onChange={() => toggleEnabled(selected)}
                      />
                    </div>
                  )}

                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                      {labelDetail.schema === 'label_clip_v1' ? 'Rename / Color' : 'Import'}
                    </p>
                    <input
                      value={importName}
                      onChange={e => setImportName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2"
                      placeholder="label name"
                    />
                    <div className="flex items-center gap-2">
                      <input type="color" value={importColor} onChange={e => setImportColor(e.target.value)}
                        className="w-12 h-10 bg-slate-950 border border-slate-700 rounded-lg" />
                      {labelDetail.schema === 'label_clip_v1' ? (
                        <button onClick={saveChanges} disabled={loading}
                          className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-60 text-white text-sm py-2 rounded-lg font-medium">
                          {loading ? 'Saving…' : 'Save Changes'}
                        </button>
                      ) : (
                        <button onClick={importSelected} disabled={loading || !selected}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm py-2 rounded-lg font-medium">
                          {loading ? 'Importing…' : 'Import To Library'}
                        </button>
                      )}
                    </div>
                    {status && <p className="text-xs text-slate-400 mt-2">{status}</p>}
                  </div>

                  <AutoMapPanel labelDetail={labelDetail} />

                  {/* Phase detection + manual override (label_clip_v1 only) */}
                  {labelDetail.schema === 'label_clip_v1' && (
                    <PhasePanel
                      labelDetail={labelDetail}
                      currentFrameIdx={previewFrameIndex}
                      onSaved={async () => {
                        const res = await fetch(`/api/labels/${selected.label_id}`)
                        if (res.ok) setLabelDetail(await res.json())
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Frame scrubber */}
              <div className="border-t border-slate-700 bg-slate-900 px-3 py-3">
                {/* Phase color track above slider */}
                {labelDetail.schema === 'label_clip_v1' && (() => {
                  const kf = scrubberPhaseKf
                  if (!kf) return null
                  const total = labelDetail.frames?.length || 1
                  const { backswingStart, backswingPeak, impact, followEnd } = kf
                  const bands = [
                    { key: 'preparation',   s: 0,              e: backswingStart  },
                    { key: 'backswing',     s: backswingStart,  e: backswingPeak   },
                    { key: 'acceleration',  s: backswingPeak,   e: impact          },
                    { key: 'impact',        s: impact,          e: impact          },
                    { key: 'followThrough', s: impact,          e: followEnd       },
                  ]
                  return (
                    <div className="flex h-1.5 rounded overflow-hidden mb-1.5 gap-px">
                      {bands.map(({ key, s, e }) => (
                        <div
                          key={key}
                          style={{ width: ((e - s + 1) / total * 100).toFixed(1) + '%', minWidth: 2, background: PHASE_COLORS[key] }}
                        />
                      ))}
                    </div>
                  )
                })()}
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0}
                    max={Math.max(0, (labelDetail.frames?.length || 1) - 1)}
                    value={previewFrameIndex}
                    onChange={e => setPreviewFrameIndex(parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <div className="text-xs text-slate-400 w-28 text-right">
                    {previewFrameIndex + 1} / {labelDetail.frames?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

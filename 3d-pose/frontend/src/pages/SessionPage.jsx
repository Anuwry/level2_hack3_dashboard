/**
 * SessionPage — 3D avatar replay + label mode.
 *
 * Modes:
 *   ?mode=process  → watch live processing, then auto-switch to replay
 *   (default)      → file replay from saved keypoints
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import AvatarViewer from '../components/AvatarViewer.jsx'
import SkeletonViewer3D from '../components/SkeletonViewer3D.jsx'
import DraggableWindow from '../components/DraggableWindow.jsx'
import { BONE_CHAIN } from '../lib/boneAnimation.js'
import Timeline from '../components/Timeline.jsx'
import LabelPanel from '../components/LabelPanel.jsx'
import { useProcessStream, useReplayWS } from '../hooks/useAvatarWS.js'
import { drawSkeletonImage } from '../lib/drawSkeleton.js'
import { MATCH_THRESHOLD, matchLabelsToFrames, poseSimilarityDetailed, normalizePose, poseSimilarity, computeStrokeAlignment, getStrokeWeights } from '../lib/poseSimilarity.js'
import { detectForehandPhases, PHASE_COLORS, PHASE_LABELS } from '../lib/strokePhaseDetector.js'

function scoreColor(score) {
  if (score == null) return '#64748b'
  if (score >= 90) return '#44cc88'
  if (score >= 70) return '#cccc44'
  if (score >= 50) return '#cc7744'
  return '#cc4444'
}

function scoreGrade(score) {
  if (score >= 90) return { label: 'ยอดเยี่ยม', emoji: 'S' }
  if (score >= 70) return { label: 'ดีมาก', emoji: 'A' }
  if (score >= 50) return { label: 'พอใช้ได้', emoji: 'B' }
  return { label: 'ต้องฝึกเพิ่ม', emoji: 'C' }
}

const JOINT_TH = {
  RightHand: 'ข้อมือขวา',
  RightForeArm: 'ข้อศอกขวา',
  RightArm: 'ไหล่ขวา',
  LeftHand: 'ข้อมือซ้าย',
  LeftForeArm: 'ข้อศอกซ้าย',
  LeftArm: 'ไหล่ซ้าย',
  Spine2: 'หลัง/เอว',
  Neck: 'คอ',
  Head: 'ศีรษะ',
  RightUpLeg: 'สะโพกขวา',
  RightLeg: 'เข่าขวา',
  RightFoot: 'เท้าขวา',
  LeftUpLeg: 'สะโพกซ้าย',
  LeftLeg: 'เข่าซ้าย',
  LeftFoot: 'เท้าซ้าย',
}

export default function SessionPage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isProcessMode = searchParams.get('mode') === 'process'

  const [session, setSession] = useState(null)
  const [mode, setMode] = useState(isProcessMode ? 'process' : 'replay')
  const [speed, setSpeedState] = useState(1.0)
  const [showLabels, setShowLabels] = useState(false)
  const [labelMode, setLabelMode] = useState(false)
  const [hitEvents, setHitEvents] = useState([])
  const [autoEvents, setAutoEvents] = useState([])
  const [labelLibrary, setLabelLibrary] = useState([])
  const [replayFrames, setReplayFrames] = useState([])
  const [liveBuffer, setLiveBuffer] = useState([])
  const [clipStart, setClipStart] = useState(null)
  const [clipEnd, setClipEnd] = useState(null)
  const [labelName, setLabelName] = useState('')
  const [labelColor, setLabelColor] = useState('#f59e0b')
  const [libraryStatus, setLibraryStatus] = useState('')
  const [previewFrame, setPreviewFrame] = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [showModel, setShowModel]       = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [compareMode, setCompareMode]     = useState(false)
  const [compareLabel, setCompareLabel]   = useState(null)
  const [activeAutoEvent, setActiveAutoEvent] = useState(null)  // the specific event being compared

  const videoRef      = useRef(null)
  const skelCanvasRef = useRef(null)

  // Process stream (used when mode === 'process')
  const {
    keypoints: processKP,
    imageKp:   processImageKp,
    currentFrame: processFrame,
    status: processStatus,
    frameData,
  } = useProcessStream(mode === 'process' ? sessionId : null)

  // Replay WS (used when mode === 'replay')
  const {
    keypoints: replayKP,
    imageKp:   replayImageKp,
    currentFrame: replayFrame,
    totalFrames,
    status: replayStatus,
    play,
    pause,
    seek,
    setSpeed,
    setFps,
  } = useReplayWS(mode === 'replay' ? sessionId : null)

  const keypoints = previewFrame?.keypoints_17 || (mode === 'process' ? processKP : replayKP)
  const imageKp   = previewFrame?.keypoints_image || (mode === 'process' ? processImageKp : replayImageKp)
  const currentFrame = mode === 'process' ? processFrame : replayFrame

  // Fetch session metadata
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`)
        if (res.ok) setSession(await res.json())
      } catch (_) {}
    }
    load()
  }, [sessionId])

  // Fetch saved labels
  useEffect(() => {
    async function loadLabels() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/labels`)
        if (res.ok) {
          const data = await res.json()
          setHitEvents(data.events || [])
        }
      } catch (_) {}
    }
    loadLabels()
  }, [sessionId])

  const loadLabelLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/labels')
      if (!res.ok) return
      const data = await res.json()
      const summaries = data.labels || []
      const fullLabels = await Promise.all(summaries.map(async label => {
        if (!label.match_ready) return label
        try {
          const detail = await fetch(`/api/labels/${label.label_id}`)
          return detail.ok ? await detail.json() : label
        } catch (_) {
          return label
        }
      }))
      setLabelLibrary(fullLabels)
    } catch (_) {}
  }, [])

  useEffect(() => {
    loadLabelLibrary()
  }, [loadLabelLibrary])

  useEffect(() => {
    if (mode !== 'replay') return
    async function loadFrames() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/keypoints`)
        if (res.ok) {
          const data = await res.json()
          setReplayFrames(data.frames || [])
        }
      } catch (_) {}
    }
    loadFrames()
  }, [sessionId, mode])

  // Auto-switch to replay when processing finishes
  useEffect(() => {
    if (mode === 'process' && processStatus === 'done') {
      setTimeout(() => setMode('replay'), 500)
    }
  }, [processStatus, mode])

  useEffect(() => {
    if (mode !== 'process' || !frameData?.keypoints_17) return
    setLiveBuffer(prev => [...prev, frameData].slice(-240))
  }, [mode, frameData])

  useEffect(() => {
    const matchableLabels = labelLibrary.filter(l => l.normalized_sequence?.length && l.enabled !== false)
    if (mode === 'replay' && replayFrames.length && matchableLabels.length) {
      setAutoEvents(matchLabelsToFrames(matchableLabels, replayFrames, MATCH_THRESHOLD))
    } else if (mode === 'process' && liveBuffer.length && matchableLabels.length) {
      setAutoEvents(matchLabelsToFrames(matchableLabels, liveBuffer, MATCH_THRESHOLD).slice(-50))
    } else {
      setAutoEvents([])
    }
  }, [mode, replayFrames, liveBuffer, labelLibrary])

  // Sync fps from session metadata
  useEffect(() => {
    if (session?.source_fps) setFps(session.source_fps)
  }, [session, setFps])

  // Sync video thumbnail to current frame
  useEffect(() => {
    const v = videoRef.current
    if (!v || !session?.source_fps) return
    const t = currentFrame / session.source_fps
    if (Math.abs(v.currentTime - t) > 0.5) v.currentTime = t
  }, [currentFrame, session])

  // Draw 2D skeleton on overlay canvas whenever imageKp changes
  useEffect(() => {
    const canvas = skelCanvasRef.current
    if (!canvas) return
    canvas.width  = canvas.offsetWidth  || 112
    canvas.height = canvas.offsetHeight || 160
    drawSkeletonImage(canvas, imageKp)
  }, [imageKp])

  const isPlaying = replayStatus === 'playing'


  function handlePlayPause() {
    setPreviewFrame(null)
    if (isPlaying) {
      pause()
    } else {
      play(currentFrame)
    }
  }

  function handleSeek(frame) {
    setPreviewFrame(null)
    seek(frame)
  }

  function handleAddLabel(frame) {
    if (clipStart == null || (clipStart != null && clipEnd != null)) {
      setClipStart(frame)
      setClipEnd(null)
    } else {
      setClipEnd(frame)
    }
    setShowLabels(true)
  }

  function openCropMode() {
    setShowLabels(true)
    setLabelMode(true)
  }

  const pendingFrameRef = useRef(null)

  function handleLabelUpdate(events) {
    setHitEvents(events)
    pendingFrameRef.current = null
  }

  async function saveLabelClip() {
    const name = labelName.trim()
    if (!name) {
      setLibraryStatus('Name is required')
      return
    }
    if (clipStart == null || clipEnd == null) {
      setLibraryStatus('Set start and end frames')
      return
    }
    setLibraryStatus('Saving clip...')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/label-clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color: labelColor,
          start_frame: clipStart,
          end_frame: clipEnd,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setLibraryStatus('Clip saved')
      setLabelName('')
      setClipStart(null)
      setClipEnd(null)
      await loadLabelLibrary()
    } catch (err) {
      setLibraryStatus(err.message || 'Save failed')
    }
    setTimeout(() => setLibraryStatus(''), 2500)
  }

  async function importLabel(label) {
    setLibraryStatus(`Importing ${label.name}...`)
    try {
      const res = await fetch(`/api/labels/${label.label_id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label.name, color: label.color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      await loadLabelLibrary()
      if (data.label?.label_id) {
        const detail = await fetch(`/api/labels/${data.label.label_id}`)
        if (detail.ok) {
          const clip = await detail.json()
          if (clip.frames?.[0]) setPreviewFrame(clip.frames[0])
        }
      }
      setLibraryStatus(`Imported ${label.name}`)
    } catch (err) {
      setLibraryStatus(err.message || 'Import failed')
    }
    setTimeout(() => setLibraryStatus(''), 2500)
  }

  function keepAutoEvents() {
    setHitEvents(prev => {
      const keys = new Set(prev.map(ev => `${ev.source}:${ev.label_id}:${ev.frame_index}`))
      const merged = [...prev]
      for (const ev of autoEvents) {
        const key = `${ev.source}:${ev.label_id}:${ev.frame_index}`
        if (!keys.has(key)) merged.push({ ...ev, id: `kept-${ev.id}` })
      }
      return merged.sort((a, b) => a.frame_index - b.frame_index)
    })
  }

  function previewLabel(label) {
    const firstFrame = label?.frames?.[0]
    if (!firstFrame) {
      setLibraryStatus('This label has no saved preview frames')
      setTimeout(() => setLibraryStatus(''), 2000)
      return
    }
    setPreviewFrame(firstFrame)
    setCompareLabel(label)
    setActiveAutoEvent(null)  // manual preview — use DTW, not event-window sync
    if (mode === 'replay' && label.source_session_id === sessionId && Number.isFinite(label.start_frame)) {
      seek(label.start_frame)
    }
  }

  function handleEventClick(ev) {
    const label = labelLibrary.find(l => l.label_id === ev.label_id)
    if (!label?.frames?.length) {
      setLibraryStatus(`Label "${ev.label}" has no frames — run Auto first or refresh library`)
      setTimeout(() => setLibraryStatus(''), 3000)
      return
    }
    setCompareLabel(label)
    setActiveAutoEvent(ev)
    setCompareMode(true)
    setPreviewFrame(null)
    setShowLabels(false)
    seek(ev.start_frame ?? ev.frame_index ?? 0)
  }

  async function saveLabels() {
    setSaveStatus('Saving...')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, events: hitEvents }),
      })
      if (res.ok) setSaveStatus('Saved!')
      else setSaveStatus('Failed')
    } catch (_) {
      setSaveStatus('Failed')
    }
    setTimeout(() => setSaveStatus(''), 2000)
  }

  function handleSpeedChange(s) {
    setSpeedState(s)
    setSpeed(s)
    if (isPlaying) {
      pause()
      setTimeout(() => play(currentFrame), 50)
    }
  }

  // Determine what to show for status
  const statusText =
    mode === 'process'
      ? processStatus === 'streaming' ? 'Processing...' : processStatus
      : replayStatus === 'ready' || replayStatus === 'paused' ? 'Ready'
      : replayStatus === 'playing' ? 'Playing'
      : replayStatus === 'done' ? 'Done'
      : replayStatus

  const fps = session?.source_fps || 30
  const sessionTotalFrames = mode === 'process' ? processFrame + 1 : (totalFrames || replayFrames.length)

  const activeMatchEvent = useMemo(() =>
    autoEvents.find(ev =>
      compareLabel && ev.label_id === compareLabel.label_id &&
      currentFrame >= ev.start_frame && currentFrame <= ev.end_frame
    ), [autoEvents, compareLabel, currentFrame])

  // Full-session DTW — used for score wave display
  const strokeAlignment = useMemo(() => {
    if (!compareLabel || !replayFrames.length) return null
    return computeStrokeAlignment(compareLabel, replayFrames)
  }, [compareLabel, replayFrames])

  // Event-scoped DTW — only the frames inside the active auto-event window.
  // Linear interpolation assumed uniform speed; DTW handles fast prep + slow follow-through correctly.
  const eventAlignment = useMemo(() => {
    if (!activeAutoEvent || !compareLabel || !replayFrames.length) return null
    const sf = activeAutoEvent.start_frame ?? activeAutoEvent.frame_index ?? 0
    const ef = activeAutoEvent.end_frame ?? sf
    const eventFrames = replayFrames.filter(f => {
      const fi = f.frame_index ?? 0
      return fi >= sf && fi <= ef
    })
    if (eventFrames.length < 2) return null
    return computeStrokeAlignment(compareLabel, eventFrames)
  }, [activeAutoEvent, compareLabel, replayFrames])

  // Which label frame index corresponds to the current session frame.
  // Priority: event-scoped DTW > full-session DTW fallback.
  const activeLabelFrameIdx = useMemo(() => {
    const nLabel = compareLabel?.frames?.length ?? 0
    if (!nLabel) return 0

    // Use event-scoped DTW when available (accurate within the matched segment)
    if (activeAutoEvent && eventAlignment) {
      const s2l = eventAlignment.sessionToLabel
      if (s2l.has(currentFrame)) return s2l.get(currentFrame)
      // Nearest frame in the event map
      let best = 0, bestDist = Infinity
      for (const [sf, li] of s2l) {
        const d = Math.abs(sf - currentFrame)
        if (d < bestDist) { bestDist = d; best = li }
      }
      return best
    }

    // Fallback: full-session DTW map
    if (!strokeAlignment?.length) return 0
    const s2l = strokeAlignment.sessionToLabel
    if (!s2l) return 0
    if (s2l.has(currentFrame)) return s2l.get(currentFrame)
    let best = 0, bestDist = Infinity
    for (const [sf, li] of s2l) {
      const d = Math.abs(sf - currentFrame)
      if (d < bestDist) { bestDist = d; best = li }
    }
    return best
  }, [compareLabel, activeAutoEvent, eventAlignment, strokeAlignment, currentFrame])

  const compareLabelKp = useMemo(() => {
    const frames = compareLabel?.frames
    if (!frames?.length) return null
    return frames[Math.min(activeLabelFrameIdx, frames.length - 1)]?.keypoints_17 ?? null
  }, [compareLabel, activeLabelFrameIdx])

  const shoulderAngle = useMemo(() => {
    const kp = keypoints
    if (!kp?.RightArm || !kp?.LeftArm) return null
    const ra = kp.RightArm, la = kp.LeftArm
    return Math.atan2(ra[2] - la[2], ra[0] - la[0]) * 180 / Math.PI
  }, [keypoints])

  const labelShoulderAngle = useMemo(() => {
    if (!compareLabelKp?.RightArm || !compareLabelKp?.LeftArm) return null
    const ra = compareLabelKp.RightArm, la = compareLabelKp.LeftArm
    return Math.atan2(ra[2] - la[2], ra[0] - la[0]) * 180 / Math.PI
  }, [compareLabelKp])

  const detailedMatch = useMemo(() => {
    if (!keypoints || !compareLabelKp) return null
    return poseSimilarityDetailed(keypoints, compareLabelKp, compareLabel)
  }, [keypoints, compareLabelKp])

  const strokePhases = useMemo(() => {
    if (!compareLabel?.frames?.length) return null
    return detectForehandPhases(compareLabel.frames)
  }, [compareLabel])

  const activePhase = strokePhases?.phaseAtFrame?.[activeLabelFrameIdx] ?? null

  const phaseScoreCards = useMemo(() => {
    if (!strokeAlignment?.length || !compareLabel?.frames?.length) return []

    const lastLabelIdx = strokeAlignment.length - 1
    const fallbackBackswing = Math.max(1, Math.floor(lastLabelIdx * 0.25))
    const fallbackImpact = Math.max(2, Math.floor(lastLabelIdx * 0.6))
    const fallbackFollow = lastLabelIdx

    const cardDefs = [
      {
        key: 'prep',
        phaseKey: 'preparation',
        title: 'เตรียมตัว',
        frameIdx: 0,
      },
      {
        key: 'backswing',
        phaseKey: 'backswing',
        title: 'ง้างไม้สูงสุด',
        frameIdx: strokePhases?.keyFrames?.backswingPeak ?? fallbackBackswing,
      },
      {
        key: 'impact',
        phaseKey: 'impact',
        title: 'จุดตีลูก',
        frameIdx: strokePhases?.keyFrames?.impact ?? fallbackImpact,
      },
      {
        key: 'followthrough',
        phaseKey: 'followThrough',
        title: 'ตามลูก',
        frameIdx: strokePhases?.keyFrames?.followEnd ?? fallbackFollow,
      },
    ]

    return cardDefs.map(card => {
      const idx = Math.max(0, Math.min(lastLabelIdx, card.frameIdx))
      const alignment = strokeAlignment[idx] ?? null
      const score = alignment ? Math.round(alignment.score * 100) : null
      const jointScores = alignment?.jointScores ?? null
      const grade = score != null ? scoreGrade(score) : { label: 'ยังไม่มีข้อมูล', emoji: '–' }
      return {
        ...card,
        frameIdx: idx,
        score,
        jointScores,
        grade,
        isActive: activePhase === card.phaseKey,
      }
    })
  }, [activePhase, compareLabel, strokeAlignment, strokePhases])

  const overallPhaseScore = useMemo(() => {
    const values = phaseScoreCards
      .map(card => card.score)
      .filter(score => typeof score === 'number')
    if (!values.length) return null
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [phaseScoreCards])

  const clipPreviewEvent = clipStart != null && clipEnd != null ? [{
    id: 'clip-preview',
    frame_index: Math.min(clipStart, clipEnd),
    start_frame: Math.min(clipStart, clipEnd),
    end_frame: Math.max(clipStart, clipEnd),
    timestamp_ms: Math.round((Math.min(clipStart, clipEnd) / fps) * 1000),
    label: labelName || 'New label clip',
    color: labelColor,
    source: 'clip_preview',
  }] : []
  const visibleEvents = [...hitEvents, ...autoEvents, ...clipPreviewEvent].sort((a, b) => a.frame_index - b.frame_index)

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{background:'var(--bg)',color:'var(--text)',fontFamily:'Inter,ui-sans-serif,system-ui,sans-serif'}}>
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0" style={{background:'var(--sidebar)',borderBottom:'1px solid var(--line)'}}>
        <button
          onClick={() => navigate('/pose')}
          className="text-slate-400 hover:text-white p-1 -ml-1"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {session?.filename || session?.source || sessionId}
          </p>
          <p className="text-xs text-slate-400">
            {statusText}
            {mode === 'process' && processStatus === 'streaming' && (
              <span className="ml-2 inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openCropMode}
            className={`text-xs px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              labelMode ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-300'
            }`}
            title="Crop clip"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v12a3 3 0 0 0 3 3h12" />
              <path d="M18 21V9a3 3 0 0 0-3-3H3" />
            </svg>
            Crop
          </button>
          <button
            onClick={() => setShowModel(v => !v)}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              showModel ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-500 line-through'
            }`}
            title="Toggle 3D model"
          >
            3D
          </button>
          <button
            onClick={() => setShowSkeleton(v => !v)}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              showSkeleton ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 line-through'
            }`}
            title="Toggle skeleton overlay"
          >
            Skel
          </button>
          <button
            onClick={() => setCompareMode(v => !v)}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              compareMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
            title={compareLabel ? `Compare with: ${compareLabel.name}` : 'Compare mode (select a label first)'}
          >
            Compare
          </button>
          <button
            onClick={() => { setShowLabels(v => !v); setLabelMode(false) }}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              showLabels ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            Labels {visibleEvents.length > 0 ? `(${visibleEvents.length})` : ''}
          </button>
        </div>
      </div>

      {/* Main content: avatar + optional label panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Avatar / Compare view */}
        <div className={`relative ${showLabels ? 'w-3/5' : 'w-full'} h-full transition-all overflow-hidden`}>

          {/* Normal view — always mounted so Three.js scene persists; hidden via invisible when comparing */}
          <div className={`absolute inset-0 ${compareMode ? 'invisible pointer-events-none' : ''}`}>
            <AvatarViewer
              keypoints={keypoints}
              boneChain={BONE_CHAIN}
              showModel={showModel}
              showSkeleton={showSkeleton}
              className="w-full h-full"
            />

            {/* Processing debug overlay */}
            {mode === 'process' && processStatus !== 'done' && (
              <div className="absolute bottom-2 left-2 bg-black/70 rounded-xl px-3 py-2.5 pointer-events-none min-w-[180px]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-semibold text-yellow-300">Processing…</span>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Frame</span>
                    <span className="text-white">
                      {currentFrame}
                      {session?.total_frames > 0 && (
                        <span className="text-slate-400"> / {session.total_frames}</span>
                      )}
                    </span>
                  </div>
                  {session?.total_frames > 0 && (
                    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden mt-1 mb-1">
                      <div
                        className="h-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.min(100, (currentFrame / session.total_frames) * 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Pose</span>
                    <span className={frameData?.pose_detected ? 'text-green-400' : 'text-red-400'}>
                      {frameData?.pose_detected ? '✓ detected' : '✗ none'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Joints</span>
                    <span className="text-white">{frameData?.joint_count ?? 0} / 17</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Visibility</span>
                    <span className={
                      (frameData?.pose_visibility_mean ?? 0) > 0.7 ? 'text-green-400'
                      : (frameData?.pose_visibility_mean ?? 0) > 0.4 ? 'text-yellow-400'
                      : 'text-red-400'
                    }>
                      {frameData ? `${(frameData.pose_visibility_mean * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Skipped</span>
                    <span className="text-slate-300">{frameData?.skipped ? 'yes' : 'no'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quality + shoulder angle badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end pointer-events-none">
              {keypoints && (
                <div className="bg-black/50 rounded-lg px-2 py-1 text-xs text-white/70">
                  {Object.keys(keypoints).length}/17 joints
                </div>
              )}
              {shoulderAngle != null && (
                <div className="bg-black/60 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono">
                  Shoulder {shoulderAngle.toFixed(1)}°
                </div>
              )}
            </div>

            {/* Video thumbnail + skeleton overlay — draggable/resizable */}
            <DraggableWindow
              defaultSize={{ w: 180, h: 260 }}
              defaultPos={{ x: null, y: null }}
              title="Video Pose"
              style={{ background:'#000' }}
            >
              <video
                ref={videoRef}
                src={`/api/sessions/${sessionId}/video`}
                muted
                playsInline
                preload="metadata"
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
              />
              <canvas
                ref={skelCanvasRef}
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', mixBlendMode:'screen' }}
              />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(7,18,29,0.82)', textAlign:'center', fontSize:9, color:'var(--muted)', padding:'2px 0' }}>
                {imageKp ? 'pose detected' : 'no pose'}
              </div>
            </DraggableWindow>
          </div>

          {/* Compare split view — only mounted when active */}
          {compareMode && (
            <div className="absolute inset-0 flex flex-col bg-slate-950">

              {/* Top: two skeleton viewers */}
              <div className="flex flex-1 min-h-0">
                {/* Left: current skeleton */}
                <div className="relative flex-1 h-full min-w-0">
                  <SkeletonViewer3D
                    keypoints={keypoints}
                    jointScores={detailedMatch?.jointScores}
                    overlayText={`Session frame ${currentFrame}`}
                    className="w-full h-full"
                  />
                  <div className="absolute bottom-1 left-2 text-[10px] font-semibold text-slate-300 bg-black/60 rounded px-1.5 py-0.5 pointer-events-none">
                    {activeAutoEvent
                      ? `Match ${activeAutoEvent.start_frame}–${activeAutoEvent.end_frame}`
                      : 'Current'}
                  </div>
                  {compareLabel && (() => {
                    const w = getStrokeWeights(compareLabel)
                    const name = (compareLabel.name || '').toLowerCase()
                    const preset = name.includes('left') ? 'L-arm' : (name.includes('forehand') || name.includes('clear') || name.includes('smash')) ? 'R-arm' : 'default'
                    return (
                      <div className="absolute top-1.5 right-2 text-[9px] text-cyan-300 bg-black/50 rounded px-1.5 py-0.5 pointer-events-none font-mono">
                        weights: {preset}
                      </div>
                    )
                  })()}
                  {detailedMatch && (
                    <div className="absolute bottom-1 right-2 pointer-events-none">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        detailedMatch.score >= 0.85 ? 'bg-green-600/80 text-white'
                        : detailedMatch.score >= 0.78 ? 'bg-yellow-500/80 text-white'
                        : 'bg-red-700/80 text-white'
                      }`}>
                        {(detailedMatch.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px bg-slate-700 flex-shrink-0" />

                {/* Right: label skeleton at active label frame */}
                <div className="relative flex-1 h-full min-w-0">
                  {compareLabelKp ? (
                    <SkeletonViewer3D
                      keypoints={compareLabelKp}
                      overlayText={`${compareLabel?.name ?? 'Label'} [${activeLabelFrameIdx}/${(compareLabel?.frames?.length ?? 1) - 1}]`}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                      Preview a label to compare
                    </div>
                  )}
                  <div className="absolute bottom-1 left-2 text-[10px] font-semibold text-slate-300 bg-black/60 rounded px-1.5 py-0.5 pointer-events-none">
                    Label frame
                  </div>
                  {/* Active phase badge */}
                  {activePhase && (
                    <div
                      className="absolute top-1.5 left-2 text-[10px] font-bold px-2 py-0.5 rounded pointer-events-none"
                      style={{ background: PHASE_COLORS[activePhase] + 'cc', color: '#fff' }}
                    >
                      {PHASE_LABELS[activePhase]}
                    </div>
                  )}
                  {shoulderAngle != null && labelShoulderAngle != null && (
                    <div className="absolute bottom-1 right-2 text-[10px] text-amber-300 bg-black/60 rounded px-1.5 py-0.5 pointer-events-none">
                      ΔShoulder {(shoulderAngle - labelShoulderAngle).toFixed(1)}°
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom panel: phase scores card layout */}
              <div className="flex-shrink-0 px-3 py-2.5 flex flex-col gap-1.5" style={{background:'var(--sidebar)',borderTop:'1px solid var(--line)',overflow:'hidden'}}>
                {overallPhaseScore != null && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      คะแนนแต่ละจังหวะ
                    </span>
                    <div className="text-[11px] text-slate-300">
                      คะแนนเฉลี่ยรวม:{' '}
                      <span className="font-black text-sm" style={{ color: scoreColor(overallPhaseScore) }}>
                        {overallPhaseScore}
                      </span>{' '}
                      คะแนน &nbsp;
                      <span className="font-semibold" style={{ color: scoreColor(overallPhaseScore) }}>
                        {scoreGrade(overallPhaseScore).emoji} {scoreGrade(overallPhaseScore).label}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 w-full">
                  {phaseScoreCards.map(card => {
                    const isCardActive = card.isActive
                    const hasScore = card.score != null
                    const cardBg = isCardActive 
                      ? 'border-indigo-500/50' 
                      : 'border-slate-800 hover:border-slate-700/80'
                    const alignment = strokeAlignment?.[card.frameIdx]
                    const targetSessionFrame = alignment?.sessionFrame

                    return (
                      <div
                        key={card.key}
                        onClick={() => {
                          if (targetSessionFrame != null && targetSessionFrame >= 0) {
                            handleSeek(targetSessionFrame)
                          }
                        }}
                        className={`flex flex-col border rounded-xl p-2.5 transition-all duration-200 ${cardBg} ${
                          targetSessionFrame != null && targetSessionFrame >= 0 ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
                        }`}
                        style={{background: isCardActive ? 'rgba(40,215,245,0.07)' : 'rgba(13,26,38,0.72)'}}
                      >
                        {/* Title & Active indicator */}
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">
                            {card.title}
                          </span>
                          {isCardActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
                          )}
                        </div>

                        {/* Score & Grade */}
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-xl font-black tracking-tight"
                            style={{ color: scoreColor(card.score) }}
                          >
                            {hasScore ? card.score : '—'}
                          </span>
                          {hasScore && (
                            <span className="text-[9px] text-slate-500 font-mono">/100</span>
                          )}
                          {hasScore && (
                            <span 
                              className="text-[9px] font-bold ml-auto"
                              style={{ color: scoreColor(card.score) }}
                            >
                              {card.grade.emoji} {card.grade.label}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-1.5 mb-1.5 flex-shrink-0">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: hasScore ? `${card.score}%` : '0%',
                              backgroundColor: scoreColor(card.score),
                            }}
                          />
                        </div>

                        {/* Joint Scores list */}
                        {hasScore && card.jointScores ? (
                          <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto max-h-[80px] pr-0.5 custom-scrollbar mt-0.5">
                            {Object.entries(card.jointScores)
                              .map(([jointName, rawScore]) => {
                                const s = Math.round(rawScore * 100)
                                return {
                                  name: jointName,
                                  score: s,
                                  color: scoreColor(s),
                                  grade: scoreGrade(s),
                                }
                              })
                              .sort((a, b) => a.score - b.score) // Sort by worst first
                              .map(item => (
                                <div key={item.name} className="flex items-center gap-1.5 text-[9px] leading-tight my-0.5">
                                  <span className="flex-1 text-slate-400 text-left truncate">
                                    {JOINT_TH[item.name] || item.name}
                                  </span>
                                  <div className="w-11 h-1 bg-slate-950 rounded-full overflow-hidden flex-shrink-0">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${item.score}%`,
                                        backgroundColor: item.color,
                                      }}
                                    />
                                  </div>
                                  <span style={{ color: item.color }} className="font-semibold font-mono w-8 text-right flex-shrink-0">
                                    {item.score}%
                                  </span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-[10px] text-slate-500 italic py-4">
                            ไม่มีข้อมูล
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Label panel */}
        {showLabels && (
          <div className="w-2/5 flex flex-col p-3 overflow-hidden" style={{background:'var(--sidebar)',borderLeft:'1px solid var(--line)'}}>
            <LabelPanel
              events={hitEvents}
              autoEvents={autoEvents}
              labelLibrary={labelLibrary}
              fps={fps}
              currentFrame={currentFrame}
              totalFrames={sessionTotalFrames}
              clipStart={clipStart}
              clipEnd={clipEnd}
              labelName={labelName}
              labelColor={labelColor}
              libraryStatus={libraryStatus}
              onClipStart={setClipStart}
              onClipEnd={setClipEnd}
              onNameChange={setLabelName}
              onColorChange={setLabelColor}
              onSaveClip={saveLabelClip}
              onRefreshLibrary={loadLabelLibrary}
              onRunAutoMatch={() => {
                const matchableLabels = labelLibrary.filter(l => l.normalized_sequence?.length && l.enabled !== false)
                const sourceFrames = mode === 'replay' ? replayFrames : liveBuffer
                setAutoEvents(matchLabelsToFrames(matchableLabels, sourceFrames, MATCH_THRESHOLD))
              }}
              onKeepAuto={keepAutoEvents}
              onPreviewLabel={previewLabel}
              onImportLabel={importLabel}
              onEventClick={handleEventClick}
              onUpdate={handleLabelUpdate}
              onClose={() => { setShowLabels(false); setLabelMode(false) }}
            />
            <button
              onClick={saveLabels}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg font-medium transition-colors"
            >
              {saveStatus || 'Save Labels'}
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {mode === 'replay' && (
        <div className="flex-shrink-0 px-3 py-3 flex flex-col gap-3" style={{background:'var(--sidebar)',borderTop:'1px solid var(--line)'}}>
          {/* Timeline */}
          <Timeline
            totalFrames={sessionTotalFrames}
            currentFrame={currentFrame}
            fps={fps}
            hitEvents={visibleEvents}
            onSeek={handleSeek}
            onEventClick={handleEventClick}
            labelMode={labelMode}
            onAddLabel={handleAddLabel}
          />

          {/* Playback controls */}
          <div className="flex items-center gap-3">
            {/* Step back */}
            <button
              onClick={() => handleSeek(Math.max(0, currentFrame - 1))}
              className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg text-sm transition-colors"
            >
              ⏮
            </button>

            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              className="flex-1 active:scale-95 py-2.5 rounded-xl font-semibold transition-all"
              style={{background:'var(--cyan)',color:'#061119',border:'none'}}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            {/* Step forward */}
            <button
              onClick={() => handleSeek(Math.min(sessionTotalFrames - 1, currentFrame + 1))}
              className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg text-sm transition-colors"
            >
              ⏭
            </button>

            {/* Speed */}
            <select
              value={speed}
              onChange={e => handleSpeedChange(parseFloat(e.target.value))}
              className="bg-slate-700 text-white text-xs px-2 py-2 rounded-lg border-none outline-none"
            >
              <option value={0.25}>0.25×</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>

            {/* Label mode toggle */}
            <button
              onClick={() => { setLabelMode(v => !v); if (!showLabels) setShowLabels(true) }}
              className={`p-2 rounded-lg text-sm transition-colors ${
                labelMode ? 'bg-yellow-500/30 text-yellow-300' : 'bg-slate-700 text-slate-300'
              }`}
              title="Crop clip mode"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3v12a3 3 0 0 0 3 3h12" />
                <path d="M18 21V9a3 3 0 0 0-3-3H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Process mode bottom bar */}
      {mode === 'process' && (
        <div className="flex-shrink-0 px-3 py-2 flex items-center gap-3" style={{background:'var(--sidebar)',borderTop:'1px solid var(--line)'}}>
          <p className="flex-1 text-xs text-slate-400">
            WS: <span className={processStatus === 'streaming' ? 'text-green-400' : 'text-yellow-400'}>{processStatus}</span>
          </p>
          <button
            onClick={async () => {
              await fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' })
            }}
            className="bg-red-700 hover:bg-red-600 active:scale-95 text-white text-xs px-3 py-1.5 rounded-lg transition-all"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

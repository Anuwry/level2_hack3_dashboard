/**
 * TestPage — drives the avatar with synthetic keypoints.
 * Two sub-modes:
 *   • Walk  — run the mock walk-cycle on the current bone chain
 *   • Map   — drag dropdowns to assign bone → from/to keypoints, then export JSON
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AvatarViewer from '../components/AvatarViewer.jsx'

// ── All 17 MediaPipe keypoint names (used in dropdowns) ──────────────────────
const KP_NAMES = [
  'Hips', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot',
  'RightUpLeg', 'RightLeg', 'RightFoot',
]

// ── Default mapping for male_character_ps1-style.glb ─────────────────────────
const DEFAULT_PS1_CHAIN = [
  ['pelvis_01',          'Hips',         'Spine1'],
  ['spine_02',           'Spine1',       'Spine2'],
  ['chest_03',           'Spine2',       'Neck'],
  ['upper_arm_left_07',  'LeftArm',      'LeftForeArm'],
  ['forearm_left_08',    'LeftForeArm',  'LeftHand'],
  ['upper_arm_right_014','RightArm',     'RightForeArm'],
  ['forearm_right_015',  'RightForeArm', 'RightHand'],
  ['thigh_left_020',     'LeftUpLeg',    'LeftLeg'],
  ['shin.L_021',         'LeftLeg',      'LeftFoot'],
  ['thigh_right_023',    'RightUpLeg',   'RightLeg'],
  ['shin.R_024',         'RightLeg',     'RightFoot'],
]

// ── Default mapping for model-human-2/3.glb (Unreal deform bones) ────────────
// clavicle_l/r intentionally omitted — their forward-offset rest direction
// conflicts with the Neck→Arm drive vector, causing shoulder mesh distortion.
const DEFAULT_HUMAN2_CHAIN = [
  ['pelvis',      'Hips',         'Spine1'],
  ['spine_01',    'Spine1',       'Spine2'],
  ['spine_02',    'Spine2',       'Neck'],
  ['spine_03',    'Neck',         'Head'],
  ['upperarm_l',  'LeftArm',      'LeftForeArm'],
  ['lowerarm_l',  'LeftForeArm',  'LeftHand'],
  ['upperarm_r',  'RightArm',     'RightForeArm'],
  ['lowerarm_r',  'RightForeArm', 'RightHand'],
  ['thigh_l',     'LeftUpLeg',    'LeftLeg'],
  ['calf_l',      'LeftLeg',      'LeftFoot'],
  ['thigh_r',     'RightUpLeg',   'RightLeg'],
  ['calf_r',      'RightLeg',     'RightFoot'],
]

// ── Default mapping for MAN-RIG.glb (Blender naming) ─────────────────────────
const DEFAULT_MAN_CHAIN = [
  ['spine',        'Hips',         'Neck'],
  ['spine.001',    'Spine1',       'Spine2'],
  ['spine.002',    'Spine2',       'Neck'],
  ['spine.003',    'Neck',         'Head'],
  ['upper_arm.L',  'LeftArm',      'LeftForeArm'],
  ['forearm.L',    'LeftForeArm',  'LeftHand'],
  ['upper_arm.R',  'RightArm',     'RightForeArm'],
  ['forearm.R',    'RightForeArm', 'RightHand'],
  ['thigh.L',      'LeftUpLeg',    'LeftLeg'],
  ['shin.L',       'LeftLeg',      'LeftFoot'],
  ['thigh.R',      'RightUpLeg',   'RightLeg'],
  ['shin.R',       'RightLeg',     'RightFoot'],
]

// ── Default mapping for 17joint.glb (bone names = MediaPipe names) ───────────
const DEFAULT_17JOINT_CHAIN = [
  ['Hips',        'Hips',        'Spine1'],
  ['Spine1',      'Spine1',      'Spine2'],
  ['Spine2',      'Spine2',      'Neck'],
  ['Neck',        'Neck',        'Head'],
  ['LeftArm',     'LeftArm',     'LeftForeArm'],
  ['LeftForeArm', 'LeftForeArm', 'LeftHand'],
  ['RightArm',    'RightArm',    'RightForeArm'],
  ['RightForeArm','RightForeArm','RightHand'],
  ['LeftUpLeg',   'LeftUpLeg',   'LeftLeg'],
  ['LeftLeg',     'LeftLeg',     'LeftFoot'],
  ['RightUpLeg',  'RightUpLeg',  'RightLeg'],
  ['RightLeg',    'RightLeg',    'RightFoot'],
]

const MODELS = [
  { url: '/models/17joint.glb',                  label: '17joint',       defaultChain: DEFAULT_17JOINT_CHAIN },
  { url: '/models/model-human-3.glb',            label: 'Human 3',       defaultChain: DEFAULT_HUMAN2_CHAIN },
  { url: '/models/male_character_ps1-style.glb', label: 'PS1 Character', defaultChain: DEFAULT_PS1_CHAIN    },
  { url: '/models/MAN-RIG.glb',                  label: 'MAN-RIG',       defaultChain: DEFAULT_MAN_CHAIN    },
]

// ── Mock walk-cycle keypoints ─────────────────────────────────────────────────
function mockKeypoints(t) {
  const swing  = Math.sin(t * 2.2)
  const swing2 = Math.sin(t * 2.2 + Math.PI)
  const sway   = Math.sin(t * 1.1) * 0.04
  const ARM = 0.22, LEG = 0.13

  return {
    Hips:        [sway,        0,      0],
    Spine1:      [sway * 0.7, -0.13,  0.01],
    Spine2:      [sway * 0.5, -0.27,  0.01],
    Neck:        [sway * 0.3, -0.47,  0.02],
    Head:        [sway * 0.2, -0.63,  0.01],
    LeftArm:     [-0.17,      -0.47,  0.02],
    LeftForeArm: [-0.20,      -0.30 + Math.abs(swing2) * 0.06, swing2 * ARM * 0.55],
    LeftHand:    [-0.21,      -0.13 + Math.abs(swing2) * 0.10, swing2 * ARM],
    RightArm:    [0.17,       -0.47,  0.02],
    RightForeArm:[0.20,       -0.30 + Math.abs(swing) * 0.06,  swing * ARM * 0.55],
    RightHand:   [0.21,       -0.13 + Math.abs(swing) * 0.10,  swing * ARM],
    LeftUpLeg:   [-0.10,      swing  * LEG * 0.4,              -swing  * LEG * 0.3],
    LeftLeg:     [-0.10,      0.42 + swing  * LEG * 0.55,       Math.max(0, swing  * LEG)],
    LeftFoot:    [-0.09,      0.88 + swing  * LEG * 0.3,        0.05 + Math.max(0, swing * LEG * 0.8)],
    RightUpLeg:  [0.10,       swing2 * LEG * 0.4,              -swing2 * LEG * 0.3],
    RightLeg:    [0.10,       0.42 + swing2 * LEG * 0.55,       Math.max(0, swing2 * LEG)],
    RightFoot:   [0.09,       0.88 + swing2 * LEG * 0.3,        0.05 + Math.max(0, swing2 * LEG * 0.8)],
  }
}

// ── Tiny select component ─────────────────────────────────────────────────────
function KpSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-slate-700 border border-slate-600 text-slate-200 text-[11px] rounded px-1 py-0.5 min-w-0 w-full"
    >
      <option value="">— none —</option>
      {KP_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TestPage() {
  const navigate = useNavigate()

  // Model selection
  const [modelIdx, setModelIdx] = useState(0)
  const model = MODELS[modelIdx]

  // Bone mapping: array of [boneName, fromJoint, toJoint]
  const [mapping, setMapping] = useState(model.defaultChain)

  // All bone names discovered from loaded model
  const [allBones, setAllBones] = useState([])

  // Tab: 'walk' or 'map'
  const [tab, setTab] = useState('walk')

  // Walk animation state
  const [kp, setKp]         = useState(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed]   = useState(1)
  const tRef        = useRef(0)
  const rafRef      = useRef(null)
  const lastMsRef   = useRef(null)

  // When model changes, reset mapping to that model's default
  useEffect(() => {
    setMapping(MODELS[modelIdx].defaultChain)
    setAllBones([])
  }, [modelIdx])

  // Walk-cycle animation loop
  useEffect(() => {
    function frame(nowMs) {
      rafRef.current = requestAnimationFrame(frame)
      const dt = lastMsRef.current == null ? 0 : (nowMs - lastMsRef.current) / 1000
      lastMsRef.current = nowMs
      if (!paused) tRef.current += dt * speed
      setKp(mockKeypoints(tRef.current))
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, speed])

  // Called by AvatarViewer when bones load — just populate the dropdown list
  const handleBonesLoaded = useCallback((names) => {
    setAllBones(names)
  }, [])

  // Mapping editor helpers
  function updateRow(idx, field, val) {
    setMapping(prev => prev.map((row, i) => {
      if (i !== idx) return row
      const r = [...row]
      if (field === 'bone') r[0] = val
      else if (field === 'from') r[1] = val
      else r[2] = val
      return r
    }))
  }

  function addRow() {
    setMapping(prev => [...prev, ['', '', '']])
  }

  function removeRow(idx) {
    setMapping(prev => prev.filter((_, i) => i !== idx))
  }

  function exportJSON() {
    const clean = mapping.filter(([b, f, t]) => b && f && t)
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bone-mapping-${model.label.replace('.glb', '')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function resetToDefault() {
    setMapping(MODELS[modelIdx].defaultChain)
  }

  // Valid chain for animation (rows with all three fields filled)
  const activeChain = mapping.filter(([b, f, t]) => b && f && t)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 pt-3 pb-2 border-b border-slate-800 flex-wrap">
        <button onClick={() => navigate('/pose')} className="text-slate-400 hover:text-white p-1 -ml-1">←</button>
        <span className="text-sm font-semibold text-white">Rig Test</span>

        {/* Model selector */}
        <select
          value={modelIdx}
          onChange={e => setModelIdx(Number(e.target.value))}
          className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1"
        >
          {MODELS.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
        </select>

        {/* Tabs */}
        <div className="flex rounded overflow-hidden border border-slate-700 ml-1">
          {['walk', 'map'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {t === 'walk' ? '▶ Walk' : '🗺 Map'}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Walk controls (only in walk tab) */}
        {tab === 'walk' && <>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>Speed</span>
            {[0.25, 0.5, 1, 2].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded ${speed === s ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                {s}×
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused(v => !v)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${paused ? 'bg-yellow-500 text-black' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </>}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Avatar */}
        <div className="flex-1 relative min-w-0">
          <AvatarViewer
            keypoints={kp}
            boneChain={activeChain}
            modelUrl={model.url}
            onBonesLoaded={handleBonesLoaded}
            showJoints={tab === 'walk'}
            className="w-full h-full"
          />

          {/* Controls hint */}
          <div className="absolute top-2 right-2 bg-black/60 rounded-lg px-2 py-1.5 text-[10px] text-slate-400 space-y-0.5">
            <div><span className="text-slate-300">Left drag</span> — orbit</div>
            <div><span className="text-slate-300">Scroll</span> — zoom</div>
            <div><span className="text-slate-300">Right drag</span> — pan</div>
          </div>

          {/* Status overlay */}
          <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1 text-[10px] text-slate-400 font-mono">
            <span className="text-slate-300">{model.label}</span>
            {allBones.length > 0 && <span className="ml-2">{allBones.length} bones</span>}
            <span className="ml-2 text-green-400">{activeChain.length} active</span>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">

          {/* ── WALK TAB: joint log ── */}
          {tab === 'walk' && <>
            <div className="px-3 py-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Active Bone Chain</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeChain.length === 0 && (
                <p className="text-xs text-slate-500 px-3 py-4">No bones mapped. Switch to Map tab to configure.</p>
              )}
              {activeChain.map(([bone, from, to], i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1 hover:bg-white/5 font-mono text-[11px] border-b border-slate-800/50">
                  <span className="text-indigo-300 w-32 truncate flex-shrink-0">{bone}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-green-300 truncate flex-1">{from}</span>
                  <span className="text-slate-500">…</span>
                  <span className="text-yellow-300 truncate flex-1">{to}</span>
                </div>
              ))}
            </div>
            <div className="flex-shrink-0 border-t border-slate-800 px-3 py-2 text-[11px] text-slate-500 font-mono flex justify-between">
              <span>t = {tRef.current.toFixed(2)}s</span>
              <span>{paused ? 'PAUSED' : `${speed}× speed`}</span>
            </div>
          </>}

          {/* ── MAP TAB: bone mapping editor ── */}
          {tab === 'map' && <>
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Bone Mapping</span>
              <div className="flex gap-1">
                <button onClick={resetToDefault}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
                  Reset
                </button>
                <button onClick={exportJSON}
                  className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white">
                  Export JSON
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div className="flex-shrink-0 grid grid-cols-[1fr_1fr_1fr_20px] gap-1 px-2 py-1 text-[10px] text-slate-500 uppercase border-b border-slate-800 font-mono">
              <span>Bone</span><span>From</span><span>To</span><span/>
            </div>

            <div className="flex-1 overflow-y-auto">
              {mapping.map((row, i) => {
                const [bone, from, to] = row
                const valid = bone && from && to
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[1fr_1fr_1fr_20px] gap-1 px-2 py-1 border-b border-slate-800/40 ${valid ? '' : 'bg-red-950/20'}`}
                  >
                    {/* Bone name — dropdown if we have bone list, else text */}
                    {allBones.length > 0 ? (
                      <select
                        value={bone}
                        onChange={e => updateRow(i, 'bone', e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-indigo-300 text-[11px] rounded px-1 py-0.5 min-w-0 w-full"
                      >
                        <option value="">— none —</option>
                        {allBones.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : (
                      <input
                        value={bone}
                        onChange={e => updateRow(i, 'bone', e.target.value)}
                        placeholder="bone"
                        className="bg-slate-700 border border-slate-600 text-indigo-300 text-[11px] rounded px-1 py-0.5 w-full min-w-0"
                      />
                    )}
                    <KpSelect value={from} onChange={v => updateRow(i, 'from', v)} />
                    <KpSelect value={to}   onChange={v => updateRow(i, 'to', v)} />
                    <button
                      onClick={() => removeRow(i)}
                      className="text-slate-500 hover:text-red-400 text-[13px] leading-none"
                    >×</button>
                  </div>
                )
              })}

              <button
                onClick={addRow}
                className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 border-t border-slate-800 hover:bg-white/5 transition-colors"
              >
                + Add row
              </button>
            </div>

            <div className="flex-shrink-0 border-t border-slate-800 px-3 py-2 text-[11px] text-slate-500">
              {allBones.length === 0
                ? 'Loading bones…'
                : `${mapping.filter(([b,f,t]) => b&&f&&t).length} / ${mapping.length} rows valid · ${allBones.length} bones in model`
              }
            </div>
          </>}

        </div>
      </div>
    </div>
  )
}

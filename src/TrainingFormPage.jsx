import React, { useState, useEffect } from 'react'
import { ChevronLeft, X } from 'lucide-react'


function StepIndicator({ current }) {
  return (
    <div className="tfSteps">
      {[0, 1].map((i) => (
        <React.Fragment key={i}>
          <div className={`tfStepDot ${i < current ? 'done' : i === current ? 'current' : ''}`} />
          {i < 1 && <div className="tfStepLine" />}
        </React.Fragment>
      ))}
    </div>
  )
}

function MaleSvg() {
  return (
    <svg viewBox="0 0 64 64" className="choiceSvg" aria-hidden="true">
      <circle cx="32" cy="16" r="10" fill="none" stroke="#28d7f5" strokeWidth="2.2" />
      <line x1="32" y1="26" x2="32" y2="48" stroke="#28d7f5" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="20" y1="36" x2="44" y2="36" stroke="#28d7f5" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="32" y1="48" x2="22" y2="62" stroke="#28d7f5" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="32" y1="48" x2="42" y2="62" stroke="#28d7f5" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function FemaleSvg() {
  return (
    <svg viewBox="0 0 64 64" className="choiceSvg" aria-hidden="true">
      <circle cx="32" cy="14" r="10" fill="none" stroke="#f472b6" strokeWidth="2.2" />
      <path d="M22,26 L32,28 L42,26" fill="none" stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22,26 L18,48 L32,46 L46,48 L42,26" fill="none" stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="32" y1="28" x2="32" y2="46" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function HeightSvg() {
  return (
    <svg viewBox="0 0 64 64" className="choiceSvg" aria-hidden="true">
      <circle cx="32" cy="13" r="7" fill="none" stroke="#28d7f5" strokeWidth="2" />
      <line x1="32" y1="20" x2="32" y2="54" stroke="#28d7f5" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="32" x2="40" y2="32" stroke="#28d7f5" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="54" x2="38" y2="54" stroke="#28d7f5" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="8" x2="52" y2="56" stroke="rgba(40,215,245,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="8" x2="56" y2="8" stroke="rgba(40,215,245,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="56" x2="56" y2="56" stroke="rgba(40,215,245,0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function HandSvg({ side }) {
  const flip = side === 'left' ? 'scale(-1,1) translate(-64,0)' : ''
  return (
    <svg viewBox="0 0 64 64" className="choiceSvg" aria-hidden="true">
      <g transform={flip}>
        <path
          d="M22,52 L22,30 Q22,26 26,26 Q30,26 30,30 L30,22 Q30,18 34,18 Q38,18 38,22 L38,26 Q38,22 42,22 Q44,22 44,26 L44,30 Q44,28 46,28 Q48,28 48,32 L48,42 Q48,50 40,52 Z"
          fill="none"
          stroke="#28d7f5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="30" y1="30" x2="30" y2="18" stroke="rgba(40,215,245,0.3)" strokeWidth="1" />
        <line x1="38" y1="28" x2="38" y2="18" stroke="rgba(40,215,245,0.3)" strokeWidth="1" />
        <line x1="44" y1="30" x2="44" y2="22" stroke="rgba(40,215,245,0.3)" strokeWidth="1" />
      </g>
    </svg>
  )
}

function ClearSvg() {
  return (
    <svg viewBox="0 0 160 90" className="strokeSvg" aria-hidden="true">
      <line x1="8" y1="78" x2="152" y2="78" stroke="rgba(138,174,199,0.3)" strokeWidth="1.5" />
      <line x1="80" y1="54" x2="80" y2="78" stroke="rgba(138,174,199,0.5)" strokeWidth="2" />
      <line x1="72" y1="54" x2="88" y2="54" stroke="rgba(138,174,199,0.4)" strokeWidth="1.5" />
      <path d="M138,72 Q95,8 28,72" fill="none" stroke="#28d7f5" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="72" r="3.5" fill="#28d7f5" />
      <circle cx="138" cy="72" r="4" fill="rgba(40,215,245,0.25)" stroke="#28d7f5" strokeWidth="1.5" />
    </svg>
  )
}

function DriveSvg() {
  return (
    <svg viewBox="0 0 160 90" className="strokeSvg" aria-hidden="true">
      <line x1="8" y1="78" x2="152" y2="78" stroke="rgba(138,174,199,0.3)" strokeWidth="1.5" />
      <line x1="80" y1="56" x2="80" y2="78" stroke="rgba(138,174,199,0.5)" strokeWidth="2" />
      <line x1="72" y1="56" x2="88" y2="56" stroke="rgba(138,174,199,0.4)" strokeWidth="1.5" />
      <path d="M138,54 Q88,50 30,55" fill="none" stroke="#28d7f5" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="30,55 42,49 42,61" fill="#28d7f5" />
      <circle cx="138" cy="54" r="4" fill="rgba(40,215,245,0.25)" stroke="#28d7f5" strokeWidth="1.5" />
    </svg>
  )
}

function NetShotSvg() {
  return (
    <svg viewBox="0 0 160 90" className="strokeSvg" aria-hidden="true">
      <line x1="8" y1="78" x2="152" y2="78" stroke="rgba(138,174,199,0.3)" strokeWidth="1.5" />
      <line x1="80" y1="50" x2="80" y2="78" stroke="rgba(138,174,199,0.5)" strokeWidth="2" />
      <line x1="72" y1="50" x2="88" y2="50" stroke="rgba(138,174,199,0.4)" strokeWidth="1.5" />
      <path d="M102,60 Q80,40 62,72" fill="none" stroke="#29e38c" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="62" cy="72" r="3.5" fill="#29e38c" />
      <circle cx="102" cy="60" r="4" fill="rgba(41,227,140,0.25)" stroke="#29e38c" strokeWidth="1.5" />
    </svg>
  )
}

function DropSvg() {
  return (
    <svg viewBox="0 0 160 90" className="strokeSvg" aria-hidden="true">
      <line x1="8" y1="78" x2="152" y2="78" stroke="rgba(138,174,199,0.3)" strokeWidth="1.5" />
      <line x1="80" y1="54" x2="80" y2="78" stroke="rgba(138,174,199,0.5)" strokeWidth="2" />
      <line x1="72" y1="54" x2="88" y2="54" stroke="rgba(138,174,199,0.4)" strokeWidth="1.5" />
      <path d="M136,22 Q106,40 84,72" fill="none" stroke="#ffac38" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="84" cy="72" r="3.5" fill="#ffac38" />
      <circle cx="136" cy="22" r="4" fill="rgba(255,172,56,0.25)" stroke="#ffac38" strokeWidth="1.5" />
    </svg>
  )
}

function SmashSvg() {
  return (
    <svg viewBox="0 0 160 90" className="strokeSvg" aria-hidden="true">
      <line x1="8" y1="78" x2="152" y2="78" stroke="rgba(138,174,199,0.3)" strokeWidth="1.5" />
      <line x1="80" y1="56" x2="80" y2="78" stroke="rgba(138,174,199,0.5)" strokeWidth="2" />
      <line x1="72" y1="56" x2="88" y2="56" stroke="rgba(138,174,199,0.4)" strokeWidth="1.5" />
      <path d="M134,12 L56,74" fill="none" stroke="#ff5c62" strokeWidth="3" strokeLinecap="round" />
      <polygon points="56,74 52,61 65,64" fill="#ff5c62" />
      <circle cx="134" cy="12" r="4" fill="rgba(255,92,98,0.25)" stroke="#ff5c62" strokeWidth="1.5" />
      <line x1="122" y1="16" x2="108" y2="22" stroke="rgba(255,92,98,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="126" y1="26" x2="112" y2="32" stroke="rgba(255,92,98,0.3)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function LobSvg() {
  return (
    <svg viewBox="0 0 160 90" className="strokeSvg" aria-hidden="true">
      <line x1="8" y1="78" x2="152" y2="78" stroke="rgba(138,174,199,0.3)" strokeWidth="1.5" />
      <line x1="80" y1="54" x2="80" y2="78" stroke="rgba(138,174,199,0.5)" strokeWidth="2" />
      <line x1="72" y1="54" x2="88" y2="54" stroke="rgba(138,174,199,0.4)" strokeWidth="1.5" />
      <path d="M34,72 Q88,6 140,72" fill="none" stroke="#28d7f5" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="140" cy="72" r="3.5" fill="#28d7f5" />
      <circle cx="34" cy="72" r="4" fill="rgba(40,215,245,0.25)" stroke="#28d7f5" strokeWidth="1.5" />
    </svg>
  )
}

const strokes = [
  {
    id: 'clear',
    name: 'Clear',
    description: 'High overhead shot deep into the opponent\'s back court.',
    color: 'cyan',
    SvgComponent: ClearSvg,
  },
  {
    id: 'drive',
    name: 'Drive',
    description: 'Fast, flat shot at shoulder height straight over the net.',
    color: 'cyan',
    SvgComponent: DriveSvg,
  },
  {
    id: 'net-shot',
    name: 'Net-shot',
    description: 'Delicate tumbling shot that drops just over the net.',
    color: 'green',
    SvgComponent: NetShotSvg,
  },
  {
    id: 'drop',
    name: 'Drop',
    description: 'Controlled downward shot from back court that falls near the net.',
    color: 'orange',
    SvgComponent: DropSvg,
  },
  {
    id: 'smash',
    name: 'Smash',
    description: 'Powerful steep downward shot — the fastest in the game.',
    color: 'red',
    SvgComponent: SmashSvg,
  },
  {
    id: 'lob',
    name: 'Lob',
    description: 'Defensive high lift from the front court to the opponent\'s back.',
    color: 'cyan',
    SvgComponent: LobSvg,
  },
]

const SKEL_PAIRS = [
  [0,1],[0,2],[1,3],[2,4],
  [5,6],[5,7],[7,9],[6,8],[8,10],
  [5,11],[6,12],[11,12],
  [11,13],[13,15],[12,14],[14,16],
]
const SKEL_CONF = 0.3

function computeSkelBounds(frames) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const { persons } of frames) {
    for (const { kps } of persons) {
      for (const [x, y, c] of kps) {
        if (c > SKEL_CONF) {
          if (x < x0) x0 = x
          if (y < y0) y0 = y
          if (x > x1) x1 = x
          if (y > y1) y1 = y
        }
      }
    }
  }
  const pw = (x1 - x0) * 0.12
  const ph = (y1 - y0) * 0.12
  return { x0: x0 - pw, y0: y0 - ph, x1: x1 + pw, y1: y1 + ph }
}

function StrokeModal({ stroke, mode, hand, gender, onClose }) {
  const [loadState, setLoadState] = useState('loading')
  const [frames, setFrames]       = useState(null)
  const [bounds, setBounds]       = useState(null)
  const [fps, setFps]             = useState(25)
  const [frameIdx, setFrameIdx]   = useState(0)

  useEffect(() => {
    let alive = true
    setLoadState('loading')
    setFrames(null)
    setFrameIdx(0)
    fetch(`/keypoints/${stroke}/${mode}/${hand}/${gender}/sample.json`)

      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => {
        if (!alive) return
        setFrames(data.frames)
        setBounds(computeSkelBounds(data.frames))
        setFps(data.fps || 25)
        setLoadState('ready')
      })
      .catch(() => { if (alive) setLoadState('error') })
    return () => { alive = false }
  }, [stroke, mode, hand, gender])

  useEffect(() => {
    if (loadState !== 'ready' || !frames) return
    const id = setInterval(() => {
      setFrameIdx(i => (i + 1) % frames.length)
    }, 1000 / fps)
    return () => clearInterval(id)
  }, [loadState, frames, fps])

  const W = 540
  const H = 380
  const title = stroke ? stroke.charAt(0).toUpperCase() + stroke.slice(1) : ''

  const skelNodes = () => {
    if (!frames || !bounds) return null
    const frame = frames[frameIdx]
    if (!frame || !frame.persons || frame.persons.length === 0) return null
    const { kps } = frame.persons[0]
    if (!kps || kps.length < 17) return null
    const rX = (bounds.x1 - bounds.x0) || 0.01
    const rY = (bounds.y1 - bounds.y0) || 0.01
    const sc = Math.min(W / rX, H / rY)
    const dx = (W - rX * sc) / 2
    const dy = (H - rY * sc) / 2
    const pts = kps.map(([x, y, c]) => ({ x: dx + (x - bounds.x0) * sc, y: dy + (y - bounds.y0) * sc, c }))
    return (
      <>
        {SKEL_PAIRS.map(([a, b], i) => {
          const pa = pts[a], pb = pts[b]
          if (!pa || !pb || pa.c <= SKEL_CONF || pb.c <= SKEL_CONF) return null
          return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#28d7f5" strokeWidth="3" strokeLinecap="round" filter="url(#skelGlowC)" />
        })}
        {pts.map((pt, i) => pt.c > SKEL_CONF
          ? <circle key={i} cx={pt.x} cy={pt.y} r="5" fill="#29e38c" filter="url(#skelGlowG)" />
          : null
        )}
      </>
    )
  }

  return (
    <div className="animOverlay" onClick={onClose}>
      <div className="animPanel" onClick={e => e.stopPropagation()}>
        <div className="animHeader">
          <div className="animHeaderLeft">
            <span className="animTitle">{title}</span>
            <span className="animMode">{mode}</span>
          </div>
          <button className="animClose" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="animBody">
          {loadState === 'loading' && <div className="animStatus">Loading…</div>}
          {loadState === 'error' && (
            <div className="animStatus animStatusErr">
              No movement data recorded yet.
              <small>Save a clip in Pose Viewer first.</small>
            </div>
          )}
          {loadState === 'ready' && (
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="animCanvas" style={{ background: '#040f1a', borderRadius: '8px', display: 'block' }}>
              <defs>
                <filter id="skelGlowC" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="skelGlowG" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {skelNodes()}
            </svg>
          )}
        </div>
        <p className="animHint">Real recorded movement · click outside to close</p>
      </div>
    </div>
  )
}

export default function TrainingFormPage({ onBack }) {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState(null)
  const [hand, setHand] = useState(null)
  const [strokeMode, setStrokeMode] = useState('forehand')
  const [activeStroke, setActiveStroke] = useState(null)

  const handleStartStroke = (strokeId, strokeName) => {
    setActiveStroke({ id: strokeId, name: strokeName })
  }

  if (step === 0) {
    return (
      <div className="tfPage">
        <button className="tfBackBtn" type="button" onClick={onBack}>
          <ChevronLeft size={16} />Back to Overview
        </button>
        <StepIndicator current={0} />
        <div className="tfStepContent">
          <p className="tfKicker">Step 1 of 2</p>
          <h2 className="tfTitle">Select your gender</h2>
          <p className="tfSub">This helps us tailor the training form to your physique.</p>
          <div className="tfChoiceGrid">
            <button className="tfChoiceCard" type="button" onClick={() => { setGender('male'); setStep(1) }}>
              <MaleSvg />
              <b>Male</b>
            </button>
            <button className="tfChoiceCard" type="button" onClick={() => { setGender('female'); setStep(1) }}>
              <FemaleSvg />
              <b>Female</b>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="tfPage">
        <button className="tfBackBtn" type="button" onClick={() => setStep(0)}>
          <ChevronLeft size={16} />Back
        </button>
        <StepIndicator current={1} />
        <div className="tfStepContent">
          <p className="tfKicker">Step 2 of 2</p>
          <h2 className="tfTitle">Select your playing hand</h2>
          <p className="tfSub">Your dominant hand determines grip and footwork patterns.</p>
          <div className="tfChoiceGrid">
            <button className="tfChoiceCard" type="button" onClick={() => { setHand('right'); setStep(2) }}>
              <HandSvg side="right" />
              <b>Right Hand</b>
            </button>
            <button className="tfChoiceCard" type="button" onClick={() => { setHand('left'); setStep(2) }}>
              <HandSvg side="left" />
              <b>Left Hand</b>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tfPage">
      <div className="tfFormHeader">
        <button className="tfBackBtn" type="button" onClick={() => setStep(1)}>
          <ChevronLeft size={16} />Change Settings
        </button>
        <div className="tfProfile">
          <span className={`tfTag tfTag-${gender}`}>{gender === 'male' ? 'Male' : 'Female'}</span>
          <span className="tfTag">{hand === 'right' ? 'Right Hand' : 'Left Hand'}</span>
        </div>
      </div>

      <div className="tfModeBar">
        <div className="tfModeGroup">
          <span>Stroke Mode</span>
          <div className="tfToggleGroup">
            <button className={`tfToggle ${strokeMode === 'forehand' ? 'active' : ''}`} type="button" onClick={() => setStrokeMode('forehand')}>Forehand</button>
            <button className={`tfToggle ${strokeMode === 'backhand' ? 'active' : ''}`} type="button" onClick={() => setStrokeMode('backhand')}>Backhand</button>
          </div>
        </div>
        <p className="tfModeContext">
          {strokeMode === 'forehand' ? 'Forehand form' : 'Backhand form'}
        </p>
      </div>

      <div className="tfSectionHead">
        <h2 className="tfSectionTitle">Choose a Stroke to Practice</h2>
        <p className="tfSectionSub">Select a stroke type to view the correct form and start your session.</p>
      </div>

      <div className="strokeGrid">
        {strokes.map((stroke) => {
          const SvgComp = stroke.SvgComponent
          return (
            <article className={`strokeCard strokeCard-${stroke.color}`} key={stroke.id}>
              <div className="strokeIllustration">
                <SvgComp />
              </div>
              <div className="strokeInfo">
                <b>{stroke.name}</b>
                <p>{stroke.description}</p>
              </div>
              <button
                className="strokeStartBtn"
                type="button"
                onClick={() => handleStartStroke(stroke.id, stroke.name)}
              >
                Start
              </button>
            </article>
          )
        })}
      </div>

      {activeStroke && (
        <StrokeModal
          stroke={activeStroke.id}
          mode={strokeMode}
          hand={hand}
          gender={gender}
          onClose={() => setActiveStroke(null)}
        />
      )}

    </div>
  )
}

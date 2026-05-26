import React, { useState } from 'react'
import {
  Activity,
  BatteryFull,
  BluetoothConnected,
  ChartNoAxesCombined,
  Clock3,
  Dumbbell,
  Gauge,
  Home,
  Medal,
  Play,
  Radar,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Upload,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react'

const asset = (name) => `/assets/${name}`

const navItems = [
  { label: 'Overview', icon: Home, active: true },
  { label: 'Training', icon: Dumbbell },
  { label: 'Shot Analysis', icon: Radar },
  { label: 'Reports', icon: ChartNoAxesCombined },
  { label: 'Sensors', icon: Activity },
  { label: 'Players', icon: Users },
  { label: 'Settings', icon: Settings },
]

const devices = [
  ['Core Sensor', 'core-sensor.png'],
  ['Wrist Band', 'wrist-band.png'],
  ['AI Coach Hub', 'ai-coach-hub.png'],
  ['Sensor Pod', 'sensor-pod.png'],
]

const scores = [
  { label: 'Power', value: 84, icon: Zap, tone: 'cyan', note: '+12% from last session' },
  { label: 'Timing', value: 68, icon: Clock3, tone: 'cyan', note: 'Needs earlier contact' },
  { label: 'Sweet Spot', value: 88, icon: Target, tone: 'green', note: 'Strong impact quality' },
  { label: 'Injury Risk', value: 'Medium', icon: ShieldAlert, tone: 'orange', note: 'Elbow angle too open' },
]

const summaryItems = [
  ['Total Shots', '40'],
  ['Best Shot', 'Smash #24'],
  ['Max Power', '98'],
  ['Consistency', '72%'],
]

const recentShots = [
  ['40', 'Smash', 'Sweet Spot', '92', '01:18', 'green'],
  ['39', 'Clear', 'Timing', '78', '01:16', 'cyan'],
  ['38', 'Drop', 'Timing', '65', '01:14', 'cyan'],
  ['37', 'Smash', 'Sweet Spot', '95', '01:12', 'green'],
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <img className="logo" src={asset('ai-coach-logo.png')} alt="AI Coach logo" />

      <nav className="nav" aria-label="Dashboard navigation">
        {navItems.map(({ label, icon: Icon, active }) => (
          <a className={active ? 'active' : ''} href="#" key={label}>
            <Icon size={18} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <section className="deviceRail" aria-label="Connected devices">
        <div className="railHeader">
          <h2>Connected Kit</h2>
          <span><BatteryFull size={14} />100%</span>
        </div>
        {devices.map(([name, image]) => (
          <div className="railDevice" key={name}>
            <img src={asset(image)} alt={name} />
            <div>
              <b>{name}</b>
              <span>Connected</span>
            </div>
            <i />
          </div>
        ))}
      </section>
    </aside>
  )
}

function Header() {
  return (
    <header className="header">
      <div>
        <p>Live Training Session</p>
        <h1>Badminton AI Coach</h1>
        <span>Choose a category to inspect the training data.</span>
      </div>
      <div className="headerStatus">
        <div className="connectPill">
          <BluetoothConnected size={24} />
          <span>Bluetooth 5.2</span>
          <b>Connected</b>
        </div>
        <div className="playerPill">
          <div>01</div>
          <span>Player 01</span>
          <b>Intermediate</b>
        </div>
      </div>
    </header>
  )
}

function CategoryCard({ item, onClick }) {
  const Icon = item.icon
  return (
    <button className="categoryCard" type="button" onClick={onClick}>
      <div className="categoryIcon"><Icon size={24} /></div>
      <div>
        <span>{item.kicker}</span>
        <b>{item.title}</b>
        <p>{item.description}</p>
      </div>
    </button>
  )
}

function ScoreOverview() {
  return (
    <div className="scoreGrid">
      {scores.map((item) => {
        const Icon = item.icon
        const isNumber = typeof item.value === 'number'
        return (
          <article className={`scoreCard ${item.tone}`} key={item.label}>
            <div className="scoreIcon"><Icon size={21} /></div>
            <div>
              <span>{item.label}</span>
              <b>{item.value}{isNumber && <small>/100</small>}</b>
              <p>{item.note}</p>
              {isNumber && <i style={{ width: `${item.value}%` }} />}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ElbowDetail() {
  return (
    <div className="detailGrid twoCol">
      <div className="elbowStage">
        <img src={asset('elbows.png')} alt="Elbow form analysis" />
        <svg className="elbowArc" viewBox="0 0 100 86" aria-hidden="true">
          <path d="M 18 36 C 34 22 61 24 75 46" />
          <path className="inner" d="M 42 37 C 51 43 57 53 59 66" />
          <circle cx="75" cy="46" r="4" />
          <text x="68" y="31">122°</text>
        </svg>
      </div>
      <div className="calloutList">
        <div className="callout danger">
          <span>Current Angle</span>
          <b>122°</b>
          <p>Elbow is too open for this shot and may increase injury risk.</p>
        </div>
        <div className="callout good">
          <span>Target Range</span>
          <b>85°-105°</b>
          <p>Keep the elbow closer to the body before contact.</p>
        </div>
      </div>
    </div>
  )
}

function SweetSpotDetail() {
  return (
    <div className="detailGrid twoCol">
      <div className="sweetStage">
        <div className="racketWrap">
          <img src={asset('racket.png')} alt="Racket sweet spot" />
          <span className="impactDot" aria-label="Sweet spot impact point" />
        </div>
      </div>
      <div className="impactSummary">
        <span>Impact Score</span>
        <b>98<small>/100</small></b>
        <p>Contact is very close to the center of the racket face, so power transfer is strong.</p>
      </div>
    </div>
  )
}

function CoachAdvice() {
  return (
    <div className="adviceDetail">
      <div className="advicePrimary">
        <Sparkles size={24} />
        <div>
          <b>Start the swing slightly earlier.</b>
          <p>Timing is the weakest score at 68/100. Begin the swing earlier before the shuttle reaches the contact point.</p>
        </div>
      </div>
      <ul className="cleanList">
        <li><span>1</span>Bring elbow angle closer to 100°.</li>
        <li><span>2</span>Keep the impact point near the center of the racket.</li>
        <li><span>3</span>Add Drop and Drive shots for more variety.</li>
      </ul>
    </div>
  )
}

function SessionDetail() {
  return (
    <div className="sessionDetail">
      <div className="summaryGrid">
        {summaryItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <div className="shotList">
        {recentShots.map(([id, shot, result, power, time, tone]) => (
          <div className="shotRow" key={id}>
            <span>{id}</span>
            <b>{shot}</b>
            <em className={tone}>{result}</em>
            <small>Power {power}</small>
            <time>{time}</time>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpeedDetail() {
  return (
    <div className="speedBody">
      <img src={asset('shuttlecock.png')} alt="Shuttlecock speed" />
      <div>
        <span>Max Speed</span>
        <b>276<small>km/h</small></b>
        <span>Acceleration</span>
        <b className="greenText">32.6<small>m/s²</small></b>
      </div>
    </div>
  )
}

function HardwareDetail() {
  return (
    <div className="deviceGrid">
      {devices.map(([name, image]) => (
        <div className="deviceTile" key={name}>
          <img src={asset(image)} alt={name} />
          <b>{name}</b>
          <span><BatteryFull size={13} />100% Connected</span>
        </div>
      ))}
    </div>
  )
}

function ActionDetail() {
  return (
    <div className="actionCard">
      <button type="button"><Play size={18} />Start Training</button>
      <button type="button"><Video size={18} />Analyze Video</button>
      <button type="button"><Upload size={18} />Upload Session</button>
      <button type="button"><Medal size={18} />View Goals</button>
    </div>
  )
}

const categories = [
  {
    id: 'scores',
    kicker: 'Overview',
    title: 'Training Scores',
    description: 'Power, timing, sweet spot, and injury risk.',
    icon: Gauge,
    content: <ScoreOverview />,
  },
  {
    id: 'elbow',
    kicker: 'Form',
    title: 'Elbow Analysis',
    description: 'Check elbow angle and recommended range.',
    icon: ShieldAlert,
    content: <ElbowDetail />,
  },
  {
    id: 'sweet',
    kicker: 'Impact',
    title: 'Sweet Spot',
    description: 'Inspect where the shuttle hits the racket.',
    icon: Target,
    content: <SweetSpotDetail />,
  },
  {
    id: 'coach',
    kicker: 'Coach',
    title: 'Next Action',
    description: 'Recommended correction for the next drill.',
    icon: Sparkles,
    content: <CoachAdvice />,
  },
  {
    id: 'session',
    kicker: 'Session',
    title: 'Summary & Shots',
    description: 'Shot count, best shot, and recent attempts.',
    icon: ChartNoAxesCombined,
    content: <SessionDetail />,
  },
  {
    id: 'speed',
    kicker: 'Gyro',
    title: 'Swing Speed',
    description: 'Speed and acceleration from motion sensors.',
    icon: Zap,
    content: <SpeedDetail />,
  },
  {
    id: 'hardware',
    kicker: 'Sensors',
    title: 'Hardware Status',
    description: 'Connection and battery state for each device.',
    icon: Activity,
    content: <HardwareDetail />,
  },
  {
    id: 'actions',
    kicker: 'Control',
    title: 'Quick Actions',
    description: 'Start training or analyze an uploaded video.',
    icon: Play,
    content: <ActionDetail />,
  },
]

function DetailModal({ category, onClose }) {
  if (!category) return null

  return (
    <div className="modalOverlay" onClick={onClose} role="presentation">
      <section className="modalPanel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="closeButton" type="button" onClick={onClose} aria-label="Close detail view">
          <X size={18} />
        </button>
        <div className="modalTitle">
          <span>{category.kicker}</span>
          <h2 id="modal-title">{category.title}</h2>
          <p>{category.description}</p>
        </div>
        {category.content}
      </section>
    </div>
  )
}

export default function App() {
  const [selectedId, setSelectedId] = useState(null)
  const selectedCategory = categories.find((item) => item.id === selectedId)

  return (
    <div className={`appShell ${selectedCategory ? 'isBlurred' : ''}`}>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Header />
          <section className="categoryGrid" aria-label="Dashboard categories">
            {categories.map((item) => (
              <CategoryCard item={item} key={item.id} onClick={() => setSelectedId(item.id)} />
            ))}
          </section>
        </main>
      </div>
      <DetailModal category={selectedCategory} onClose={() => setSelectedId(null)} />
    </div>
  )
}

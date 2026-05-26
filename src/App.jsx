import React from 'react'
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
  { label: 'Power', value: 84, icon: Zap, tone: 'blue', note: '+12% from last session' },
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

const kitDevices = [
  ['Core Sensor', 'core-sensor.png'],
  ['Wrist Band', 'wrist-band.png'],
  ['AI Coach Hub', 'ai-coach-hub.png'],
  ['Sensor Pod', 'sensor-pod.png'],
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <img className="logo" src={asset('ai-coach-logo.png')} alt="AI Coach logo" />

      <nav className="nav" aria-label="Dashboard navigation">
        {navItems.map(({ label, icon: Icon, active }) => (
          <a className={active ? 'active' : ''} href="#" key={label}>
            <Icon size={19} />
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
        <span>อ่านผลได้ทันทีว่าอะไรดี อะไรควรแก้ และควรฝึกอะไรต่อ</span>
      </div>
      <div className="headerStatus">
        <div className="connectPill">
          <BluetoothConnected size={26} />
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

function FocusBanner() {
  return (
    <section className="focusBanner">
      <div>
        <p>Today's Focus</p>
        <h2>ลดมุมศอกให้เหลือ 85°-105° แล้วรักษาจุดปะทะให้อยู่กลางหน้าไม้</h2>
        <span>จุดเด่นตอนนี้คือพลังและ sweet spot ดีแล้ว แต่ timing กับมุมข้อศอกยังเป็นจุดที่ควรแก้ก่อน</span>
      </div>
      <div className="focusScore">
        <span>Overall</span>
        <b>82</b>
        <small>/100</small>
      </div>
    </section>
  )
}

function ScoreCard({ item }) {
  const Icon = item.icon
  const isNumber = typeof item.value === 'number'
  return (
    <article className={`scoreCard ${item.tone}`}>
      <div className="scoreIcon"><Icon size={22} /></div>
      <div>
        <span>{item.label}</span>
        <b>{item.value}{isNumber && <small>/100</small>}</b>
        <p>{item.note}</p>
        {isNumber && <i style={{ width: `${item.value}%` }} />}
      </div>
    </article>
  )
}

function ElbowCard() {
  return (
    <section className="card visualCard elbowCard">
      <div className="sectionTitle">
        <span>Form Alert</span>
        <h2>Elbow Form Analysis</h2>
      </div>
      <div className="elbowContent">
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
            <p>กว้างเกินช่วงที่แนะนำ</p>
          </div>
          <div className="callout good">
            <span>Target Range</span>
            <b>85°-105°</b>
            <p>ลดความเสี่ยงและควบคุมทิศทางดีขึ้น</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function SweetSpotCard() {
  return (
    <section className="card visualCard">
      <div className="sectionTitle">
        <span>Impact Quality</span>
        <h2>Sweet Spot Impact</h2>
      </div>
      <div className="sweetStage">
        <div className="racketWrap">
          <img src={asset('racket.png')} alt="Racket sweet spot" />
          <div className="sweetZone" aria-hidden="true" />
        </div>
      </div>
      <div className="impactSummary">
        <span>Impact Score</span>
        <b>98<small>/100</small></b>
        <p>โดนใกล้กลางหน้าไม้มาก ทำให้ส่งแรงได้ดี</p>
      </div>
    </section>
  )
}

function CoachAdvice() {
  return (
    <section className="card adviceCard">
      <div className="sectionTitle">
        <span>Next Best Action</span>
        <h2>AI Coach Suggestion</h2>
      </div>
      <div className="advicePrimary">
        <Sparkles size={26} />
        <div>
          <b>ฝึกจังหวะตีให้เร็วขึ้นเล็กน้อย</b>
          <p>Timing อยู่ที่ 68/100 ให้เริ่มสวิงเร็วขึ้นก่อนลูกถึงจุดปะทะ</p>
        </div>
      </div>
      <ul className="cleanList">
        <li><span>1</span> ลดมุมศอกจาก 122° ไปใกล้ 100°</li>
        <li><span>2</span> รักษาจุดปะทะให้อยู่กลางหน้าไม้</li>
        <li><span>3</span> เพิ่ม Drop และ Drive เพื่อความหลากหลาย</li>
      </ul>
    </section>
  )
}

function SessionSummary() {
  return (
    <section className="card">
      <div className="sectionTitle">
        <span>Session</span>
        <h2>Quick Summary</h2>
      </div>
      <div className="summaryGrid">
        {summaryItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </section>
  )
}

function SpeedCard() {
  return (
    <section className="card speedCard">
      <div className="sectionTitle">
        <span>Gyro</span>
        <h2>Swing Speed</h2>
      </div>
      <div className="speedBody">
        <img src={asset('shuttlecock.png')} alt="Shuttlecock speed" />
        <div>
          <span>Max Speed</span>
          <b>276<small>km/h</small></b>
          <span>Acceleration</span>
          <b className="greenText">32.6<small>m/s²</small></b>
        </div>
      </div>
    </section>
  )
}

function RecentShots() {
  return (
    <section className="card">
      <div className="sectionTitle">
        <span>Latest</span>
        <h2>Recent Shots</h2>
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
    </section>
  )
}

function DevicesCard() {
  return (
    <section className="card devicesCard">
      <div className="sectionTitle">
        <span>Hardware</span>
        <h2>Sensor Status</h2>
      </div>
      <div className="deviceGrid">
        {kitDevices.map(([name, image]) => (
          <div className="deviceTile" key={name}>
            <img src={asset(image)} alt={name} />
            <b>{name}</b>
            <span><BatteryFull size={13} />100% Connected</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function QuickActions() {
  return (
    <section className="card actionCard">
      <button type="button"><Play size={18} />Start Training</button>
      <button type="button"><Video size={18} />Analyze Video</button>
      <button type="button"><Upload size={18} />Upload Session</button>
      <button type="button"><Medal size={18} />View Goals</button>
    </section>
  )
}

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Header />
        <FocusBanner />

        <section className="scoreGrid" aria-label="Training scores">
          {scores.map((item) => <ScoreCard item={item} key={item.label} />)}
        </section>

        <section className="primaryGrid">
          <ElbowCard />
          <SweetSpotCard />
          <CoachAdvice />
        </section>

        <section className="secondaryGrid">
          <SessionSummary />
          <SpeedCard />
          <RecentShots />
        </section>

        <section className="bottomGrid">
          <DevicesCard />
          <QuickActions />
        </section>
      </main>
    </div>
  )
}

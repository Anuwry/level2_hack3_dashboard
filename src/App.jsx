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
  Menu,
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
  { label: 'การฝึกซ้อม', icon: Dumbbell },
  { label: 'วิเคราะห์ช็อต', icon: Radar },
  { label: 'รายงานการเล่น', icon: ChartNoAxesCombined },
  { label: 'เซ็นเซอร์', icon: Activity },
  { label: 'ผู้เล่น', icon: Users },
  { label: 'การตั้งค่า', icon: Settings },
]

const connectedDevices = [
  ['Sensor Core', 'core-sensor.png'],
  ['Wrist Band', 'wrist-band.png'],
  ['AI Coach Hub', 'ai-coach-hub.png'],
  ['Pro Motion Coach', 'pro-motion-coach.png'],
  ['Wrist Sensor', 'wrist-sensor.png'],
  ['Sensor Pod', 'sensor-pod.png'],
]

const metrics = [
  { label: 'Power Score', value: '84', unit: '/100', icon: Zap, progress: 84, change: '+12% จากครั้งก่อน', tone: 'blue' },
  { label: 'Timing Score', value: '68', unit: '/100', icon: Clock3, progress: 68, change: '+8% จากครั้งก่อน', tone: 'blue' },
  { label: 'Sweet Spot Score', value: '88', unit: '/100', icon: Target, progress: 88, change: '+15% จากครั้งก่อน', tone: 'green' },
  { label: 'Injury Risk', value: 'Medium', icon: ShieldAlert, note: 'เสี่ยงปานกลาง', tone: 'orange' },
  { label: 'Session Time', value: '00:18:36', icon: Gauge, note: 'เวลาในการฝึกซ้อมวันนี้', tone: 'blue' },
]

const formStats = [
  ['Elbow Incorrect', 'Used for Injury Risk', '12', 'red'],
  ['Incorrect Shots', '', '12', 'orange'],
  ['Correct Shots', '', '28', 'green'],
  ['Total Shots', '', '40', 'blue'],
]

const speedHistory = ['205', '214', '198', '221', '209']

const summary = [
  ['Total Shots', '40'],
  ['Best Shot', 'Smash #24', 'Power 98'],
  ['Calories', '210 kcal'],
  ['Avg Power', '76.5'],
  ['Max Power', '98'],
  ['Consistency', '72%'],
]

const suggestions = [
  ['เพิ่มความแม่นยำในการ Smash', 'โฟกัสตำแหน่ง sweet spot มากขึ้น', 'ฝึกทันที', 'blue'],
  ['ปรับจังหวะ Timing', 'พยายามให้เริ่มตีเร็วขึ้นเล็กน้อย', 'ฝึกทันที', 'orange'],
  ['เพิ่มความหลากหลาย', 'สลับใช้ Drop และ Drive ให้มากขึ้น', 'แนะนำ', 'green'],
]

const recentShots = [
  ['40', 'Smash', 'Power: 92', 'Sweet Spot', '01:18', 'green'],
  ['39', 'Clear', 'Power: 78', 'Timing', '01:16', 'blue'],
  ['38', 'Drop', 'Power: 65', 'Timing', '01:14', 'blue'],
  ['37', 'Smash', 'Power: 95', 'Sweet Spot', '01:12', 'green'],
  ['36', 'Drive', 'Power: 70', 'Good', '01:10', 'green'],
]

const sensorCards = [
  ['CORE SENSOR', 'core-sensor.png'],
  ['WRIST BAND', 'wrist-band.png'],
  ['AI COACH HUB', 'ai-coach-hub.png'],
]

const kitCards = [
  ['PRO MOTION COACH', 'pro-motion-coach.png'],
  ['WRIST SENSOR', 'wrist-sensor.png'],
  ['SENSOR POD', 'sensor-pod.png'],
  ['CHARGING CASE', 'charging-case.png'],
]

const sweetSpotHit = { x: 72, y: 22, score: 98 }

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logoRow">
        <img src={asset('ai-coach-logo.png')} alt="AI Coach logo" />
        <Menu size={18} />
      </div>

      <nav className="nav" aria-label="Dashboard navigation">
        {navItems.map(({ label, icon: Icon, active }) => (
          <a className={active ? 'active' : ''} href="#" key={label}>
            <Icon size={20} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <section className="miniStatus" aria-label="Connected devices">
        <div className="miniTitle">
          <h2>อุปกรณ์เชื่อมต่อ</h2>
          <span><BatteryFull size={15} />100%</span>
        </div>

        {connectedDevices.map(([name, image]) => (
          <div className="miniRow" key={name}>
            <img src={asset(image)} alt={name} />
            <div>
              <b>{name}</b>
              <span>Connected</span>
            </div>
            <i />
          </div>
        ))}

        <button className="syncButton" type="button">ซิงค์ข้อมูลล่าสุด</button>
        <p className="syncText">อัปเดต 1 นาทีที่แล้ว</p>
      </section>
    </aside>
  )
}

function Header() {
  return (
    <header className="topbar">
      <div className="title">
        <h1>Badminton AI Coach Dashboard</h1>
        <span>วิเคราะห์ทุกช็อต พัฒนาทุกเกม</span>
      </div>
      <div className="connection">
        <div className="pill">
          <BluetoothConnected size={34} />
          <div>
            <b>เชื่อมต่อแล้ว</b>
            <span>Bluetooth 5.2</span>
          </div>
        </div>
        <div className="pill player">
          <div className="avatar">01</div>
          <div>
            <b>Player 01</b>
            <span>Level Intermediate</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function MetricCard({ metric }) {
  const Icon = metric.icon
  return (
    <article className={`card metric ${metric.tone || ''}`}>
      <div className="metricHeader">
        <Icon size={32} />
        <h2>{metric.label}</h2>
      </div>
      <div className="metricValue">
        {metric.value}
        {metric.unit && <small>{metric.unit}</small>}
      </div>
      {metric.progress ? (
        <>
          <div className="bar"><i style={{ width: `${metric.progress}%` }} /></div>
          <p className="delta">▲ {metric.change}</p>
        </>
      ) : (
        <p className="note">{metric.note}</p>
      )}
    </article>
  )
}

function Panel({ title, children, className = '' }) {
  return (
    <section className={`card panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function ElbowAnalysis() {
  return (
    <div className="elbowPanelLayout">
      <div className="elbowVisual">
        <img className="elbowImage" src={asset('elbows.png')} alt="Elbow form analysis" />
        <svg className="elbowArmArc" viewBox="0 0 100 86" aria-hidden="true">
          <path className="armArcOuter" d="M 18 36 C 34 22 61 24 75 46" />
          <path className="armArcInner" d="M 42 37 C 51 43 57 53 59 66" />
          <circle cx="75" cy="46" r="4" />
          <text x="68" y="31">122°</text>
        </svg>
      </div>

      <div className="elbowInfo">
        <p>Recommended Range</p>
        <strong className="range">85°-105°</strong>
        <p>Current Angle</p>
        <strong className="angle">122°</strong>
        <div className="statusBadge">Incorrect Form</div>
        <span>อยู่ในช่วงที่เพิ่มความเสี่ยง บาดเจ็บได้ง่าย</span>
      </div>
    </div>
  )
}

function FormAnalysis() {
  return (
    <div className="formGrid">
      <div className="donut">
        <div><b>40</b><span>Total Shots</span></div>
      </div>
      <div className="statList">
        {formStats.map(([label, note, value, tone]) => (
          <div className={`stat ${tone}`} key={label}>
            <span>{label}{note && <small>{note}</small>}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpeedGyroPanel() {
  return (
    <div className="speedPanel">
      <div className="speedVisual">
        <img className="speed" src={asset('shuttlecock.png')} alt="Shuttlecock speed" />
      </div>
      <div className="speedNumbers">
        <div><span>Max Speed</span><b>276<small>km/h</small></b></div>
        <div><span>Average Speed</span><b>198<small>km/h</small></b></div>
        <div><span>Swing Acceleration</span><b>32.6<small>m/s²</small></b></div>
      </div>
      <div className="speedHistory" aria-label="Recent swing speeds">
        {speedHistory.map((speed) => <span key={speed}>{speed}</span>)}
      </div>
    </div>
  )
}

function SweetSpotImpact() {
  return (
    <div className="sweetPanel">
      <div className="sweetSpotStage">
        <div className="sweetRacket">
          <img src={asset('racket.png')} alt="Racket sweet spot" />
          <div className="sweetZone" aria-hidden="true" />
          <span
            className="hitDot current"
            style={{ left: `${sweetSpotHit.x}%`, top: `${sweetSpotHit.y}%` }}
            title={`Impact score ${sweetSpotHit.score}`}
          >
            {sweetSpotHit.score}
          </span>
        </div>
      </div>
      <div className="impactScale">
        <span>Low Impact</span>
        <i />
        <span>High Impact</span>
      </div>
    </div>
  )
}

function DeviceCard({ name, image }) {
  return (
    <div className="deviceCard">
      <img src={asset(image)} alt={name} />
      <b>{name}</b>
      <span><BatteryFull size={14} />100% <i /> Connected</span>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Header />

        <section className="metricsGrid" aria-label="Training metrics">
          {metrics.map((metric) => <MetricCard metric={metric} key={metric.label} />)}
        </section>

        <section className="analysisGrid">
          <Panel title="Elbow Form Analysis" className="elbowPanel">
            <ElbowAnalysis />
          </Panel>
          <Panel title="Form Analysis (Elbow & Shots)">
            <FormAnalysis />
          </Panel>
          <Panel title="Speed (Gyro)">
            <SpeedGyroPanel />
          </Panel>
          <Panel title="Sweet Spot Impact">
            <SweetSpotImpact />
          </Panel>
        </section>

        <section className="insightGrid">
          <Panel title="Session Summary">
            <div className="summaryGrid">
              {summary.map(([label, value, note]) => (
                <div className="summaryItem" key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                  {note && <small>{note}</small>}
                </div>
              ))}
            </div>
            <button className="panelButton" type="button">ดูรายงานฉบับเต็ม</button>
          </Panel>

          <Panel title="AI Coach Suggestion">
            <div className="suggestions">
              {suggestions.map(([title, body, tag, tone]) => (
                <div className="suggestion" key={title}>
                  <Sparkles className={tone} size={24} />
                  <div>
                    <b>{title}</b>
                    <span>{body}</span>
                  </div>
                  <em className={tone}>{tag}</em>
                </div>
              ))}
            </div>
            <button className="panelButton" type="button">ดูแผนการฝึกแนะนำ</button>
          </Panel>

          <Panel title="Recent Shots">
            <div className="shotList">
              {recentShots.map(([id, shot, power, result, time, tone]) => (
                <div className="shotRow" key={id}>
                  <span>{id}</span>
                  <b>{shot}</b>
                  <small>{power}</small>
                  <strong className={tone}>{result}</strong>
                  <time>{time}</time>
                </div>
              ))}
            </div>
            <button className="panelButton" type="button">ดูเพิ่มเติม</button>
          </Panel>
        </section>

        <section className="deviceGrid">
          <Panel title="Sensor Status">
            <div className="deviceList">
              {sensorCards.map(([name, image]) => <DeviceCard name={name} image={image} key={name} />)}
            </div>
          </Panel>

          <Panel title="Coach Kit Status">
            <div className="kitList">
              {kitCards.map(([name, image]) => <DeviceCard name={name} image={image} key={name} />)}
            </div>
          </Panel>

          <Panel title="Quick Action" className="quickPanel">
            <div className="quickActions">
              <button type="button"><Play size={19} />เริ่มการฝึกซ้อมใหม่</button>
              <button type="button"><Video size={19} />วิเคราะห์วิดีโอ</button>
              <button type="button"><Upload size={19} />อัปโหลดเซสชัน</button>
              <button type="button"><Medal size={19} />ดูเป้าหมาย</button>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  )
}

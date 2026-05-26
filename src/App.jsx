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
  { label: 'การตั้งค่า', icon: Settings },
]

const devices = [
  ['Sensor Core', 'core-sensor.png'],
  ['Wrist Band', 'wrist-band.png'],
  ['AI Coach Hub', 'ai-coach-hub.png'],
  ['Sensor Pod', 'sensor-pod.png'],
]

const metrics = [
  { label: 'Power Score', value: '84', unit: '/100', icon: Zap, progress: 84, change: '+12% จากครั้งก่อน' },
  { label: 'Timing Score', value: '68', unit: '/100', icon: Clock3, progress: 68, change: '+8% จากครั้งก่อน' },
  { label: 'Sweet Spot Score', value: '88', unit: '/100', icon: Target, progress: 88, change: '+15% จากครั้งก่อน', tone: 'green' },
  { label: 'Injury Risk', value: 'Medium', icon: ShieldAlert, note: 'เสี่ยงปานกลาง', tone: 'orange' },
  { label: 'Session Time', value: '00:18:36', icon: Gauge, note: 'เวลาฝึกซ้อมวันนี้' },
]

const summary = [
  ['Total Shots', '40'],
  ['Best Shot', 'Smash #24'],
  ['Calories', '210'],
  ['Avg Power', '76.5'],
  ['Max Power', '98'],
  ['Consistency', '72%'],
]

const suggestions = [
  ['เพิ่มความแม่นยำในการ Smash', 'โฟกัสตำแหน่ง sweet spot ให้มากขึ้น', 'ฝึกทันที', 'blue'],
  ['ปรับจังหวะ Timing', 'พยายามให้เร็วขึ้นอีกเล็กน้อย', 'ฝึกทันที', 'orange'],
  ['เพิ่มความหลากหลาย', 'สลับใช้งาน Drop และ Drive ให้มากขึ้น', 'แนะนำ', 'green'],
]

const recentShots = [
  ['#40 Smash', 'Sweet Spot', 'green'],
  ['#39 Clear', 'Timing', 'blue'],
  ['#38 Drop', 'Timing', 'blue'],
  ['#37 Smash', 'Sweet Spot', 'green'],
  ['#36 Drive', 'Good', 'green'],
]

const kitDevices = [
  ['PRO MOTION COACH', 'pro-motion-coach.png'],
  ['WRIST SENSOR', 'wrist-sensor.png'],
  ['SENSOR POD', 'sensor-pod.png'],
  ['CHARGING CASE', 'charging-case.png'],
]

const speedStats = [
  { label: 'Max', value: '120', unit: 'km/h', tone: 'max' },
  { label: 'Current', value: '50', unit: 'km/h', tone: 'current' },
  { label: 'Previous', value: '80', unit: 'km/h', tone: 'previous' },
]

const gyroStats = [
  { label: 'Max', value: '32.6', unit: 'm/s', tone: 'gyroMax' },
  { label: 'Current', value: '28.4', unit: 'm/s', tone: 'gyroCurrent' },
  { label: 'Previous', value: '25.1', unit: 'm/s', tone: 'gyroPrevious' },
]

const sweetSpotHits = [
  { id: 1, x: 69, y: 30, score: 98, current: true },
  { id: 2, x: 62, y: 25, score: 86 },
  { id: 3, x: 75, y: 36, score: 82 },
  { id: 4, x: 55, y: 42, score: 68 },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <img src={asset('ai-coach-logo.png')} alt="AI Coach logo" />
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
          <span><BatteryFull size={16} />100%</span>
        </div>
        {devices.map(([name, image]) => (
          <div className="miniRow" key={name}>
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
    <header className="topbar">
      <div className="title">
        <p>Live training session</p>
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
          <img src={asset('dashboard-preview.png')} alt="Player profile" />
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
        <Icon size={20} />
        <h2>{metric.label}</h2>
      </div>
      <div className="metricValue">
        {metric.value}
        {metric.unit && <small>{metric.unit}</small>}
      </div>
      {metric.progress ? (
        <>
          <div className="bar"><i style={{ width: `${metric.progress}%` }} /></div>
          <p className="delta">{metric.change}</p>
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
    <>
      <div className="elbowVisual">
        <img className="panelImage compact" src={asset('elbows.png')} alt="Elbow form analysis" />
        <svg className="elbowArc" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M 50 50 L 50 10" />
          <path d="M 50 50 L 85 30" className="warningLine" />
          <path d="M 50 20 A 30 30 0 0 1 78 35" className="recommendedArc" />
          <path d="M 50 20 A 30 30 0 0 1 82 42" className="currentArc" />
          <circle cx="50" cy="50" r="5" className="jointOuter" />
          <circle cx="50" cy="50" r="3" className="jointInner" />
          <text x="60" y="28">122°</text>
        </svg>
      </div>
      <div className="elbowInfo">
        <div className="elbowCurrent">
          Current Angle: <strong>122°</strong>
          <span>Recommended: 85°-105°</span>
        </div>
        <div className="elbowWarning">
          <b>มุมข้อศอก &gt; 105° มีโอกาสผิดท่า</b>
          <span>เสี่ยงต่อการบาดเจ็บ ควรงอข้อศอกให้มากขึ้น</span>
        </div>
        <div className="statusBadge">Incorrect Form</div>
      </div>
    </>
  )
}

function SpeedGyroPanel() {
  return (
    <>
      <div className="speedWrap">
        <img className="panelImage speed" src={asset('shuttlecock.png')} alt="Shuttlecock speed" />
        <div className="speedTrail" />
        <div className="speedOverlay">
          {speedStats.map((item) => (
            <div className={`speedStat ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <b>{item.value}<small>{item.unit}</small></b>
            </div>
          ))}
        </div>
      </div>
      <div className="gyroBlock">
        <h3>Gyro Swing Speed</h3>
        <div className="gyroGrid">
          {gyroStats.map((item) => (
            <div className={`speedStat ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <b>{item.value}<small>{item.unit}</small></b>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function SweetSpotImpact() {
  const currentHit = sweetSpotHits.find((hit) => hit.current)

  return (
    <>
      <div className="sweetSpotStage">
        <div className="sweetRacket">
          <img src={asset('racket.png')} alt="Racket sweet spot" />
          <div className="sweetZone" aria-hidden="true" />
          {sweetSpotHits.map((hit) => (
            <span
              className={`hitDot ${hit.current ? 'current' : ''}`}
              key={hit.id}
              style={{ left: `${hit.x}%`, top: `${hit.y}%` }}
              title={`Impact score ${hit.score}`}
            >
              {hit.current ? hit.score : ''}
            </span>
          ))}
        </div>
      </div>
      <div className="sweetScore">
        <div>
          <span>Impact Score</span>
          <b>{currentHit.score}<small>/100</small></b>
        </div>
        <p>ยิ่งจุดกระทบใกล้กลางไม้ คะแนน sweet spot จะยิ่งสูง</p>
      </div>
    </>
  )
}

function DeviceCard({ name, image }) {
  return (
    <div className="deviceCard">
      <img src={asset(image)} alt={name} />
      <b>{name}</b>
      <span><BatteryFull size={14} />100% Connected</span>
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
          <Panel title="Elbow Form Analysis">
            <ElbowAnalysis />
          </Panel>

          <Panel title="Form Analysis">
            <div className="formGrid">
              <div className="donut">
                <div><b>40</b><span>Total Shots</span></div>
              </div>
              <div className="statList">
                <div className="stat red"><span>Elbow Incorrect<small>Used for Injury Risk</small></span><strong>12</strong></div>
                <div className="stat red"><span>Incorrect Shots</span><strong>12</strong></div>
                <div className="stat green"><span>Correct Shots</span><strong>28</strong></div>
                <div className="stat blue"><span>Total Shots</span><strong>40</strong></div>
              </div>
            </div>
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
              {summary.map(([label, value]) => (
                <div className="summaryItem" key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI Coach Suggestion">
            <div className="suggestions">
              {suggestions.map(([title, body, tag, tone]) => (
                <div className="suggestion" key={title}>
                  <Sparkles className={tone} size={25} />
                  <div>
                    <b>{title}</b>
                    <span>{body}</span>
                  </div>
                  <em className={tone}>{tag}</em>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Shots">
            <div className="statList">
              {recentShots.map(([shot, result, tone]) => (
                <div className="shotRow" key={shot}>
                  <span>{shot}</span>
                  <b className={tone}>{result}</b>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="deviceGrid">
          <Panel title="Sensor Status">
            <div className="deviceList">
              {devices.slice(0, 3).map(([name, image]) => <DeviceCard name={name.toUpperCase()} image={image} key={name} />)}
            </div>
          </Panel>

          <Panel title="Coach Kit Status">
            <div className="kitList">
              {kitDevices.map(([name, image]) => <DeviceCard name={name} image={image} key={name} />)}
            </div>
          </Panel>

          <Panel title="Quick Action" className="quickPanel">
            <div className="quickActions">
              <button type="button"><Play size={20} />เริ่มการฝึกซ้อมใหม่</button>
              <button type="button"><Video size={20} />วิเคราะห์วิดีโอ</button>
              <button type="button"><Upload size={20} />อัปโหลดเซสชัน</button>
              <button type="button"><Medal size={20} />ดูเป้าหมาย</button>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  )
}

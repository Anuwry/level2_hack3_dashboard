import React, { useState } from 'react'
import {
  Activity,
  BatteryFull,
  BluetoothConnected,
  ChartNoAxesCombined,
  Clock3,
  Dumbbell,
  Flame,
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
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'shot-analysis', label: 'Shot Analysis', icon: Radar },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined },
  { id: 'data-explorer', label: 'Data Explorer', icon: Gauge },
  { id: 'sensors', label: 'Sensors', icon: Activity },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
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

const formStats = [
  ['Elbow Incorrect', 'Used for Injury Risk', '12', 'red'],
  ['Incorrect Shots', '', '12', 'orange'],
  ['Correct Shots', '', '28', 'green'],
  ['Total Shots', '', '40', 'cyan'],
]

const summaryItems = [
  ['Total Shots', '40', '', Target],
  ['Best Shot', 'Smash #24', 'Power 98', Medal],
  ['Calories', '210 kcal', '', Flame],
  ['Avg Power', '76.5', '', Zap],
  ['Max Power', '98', '', Activity],
  ['Consistency', '72%', '', Gauge],
]

const recentShots = [
  ['40', 'Smash', 'Sweet Spot', '92', '01:18', 'green'],
  ['39', 'Clear', 'Timing', '78', '01:16', 'cyan'],
  ['38', 'Drop', 'Timing', '65', '01:14', 'cyan'],
  ['37', 'Smash', 'Sweet Spot', '95', '01:12', 'green'],
]

const players = [
  { id: 'player1', number: '01', name: 'Player 01', level: 'Intermediate', hand: 'Right', baseline: 82 },
  { id: 'player2', number: '02', name: 'Player 02', level: 'Beginner', hand: 'Right', baseline: 64 },
  { id: 'player3', number: '03', name: 'Player 03', level: 'Advanced', hand: 'Left', baseline: 91 },
]

const playerDatasets = {
  player1: {
    timer: '00:18:36',
    drill: 'Smash Accuracy',
    targetShots: 60,
    bestDate: 'May 26',
    scores,
    formStats,
    summaryItems,
    recentShots,
    advice: {
      title: 'Start the swing slightly earlier.',
      body: 'Timing is the weakest score at 68/100. Begin the swing earlier before the shuttle reaches the contact point.',
      steps: ['Bring elbow angle closer to 100°.', 'Keep the impact point near the center of the racket.', 'Add Drop and Drive shots for more variety.'],
    },
  },
  player2: {
    timer: '00:14:08',
    drill: 'Timing Basics',
    targetShots: 45,
    bestDate: 'May 24',
    scores: [
      { label: 'Power', value: 62, icon: Zap, tone: 'cyan', note: 'Building controlled power' },
      { label: 'Timing', value: 58, icon: Clock3, tone: 'orange', note: 'Often late on contact' },
      { label: 'Sweet Spot', value: 61, icon: Target, tone: 'green', note: 'Needs cleaner center contact' },
      { label: 'Injury Risk', value: 'Low', icon: ShieldAlert, tone: 'cyan', note: 'Form is controlled' },
    ],
    formStats: [
      ['Elbow Incorrect', 'Used for Injury Risk', '6', 'orange'],
      ['Incorrect Shots', '', '18', 'orange'],
      ['Correct Shots', '', '14', 'green'],
      ['Total Shots', '', '32', 'cyan'],
    ],
    summaryItems: [
      ['Total Shots', '32', '', Target],
      ['Best Shot', 'Clear #18', 'Power 74', Medal],
      ['Calories', '142 kcal', '', Flame],
      ['Avg Power', '61.8', '', Zap],
      ['Max Power', '74', '', Activity],
      ['Consistency', '54%', '', Gauge],
    ],
    recentShots: [
      ['32', 'Clear', 'Timing', '62', '01:05', 'orange'],
      ['31', 'Drop', 'Good', '68', '01:03', 'green'],
      ['30', 'Clear', 'Late', '56', '01:00', 'orange'],
      ['29', 'Drive', 'Timing', '59', '00:58', 'cyan'],
    ],
    advice: {
      title: 'Keep the swing compact before adding power.',
      body: 'Timing and sweet spot are still developing. Use shorter reps and keep the racket face stable through contact.',
      steps: ['Run 10 slow clear shots before full speed.', 'Pause after contact and check racket face direction.', 'Use a lower target speed until timing reaches 70/100.'],
    },
  },
  player3: {
    timer: '00:22:41',
    drill: 'Attack Variation',
    targetShots: 75,
    bestDate: 'May 27',
    scores: [
      { label: 'Power', value: 94, icon: Zap, tone: 'green', note: 'Elite smash output' },
      { label: 'Timing', value: 86, icon: Clock3, tone: 'cyan', note: 'Stable contact window' },
      { label: 'Sweet Spot', value: 93, icon: Target, tone: 'green', note: 'Very clean impact quality' },
      { label: 'Injury Risk', value: 'Medium', icon: ShieldAlert, tone: 'orange', note: 'High load on repeated smashes' },
    ],
    formStats: [
      ['Elbow Incorrect', 'Used for Injury Risk', '9', 'orange'],
      ['Incorrect Shots', '', '7', 'orange'],
      ['Correct Shots', '', '49', 'green'],
      ['Total Shots', '', '56', 'cyan'],
    ],
    summaryItems: [
      ['Total Shots', '56', '', Target],
      ['Best Shot', 'Smash #43', 'Power 99', Medal],
      ['Calories', '286 kcal', '', Flame],
      ['Avg Power', '88.4', '', Zap],
      ['Max Power', '99', '', Activity],
      ['Consistency', '84%', '', Gauge],
    ],
    recentShots: [
      ['56', 'Smash', 'Sweet Spot', '96', '01:42', 'green'],
      ['55', 'Drive', 'Good', '84', '01:40', 'cyan'],
      ['54', 'Smash', 'Sweet Spot', '99', '01:38', 'green'],
      ['53', 'Drop', 'Good', '79', '01:35', 'green'],
    ],
    advice: {
      title: 'Reduce overload during long smash blocks.',
      body: 'Performance is strong, but repeated high-power shots can raise elbow load. Mix recovery shots into attack drills.',
      steps: ['Alternate 3 smashes with 2 recovery clears.', 'Stop the set if elbow angle opens beyond 115°.', 'Track fatigue after every 15 shots.'],
    },
  },
}

const visualizationSets = {
  shotList: {
    title: 'Shot List Visualization',
    description: 'Recent shot quality by score and result label.',
    fileName: 'shot-list.csv',
    rows: [
      { label: '#40 Smash', value: 92, secondary: 'Sweet Spot' },
      { label: '#39 Clear', value: 78, secondary: 'Timing' },
      { label: '#38 Drop', value: 65, secondary: 'Timing' },
      { label: '#37 Smash', value: 95, secondary: 'Sweet Spot' },
      { label: '#36 Drive', value: 70, secondary: 'Good' },
    ],
  },
  sessionHistory: {
    title: 'Session History Visualization',
    description: 'Overall training score across recent sessions.',
    fileName: 'session-history.csv',
    rows: [
      { label: 'May 01', value: 74, secondary: '34 shots' },
      { label: 'May 08', value: 78, secondary: '38 shots' },
      { label: 'May 15', value: 80, secondary: '42 shots' },
      { label: 'May 22', value: 83, secondary: '40 shots' },
      { label: 'May 26', value: 88, secondary: '40 shots' },
    ],
  },
  trendCharts: {
    title: 'Training Trend Visualization',
    description: 'Power, timing, sweet spot, and consistency score trend.',
    fileName: 'training-trends.csv',
    rows: [
      { label: 'Power', value: 84, secondary: '+12%' },
      { label: 'Timing', value: 68, secondary: '+8%' },
      { label: 'Sweet Spot', value: 88, secondary: '+15%' },
      { label: 'Consistency', value: 72, secondary: '+6%' },
    ],
  },
  deviceHealth: {
    title: 'Sensor Health Visualization',
    description: 'Battery and connection readiness per device.',
    fileName: 'sensor-health.csv',
    rows: [
      { label: 'Core Sensor', value: 100, secondary: 'Connected' },
      { label: 'Wrist Band', value: 96, secondary: 'Connected' },
      { label: 'AI Coach Hub', value: 100, secondary: 'Connected' },
      { label: 'Sensor Pod', value: 94, secondary: 'Connected' },
    ],
  },
  liveFeedback: {
    title: 'Live Feedback Visualization',
    description: 'Latest feedback signals from the current training session.',
    fileName: 'live-feedback.csv',
    rows: [
      { label: 'Impact', value: 98, secondary: 'Sweet Spot' },
      { label: 'Timing', value: 68, secondary: 'Needs earlier contact' },
      { label: 'Power', value: 92, secondary: 'Strong' },
      { label: 'Elbow Form', value: 58, secondary: '122 deg' },
    ],
  },
  playerHistory: {
    title: 'Player History Visualization',
    description: 'Baseline progress for the selected player.',
    fileName: 'player-history.csv',
    rows: [
      { label: 'Baseline', value: 68, secondary: 'First session' },
      { label: 'Week 1', value: 74, secondary: 'Timing focus' },
      { label: 'Week 2', value: 79, secondary: 'Power focus' },
      { label: 'Current', value: 82, secondary: 'Balanced' },
    ],
  },
}

const recordLists = {
  shots: {
    title: 'All Shots in Current Session',
    actionLabel: 'Open Shot Graph',
    visualizationId: 'shotList',
    rows: [
      ['#40', 'Smash', 'Sweet Spot', 'Power 92', '01:18'],
      ['#39', 'Clear', 'Timing', 'Power 78', '01:16'],
      ['#38', 'Drop', 'Timing', 'Power 65', '01:14'],
      ['#37', 'Smash', 'Sweet Spot', 'Power 95', '01:12'],
      ['#36', 'Drive', 'Good', 'Power 70', '01:10'],
    ],
  },
  sessions: {
    title: 'Session History',
    actionLabel: 'Open Session Graph',
    visualizationId: 'sessionHistory',
    rows: [
      ['May 26', '40 shots', 'Overall 88', 'Best Smash #24', '18m 36s'],
      ['May 22', '40 shots', 'Overall 83', 'Timing focus', '17m 12s'],
      ['May 15', '42 shots', 'Overall 80', 'Power focus', '20m 02s'],
      ['May 08', '38 shots', 'Overall 78', 'Form focus', '16m 44s'],
      ['May 01', '34 shots', 'Overall 74', 'Baseline', '15m 28s'],
    ],
  },
  devices: {
    title: 'Device List',
    actionLabel: 'Open Sensor Graph',
    visualizationId: 'deviceHealth',
    rows: [
      ['Core Sensor', 'Connected', 'Battery 100%', 'Signal good', 'Seen now'],
      ['Wrist Band', 'Connected', 'Battery 96%', 'Signal good', 'Seen now'],
      ['AI Coach Hub', 'Connected', 'Battery 100%', 'Signal good', 'Seen now'],
      ['Sensor Pod', 'Connected', 'Battery 94%', 'Signal good', 'Seen now'],
    ],
  },
  players: {
    title: 'Player List',
    actionLabel: 'Open Player Graph',
    visualizationId: 'playerHistory',
    rows: [
      ['Player 01', 'Intermediate', 'Right hand', 'Overall 82', 'Active'],
      ['Player 02', 'Beginner', 'Right hand', 'Overall 64', 'Inactive'],
      ['Player 03', 'Advanced', 'Left hand', 'Overall 91', 'Inactive'],
    ],
  },
  allData: {
    title: 'All Data Explorer',
    actionLabel: 'Open Combined Graph',
    visualizationId: 'trendCharts',
    rows: [
      ['Shot', '#40 Smash', 'Sweet Spot', 'Power 92', '01:18'],
      ['Shot', '#39 Clear', 'Timing', 'Power 78', '01:16'],
      ['Session', 'May 26', '40 shots', 'Overall 88', '18m 36s'],
      ['Device', 'Core Sensor', 'Connected', 'Battery 100%', 'Seen now'],
      ['Player', 'Player 01', 'Intermediate', 'Overall 82', 'Active'],
      ['Report', 'May Summary', 'Ready', 'CSV/PDF', 'Updated today'],
    ],
  },
}

function Sidebar({ activePage, onPageChange }) {
  return (
    <aside className="sidebar">
      <img className="logo" src={asset('ai-coach-logo.png')} alt="AI Coach logo" />

      <nav className="nav" aria-label="Dashboard navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button className={activePage === id ? 'active' : ''} type="button" onClick={() => onPageChange(id)} key={id}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
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

function Header({ activePage, selectedPlayer, playerOptions, isPlayerMenuOpen, onTogglePlayerMenu, onSelectPlayer }) {
  const pageTitle = navItems.find((item) => item.id === activePage)?.label || 'Overview'

  return (
    <header className="header">
      <div>
        <p>Live Training Session</p>
        <h1>{pageTitle === 'Overview' ? 'Badminton AI Coach' : pageTitle}</h1>
        <span>{pageTitle === 'Overview' ? 'Choose a category to inspect the training data.' : 'Mock-up layout for this section of the dashboard.'}</span>
      </div>
      <div className="headerStatus">
        <div className="connectPill">
          <BluetoothConnected size={24} />
          <span>Bluetooth 5.2</span>
          <b>Connected</b>
        </div>
        <div className="playerSwitcher">
          <button className="playerPill" type="button" onClick={onTogglePlayerMenu} aria-expanded={isPlayerMenuOpen}>
            <div>{selectedPlayer.number}</div>
            <span>{selectedPlayer.name}</span>
            <b>{selectedPlayer.level}</b>
          </button>
          {isPlayerMenuOpen && (
            <div className="playerMenu">
              {playerOptions.map((player) => (
                <button
                  className={player.id === selectedPlayer.id ? 'active' : ''}
                  type="button"
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                >
                  <strong>{player.name}</strong>
                  <span>{player.level} · {player.hand} hand · {player.baseline}/100</span>
                </button>
              ))}
            </div>
          )}
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

function ScoreOverview({ items = scores }) {
  return (
    <div className="scoreGrid">
      {items.map((item) => {
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

function FormAnalysisDetail({ stats = formStats }) {
  return (
    <div className="formAnalysisDetail">
      <div className="donut" aria-label="Form analysis pie chart">
        <div>
          <b>{stats.at(-1)?.[2] || 0}</b>
          <span>Total Shots</span>
        </div>
      </div>
      <div className="formStatList">
        {stats.map(([label, note, value, tone]) => (
          <div className={`formStat ${tone}`} key={label}>
            <span>
              {label}
              {note && <small>{note}</small>}
            </span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoachAdvice({ advice = playerDatasets.player1.advice }) {
  return (
    <div className="adviceDetail">
      <div className="advicePrimary">
        <Sparkles size={24} />
        <div>
          <b>{advice.title}</b>
          <p>{advice.body}</p>
        </div>
      </div>
      <ul className="cleanList">
        {advice.steps.map((step, index) => (
          <li key={step}><span>{index + 1}</span>{step}</li>
        ))}
      </ul>
    </div>
  )
}

function SessionDetail({ items = summaryItems }) {
  return (
    <div className="sessionSummaryDetail">
      <div className="summaryGrid">
        {items.map(([label, value, note, Icon]) => (
          <div key={label}>
            <Icon size={22} />
            <span>{label}</span>
            <b>{value}</b>
            {note && <small>{note}</small>}
          </div>
        ))}
      </div>
      <button className="reportButton" type="button">ดูรายงานฉบับเต็ม</button>
    </div>
  )
}

function RecentShotsDetail({ shots = recentShots }) {
  return (
    <div className="shotList">
      {shots.map(([id, shot, result, power, time, tone]) => (
        <div className="shotRow" key={id}>
          <span>{id}</span>
          <b>{shot}</b>
          <em className={tone}>{result}</em>
          <small>Power {power}</small>
          <time>{time}</time>
        </div>
      ))}
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

function getCategories(data) {
  return [
  {
    id: 'scores',
    kicker: 'Overview',
    title: 'Training Scores',
    description: 'Power, timing, sweet spot, and injury risk.',
    icon: Gauge,
    content: <ScoreOverview items={data.scores} />,
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
    id: 'form-analysis',
    kicker: 'Shots',
    title: 'Form Analysis',
    description: 'Elbow errors, correct shots, and total shot count.',
    icon: Radar,
    content: <FormAnalysisDetail stats={data.formStats} />,
  },
  {
    id: 'coach',
    kicker: 'Coach',
    title: 'Next Action',
    description: 'Recommended correction for the next drill.',
    icon: Sparkles,
    content: <CoachAdvice advice={data.advice} />,
  },
  {
    id: 'session',
    kicker: 'Session',
    title: 'Session Summary',
    description: 'Total shots, best shot, calories, power, and consistency.',
    icon: ChartNoAxesCombined,
    content: <SessionDetail items={data.summaryItems} />,
  },
  {
    id: 'recent-shots',
    kicker: 'Latest',
    title: 'Recent Shots',
    description: 'Latest attempts with power, timing, and impact result.',
    icon: Clock3,
    content: <RecentShotsDetail shots={data.recentShots} />,
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
}

const pageMockups = {
  training: {
    kicker: 'Training Control',
    title: 'Live Session Workspace',
    description: 'A focused control surface for starting drills, tracking live progress, and reviewing the last shot.',
    primary: [
      ['Session Timer', '00:18:36', 'Live training duration'],
      ['Current Drill', 'Smash Accuracy', 'Sweet spot focus'],
      ['Shot Count', '40', 'Target 60 shots'],
    ],
    sections: [
      {
        title: 'Drill Presets',
        items: ['Smash accuracy', 'Timing correction', 'Drop / Drive variation', 'Footwork recovery'],
      },
      {
        title: 'Live Feedback',
        items: ['Last shot: Smash #40', 'Impact: Sweet Spot', 'Timing needs earlier contact', 'Elbow angle: 122°'],
      },
      {
        title: 'Controls',
        items: ['Start / Pause session', 'End and save report', 'Mark shot manually', 'Sync sensors'],
      },
    ],
  },
  'shot-analysis': {
    kicker: 'Shot Inspector',
    title: 'Shot-by-shot Review',
    description: 'A workspace for choosing one shot and inspecting form, impact, timing, and sensor evidence.',
    primary: [
      ['Selected Shot', '#40 Smash', 'Latest shot'],
      ['Impact Score', '98/100', 'Strong sweet spot'],
      ['Elbow Angle', '122°', 'Needs correction'],
    ],
    sections: [
      {
        title: 'Shot List',
        items: ['#40 Smash - Sweet Spot', '#39 Clear - Timing', '#38 Drop - Timing', '#37 Smash - Sweet Spot'],
      },
      {
        title: 'Analysis Panels',
        items: ['Elbow form analysis', 'Sweet spot impact dot', 'Power and timing score', 'Gyro speed summary'],
      },
      {
        title: 'Evidence',
        items: ['Video frame preview', 'Pose confidence', 'Racket face confidence', 'Raw sensor link'],
      },
    ],
    records: recordLists.shots,
  },
  reports: {
    kicker: 'Reports',
    title: 'Session History and Trends',
    description: 'A reporting area for comparing sessions, viewing progress, and exporting summaries.',
    primary: [
      ['Sessions', '12', 'This month'],
      ['Best Score', '91', 'April 24'],
      ['Trend', '+8%', 'Sweet spot improvement'],
    ],
    sections: [
      {
        title: 'Session History',
        items: ['Date and duration', 'Total shots', 'Overall score', 'Best shot'],
      },
      {
        title: 'Trend Charts',
        items: ['Power trend', 'Timing trend', 'Sweet spot trend', 'Injury risk trend'],
      },
      {
        title: 'Export',
        items: ['PDF report', 'CSV shot data', 'Coach summary', 'Share link'],
      },
    ],
    records: recordLists.sessions,
  },
  'data-explorer': {
    kicker: 'All Data',
    title: 'Global Data Explorer',
    description: 'A combined list for shots, sessions, devices, players, and reports. Use this when you need one exportable data view.',
    primary: [
      ['Records', '24', 'Across all data types'],
      ['Filters', '5', 'Type, date, player, status, score'],
      ['Export', 'CSV', 'Current filtered view'],
    ],
    sections: [
      {
        title: 'Filters',
        items: ['Type: All', 'Date range: This month', 'Player: Player 01', 'Status: Any'],
      },
      {
        title: 'Interactive Views',
        items: ['Shot List', 'Session History', 'Trend Charts', 'Health Checks'],
      },
      {
        title: 'Exports',
        items: ['Export visible rows', 'Export shot data', 'Export session report', 'Export sensor status'],
      },
    ],
    records: recordLists.allData,
  },
  sensors: {
    kicker: 'Sensors',
    title: 'Device Health and Calibration',
    description: 'A hardware management view for connection status, battery, signal, and calibration.',
    primary: [
      ['Connected', '4/4', 'All sensors online'],
      ['Battery', '100%', 'Average level'],
      ['Signal', 'Good', 'Bluetooth 5.2'],
    ],
    sections: [
      {
        title: 'Device Cards',
        items: ['Core Sensor', 'Wrist Band', 'AI Coach Hub', 'Sensor Pod'],
      },
      {
        title: 'Health Checks',
        items: ['Battery percent', 'Last seen time', 'Signal strength', 'Firmware version'],
      },
      {
        title: 'Calibration',
        items: ['Start calibration', 'Reset device', 'Test vibration', 'Reconnect device'],
      },
    ],
    records: recordLists.devices,
  },
  players: {
    kicker: 'Players',
    title: 'Player Profiles',
    description: 'A profile management page for separating session history and calibration per player.',
    primary: [
      ['Current Player', 'Player 01', 'Intermediate'],
      ['Dominant Hand', 'Right', 'Profile setting'],
      ['Baseline', '82/100', 'Current average'],
    ],
    sections: [
      {
        title: 'Profile',
        items: ['Name and level', 'Dominant hand', 'Height / reach', 'Training goal'],
      },
      {
        title: 'History',
        items: ['Recent sessions', 'Best shot type', 'Improvement areas', 'Risk notes'],
      },
      {
        title: 'Management',
        items: ['Add player', 'Switch player', 'Edit profile', 'Archive player'],
      },
    ],
    records: recordLists.players,
  },
  settings: {
    kicker: 'Settings',
    title: 'Scoring and System Settings',
    description: 'Configuration for scoring weights, form thresholds, data source, and display preferences.',
    primary: [
      ['Elbow Range', '85°-105°', 'Recommended'],
      ['Data Source', 'Mock API', 'Development mode'],
      ['Units', 'Metric', 'km/h, m/s²'],
    ],
    sections: [
      {
        title: 'Scoring',
        items: ['Power weight', 'Timing weight', 'Sweet spot weight', 'Consistency weight'],
      },
      {
        title: 'Form Rules',
        items: ['Elbow min angle', 'Elbow max angle', 'Injury risk threshold', 'Confidence threshold'],
      },
      {
        title: 'Display',
        items: ['Language', 'Unit system', 'Theme', 'Compact mode'],
      },
    ],
  },
}

function getShotScore(shots, index = 0) {
  return Number(shots[index]?.[3] || 0)
}

function createVisualizationSets(player, data) {
  const shotRows = data.recentShots.map(([id, shot, result, power]) => ({
    label: `#${id} ${shot}`,
    value: Number(power),
    secondary: result,
  }))
  const totalShots = data.summaryItems.find(([label]) => label === 'Total Shots')?.[1] || '0'
  const consistency = Number(String(data.summaryItems.find(([label]) => label === 'Consistency')?.[1] || '0').replace('%', ''))
  const powerScore = data.scores.find((item) => item.label === 'Power')?.value || 0
  const timingScore = data.scores.find((item) => item.label === 'Timing')?.value || 0
  const sweetSpotScore = data.scores.find((item) => item.label === 'Sweet Spot')?.value || 0

  return {
    ...visualizationSets,
    shotList: {
      title: `${player.name} Shot List Visualization`,
      description: 'Recent shot quality by score and result label.',
      fileName: `${player.id}-shot-list.csv`,
      rows: shotRows,
    },
    sessionHistory: {
      title: `${player.name} Session History Visualization`,
      description: 'Overall training score across recent sessions.',
      fileName: `${player.id}-session-history.csv`,
      rows: [
        { label: 'May 01', value: Math.max(player.baseline - 12, 35), secondary: `${Math.max(Number(totalShots) - 18, 18)} shots` },
        { label: 'May 08', value: Math.max(player.baseline - 8, 40), secondary: `${Math.max(Number(totalShots) - 12, 20)} shots` },
        { label: 'May 15', value: Math.max(player.baseline - 5, 45), secondary: `${Math.max(Number(totalShots) - 6, 24)} shots` },
        { label: 'May 22', value: Math.max(player.baseline - 2, 48), secondary: `${Math.max(Number(totalShots) - 2, 26)} shots` },
        { label: data.bestDate, value: player.baseline, secondary: `${totalShots} shots` },
      ],
    },
    trendCharts: {
      title: `${player.name} Training Trend Visualization`,
      description: 'Power, timing, sweet spot, and consistency score trend.',
      fileName: `${player.id}-training-trends.csv`,
      rows: [
        { label: 'Power', value: Number(powerScore), secondary: data.scores[0]?.note || '' },
        { label: 'Timing', value: Number(timingScore), secondary: data.scores[1]?.note || '' },
        { label: 'Sweet Spot', value: Number(sweetSpotScore), secondary: data.scores[2]?.note || '' },
        { label: 'Consistency', value: consistency, secondary: 'Session stability' },
      ],
    },
    liveFeedback: {
      title: `${player.name} Live Feedback Visualization`,
      description: 'Latest feedback signals from the current training session.',
      fileName: `${player.id}-live-feedback.csv`,
      rows: [
        { label: 'Impact', value: Number(sweetSpotScore), secondary: data.recentShots[0]?.[2] || 'Good' },
        { label: 'Timing', value: Number(timingScore), secondary: data.scores[1]?.note || '' },
        { label: 'Power', value: getShotScore(data.recentShots), secondary: data.recentShots[0]?.[1] || 'Shot' },
        { label: 'Elbow Form', value: Math.max(100 - Number(data.formStats[0]?.[2] || 0) * 4, 35), secondary: data.formStats[0]?.[2] || '0' },
      ],
    },
    playerHistory: {
      title: `${player.name} Player History Visualization`,
      description: 'Baseline progress for the selected player.',
      fileName: `${player.id}-player-history.csv`,
      rows: [
        { label: 'Baseline', value: Math.max(player.baseline - 14, 35), secondary: 'First session' },
        { label: 'Week 1', value: Math.max(player.baseline - 9, 40), secondary: 'Foundation' },
        { label: 'Week 2', value: Math.max(player.baseline - 4, 45), secondary: data.drill },
        { label: 'Current', value: player.baseline, secondary: player.level },
      ],
    },
  }
}

function createRecordLists(player, data) {
  const totalShots = data.summaryItems.find(([label]) => label === 'Total Shots')?.[1] || '0'
  const bestShot = data.summaryItems.find(([label]) => label === 'Best Shot')
  const sessionRows = [
    [data.bestDate, `${totalShots} shots`, `Overall ${player.baseline}`, bestShot?.[1] || 'Best shot', data.timer],
    ['May 22', `${Math.max(Number(totalShots) - 2, 20)} shots`, `Overall ${Math.max(player.baseline - 2, 40)}`, data.drill, '17m 12s'],
    ['May 15', `${Math.max(Number(totalShots) - 6, 18)} shots`, `Overall ${Math.max(player.baseline - 5, 38)}`, 'Technique focus', '20m 02s'],
    ['May 08', `${Math.max(Number(totalShots) - 12, 16)} shots`, `Overall ${Math.max(player.baseline - 8, 35)}`, 'Form focus', '16m 44s'],
    ['May 01', `${Math.max(Number(totalShots) - 18, 14)} shots`, `Overall ${Math.max(player.baseline - 12, 30)}`, 'Baseline', '15m 28s'],
  ]
  const playerRows = players.map((item) => [
    item.name,
    item.level,
    `${item.hand} hand`,
    `Overall ${item.id === player.id ? player.baseline : item.baseline}`,
    item.id === player.id ? 'Active' : 'Inactive',
  ])
  const shotRows = data.recentShots.map(([id, shot, result, power, time]) => [`#${id}`, shot, result, `Power ${power}`, time])

  return {
    ...recordLists,
    shots: { ...recordLists.shots, rows: shotRows },
    sessions: { ...recordLists.sessions, rows: sessionRows },
    players: { ...recordLists.players, rows: playerRows },
    allData: {
      ...recordLists.allData,
      rows: [
        ...shotRows.slice(0, 2).map((row) => ['Shot', row[0], row[1], row[3], row[4]]),
        ['Session', data.bestDate, `${totalShots} shots`, `Overall ${player.baseline}`, data.timer],
        ['Device', 'Core Sensor', 'Connected', 'Battery 100%', 'Seen now'],
        ['Player', player.name, player.level, `Overall ${player.baseline}`, 'Active'],
        ['Report', `${player.name} Summary`, 'Ready', 'CSV/PDF', 'Updated today'],
      ],
    },
  }
}

function createPageMockups(player, data) {
  const lists = createRecordLists(player, data)
  const totalShots = data.summaryItems.find(([label]) => label === 'Total Shots')?.[1] || '0'
  const bestShot = data.summaryItems.find(([label]) => label === 'Best Shot')?.[1] || 'Best shot'
  const latestShot = data.recentShots[0] || ['0', 'Shot', 'Good', '0', '00:00']

  return {
    ...pageMockups,
    training: {
      ...pageMockups.training,
      primary: [
        ['Session Timer', data.timer, `${player.name} live duration`],
        ['Current Drill', data.drill, `${player.level} focus`],
        ['Shot Count', totalShots, `Target ${data.targetShots} shots`],
      ],
      sections: [
        pageMockups.training.sections[0],
        {
          title: 'Live Feedback',
          items: [`Last shot: ${latestShot[1]} #${latestShot[0]}`, `Impact: ${latestShot[2]}`, data.scores[1]?.note || 'Timing stable', `Current player: ${player.name}`],
        },
        pageMockups.training.sections[2],
      ],
    },
    'shot-analysis': {
      ...pageMockups['shot-analysis'],
      primary: [
        ['Selected Shot', `#${latestShot[0]} ${latestShot[1]}`, 'Latest shot'],
        ['Impact Score', `${getShotScore(data.recentShots)}/100`, latestShot[2]],
        ['Player', player.name, `${player.level} profile`],
      ],
      sections: [
        {
          title: 'Shot List',
          items: data.recentShots.map(([id, shot, result]) => `#${id} ${shot} - ${result}`),
        },
        ...pageMockups['shot-analysis'].sections.slice(1),
      ],
      records: lists.shots,
    },
    reports: {
      ...pageMockups.reports,
      primary: [
        ['Sessions', '12', `${player.name} history`],
        ['Best Score', String(player.baseline), bestShot],
        ['Trend', player.baseline >= 85 ? '+12%' : '+6%', `${data.drill} improvement`],
      ],
      records: lists.sessions,
    },
    'data-explorer': {
      ...pageMockups['data-explorer'],
      sections: [
        {
          title: 'Filters',
          items: ['Type: All', 'Date range: This month', `Player: ${player.name}`, 'Status: Any'],
        },
        ...pageMockups['data-explorer'].sections.slice(1),
      ],
      records: lists.allData,
    },
    players: {
      ...pageMockups.players,
      primary: [
        ['Current Player', player.name, player.level],
        ['Dominant Hand', player.hand, 'Profile setting'],
        ['Baseline', `${player.baseline}/100`, 'Current average'],
      ],
      records: lists.players,
    },
    sensors: {
      ...pageMockups.sensors,
      records: lists.devices,
    },
  }
}

function OverviewPage({ categories, onCategoryClick }) {
  return (
    <section className="categoryGrid" aria-label="Dashboard categories">
      {categories.map((item) => (
        <CategoryCard item={item} key={item.id} onClick={() => onCategoryClick(item.id)} />
      ))}
    </section>
  )
}

function getVisualizationId(sectionTitle, item) {
  const text = `${sectionTitle} ${item}`.toLowerCase()
  if (text.includes('shot list') || text.includes('#40') || text.includes('selected shot')) return 'shotList'
  if (text.includes('session history') || text.includes('date and duration')) return 'sessionHistory'
  if (text.includes('trend') || text.includes('power trend') || text.includes('timing trend')) return 'trendCharts'
  if (text.includes('health') || text.includes('battery') || text.includes('signal') || text.includes('last seen')) return 'deviceHealth'
  if (text.includes('live feedback') || text.includes('last shot') || text.includes('impact')) return 'liveFeedback'
  if (text.includes('history') || text.includes('recent sessions') || text.includes('baseline')) return 'playerHistory'
  return null
}

function MockupPage({ page, onVisualizationOpen }) {
  return (
    <section className="mockupPage">
      <div className="mockupHero">
        <span>{page.kicker}</span>
        <h2>{page.title}</h2>
        <p>{page.description}</p>
      </div>

      <div className="mockupStats">
        {page.primary.map(([label, value, note]) => (
          <article key={label}>
            <span>{label}</span>
            <b>{value}</b>
            <p>{note}</p>
          </article>
        ))}
      </div>

      <div className="mockupSections">
        {page.sections.map((section) => (
          <article key={section.title}>
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item) => {
                const visualizationId = getVisualizationId(section.title, item)

                return (
                  <li key={item}>
                    {visualizationId ? (
                      <button type="button" onClick={() => onVisualizationOpen(visualizationId)}>
                        {item}
                        <span>Open graph</span>
                      </button>
                    ) : (
                      item
                    )}
                  </li>
                )
              })}
            </ul>
          </article>
        ))}
      </div>

      {page.records && (
        <RecordList data={page.records} onVisualizationOpen={onVisualizationOpen} />
      )}
    </section>
  )
}

function exportRecordListAsCsv(data) {
  const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`
  const maxColumns = Math.max(...data.rows.map((row) => row.length))
  const headers = Array.from({ length: maxColumns }, (_, index) => `column_${index + 1}`)
  const csv = [
    headers.map(escapeCell).join(','),
    ...data.rows.map((row) => headers.map((_, index) => escapeCell(row[index] || '')).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.title.toLowerCase().replaceAll(' ', '-')}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function RecordList({ data, onVisualizationOpen }) {
  return (
    <section className="recordList">
      <div className="recordListHeader">
        <div>
          <span>Show List</span>
          <h3>{data.title}</h3>
        </div>
        <div className="recordActions">
          <button type="button" onClick={() => onVisualizationOpen(data.visualizationId)}>{data.actionLabel}</button>
          <button type="button" onClick={() => exportRecordListAsCsv(data)}>Export CSV</button>
        </div>
      </div>
      <div className="recordRows">
        {data.rows.map((row) => (
          <button type="button" className="recordRow" onClick={() => onVisualizationOpen(data.visualizationId)} key={row.join('-')}>
            {row.map((cell) => <span key={cell}>{cell}</span>)}
          </button>
        ))}
      </div>
    </section>
  )
}

function exportRowsAsCsv(dataset) {
  const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`
  const csv = [
    ['label', 'value', 'note'].map(escapeCell).join(','),
    ...dataset.rows.map((row) => [row.label, row.value, row.secondary].map(escapeCell).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = dataset.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function VisualizationModal({ dataset, onClose }) {
  if (!dataset) return null

  const maxValue = Math.max(...dataset.rows.map((row) => row.value), 100)
  const points = dataset.rows
    .map((row, index) => {
      const x = 20 + (index * 260) / Math.max(dataset.rows.length - 1, 1)
      const y = 125 - (row.value / maxValue) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="modalOverlay" onClick={onClose} role="presentation">
      <section className="modalPanel graphPanel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="graph-title">
        <button className="closeButton" type="button" onClick={onClose} aria-label="Close visualization">
          <X size={18} />
        </button>
        <div className="modalTitle graphTitle">
          <span>Interactive Visualization</span>
          <h2 id="graph-title">{dataset.title}</h2>
          <p>{dataset.description}</p>
        </div>
        <div className="graphLayout">
          <div className="lineChart" aria-label={`${dataset.title} line chart`}>
            <svg viewBox="0 0 300 140" role="img">
              <polyline points={points} />
              {dataset.rows.map((row, index) => {
                const x = 20 + (index * 260) / Math.max(dataset.rows.length - 1, 1)
                const y = 125 - (row.value / maxValue) * 100
                return <circle key={row.label} cx={x} cy={y} r="4" />
              })}
            </svg>
          </div>
          <div className="barList">
            {dataset.rows.map((row) => (
              <div className="barRow" key={row.label}>
                <div>
                  <b>{row.label}</b>
                  <span>{row.secondary}</span>
                </div>
                <i><span style={{ width: `${Math.min(row.value, 100)}%` }} /></i>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <button className="exportButton" type="button" onClick={() => exportRowsAsCsv(dataset)}>
          Export CSV
        </button>
      </section>
    </div>
  )
}

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
  const [activePage, setActivePage] = useState('overview')
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0].id)
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedVisualizationId, setSelectedVisualizationId] = useState(null)
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) || players[0]
  const currentData = playerDatasets[selectedPlayer.id] || playerDatasets.player1
  const categories = getCategories(currentData)
  const selectedCategory = categories.find((item) => item.id === selectedId)
  const playerVisualizations = createVisualizationSets(selectedPlayer, currentData)
  const selectedVisualization = playerVisualizations[selectedVisualizationId]
  const currentMockups = createPageMockups(selectedPlayer, currentData)
  const currentMockup = currentMockups[activePage]
  const hasOverlay = Boolean(selectedCategory || selectedVisualization)
  const handleSelectPlayer = (playerId) => {
    setSelectedPlayerId(playerId)
    setSelectedId(null)
    setSelectedVisualizationId(null)
    setIsPlayerMenuOpen(false)
  }

  return (
    <div className={`appShell ${hasOverlay ? 'isBlurred' : ''}`}>
      <div className="app">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
        <main className="main">
          <Header
            activePage={activePage}
            selectedPlayer={selectedPlayer}
            playerOptions={players}
            isPlayerMenuOpen={isPlayerMenuOpen}
            onTogglePlayerMenu={() => setIsPlayerMenuOpen((isOpen) => !isOpen)}
            onSelectPlayer={handleSelectPlayer}
          />
          {activePage === 'overview' ? (
            <OverviewPage categories={categories} onCategoryClick={setSelectedId} />
          ) : (
            <MockupPage page={currentMockup} onVisualizationOpen={setSelectedVisualizationId} />
          )}
        </main>
      </div>
      <DetailModal category={selectedCategory} onClose={() => setSelectedId(null)} />
      <VisualizationModal dataset={selectedVisualization} onClose={() => setSelectedVisualizationId(null)} />
    </div>
  )
}

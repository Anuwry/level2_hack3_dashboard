import './dashboard.css'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BatteryFull,
  BluetoothConnected,
  BookOpen,
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
import TrainingFormPage from './TrainingFormPage'

const asset = (name) => `/assets/${name}`

const overviewSystemPrompt = `คุณคือผู้เชี่ยวชาญวิเคราะห์การตีแบดมินตันจากข้อมูลเซนเซอร์ ให้ Feedback สั้น กระชับ เข้าใจง่าย ทั้งภาษาไทยและอังกฤษ

## เกณฑ์การประเมิน

### 1. มุมองศา GYRO
- ✅ ดี: 80°–120° → ฟอร์มสวิงถูกต้อง
- ⚠️ ต่ำกว่า 80°: สวิงสั้นเกินไป ควรเพิ่มช่วงสวิง
- ⚠️ สูงกว่า 120°: สวิงมากเกินไป ควรควบคุมแรง

### 2. จุดกระทบลูก (Hit Spot)
- ✅ Sweet Spot: ลูกออกเร็ว แม่นยำ พลังงานถ่ายโอนสูงสุด ลดการบาดเจ็บ
- 🔶 Off Spot: ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง ต้องใช้แรงเพิ่มขึ้น
- ❌ Frame Hit: ตีโดนขอบไม้ ลูกไม่แม่น มีโอกาสเสียแต้ม ต้องปรับท่าตี

### 3. IMU Acceleration / Avg Intensity
- ✅ สูง (≥100 km/h): ถ่ายโอนพลังงานดีเยี่ยม
- 🔶 ปานกลาง (60–99 km/h): พลังปานกลาง
- ❌ ต่ำ (<60 km/h): ควรเพิ่มพลังการตี

### 4. ความแน่นการจับกริป (Grip Intensity)
- ✅ สูง (≥65%): จับแน่น ควบคุมได้ดี มีพลัง
- 🔶 ปานกลาง (40–64%): อาจเสียการควบคุม
- ❌ ต่ำ (<40%): จับหลวมเกิน ลูกอาจหลุด แรงน้อย

## ตัวอย่าง Feedback (Few-shot Examples)

### ตัวอย่างที่ 1 — ช็อตดีเยี่ยม
Input:
- GYRO: 102° | Hit: Sweet Spot | Shuttlecock: 118 km/h | Grip: 80%

Output:
🏸 ตีได้ สต็อกดี ลูกที่ออกจากไม้แบตมีความเร็วและแม่นยำ
เนื่องจากตีถูกจุด Sweet Spot หากตีถูกท่าอย่างสม่ำเสมอ
จะช่วยลดอัตราการบาดเจ็บได้ดี
[Excellent stroke quality and accuracy from Sweet Spot contact.
Consistent form like this also reduces injury risk.]
คะแนน: 100/100 ✅

### ตัวอย่างที่ 2 — ช็อตแย่ทุกด้าน
Input:
- GYRO: 55° | Hit: Frame Hit | Shuttlecock: 38 km/h | Grip: 28%

Output:
🏸 ตีโดนขอบไม้ สต็อกไม่ดี ลูกที่ออกไม่มีความแม่นยำ
มีโอกาสเสียแต้ม ควรปรับท่าตีและจับกริปให้แน่นขึ้น
[Frame Hit detected. Poor stroke quality — inaccurate shuttlecock,
high chance of losing the point. Adjust swing form and grip pressure.]
คะแนน: 0/100 ❌

### ตัวอย่างที่ 3 — ช็อตปานกลาง
Input:
- GYRO: 95° | Hit: Off Spot | Shuttlecock: 65 km/h | Grip: 70%

Output:
🏸 ตีไม่โดน Sweet Spot ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง
และต้องใช้แรงเพิ่มขึ้น ฟอร์มการสวิงและกริปดี แต่ควรปรับ
จุดกระทบให้ตรง Sweet Spot มากขึ้น
[Off Spot contact — reduced power and accuracy. Swing angle and
grip are good. Focus on hitting the Sweet Spot consistently.]
คะแนน: 50/100 🔶

## รูปแบบการตอบ
1. สรุป Hit Spot และ GYRO ก่อน
2. ระบุ Avg Intensity และ Grip
3. ให้คำแนะนำ 1–2 ประโยค
4. แสดงคะแนน X/100
5. ตอบทั้งภาษาไทยและอังกฤษ`

const overviewPromptText = `คุณคือผู้เชี่ยวชาญวิเคราะห์การตีแบดมินตันจากข้อมูลเซนเซอร์ ให้ Feedback สั้น กระชับ เข้าใจง่าย ทั้งภาษาไทยและอังกฤษ

## เกณฑ์การประเมิน

### 1. มุมองศา GYRO
- ดี: 80°–120° -> ฟอร์มสวิงถูกต้อง
- ต่ำกว่า 80°: สวิงสั้นเกินไป ควรเพิ่มช่วงสวิง
- สูงกว่า 120°: สวิงมากเกินไป ควรควบคุมแรง

### 2. จุดกระทบลูก (Hit Spot)
- Sweet Spot: ลูกออกเร็ว แม่นยำ พลังงานถ่ายโอนสูงสุด ลดการบาดเจ็บ
- Off Spot: ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง ต้องใช้แรงเพิ่มขึ้น
- Frame Hit: ตีโดนขอบไม้ ลูกไม่แม่น มีโอกาสเสียแต้ม ต้องปรับท่าตี

### 3. IMU Acceleration / Avg Intensity
- สูง (>=100 km/h): ถ่ายโอนพลังงานดีเยี่ยม
- ปานกลาง (60-99 km/h): พลังปานกลาง
- ต่ำ (<60 km/h): ควรเพิ่มพลังการตี

### 4. ความแน่นการจับกริป (Grip Intensity)
- สูง (>=65%): จับแน่น ควบคุมได้ดี มีพลัง
- ปานกลาง (40-64%): อาจเสียการควบคุม
- ต่ำ (<40%): จับหลวมเกิน ลูกอาจหลุด แรงน้อย

## ตัวอย่าง Feedback (Few-shot Examples)

### ตัวอย่างที่ 1 - ช็อตดีเยี่ยม
Input:
- GYRO: 102° | Hit: Sweet Spot | Shuttlecock: 118 km/h | Grip: 80%

Output:
ตีได้สโตรกดี ลูกที่ออกจากไม้แบตมีความเร็วและแม่นยำ
เนื่องจากตีถูกจุด Sweet Spot หากตีถูกท่าอย่างสม่ำเสมอ
จะช่วยลดอัตราการบาดเจ็บได้ดี
[Excellent stroke quality and accuracy from Sweet Spot contact.
Consistent form like this also reduces injury risk.]
คะแนน: 100/100

### ตัวอย่างที่ 2 - ช็อตแย่ทุกด้าน
Input:
- GYRO: 55° | Hit: Frame Hit | Shuttlecock: 38 km/h | Grip: 28%

Output:
ตีโดนขอบไม้ สโตรกไม่ดี ลูกที่ออกไม่มีความแม่นยำ
มีโอกาสเสียแต้ม ควรปรับท่าตีและจับกริปให้แน่นขึ้น
[Frame Hit detected. Poor stroke quality - inaccurate shuttlecock,
high chance of losing the point. Adjust swing form and grip pressure.]
คะแนน: 0/100

### ตัวอย่างที่ 3 - ช็อตปานกลาง
Input:
- GYRO: 95° | Hit: Off Spot | Shuttlecock: 65 km/h | Grip: 70%

Output:
ตีไม่โดน Sweet Spot ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง
และต้องใช้แรงเพิ่มขึ้น ฟอร์มการสวิงและกริปดี แต่ควรปรับ
จุดกระทบให้ตรง Sweet Spot มากขึ้น
[Off Spot contact - reduced power and accuracy. Swing angle and
grip are good. Focus on hitting the Sweet Spot consistently.]
คะแนน: 50/100

## รูปแบบการตอบ
1. สรุป Hit Spot และ GYRO ก่อน
2. ระบุ Avg Intensity และ Grip
3. ให้คำแนะนำ 1-2 ประโยค
4. แสดงคะแนน X/100
5. ตอบทั้งภาษาไทยและอังกฤษ`

const GEMINI_FLASH_MODEL = 'gemini-2.5-flash'
const HIDDEN_OVERVIEW_CATEGORIES = new Set(['hardware', 'actions', 'coach'])
const RECEIVER_SESSION_URL = '/data/real_sessions/session_001/stream_events.jsonl'
const RECEIVER_SWING_WINDOW_ROWS = 130
const NA = 'n/a'

const navItems = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'shot-analysis', label: 'Shot Analysis', icon: Radar },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined },
  { id: 'data-explorer', label: 'Data Explorer', icon: Gauge },
  { id: 'sensors', label: 'Sensors', icon: Activity },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'pose-pipeline', label: 'Pose Pipeline', icon: Video },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const devices = [
  ['Arduino Q arm IMU receiver', 'ai-coach-hub.png'],
  ['Nano racket IMU stream', 'core-sensor.png'],
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
  ['39', 'Clear', 'Frame Hit', '78', '01:16', 'orange'],
  ['38', 'Drop', 'Frame Hit', '65', '01:14', 'orange'],
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
      ['32', 'Clear', 'Frame Hit', '62', '01:05', 'orange'],
      ['31', 'Drop', 'Sweet Spot', '68', '01:03', 'green'],
      ['30', 'Clear', 'Frame Hit', '56', '01:00', 'orange'],
      ['29', 'Drive', 'Frame Hit', '59', '00:58', 'orange'],
    ],
    advice: {
      title: 'Keep the swing compact before adding power.',
      body: 'Timing and sweet spot are still developing. Use shorter reps and keep the racket face stable through contact.',
      steps: ['Run 10 slow clear shots before full intensity.', 'Pause after contact and check racket face direction.', 'Use a lower intensity target until timing reaches 70/100.'],
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
      ['55', 'Drive', 'Frame Hit', '84', '01:40', 'orange'],
      ['54', 'Smash', 'Sweet Spot', '99', '01:38', 'green'],
      ['53', 'Drop', 'Sweet Spot', '79', '01:35', 'green'],
    ],
    advice: {
      title: 'Reduce overload during long smash blocks.',
      body: 'Performance is strong, but repeated high-power shots can raise elbow load. Mix recovery shots into attack drills.',
      steps: ['Alternate 3 smashes with 2 recovery clears.', 'Stop the set if elbow angle opens beyond 115°.', 'Track fatigue after every 15 shots.'],
    },
  },
}

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)))
const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}
const vectorMagnitude = (...values) => Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0))
const formatDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return NA

  const totalSeconds = Math.round(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
const formatPercentValue = (value) => {
  if (value === NA || value === undefined || value === null || value === '') return NA
  const text = String(value)
  return text.includes('%') ? text : `${text}%`
}

const realCategoryLabel = (category = '') => category
  .split('_')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

const countRealCategories = (rows) => rows.reduce((counts, row) => {
  counts[row.category] = (counts[row.category] || 0) + 1
  return counts
}, {})

function parseReceiverJsonl(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

function receiverEventDedupeKey(event) {
  const row = event.row || {}
  const context = event.merged_context || {}
  const sessionId = event.session_id || 'session'
  const eventType = event.type || 'unknown'

  if (eventType === 'hit_event') {
    if (row.hit_id) {
      return [eventType, sessionId, row.hit_id].join('|')
    }

    return [
      eventType,
      sessionId,
      row.nano_timestamp_ms,
      row.final_class,
    ].filter((value) => value !== undefined && value !== null && value !== '').join('|')
  }

  if (eventType === 'gyro_sample') {
    return [
      eventType,
      sessionId,
      row.seq,
      row.nano_timestamp_us,
      row.q_timestamp_ns,
    ].filter((value) => value !== undefined && value !== null && value !== '').join('|')
  }

  if (eventType === 'session_status') {
    return [
      eventType,
      sessionId,
      event.status,
      JSON.stringify(event.paths || {}),
    ].filter((value) => value !== undefined && value !== null && value !== '').join('|')
  }

  return JSON.stringify({
    type: eventType,
    session_id: sessionId,
    row,
    merged_context: context,
    status: event.status,
  })
}

function dedupeReceiverEvents(events) {
  const uniqueEvents = new Map()

  events.forEach((event) => {
    const key = receiverEventDedupeKey(event)
    if (!key) return
    uniqueEvents.set(key, event)
  })

  return Array.from(uniqueEvents.values())
}

function normalizeImpactCategory(value = '') {
  const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (normalized.includes('off') && normalized.includes('sweet')) return 'off_sweet_spot'
  if (normalized.includes('sweet')) return 'sweet_spot'
  if (normalized.includes('frame')) return 'frame_hit'
  return normalized || 'unknown'
}

function receiverEventCategory(event) {
  const row = event.row || {}
  return normalizeImpactCategory(
    row.final_class
      || row.contact_class
      || row.sweet_spot_class
      || row.impact
      || row.label
      || event.final_class
      || event.contact_class
      || event.label,
  )
}

function receiverSampleMetrics(event) {
  const row = event.row || {}
  const gx = toFiniteNumber(row.nano_gx_dps ?? row.gx_dps)
  const gy = toFiniteNumber(row.nano_gy_dps ?? row.gy_dps)
  const gz = toFiniteNumber(row.nano_gz_dps ?? row.gz_dps)
  const ax = toFiniteNumber(row.nano_ax_g ?? row.ax_g)
  const ay = toFiniteNumber(row.nano_ay_g ?? row.ay_g)
  const az = toFiniteNumber(row.nano_az_g ?? row.az_g)
  const gyroMagnitude = vectorMagnitude(gx, gy, gz)
  const accelMagnitude = vectorMagnitude(ax, ay, az)
  const timestampUs = toFiniteNumber(row.nano_timestamp_us)

  return {
    row,
    gx,
    gy,
    gz,
    accelMagnitude,
    gyroMagnitude,
    timestampUs,
    intensity: clampScore((gyroMagnitude / 610) * 100),
  }
}

function receiverArmSampleMetrics(event) {
  const row = event.row || {}
  const gx = toFiniteNumber(row.q_gx_dps)
  const gy = toFiniteNumber(row.q_gy_dps)
  const gz = toFiniteNumber(row.q_gz_dps)
  const ax = toFiniteNumber(row.q_ax_g)
  const ay = toFiniteNumber(row.q_ay_g)
  const az = toFiniteNumber(row.q_az_g)
  const gyroMagnitude = vectorMagnitude(gx, gy, gz)
  const accelMagnitude = vectorMagnitude(ax, ay, az)
  const tiltAngle = Math.round(Math.atan2(Math.sqrt(ax ** 2 + az ** 2), Math.max(Math.abs(ay), 0.001)) * 180 / Math.PI)

  return {
    gx,
    gy,
    gz,
    ax,
    ay,
    az,
    gyroMagnitude,
    accelMagnitude,
    tiltAngle,
  }
}

function createReceiverArmRows(events) {
  const gyroSamples = []
  const armRows = []

  events.forEach((event) => {
    if (event.type === 'gyro_sample') {
      gyroSamples.push(event)
      return
    }

    if (event.type !== 'hit_event') return

    const hitRow = event.row || {}
    const category = receiverEventCategory(event)
    const windowEvents = gyroSamples.slice(-RECEIVER_SWING_WINDOW_ROWS)
    if (!windowEvents.length) return

    const samples = windowEvents.map(receiverArmSampleMetrics)
    const latest = samples[samples.length - 1]
    const avgArmGyro = samples.reduce((total, sample) => total + sample.gyroMagnitude, 0) / samples.length
    const peakArmGyro = Math.max(...samples.map((sample) => sample.gyroMagnitude))
    const avgAccel = samples.reduce((total, sample) => total + sample.accelMagnitude, 0) / samples.length
    const avgAngle = Math.round(samples.reduce((total, sample) => total + sample.tiltAngle, 0) / samples.length)

    armRows.push({
      id: `arm-hit-${hitRow.hit_id || hitRow.seq || armRows.length + 1}`,
      hitId: hitRow.hit_id || hitRow.seq || armRows.length + 1,
      shotNo: String(hitRow.shot_no || hitRow.shotNo || hitRow.hit_id || armRows.length + 1),
      category,
      samples: samples.length,
      angle: `${avgAngle} deg`,
      currentAngle: `${latest.tiltAngle} deg`,
      gyro: `${Math.round(avgArmGyro)} dps`,
      peakGyro: `${Math.round(peakArmGyro)} dps`,
      accel: `${avgAccel.toFixed(2)}g`,
      tone: category === 'sweet_spot' ? 'green' : category === 'frame_hit' ? 'red' : 'cyan',
    })
  })

  return armRows
}

function createReceiverArmStats(events) {
  const rows = createReceiverArmRows(events)

  if (!rows.length) {
    return {
      hasArmData: false,
      currentAngle: NA,
      targetRange: '80-120 deg',
      avgArmGyro: NA,
      peakArmGyro: NA,
      rows: [],
      note: 'No Q arm IMU rows available.',
    }
  }

  const latest = rows[rows.length - 1]
  const avgArmGyro = rows.reduce((total, row) => total + toFiniteNumber(String(row.gyro).replace(' dps', '')), 0) / rows.length
  const peakArmGyro = Math.max(...rows.map((row) => toFiniteNumber(String(row.peakGyro).replace(' dps', ''))))

  return {
    hasArmData: true,
    currentAngle: latest.angle,
    targetRange: '80-120 deg',
    avgArmGyro: `${Math.round(avgArmGyro)} dps`,
    peakArmGyro: `${Math.round(peakArmGyro)} dps`,
    rows: rows.slice().reverse(),
    note: `Q arm IMU, same ${RECEIVER_SWING_WINDOW_ROWS}-row hit windows as Sweet Spot.`,
  }
}

function createReceiverSessionTiming(events) {
  const timestamps = events
    .filter((event) => event.type === 'gyro_sample')
    .map((event) => toFiniteNumber(event.row?.nano_timestamp_us))
    .filter((timestamp) => timestamp > 0)

  if (timestamps.length >= 2) {
    const start = Math.min(...timestamps)
    const end = Math.max(...timestamps)
    return {
      durationMs: (end - start) / 1000,
      display: formatDuration((end - start) / 1000),
      note: 'from first log timestamp to last log timestamp',
    }
  }

  const receiveTimes = events
    .map((event) => Date.parse(event.pc_receive_time || event.timestamp || ''))
    .filter(Number.isFinite)

  if (receiveTimes.length >= 2) {
    const start = Math.min(...receiveTimes)
    const end = Math.max(...receiveTimes)
    return {
      durationMs: end - start,
      display: formatDuration(end - start),
      note: 'from first receive time to last receive time',
    }
  }

  return {
    durationMs: 0,
    display: NA,
    note: 'not enough timestamps',
  }
}

function createReceiverSwingRows(events) {
  const gyroSamples = []
  const swingRows = []

  events.forEach((event) => {
    if (event.type === 'gyro_sample') {
      gyroSamples.push(event)
      return
    }

    if (event.type !== 'hit_event') return

    const hitRow = event.row || {}
    const category = receiverEventCategory(event)
    const windowEvents = gyroSamples.slice(-RECEIVER_SWING_WINDOW_ROWS)
    if (!windowEvents.length) return

    const samples = windowEvents.map(receiverSampleMetrics)
    const firstTimestamp = samples.find((sample) => sample.timestampUs)?.timestampUs || 0
    const lastTimestamp = [...samples].reverse().find((sample) => sample.timestampUs)?.timestampUs || 0
    const durationMs = firstTimestamp && lastTimestamp && lastTimestamp >= firstTimestamp
      ? Math.round((lastTimestamp - firstTimestamp) / 1000)
      : 0
    const avgGyro = samples.reduce((total, sample) => total + sample.gyroMagnitude, 0) / samples.length
    const avgAccel = samples.reduce((total, sample) => total + sample.accelMagnitude, 0) / samples.length
    const peakSample = samples.reduce((peak, sample) => (
      sample.gyroMagnitude > peak.gyroMagnitude ? sample : peak
    ), samples[0])
    const peakAccel = samples.reduce((peak, sample) => Math.max(peak, sample.accelMagnitude), 0)
    const intensity = clampScore((avgGyro / 610) * 100)
    const level = intensity >= 75 ? 'High' : intensity >= 35 ? 'Medium' : 'Low'

    swingRows.push({
      id: `receiver-hit-${hitRow.hit_id || hitRow.seq || swingRows.length + 1}`,
      hitId: hitRow.hit_id || hitRow.seq || swingRows.length + 1,
      category,
      shotNo: String(hitRow.shot_no || hitRow.shotNo || hitRow.hit_id || swingRows.length + 1),
      file: `Nano racket IMU: ${RECEIVER_SWING_WINDOW_ROWS} rows before hit`,
      durationMs,
      samples: samples.length,
      peakGyro: Math.round(peakSample.gyroMagnitude),
      peakAccel: Number(peakAccel.toFixed(2)),
      avgAccel: Number(avgAccel.toFixed(2)),
      intensity,
      level,
      tone: category === 'sweet_spot' ? 'green' : category === 'frame_hit' ? 'red' : intensity >= 35 ? 'cyan' : 'orange',
      impactMs: durationMs,
      series: samples.map((sample, index) => {
        const time = sample.timestampUs && firstTimestamp ? Math.round((sample.timestampUs - firstTimestamp) / 1000) : index
        return [time, sample.intensity]
      }),
      replay: samples.map((sample, index) => {
        const time = sample.timestampUs && firstTimestamp ? Math.round((sample.timestampUs - firstTimestamp) / 1000) : index
        return [time, sample.gx, sample.gy, sample.gz, sample.accelMagnitude, sample.gyroMagnitude, sample.intensity]
      }),
    })
  })

  return swingRows
}

function createEmptyReceiverDataset(statusMessage = 'No receiver data file found yet.') {
  return {
    timer: NA,
    drill: 'Receiver stream',
    targetShots: NA,
    bestDate: NA,
    hasRealData: false,
    dataSourceMessage: statusMessage,
    scores: [
      { label: 'Timing', value: NA, icon: Clock3, tone: 'orange', note: statusMessage },
      { label: 'Sweet Spot', value: NA, icon: Target, tone: 'orange', note: statusMessage },
      { label: 'Avg Intensity', value: NA, icon: Zap, tone: 'orange', note: statusMessage },
      { label: 'Injury Risk', value: NA, icon: ShieldAlert, tone: 'orange', note: 'No elbow or pose risk data in receiver file.' },
    ],
    formStats: [
      ['Sweet Spot Rows', 'Receiver file only', NA, 'green'],
      ['Off Sweet Spot Rows', 'Receiver file only', NA, 'orange'],
      ['Frame Hit Rows', 'Receiver file only', NA, 'red'],
      ['Total Hit Events', statusMessage, NA, 'cyan'],
    ],
    summaryItems: [
      ['Total Shots', NA, statusMessage, Target],
      ['Best Swing', NA, 'Receiver file only', Medal],
      ['Avg Intensity', NA, 'Receiver file only', Zap],
      ['Acceleration', NA, 'Receiver file only', Activity],
      ['Avg Peak Gyro', NA, 'Receiver file only', Gauge],
      ['Consistency', NA, 'Receiver file only', Gauge],
    ],
    recentShots: [],
    impactRows: [],
    armStats: createReceiverArmStats([]),
    advice: {
      title: 'Waiting for receiver data.',
      body: statusMessage,
      steps: ['Run python src\\receiver.py.', 'Send hit_event JSON from Q.', 'Refresh the dashboard after stream_events.jsonl is created.'],
    },
  }
}

function createReceiverSessionDataset(events, statusMessage = '') {
  const hitEvents = events.filter((event) => event.type === 'hit_event')
  const armStats = createReceiverArmStats(events)
  const sessionTiming = createReceiverSessionTiming(events)
  if (!hitEvents.length) {
    return {
      ...createEmptyReceiverDataset(statusMessage || 'Receiver file exists, but no hit_event rows are available yet.'),
      armStats,
      timer: sessionTiming.display,
    }
  }
  const swingRows = createReceiverSwingRows(events)
  const swingRowsByHitId = new Map(swingRows.map((row) => [String(row.hitId || row.shotNo), row]))
  const avgReceiverIntensity = swingRows.length
    ? Math.round(swingRows.reduce((total, row) => total + row.intensity, 0) / swingRows.length)
    : NA
  const avgReceiverAccel = swingRows.length
    ? `${(swingRows.reduce((total, row) => total + row.avgAccel, 0) / swingRows.length).toFixed(2)}g`
    : NA
  const maxReceiverAccel = swingRows.length
    ? `${Math.max(...swingRows.map((row) => row.peakAccel)).toFixed(2)}g peak`
    : `No ${RECEIVER_SWING_WINDOW_ROWS}-row swing windows`

  const rows = hitEvents.map((event, index) => {
    const row = event.row || {}
    const context = event.merged_context || {}
    const category = receiverEventCategory(event)
    const hitId = row.hit_id || row.id || row.seq || `${category}-${index + 1}`
    const swingRow = swingRowsByHitId.get(String(hitId))
    const gyroValues = [
      context.nano_gx_dps ?? row.nano_gx_dps ?? row.gx_dps,
      context.nano_gy_dps ?? row.nano_gy_dps ?? row.gy_dps,
      context.nano_gz_dps ?? row.nano_gz_dps ?? row.gz_dps,
    ].map((value) => Number(value)).filter(Number.isFinite)
    const peakGyro = gyroValues.length
      ? Math.round(Math.max(...gyroValues.map((value) => Math.abs(value))))
      : 0

    return {
      id: hitId,
      shotNo: String(row.shot_no || row.shotNo || row.hit_id || row.seq || index + 1).padStart(2, '0'),
      category,
      peakGyro: swingRow?.peakGyro || peakGyro,
      timingMs: swingRow?.durationMs ?? NA,
      eventTime: event.pc_receive_time || event.timestamp || NA,
      tone: category === 'sweet_spot' ? 'green' : category === 'frame_hit' ? 'red' : 'orange',
    }
  })

  const totalShots = rows.length
  const counts = countRealCategories(rows)
  const sweetSpotCount = counts.sweet_spot || 0
  const offSweetSpotCount = counts.off_sweet_spot || 0
  const frameHitCount = counts.frame_hit || 0
  const avgPeakGyro = totalShots ? rows.reduce((sum, row) => sum + row.peakGyro, 0) / totalShots : 0
  const sweetSpotScore = totalShots ? (sweetSpotCount / totalShots) * 100 : 0
  const consistency = totalShots ? ((sweetSpotCount + offSweetSpotCount * 0.5) / totalShots) * 100 : 0
  const recentShots = rows.slice(-5).reverse().map((row) => [
    row.shotNo,
    realCategoryLabel(row.category),
    realCategoryLabel(row.category),
    row.timingMs === NA ? NA : `${row.timingMs}ms`,
    row.eventTime,
    row.tone,
  ])
  const bestRow = rows.reduce((best, row) => (row.peakGyro > best.peakGyro ? row : best), rows[0])
  const firstReceiveTime = hitEvents[0]?.pc_receive_time || hitEvents[0]?.timestamp || NA

  return {
    timer: sessionTiming.display,
    drill: 'Receiver stream',
    targetShots: totalShots,
    bestDate: firstReceiveTime,
    hasRealData: true,
    dataSourceMessage: `${totalShots} hit_event rows loaded from receiver file.`,
    scores: [
      { label: 'Timing', value: sessionTiming.display, icon: Clock3, tone: 'cyan', note: sessionTiming.note },
      { label: 'Sweet Spot', value: clampScore(sweetSpotScore), icon: Target, tone: sweetSpotScore >= 70 ? 'green' : sweetSpotScore >= 40 ? 'cyan' : 'orange', note: `${sweetSpotCount}/${totalShots} recorded sweet spot rows` },
      { label: 'Avg Intensity', value: avgReceiverIntensity, icon: Zap, tone: avgReceiverIntensity >= 70 ? 'green' : avgReceiverIntensity >= 35 ? 'cyan' : 'orange', note: `${RECEIVER_SWING_WINDOW_ROWS} rows before each hit_event` },
    ],
    formStats: [
      ['Sweet Spot Rows', 'From receiver hit_event labels', String(sweetSpotCount), 'green'],
      ['Off Sweet Spot Rows', 'From receiver hit_event labels', String(offSweetSpotCount), 'orange'],
      ['Frame Hit Rows', 'From receiver hit_event labels', String(frameHitCount), 'red'],
      ['Total Hit Events', 'stream_events.jsonl', String(totalShots), 'cyan'],
    ],
    summaryItems: [
      ['Total Shots', String(totalShots), 'Receiver hit_event rows', Target],
      ['Best Swing', `${realCategoryLabel(bestRow.category)} #${bestRow.shotNo}`, 'Highest receiver gyro value', Medal],
      ['Timing', sessionTiming.display, sessionTiming.note, Clock3],
      ['Avg Intensity', avgReceiverIntensity === NA ? NA : `${avgReceiverIntensity}/100`, `${RECEIVER_SWING_WINDOW_ROWS} rows before each hit_event`, Zap],
      ['Acceleration', avgReceiverAccel, maxReceiverAccel, Activity],
      ['Arm Gyro', armStats.avgArmGyro, `Q arm IMU peak ${armStats.peakArmGyro}`, ShieldAlert],
      ['Avg Peak Gyro', `${Math.round(avgPeakGyro)}`, 'dps', Gauge],
      ['Consistency', `${clampScore(consistency)}%`, 'based on recorded impact labels', Gauge],
    ],
    recentShots,
    impactRows: rows,
    armStats,
    advice: {
      title: frameHitCount > sweetSpotCount ? 'Reduce frame-hit contact first.' : 'Keep collecting receiver hit events.',
      body: `Current dashboard uses ${totalShots} hit_event rows from stream_events.jsonl: ${sweetSpotCount} sweet spot, ${offSweetSpotCount} off sweet spot, ${frameHitCount} frame hit.`,
      steps: ['Keep receiver.py running while Q streams data.', 'Refresh after new hit_event rows arrive.', 'Add real pose/elbow data before showing injury risk.'],
    },
  }
}

function createReceiverIntensityRows(events) {
  return createReceiverSwingRows(events)
}

const realSessionDataset = createEmptyReceiverDataset()
const realPlayers = [
  {
    id: 'recorded-session',
    number: '01',
    name: 'Recorded Session',
    level: 'Receiver file only',
    hand: NA,
    baseline: NA,
  },
]
const visualizationSets = {
  shotList: {
    title: 'Shot List Visualization',
    description: 'Recent shot quality by score and result label.',
    fileName: 'shot-list.csv',
    rows: [
      { label: '#40 Smash', value: 92, secondary: 'Sweet Spot' },
      { label: '#39 Clear', value: 78, secondary: 'Frame Hit' },
      { label: '#38 Drop', value: 65, secondary: 'Frame Hit' },
      { label: '#37 Smash', value: 95, secondary: 'Sweet Spot' },
      { label: '#36 Drive', value: 70, secondary: 'Frame Hit' },
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
      { label: 'Elbow Form', value: 0, secondary: 'n/a' },
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
      ['#39', 'Clear', 'Frame Hit', 'Power 78', '01:16'],
      ['#38', 'Drop', 'Frame Hit', 'Power 65', '01:14'],
      ['#37', 'Smash', 'Sweet Spot', 'Power 95', '01:12'],
      ['#36', 'Drive', 'Frame Hit', 'Power 70', '01:10'],
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
      ['Shot', '#39 Clear', 'Frame Hit', 'Power 78', '01:16'],
      ['Session', 'May 26', '40 shots', 'Overall 88', '18m 36s'],
      ['Device', 'Core Sensor', 'Connected', 'Battery 100%', 'Seen now'],
      ['Player', 'Player 01', 'Intermediate', 'Overall 82', 'Active'],
      ['Report', 'May Summary', 'Ready', 'CSV/PDF', 'Updated today'],
    ],
  },
}

const PREVIEW_DESCRIPTIONS = {
  'overview': 'Get a high-level summary of recent training sessions and overall player performance.',
  'training': 'Focus on specific drills and record new training sessions for immediate feedback.',
  'shot-analysis': 'Deep dive into racket speed, impact timing, and body rotation per shot.',
  'reports': 'Generate detailed PDF and CSV reports for coaching staff and player review.',
  'data-explorer': 'Interact with raw IMU data and 3D pose skeletons frame-by-frame.',
  'sensors': 'Manage connected hardware devices and verify data streaming latency.',
  'players': 'View roster, manage player profiles, and track individual progress over time.',
  'pose-pipeline': 'Process raw video to extract 3D skeletons and build new motion datasets.',
  'settings': 'Configure application preferences, UI themes, and model parameters.',
}

function Sidebar({ activePage, onPageChange }) {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <aside className="sidebar">
      <img className="logo" src={asset('ai-coach-logo.png')} alt="AI Coach logo" />

      <nav className="nav" aria-label="Dashboard navigation" onMouseLeave={() => setHoveredItem(null)}>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button 
            className={activePage === id ? 'active' : ''} 
            type="button" 
            onMouseEnter={() => setHoveredItem(id)}
            onClick={() => {
              if (id === 'pose-pipeline') {
                navigate('/pose');
              } else {
                onPageChange(id);
              }
            }} 
            key={id}
            style={{ position: 'relative' }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {hoveredItem === id && (
              <div className="menuPreviewPanel">
                <video src="https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" autoPlay loop muted playsInline />
                <div className="previewContent">
                  <h3>{label}</h3>
                  <p>{PREVIEW_DESCRIPTIONS[id]}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </nav>

      <section className="deviceRail" aria-label="Connected devices">
        <div className="railHeader">
          <h2>Data Sources</h2>
          <span><BatteryFull size={14} />n/a</span>
        </div>
        {devices.map(([name, image]) => (
          <div className="railDevice" key={name}>
            <img src={asset(image)} alt={name} />
            <div>
              <b>{name}</b>
            </div>
            <i />
          </div>
        ))}
      </section>
    </aside>
  )
}

function Header({ activePage, selectedPlayer, playerOptions, isPlayerMenuOpen, onTogglePlayerMenu, onSelectPlayer }) {
  const pageTitle = activePage === 'training-form'
    ? 'Form Training'
    : navItems.find((item) => item.id === activePage)?.label || 'Overview'

  return (
    <header className="header">
      <div>
        <h1>{pageTitle === 'Overview' ? 'Badminton AI Coach' : pageTitle}</h1>
      </div>
      <div className="headerStatus">
        <div className="connectPill">
          <BluetoothConnected size={24} />
          <b>IMU CSV</b>
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
                  <span>{player.level} · {player.baseline}/100</span>
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

function ElbowDetail({ armStats = createReceiverArmStats([]) }) {
  const [selectedId, setSelectedId] = useState(armStats.rows?.[0]?.id || '')
  const selectedRow = armStats.rows?.find((row) => row.id === selectedId) || armStats.rows?.[0]

  useEffect(() => {
    setSelectedId(armStats.rows?.[0]?.id || '')
  }, [armStats.rows])

  return (
    <div className="detailGrid twoCol">
      <div className="elbowStage">
        <img src={asset('elbows.png')} alt="Elbow form analysis" />
        <svg className="elbowArc" viewBox="0 0 100 86" aria-hidden="true">
          <path d="M 18 36 C 34 22 61 24 75 46" />
          <path className="inner" d="M 42 37 C 51 43 57 53 59 66" />
          <circle cx="75" cy="46" r="4" />
        </svg>
      </div>
      <div className="calloutList">
        <div className={armStats.hasArmData ? 'callout cyan' : 'callout muted'}>
          <span>{selectedRow ? `Arm Swing #${selectedRow.shotNo}` : 'Current Arm Tilt'}</span>
          <b>{selectedRow?.angle || armStats.currentAngle}</b>
          <p>{selectedRow ? `Avg gyro ${selectedRow.gyro} · Peak ${selectedRow.peakGyro} · Accel ${selectedRow.accel}` : armStats.note}</p>
        </div>
        <div className={armStats.hasArmData ? 'callout green' : 'callout muted'}>
          <span>Target Range</span>
          <b>{armStats.targetRange}</b>
          <p>Q gyro: avg {armStats.avgArmGyro}, peak {armStats.peakArmGyro}.</p>
        </div>
        {armStats.rows?.length > 0 && (
          <div className="armRowList">
            {armStats.rows.map((row) => (
              <button
                className={row.id === selectedRow?.id ? 'active' : ''}
                type="button"
                onClick={() => setSelectedId(row.id)}
                key={row.id}
              >
                <span>#{row.shotNo}</span>
                <b>{row.angle}</b>
                <small>{row.samples} rows · {row.gyro} · {row.accel}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const impactLabelMap = {
  frame_hit: 'Frame-Hit',
  sweet_spot: 'Sweet-Spot',
  off_sweet_spot: 'Soft-Sweet-Spot',
}

function SweetSpotDetail({ rows = [] }) {
  const [selectedId, setSelectedId] = useState(rows[0]?.id || '')
  const selectedRow = rows.find((row) => row.id === selectedId) || rows[0]
  const selectedImpact = impactLabelMap[selectedRow?.category] || 'Unknown'

  useEffect(() => {
    setSelectedId(rows[0]?.id || '')
  }, [rows])

  if (!selectedRow) {
    return <div className="emptyState">n/a - no receiver hit_event rows available.</div>
  }

  return (
    <div className="detailGrid twoCol">
      <div className="sweetStage">
        <div className="racketWrap">
          <img src={asset('racket.png')} alt="Racket sweet spot" />
        </div>
      </div>
      <div className="impactSummary">
        <span>Selected Impact</span>
        <b>{selectedImpact}</b>
        <p>{selectedRow?.file || 'No selected row'}</p>
        <div className="impactRowList">
          {rows.map((row) => (
            <button
              className={row.id === selectedRow?.id ? 'active' : ''}
              type="button"
              onClick={() => setSelectedId(row.id)}
              key={row.id}
            >
              <span>#{row.shotNo}</span>
              <b>{impactLabelMap[row.category]}</b>
              <small>IMU row</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FormAnalysisDetail({ stats = realSessionDataset.formStats }) {
  const totalRow = stats.find(([label]) => label.toLowerCase().includes('total'))
  const graphRows = stats
    .filter(([label]) => !label.toLowerCase().includes('total'))
    .map(([label, note, value, tone]) => ({
      label,
      note,
      value: Number(value),
      displayValue: value,
      tone,
    }))
  const numericRows = graphRows.filter((row) => Number.isFinite(row.value))
  const numericTotal = Number(totalRow?.[2])
  const total = Number.isFinite(numericTotal)
    ? numericTotal
    : numericRows.length
      ? numericRows.reduce((sum, row) => sum + row.value, 0)
      : NA
  const maxValue = Math.max(...numericRows.map((row) => row.value), 1)

  return (
    <div className="formAnalysisDetail">
      <div className="formGraph" aria-label="Form analysis chart">
        <div className="formGraphHeader">
          <span>Total IMU Rows</span>
          <b>{total}</b>
        </div>
        {graphRows.map((row) => (
          <div className={`formBar ${row.tone}`} key={row.label}>
            <div>
              <span>{row.label}</span>
              <b>{Number.isFinite(row.value) ? row.value : row.displayValue}</b>
            </div>
            <i>
              <span style={{ width: `${Number.isFinite(row.value) ? Math.max((row.value / maxValue) * 100, row.value ? 4 : 0) : 0}%` }} />
            </i>
            <small>{Number.isFinite(row.value) && Number.isFinite(total) && total ? `${Math.round((row.value / total) * 100)}% of real rows` : 'n/a'}</small>
          </div>
        ))}
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

function CoachAdvice({ advice = realSessionDataset.advice }) {
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

function SessionDetail({ items = realSessionDataset.summaryItems }) {
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
    </div>
  )
}

function RecentShotsDetail({ shots = realSessionDataset.recentShots }) {
  return (
    <div className="shotList">
      {shots.map(([id, shot, result, timing, time, tone]) => (
        <div className="shotRow" key={id}>
          <span>{id}</span>
          <b>{shot}</b>
          <em className={tone}>{result}</em>
          <small>Timing {timing}</small>
          <time>{time}</time>
        </div>
      ))}
    </div>
  )
}

const formatCategoryName = (category) => category
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

function buildIntensityPath(series, maxIntensity, width = 620, height = 120) {
  if (!series.length || !maxIntensity) return ''

  return series
    .map(([, intensity], index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width
      const y = height - (intensity / maxIntensity) * (height - 42) - 18
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function buildLocalSessionAnalysis(session = {}, player = 'Player') {
  const findMetric = (items = [], label) => items.find((item) => String(item.label || '').toLowerCase() === label.toLowerCase())
  const totalShots = findMetric(session.summary, 'Total Shots')?.value || session.recentShots?.length || NA
  const timing = findMetric(session.scores, 'Timing')
  const sweetSpot = findMetric(session.scores, 'Sweet Spot')
  const avgIntensity = findMetric(session.scores, 'Avg Intensity')
  const acceleration = findMetric(session.summary, 'Acceleration')
  const armGyro = findMetric(session.summary, 'Arm Gyro')
  const latestShot = session.recentShots?.[0]
  const latestResult = String(latestShot?.result || '').toLowerCase()
  const intensityValue = toFiniteNumber(avgIntensity?.value)
  const sweetSpotValue = toFiniteNumber(sweetSpot?.value)
  const accelerationValue = toFiniteNumber(acceleration?.value)
  const armGyroValue = toFiniteNumber(armGyro?.value)
  const contactDrill = latestResult.includes('sweet')
    ? `Keep the same contact point for the next 10 feeds because the latest shot was ${latestShot?.result}. Add force only after 3 clean center contacts in a row`
    : `Reduce swing effort by about 20% for the next 5 feeds because the latest shot was ${latestShot?.result || 'not a sweet spot'}. Do one slow shadow swing before each feed and aim the racket face through the center line`
  const intensityDrill = intensityValue >= 70
    ? `Avg intensity is ${avgIntensity?.value}; use short 3-shot sets with 30-45 seconds rest so the arm does not over-rotate while fatigue builds`
    : `Avg intensity is ${avgIntensity?.value}; increase racket speed gradually only after the contact result stays Sweet Spot for a full 5-shot set`
  const controlDrill = sweetSpotValue < 50
    ? `Sweet Spot is ${sweetSpot?.value}, so prioritize accuracy: place a visual target at center contact height and count only center-contact reps`
    : `Sweet Spot is ${sweetSpot?.value}, so keep the current contact setup and focus on repeating the same preparation rhythm`
  const loadDrill = accelerationValue >= 3 || armGyroValue >= 300
    ? `Acceleration/arm gyro is high (${acceleration?.value || NA}, arm ${armGyro?.value || NA}); reduce backswing size for the next set and stop if the arm feels late or unstable`
    : `Load looks controlled (${acceleration?.value || NA}, arm ${armGyro?.value || NA}); keep the same tempo and add one extra feed per set`

  return [
    `Local analysis for ${player}`,
    '',
    `- Session timing: ${timing?.value ?? session.timer ?? NA} (${timing?.note || 'receiver log duration'}).`,
    `- Total shots: ${totalShots}. Latest shot: ${latestShot ? `#${latestShot.id} ${latestShot.result}, timing ${latestShot.timing}` : 'n/a'}.`,
    `- Sweet Spot: ${sweetSpot?.value ?? NA}${sweetSpot?.note ? ` (${sweetSpot.note})` : ''}.`,
    `- Avg Intensity: ${avgIntensity?.value ?? NA}${avgIntensity?.note ? ` (${avgIntensity.note})` : ''}.`,
    `- Acceleration: ${acceleration?.value ?? NA}${acceleration?.note ? `, ${acceleration.note}` : ''}.`,
    `- Arm gyro: ${armGyro?.value ?? NA}${armGyro?.note ? `, ${armGyro.note}` : ''}.`,
    '',
    'Recommendation:',
    `- ${contactDrill}.`,
    `- ${intensityDrill}.`,
    `- ${controlDrill}.`,
    `- ${loadDrill}.`,
  ].join('\n')
}

function SwingReplayCanvas({ row, isPlaying, onFrameChange }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const animationRef = useRef(0)
  const viewYawRef = useRef(0)
  const dragRef = useRef({ active: false, x: 0 })
  const [frameIndex, setFrameIndex] = useState(0)

  const samples = useMemo(
    () => row?.replay || row?.series?.map(([time, intensity]) => [time, 0, 0, intensity * 6.1, 1, intensity * 6.1, intensity]) || [],
    [row],
  )
  const maxIntensity = Math.max(...samples.map((sample) => sample[6] || 0), 1)
  const currentSample = samples[frameIndex] || samples[0] || [0, 0, 0, 0, 0, 0, 0]
  const currentSampleIntensity = currentSample[6] || 0
  const currentIntensity = Math.min(100, Math.round((currentSampleIntensity / maxIntensity) * (row?.intensity || 0)))
  const durationSec = row ? (row.durationMs / 1000).toFixed(2) : '0.00'

  useEffect(() => {
    frameRef.current = 0
    setFrameIndex(0)
    onFrameChange?.(0)
  }, [onFrameChange, row?.id])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !row) return undefined

    const ctx = canvas.getContext('2d')
    let width = 0
    let height = 0
    let dpr = 1
    let lastTime = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const rotateX = (point, angle) => {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return { x: point.x, y: point.y * cos - point.z * sin, z: point.y * sin + point.z * cos }
    }

    const rotateY = (point, angle) => {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return { x: point.x * cos + point.z * sin, y: point.y, z: -point.x * sin + point.z * cos }
    }

    const rotateZ = (point, angle) => {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos, z: point.z }
    }

    const rotateRacket = (point, roll, pitch, yaw) => rotateZ(rotateY(rotateX(point, roll), pitch), yaw)

    const camera = { rx: -0.45, ry: 0.62 }

    const project = (point) => {
      const xRotated = rotateX(point, camera.rx)
      const rotated = rotateY(xRotated, camera.ry + viewYawRef.current)
      const zoom = Math.max(120, Math.min(width, height) * 0.46)
      const scale = zoom / Math.max(1.4, 3.8 + rotated.z)
      return {
        x: width / 2 + rotated.x * scale,
        y: height / 2 + 44 - rotated.y * scale,
        z: rotated.z,
        scale,
      }
    }

    const buildSwing = () => {
      let roll = 0
      let pitch = 0
      let yaw = 0
      let lastMs = samples[0]?.[0] || 0
      const racketLength = 1.35

      return samples.map((sample, index) => {
        const [time, gx, gy, gz, accel, gyro, intensity] = sample
        const dt = Math.max(0.005, Math.min(0.05, ((time || 0) - lastMs) / 1000 || 0.02))
        lastMs = time || lastMs

        roll += (gx || 0) * Math.PI / 180 * dt
        pitch += (gy || 0) * Math.PI / 180 * dt
        yaw += (gz || 0) * Math.PI / 180 * dt

        const t = index / Math.max(samples.length - 1, 1)
        const hand = {
          x: 0.28 * Math.sin(t * Math.PI * 1.7) + (gy || 0) / Math.max(row.peakGyro, 1) * 0.32,
          y: -0.42 + 0.18 * Math.sin(t * Math.PI * 2.2) + ((accel || 1) - 1) * 0.05,
          z: 0.22 * Math.cos(t * Math.PI * 1.25) + (gx || 0) / Math.max(row.peakGyro, 1) * 0.28,
        }
        const shaft = rotateRacket({ x: 0, y: racketLength, z: 0 }, roll, pitch, yaw)
        const head = { x: hand.x + shaft.x, y: hand.y + shaft.y, z: hand.z + shaft.z }
        return { hand, head, roll, pitch, yaw, gyro, accel, intensity, intensityRatio: (intensity || 0) / maxIntensity }
      })
    }

    const drawLine3D = (start, end, color, lineWidth = 1, alpha = 1) => {
      const a = project(start)
      const b = project(end)
      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const drawPoint3D = (point, color, radius = 4, alpha = 1) => {
      const projected = project(point)
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const drawRacket = (state) => {
      drawLine3D(state.hand, state.head, '#eaf2ff', 6, 0.95)

      const faceRadius = 0.18
      const points = []
      for (let index = 0; index < 22; index += 1) {
        const angle = index / 22 * Math.PI * 2
        const local = {
          x: Math.cos(angle) * faceRadius,
          y: 1.35,
          z: Math.sin(angle) * faceRadius * 0.62,
        }
        const offset = rotateRacket(local, state.roll, state.pitch, state.yaw)
        points.push({ x: state.hand.x + offset.x, y: state.hand.y + offset.y, z: state.hand.z + offset.z })
      }

      ctx.strokeStyle = state.intensityRatio > 0.72 ? '#69f0ae' : '#ff5d8f'
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.95
      ctx.beginPath()
      points.forEach((point, index) => {
        const projected = project(point)
        if (index === 0) ctx.moveTo(projected.x, projected.y)
        else ctx.lineTo(projected.x, projected.y)
      })
      ctx.closePath()
      ctx.stroke()
      ctx.globalAlpha = 1

      drawPoint3D(state.head, '#ff5d8f', 7 + state.intensityRatio * 4)
      drawPoint3D(state.hand, '#69f0ae', 5)
    }

    const draw = (time = 0) => {
      if (!width || !height) resize()

      if (isPlaying && time - lastTime > 44) {
        frameRef.current = (frameRef.current + 1) % Math.max(samples.length, 1)
        setFrameIndex(frameRef.current)
        onFrameChange?.(frameRef.current)
        lastTime = time
      }

      const activeIndex = Math.min(frameRef.current, samples.length - 1)
      const states = buildSwing()

      ctx.clearRect(0, 0, width, height)
      const bg = ctx.createRadialGradient(width * 0.55, height * 0.38, 12, width * 0.55, height * 0.38, width * 0.76)
      bg.addColorStop(0, 'rgba(35, 90, 150, 0.22)')
      bg.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      for (let index = 1; index < states.length; index += 1) {
        const previous = states[index - 1]
        const point = states[index]
        const isDrawn = index <= activeIndex || !isPlaying
        drawLine3D(previous.head, point.head, point.intensityRatio > 0.72 ? '#69f0ae' : '#33c8ff', point.intensityRatio > 0.72 ? 4 : 2, isDrawn ? 0.88 : 0.16)
      }
      ctx.globalAlpha = 1

      const state = states[activeIndex] || states[0]
      if (state) drawRacket(state)

      animationRef.current = requestAnimationFrame(draw)
    }

    resize()
    draw()

    const handlePointerDown = (event) => {
      dragRef.current = { active: true, x: event.clientX }
      canvas.setPointerCapture?.(event.pointerId)
    }

    const handlePointerMove = (event) => {
      if (!dragRef.current.active) return

      const deltaX = event.clientX - dragRef.current.x
      dragRef.current.x = event.clientX
      viewYawRef.current += deltaX * 0.008
    }

    const endDrag = (event) => {
      dragRef.current.active = false
      canvas.releasePointerCapture?.(event.pointerId)
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointerleave', endDrag)
    window.addEventListener('resize', resize)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointerleave', endDrag)
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, maxIntensity, onFrameChange, row, samples])

  return (
    <div className="gyroReplayStage">
      <canvas ref={canvasRef} />
      <div className="gyroReplayHud">
        <div><span>Frame</span><b>{frameIndex + 1} / {samples.length}</b></div>
        <div><span>Time</span><b>{((currentSample[0] || 0) / 1000).toFixed(2)}s</b></div>
        <div><span>Intensity</span><b>{currentIntensity}/100</b></div>
        <div><span>Peak Gyro</span><b>{row?.peakGyro || 0} dps</b></div>
      </div>
      <div className="gyroReplaySide">
        <span>Live swing intensity</span>
        <i><span style={{ width: `${currentIntensity}%` }} /></i>
        <b>{row?.level || 'n/a'} · {currentIntensity}/100</b>
        <small>Rows {row?.samples || 0} · Duration {durationSec}s · Peak gyro {row?.peakGyro || 0} dps</small>
      </div>
    </div>
  )
}

function SwingIntensityDetail({ rows = [] }) {
  const [selectedId, setSelectedId] = useState(rows[0]?.id || '')
  const [playingId, setPlayingId] = useState('')
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0)
  const selectedRow = rows.find((row) => row.id === selectedId) || rows[0]
  const isSelectedPlaying = playingId === selectedRow?.id
  const graphWidth = 620
  const graphHeight = 120
  const graphMaxIntensity = Math.max(...(selectedRow?.series || []).map(([, intensity]) => intensity), 1)
  const graphPath = buildIntensityPath(selectedRow?.series || [], graphMaxIntensity, graphWidth, graphHeight)
  const graphLength = selectedRow?.series?.length || 1
  const replayLength = selectedRow?.replay?.length || graphLength
  const playbackProgress = playbackFrameIndex / Math.max(replayLength - 1, 1)
  const cursorIndex = Math.min(Math.round(playbackProgress * Math.max(graphLength - 1, 0)), graphLength - 1)
  const cursorIntensity = selectedRow?.series?.[cursorIndex]?.[1] || 0
  const cursorX = (cursorIndex / Math.max(graphLength - 1, 1)) * graphWidth
  const cursorY = graphHeight - (cursorIntensity / graphMaxIntensity) * (graphHeight - 42) - 18
  const averageIntensity = rows.length
    ? Math.round(rows.reduce((total, row) => total + row.intensity, 0) / rows.length)
    : 0
  const peakGyroRow = rows.reduce((best, row) => (row.peakGyro > best.peakGyro ? row : best), rows[0] || { peakGyro: 0 })
  const levelCounts = rows.reduce((counts, row) => {
    counts[row.level] = (counts[row.level] || 0) + 1
    return counts
  }, {})

  useEffect(() => {
    setPlaybackFrameIndex(0)
  }, [selectedRow?.id])

  if (!selectedRow) {
    return <div className="emptyState">No IMU swing intensity data available.</div>
  }

  return (
    <div className="swingIntensity">
      <div className="intensitySummary">
        <div>
          <span>Total Swings</span>
          <b>{rows.length}</b>
          <small>hit_event windows</small>
        </div>
        <div>
          <span>Avg Intensity</span>
          <b>{averageIntensity}<small>/100</small></b>
          <small>avg of {RECEIVER_SWING_WINDOW_ROWS} rows before hit</small>
        </div>
        <div>
          <span>Peak Gyro</span>
          <b>{peakGyroRow.peakGyro}<small>dps</small></b>
          <small>{formatCategoryName(peakGyroRow.category || 'unknown')}</small>
        </div>
        <div>
          <span>Common Level</span>
          <b>{Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'n/a'}</b>
          <small>from selected dataset</small>
        </div>
      </div>

      <div className="intensityLayout">
        <div className="intensityRows">
          {rows.map((row) => (
            <div
              className={row.id === selectedRow.id ? 'intensityRowCard active' : 'intensityRowCard'}
              key={row.id}
            >
              <button
                className="intensitySelect"
                type="button"
                onClick={() => setSelectedId(row.id)}
              >
                <span>#{row.shotNo}</span>
                <b>{formatCategoryName(row.category)}</b>
                <em className={row.tone}>{row.level}</em>
                <strong>{row.intensity}</strong>
                <small>{row.samples} rows · {row.peakAccel.toFixed(2)}g accel</small>
              </button>
            </div>
          ))}
        </div>

        <div className="intensityGraphPanel">
          <div className="intensityGraphHeader">
            <div>
              <span>Selected Swing</span>
              <h3>{formatCategoryName(selectedRow.category)} #{selectedRow.shotNo}</h3>
              <p>{selectedRow.file}</p>
            </div>
            <div className="selectedSwingActions">
              <button
                className={isSelectedPlaying ? 'selectedPlayButton active' : 'selectedPlayButton'}
                type="button"
                onClick={() => setPlayingId((currentId) => (currentId === selectedRow.id ? '' : selectedRow.id))}
              >
                <Play size={16} />
                {isSelectedPlaying ? 'Pause' : 'Play'}
              </button>
              <div className={`intensityPill ${selectedRow.tone}`}>
                {selectedRow.level}
                <b>{selectedRow.intensity}/100</b>
              </div>
            </div>
          </div>

          <svg className="intensityGraph" viewBox={`0 0 ${graphWidth} ${graphHeight}`} role="img" aria-label="IMU intensity trace">
            <text className="intensityGraphLabel" x="20" y="25">
              IMU intensity trace
            </text>
            <path className="intensityGraphLine" d={graphPath} />
            <line className="intensityGraphEndMarker" x1={graphWidth - 13} x2={graphWidth - 13} y1="18" y2={graphHeight - 18} />
            {isSelectedPlaying && (
              <>
                <line className="intensityGraphCursorLine" x1={cursorX} x2={cursorX} y1="18" y2={graphHeight - 18} />
                <circle className="intensityGraphCursor" cx={cursorX} cy={cursorY} r="7" />
              </>
            )}
          </svg>

          {isSelectedPlaying && (
            <SwingReplayCanvas
              row={selectedRow}
              isPlaying={isSelectedPlaying}
              onFrameChange={setPlaybackFrameIndex}
            />
          )}

          <div className="intensityMetrics">
            <div>
              <span>Intensity</span>
              <b>{selectedRow.intensity}<small>/100</small></b>
            </div>
            <div>
              <span>Peak Accel</span>
              <b>{selectedRow.peakAccel}<small>g</small></b>
            </div>
            <div>
              <span>Impact</span>
              <b>{selectedRow.impactMs}<small>ms</small></b>
            </div>
            <div>
              <span>Rows</span>
              <b>{selectedRow.samples}</b>
            </div>
            <div>
              <span>Duration</span>
              <b>{selectedRow.durationMs}<small>ms</small></b>
            </div>
          </div>
        </div>
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
          <span><BatteryFull size={13} />Real data source</span>
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

function DashboardSummary({ player, data, intensityRows = [] }) {
  const totalShots = data.summaryItems.find(([label]) => label === 'Total Shots')?.[1] || '0'
  const bestShot = data.summaryItems.find(([label]) => label === 'Best Shot' || label === 'Best Swing')?.[1] || 'n/a'
  const avgIntensity = intensityRows.length
    ? Math.round(intensityRows.reduce((total, row) => total + row.intensity, 0) / intensityRows.length)
    : 0
  const peakAccel = intensityRows.reduce((max, row) => Math.max(max, row.peakAccel), 0)
  return (
    <div className="summaryDetail">
      <div className="summaryHero">
        <div>
          <span>Current Player</span>
          <h3>{player.name}</h3>
          <p>{player.level} · baseline {player.baseline}/100</p>
        </div>
        <div>
          <b>{data.timer}</b>
          <small>{data.drill}</small>
        </div>
      </div>

      <div className="summaryQuickStats">
        <article>
          <Target size={20} />
          <span>Total Shots</span>
          <b>{totalShots}</b>
        </article>
        <article>
          <Medal size={20} />
          <span>Best Shot</span>
          <b>{bestShot}</b>
        </article>
        <article>
          <Activity size={20} />
          <span>Avg Intensity</span>
          <b>{avgIntensity}<small>/100</small></b>
        </article>
        <article>
          <Zap size={20} />
          <span>Peak Accel</span>
          <b>{peakAccel.toFixed(2)}<small>g</small></b>
        </article>
      </div>

      <section>
        <h3>Training Scores</h3>
        <ScoreOverview items={data.scores} />
      </section>

      <section>
        <h3>Recent Shots</h3>
        <RecentShotsDetail shots={data.recentShots} />
      </section>

      <section>
        <h3>Elbow Analysis</h3>
        <ElbowDetail armStats={data.armStats} />
      </section>

      <section>
        <h3>Sweet Spot</h3>
        <SweetSpotDetail />
      </section>

      <section>
        <h3>Swing Intensity Rows</h3>
        <SwingIntensityDetail rows={intensityRows} />
      </section>

      <section className="summaryAdvice">
        <h3>Coach Summary</h3>
        <div>
          <b>{data.advice.title}</b>
          <p>{data.advice.body}</p>
          <ul>
            {data.advice.steps.map((step) => <li key={step}>{step}</li>)}
          </ul>
        </div>
      </section>
    </div>
  )
}

function getCategories(data, intensityRows = []) {
  return [
  {
    id: 'scores',
    kicker: 'Overview',
    title: 'Training Scores',
    description: 'Timing, intensity, risk.',
    icon: Gauge,
    content: <ScoreOverview items={data.scores} />,
  },
  {
    id: 'elbow',
    kicker: 'Form',
    title: 'Elbow Analysis',
    description: 'Angle and range.',
    icon: ShieldAlert,
    content: <ElbowDetail armStats={data.armStats} />,
  },
  {
    id: 'sweet',
    kicker: 'Impact',
    title: 'Sweet Spot',
    description: 'Impact location.',
    icon: Target,
    content: <SweetSpotDetail rows={data.impactRows || []} />,
  },
  {
    id: 'form-analysis',
    kicker: 'Shots',
    title: 'Form Analysis',
    description: 'Errors and totals.',
    icon: Radar,
    content: <FormAnalysisDetail stats={data.formStats} />,
  },
  {
    id: 'coach',
    kicker: 'Coach',
    title: 'Next Action',
    description: 'Next correction.',
    icon: Sparkles,
    content: <CoachAdvice advice={data.advice} />,
  },
  {
    id: 'session',
    kicker: 'Session',
    title: 'Session Summary',
    description: 'Shots and consistency.',
    icon: ChartNoAxesCombined,
    content: <SessionDetail items={data.summaryItems} />,
  },
  {
    id: 'recent-shots',
    kicker: 'Latest',
    title: 'Recent Shots',
    description: 'Latest attempts.',
    icon: Clock3,
    content: <RecentShotsDetail shots={data.recentShots} />,
  },
  {
    id: 'swing-intensity',
    kicker: 'IMU',
    title: 'Swing Intensity',
    description: 'IMU intensity rows.',
    icon: Activity,
    content: <SwingIntensityDetail rows={intensityRows} />,
  },
  {
    id: 'hardware',
    kicker: 'Sensors',
    title: 'Hardware Status',
    description: 'Battery and signal.',
    icon: Activity,
    content: <HardwareDetail />,
  },
  {
    id: 'actions',
    kicker: 'Control',
    title: 'Quick Actions',
    description: 'Start or upload.',
    icon: Play,
    content: <ActionDetail />,
  },
  {
    id: 'training-form',
    kicker: 'Learn',
    title: 'Form Training',
    description: 'Stroke guide.',
    icon: BookOpen,
    navigate: 'training-form',
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
        items: ['Last shot: Smash #40', 'Impact: Sweet Spot', 'Timing needs earlier contact', 'Elbow angle: n/a'],
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
      ['Elbow Angle', 'n/a', 'No real elbow angle data'],
    ],
    sections: [
      {
        title: 'Shot List',
        items: ['#40 Smash - Sweet Spot', '#39 Clear - Frame Hit', '#38 Drop - Frame Hit', '#37 Smash - Sweet Spot'],
      },
      {
        title: 'Analysis Panels',
        items: ['Elbow form analysis', 'Sweet spot impact dot', 'Power and timing score', 'Gyro intensity summary'],
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
      ['Elbow Range', 'n/a', 'No real elbow angle data'],
      ['Data Source', 'IMU CSV', 'Real local dataset'],
      ['Units', 'Metric', 'g, dps'],
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

function getShotTimingMs(shots, index = 0) {
  return Number(String(shots[index]?.[3] || '0').replace('ms', '')) || 0
}

function createVisualizationSets(player, data) {
  const shotRows = data.recentShots.map(([id, shot, result, timing]) => ({
    label: `#${id} ${shot}`,
    value: getShotTimingMs([[id, shot, result, timing]]),
    secondary: result,
  }))
  const totalShots = data.summaryItems.find(([label]) => label === 'Total Shots')?.[1] || '0'
  const consistency = Number(String(data.summaryItems.find(([label]) => label === 'Consistency')?.[1] || '0').replace('%', ''))
  const timingScore = data.scores.find((item) => item.label === 'Timing')?.value || 0
  const sweetSpotScore = data.scores.find((item) => item.label === 'Sweet Spot')?.value || 0
  const avgIntensityScore = data.scores.find((item) => item.label === 'Avg Intensity')?.value || 0
  const numericScore = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)

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
      description: 'Recorded session score from the available IMU dataset.',
      fileName: `${player.id}-session-history.csv`,
      rows: [
        { label: data.bestDate, value: player.baseline, secondary: `${totalShots} shots` },
      ],
    },
    trendCharts: {
      title: `${player.name} Training Trend Visualization`,
      description: 'Timing, intensity, sweet spot, and consistency score trend.',
      fileName: `${player.id}-training-trends.csv`,
      rows: [
        { label: 'Timing', value: numericScore(timingScore), secondary: data.scores.find((item) => item.label === 'Timing')?.note || '' },
        { label: 'Avg Intensity', value: numericScore(avgIntensityScore), secondary: data.scores.find((item) => item.label === 'Avg Intensity')?.note || '' },
        { label: 'Sweet Spot', value: numericScore(sweetSpotScore), secondary: data.scores.find((item) => item.label === 'Sweet Spot')?.note || '' },
        { label: 'Consistency', value: consistency, secondary: 'Session stability' },
      ],
    },
    liveFeedback: {
      title: `${player.name} Live Feedback Visualization`,
      description: 'Latest feedback signals from the current training session.',
      fileName: `${player.id}-live-feedback.csv`,
      rows: [
        { label: 'Impact', value: numericScore(sweetSpotScore), secondary: data.recentShots[0]?.[2] || 'Frame Hit' },
        { label: 'Timing', value: getShotTimingMs(data.recentShots), secondary: data.scores.find((item) => item.label === 'Timing')?.note || '' },
        { label: 'Avg Intensity', value: numericScore(avgIntensityScore), secondary: data.recentShots[0]?.[1] || 'Shot' },
        { label: 'Elbow Form', value: 0, secondary: 'No real elbow data' },
      ],
    },
    deviceHealth: {
      title: 'Real Data Source Status',
      description: 'Sources currently represented by real local data.',
      fileName: 'real-data-sources.csv',
      rows: [
        { label: 'IMU CSV', value: 100, secondary: `${totalShots} rows loaded` },
        { label: 'WebSocket JSONL', value: 0, secondary: 'Run receiver to collect live events' },
      ],
    },
    playerHistory: {
      title: `${player.name} Player History Visualization`,
      description: 'Only the available recorded session is shown.',
      fileName: `${player.id}-player-history.csv`,
      rows: [
        { label: data.bestDate, value: player.baseline, secondary: data.drill },
      ],
    },
  }
}

function createRecordLists(player, data) {
  const totalShots = data.summaryItems.find(([label]) => label === 'Total Shots')?.[1] || '0'
  const bestShot = data.summaryItems.find(([label]) => label === 'Best Shot' || label === 'Best Swing')
  const sessionRows = [
    [data.bestDate, `${totalShots} shots`, `Consistency ${formatPercentValue(player.baseline)}`, bestShot?.[1] || 'Best swing', data.timer],
  ]
  const playerRows = [player].map((item) => [
    item.name,
    item.level,
    'No hand metadata',
    `Consistency ${formatPercentValue(item.id === player.id ? player.baseline : item.baseline)}`,
    item.id === player.id ? 'Active' : 'Inactive',
  ])
  const shotRows = data.recentShots.map(([id, shot, result, timing, time]) => [`#${id}`, shot, result, `Timing ${timing}`, time])

  return {
    ...recordLists,
    shots: { ...recordLists.shots, rows: shotRows },
    sessions: { ...recordLists.sessions, rows: sessionRows },
    players: { ...recordLists.players, rows: playerRows },
    allData: {
      ...recordLists.allData,
      rows: [
        ...shotRows.slice(0, 2).map((row) => ['Shot', row[0], row[1], row[3], row[4]]),
        ['Session', data.bestDate, `${totalShots} shots`, `Consistency ${formatPercentValue(player.baseline)}`, data.timer],
        ['Device', 'Core Sensor', 'Connected', 'Battery 100%', 'Seen now'],
        ['Player', player.name, player.level, `Consistency ${formatPercentValue(player.baseline)}`, 'Active'],
        ['Report', `${player.name} Summary`, 'Ready', 'CSV/PDF', 'Updated today'],
      ],
    },
  }
}

function createPageMockups(player, data) {
  const lists = createRecordLists(player, data)
  const totalShots = data.summaryItems.find(([label]) => label === 'Total Shots')?.[1] || '0'
  const bestShot = data.summaryItems.find(([label]) => label === 'Best Shot' || label === 'Best Swing')?.[1] || 'Best swing'
  const latestShot = data.recentShots[0] || ['0', 'Shot', 'Frame Hit', '0', '00:00']

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
        ['Timing', latestShot[3] || NA, latestShot[2]],
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
        ['Sessions', '1', 'Available real dataset'],
        ['Consistency', formatPercentValue(player.baseline), bestShot],
        ['Rows', totalShots, data.drill],
      ],
      sections: [
        {
          title: 'Session History',
          items: [`${data.bestDate}: ${totalShots} IMU recordings`, `Best swing: ${bestShot}`, `Recorded duration: ${data.timer}`],
        },
        {
          title: 'Exports',
          items: ['CSV shot data', 'Swing intensity rows', 'Receiver JSONL when live stream is running'],
        },
      ],
      records: lists.sessions,
    },
    'data-explorer': {
      ...pageMockups['data-explorer'],
      primary: [
        ['Records', totalShots, 'Real IMU rows'],
        ['Classes', String(data.formStats.length - 1), 'Recorded impact labels'],
        ['Export', 'CSV', 'Current visible rows'],
      ],
      sections: [
        {
          title: 'Filters',
          items: ['Type: IMU rows', `Session: ${data.bestDate}`, `Dataset: ${player.name}`],
        },
        {
          title: 'Interactive Views',
          items: ['Shot List', 'Session History', 'Trend Charts'],
        },
      ],
      records: lists.allData,
    },
    players: {
      ...pageMockups.players,
      primary: [
        ['Current Player', player.name, player.level],
        ['Dominant Hand', 'n/a', 'No hand metadata yet'],
        ['Consistency', formatPercentValue(player.baseline), 'Current real dataset'],
      ],
      records: lists.players,
    },
    sensors: {
      ...pageMockups.sensors,
      primary: [
        ['Sources', String(devices.length), 'Receiver and IMU CSV'],
        ['Battery', 'n/a', 'No battery field in real data'],
        ['Signal', 'n/a', 'No RSSI field in real data'],
      ],
      records: lists.devices,
    },
    settings: {
      ...pageMockups.settings,
      primary: [
        ['Elbow Range', 'n/a', 'No real elbow angle data yet'],
        ['Data Source', 'IMU CSV', 'Real local dataset'],
        ['Units', 'Metric', 'km/h, g, dps'],
      ],
      sections: [
        {
          title: 'Data Source',
          items: ['Receiver stream_events.jsonl only', 'No bundled mock rows shown', 'Run receiver.py to refresh dashboard data'],
        },
        {
          title: 'Missing Real Fields',
          items: ['Battery percent', 'RSSI signal', 'Elbow angle', 'Player profile metadata'],
        },
      ],
    },
  }
}

function getImuSummary(samples) {
  if (!samples.length) return null

  const startTime = samples[0].pc_elapsed_ms
  const lastTime = samples.at(-1).pc_elapsed_ms
  const peakGyroSample = samples.reduce((peak, sample) => (sample.gyro_mag_dps > peak.gyro_mag_dps ? sample : peak), samples[0])
  const peakAccelSample = samples.reduce((peak, sample) => (sample.accel_mag_g > peak.accel_mag_g ? sample : peak), samples[0])
  const peakGyroIndex = samples.indexOf(peakGyroSample)

  return {
    samples: samples.length,
    duration: Math.max(lastTime - startTime, 1),
    peakGyro: peakGyroSample.gyro_mag_dps,
    peakAccel: peakAccelSample.accel_mag_g,
    impactOffset: peakGyroSample.pc_elapsed_ms - startTime,
    peakGyroIndex,
  }
}

function getShotSimulationMetrics(shot, imuSummary) {
  if (imuSummary) {
    return {
      power: Math.min(100, Math.round(imuSummary.peakGyro / 6.1)),
      accelPeak: Number(imuSummary.peakAccel.toFixed(2)),
      gyroPeak: Math.round(imuSummary.peakGyro),
      duration: Math.round(imuSummary.duration),
      impactOffset: Math.round(imuSummary.impactOffset),
      samples: imuSummary.samples,
      source: 'Real IMU',
    }
  }

  const power = Number(shot?.[3] || 0)
  const shotType = shot?.[1] || 'Shot'
  const accelPeak = Number((0.82 + power / 82).toFixed(2))
  const gyroPeak = Math.round(70 + power * 2.25)
  const duration = shotType === 'Smash' ? 920 : shotType === 'Drive' ? 760 : 1120
  const impactOffset = Math.round(duration * 0.64)

  return {
    power,
    accelPeak,
    gyroPeak,
    duration,
    impactOffset,
    samples: 0,
    source: 'Estimated',
  }
}

function SwingSimulationPanel({ player, shots, imuSamples = [] }) {
  const mountRef = useRef(null)
  const selectedShot = shots[0] || recentShots[0]
  const activeShot = selectedShot
  const [selectedSampleStart, setSelectedSampleStart] = useState(0)
  const [frameInfo, setFrameInfo] = useState(null)
  const activeSamples = imuSamples
  const sampleRows = useMemo(() => activeSamples.map((sample, index) => ({
    index,
    sampleNo: index + 1,
    time: Math.round(sample.pc_elapsed_ms - activeSamples[0].pc_elapsed_ms),
    accel: sample.accel_mag_g.toFixed(2),
    gyro: Math.round(sample.gyro_mag_dps),
  })), [activeSamples])
  const imuSummary = getImuSummary(activeSamples)
  const metrics = getShotSimulationMetrics(activeShot, imuSummary)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x07121d)
    scene.fog = new THREE.Fog(0x07121d, 4, 13)

    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 100)
    camera.position.set(0, 1.42, 4.3)
    camera.lookAt(0.05, 1.06, 0.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xd9f8ff, 0x08111b, 2.15))
    const rimLight = new THREE.DirectionalLight(0x5fe5ff, 2.4)
    rimLight.position.set(-2, 3, 4)
    scene.add(rimLight)
    const impactLight = new THREE.PointLight(0x24eca4, 0, 5)
    impactLight.position.set(0.6, 1.58, 0.18)
    scene.add(impactLight)

    const grid = new THREE.GridHelper(8, 12, 0x12354b, 0x0d2536)
    grid.position.y = -0.04
    scene.add(grid)

    const materialSkin = new THREE.MeshStandardMaterial({ color: 0x2b6fb8, roughness: 0.42, metalness: 0.08 })
    const materialGrip = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.78, metalness: 0.22 })
    const materialShaft = new THREE.MeshStandardMaterial({ color: 0xc8f3ff, roughness: 0.22, metalness: 0.65 })
    const materialFrame = new THREE.MeshStandardMaterial({ color: 0x72eaff, roughness: 0.2, metalness: 0.55 })
    const materialString = new THREE.MeshBasicMaterial({ color: 0xa8f4ff, transparent: true, opacity: 0.36 })
    const materialTrail = new THREE.MeshBasicMaterial({ color: 0x24eca4, transparent: true, opacity: 0.24 })
    const materialImpact = new THREE.MeshBasicMaterial({ color: 0x24eca4 })

    const arm = new THREE.Group()
    scene.add(arm)

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 24), materialSkin)
    forearm.rotation.z = -0.52
    forearm.rotation.x = 0.2
    forearm.position.set(-0.42, 0.75, 1.42)
    arm.add(forearm)

    const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), materialSkin)
    wrist.position.set(-0.06, 1.08, 1.02)
    arm.add(wrist)

    const racket = new THREE.Group()
    racket.position.set(0, 1.1, 0.95)
    arm.add(racket)

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.68, 24), materialGrip)
    grip.rotation.z = -0.72
    grip.position.set(0.22, -0.2, 0)
    racket.add(grip)

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.021, 1.35, 18), materialShaft)
    shaft.rotation.z = -0.72
    shaft.position.set(0.58, 0.28, -0.05)
    racket.add(shaft)

    const head = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 16, 80), materialFrame)
    head.scale.set(0.8, 1.22, 0.08)
    head.rotation.z = -0.72
    head.position.set(1.02, 0.82, -0.12)
    racket.add(head)

    const strings = new THREE.Group()
    for (let index = -3; index <= 3; index += 1) {
      const string = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.58, 0.003), materialString)
      string.position.x = index * 0.055
      strings.add(string)
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.006, 0.003), materialString)
      cross.position.y = index * 0.07
      strings.add(cross)
    }
    strings.rotation.z = -0.72
    strings.position.set(1.02, 0.82, -0.12)
    racket.add(strings)

    const trail = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 10, 70, Math.PI * 1.2), materialTrail)
    trail.scale.set(1, 0.52, 0.08)
    trail.rotation.set(0.22, 0.15, -0.35)
    trail.position.set(0.62, 1.24, 0.45)
    scene.add(trail)

    const shuttle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), materialImpact)
    shuttle.position.set(0.82, 1.58, 0.24)
    scene.add(shuttle)

    const clock = new THREE.Clock()
    let animationFrame = 0
    let lastUiUpdateTime = -1
    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(mount)

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      const phase = (elapsed % 2.8) / 2.8
      const swing = Math.sin(phase * Math.PI)
      const sampleIndex = activeSamples.length ? (selectedSampleStart + Math.floor(phase * activeSamples.length)) % activeSamples.length : 0
      const sample = activeSamples[sampleIndex]
      const impactIndex = imuSummary ? (imuSummary.peakGyroIndex - selectedSampleStart + activeSamples.length) % activeSamples.length : 0
      const impactPhase = imuSummary ? impactIndex / Math.max(activeSamples.length - 1, 1) : 0.64
      const snap = Math.max(0, 1 - Math.abs(phase - impactPhase) * 14)
      const gx = sample ? sample.gx_dps / Math.max(metrics.gyroPeak, 1) : 0
      const gy = sample ? sample.gy_dps / Math.max(metrics.gyroPeak, 1) : 0
      const gz = sample ? sample.gz_dps / Math.max(metrics.gyroPeak, 1) : 0
      const accelFactor = sample ? Math.min(sample.accel_mag_g / Math.max(metrics.accelPeak, 1), 1) : swing

      arm.rotation.y = -0.32
      arm.rotation.x = -0.08
      racket.rotation.x = gx * 0.85
      racket.rotation.y = 0.18 + gy * 0.9
      racket.rotation.z = -0.52 + gz * 1.35
      trail.material.opacity = 0.08 + accelFactor * 0.34
      impactLight.intensity = snap * 3.8
      shuttle.scale.setScalar(1 + snap * 1.8)
      shuttle.material.color.setHex(snap > 0.2 ? 0x24eca4 : 0x5fe5ff)

      if (sample && elapsed - lastUiUpdateTime > 0.16) {
        lastUiUpdateTime = elapsed
        setFrameInfo({
          sampleIndex: sampleIndex + 1,
          timestamp: Math.round(sample.pc_elapsed_ms - activeSamples[0].pc_elapsed_ms),
          gx: Math.round(sample.gx_dps),
          gy: Math.round(sample.gy_dps),
          gz: Math.round(sample.gz_dps),
          accel: sample.accel_mag_g.toFixed(2),
          gyro: Math.round(sample.gyro_mag_dps),
        })
      }

      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      mount.removeChild(renderer.domElement)
      renderer.dispose()
      scene.traverse((object) => {
        if (!object.isMesh) return
        object.geometry?.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material?.dispose())
      })
    }
  }, [activeSamples, activeShot, imuSummary, metrics.accelPeak, metrics.gyroPeak, metrics.power, selectedSampleStart])

  return (
    <section className="simulationPanel" aria-label="3D swing simulation">
      <div className="simulationHeader">
        <div>
          <span>3D Replay</span>
          <h2>Racket-mounted IMU Replay</h2>
          <p>Using real IMU data from the sensor attached to the racket. Each row is one sensor sample; click a sample to start replay from that row.</p>
        </div>
        <div className="simulationPlayer">
          <b>{player.name}</b>
          <span>{metrics.source} · {metrics.samples || 0} samples</span>
        </div>
      </div>

      <div className="simulationBody">
        <div className="simulationRows">
          {sampleRows.map((sample) => {
            const isCurrent = frameInfo?.sampleIndex === sample.sampleNo

            return (
              <button
                className={isCurrent || selectedSampleStart === sample.index ? 'active' : ''}
                type="button"
                onClick={() => setSelectedSampleStart(sample.index)}
                key={sample.sampleNo}
              >
                <span>row {sample.sampleNo}</span>
                <b>{sample.time}ms</b>
                <em className={sample.gyro > 300 ? 'green' : sample.gyro > 120 ? 'cyan' : 'orange'}>gyro {sample.gyro}</em>
                <strong>{sample.accel}</strong>
                <small>accel g</small>
              </button>
            )
          })}
        </div>

        <div className="simulationStage">
          <div className="threeViewport" ref={mountRef} />
          <div className="simulationHud">
            <span>Racket IMU sample</span>
            <b>{frameInfo ? `row ${frameInfo.sampleIndex}` : 'loading sample'}</b>
            <small>Replay start row {selectedSampleStart + 1} · {activeSamples.length} samples total</small>
            <dl>
              <div><dt>t</dt><dd>{frameInfo?.timestamp ?? 0}ms</dd></div>
              <div><dt>gx</dt><dd>{frameInfo?.gx ?? 0}</dd></div>
              <div><dt>gy</dt><dd>{frameInfo?.gy ?? 0}</dd></div>
              <div><dt>gz</dt><dd>{frameInfo?.gz ?? 0}</dd></div>
              <div><dt>accel</dt><dd>{frameInfo?.accel ?? '0.00'}g</dd></div>
              <div><dt>gyro</dt><dd>{frameInfo?.gyro ?? 0}</dd></div>
            </dl>
          </div>
        </div>

        <div className="simulationMetrics">
          <div>
            <span>Power</span>
            <b>{metrics.power}<small>/100</small></b>
            <i><span style={{ width: `${metrics.power}%` }} /></i>
          </div>
          <div>
            <span>Gyro Peak</span>
            <b>{metrics.gyroPeak}<small>dps</small></b>
            <i><span style={{ width: `${Math.min(metrics.gyroPeak / 3.1, 100)}%` }} /></i>
          </div>
          <div>
            <span>Accel Peak</span>
            <b>{metrics.accelPeak}<small>g</small></b>
            <i><span style={{ width: `${Math.min(metrics.accelPeak * 34, 100)}%` }} /></i>
          </div>
          <div>
            <span>Impact</span>
            <b>{metrics.impactOffset}<small>ms</small></b>
            <i><span style={{ width: `${Math.min(metrics.impactOffset / metrics.duration * 100, 100)}%` }} /></i>
          </div>
        </div>
      </div>
    </section>
  )
}

function buildWavePath(samples, key, maxValue, width = 680, height = 220) {
  if (!samples.length || !maxValue) return ''

  return samples
    .map((sample, index) => {
      const x = (index / Math.max(samples.length - 1, 1)) * width
      const y = height - (sample[key] / maxValue) * (height - 28) - 14
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function getConsistencyScore(samples) {
  if (samples.length < 2) return 0

  const gyroValues = samples.map((sample) => sample.gyro_mag_dps)
  const mean = gyroValues.reduce((total, value) => total + value, 0) / gyroValues.length
  const variance = gyroValues.reduce((total, value) => total + (value - mean) ** 2, 0) / gyroValues.length
  const coefficient = Math.sqrt(variance) / Math.max(mean, 1)
  return Math.max(0, Math.min(100, Math.round(100 - coefficient * 38)))
}

function ConsistencyWaveformPanel({ player, imuSamples = [] }) {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0)
  const summary = getImuSummary(imuSamples)
  const selectedSample = imuSamples[selectedSampleIndex] || imuSamples[0]
  const consistencyScore = getConsistencyScore(imuSamples)
  const sampleRows = useMemo(() => imuSamples.map((sample, index) => ({
    index,
    sampleNo: index + 1,
    time: Math.round(sample.pc_elapsed_ms - imuSamples[0].pc_elapsed_ms),
    accel: sample.accel_mag_g.toFixed(2),
    gyro: Math.round(sample.gyro_mag_dps),
  })), [imuSamples])
  const maxGyro = Math.max(...imuSamples.map((sample) => sample.gyro_mag_dps), 1)
  const maxAccel = Math.max(...imuSamples.map((sample) => sample.accel_mag_g), 1)
  const gyroPath = buildWavePath(imuSamples, 'gyro_mag_dps', maxGyro)
  const accelPath = buildWavePath(imuSamples, 'accel_mag_g', maxAccel)
  const peakX = summary ? (summary.peakGyroIndex / Math.max(imuSamples.length - 1, 1)) * 680 : 0
  const selectedX = (selectedSampleIndex / Math.max(imuSamples.length - 1, 1)) * 680
  const selectedTime = selectedSample ? Math.round(selectedSample.pc_elapsed_ms - imuSamples[0].pc_elapsed_ms) : 0

  return (
    <section className="simulationPanel" aria-label="Consistency waveform analysis">
      <div className="simulationHeader">
        <div>
          <span>Racket IMU</span>
          <h2>Consistency Waveform</h2>
          <p>Waveform from the racket-mounted IMU. Each row is one sensor sample; click a sample to inspect the exact gyro and acceleration values.</p>
        </div>
        <div className="simulationPlayer">
          <b>{player.name}</b>
          <span>Real IMU · {summary?.samples || 0} samples</span>
        </div>
      </div>

      <div className="simulationBody">
        <div className="simulationRows">
          {sampleRows.map((sample) => (
            <button
              className={selectedSampleIndex === sample.index ? 'active' : ''}
              type="button"
              onClick={() => setSelectedSampleIndex(sample.index)}
              key={sample.sampleNo}
            >
              <span>row {sample.sampleNo}</span>
              <b>{sample.time}ms</b>
              <em className={sample.gyro > 300 ? 'green' : sample.gyro > 120 ? 'cyan' : 'orange'}>gyro {sample.gyro}</em>
              <strong>{sample.accel}</strong>
              <small>accel g</small>
            </button>
          ))}
        </div>

        <div className="waveformStage">
          <svg className="waveformChart" viewBox="0 0 680 220" role="img" aria-label="Gyro and acceleration waveform">
            <defs>
              <linearGradient id="waveFill" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#28d7f5" />
                <stop offset="100%" stopColor="#29e38c" />
              </linearGradient>
            </defs>
            {[44, 88, 132, 176].map((y) => <line className="gridLine" x1="0" x2="680" y1={y} y2={y} key={y} />)}
            {[170, 340, 510].map((x) => <line className="gridLine" x1={x} x2={x} y1="0" y2="220" key={x} />)}
            <path className="accelWave" d={accelPath} />
            <path className="gyroWave" d={gyroPath} />
            <line className="impactMarker" x1={peakX} x2={peakX} y1="0" y2="220" />
            <line className="selectedMarker" x1={selectedX} x2={selectedX} y1="0" y2="220" />
          </svg>
          <div className="waveformLegend">
            <span><i className="gyroKey" />gyro magnitude</span>
            <span><i className="accelKey" />acceleration magnitude</span>
            <span><i className="impactKey" />impact candidate</span>
          </div>
          <div className="simulationHud">
            <span>Selected IMU sample</span>
            <b>row {selectedSampleIndex + 1}</b>
            <small>{selectedTime}ms from start</small>
            <dl>
              <div><dt>gx</dt><dd>{Math.round(selectedSample?.gx_dps || 0)}</dd></div>
              <div><dt>gy</dt><dd>{Math.round(selectedSample?.gy_dps || 0)}</dd></div>
              <div><dt>gz</dt><dd>{Math.round(selectedSample?.gz_dps || 0)}</dd></div>
              <div><dt>accel</dt><dd>{selectedSample?.accel_mag_g.toFixed(2) || '0.00'}g</dd></div>
              <div><dt>gyro</dt><dd>{Math.round(selectedSample?.gyro_mag_dps || 0)}</dd></div>
              <div><dt>score</dt><dd>{consistencyScore}</dd></div>
            </dl>
          </div>
        </div>

        <div className="simulationMetrics">
          <div>
            <span>Consistency</span>
            <b>{consistencyScore}<small>/100</small></b>
            <i><span style={{ width: `${consistencyScore}%` }} /></i>
          </div>
          <div>
            <span>Gyro Peak</span>
            <b>{Math.round(summary?.peakGyro || 0)}<small>dps</small></b>
            <i><span style={{ width: `${Math.min((summary?.peakGyro || 0) / 6, 100)}%` }} /></i>
          </div>
          <div>
            <span>Accel Peak</span>
            <b>{summary?.peakAccel.toFixed(2) || '0.00'}<small>g</small></b>
            <i><span style={{ width: `${Math.min((summary?.peakAccel || 0) * 20, 100)}%` }} /></i>
          </div>
          <div>
            <span>Impact Candidate</span>
            <b>{Math.round(summary?.impactOffset || 0)}<small>ms</small></b>
            <i><span style={{ width: `${Math.min(((summary?.impactOffset || 0) / Math.max(summary?.duration || 1, 1)) * 100, 100)}%` }} /></i>
          </div>
        </div>
      </div>
    </section>
  )
}

function OverviewPage({
  categories,
  geminiState,
  isGeminiConnecting,
  onCategoryClick,
  onGeminiConnect,
  onSummaryClick,
}) {
  return (
    <section className="overviewPage" aria-label="Dashboard overview">
      <div className="summaryEntry">
        <div className="summaryEntryContent">
          <h2>Session snapshot</h2>
          <p>Scores, shots, advice, IMU and intensity graph in one view.</p>
        </div>
        <button type="button" onClick={onSummaryClick}>
          <ChartNoAxesCombined size={18} />
          Summary
        </button>
      </div>

      <section className="overviewPanel" aria-label="Gemini session analysis">
        <div className="overviewPanelHeader">
          <div>
            <h3>Gemini analysis</h3>
            <p>Analyze the current session with Gemini Flash.</p>
          </div>
          <button type="button" onClick={onGeminiConnect} disabled={isGeminiConnecting}>
            <Sparkles size={18} />
            {isGeminiConnecting ? 'Analyzing...' : 'Analyze with Gemini'}
          </button>
        </div>
        <div className="geminiStatusRow" aria-live="polite">
          <span className={`geminiStatusDot ${geminiState.tone}`} />
          <b>{geminiState.label}</b>
          <small>{geminiState.message}</small>
        </div>
        {geminiState.reply && (
          <div className="geminiReply">
            <span>Session analysis</span>
            <p>{geminiState.reply}</p>
          </div>
        )}
      </section>

      <div className="categoryGrid" aria-label="Dashboard categories">
        {categories.map((item) => (
          <CategoryCard item={item} key={item.id} onClick={() => onCategoryClick(item.id)} />
        ))}
      </div>
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
  const [selectedPlayerId, setSelectedPlayerId] = useState(realPlayers[0].id)
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedVisualizationId, setSelectedVisualizationId] = useState(null)
  const [receiverEvents, setReceiverEvents] = useState([])
  const [receiverStatus, setReceiverStatus] = useState('Loading receiver data file...')
  const [isGeminiConnecting, setIsGeminiConnecting] = useState(false)
  const [geminiState, setGeminiState] = useState({
    tone: 'idle',
    label: 'Ready',
    message: 'No Gemini connection yet.',
    reply: '',
  })
  useEffect(() => {
    let isMounted = true

    async function loadReceiverFile() {
      try {
        const response = await fetch(`${RECEIVER_SESSION_URL}?t=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Receiver file not found: ${RECEIVER_SESSION_URL}`)
        }

        const text = await response.text()
        const rawEvents = parseReceiverJsonl(text)
        const events = dedupeReceiverEvents(rawEvents)
        if (!isMounted) return

        setReceiverEvents(events)
        setReceiverStatus(events.length
          ? `${events.length} receiver events loaded${rawEvents.length !== events.length ? ` (${rawEvents.length - events.length} duplicates hidden).` : '.'}`
          : 'Receiver file is empty.')
      } catch (error) {
        if (!isMounted) return
        setReceiverEvents([])
        setReceiverStatus(error instanceof Error ? error.message : 'Receiver data file is not available yet.')
      }
    }

    loadReceiverFile()
    const intervalId = window.setInterval(loadReceiverFile, 3000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const currentData = useMemo(
    () => createReceiverSessionDataset(receiverEvents, receiverStatus),
    [receiverEvents, receiverStatus],
  )
  const currentIntensityRows = useMemo(
    () => createReceiverIntensityRows(receiverEvents),
    [receiverEvents],
  )
  const selectedPlayer = useMemo(() => ({
    ...realPlayers.find((player) => player.id === selectedPlayerId) || realPlayers[0],
    baseline: currentData.summaryItems.find(([label]) => label === 'Consistency')?.[1] || NA,
  }), [currentData, selectedPlayerId])
  const categories = getCategories(currentData, currentIntensityRows)
  const overviewCategories = useMemo(
    () => categories.filter((item) => !HIDDEN_OVERVIEW_CATEGORIES.has(item.id)),
    [categories],
  )
  const summaryCategory = {
    id: 'summary',
    kicker: 'Summary',
    title: 'Session Summary',
    description: 'All key dashboard outputs in one view, including IMU swing intensity and acceleration graph.',
    content: <DashboardSummary player={selectedPlayer} data={currentData} intensityRows={currentIntensityRows} />,
  }
  const selectedCategory = selectedId === 'summary'
    ? summaryCategory
    : categories.find((item) => item.id === selectedId)
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
  const handleCategoryClick = (id) => {
    const category = categories.find((c) => c.id === id)
    if (category?.navigate) {
      setActivePage(category.navigate)
    } else {
      setSelectedId(id)
    }
  }
  const handleGeminiConnect = async () => {
    setIsGeminiConnecting(true)
    setGeminiState({
      tone: 'pending',
      label: 'Analyzing',
      message: `Sending current session data to ${GEMINI_FLASH_MODEL}.`,
      reply: '',
    })

    try {
      const sessionPayload = {
        timer: currentData.timer,
        drill: currentData.drill,
        targetShots: currentData.targetShots,
        bestDate: currentData.bestDate,
        scores: currentData.scores.map(({ label, value, note }) => ({ label, value, note })),
        formStats: currentData.formStats.map(([label, note, value, tone]) => ({ label, note, value, tone })),
        summary: currentData.summaryItems.map(([label, value, note]) => ({ label, value, note })),
        recentShots: currentData.recentShots.map(([id, shot, result, timing, time]) => ({
          id,
          shot,
          result,
          timing,
          time,
        })),
        coachAdvice: currentData.advice,
        swingIntensity: currentIntensityRows.slice(0, 12).map((row) => ({
          id: row.id,
          category: row.category,
          shotNo: row.shotNo,
          peakGyro: row.peakGyro,
          peakAccel: row.peakAccel,
          intensity: row.intensity,
          level: row.level,
          impactMs: row.impactMs,
        })),
      }
      const response = await fetch('/api/gemini-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GEMINI_FLASH_MODEL,
          player: selectedPlayer.name,
          session: sessionPayload,
          systemPrompt: overviewPromptText,
        }),
      })
      const responseText = await response.text()
      let payload = null
      try {
        payload = responseText ? JSON.parse(responseText) : null
      } catch {
        payload = null
      }

      if (!response.ok || !payload?.ok) {
        if (response.status === 404) {
          setGeminiState({
            tone: 'success',
            label: 'Local analysis',
            message: 'Gemini API route is not running in the current Vite dev server.',
            reply: buildLocalSessionAnalysis(sessionPayload, selectedPlayer.name),
          })
          return
        }

        throw new Error(payload?.error || responseText || `Gemini API returned HTTP ${response.status}.`)
      }

      setGeminiState({
        tone: 'success',
        label: 'Connected',
        message: payload.model || GEMINI_FLASH_MODEL,
        reply: payload.reply || '',
      })
    } catch (error) {
      setGeminiState({
        tone: 'error',
        label: 'Connection failed',
        message: error instanceof Error ? error.message : 'Gemini connection failed.',
        reply: '',
      })
    } finally {
      setIsGeminiConnecting(false)
    }
  }

  return (
    <div className={`appShell ${hasOverlay ? 'isBlurred' : ''}`}>
      <div className="app">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
        <main className="main">
          <Header
            activePage={activePage}
            selectedPlayer={selectedPlayer}
            playerOptions={realPlayers}
            isPlayerMenuOpen={isPlayerMenuOpen}
            onTogglePlayerMenu={() => setIsPlayerMenuOpen((isOpen) => !isOpen)}
            onSelectPlayer={handleSelectPlayer}
          />
          {activePage === 'overview' ? (
            <OverviewPage
              categories={overviewCategories}
              geminiState={geminiState}
              isGeminiConnecting={isGeminiConnecting}
              onCategoryClick={handleCategoryClick}
              onGeminiConnect={handleGeminiConnect}
              onSummaryClick={() => setSelectedId('summary')}
            />
          ) : activePage === 'training-form' ? (
            <TrainingFormPage onBack={() => setActivePage('overview')} />
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


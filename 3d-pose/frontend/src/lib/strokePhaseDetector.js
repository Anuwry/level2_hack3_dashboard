/**
 * Pose-based forehand clear phase segmentation.
 *
 * Uses only velocity + elbow angle — no hardcoded frame counts, no Y extrema.
 * Works on any FPS / clip length.
 *
 * MediaPipe world coords: X=right, Y=down, Z=forward(into camera)
 */

function vec3(a, b)    { return [b[0]-a[0], b[1]-a[1], b[2]-a[2]] }
function mag(v)        { return Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2) }
function dot(a, b)     { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }

function angleBetween(a, b, c) {
  const ab = vec3(a, b), bc = vec3(b, c)
  const ma = mag(ab), mb = mag(bc)
  if (ma < 1e-6 || mb < 1e-6) return Math.PI
  return Math.acos(Math.max(-1, Math.min(1, dot(ab, bc) / (ma * mb))))
}

function gaussSmooth(arr, w = 2) {
  return arr.map((_, i) => {
    let sum = 0, weight = 0
    for (let j = Math.max(0, i - w); j <= Math.min(arr.length - 1, i + w); j++) {
      const g = Math.exp(-0.5 * ((j - i) / w) ** 2)
      sum += arr[j] * g
      weight += g
    }
    return sum / weight
  })
}

/** Find index of first local max before `limit` using a minimum prominence. */
function lastLocalMax(arr, limit, minProminence = 0) {
  let bestIdx = 0, bestVal = -Infinity
  for (let i = 1; i < limit - 1; i++) {
    if (arr[i] >= arr[i - 1] && arr[i] >= arr[i + 1] && arr[i] > bestVal) {
      bestIdx = i
      bestVal = arr[i]
    }
  }
  return bestVal - arr[0] >= minProminence ? bestIdx : 0
}

export const PHASE_COLORS = {
  preparation:   '#64748b',  // slate
  backswing:     '#3b82f6',  // blue
  acceleration:  '#f59e0b',  // amber
  impact:        '#ef4444',  // red
  followThrough: '#22c55e',  // green
}

export const PHASE_LABELS = {
  preparation:   'Prep',
  backswing:     'Backswing',
  acceleration:  'Accel',
  impact:        'Impact',
  followThrough: 'Follow',
}

/**
 * Detect forehand clear phases from an array of frame objects with keypoints_17.
 *
 * @param {Array<{keypoints_17: object}>} frames
 * @param {'right'|'left'} hand - dominant hand (default: 'right')
 * @returns {{ keyFrames, phases, signals, phaseAtFrame }} | null
 */
export function detectForehandPhases(frames, hand = 'right') {
  if (!frames?.length) return null
  const side = hand === 'right' ? 'Right' : 'Left'

  const N = frames.length
  const kps = frames.map(f => f.keypoints_17 ?? {})

  const wrists    = kps.map(kp => kp[`${side}Hand`])
  const forearms  = kps.map(kp => kp[`${side}ForeArm`])
  const upperarms = kps.map(kp => kp[`${side}Arm`])

  if (wrists.filter(Boolean).length < Math.min(5, N)) return null

  // Wrist speed (frame-to-frame Euclidean distance)
  const rawVel = wrists.map((w, i) => {
    if (!w || !wrists[i - 1]) return 0
    return mag(vec3(wrists[i - 1], w))
  })

  // Elbow angle (upper arm → forearm → wrist)
  const rawElbow = kps.map((_, i) => {
    const ua = upperarms[i], fa = forearms[i], w = wrists[i]
    if (!ua || !fa || !w) return Math.PI
    return angleBetween(ua, fa, w)
  })

  const velocity    = gaussSmooth(rawVel,   2)
  const elbowAngles = gaussSmooth(rawElbow, 2)

  // ── Impact: frame of maximum wrist speed ──────────────────────────────────
  let impactFrame = 1, maxVel = 0
  for (let i = 1; i < N; i++) {
    if (velocity[i] > maxVel) { maxVel = velocity[i]; impactFrame = i }
  }

  // ── Backswing peak: min elbow angle before impact (arm most bent) ─────────
  let backswingPeak = 0, minElbow = Infinity
  for (let i = 0; i < impactFrame; i++) {
    if (elbowAngles[i] < minElbow) { minElbow = elbowAngles[i]; backswingPeak = i }
  }
  if (backswingPeak === impactFrame) backswingPeak = Math.max(0, impactFrame - 1)

  // ── Backswing start: last local max of elbow angle before backswingPeak ───
  const backswingStart = lastLocalMax(elbowAngles, backswingPeak, 0.05)

  // ── Follow-through end: first frame after impact where velocity < 20 % max
  const velFloor = maxVel * 0.2
  let followEnd = N - 1
  for (let i = impactFrame + 1; i < N; i++) {
    if (velocity[i] < velFloor) { followEnd = i; break }
  }

  const keyFrames = { backswingStart, backswingPeak, impact: impactFrame, followEnd }

  const phases = {
    preparation:   { start: 0,              end: backswingStart },
    backswing:     { start: backswingStart,  end: backswingPeak  },
    acceleration:  { start: backswingPeak,   end: impactFrame    },
    impact:        { start: impactFrame,     end: impactFrame    },
    followThrough: { start: impactFrame,     end: followEnd      },
  }

  // Lookup: frame index → phase key
  const phaseAtFrame = new Array(N)
  const order = ['preparation', 'backswing', 'acceleration', 'followThrough']
  for (let i = 0; i < N; i++) {
    if (i >= impactFrame && i <= followEnd)      phaseAtFrame[i] = 'followThrough'
    else if (i === impactFrame)                  phaseAtFrame[i] = 'impact'
    else if (i >= backswingPeak)                 phaseAtFrame[i] = 'acceleration'
    else if (i >= backswingStart)                phaseAtFrame[i] = 'backswing'
    else                                         phaseAtFrame[i] = 'preparation'
  }
  // correct impact exact frame
  phaseAtFrame[impactFrame] = 'impact'

  return { keyFrames, phases, signals: { velocity, elbowAngles }, phaseAtFrame }
}

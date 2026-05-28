export const MATCH_THRESHOLD = 0.78

export const JOINT_NAMES_17 = [
  'Hips', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot',
  'RightUpLeg', 'RightLeg', 'RightFoot',
]

/**
 * Joint weights for stroke-specific matching.
 *
 * Hips = 0 always: after normalizePose(), Hips is always [0,0,0] for both
 * poses, so distance is always 0 → score always 100% → misleading and inflating.
 *
 * Spine1 = 0: it's lerp(Hips, Neck, 0.33), very close to Hips, barely moves.
 */
export const STROKE_WEIGHTS = {
  forehand_right: {
    Hips:         0,    // always [0,0,0] after normalization — skip
    Spine1:       0,    // near-Hips derived joint — skip
    Spine2:       1.5,
    Neck:         1.5,
    Head:         0.5,
    RightArm:     3.0,
    RightForeArm: 3.0,
    RightHand:    4.0,  // wrist: most critical for stroke technique
    LeftArm:      0.8,
    LeftForeArm:  0.5,
    LeftHand:     0.5,
    RightUpLeg:   1.0,
    RightLeg:     0.5,
    RightFoot:    0.3,
    LeftUpLeg:    0.8,
    LeftLeg:      0.5,
    LeftFoot:     0.3,
  },
  forehand_left: {
    Hips:         0,
    Spine1:       0,
    Spine2:       1.5,
    Neck:         1.5,
    Head:         0.5,
    LeftArm:      3.0,
    LeftForeArm:  3.0,
    LeftHand:     4.0,
    RightArm:     0.8,
    RightForeArm: 0.5,
    RightHand:    0.5,
    LeftUpLeg:    1.0,
    LeftLeg:      0.5,
    LeftFoot:     0.3,
    RightUpLeg:   0.8,
    RightLeg:     0.5,
    RightFoot:    0.3,
  },
  // uniform but still drops always-trivial joints
  default: {
    Hips:         0,
    Spine1:       0,
    Spine2:       1,
    Neck:         1,
    Head:         0.5,
    RightArm:     1, RightForeArm: 1, RightHand: 1,
    LeftArm:      1, LeftForeArm:  1, LeftHand:  1,
    RightUpLeg:   1, RightLeg:     1, RightFoot: 1,
    LeftUpLeg:    1, LeftLeg:      1, LeftFoot:  1,
  },
}

/** Pick weights from label name/metadata. Falls back to default (no Hips/Spine1). */
export function getStrokeWeights(label) {
  const name = (label?.name || '').toLowerCase()
  const hasClear    = name.includes('clear') || name.includes('smash') || name.includes('drop')
  const hasForehand = name.includes('forehand') || name.includes('fore')
  const hasRight    = name.includes('right') || (!name.includes('left') && hasClear)
  const hasLeft     = name.includes('left')

  if (hasForehand && hasLeft)  return STROKE_WEIGHTS.forehand_left
  if (hasForehand || hasRight) return STROKE_WEIGHTS.forehand_right
  return STROKE_WEIGHTS.default
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export function normalizePose(kp) {
  if (!kp?.Hips) return null
  const hips = kp.Hips
  let scale = 0
  for (const [a, b] of [['Hips', 'Neck'], ['LeftArm', 'RightArm'], ['LeftUpLeg', 'RightUpLeg']]) {
    if (kp[a] && kp[b]) {
      scale = distance3(kp[a], kp[b])
      if (scale > 1e-6) break
    }
  }
  if (!scale) scale = 1

  const out = {}
  for (const name of JOINT_NAMES_17) {
    const p = kp[name]
    if (Array.isArray(p) && p.length >= 3) {
      out[name] = [
        (p[0] - hips[0]) / scale,
        (p[1] - hips[1]) / scale,
        (p[2] - hips[2]) / scale,
      ]
    }
  }
  return Object.keys(out).length >= 8 ? out : null
}

/** weights: optional object {JointName: number}. 0 = skip joint. */
export function poseSimilarity(a, b, weights = null) {
  if (!a || !b) return 0
  let total = 0, wTotal = 0
  for (const name of JOINT_NAMES_17) {
    if (!a[name] || !b[name]) continue
    const w = weights ? (weights[name] ?? 1) : 1
    if (w <= 0) continue
    total  += distance3(a[name], b[name]) * w
    wTotal += w
  }
  if (wTotal < 2) return 0
  return 1 / (1 + total / wTotal)
}

function eventKey(labelId, frameIndex) {
  return `${labelId}:${frameIndex}`
}

export function matchLabelsToFrames(labels, frames, threshold = MATCH_THRESHOLD) {
  const normalizedFrames = frames
    .map((fd, i) => ({
      frame: fd,
      index: fd.frame_index ?? i,
      pose: normalizePose(fd.keypoints_17),
      visibility: fd.pose_visibility_mean ?? 1,
    }))
    .filter(item => item.pose && item.visibility >= 0.4)

  const events = []
  const seen = new Set()

  for (const label of labels) {
    const seq = (label.normalized_sequence || []).map(item => item.pose).filter(Boolean)
    if (!seq.length) continue
    const weights = getStrokeWeights(label)

    // Score each session frame: best similarity against ANY pose in the label sequence.
    // This makes matching speed-invariant — it finds the stroke regardless of how fast
    // the player performed it relative to the reference clip.
    const hitFrames = []
    for (const nf of normalizedFrames) {
      let best = 0
      for (const lp of seq) {
        const s = poseSimilarity(nf.pose, lp, weights)
        if (s > best) best = s
        if (best > 0.99) break
      }
      if (best >= threshold) {
        hitFrames.push({ index: nf.index, score: best, frame: nf.frame })
      }
    }
    if (!hitFrames.length) continue

    // Merge consecutive hit frames into events; allow small gaps between hits
    const cooldown = Math.max(5, Math.floor(seq.length * 0.5))
    const GAP      = Math.max(3, Math.floor(cooldown / 3))
    let gi = 0
    while (gi < hitFrames.length) {
      let ge = gi
      while (
        ge + 1 < hitFrames.length &&
        hitFrames[ge + 1].index - hitFrames[ge].index <= GAP
      ) ge++

      const group   = hitFrames.slice(gi, ge + 1)
      const peakHit = group.reduce((b, h) => h.score > b.score ? h : b)
      const halfDur = Math.floor(seq.length / 2)
      const startFi = Math.max(0, peakHit.index - halfDur)
      const endFi   = peakHit.index + (seq.length - halfDur)

      const key = eventKey(label.label_id, peakHit.index)
      if (!seen.has(key)) {
        seen.add(key)
        events.push({
          id: `auto-${label.label_id}-${startFi}`,
          label_id: label.label_id,
          frame_index: startFi,
          start_frame: startFi,
          end_frame: endFi,
          timestamp_ms: group[0].frame.timestamp_ms ?? 0,
          label: label.name,
          stroke_type: label.label_id,
          color: label.color || '#f59e0b',
          source: 'auto_similarity',
          score: Number(peakHit.score.toFixed(3)),
        })
      }
      gi = ge + 1
    }
  }

  return events.sort((a, b) => a.frame_index - b.frame_index)
}

export function matchLiveBuffer(labels, buffer, threshold = MATCH_THRESHOLD) {
  return matchLabelsToFrames(labels, buffer, threshold)
}

/**
 * DTW alignment: maps each label frame to a session frame monotonically.
 *
 * The greedy "best match per label frame" produces non-monotonic alignments —
 * consecutive label frames can both pick the same session frame because
 * adjacent poses are nearly identical. DTW enforces i ≤ j order so the
 * self-match case gives label[k] → session[k] and 100% scores.
 *
 * Returns array[label.length] of { labelIdx, sessionFrame, score, jointScores }.
 * Also attaches .sessionToLabel (Map: sessionFrameIndex → labelIdx) for
 * fast reverse-lookup of the active label frame during playback.
 */
export function computeStrokeAlignment(label, frames) {
  // Prefer raw keypoints_17 + JS normalizePose for bit-exact self-match;
  // fall back to backend-normalized sequence if frames are not available.
  const rawLabelFrames = label.frames?.filter(f => f.keypoints_17)
  const seq = rawLabelFrames?.length
    ? rawLabelFrames.map(f => normalizePose(f.keypoints_17)).filter(Boolean)
    : (label.normalized_sequence || []).map(item => item.pose).filter(Boolean)
  if (!seq.length) return []

  const weights = getStrokeWeights(label)

  const normFrames = frames
    .map((fd, i) => ({
      index: fd.frame_index ?? i,
      pose: normalizePose(fd.keypoints_17),
      vis: fd.pose_visibility_mean ?? 1,
    }))
    .filter(f => f.pose && f.vis >= 0.4)

  if (!normFrames.length) {
    return seq.map((_, i) => ({ labelIdx: i, sessionFrame: -1, score: 0, jointScores: null }))
  }

  const M = seq.length          // label frames
  const N = normFrames.length   // session frames

  // Cost matrix: 1 - similarity (lower = better match)
  // Compute incrementally to avoid O(M*N) object allocations
  const sim = (i, j) => poseSimilarity(normFrames[j].pose, seq[i], weights)

  // DTW table (use flat array for speed)
  const INF = 1e9
  const dtw = new Float32Array(M * N).fill(INF)
  const idx = (i, j) => i * N + j

  dtw[idx(0, 0)] = 1 - sim(0, 0)
  for (let j = 1; j < N; j++) dtw[idx(0, j)] = dtw[idx(0, j - 1)] + (1 - sim(0, j))
  for (let i = 1; i < M; i++) dtw[idx(i, 0)] = dtw[idx(i - 1, 0)] + (1 - sim(i, 0))
  for (let i = 1; i < M; i++) {
    for (let j = 1; j < N; j++) {
      const c = 1 - sim(i, j)
      dtw[idx(i, j)] = c + Math.min(
        dtw[idx(i - 1, j - 1)],  // both advance (diagonal)
        dtw[idx(i - 1, j)],       // label advances, session stays (stretch session)
        dtw[idx(i, j - 1)],       // session advances, label stays (stretch label)
      )
    }
  }

  // Traceback from (M-1, N-1) — builds path as [labelIdx, sessionIdx] pairs
  const path = []
  let i = M - 1, j = N - 1
  while (i > 0 || j > 0) {
    path.push([i, j])
    if (i === 0) { j--; continue }
    if (j === 0) { i--; continue }
    const diag = dtw[idx(i - 1, j - 1)]
    const up   = dtw[idx(i - 1, j)]
    const left = dtw[idx(i, j - 1)]
    const best = Math.min(diag, up, left)
    if (best === diag) { i--; j-- }
    else if (best === up) i--
    else j--
  }
  path.push([0, 0])
  path.reverse()

  // For each label frame, take the first session frame in the path
  const labelToSession = new Int32Array(M).fill(-1)
  for (const [li, si] of path) {
    if (labelToSession[li] === -1) labelToSession[li] = si
  }

  // Build reverse map: session frame index (actual) → label frame index
  const sessionToLabel = new Map()
  for (let li = 0; li < M; li++) {
    const si = labelToSession[li]
    if (si >= 0) sessionToLabel.set(normFrames[si].index, li)
  }

  // Build result with weighted scores and joint breakdowns (zero-weight joints excluded)
  const result = seq.map((labelPose, li) => {
    const si = labelToSession[li]
    if (si < 0) return { labelIdx: li, sessionFrame: -1, score: 0, jointScores: null }
    const nf  = normFrames[si]
    const s   = poseSimilarity(nf.pose, labelPose, weights)
    const jointScores = {}
    for (const name of JOINT_NAMES_17) {
      const w = weights ? (weights[name] ?? 1) : 1
      if (w <= 0) continue   // skip trivial joints (Hips always 0 dist, Spine1 near-trivial)
      const pa = nf.pose[name], pb = labelPose[name]
      if (pa && pb) jointScores[name] = 1 / (1 + distance3(pa, pb) * 2)
    }
    return { labelIdx: li, sessionFrame: nf.index, score: s, jointScores }
  })

  result.sessionToLabel = sessionToLabel  // attached for fast playback lookup
  return result
}

export function poseSimilarityDetailed(a, b, label = null) {
  if (!a || !b) return null
  const na = normalizePose(a), nb = normalizePose(b)
  if (!na || !nb) return null
  const weights = label ? getStrokeWeights(label) : STROKE_WEIGHTS.default
  const jointScores = {}
  let total = 0, wTotal = 0
  for (const name of JOINT_NAMES_17) {
    const w = weights[name] ?? 1
    if (w <= 0) continue
    const pa = na[name], pb = nb[name]
    if (!pa || !pb) continue
    const d = distance3(pa, pb)
    jointScores[name] = 1 / (1 + d * 2)
    total  += d * w
    wTotal += w
  }
  if (wTotal < 2) return null
  return { score: 1 / (1 + total / wTotal), jointScores }
}

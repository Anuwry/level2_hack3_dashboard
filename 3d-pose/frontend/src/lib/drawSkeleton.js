/**
 * Skeleton drawing helpers shared across CameraPage and SessionPage.
 *
 * drawSkeletonImage(canvas, imageKeypoints, isFlipped)
 *   imageKeypoints: { JointName: [x, y] } in normalized 0-1 image coords
 *   from MediaPipe pose_landmarks (image-space, accurate pixel mapping)
 *
 * drawSkeletonWorld(canvas, worldKeypoints, isFlipped)
 *   worldKeypoints: { JointName: [x, y, z] } MediaPipe world coords
 *   Approximate 2D projection used when only world coords are available.
 */

// Connections drawn for both modes — full chain including head and spine
export const SKELETON_CONNECTIONS = [
  ['Hips',   'Spine1'], ['Spine1', 'Spine2'], ['Spine2', 'Neck'], ['Neck', 'Head'],
  ['Neck',  'LeftArm'],  ['LeftArm',  'LeftForeArm'],  ['LeftForeArm',  'LeftHand'],
  ['Neck',  'RightArm'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'],
  ['Hips',  'LeftUpLeg'],  ['LeftUpLeg',  'LeftLeg'],  ['LeftLeg',  'LeftFoot'],
  ['Hips',  'RightUpLeg'], ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot'],
]

/** Lerp between two 2D points */
function lerp2(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/** Inject Spine1/Spine2 into a projected 2D point map if they're missing */
function injectSpine(projected) {
  if (!projected['Spine1'] && projected['Hips'] && projected['Neck']) {
    projected['Spine1'] = lerp2(projected['Hips'], projected['Neck'], 0.33)
  }
  if (!projected['Spine2'] && projected['Hips'] && projected['Neck']) {
    projected['Spine2'] = lerp2(projected['Hips'], projected['Neck'], 0.66)
  }
}

function drawPoints(ctx, projected) {
  ctx.fillStyle = '#f0abfc'
  for (const p of Object.values(projected)) {
    if (!p) continue
    ctx.beginPath()
    ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawLines(ctx, projected) {
  ctx.strokeStyle = '#22d3ee'
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  for (const [a, b] of SKELETON_CONNECTIONS) {
    const pa = projected[a], pb = projected[b]
    if (!pa || !pb) continue
    ctx.beginPath()
    ctx.moveTo(pa[0], pa[1])
    ctx.lineTo(pb[0], pb[1])
    ctx.stroke()
  }
}

/**
 * Draw skeleton from normalized image coords (0-1 → canvas pixels).
 * Most accurate: coords come directly from MediaPipe image landmarks.
 */
export function drawSkeletonImage(canvas, imageKp, isFlipped = false) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width  || canvas.offsetWidth  || 1
  const h = canvas.height || canvas.offsetHeight || 1
  ctx.clearRect(0, 0, w, h)
  if (!imageKp || Object.keys(imageKp).length === 0) return

  const projected = {}
  for (const [name, pos] of Object.entries(imageKp)) {
    const x = isFlipped ? (1 - pos[0]) * w : pos[0] * w
    const y = pos[1] * h
    projected[name] = [x, y]
  }

  injectSpine(projected)
  drawLines(ctx, projected)
  drawPoints(ctx, projected)
}

/**
 * Draw skeleton from MediaPipe world coords (3D metric) with rough 2D projection.
 * Used when no image-space coordinates are available (e.g. camera WebSocket legacy path).
 * World x ≈ [-0.5, 0.5], world y ≈ [-0.9, 0.3] (negative y = up)
 */
export function drawSkeletonWorld(canvas, worldKp, isFlipped = false) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width  || canvas.offsetWidth  || 1
  const h = canvas.height || canvas.offsetHeight || 1
  ctx.clearRect(0, 0, w, h)
  if (!worldKp || Object.keys(worldKp).length === 0) return

  const projected = {}
  for (const [name, pos] of Object.entries(worldKp)) {
    const x = isFlipped ? (0.5 - pos[0]) * w : (pos[0] + 0.5) * w
    const y = (pos[1] + 0.85) / 1.1 * h
    projected[name] = [x, y]
  }

  // Add Hips / Neck midpoints if not already present
  if (!projected['Hips'] && projected['LeftUpLeg'] && projected['RightUpLeg']) {
    const [lx, ly] = projected['LeftUpLeg'], [rx, ry] = projected['RightUpLeg']  // eslint-disable-line
    projected['Hips'] = [(lx+rx)/2, (ly+ry)/2]
  }
  if (!projected['Neck'] && projected['LeftArm'] && projected['RightArm']) {
    const [lx, ly] = projected['LeftArm'], [rx, ry] = projected['RightArm']  // eslint-disable-line
    projected['Neck'] = [(lx+rx)/2, (ly+ry)/2]
  }
  injectSpine(projected)

  drawLines(ctx, projected)
  drawPoints(ctx, projected)
}

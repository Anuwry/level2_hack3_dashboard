export const LEGACY_TO_CANONICAL = {
  Hips: ['l_hip', 'r_hip'],
  Spine1: ['l_hip', 'r_hip', 'l_shoulder', 'r_shoulder'],
  Spine2: ['l_hip', 'r_hip', 'l_shoulder', 'r_shoulder'],
  Neck: ['l_shoulder', 'r_shoulder'],
  Head: ['nose'],
  LeftArm: ['l_shoulder'],
  LeftForeArm: ['l_elbow'],
  LeftHand: ['l_wrist'],
  RightArm: ['r_shoulder'],
  RightForeArm: ['r_elbow'],
  RightHand: ['r_wrist'],
  LeftUpLeg: ['l_hip'],
  LeftLeg: ['l_knee'],
  LeftFoot: ['l_ankle'],
  RightUpLeg: ['r_hip'],
  RightLeg: ['r_knee'],
  RightFoot: ['r_ankle'],
}

export function legacyKeypointsToCanonical(frame, keypointNames = []) {
  const persons = frame?.persons || []
  if (!persons.length) return null
  const kps = persons[0].kps || []
  const raw = {}

  keypointNames.forEach((name, index) => {
    const kp = kps[index]
    if (Array.isArray(kp) && kp.length >= 2) {
      raw[name] = [Number(kp[0]), Number(kp[1]), Number(kp[2] ?? 0)]
    }
  })

  const getAvg = (a, b) => {
    if (raw[a] && raw[b]) return raw[a].map((v, i) => (v + raw[b][i]) / 2)
    return raw[a] || raw[b] || null
  }

  const canonical = {}
  const hips = getAvg('l_hip', 'r_hip')
  const shoulders = getAvg('l_shoulder', 'r_shoulder')

  if (hips) canonical.Hips = hips
  if (hips && shoulders) {
    canonical.Spine1 = hips.map((v, i) => v * 0.65 + shoulders[i] * 0.35)
    canonical.Spine2 = hips.map((v, i) => v * 0.35 + shoulders[i] * 0.65)
    canonical.Neck = shoulders
  } else if (shoulders) {
    canonical.Neck = shoulders
  }
  if (raw.nose) canonical.Head = raw.nose

  for (const [canonicalName, sources] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (canonical[canonicalName]) continue
    for (const src of sources) {
      if (raw[src]) {
        canonical[canonicalName] = raw[src]
        break
      }
    }
  }

  return canonical
}

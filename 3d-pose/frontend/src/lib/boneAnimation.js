/**
 * Bone animation — works with any GLB rig regardless of baked rest rotations.
 *
 * Coordinate transform (MediaPipe world → Three.js):
 *   Three.js = [x, -y, -z]   (MediaPipe Y is downward; Three.js Y is upward)
 *
 * Algorithm: absolute rotation, delta-on-rest.
 *   1. Capture rest pose once after model loads (T-pose):
 *        restDir[bone]       = world direction from bone to first child
 *        restQuat[bone]      = bone local quaternion (for resetting each frame)
 *        restWorldQuat[bone] = bone world quaternion (for correct delta application)
 *   2. Each frame, for each bone (parent-first):
 *        a. Reset bone to restQuat (preserves T-pose baked rotations).
 *        b. propagate updateMatrixWorld.
 *        c. q_delta    = setFromUnitVectors(restDir, targetDir)
 *        d. qWorld     = q_delta * restWorldQuat   ← delta ON TOP of rest orientation
 *        e. localQ     = inv(parentWorldQ) * qWorld
 *        f. bone.quaternion = localQ
 *        g. bone.updateMatrixWorld(true)
 *
 * Why step (d) matters:
 *   setFromUnitVectors(a,b) is a DELTA rotation that maps direction a → b.
 *   Without multiplying by restWorldQuat, setting the bone's world quaternion
 *   to just q_delta (when a==b at T-pose) gives identity, wiping out any
 *   large baked rest rotation and flipping the limb the wrong way.
 *   Multiplying by restWorldQuat applies the delta ON TOP of the rest orientation,
 *   which is correct regardless of baked rotation magnitude.
 */

import * as THREE from 'three'

// [glbBoneName, fromKeypointName, toKeypointName]
// MUST be ordered strictly parent-before-child.
// For 17joint.glb the GLB bone names ARE the MediaPipe joint names.
export const BONE_CHAIN = [
  ['Hips',        'Hips',        'Spine1'],
  ['Spine1',      'Spine1',      'Spine2'],
  ['Spine2',      'Spine2',      'Neck'],
  ['Neck',        'Neck',        'Head'],
  ['LeftArm',     'LeftArm',     'LeftForeArm'],
  ['LeftForeArm', 'LeftForeArm', 'LeftHand'],
  ['RightArm',    'RightArm',    'RightForeArm'],
  ['RightForeArm','RightForeArm','RightHand'],
  ['LeftUpLeg',   'LeftUpLeg',   'LeftLeg'],
  ['LeftLeg',     'LeftLeg',     'LeftFoot'],
  ['RightUpLeg',  'RightUpLeg',  'RightLeg'],
  ['RightLeg',    'RightLeg',    'RightFoot'],
]

/** MediaPipe world → Three.js space. */
function mp2three(pos) {
  return [pos[0], -pos[1], -pos[2]]
}

/**
 * World-space pointing direction for a bone.
 * Uses first child when available; falls back to bone's own world +Y axis.
 */
function getBoneWorldDir(bone) {
  if (bone.children.length > 0) {
    const bWP = new THREE.Vector3()
    bone.getWorldPosition(bWP)
    const cWP = new THREE.Vector3()
    bone.children[0].getWorldPosition(cWP)
    const d = cWP.clone().sub(bWP)
    if (d.lengthSq() > 1e-8) return d.normalize()
  }
  const up = new THREE.Vector3(0, 1, 0)
  up.transformDirection(bone.matrixWorld)
  return up.normalize()
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Extract all isBone objects by name from a loaded Three.js model. */
export function extractBones(model) {
  const bones = {}
  model.traverse((obj) => {
    if (obj.isBone) bones[obj.name] = obj
  })
  return bones
}

/**
 * Capture rest pose for ALL bones in the model.
 * MUST be called right after model loads with updateMatrixWorld(true) already done.
 *
 * boneChain is used to look up the exact target bone for each animated bone's rest
 * direction — avoiding the "first GLB child" heuristic which breaks when a bone has
 * multiple children (e.g. Hips → [LeftUpLeg, RightUpLeg, Spine1]).
 *
 * @returns {{ restDirs, restQuats, restWorldQuats }}
 */
export function captureRestPose(bonesMap, boneChain = BONE_CHAIN) {
  const restDirs       = {}
  const restQuats      = {}
  const restWorldQuats = {}

  // Build boneName → toJoint lookup from the chain
  const toJointMap = {}
  for (const [boneName, , toJoint] of boneChain) {
    toJointMap[boneName] = toJoint
  }

  for (const [boneName, bone] of Object.entries(bonesMap)) {
    const toJoint    = toJointMap[boneName]
    const targetBone = toJoint ? bonesMap[toJoint] : null

    if (targetBone) {
      const bWP = new THREE.Vector3()
      bone.getWorldPosition(bWP)
      const cWP = new THREE.Vector3()
      targetBone.getWorldPosition(cWP)
      const d = cWP.clone().sub(bWP)
      restDirs[boneName] = d.lengthSq() > 1e-8 ? d.normalize().clone() : getBoneWorldDir(bone).clone()
    } else {
      restDirs[boneName] = getBoneWorldDir(bone).clone()
    }

    restQuats[boneName]      = bone.quaternion.clone()
    const wq = new THREE.Quaternion()
    bone.getWorldQuaternion(wq)
    restWorldQuats[boneName] = wq.clone()
  }

  // Body's REST right axis (world-space, in T-pose).
  // Prefer shoulders (LeftArm → RightArm) — wider span and more rotation signal than hips.
  // Falls back to hips if shoulders aren't available.
  let restRightHips = null
  const tryPair = (lName, rName) => {
    const l = bonesMap[lName], r = bonesMap[rName]
    if (!l || !r) return null
    const lp = new THREE.Vector3(), rp = new THREE.Vector3()
    l.getWorldPosition(lp); r.getWorldPosition(rp)
    const d = rp.clone().sub(lp)
    return d.lengthSq() > 1e-8 ? d.normalize() : null
  }
  restRightHips = tryPair('LeftArm', 'RightArm') || tryPair('LeftUpLeg', 'RightUpLeg')
  if (restRightHips) console.log('[restRight] body right axis:', restRightHips.x.toFixed(2), restRightHips.y.toFixed(2), restRightHips.z.toFixed(2))

  // Warn about any BONE_CHAIN bones that are missing from the GLB
  const missing = boneChain.filter(([b]) => !bonesMap[b]).map(([b]) => b)
  if (missing.length > 0) {
    console.warn('[boneAnimation] Missing bones in GLB (check names match BONE_CHAIN):', missing.join(', '))
    console.warn('[boneAnimation] Bones actually in GLB:', Object.keys(bonesMap).sort().join(', '))
  }

  return { restDirs, restQuats, restWorldQuats, restRightHips }
}

/**
 * Drive the skeleton from a keypoints_17 dict.
 *
 * @param {Object}         bonesMap       { boneName: THREE.Bone }
 * @param {Object}         kp             keypoints_17 { JointName: [x,y,z] }
 * @param {THREE.Object3D} model          scene root
 * @param {Object}         restDirs       from captureRestPose()
 * @param {Object}         restQuats      from captureRestPose()
 * @param {Array}          boneChain      [[boneName, fromJoint, toJoint], ...]
 * @param {Object}         _restWorldQuats kept for API compat; no longer used (dynamic now)
 */
export function applyKeypoints(bonesMap, kp, model, restDirs, restQuats, boneChain = BONE_CHAIN, _restWorldQuats = null, restRightHips = null) {
  if (!kp || !bonesMap || !restDirs || !restQuats) return

  // 1. Reset every animated bone to its T-pose local quaternion
  for (const [boneName] of boneChain) {
    const bone = bonesMap[boneName]
    const rq   = restQuats[boneName]
    if (bone && rq) bone.quaternion.copy(rq)
  }
  model.updateMatrixWorld(true)

  // 2. Transform keypoints to Three.js space
  const pos = {}
  for (const [name, raw] of Object.entries(kp)) {
    if (Array.isArray(raw) && raw.length >= 3) {
      pos[name] = mp2three(raw)
    }
  }

  // 2b. Full body orientation for the Hips bone: aligns BOTH spine axis AND hip line.
  //     This is what makes the torso rotate to face the right direction when the
  //     person turns — instead of always facing the rest-pose direction.
  let hipsHandled = false
  const hipsBone = bonesMap['Hips']
  if (hipsBone && restRightHips && restDirs['Hips']) {
    const h = pos['Hips'], s = pos['Spine1']
    // Prefer shoulders for the right axis; fall back to hips
    const lp = pos['LeftArm']    || pos['LeftUpLeg']
    const rp = pos['RightArm']   || pos['RightUpLeg']
    if (h && s && lp && rp) {
      // Target body axes in world space
      const upT = new THREE.Vector3(s[0]-h[0], s[1]-h[1], s[2]-h[2])
      const rT  = new THREE.Vector3(rp[0]-lp[0], rp[1]-lp[1], rp[2]-lp[2])
      if (upT.lengthSq() > 1e-6 && rT.lengthSq() > 1e-6) {
        upT.normalize()
        // Orthogonalise rT against upT
        rT.sub(upT.clone().multiplyScalar(rT.dot(upT))).normalize()

        const upR = restDirs['Hips'].clone()
        const rR  = restRightHips.clone()
        rR.sub(upR.clone().multiplyScalar(rR.dot(upR))).normalize()

        // R1 maps rest up → target up
        const R1 = new THREE.Quaternion().setFromUnitVectors(upR, upT)
        // After R1, where does rest right point?
        const rR_afterR1 = rR.clone().applyQuaternion(R1)
        // R2: rotation around target up that aligns rR_afterR1 → rT
        const cosA = rR_afterR1.dot(rT)
        const sinA = new THREE.Vector3().crossVectors(rR_afterR1, rT).dot(upT)
        const angle = Math.atan2(sinA, cosA)
        const R2 = new THREE.Quaternion().setFromAxisAngle(upT, angle)
        // Combined world delta applied on top of Hips' current rest world orientation
        const deltaW = R2.multiply(R1)
        const hipsRestWorldQuat = new THREE.Quaternion()
        hipsBone.getWorldQuaternion(hipsRestWorldQuat)
        const qWorld = deltaW.multiply(hipsRestWorldQuat)

        if (hipsBone.parent) {
          const parentWQ = new THREE.Quaternion()
          hipsBone.parent.getWorldQuaternion(parentWQ)
          hipsBone.quaternion.copy(parentWQ.invert().multiply(qWorld))
        } else {
          hipsBone.quaternion.copy(qWorld)
        }
        hipsBone.updateMatrixWorld(true)
        hipsHandled = true
      }
    }
  }

  // 3. Apply each bone in parent-first order
  for (const [boneName, fromJoint, toJoint] of boneChain) {
    if (boneName === 'Hips' && hipsHandled) continue   // already done with full orientation
    const bone = bonesMap[boneName]
    if (!bone) continue
    if (!pos[fromJoint] || !pos[toJoint]) continue

    const targetDir = new THREE.Vector3(...pos[toJoint])
      .sub(new THREE.Vector3(...pos[fromJoint]))
      .normalize()
    if (targetDir.lengthSq() < 1e-4) continue

    // Dynamic rest direction: bone is at restQuat and parent chain is already updated,
    // so the world positions reflect the current parent orientation (including Hips yaw).
    // This is critical — using pre-captured restDirs would cause child bones to
    // counter-rotate and cancel the Hips yaw, splitting the body at the waist.
    const toJointBone = bonesMap[toJoint]
    let currentRestDir = null
    if (toJointBone) {
      const bWP = new THREE.Vector3()
      const cWP = new THREE.Vector3()
      bone.getWorldPosition(bWP)
      toJointBone.getWorldPosition(cWP)
      const d = cWP.clone().sub(bWP)
      if (d.lengthSq() > 1e-8) currentRestDir = d.normalize()
    }
    if (!currentRestDir) {
      // Fallback to pre-captured direction
      currentRestDir = restDirs[boneName]
      if (!currentRestDir || currentRestDir.lengthSq() < 1e-4) continue
    }

    // Dynamic rest world quaternion: bone at restQuat with current parent orientation
    const currentRestWorldQuat = new THREE.Quaternion()
    bone.getWorldQuaternion(currentRestWorldQuat)

    // Delta: maps currentRestDir → targetDir, then apply on top of current rest orientation
    const q_delta = new THREE.Quaternion().setFromUnitVectors(currentRestDir, targetDir)
    const qWorld = q_delta.multiply(currentRestWorldQuat)

    // Convert world rotation to bone-local space
    if (bone.parent) {
      const parentWQ = new THREE.Quaternion()
      bone.parent.getWorldQuaternion(parentWQ)
      bone.quaternion.copy(parentWQ.clone().invert().multiply(qWorld))
    } else {
      bone.quaternion.copy(qWorld)
    }

    bone.updateMatrixWorld(true)
  }

  model.updateMatrixWorld(true)
}

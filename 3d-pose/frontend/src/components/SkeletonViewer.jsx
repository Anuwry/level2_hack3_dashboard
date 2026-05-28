/**
 * SkeletonViewer — pure MediaPipe keypoint visualization.
 *
 * Smoothness strategy:
 *   Keypoints arrive at ~10-15 fps from the backend.
 *   Instead of updating geometry only on prop changes (jerky),
 *   we store the latest keypoints in a ref and lerp the
 *   displayed positions toward the target on EVERY animation
 *   frame (60 fps). LERP_ALPHA controls speed: 0.18 ≈ smooth
 *   with ~100 ms settling time.
 *
 * Visuals:
 *   Current skeleton  : bright white bones + small joint dots
 *   Motion trail      : per-joint comet-tail Line, vertex color
 *                       fades from background (invisible) → highlight
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const JOINTS = [
  'Hips','Spine1','Spine2','Neck','Head',
  'LeftArm','LeftForeArm','LeftHand',
  'RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot',
  'RightUpLeg','RightLeg','RightFoot',
]

const CONNECTIONS = [
  ['Hips','Spine1'],['Spine1','Spine2'],['Spine2','Neck'],['Neck','Head'],
  ['Neck','LeftArm'],['LeftArm','LeftForeArm'],['LeftForeArm','LeftHand'],
  ['Neck','RightArm'],['RightArm','RightForeArm'],['RightForeArm','RightHand'],
  ['Hips','LeftUpLeg'],['LeftUpLeg','LeftLeg'],['LeftLeg','LeftFoot'],
  ['Hips','RightUpLeg'],['RightUpLeg','RightLeg'],['RightLeg','RightFoot'],
]
const N_CONN = CONNECTIONS.length

const LERP_ALPHA = 0.18          // per-frame lerp factor (lower = smoother but more lag)
const TRAIL_PUSH_DIST = 0.003    // only push new trail point when joint moves this far

// Background color as float RGB — must match scene.background 0x060c18
const BG = [0.024, 0.047, 0.094]
// Trail highlight at newest end
const TC = [0.40, 0.65, 1.0]

function mp2three(p) { return [p[0], -p[1], -p[2]] }

function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export default function SkeletonViewer({ keypoints, trailLength = 30, className = '' }) {
  const mountRef     = useRef(null)
  const glRef        = useRef(null)
  const targetKpRef  = useRef(null)   // latest received (MediaPipe space)
  const displayKpRef = useRef(null)   // currently-shown (Three.js space, lerped)
  const trailBufRef  = useRef({})     // per-joint circular trail buffer

  // ── Update target whenever props change ───────────────────────────────────
  useEffect(() => {
    if (!keypoints) return
    // Convert to Three.js space once; lerp runs in animate()
    const kp3 = {}
    for (const name of JOINTS) {
      const p = keypoints[name]
      if (p) kp3[name] = mp2three(p)
    }
    targetKpRef.current = kp3

    // On first frame, snap display to target immediately
    if (!displayKpRef.current) {
      displayKpRef.current = {}
      for (const name of JOINTS) {
        if (kp3[name]) displayKpRef.current[name] = [...kp3[name]]
      }
    }
  }, [keypoints])

  // ── Build scene once ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060c18)

    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.01, 50)
    camera.position.set(0, 0.1, 2.8)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.1, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.update()

    const grid = new THREE.GridHelper(6, 30, 0x0d2040, 0x081428)
    grid.position.y = -1.1
    scene.add(grid)

    // ── Current skeleton LineSegments ────────────────────────────────────────
    const curPos = new Float32Array(N_CONN * 2 * 3)
    const curGeo = new THREE.BufferGeometry()
    curGeo.setAttribute('position', new THREE.BufferAttribute(curPos, 3).setUsage(THREE.DynamicDrawUsage))
    const curLines = new THREE.LineSegments(
      curGeo,
      new THREE.LineBasicMaterial({ color: 0xddeeff, linewidth: 2 })
    )
    scene.add(curLines)

    // ── Joint dots ───────────────────────────────────────────────────────────
    const dotGeo = new THREE.SphereGeometry(1, 6, 4)
    const jointDots = {}
    for (const name of JOINTS) {
      const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }))
      m.scale.setScalar(0.013)
      m.visible = false
      scene.add(m)
      jointDots[name] = m
    }

    // ── Per-joint comet-tail Lines ────────────────────────────────────────────
    // Each Line has (trailLength + 1) vertices, oldest → newest.
    const tailLines = {}
    for (const name of JOINTS) {
      const count = trailLength + 1
      const pos = new Float32Array(count * 3)
      const col = new Float32Array(count * 3)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage))
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true }))
      scene.add(line)
      tailLines[name] = { line, pos, col, count }
      trailBufRef.current[name] = []  // grows up to trailLength points
    }

    // ── Geometry update — called every animation frame ────────────────────────
    function updateGeometry(display) {
      // 1. Bones
      let ci = 0
      for (const [a, b] of CONNECTIONS) {
        const pa = display[a], pb = display[b]
        if (!pa || !pb) {
          for (let k = 0; k < 6; k++) curPos[ci * 6 + k] = 0
        } else {
          curPos.set([pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]], ci * 6)
        }
        ci++
      }
      curGeo.attributes.position.needsUpdate = true
      curGeo.computeBoundingSphere()

      // 2. Dots
      for (const name of JOINTS) {
        const p = display[name]
        const m = jointDots[name]
        if (!p) { m.visible = false; continue }
        m.visible = true
        m.position.set(p[0], p[1], p[2])
      }

      // 3. Comet tails — push new trail point when joint moved enough
      for (const name of JOINTS) {
        const p = display[name]
        if (!p) continue
        const buf = trailBufRef.current[name]
        const last = buf[buf.length - 1]
        const moved = !last || Math.hypot(p[0]-last[0], p[1]-last[1], p[2]-last[2]) >= TRAIL_PUSH_DIST
        if (moved) {
          buf.push([...p])
          if (buf.length > trailLength + 1) buf.shift()
        }

        const { line, pos, col } = tailLines[name]
        const avail = buf.length
        for (let vi = 0; vi < avail; vi++) {
          const pt = buf[vi]
          pos[vi * 3]     = pt[0]
          pos[vi * 3 + 1] = pt[1]
          pos[vi * 3 + 2] = pt[2]
          const t = avail > 1 ? vi / (avail - 1) : 1
          col[vi * 3]     = BG[0] + (TC[0] - BG[0]) * t
          col[vi * 3 + 1] = BG[1] + (TC[1] - BG[1]) * t
          col[vi * 3 + 2] = BG[2] + (TC[2] - BG[2]) * t
        }
        line.geometry.attributes.position.needsUpdate = true
        line.geometry.attributes.color.needsUpdate    = true
        line.geometry.setDrawRange(0, avail)
        line.geometry.computeBoundingSphere()
      }
    }

    // ── Animation loop — lerp + render every frame ────────────────────────────
    let animId
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update()

      const target  = targetKpRef.current
      const display = displayKpRef.current
      if (target && display) {
        // Lerp display toward target for every joint
        for (const name of JOINTS) {
          const t = target[name]
          const d = display[name]
          if (t && d) {
            display[name] = lerp3(d, t, LERP_ALPHA)
          } else if (t) {
            display[name] = [...t]
          }
        }
        updateGeometry(display)
      }

      renderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    glRef.current = { renderer }

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
      glRef.current = null
    }
  }, [trailLength])

  return (
    <div ref={mountRef} className={`w-full h-full ${className}`} style={{ touchAction: 'none' }} />
  )
}

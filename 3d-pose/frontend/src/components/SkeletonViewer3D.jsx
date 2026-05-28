/**
 * SkeletonViewer3D — Three.js 3D skeleton preview with pan/zoom/rotate.
 * keypoints: canonical { JointName: [x,y,z] }
 * isWorldCoords: true for label_clip_v1 (MediaPipe world), false for legacy image-space
 *
 * Toggle buttons (top-right):
 *   [i]  — joint tooltips on hover (raycasting)
 *   [⟂]  — shoulder rotation line + angle label in 3D
 */

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SKELETON_CONNECTIONS } from '../lib/drawSkeleton.js'

function jointColor(name) {
  const n = name.toLowerCase()
  if (n === 'hips' || n.includes('spine') || n === 'neck') return 0x818cf8
  if (n === 'head') return 0xc084fc
  if (n.startsWith('left') && (n.includes('arm') || n.includes('hand'))) return 0x4ade80
  if (n.startsWith('right') && (n.includes('arm') || n.includes('hand'))) return 0xfbbf24
  if (n.startsWith('left') && (n.includes('leg') || n.includes('foot') || n.includes('upleg'))) return 0x22d3ee
  if (n.startsWith('right') && (n.includes('leg') || n.includes('foot') || n.includes('upleg'))) return 0xfb923c
  return 0xf472b6
}

const GRID_Y = -0.85
const ARC_R  = 0.2
const ARC_N  = 24

export default function SkeletonViewer3D({
  keypoints,
  isWorldCoords = true,
  jointScores = null,
  overlayText = null,
  className = '',
}) {
  const mountRef       = useRef(null)
  const shoulderLblRef = useRef(null)  // DOM label positioned by animate loop

  const keypointsRef    = useRef(keypoints)
  const isWorldRef      = useRef(isWorldCoords)
  const jointScoresRef  = useRef(jointScores)
  const tooltipsOnRef   = useRef(false)
  const shoulderOnRef   = useRef(false)

  const [tooltipsOn,  setTooltipsOn]  = useState(false)
  const [shoulderOn,  setShoulderOn]  = useState(false)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: '', score: null })

  useEffect(() => { keypointsRef.current   = keypoints },    [keypoints])
  useEffect(() => { isWorldRef.current     = isWorldCoords }, [isWorldCoords])
  useEffect(() => { jointScoresRef.current = jointScores },  [jointScores])
  useEffect(() => { tooltipsOnRef.current  = tooltipsOn },   [tooltipsOn])
  useEffect(() => { shoulderOnRef.current  = shoulderOn },   [shoulderOn])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setClearColor(0x0f172a)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)

    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.01, 50)
    camera.position.set(0, 0.1, 1.6)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.15, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.minDistance = 0.3
    controls.maxDistance = 6
    controls.update()

    // Grid + axes
    const grid = new THREE.GridHelper(1.5, 8, 0x334155, 0x1e293b)
    grid.position.y = GRID_Y
    scene.add(grid)
    const axes = new THREE.AxesHelper(0.18)
    axes.position.y = GRID_Y + 0.01
    scene.add(axes)

    // ── Skeleton lines ─────────────────────────────────────────────────────────
    const MAX_EDGES = 32
    const posArr = new Float32Array(MAX_EDGES * 6)
    const skelGeo = new THREE.BufferGeometry()
    skelGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    skelGeo.setDrawRange(0, 0)
    const skelLines = new THREE.LineSegments(
      skelGeo,
      new THREE.LineBasicMaterial({ color: 0x93c5fd, linewidth: 2, depthTest: false }),
    )
    skelLines.renderOrder = 998
    scene.add(skelLines)

    // ── Joint spheres ──────────────────────────────────────────────────────────
    const allJoints = [...new Set(SKELETON_CONNECTIONS.flatMap(([a, b]) => [a, b]))]
    const spheres = {}
    const sGeo = new THREE.SphereGeometry(0.025, 8, 6)
    for (const jName of allJoints) {
      const mesh = new THREE.Mesh(
        sGeo,
        new THREE.MeshBasicMaterial({ color: jointColor(jName), depthTest: false }),
      )
      mesh.renderOrder = 999
      mesh.visible = false
      scene.add(mesh)
      spheres[jName] = mesh
    }

    // ── Shoulder viz geometry ──────────────────────────────────────────────────
    function makeLine(color, nPts, order = 997) {
      const g = new THREE.BufferGeometry()
      const arr = new Float32Array(nPts * 3)
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
      g.setDrawRange(0, 0)
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, depthTest: false }))
      l.renderOrder = order
      l.visible = false
      scene.add(l)
      return l
    }
    const shoulderLine = makeLine(0x22d3ee, 2)       // cyan  – shoulder axis in 3D
    const projLine     = makeLine(0x0891b2, 2)       // dark cyan – projected on ground
    const refLine      = makeLine(0x64748b, 2)       // slate – reference direction (+X)
    const arcLine      = makeLine(0xf59e0b, ARC_N + 1) // amber – angle arc

    // ── Raycaster for tooltips ─────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 0.02
    const mouse = new THREE.Vector2(-99, -99)

    function onMouseMove(e) {
      const rect = el.getBoundingClientRect()
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1

      if (!tooltipsOnRef.current) return
      raycaster.setFromCamera(mouse, camera)
      const visible = Object.values(spheres).filter(m => m.visible)
      const hits = raycaster.intersectObjects(visible)
      if (hits.length > 0) {
        const jName = Object.keys(spheres).find(k => spheres[k] === hits[0].object)
        const scores = jointScoresRef.current
        setTooltip({
          visible: true,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          name: jName || '',
          score: scores?.[jName] ?? null,
        })
      } else {
        setTooltip(t => t.visible ? { ...t, visible: false } : t)
      }
    }
    el.addEventListener('mousemove', onMouseMove)

    // ── kpToVec3 ───────────────────────────────────────────────────────────────
    function kpToVec3(kp, center, scale) {
      if (!kp) return null
      let v
      if (isWorldRef.current) {
        v = new THREE.Vector3(kp[0], -kp[1], -kp[2])
      } else {
        v = new THREE.Vector3((kp[0] - 0.5) * 1.5, -(kp[1] - 0.5) * 2.0, 0)
      }
      if (center) v.sub(center).multiplyScalar(scale)
      return v
    }

    // ── Animate ────────────────────────────────────────────────────────────────
    let animId
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update()

      const kp = keypointsRef.current
      if (kp && Object.keys(kp).length > 0) {
        const hipKp  = kp['Hips']
        const neckKp = kp['Neck']
        let center = new THREE.Vector3()
        let scale  = 1.0

        if (isWorldRef.current) {
          const rawCenter = hipKp
            ? new THREE.Vector3(hipKp[0], -hipKp[1], -hipKp[2])
            : new THREE.Vector3()
          if (hipKp && neckKp) {
            const h = new THREE.Vector3(hipKp[0],  -hipKp[1],  -hipKp[2])
            const n = new THREE.Vector3(neckKp[0], -neckKp[1], -neckKp[2])
            const d = h.distanceTo(n)
            if (d > 0.001) scale = 0.45 / d
          } else {
            scale = 1.6
          }
          center = rawCenter
        }

        // Skeleton lines
        let vi = 0
        for (const [a, b] of SKELETON_CONNECTIONS) {
          const pa = kpToVec3(kp[a], center, scale)
          const pb = kpToVec3(kp[b], center, scale)
          if (pa && pb) {
            posArr[vi++] = pa.x; posArr[vi++] = pa.y; posArr[vi++] = pa.z
            posArr[vi++] = pb.x; posArr[vi++] = pb.y; posArr[vi++] = pb.z
          } else {
            vi += 6
          }
        }
        skelGeo.setDrawRange(0, vi / 3)
        skelGeo.attributes.position.needsUpdate = true

        // Joint spheres + score coloring
        const scores = jointScoresRef.current
        for (const jName of allJoints) {
          const jkp = kp[jName]
          const sph = spheres[jName]
          if (jkp && sph) {
            const p = kpToVec3(jkp, center, scale)
            if (p) {
              sph.position.copy(p)
              sph.visible = true
              if (scores && scores[jName] != null) {
                const s = Math.max(0, Math.min(1, scores[jName]))
                sph.material.color.setRGB(
                  s < 0.5 ? 1 : 2 - s * 2,
                  s < 0.5 ? s * 2 : 1,
                  0.1,
                )
              } else {
                sph.material.color.setHex(jointColor(jName))
              }
            }
          } else if (sph) {
            sph.visible = false
          }
        }

        // Shoulder angle viz
        const laS = spheres['LeftArm']
        const raS = spheres['RightArm']
        const hS  = spheres['Hips']
        if (shoulderOnRef.current && laS?.visible && raS?.visible) {
          const la = laS.position
          const ra = raS.position
          const hx = hS?.visible ? hS.position.x : 0
          const hz = hS?.visible ? hS.position.z : 0

          // 3D shoulder axis line
          const slp = shoulderLine.geometry.attributes.position
          slp.setXYZ(0, la.x, la.y, la.z)
          slp.setXYZ(1, ra.x, ra.y, ra.z)
          slp.needsUpdate = true
          shoulderLine.geometry.setDrawRange(0, 2)
          shoulderLine.visible = true

          // Ground-plane projection of shoulder axis
          const pp = projLine.geometry.attributes.position
          pp.setXYZ(0, la.x, GRID_Y + 0.003, la.z)
          pp.setXYZ(1, ra.x, GRID_Y + 0.003, ra.z)
          pp.needsUpdate = true
          projLine.geometry.setDrawRange(0, 2)
          projLine.visible = true

          // +X reference line from hip center on ground
          const rp = refLine.geometry.attributes.position
          rp.setXYZ(0, hx,               GRID_Y + 0.003, hz)
          rp.setXYZ(1, hx + ARC_R * 1.4, GRID_Y + 0.003, hz)
          rp.needsUpdate = true
          refLine.geometry.setDrawRange(0, 2)
          refLine.visible = true

          // Angle arc on ground plane (from +X to shoulder direction)
          const shoulderAngle = Math.atan2(ra.z - la.z, ra.x - la.x)
          const refAngle = 0
          const startA = Math.min(refAngle, shoulderAngle)
          const endA   = Math.max(refAngle, shoulderAngle)
          const ap = arcLine.geometry.attributes.position
          for (let i = 0; i <= ARC_N; i++) {
            const a = startA + (endA - startA) * (i / ARC_N)
            ap.setXYZ(i,
              hx + Math.cos(a) * ARC_R,
              GRID_Y + 0.004,
              hz + Math.sin(a) * ARC_R,
            )
          }
          ap.needsUpdate = true
          arcLine.geometry.setDrawRange(0, ARC_N + 1)
          arcLine.visible = true

          // DOM label at shoulder midpoint — projected to screen space
          const mid = new THREE.Vector3(
            (la.x + ra.x) / 2, (la.y + ra.y) / 2, (la.z + ra.z) / 2,
          )
          mid.project(camera)
          const sx = (mid.x * 0.5 + 0.5) * el.clientWidth
          const sy = (-mid.y * 0.5 + 0.5) * el.clientHeight
          const lbl = shoulderLblRef.current
          if (lbl) {
            lbl.style.display  = 'block'
            lbl.style.left     = (sx + 8) + 'px'
            lbl.style.top      = (sy - 14) + 'px'
            lbl.textContent    = (shoulderAngle * 180 / Math.PI).toFixed(1) + '°'
          }
        } else {
          shoulderLine.visible = false
          projLine.visible     = false
          refLine.visible      = false
          arcLine.visible      = false
          const lbl = shoulderLblRef.current
          if (lbl) lbl.style.display = 'none'
        }

      } else {
        skelGeo.setDrawRange(0, 0)
        for (const sph of Object.values(spheres)) sph.visible = false
        shoulderLine.visible = false
        projLine.visible     = false
        refLine.visible      = false
        arcLine.visible      = false
        const lbl = shoulderLblRef.current
        if (lbl) lbl.style.display = 'none'
      }

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ─────────────────────────────────────────────────────────────────
    function onResize() {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      el.removeEventListener('mousemove', onMouseMove)
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className={`w-full h-full relative ${className}`} style={{ touchAction: 'none' }}>
      <div ref={mountRef} className="w-full h-full" />

      {/* Toggle buttons — top right */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={() => { setTooltipsOn(v => !v); setTooltip(t => ({ ...t, visible: false })) }}
          className={`w-6 h-6 rounded text-[10px] font-bold leading-none transition-colors ${
            tooltipsOn ? 'bg-indigo-600 text-white' : 'bg-black/50 text-slate-400 hover:text-white'
          }`}
          title="Toggle joint tooltips"
        >i</button>
        <button
          onClick={() => setShoulderOn(v => !v)}
          className={`w-6 h-6 rounded text-[11px] font-bold leading-none transition-colors ${
            shoulderOn ? 'bg-cyan-600 text-white' : 'bg-black/50 text-slate-400 hover:text-white'
          }`}
          title="Toggle shoulder angle"
        >⟂</button>
      </div>

      {/* Overlay label */}
      {overlayText && (
        <div className="absolute top-2 left-2 text-xs text-white/80 bg-black/50 rounded px-2 py-0.5 pointer-events-none font-medium">
          {overlayText}
        </div>
      )}

      {/* Joint tooltip — follows mouse */}
      {tooltipsOn && tooltip.visible && (
        <div
          className="absolute z-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y - 18, transform: 'translateY(-50%)' }}
        >
          <div className="font-semibold text-white">{tooltip.name}</div>
          {tooltip.score != null && (
            <div className={
              tooltip.score >= 0.8 ? 'text-green-400'
              : tooltip.score >= 0.6 ? 'text-yellow-400'
              : 'text-red-400'
            }>
              {(tooltip.score * 100).toFixed(0)}% match
            </div>
          )}
        </div>
      )}

      {/* Shoulder angle DOM label — position set per-frame by animate loop */}
      <div
        ref={shoulderLblRef}
        className="absolute z-20 text-xs text-cyan-300 font-mono bg-black/70 rounded px-1.5 py-0.5 pointer-events-none"
        style={{ display: 'none' }}
      />
    </div>
  )
}

/**
 * AvatarViewer — Three.js scene with a rigged avatar.
 * Props:
 *   keypoints      — keypoints_17 dict (MediaPipe world coords)
 *   boneChain      — [[boneName, fromJoint, toJoint], ...] (default: BONE_CHAIN)
 *   modelUrl       — GLB path (default: '/models/17joint.glb')
 *   onBonesLoaded  — callback(boneNames[]) when model finishes loading
 *   showJoints     — render colored spheres at each animated bone (debug)
 *   showSkeleton   — render 3D stick-figure skeleton overlay
 *   showModel      — render the GLB mesh (can be toggled off to see skeleton only)
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  BONE_CHAIN,
  extractBones,
  captureRestPose,
  applyKeypoints,
} from "../lib/boneAnimation.js";

const DEFAULT_MODEL = "/models/17joint-link-hand-v2.glb";

// Stable colors per body region (works with MediaPipe-style bone names)
function jointColor(name) {
  const n = name.toLowerCase();
  if (n === "hips" || n.includes("spine") || n === "neck") return 0x818cf8;
  if (n === "head") return 0xc084fc;
  if (n.startsWith("left") && (n.includes("arm") || n.includes("hand")))
    return 0x4ade80;
  if (n.startsWith("right") && (n.includes("arm") || n.includes("hand")))
    return 0xfbbf24;
  if (
    n.startsWith("left") &&
    (n.includes("leg") || n.includes("foot") || n.includes("upleg"))
  )
    return 0x22d3ee;
  if (
    n.startsWith("right") &&
    (n.includes("leg") || n.includes("foot") || n.includes("upleg"))
  )
    return 0xfb923c;
  return 0xf472b6;
}

export default function AvatarViewer({
  keypoints,
  boneChain = BONE_CHAIN,
  modelUrl = DEFAULT_MODEL,
  onBonesLoaded,
  showJoints = false,
  showSkeleton = false,
  showModel = true,
  className = "",
}) {
  const mountRef = useRef(null);
  const boneChainRef = useRef(boneChain);

  // Keep refs in sync with latest props so the animate closure can read them without re-running
  const showSkeletonRef  = useRef(showSkeleton);
  const showModelRef     = useRef(showModel);
  const keypointsRef     = useRef(null);
  const boneWorldPosRef  = useRef(null);  // bone world positions after applyKeypoints
  useEffect(() => {
    boneChainRef.current = boneChain;
  }, [boneChain]);
  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);
  useEffect(() => {
    showModelRef.current = showModel;
    const rt = rtRef.current;
    if (rt.model)
      rt.model.traverse((n) => {
        if (n.isMesh) n.visible = showModel;
      });
  }, [showModel]);

  // Runtime Three.js state — single object so sub-properties can be mutated inside closures
  const rtRef = useRef({
    bones: {},
    restDirs: null,
    restQuats: null,
    restWorldQuats: null,
    jointSpheres: {},
    model: null,
    scene: null,
    skelLines: null,
    skelSpheres: {},
  });

  // ── Full Three.js lifecycle — re-runs when modelUrl changes ──────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const rt = rtRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    scene.fog = new THREE.Fog(0x111827, 10, 30);
    rt.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      el.clientWidth / el.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 1.2, 3.5);

    // Controls — attach to the canvas element so pointer events are captured correctly
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    controls.update();

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 20;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8899cc, 0.5);
    fill.position.set(-3, 2, -2);
    scene.add(fill);
    const back = new THREE.DirectionalLight(0xffd4a0, 0.4);
    back.position.set(0, 3, -4);
    scene.add(back);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(5, 64),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    scene.add(new THREE.GridHelper(10, 20, 0x334155, 0x1e293b));

    // World XYZ axes — red=X, green=Y, blue=Z (at world origin, length 1m)
    const axes = new THREE.AxesHelper(1);
    axes.position.set(0, 0.01, 0);   // slightly above ground so the line is visible
    axes.material.depthTest = false;
    axes.renderOrder = 997;
    scene.add(axes);

    // ── 3D skeleton: line segments (edges) ──────────────────────────────────
    // Allocate for up to 32 edges. Updated every frame from bone world positions.
    const MAX_EDGES = 32;
    const skelPos = new Float32Array(MAX_EDGES * 6);
    const skelGeo = new THREE.BufferGeometry();
    skelGeo.setAttribute("position", new THREE.BufferAttribute(skelPos, 3));
    skelGeo.setDrawRange(0, 0);
    const skelLines = new THREE.LineSegments(
      skelGeo,
      new THREE.LineBasicMaterial({
        color: 0x93c5fd,
        linewidth: 2,
        depthTest: false,
      }),
    );
    skelLines.renderOrder = 998;
    skelLines.visible = false;
    scene.add(skelLines);
    rt.skelLines = skelLines;

    // Joint spheres for skeleton mode — one per unique joint name in chain
    const sGeo = new THREE.SphereGeometry(0.04, 10, 7);
    const allJoints = [
      ...new Set(boneChainRef.current.flatMap(([, f, t]) => [f, t])),
    ];
    rt.skelSpheres = {};
    for (const jName of allJoints) {
      const sphere = new THREE.Mesh(
        sGeo,
        new THREE.MeshBasicMaterial({
          color: jointColor(jName),
          depthTest: false,
        }),
      );
      sphere.renderOrder = 999;
      sphere.visible = false;
      scene.add(sphere);
      rt.skelSpheres[jName] = sphere;
    }

    // ── Render loop ─────────────────────────────────────────────────────────
    let animId;
    function animate() {
      animId = requestAnimationFrame(animate);
      controls.update();

      const showSkel = showSkeletonRef.current;
      const chain = boneChainRef.current;

      const bonePos = boneWorldPosRef.current;
      if (showSkel && bonePos && chain.length > 0) {
        // Use bone world positions (set after applyKeypoints) — perfectly aligned to the model
        const posArr = skelLines.geometry.attributes.position.array;
        let vi = 0;
        for (const [, fromJoint, toJoint] of chain) {
          const fPos = bonePos[fromJoint];
          const tPos = bonePos[toJoint];
          if (fPos && tPos) {
            posArr[vi++] = fPos[0]; posArr[vi++] = fPos[1]; posArr[vi++] = fPos[2];
            posArr[vi++] = tPos[0]; posArr[vi++] = tPos[1]; posArr[vi++] = tPos[2];
          } else {
            vi += 6;
          }
        }
        skelLines.geometry.setDrawRange(0, vi / 3);
        skelLines.geometry.attributes.position.needsUpdate = true;
        skelLines.visible = true;

        const allJ = [...new Set(chain.flatMap(([, f, t]) => [f, t]))];
        for (const jName of allJ) {
          const pos = bonePos[jName];
          const sph = rt.skelSpheres[jName];
          if (pos && sph) {
            sph.position.set(pos[0], pos[1], pos[2]);
            sph.visible = true;
          } else if (sph) {
            sph.visible = false;
          }
        }
      } else {
        skelLines.visible = false;
        for (const sph of Object.values(rt.skelSpheres)) sph.visible = false;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    function onResize() {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    // ── Load GLB model ───────────────────────────────────────────────────────
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;
        model.scale.set(1.5, 1.5, 1.5);
        const bbox = new THREE.Box3().setFromObject(model);
        model.position.y = -bbox.min.y;
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.visible = showModelRef.current; // respect initial prop
            if (node.material) {
              node.material.metalness = 0.2;
              node.material.roughness = 0.7;
            }
          }
        });
        scene.add(model);
        model.updateMatrixWorld(true);

        rt.model = model;
        rt.modelScale = 1.5;
        rt.bones = extractBones(model);

        // Hip world Y in rest pose — used to anchor the keypoint skeleton in scene space
        const hipBone = rt.bones["Hips"];
        if (hipBone) {
          const hp = new THREE.Vector3();
          hipBone.getWorldPosition(hp);
          rt.hipBaseY  = hp.y;
          // skelScale: converts 1 MediaPipe metre → Three.js scene units relative to hip
          // hip sits ~55% up the model; divide by expected hip height in metres (0.95m)
          rt.skelScale = hp.y / 0.95;
        } else {
          // fallback: use half the model's world height
          rt.hipBaseY  = (bbox.max.y - bbox.min.y) * 0.5;
          rt.skelScale = rt.hipBaseY / 0.95;
        }

        const rp = captureRestPose(rt.bones, boneChainRef.current);
        rt.restDirs       = rp.restDirs;
        rt.restQuats      = rp.restQuats;
        rt.restWorldQuats = rp.restWorldQuats;
        rt.restRightHips  = rp.restRightHips;

        // Debug: log rest directions — Hips should be ≈ +Y, LeftUpLeg ≈ -Y
        ["Hips", "Spine1", "Spine2", "LeftUpLeg", "LeftArm"].forEach((b) => {
          const d = rp.restDirs[b];
          if (d)
            console.log(
              `[restDir] ${b}:`,
              d.x.toFixed(2),
              d.y.toFixed(2),
              d.z.toFixed(2),
            );
        });
        console.log("[bones found]", Object.keys(rt.bones).sort().join(", "));

        if (onBonesLoaded) onBonesLoaded(Object.keys(rt.bones).sort());

        // Optional debug joint spheres (separate from skeleton mode spheres)
        if (showJoints) {
          const dbgGeo = new THREE.SphereGeometry(0.025, 8, 6);
          for (const [boneName] of boneChainRef.current) {
            const bone = rt.bones[boneName];
            if (!bone) continue;
            const sphere = new THREE.Mesh(
              dbgGeo,
              new THREE.MeshBasicMaterial({
                color: jointColor(boneName),
                depthTest: false,
              }),
            );
            sphere.renderOrder = 999;
            bone.getWorldPosition(sphere.position);
            scene.add(sphere);
            rt.jointSpheres[boneName] = sphere;
          }
        }
      },
      undefined,
      (err) => console.error("[AvatarViewer] load error:", err),
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el)
        el.removeChild(renderer.domElement);
      keypointsRef.current = null;
      boneWorldPosRef.current = null;
      rt.bones = {};
      rt.restDirs = null;
      rt.restQuats = null;
      rt.restWorldQuats = null;
      rt.restRightHips = null;
      rt.jointSpheres = {};
      rt.model = null;
      rt.scene = null;
      rt.skelLines = null;
      rt.skelSpheres = {};
      rt.hipBaseY = undefined;
      rt.skelScale = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // ── Drive animation whenever keypoints change ────────────────────────────
  useEffect(() => {
    keypointsRef.current = keypoints;
    const rt = rtRef.current;
    if (!rt.model || !keypoints || !rt.restDirs || !rt.restQuats) return;
    applyKeypoints(
      rt.bones,
      keypoints,
      rt.model,
      rt.restDirs,
      rt.restQuats,
      boneChainRef.current,
      rt.restWorldQuats,
      rt.restRightHips,
    );

    // Extract bone world positions — model.updateMatrixWorld(true) already called inside applyKeypoints
    const worldPos = {};
    const tmp = new THREE.Vector3();
    for (const [, fromJoint, toJoint] of boneChainRef.current) {
      const fb = rt.bones[fromJoint];
      const tb = rt.bones[toJoint];
      if (fb) { fb.getWorldPosition(tmp); worldPos[fromJoint] = [tmp.x, tmp.y, tmp.z]; }
      if (tb) { tb.getWorldPosition(tmp); worldPos[toJoint] = [tmp.x, tmp.y, tmp.z]; }
    }
    boneWorldPosRef.current = worldPos;

    if (showJoints) {
      for (const [boneName, sphere] of Object.entries(rt.jointSpheres)) {
        const bone = rt.bones[boneName];
        if (bone) {
          bone.getWorldPosition(tmp);
          sphere.position.copy(tmp);
        }
      }
    }
  }, [keypoints, showJoints]);

  // The canvas must be the topmost element so OrbitControls receives pointer events
  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${className}`}
      style={{ touchAction: "none", position: "relative", zIndex: 0 }}
    />
  );
}

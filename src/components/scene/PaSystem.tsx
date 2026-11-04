"use client";

// The PA: 2x2 sub stacks on the floor beside the stage, each topped with a short ground-stacked
// line array (kept low so nothing blocks the LED wall), and two pole-mounted fill speakers out in
// the room. Woofers pump with the bass.
// Everything is instanced: about a dozen draw calls for ~40 boxes and cones.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pulse } from "./pulse";

// World coordinates (the stage is centred at z = -5, its truss beam hangs at y ≈ 6.25).
const SUB_X = 9.7;
const SUB_Z = -4.5;
const SUB = { w: 1.0, h: 0.72, d: 0.9 };
const SUB_TOP = 2 * SUB.h + 0.02;

// Line arrays are ground-stacked on top of the subs (not flown), so nothing hangs in front of the LED wall.
const ARRAY_X = SUB_X;
const ARRAY_Z = SUB_Z;
const CAB = { w: 1.0, h: 0.26, d: 0.55 };
/** Each cabinet tilts back a little more than the one below, fanning the stack up toward the room. */
const TILT = [0, -0.03, -0.06, -0.09, -0.12, -0.15];
const ARRAY_TOP = SUB_TOP + TILT.length * CAB.h;

const POLES: [number, number][] = [
  [-10.2, 7.4],
  [10.2, 7.4],
];
const POLE_H = 2.3;

const o = new THREE.Object3D();

interface Placement {
  pos: THREE.Vector3;
  rot: THREE.Euler;
}

function arrayCabinets(): Placement[] {
  const out: Placement[] = [];
  for (const side of [-1, 1]) {
    let y = SUB_TOP;
    let z = ARRAY_Z;
    TILT.forEach((a) => {
      y += Math.cos(a) * CAB.h;
      z += Math.sin(a) * CAB.h * 0.5;
      out.push({ pos: new THREE.Vector3(side * ARRAY_X, y - CAB.h / 2, z), rot: new THREE.Euler(a, -side * 0.15, 0) });
    });
  }
  return out;
}

function subBoxes(): Placement[] {
  const out: Placement[] = [];
  for (const side of [-1, 1])
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 2; col++)
        out.push({
          pos: new THREE.Vector3(side * (SUB_X + (col - 0.5) * (SUB.w + 0.02)), SUB.h / 2 + row * (SUB.h + 0.01), SUB_Z),
          rot: new THREE.Euler(0, -side * 0.15, 0),
        });
  return out;
}

function poleCabinets(): Placement[] {
  return POLES.map(([x, z]) => ({
    pos: new THREE.Vector3(x, POLE_H + 0.42, z),
    // aim inward at the dance floor and slightly down
    rot: new THREE.Euler(0.18, Math.atan2(-x, 3.5 - z), 0, "YXZ"),
  }));
}

/** Fill an instanced mesh from placements, with an optional local offset applied in each frame. */
function writeInstances(mesh: THREE.InstancedMesh, list: Placement[], local?: THREE.Vector3, scale = 1) {
  const off = new THREE.Vector3();
  list.forEach((p, i) => {
    o.rotation.copy(p.rot);
    o.position.copy(p.pos);
    if (local) {
      off.copy(local).applyEuler(p.rot);
      o.position.add(off);
    }
    o.scale.setScalar(scale);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

const bodyMat = new THREE.MeshStandardMaterial({ color: "#121216", roughness: 0.65, metalness: 0.25 });
const grilleMat = new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.9, metalness: 0.4 });
const coneMat = new THREE.MeshStandardMaterial({ color: "#1d1d22", roughness: 0.5, metalness: 0.5, emissive: "#ff2bd6", emissiveIntensity: 0.12 });
const steelMat = new THREE.MeshStandardMaterial({ color: "#9aa0ad", metalness: 0.9, roughness: 0.3 });

export function PaSystem() {
  const cabs = useMemo(() => arrayCabinets(), []);
  const subs = useMemo(() => subBoxes(), []);
  const poles = useMemo(() => poleCabinets(), []);

  const geo = useMemo(() => {
    const cab = new THREE.BoxGeometry(CAB.w, CAB.h * 0.97, CAB.d);
    const grille = new THREE.PlaneGeometry(CAB.w * 0.94, CAB.h * 0.78);
    const sub = new THREE.BoxGeometry(SUB.w, SUB.h, SUB.d);
    const subCone = new THREE.CylinderGeometry(0.29, 0.2, 0.08, 28);
    subCone.rotateX(Math.PI / 2);
    const subRing = new THREE.TorusGeometry(0.31, 0.02, 6, 32);
    const poleCab = new THREE.BoxGeometry(0.5, 0.8, 0.45);
    const poleCone = new THREE.CylinderGeometry(0.17, 0.12, 0.05, 22);
    poleCone.rotateX(Math.PI / 2);
    const pole = new THREE.CylinderGeometry(0.035, 0.035, POLE_H, 10);
    pole.translate(0, POLE_H / 2, 0);
    const tripod = new THREE.ConeGeometry(0.45, 0.9, 3, 1, true);
    tripod.translate(0, 0.45, 0);
    const frame = new THREE.BoxGeometry(CAB.w * 1.1, 0.06, CAB.d);
    // thin glowing strip along the bottom of each cabinet so the black boxes read against the dark room
    const strip = new THREE.BoxGeometry(CAB.w * 0.96, 0.018, 0.01);
    const subStrip = new THREE.BoxGeometry(SUB.w * 0.96, 0.025, 0.01);
    return { cab, grille, sub, subCone, subRing, poleCab, poleCone, pole, tripod, frame, strip, subStrip };
  }, []);

  const cabRef = useRef<THREE.InstancedMesh>(null);
  const grilleRef = useRef<THREE.InstancedMesh>(null);
  const subRef = useRef<THREE.InstancedMesh>(null);
  const subConeRef = useRef<THREE.InstancedMesh>(null);
  const subRingRef = useRef<THREE.InstancedMesh>(null);
  const poleCabRef = useRef<THREE.InstancedMesh>(null);
  const poleConeRef = useRef<THREE.InstancedMesh>(null);
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const tripodRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const stripRef = useRef<THREE.InstancedMesh>(null);
  const subStripRef = useRef<THREE.InstancedMesh>(null);
  const stripMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff2bd6", toneMapped: false }), []);

  // static parts
  useEffect(() => {
    if (cabRef.current) writeInstances(cabRef.current, cabs);
    if (grilleRef.current) writeInstances(grilleRef.current, cabs, new THREE.Vector3(0, 0, CAB.d / 2 + 0.002));
    if (subRef.current) writeInstances(subRef.current, subs);
    if (stripRef.current) writeInstances(stripRef.current, cabs, new THREE.Vector3(0, -CAB.h * 0.42, CAB.d / 2 + 0.006));
    if (subStripRef.current) writeInstances(subStripRef.current, subs, new THREE.Vector3(0, -SUB.h * 0.44, SUB.d / 2 + 0.006));
    if (subRingRef.current) writeInstances(subRingRef.current, subs, new THREE.Vector3(0, 0, SUB.d / 2 + 0.01));
    if (poleCabRef.current) writeInstances(poleCabRef.current, poles);
    const flat = (list: [number, number, number][]) => list.map(([x, y, z]) => ({ pos: new THREE.Vector3(x, y, z), rot: new THREE.Euler() }));
    if (poleRef.current) writeInstances(poleRef.current, flat(POLES.map(([x, z]) => [x, 0, z])));
    if (tripodRef.current) writeInstances(tripodRef.current, flat(POLES.map(([x, z]) => [x, 0, z])));
    // rigging frame on top of each array, hung from the truss by two chains
    if (frameRef.current) writeInstances(frameRef.current, flat([-1, 1].map((s) => [s * ARRAY_X, ARRAY_TOP + 0.03, ARRAY_Z - 0.04])));
  }, [cabs, subs, poles]);

  // woofers pump with the bass
  useFrame(() => {
    const push = pulse.bass * 0.06 + pulse.kick * 0.05;
    if (subConeRef.current) writeInstances(subConeRef.current, subs, new THREE.Vector3(0, 0, SUB.d / 2 + 0.02 + push), 1 + pulse.kick * 0.06);
    if (poleConeRef.current) writeInstances(poleConeRef.current, poles, new THREE.Vector3(0, -0.12, 0.23 + push * 0.5), 1 + pulse.kick * 0.05);
    coneMat.emissiveIntensity = 0.08 + pulse.kick * 0.4;
    stripMat.color.setHSL((pulse.time * 0.08) % 1, 1, 0.35 + pulse.kick * 0.3);
  });

  return (
    <group>
      <instancedMesh ref={cabRef} args={[geo.cab, bodyMat, cabs.length]} raycast={() => null} />
      <instancedMesh ref={grilleRef} args={[geo.grille, grilleMat, cabs.length]} raycast={() => null} />
      <instancedMesh ref={stripRef} args={[geo.strip, stripMat, cabs.length]} raycast={() => null} />
      <instancedMesh ref={subStripRef} args={[geo.subStrip, stripMat, subs.length]} raycast={() => null} />
      <instancedMesh ref={frameRef} args={[geo.frame, steelMat, 2]} raycast={() => null} />
      <instancedMesh ref={subRef} args={[geo.sub, bodyMat, subs.length]} raycast={() => null} />
      <instancedMesh ref={subConeRef} args={[geo.subCone, coneMat, subs.length]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={subRingRef} args={[geo.subRing, steelMat, subs.length]} raycast={() => null} />
      <instancedMesh ref={poleRef} args={[geo.pole, steelMat, POLES.length]} raycast={() => null} />
      <instancedMesh ref={tripodRef} args={[geo.tripod, steelMat, POLES.length]} raycast={() => null} />
      <instancedMesh ref={poleCabRef} args={[geo.poleCab, bodyMat, POLES.length]} raycast={() => null} />
      <instancedMesh ref={poleConeRef} args={[geo.poleCone, coneMat, POLES.length]} frustumCulled={false} raycast={() => null} />
    </group>
  );
}

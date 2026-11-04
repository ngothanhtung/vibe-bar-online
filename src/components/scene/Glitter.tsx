"use client";

// Extra light show around the dance floor:
// - chasing LED strips along both side edges of the floor, plus LED pillars that work as VU meters
//   for the live spectrum;
// - three mirror balls (centre + two sides) whose twinkling facets throw coloured beams down to
//   swirling light spots on the floor.
// All instanced: a handful of draw calls.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { pulse } from "./pulse";
import { spectrumLevels, BANDS } from "./spectrum";
import { beamMaterial } from "./Lasers";

const tmp = new THREE.Object3D();
const col = new THREE.Color();

// ---------------------------------------------------------------------------
// Floor-side LEDs
// ---------------------------------------------------------------------------
const EDGE_X = 10.08;
const Z0 = -3.4;
const Z1 = 10.4;
const STRIP_N = 36; // lamps per side
const PILLAR_Z = [-2.2, 0.9, 4.0, 7.1, 10.0];
const SEGMENTS = 14;
const SEG_H = 0.13;

export function FloorSideLeds() {
  const strip = useRef<THREE.InstancedMesh>(null);
  const segs = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const pillarCount = PILLAR_Z.length * 2;

  useFrame(() => {
    const s = strip.current;
    const g = segs.current;
    const c = caps.current;
    if (!s || !g || !c) return;
    const t = pulse.time;
    const step = Math.floor((pulse.beat + pulse.phase) * 4);

    // chasing strip: a comet of light runs from the stage toward the crowd on every 16th
    let i = 0;
    for (const side of [-1, 1]) {
      for (let k = 0; k < STRIP_N; k++, i++) {
        const z = Z0 + (k / (STRIP_N - 1)) * (Z1 - Z0);
        tmp.position.set(side * EDGE_X, 0.04, z);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.setScalar(1);
        tmp.updateMatrix();
        s.setMatrixAt(i, tmp.matrix);
        const head = (step % STRIP_N + STRIP_N) % STRIP_N;
        const dist = (k - head + STRIP_N) % STRIP_N;
        const tail = dist < 6 ? 1 - dist / 6 : 0;
        col.setHSL((t * 0.08 + k / STRIP_N + (side > 0 ? 0.5 : 0)) % 1, 1, 0.12 + tail * 0.5 + pulse.kick * 0.15);
        s.setColorAt(i, col);
      }
    }
    s.instanceMatrix.needsUpdate = true;
    if (s.instanceColor) s.instanceColor.needsUpdate = true;

    // VU-meter pillars: each one shows a band of the live spectrum, lows near the stage
    let si = 0;
    let p = 0;
    for (const side of [-1, 1]) {
      PILLAR_Z.forEach((z, pi) => {
        const band = Math.min(BANDS - 1, Math.round((pi / (PILLAR_Z.length - 1)) * (BANDS * 0.7)));
        const level = Math.min(1, spectrumLevels[band] * 1.15);
        const lit = Math.round(level * SEGMENTS);
        for (let k = 0; k < SEGMENTS; k++, si++) {
          tmp.position.set(side * EDGE_X, 0.12 + k * SEG_H, z);
          tmp.updateMatrix();
          g.setMatrixAt(si, tmp.matrix);
          const u = k / (SEGMENTS - 1);
          const on = k < lit;
          col.setHSL(u < 0.55 ? 0.33 : u < 0.8 ? 0.14 : 0.0, 1, on ? 0.5 : 0.06);
          g.setColorAt(si, col);
        }
        // glowing cap that floats at the top
        tmp.position.set(side * EDGE_X, 0.14 + SEGMENTS * SEG_H, z);
        tmp.updateMatrix();
        c.setMatrixAt(p, tmp.matrix);
        col.setHSL((t * 0.1 + pi * 0.15) % 1, 1, 0.45 + pulse.kick * 0.3);
        c.setColorAt(p, col);
        p++;
      });
    }
    g.instanceMatrix.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={strip} args={[undefined, undefined, STRIP_N * 2]} frustumCulled={false} raycast={() => null}>
        <boxGeometry args={[0.1, 0.05, 0.28]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={segs} args={[undefined, undefined, pillarCount * SEGMENTS]} frustumCulled={false} raycast={() => null}>
        <boxGeometry args={[0.16, SEG_H * 0.78, 0.16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, pillarCount]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[0.1, 14, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Mirror balls
// ---------------------------------------------------------------------------
const BALLS: { pos: THREE.Vector3; r: number; spin: number }[] = [
  { pos: new THREE.Vector3(0, 8.6, 3), r: 0.75, spin: 1 }, // high enough to clear the LED sign from the floor view
  { pos: new THREE.Vector3(-7.2, 6.7, 3.5), r: 0.55, spin: -1.25 },
  { pos: new THREE.Vector3(7.2, 6.7, 3.5), r: 0.55, spin: 1.25 },
];
const SPOTS_PER_BALL = 26;
const SPOT_COUNT = BALLS.length * SPOTS_PER_BALL;

/** Faceted ball geometry with a slightly different silver tint per facet. */
function ballGeometry(r: number) {
  const g = new THREE.IcosahedronGeometry(r, 3).toNonIndexed();
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let f = 0; f < n / 3; f++) {
    const v = 0.55 + Math.random() * 0.45;
    const tint = Math.random();
    for (let k = 0; k < 3; k++) {
      colors[(f * 3 + k) * 3] = v * (tint < 0.15 ? 1.0 : 0.92);
      colors[(f * 3 + k) * 3 + 1] = v * 0.95;
      colors[(f * 3 + k) * 3 + 2] = v * (tint > 0.85 ? 1.0 : 0.98);
    }
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Mirror tiles: per-facet colour, a moving glint across the surface and a flash on the kick. */
function mirrorMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.18, flatShading: true });
  m.userData.uTime = { value: 0 };
  m.userData.uKick = { value: 0 };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = m.userData.uTime;
    shader.uniforms.uKick = m.userData.uKick;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uKick;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  // facets catch the light as the ball turns: a glint per facet keyed off its screen-space normal
  vec3 fn = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
  float glint = pow(max(0.0, sin(dot(fn, vec3(17.0, 23.0, 11.0)) + uTime * 3.0)), 24.0);
  totalEmissiveRadiance += diffuseColor.rgb * (0.35 + uKick * 0.6) + vec3(1.0) * glint * (1.5 + uKick * 2.0);`,
      );
  };
  return m;
}

export function MirrorBalls() {
  const balls = useRef<THREE.Group[]>([]);
  const spots = useRef<THREE.InstancedMesh>(null);
  const beams = useRef<THREE.InstancedMesh>(null);
  const { geos, mat, seeds, beamMat, beamGeo } = useMemo(() => {
    const seeds = Array.from({ length: SPOT_COUNT }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 1.5 + Math.random() * 8.5,
      hue: Math.random(),
      wob: Math.random() * 10,
    }));
    const beamGeo = new THREE.CylinderGeometry(0.01, 0.07, 1, 6, 1, true);
    beamGeo.translate(0, -0.5, 0); // hangs from the ball, scaled to reach the floor
    return { geos: BALLS.map((b) => ballGeometry(b.r)), mat: mirrorMaterial(), seeds, beamMat: beamMaterial(0.5), beamGeo };
  }, []);

  useFrame((_, dt) => {
    const t = pulse.time;
    mat.userData.uTime.value = t;
    mat.userData.uKick.value = pulse.kick;
    const spin = 0.35 + pulse.hype * 0.7 + pulse.drop * 1.5;
    balls.current.forEach((g, i) => g && (g.rotation.y += dt * spin * BALLS[i].spin));

    const s = spots.current;
    const bm = beams.current;
    if (!s || !bm) return;
    const down = new THREE.Vector3(0, -1, 0);
    const dir = new THREE.Vector3();
    const q = new THREE.Quaternion();
    seeds.forEach((sd, i) => {
      const ball = BALLS[Math.floor(i / SPOTS_PER_BALL)];
      const rot = (balls.current[Math.floor(i / SPOTS_PER_BALL)]?.rotation.y ?? 0) + sd.a;
      const r = sd.r * (0.85 + 0.15 * Math.sin(t * 0.7 + sd.wob));
      const x = ball.pos.x + Math.cos(rot) * r;
      const z = ball.pos.z + Math.sin(rot) * r;
      // light spot on the floor
      tmp.position.set(x, 0.075, z);
      tmp.rotation.set(-Math.PI / 2, 0, 0);
      tmp.scale.setScalar(0.8 + pulse.kick * 0.5);
      tmp.updateMatrix();
      s.setMatrixAt(i, tmp.matrix);
      col.setHSL((sd.hue + t * 0.05) % 1, 0.9, 0.55 + pulse.kick * 0.25);
      s.setColorAt(i, col);
      // beam from the ball to its spot
      dir.set(x - ball.pos.x, 0.075 - ball.pos.y, z - ball.pos.z);
      const len = dir.length();
      dir.normalize();
      q.setFromUnitVectors(down, dir);
      tmp.position.copy(ball.pos);
      tmp.quaternion.copy(q);
      tmp.scale.set(1, len, 1);
      tmp.updateMatrix();
      bm.setMatrixAt(i, tmp.matrix);
      col.multiplyScalar(0.35 + pulse.kick * 0.5 + pulse.drop * 0.5);
      bm.setColorAt(i, col);
    });
    s.instanceMatrix.needsUpdate = true;
    bm.instanceMatrix.needsUpdate = true;
    if (s.instanceColor) s.instanceColor.needsUpdate = true;
    if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {BALLS.map((b, i) => (
        <group key={i} position={b.pos}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 2.0]} />
            <meshBasicMaterial color="#666" />
          </mesh>
          <group ref={(g) => { if (g) balls.current[i] = g; }}>
            <mesh geometry={geos[i]} material={mat} />
          </group>
          {/* twinkling reflections scattered around the room */}
          <Sparkles count={i === 0 ? 260 : 140} scale={[i === 0 ? 30 : 16, 7, 22]} position={[0, -3, 0]} size={i === 0 ? 5 : 4} speed={0.3} color={i === 0 ? "#ffffff" : i === 1 ? "#ffd1f5" : "#cdf6ff"} opacity={0.85} />
        </group>
      ))}
      <instancedMesh ref={beams} args={[beamGeo, beamMat, SPOT_COUNT]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={spots} args={[undefined, undefined, SPOT_COUNT]} frustumCulled={false} raycast={() => null}>
        <circleGeometry args={[0.14, 16]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

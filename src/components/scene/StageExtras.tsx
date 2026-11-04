"use client";

// Extra stage dressing around the DJ booth: a lighting truss with moving-head spots,
// an LED stage skirt, chasing edge lights, go-go podiums, and a back row of dancers.
// Everything here lives in the booth's local space (stage centre at the origin, top at y = 0.5).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pulse } from "./pulse";
import { POSE_PRIORITY, useFigure } from "./figures";
import { beamMaterial } from "./Lasers";
import { createRig, FLASHMOB_DANCES, GOGO_DANCES, poseRig, type Look } from "./chibi";
import { useClub } from "@/lib/store";
import { useStageTag } from "./labels";

const TRUSS_X = 8.2;
const TRUSS_Z = 1.0;
const TRUSS_TOP = 6.4;

// ---------------------------------------------------------------------------
// Truss
// ---------------------------------------------------------------------------

/** A square box-truss segment of length `len` along +y: four rails plus zig-zag braces. */
function trussGeometry(len: number, w = 0.26) {
  const parts: THREE.BufferGeometry[] = [];
  const h = w / 2;
  for (const [x, z] of [[h, h], [-h, h], [h, -h], [-h, -h]]) {
    const rail = new THREE.CylinderGeometry(0.022, 0.022, len, 6);
    rail.translate(x, len / 2, z);
    parts.push(rail);
  }
  const steps = Math.max(2, Math.round(len / w));
  const seg = len / steps;
  const brace = Math.hypot(w, seg);
  const ang = Math.atan2(w, seg);
  for (let i = 0; i < steps; i++) {
    const y = i * seg + seg / 2;
    const flip = i % 2 ? 1 : -1;
    for (const face of [0, 1, 2, 3]) {
      const b = new THREE.CylinderGeometry(0.012, 0.012, brace, 4);
      b.rotateZ(ang * flip);
      // put the brace on one of the four faces
      if (face === 0) b.translate(0, y, h);
      if (face === 1) b.translate(0, y, -h);
      if (face === 2) {
        b.rotateY(Math.PI / 2);
        b.translate(h, y, 0);
      }
      if (face === 3) {
        b.rotateY(Math.PI / 2);
        b.translate(-h, y, 0);
      }
      parts.push(b);
    }
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()));
}

const trussMat = new THREE.MeshStandardMaterial({ color: "#b8bcc8", metalness: 0.9, roughness: 0.3 });

function Truss() {
  const geo = useMemo(() => {
    const tower = trussGeometry(TRUSS_TOP);
    const top = trussGeometry(TRUSS_X * 2);
    const side = trussGeometry(3.4);
    return { tower, top, side };
  }, []);
  return (
    <group>
      {[-TRUSS_X, TRUSS_X].map((x) => (
        <group key={x}>
          <mesh geometry={geo.tower} material={trussMat} position={[x, 0, TRUSS_Z]} />
          {/* base plate */}
          <mesh position={[x, 0.03, TRUSS_Z]} material={trussMat}>
            <boxGeometry args={[0.6, 0.06, 0.6]} />
          </mesh>
          {/* side beam running back over the stage */}
          <mesh geometry={geo.side} material={trussMat} position={[x, TRUSS_TOP, TRUSS_Z]} rotation-x={-Math.PI / 2} />
        </group>
      ))}
      {/* front beam across the top */}
      <mesh geometry={geo.top} material={trussMat} position={[-TRUSS_X, TRUSS_TOP, TRUSS_Z]} rotation-z={-Math.PI / 2} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Moving-head spots hanging from the front beam
// ---------------------------------------------------------------------------
const HEAD_XS = [-6.6, -4.4, -2.2, 0, 2.2, 4.4, 6.6];
const BEAM_LEN = 11;

function MovingHeads() {
  const heads = useRef<THREE.Group[]>([]);
  const beams = useRef<THREE.Mesh[]>([]);
  const lenses = useRef<THREE.MeshBasicMaterial[]>([]);
  const { beamGeo, mats } = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.07, 0.75, BEAM_LEN, 20, 1, true);
    g.translate(0, -BEAM_LEN / 2, 0);
    return { beamGeo: g, mats: HEAD_XS.map(() => beamMaterial(0.32)) };
  }, []);

  useFrame(() => {
    const t = pulse.time;
    const dropping = pulse.drop > 0.15;
    const strobe = dropping ? (Math.floor(t * 14) % 2 ? 1 : 0.1) : 1;
    const mode = Math.floor(pulse.beat / 8) % 3;
    heads.current.forEach((h, i) => {
      if (!h) return;
      const side = i < HEAD_XS.length / 2 ? -1 : 1;
      // pan/tilt patterns: fan sweep, crossing, then all pointing at the dance floor centre
      if (mode === 0) {
        h.rotation.set(-(0.55 + Math.sin(t * 1.2 + i) * 0.35), 0, Math.sin(t * 0.9 + i * 0.6) * 0.6);
      } else if (mode === 1) {
        h.rotation.set(-0.7, 0, side * (0.3 + Math.sin(t * 1.6) * 0.5));
      } else {
        h.rotation.set(-(0.85 + Math.sin(t * 3 + i) * 0.12), 0, HEAD_XS[i] * 0.06 + Math.sin(t * 2) * 0.15);
      }
    });
    mats.forEach((m, i) => {
      const hue = dropping ? (t * 0.6 + i * 0.1) % 1 : (t * 0.05 + i * 0.12) % 1;
      m.color.setHSL(hue, dropping ? 0.3 : 1, 0.6);
      m.opacity = (0.18 + pulse.kick * 0.35 + pulse.hype * 0.12) * strobe;
      const lens = lenses.current[i];
      if (lens) lens.color.copy(m.color).multiplyScalar(1.5 * strobe);
    });
  });

  return (
    <group>
      {HEAD_XS.map((x, i) => (
        <group key={x} position={[x, TRUSS_TOP - 0.2, TRUSS_Z]}>
          {/* clamp + yoke */}
          <mesh position={[0, 0.08, 0]} material={trussMat}>
            <boxGeometry args={[0.1, 0.12, 0.1]} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.36, 0.06, 0.18]} />
            <meshStandardMaterial color="#1a1a22" metalness={0.6} roughness={0.4} />
          </mesh>
          <group ref={(g) => { if (g) heads.current[i] = g; }} position={[0, -0.22, 0]}>
            <mesh>
              <cylinderGeometry args={[0.13, 0.11, 0.3, 16]} />
              <meshStandardMaterial color="#202028" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, -0.152, 0]} rotation-x={Math.PI / 2}>
              <circleGeometry args={[0.1, 18]} />
              <meshBasicMaterial ref={(m) => { if (m) lenses.current[i] = m; }} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={(m) => { if (m) beams.current[i] = m; }} geometry={beamGeo} material={mats[i]} position={[0, -0.15, 0]} raycast={() => null} />
          </group>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// LED stage skirt + chasing edge lights
// ---------------------------------------------------------------------------
const skirtFragment = /* glsl */ `
uniform float uTime; uniform float uKick;
varying vec2 vUv;
vec3 hsl(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
void main(){
  vec2 grid = vec2(120.0, 10.0);
  vec2 f = fract(vUv * grid);
  float x = floor(vUv.x * grid.x) / grid.x;
  float wave = 0.5 + 0.5 * sin(x * 30.0 - uTime * 6.0);
  float lit = step(1.0 - wave * (0.6 + uKick), vUv.y + 0.2);
  vec3 col = hsl(fract(x * 0.8 - uTime * 0.12)) * lit;
  float dot = smoothstep(0.5, 0.3, length(f - 0.5));
  gl_FragColor = vec4(col * dot, 1.0);
}
`;

function StageSkirt() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uKick: { value: 0 } }), []);
  useFrame(() => {
    uniforms.uTime.value = pulse.time;
    uniforms.uKick.value = pulse.kick;
  });
  return (
    <mesh position={[0, 0.24, 1.502]}>
      <planeGeometry args={[16, 0.42]} />
      <shaderMaterial
        uniforms={uniforms}
        toneMapped={false}
        vertexShader="varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
        fragmentShader={skirtFragment}
      />
    </mesh>
  );
}

const EDGE_N = 40;
const tmpO = new THREE.Object3D();
const tmpC = new THREE.Color();

/** Round lamps along the front and sides of the stage top, chasing on the beat. */
function EdgeLights() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const s: [number, number][] = [];
    for (let i = 0; i < 24; i++) s.push([-7.8 + (i / 23) * 15.6, 1.42]);
    for (let i = 0; i < 8; i++) s.push([-7.92, 1.1 - i * 0.55], [7.92, 1.1 - i * 0.55]);
    return s.slice(0, EDGE_N);
  }, []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const step = Math.floor((pulse.beat + pulse.phase) * 4);
    spots.forEach(([x, z], i) => {
      if (m.userData.init !== true) {
        tmpO.position.set(x, 0.505, z);
        tmpO.updateMatrix();
        m.setMatrixAt(i, tmpO.matrix);
      }
      const on = (i + step) % 4 === 0 || pulse.drop > 0.3;
      tmpC.setHSL((pulse.time * 0.1 + i * 0.03) % 1, 1, on ? 0.6 : 0.12);
      m.setColorAt(i, tmpC);
    });
    m.userData.init = true;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, EDGE_N]} raycast={() => null}>
      <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// Go-go dancers on podiums
// ---------------------------------------------------------------------------
const DANCER_BASE = { eye: "#16121c", white: "#ffffff", blush: "#ff9db2", dark: "#141418", gold: "#f5c542", visor: "#7df9ff" };

/** Male dancers on the outer podiums: shirtless, long pants, short spiky hair. */
function maleDancer(x: number, z: number, name: string, skin: string, hairColor: string, pants: string, shoe: string, light: string, extras: Partial<Look> = {}, figureScale = 1, outfitColor = pants) {
  return {
    x,
    z,
    name,
    light,
    figureScale,
    look: {
      gender: "m" as const,
      hair: "spiky" as const,
      top: "shirtless" as const,
      bottom: "pants" as const,
      glasses: false,
      shades: false,
      bow: false,
      blush: false,
      chain: false,
      hat: "none" as const,
      ...extras,
      palette: { ...DANCER_BASE, skin, hair: hairColor, outfit: outfitColor, accent: "#ffffff", pants, shoe },
    },
  };
}

/** Dancers in a bikini top with long jeans, hair in a bun. */
function jeansDancer(x: number, z: number, name: string, skin: string, hairColor: string, top: string, denim: string, light: string, extras: Partial<Look> = {}) {
  return {
    x,
    z,
    name,
    light,
    look: {
      gender: "f" as const,
      figure: "slim" as const,
      hair: "long" as const,
      braided: true,
      top: "bikini" as const,
      bottom: "pants" as const,
      boots: false,
      glasses: false,
      shades: false,
      bow: false,
      blush: true,
      chain: false,
      hat: "none" as const,
      ...extras,
      palette: { ...DANCER_BASE, skin, hair: hairColor, outfit: top, accent: "#c9a46a", pants: denim, shoe: "#f5f5f0" },
    },
  };
}

const DANCERS: { x: number; z?: number; name: string; look: Look; light: string; figureScale?: number }[] = [
  {
    x: -3.7,
    z: 0.8,
    name: "CHI CHANH CHUA",
    light: "#ff2bd6",
    look: {
      gender: "f",
      figure: "slim",
      hair: "long",
      braided: true,
      top: "bikini",
      bottom: "bikini",
      boots: true,
      glasses: false,
      shades: false,
      bow: false,
      blush: true,
      chain: true,
      hat: "none",
      palette: { ...DANCER_BASE, skin: "#f6d2b4", hair: "#1d1a1f", outfit: "#ff2bd6", accent: "#ffffff", pants: "#1a1a1f", shoe: "#ffffff" },
    },
  },
  {
    x: 3.7,
    z: 0.8,
    name: "LAN LẢ LƯỚT",
    light: "#00e5ff",
    look: {
      gender: "f",
      figure: "slim",
      hair: "long",
      braided: true,
      top: "bikini",
      bottom: "bikini",
      boots: true,
      glasses: false,
      shades: false,
      bow: false,
      blush: true,
      chain: false,
      hat: "catEars",
      palette: { ...DANCER_BASE, skin: "#eec09a", hair: "#1d1a1f", outfit: "#00e5ff", accent: "#1c1c20", pants: "#1a1a1f", shoe: "#ff2bd6" },
    },
  },
  // two more on each side, on podiums further out
  jeansDancer(-5.5, 0.1, "HƯƠNG HÓNG HỚT", "#fde3cc", "#1d1a1f", "#ff3b5c", "#3d5f94", "#ff3b5c", { hat: "bucket" }),
  jeansDancer(-7.3, 0.8, "PHƯƠNG PHỦ PHÀNG", "#f6d2b4", "#1d1a1f", "#ff7a1a", "#34507e", "#ffe600"),
  jeansDancer(5.5, 0.1, "LINH LÍ LẮC", "#f6d2b4", "#1d1a1f", "#ffffff", "#25324f", "#00e5ff"),
  jeansDancer(7.3, 0.8, "OANH LOANH QUANH", "#fde3cc", "#1d1a1f", "#a66bff", "#3d5f94", "#ff3b5c"),
];

const BACK_ROW_DANCERS = [
  maleDancer(-3.5, -1.5, "TUẤN TƯƠI TẮN", "#f2c9a5", "#2a211c", "#34507e", "#f5f5f0", "#ff2bd6", { top: "tee", bottom: "shorts", chain: true }, 1, "#e33c83"),
  maleDancer(-4.8, -1.5, "VŨ VỪA VẶN", "#e6b48a", "#1d1a1f", "#a33c5b", "#f5f5f0", "#ffe600", { top: "tank", bottom: "shorts", hat: "snapback" }, 1, "#f2c230"),
  maleDancer(-6.1, -1.5, "TÙNG TÍ TỬNG", "#d9a37c", "#eceaf2", "#276a65", "#1c1c20", "#00e5ff", { top: "floral", bottom: "shorts", chain: true }, 1, "#276a65"),
  maleDancer(-7.4, -1.5, "NAM NÔ NỨC", "#6b3f2a", "#3b2618", "#6c4a91", "#f5f5f0", "#7cff4f", { top: "hoodie", bottom: "shorts" }, 1, "#6c4a91"),
  maleDancer(-8.7, -1.5, "CƯỜNG CỤC CẰN", "#f2c9a5", "#2a211c", "#34507e", "#f5f5f0", "#7cff4f", { top: "jacket", bottom: "shorts", chain: true }, 0.88, "#34507e"),
  maleDancer(3.5, -1.5, "VIỆT VẶN VẸO", "#eec09a", "#1d1a1f", "#a33c5b", "#1c1c20", "#00e5ff", { top: "long", bottom: "shorts", hat: "headband" }, 1, "#2497a8"),
  maleDancer(4.8, -1.5, "PHONG PHƠI PHỚI", "#f6d2b4", "#2a211c", "#34507e", "#f5f5f0", "#a66bff", { top: "tee", bottom: "shorts", chain: true, glasses: true }, 1, "#a66bff"),
  maleDancer(6.1, -1.5, "VINH VỘI VÃ", "#d9a37c", "#eceaf2", "#276a65", "#1c1c20", "#ff3b5c", { top: "tank", bottom: "shorts", glasses: true }, 1, "#d23b58"),
  maleDancer(7.4, -1.5, "SINH SUNG SỨC", "#e6b48a", "#3b2618", "#6c4a91", "#f5f5f0", "#ffe600", { top: "floral", bottom: "shorts", chain: true, glasses: true }, 1, "#32826f"),
  maleDancer(8.7, -1.5, "BÌNH BỪA BÃI", "#e6b48a", "#eceaf2", "#f0ede6", "#1c1c20", "#a66bff", { top: "hoodie", bottom: "shorts" }, 0.88, "#f0ede6"),
];

const PODIUM_H = 0.6;
const BACK_ROW_PODIUM_H = 1.7;
const STAGE_TOP = 0.5;
const BACK_ROW_Z = -1.5;
const BACK_ROW_PLATFORM_WIDTH = 5.8;

function GogoPodium({ x, z = 1.4, name, look, light, seed, figureScale = 1 }: { x: number; z?: number; name: string; look: Look; light: string; seed: number; figureScale?: number }) {
  const rig = useMemo(() => {
    const r = createRig(look);
    return r;
  }, [look]);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const dancer = useRef<THREE.Group>(null);
  useStageTag(dancer, name, light);
  useFigure(rig, look.palette);
  const band = useRef<THREE.MeshBasicMaterial>(null);
  const spotMat = useMemo(() => {
    const m = beamMaterial(0.3);
    m.color.set(light);
    return m;
  }, [light]);
  const spotGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.08, 0.75, 4.2, 20, 1, true);
    g.translate(0, -2.1, 0);
    return g;
  }, []);

  useFrame(() => {
    const dropping = pulse.drop > 0.2;
    const flashmob = FLASHMOB_DANCES[Math.floor(useClub.getState().dropAt) % FLASHMOB_DANCES.length];
    // Choreography: the two dancers of a pair (same distance from centre) mirror each other's dance,
    // each pair dances something different, and everyone switches together every 8 beats.
    // seed 0 = no phase offset, so every move lands exactly on the beat.
    const troupe = Math.abs(x) < 5 ? 0 : Math.abs(x) < 6.5 ? 1 : 2;
    const phrase = Math.floor(pulse.beat / 8);
    const style = dropping ? flashmob : GOGO_DANCES[(phrase + troupe * 3) % GOGO_DANCES.length];
    poseRig(rig, { time: pulse.time, phase: pulse.phase, beat: pulse.beat, energy: 0.85, style, seed: 0 });
    const hue = (pulse.time * 0.08 + seed + Math.floor(pulse.beat / 2) * 0.12) % 1;
    const brightness = Math.min(0.9, (pulse.phase < 0.18 ? 0.62 : 0.28) + pulse.kick * 0.2 + pulse.drop * 0.25);
    if (ring.current) ring.current.color.setHSL((hue + 0.12) % 1, 1, brightness);
    if (band.current) band.current.color.setHSL(hue, 1, brightness);
    spotMat.opacity = 0.16 + pulse.kick * 0.25;
  }, POSE_PRIORITY);

  return (
    <group position={[x, STAGE_TOP, z]}>
      <mesh position={[0, PODIUM_H / 2, 0]}>
        <cylinderGeometry args={[0.55, 0.62, PODIUM_H, 32]} />
        <meshStandardMaterial color="#14101c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, PODIUM_H * 0.55, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.06, 32, 1, true]} />
        <meshBasicMaterial ref={band} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, PODIUM_H + 0.005, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.46, 0.56, 40]} />
        <meshBasicMaterial ref={ring} toneMapped={false} />
      </mesh>
      {/* dancer, turned slightly toward the room */}
      <group ref={dancer} position={[0, PODIUM_H, 0]} rotation-y={-Math.sign(x) * 0.35} scale={figureScale}>
        <primitive object={rig.root} />
      </group>
      {/* overhead spot on the dancer */}
      <mesh geometry={spotGeo} material={spotMat} position={[0, PODIUM_H + 4.3, 0]} raycast={() => null} />
    </group>
  );
}

function BackRowPlatform({ x, color }: { x: number; color: string }) {
  const width = BACK_ROW_PLATFORM_WIDTH;
  const depth = 1.5;
  const ledMaterials = useRef<THREE.MeshBasicMaterial[]>([]);
  const baseHue = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(color).getHSL(hsl);
    return hsl.h;
  }, [color]);

  useFrame(() => {
    const beatPulse = pulse.phase < 0.18 ? 0.62 : 0.28;
    const brightness = Math.min(0.9, beatPulse + pulse.kick * 0.2 + pulse.drop * 0.25);
    ledMaterials.current.forEach((material, i) => {
      if (!material) return;
      const hue = (baseHue + pulse.time * 0.08 + Math.floor(pulse.beat / 2) * 0.12 + i * 0.16) % 1;
      material.color.setHSL(hue, 1, brightness);
    });
  }, POSE_PRIORITY);

  return (
    <group position={[x, STAGE_TOP, BACK_ROW_Z]}>
      <mesh position={[0, BACK_ROW_PODIUM_H / 2, 0]}>
        <boxGeometry args={[width, BACK_ROW_PODIUM_H, depth]} />
        <meshStandardMaterial color="#14101c" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, BACK_ROW_PODIUM_H + 0.025, 0]}>
        <boxGeometry args={[width - 0.12, 0.05, depth - 0.12]} />
        <meshStandardMaterial color="#292334" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.38, depth / 2 + 0.02]}>
        <boxGeometry args={[width - 0.08, 0.08, 0.035]} />
        <meshBasicMaterial ref={(material) => { if (material) ledMaterials.current[0] = material; }} color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, BACK_ROW_PODIUM_H + 0.055, depth / 2 - 0.04]}>
        <boxGeometry args={[width - 0.18, 0.035, 0.04]} />
        <meshBasicMaterial ref={(material) => { if (material) ledMaterials.current[1] = material; }} color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function BackRowDancer({ x, name, look, light, seed, figureScale = 1 }: { x: number; name: string; look: Look; light: string; seed: number; figureScale?: number }) {
  const rig = useMemo(() => createRig(look), [look]);
  const dancer = useRef<THREE.Group>(null);
  useStageTag(dancer, name, light);
  useFigure(rig, look.palette);
  const spotMat = useMemo(() => {
    const material = beamMaterial(0.3);
    material.color.set(light);
    return material;
  }, [light]);
  const spotGeo = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.08, 0.75, 4.2, 20, 1, true);
    geometry.translate(0, -2.1, 0);
    return geometry;
  }, []);

  useFrame(() => {
    const dropping = pulse.drop > 0.2;
    const dancerOffset = Math.floor(seed);
    const flashmobStart = Math.floor(useClub.getState().dropAt);
    const style = dropping
      ? FLASHMOB_DANCES[(flashmobStart + dancerOffset) % FLASHMOB_DANCES.length]
      : GOGO_DANCES[(Math.floor(pulse.beat / 8) + dancerOffset) % GOGO_DANCES.length];
    poseRig(rig, { time: pulse.time, phase: pulse.phase, beat: pulse.beat, energy: 0.85, style, seed: 0 });
    spotMat.opacity = 0.16 + pulse.kick * 0.25;
  }, POSE_PRIORITY);

  return (
    <group position={[x, STAGE_TOP, BACK_ROW_Z]}>
      <group ref={dancer} position={[0, BACK_ROW_PODIUM_H, 0]} rotation-y={-Math.sign(x) * 0.2} scale={figureScale}>
        <primitive object={rig.root} />
      </group>
      <mesh geometry={spotGeo} material={spotMat} position={[0, BACK_ROW_PODIUM_H + 4.3, 0]} raycast={() => null} />
    </group>
  );
}

export function StageExtras() {
  return (
    <group>
      <Truss />
      <MovingHeads />
      <StageSkirt />
      <EdgeLights />
      {DANCERS.map((d, i) => (
        <GogoPodium key={d.x} x={d.x} z={d.z} name={d.name} look={d.look} light={d.light} seed={i * 0.17} figureScale={d.figureScale} />
      ))}
      <BackRowPlatform x={-6.1} color="#ff2bd6" />
      <BackRowPlatform x={6.1} color="#00e5ff" />
      {BACK_ROW_DANCERS.map((d, i) => (
        <BackRowDancer key={d.name} x={d.x} name={d.name} look={d.look} light={d.light} seed={i} figureScale={d.figureScale} />
      ))}
    </group>
  );
}

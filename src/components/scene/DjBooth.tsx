"use client";

// The stage: a detailed DJ booth (CDJs, mixers, laptop, LED front panel, light tubes,
// monitor wedges), CO2 jets and cold-spark fountains, plus the three performers.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pulse } from "./pulse";
import { POSE_PRIORITY, useFigure } from "./figures";
import { SPECTRUM_GLSL, spectrumTexture } from "./spectrum";
import { createRig, poseRig, FACE, FLASHMOB_DANCES, HEAD_SIZE, type Look, type Rig } from "./chibi";
import { useClub } from "@/lib/store";
import { StageExtras } from "./StageExtras";
import { useStageTag } from "./labels";

const DESK_TOP = 1.5;
const DESK_W = 4.6;

// ---------------------------------------------------------------------------
// Performers
// ---------------------------------------------------------------------------
type CrewRole = "dj" | "mc";

interface CrewMember {
  name: string;
  role: CrewRole;
  x: number;
  seed: number;
  gear: string; // headphone / mic accent color
  look: Look;
}

const PALETTE_BASE = { eye: "#16121c", white: "#ffffff", blush: "#ff9db2", dark: "#141418", gold: "#f5c542", visor: "#7df9ff" };

/** Two DJs on the decks and an MC hyping the crowd in the middle. */
const CREW: CrewMember[] = [
  {
    name: "DJ TRUNG TRƠ TRẼN",
    role: "dj",
    x: -1.55,
    seed: 0.05,
    gear: "#ff2bd6",
    look: {
      gender: "m",
      hair: "short",
      top: "jacket",
      bottom: "pants",
      glasses: false,
      bow: false,
      blush: false,
      palette: { ...PALETTE_BASE, skin: "#f6d2b4", hair: "#1d1a1f", outfit: "#1b1b24", accent: "#ff2bd6", pants: "#1a1a1f", shoe: "#ff2bd6" },
    },
  },
  {
    name: "MC HUẤN HĂNG HÁI",
    role: "mc",
    x: 0,
    seed: 0.1,
    gear: "#ffe600",
    look: {
      gender: "m",
      hair: "cap",
      top: "floral",
      bottom: "shorts",
      glasses: false,
      shades: true,
      chain: true,
      bow: false,
      blush: false,
      palette: { ...PALETTE_BASE, skin: "#6b3f2a", hair: "#1d1a1f", outfit: "#ffe600", accent: "#ff3b5c", pants: "#2b3346", shoe: "#f5f5f0" },
    },
  },
  {
    name: "DJ SƠN XẤC XƯỢC",
    role: "dj",
    x: 1.55,
    seed: 0.0,
    gear: "#00e5ff",
    look: {
      gender: "f",
      hair: "bun",
      top: "tee",
      bottom: "skirt",
      glasses: false,
      bow: false,
      blush: true,
      palette: { ...PALETTE_BASE, skin: "#fde3cc", hair: "#ff6fb5", outfit: "#a66bff", accent: "#1c1c20", pants: "#1a1a1f", shoe: "#1c1c20" },
    },
  },
];

function Performer({ member }: { member: CrewMember }) {
  const rig = useMemo(() => {
    const r = createRig(member.look);
    return r;
  }, [member]);

  useFigure(rig, member.look.palette);
  const group = useRef<THREE.Group>(null);
  useStageTag(group, member.name, member.gear);

  useFrame(() => {
    const dropping = pulse.drop > 0.2;
    const up = Math.max(0, Math.sin((pulse.phase + member.seed * 0.13) * Math.PI * 2));
    const flashmob = FLASHMOB_DANCES[Math.floor(useClub.getState().dropAt) % FLASHMOB_DANCES.length];
    poseRig(rig, {
      time: pulse.time,
      phase: pulse.phase,
      beat: pulse.beat,
      energy: 0.75 + pulse.drop * 0.25,
      style: dropping ? flashmob : member.role === "mc" ? (Math.floor(pulse.beat / 16) % 2 ? 7 : 1) : 0,
      seed: member.seed,
    });
    if (member.role === "dj" && !dropping) {
      // left hand rides the jog wheel, scratching
      rig.shoulder[0].rotation.set(-0.85, 0, 0.15);
      rig.elbow[0].rotation.set(-0.7, Math.sin(pulse.time * 9 + member.x) * 0.35, 0);
    }
    if (member.role === "mc") {
      // mic to the mouth, free hand pumping the crowd
      rig.shoulder[1].rotation.set(-1.2, 0, 0.35);
      rig.elbow[1].rotation.set(-2.2, 0, 0);
      rig.wrist[1].rotation.set(0, 0, 0);
      if (!dropping && Math.floor(pulse.beat / 16) % 2 === 0) {
        rig.shoulder[0].rotation.set(-1.4 - up * 1.3, 0, 0.35);
        rig.elbow[0].rotation.set(-0.8 + up * 0.6, 0, 0);
      }
    }
  }, POSE_PRIORITY);

  return (
    <group ref={group} position={[member.x, 0.8, -0.3]}>
      <primitive object={rig.root} />
      {member.role === "dj" ? <Headphones rig={rig} color={member.gear} /> : <Mic rig={rig} color={member.gear} />}
    </group>
  );
}

/** Attaches an object to a rig joint for as long as the component is mounted. */
function useAttach(joint: THREE.Object3D, build: () => THREE.Object3D) {
  useEffect(() => {
    const obj = build();
    joint.add(obj);
    return () => {
      joint.remove(obj);
    };
    // build is an inline factory; rebuilding only when the joint changes is intended
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joint]);
}

function Headphones({ rig, color }: { rig: Rig; color: string }) {
  useAttach(rig.head, () => {
    const g = new THREE.Group();
    const glow = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const band = new THREE.Mesh(new THREE.TorusGeometry(HEAD_SIZE.rx + 0.035, 0.03, 8, 24, Math.PI), glow);
    band.position.set(0, HEAD_SIZE.y + 0.01, 0);
    band.rotation.y = Math.PI / 2;
    g.add(band);
    for (const side of [1, -1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 18), glow);
      cup.rotation.z = Math.PI / 2;
      cup.position.set((HEAD_SIZE.rx + 0.02) * side, HEAD_SIZE.y - 0.02, 0);
      g.add(cup);
    }
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.03), new THREE.MeshBasicMaterial({ color: "#00e5ff", toneMapped: false }));
    shades.position.set(0, FACE.eyeY, FACE.eyeZ + 0.045);
    g.add(shades);
    return g;
  });
  return null;
}

function Mic({ rig, color }: { rig: Rig; color: string }) {
  useAttach(rig.wrist[1], () => {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.2, 10), new THREE.MeshStandardMaterial({ color: "#222", metalness: 0.6, roughness: 0.4 }));
    handle.position.set(0, -0.02, 0.04);
    handle.rotation.x = -0.6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    head.position.set(0, -0.11, 0.1);
    g.add(handle, head);
    return g;
  });
  return null;
}

// ---------------------------------------------------------------------------
// Gear
// ---------------------------------------------------------------------------
const metal = new THREE.MeshStandardMaterial({ color: "#16161d", metalness: 0.7, roughness: 0.35 });
const plate = new THREE.MeshStandardMaterial({ color: "#2a2a34", metalness: 0.8, roughness: 0.3 });
const knobMat = new THREE.MeshStandardMaterial({ color: "#c9c9d2", metalness: 0.9, roughness: 0.25 });

/** A CDJ player: jog wheel with a glowing ring, waveform screen, cue/play buttons. */
function Cdj({ x, color }: { x: number; color: string }) {
  const platter = useRef<THREE.Group>(null);
  const play = useRef<THREE.MeshBasicMaterial>(null);
  const wave = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uKick: { value: 0 }, uColor: { value: new THREE.Color(color) } }), [color]);
  useFrame((_, dt) => {
    if (platter.current) platter.current.rotation.y -= dt * 3.5;
    if (play.current) play.current.color.set(pulse.phase < 0.5 ? "#39ff6a" : "#0d3a18");
    uniforms.uTime.value = pulse.time;
    uniforms.uKick.value = pulse.kick;
  });
  return (
    <group position={[x, DESK_TOP, 0.55]}>
      <mesh position={[0, 0.04, 0]} material={metal}>
        <boxGeometry args={[0.5, 0.08, 0.66]} />
      </mesh>
      {/* jog wheel */}
      <group ref={platter} position={[0, 0.09, 0.08]}>
        <mesh material={plate}>
          <cylinderGeometry args={[0.19, 0.19, 0.025, 32]} />
        </mesh>
        <mesh position={[0, 0.014, 0.12]}>
          <boxGeometry args={[0.02, 0.005, 0.07]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0.103, 0.08]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.19, 0.215, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* waveform screen, tilted toward the DJ */}
      <mesh position={[0, 0.13, -0.2]} rotation-x={-0.9}>
        <planeGeometry args={[0.34, 0.13]} />
        <shaderMaterial
          ref={wave}
          uniforms={uniforms}
          toneMapped={false}
          vertexShader="varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
          fragmentShader={`
            uniform float uTime; uniform float uKick; uniform vec3 uColor; varying vec2 vUv;
            void main(){
              float x = vUv.x * 40.0 + uTime * 6.0;
              float amp = 0.15 + 0.3 * abs(sin(x * 0.7) * sin(x * 0.23 + 1.3)) + uKick * 0.1;
              float w = step(abs(vUv.y - 0.5), amp);
              float head = smoothstep(0.012, 0.0, abs(vUv.x - 0.5));
              vec3 c = mix(vec3(0.02,0.03,0.06), uColor, w * 0.85) + vec3(1.0) * head;
              gl_FragColor = vec4(c, 1.0);
            }`}
        />
      </mesh>
      {/* cue + play */}
      <mesh position={[-0.17, 0.09, 0.27]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        <meshBasicMaterial color="#ff8a1a" toneMapped={false} />
      </mesh>
      <mesh position={[-0.17, 0.09, 0.19]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        <meshBasicMaterial ref={play} toneMapped={false} />
      </mesh>
      {/* pitch fader */}
      <mesh position={[0.2, 0.085, 0.05]}>
        <boxGeometry args={[0.03, 0.01, 0.3]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.2, 0.095, 0.02]} material={knobMat}>
        <boxGeometry args={[0.05, 0.02, 0.03]} />
      </mesh>
    </group>
  );
}

const VU_ROWS = 9;
const tmpObj = new THREE.Object3D();
const tmpCol = new THREE.Color();

/** Mixer: EQ knobs, channel faders that ride the beat, crossfader and live VU meters. */
function Mixer({ x }: { x: number }) {
  const faders = useRef<THREE.Mesh[]>([]);
  const xfader = useRef<THREE.Mesh>(null);
  const vu = useRef<THREE.InstancedMesh>(null);
  const staticParts = useMemo(() => {
    const knobs: THREE.BufferGeometry[] = [];
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        const g = new THREE.CylinderGeometry(0.017, 0.017, 0.025, 10);
        g.translate(-0.12 + c * 0.08, 0.012, -0.24 + r * 0.075);
        knobs.push(g);
      }
    const slots: THREE.BufferGeometry[] = [-0.12, -0.04, 0.04, 0.12].map((fx) => {
      const g = new THREE.BoxGeometry(0.012, 0.004, 0.14);
      g.translate(fx, 0.001, 0.13);
      return g;
    });
    const cross = new THREE.BoxGeometry(0.2, 0.004, 0.012);
    cross.translate(0, 0.001, 0.28);
    slots.push(cross);
    return { knobs: mergeGeometries(knobs), slots: mergeGeometries(slots.map((g) => g.toNonIndexed())) };
  }, []);

  useEffect(() => {
    const m = vu.current;
    if (!m) return;
    for (let ch = 0; ch < 2; ch++)
      for (let r = 0; r < VU_ROWS; r++) {
        tmpObj.position.set(ch === 0 ? -0.025 : 0.025, 0.003, 0.2 - r * 0.022);
        tmpObj.updateMatrix();
        m.setMatrixAt(ch * VU_ROWS + r, tmpObj.matrix);
      }
    m.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    faders.current.forEach((f, i) => {
      if (f) f.position.z = 0.13 + Math.sin(pulse.time * (0.7 + i * 0.3) + i) * 0.05;
    });
    if (xfader.current) xfader.current.position.x = Math.sin(pulse.time * 0.9) * 0.08;
    const m = vu.current;
    if (!m) return;
    for (let ch = 0; ch < 2; ch++) {
      const level = Math.min(1, 0.25 + pulse.bass * 0.7 + pulse.kick * 0.5 - ch * 0.08);
      for (let r = 0; r < VU_ROWS; r++) {
        const lit = r / VU_ROWS < level;
        const hue = r < 5 ? 0.33 : r < 7 ? 0.14 : 0.0;
        tmpCol.setHSL(hue, 1, lit ? 0.5 : 0.06);
        m.setColorAt(ch * VU_ROWS + r, tmpCol);
      }
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[x, DESK_TOP, 0.55]}>
      <mesh position={[0, 0.045, 0]} material={metal}>
        <boxGeometry args={[0.38, 0.09, 0.66]} />
      </mesh>
      <group position={[0, 0.09, 0]}>
        {/* all 16 EQ knobs in one merged mesh, all fader slots in another (2 draw calls, not 21) */}
        <mesh geometry={staticParts.knobs} material={knobMat} />
        <mesh geometry={staticParts.slots}>
          <meshBasicMaterial color="#000" />
        </mesh>
        {[-0.12, -0.04, 0.04, 0.12].map((fx, i) => (
          <mesh key={fx} position={[fx, 0.012, 0.13]} ref={(m) => { if (m) faders.current[i] = m; }} material={knobMat}>
            <boxGeometry args={[0.04, 0.02, 0.025]} />
          </mesh>
        ))}
        <mesh ref={xfader} position={[0, 0.012, 0.28]} material={knobMat}>
          <boxGeometry args={[0.025, 0.02, 0.045]} />
        </mesh>
        <instancedMesh ref={vu} args={[undefined, undefined, VU_ROWS * 2]} position={[0, 0, -0.2]}>
          <boxGeometry args={[0.03, 0.006, 0.015]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      </group>
    </group>
  );
}

/** MC's laptop; the glowing lid faces the crowd. */
function Laptop({ x }: { x: number }) {
  const logo = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (logo.current) logo.current.color.setHSL((pulse.time * 0.15) % 1, 1, 0.5 + pulse.kick * 0.2);
  });
  return (
    <group position={[x, DESK_TOP, 0.55]}>
      {/* stand */}
      <mesh position={[0, 0.06, 0]} rotation-x={0.25} material={metal}>
        <boxGeometry args={[0.36, 0.02, 0.3]} />
      </mesh>
      {/* keyboard base */}
      <mesh position={[0, 0.09, 0.02]} rotation-x={0.25} material={plate}>
        <boxGeometry args={[0.44, 0.02, 0.3]} />
      </mesh>
      {/* lid: back faces the audience */}
      <group position={[0, 0.07, 0.17]} rotation-x={-0.35}>
        <mesh position={[0, 0.15, 0]} material={plate}>
          <boxGeometry args={[0.44, 0.3, 0.012]} />
        </mesh>
        <mesh position={[0, 0.15, -0.007]} rotation-y={Math.PI}>
          <planeGeometry args={[0.4, 0.26]} />
          <meshBasicMaterial color="#3a86ff" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.15, 0.007]}>
          <circleGeometry args={[0.07, 32]} />
          <meshBasicMaterial ref={logo} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

const panelFragment = /* glsl */ `
uniform float uTime; uniform float uKick;
${SPECTRUM_GLSL}
varying vec2 vUv;
vec3 hsl(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
void main(){
  vec2 grid = vec2(92.0, 18.0);
  vec2 cell = floor(vUv * grid);
  vec2 f = fract(vUv * grid);
  // mirrored left/right and up/down from the centre line: bass in the middle
  float d = abs((cell.x + 0.5) / grid.x - 0.5) * 2.0;
  float level = specLevel(d);
  float peak = specPeak(d);
  float y = abs((cell.y + 0.5) / grid.y - 0.5) * 2.0;
  float bar = step(y, level);
  float cap = step(abs(y - peak), 1.0 / grid.y) * step(0.05, peak);
  vec3 col = hsl(fract(d * 0.45 + uTime * 0.07)) * bar + vec3(1.0) * cap * 0.9;
  col += vec3(0.05, 0.03, 0.08) * (1.0 - bar) * (1.0 + uKick * 2.0);
  float dot = smoothstep(0.5, 0.35, length(f - 0.5));
  gl_FragColor = vec4(col * dot * 1.2, 1.0);
}
`;

/** LED front of the booth. */
function BoothPanel() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uKick: { value: 0 }, uSpec: { value: spectrumTexture } }), []);
  useFrame(() => {
    uniforms.uTime.value = pulse.time;
    uniforms.uKick.value = pulse.kick;
  });
  return (
    <mesh position={[0, 1.0, 1.051]}>
      <planeGeometry args={[DESK_W - 0.1, 0.9]} />
      <shaderMaterial
        uniforms={uniforms}
        toneMapped={false}
        vertexShader="varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
        fragmentShader={panelFragment}
      />
    </mesh>
  );
}

/** Wedge monitors on the stage lip, facing the performers. */
function Monitors() {
  return (
    <>
      {[-2.3, 2.3].map((x) => (
        <group key={x} position={[x, 0.62, 1.15]} rotation-y={Math.PI}>
          <mesh rotation-x={-0.5} material={metal}>
            <boxGeometry args={[0.6, 0.28, 0.4]} />
          </mesh>
          <mesh position={[0, 0.08, 0.13]} rotation-x={-0.5}>
            <circleGeometry args={[0.1, 20]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** CO2 cannons: blast white jets on every DROP (and on big phrases when hype is high). */
function Co2Jets() {
  const jets = useRef<THREE.Mesh[]>([]);
  const fire = useRef(0);
  const lastBeat = useRef(0);
  useFrame((_, dt) => {
    if (pulse.beat !== lastBeat.current) {
      lastBeat.current = pulse.beat;
      if (pulse.hype > 0.7 && pulse.beat % 32 === 0) fire.current = 1;
    }
    const level = Math.max(pulse.drop > 0.85 ? 1 : 0, fire.current);
    fire.current = Math.max(0, fire.current - dt * 0.9);
    jets.current.forEach((j, i) => {
      if (!j) return;
      const s = level > 0 ? 0.4 + level * 0.6 : 0.001;
      j.scale.set(0.6 + level * 0.6 + Math.sin(pulse.time * 40 + i) * 0.05, s, 0.6 + level * 0.6);
      (j.material as THREE.MeshBasicMaterial).opacity = level * 0.55;
      j.visible = level > 0.01;
    });
  });
  return (
    <>
      {[-2.75, 2.75].map((x, i) => (
        <group key={x} position={[x, 0.5, 1.25]}>
          <mesh material={metal}>
            <cylinderGeometry args={[0.1, 0.13, 0.25, 14]} />
          </mesh>
          <mesh ref={(m) => { if (m) jets.current[i] = m; }} position={[0, 0.12, 0]}>
            <coneGeometry args={[0.45, 3.4, 18, 1, true]} />
            <meshBasicMaterial color="#e9f4ff" transparent depthWrite={false} side={THREE.DoubleSide} opacity={0} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const SPARK_N = 160;

/** Cold-spark fountains ("pháo lạnh") along the stage lip, lit while the room is going off. */
function SparkFountains() {
  const fountains = [-1.8, -0.6, 0.6, 1.8];
  const { geometry, vel, life } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = SPARK_N * fountains.length;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return { geometry: g, vel: new Float32Array(n * 3), life: new Float32Array(n) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const points = useRef<THREE.Points>(null);

  useFrame((_, dt) => {
    const on = pulse.drop > 0.1 || pulse.hype > 0.85;
    const arr = geometry.attributes.position.array as Float32Array;
    for (let f = 0; f < fountains.length; f++)
      for (let k = 0; k < SPARK_N; k++) {
        const i = f * SPARK_N + k;
        const j = i * 3;
        life[i] -= dt;
        if (life[i] <= 0) {
          if (!on) {
            arr[j + 1] = -10;
            continue;
          }
          life[i] = 0.6 + Math.random() * 0.6;
          arr[j] = fountains[f];
          arr[j + 1] = 0.55;
          arr[j + 2] = 1.3;
          vel[j] = (Math.random() - 0.5) * 0.5;
          vel[j + 1] = 3 + Math.random() * 1.6;
          vel[j + 2] = (Math.random() - 0.5) * 0.5;
        }
        vel[j + 1] -= 4 * dt;
        arr[j] += vel[j] * dt;
        arr[j + 1] += vel[j + 1] * dt;
        arr[j + 2] += vel[j + 2] * dt;
      }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <points ref={points} geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={0.05} color="#ffd36a" toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      {fountains.map((x) => (
        <mesh key={x} position={[x, 0.52, 1.3]} material={metal}>
          <boxGeometry args={[0.16, 0.06, 0.16]} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Booth
// ---------------------------------------------------------------------------
export function DJBooth() {
  return (
    <group position={[0, 0, -5]}>
      {/* stage: 16 m wide to match the truss, 4.5 m deep */}
      <mesh position={[0, 0.25, -0.75]}>
        <boxGeometry args={[16, 0.5, 4.5]} />
        <meshStandardMaterial color="#120a1c" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* raised rear tier behind the DJs for depth */}
      <mesh position={[0, 0.7, -2.3]}>
        <boxGeometry args={[10, 0.4, 1.4]} />
        <meshStandardMaterial color="#160d22" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.9, -1.595]}>
        <boxGeometry args={[10, 0.03, 0.01]} />
        <meshBasicMaterial color="#00e5ff" toneMapped={false} />
      </mesh>
      {/* stage lip light strip */}
      <mesh position={[0, 0.5, 1.505]}>
        <boxGeometry args={[16, 0.03, 0.01]} />
        <meshBasicMaterial color="#ff2bd6" toneMapped={false} />
      </mesh>
      {/* desk body + top */}
      <mesh position={[0, 1.0, 0.6]}>
        <boxGeometry args={[DESK_W, 1, 0.9]} />
        <meshStandardMaterial color="#1a1026" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, DESK_TOP - 0.005, 0.6]}>
        <boxGeometry args={[DESK_W + 0.1, 0.03, 1.0]} />
        <meshStandardMaterial color="#0b0b10" metalness={0.8} roughness={0.25} />
      </mesh>
      <BoothPanel />
      {/* per DJ: CDJ · mixer · CDJ; MC gets the laptop */}
      {CREW.filter((c) => c.role === "dj").map((c) => (
        <group key={c.name}>
          <Cdj x={c.x - 0.47} color={c.gear} />
          <Mixer x={c.x} />
          <Cdj x={c.x + 0.47} color={c.gear} />
        </group>
      ))}
      <Laptop x={0} />
      <Monitors />
      <Co2Jets />
      <SparkFountains />
      <StageExtras />
      {/* riser so the big chibi heads clear the desk */}
      <mesh position={[0, 0.65, -0.3]}>
        <boxGeometry args={[4.4, 0.3, 0.8]} />
        <meshStandardMaterial color="#120a1c" />
      </mesh>
      {CREW.map((m) => (
        <Performer key={m.name} member={m} />
      ))}
    </group>
  );
}

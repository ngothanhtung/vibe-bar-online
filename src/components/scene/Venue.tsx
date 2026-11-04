"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Sparkles, Text } from "@react-three/drei";
import * as THREE from "three";
import { pulse } from "./pulse";
import { SPECTRUM_GLSL, spectrumTexture } from "./spectrum";
import { useClub } from "@/lib/store";

export const FLOOR = { cols: 20, rows: 14, size: 1, x0: -10, z0: -3.5 };

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

/** Audio-reactive LED dance floor. Click/tap a tile to walk there. */
export function DanceFloor({ onPick }: { onPick: (x: number, z: number) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = FLOOR.cols * FLOOR.rows;

  const cells = useMemo(() => {
    const arr: { x: number; z: number; d: number }[] = [];
    for (let i = 0; i < FLOOR.cols; i++)
      for (let j = 0; j < FLOOR.rows; j++) {
        const x = FLOOR.x0 + i + 0.5;
        const z = FLOOR.z0 + j + 0.5;
        arr.push({ x, z, d: Math.hypot(x, z - 3.5) });
      }
    return arr;
  }, []);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = pulse.time;
    const pattern = Math.floor(t / 8) % 3;
    cells.forEach((c, idx) => {
      if (m.userData.init !== true) {
        tmpObj.position.set(c.x, 0.03, c.z);
        tmpObj.updateMatrix();
        m.setMatrixAt(idx, tmpObj.matrix);
      }
      let wave: number;
      if (pattern === 0) wave = 0.5 + 0.5 * Math.sin(c.d * 1.3 - t * 5);
      else if (pattern === 1) wave = (Math.floor(c.x) + Math.floor(c.z) + Math.floor(t * 2)) % 2 === 0 ? 1 : 0.15;
      else wave = 0.5 + 0.5 * Math.sin(c.x * 0.9 + t * 3) * Math.cos(c.z * 0.9 - t * 2);
      const hue = (c.x * 0.03 + c.z * 0.02 + t * 0.07) % 1;
      const light = 0.06 + (0.12 + pulse.kick * 0.45 + pulse.drop * 0.3) * wave;
      tmpColor.setHSL(hue, 1, Math.min(light, 0.7));
      m.setColorAt(idx, tmpColor);
    });
    m.userData.init = true;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, count]}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPick(e.point.x, e.point.z);
        }}
      >
        <boxGeometry args={[0.94, 0.06, 0.94]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* dark grout under the tiles */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 4]}>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial color="#05030a" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** Dark room shell with neon trims. */
export function Room() {
  const trims = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(() => {
    const hue = (pulse.time * 0.05) % 1;
    trims.current.forEach((m, i) => {
      if (m) m.color.setHSL((hue + i * 0.15) % 1, 1, 0.45 + pulse.kick * 0.2);
    });
  });
  const trimDefs: [number, number, number, number, number, number][] = [
    [-16.9, 0.3, 2, 0.06, 0.06, 26],
    [16.9, 0.3, 2, 0.06, 0.06, 26],
    [-16.9, 10.4, 2, 0.06, 0.06, 26],
    [16.9, 10.4, 2, 0.06, 0.06, 26],
    [0, 10.4, -11.9, 34, 0.06, 0.06],
    [0, 0.3, -11.9, 34, 0.06, 0.06],
  ];
  return (
    <group>
      <mesh position={[0, 5.5, 2]}>
        <boxGeometry args={[34, 11, 28]} />
        <meshStandardMaterial color="#0d0716" side={THREE.BackSide} roughness={0.9} />
      </mesh>
      {trimDefs.map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshBasicMaterial ref={(m) => { if (m) trims.current[i] = m; }} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

const screenVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const screenFragment = /* glsl */ `
uniform float uTime; uniform float uKick; uniform float uMode; uniform vec2 uGrid;
${SPECTRUM_GLSL}
varying vec2 vUv;
vec3 hsl(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
void main(){
  // LED matrix showing a mirrored spectrum analyser: bass in the middle, treble at the edges
  vec2 grid = uGrid;
  vec2 cell = floor(vUv * grid);
  vec2 f = fract(vUv * grid);
  float band = abs((cell.x + 0.5) / grid.x - 0.5) * 2.0;
  float level = specLevel(band);
  float peak = specPeak(band);
  float row = (cell.y + 0.5) / grid.y;
  float lit = step(row, level * 0.96);
  float cap = step(abs(row - peak * 0.96 - 0.5 / grid.y), 0.5 / grid.y) * step(0.03, peak);
  // colour modes swap every 16 beats: classic green-yellow-red meter, or a rainbow sweep
  vec3 meter = mix(vec3(0.1, 1.0, 0.35), vec3(1.0, 0.9, 0.1), smoothstep(0.35, 0.65, row));
  meter = mix(meter, vec3(1.0, 0.15, 0.25), smoothstep(0.7, 0.9, row));
  vec3 rainbow = hsl(fract(band * 0.7 - uTime * 0.12 + row * 0.15));
  vec3 col = mix(meter, rainbow, uMode) * lit + vec3(1.0) * cap;
  // dim "unlit" LEDs and a faint flash on the kick
  col += vec3(0.05, 0.03, 0.08) * (1.0 - lit) * (1.0 + uKick * 2.0);
  float dot = smoothstep(0.5, 0.36, length(f - 0.5));
  gl_FragColor = vec4(col * dot * 0.95, 1.0);
}
`;

/** Giant LED wall behind the DJ showing the visualizer + the latest shout-out. */
/** One LED panel running the spectrum shader; `cells` sets the LED grid (≈ 6.7 LEDs per metre). */
function LedPanel({ size, cells, shared }: { size: [number, number]; cells: [number, number]; shared: Record<string, THREE.IUniform> }) {
  const uniforms = useMemo(() => ({ ...shared, uGrid: { value: new THREE.Vector2(...cells) } }), [shared, cells]);
  return (
    <mesh raycast={() => null}>
      <planeGeometry args={size} />
      <shaderMaterial vertexShader={screenVertex} fragmentShader={screenFragment} uniforms={uniforms} toneMapped={false} />
    </mesh>
  );
}

const MAIN_CELLS: [number, number] = [160, 44];
const WING_CELLS: [number, number] = [54, 37];

/**
 * The back of the club: a 24 m LED equalizer wall with two angled wing screens wrapping around
 * the stage, plus the title and the latest shout-out.
 */
export function LedScreen() {
  const latest = useClub((s) => s.shouts.find((x) => x.kind === "chat"));
  // shared uniform objects: one update drives all three panels
  const shared = useMemo(() => ({ uTime: { value: 0 }, uKick: { value: 0 }, uMode: { value: 0 }, uSpec: { value: spectrumTexture } }), []);
  useFrame((_, dt) => {
    shared.uTime.value = pulse.time;
    shared.uKick.value = pulse.kick;
    const wantRainbow = Math.floor(pulse.beat / 16) % 2;
    shared.uMode.value += (wantRainbow - shared.uMode.value) * Math.min(1, dt * 2);
  });
  const shout = latest ? `${latest.name}: ${latest.text}` : "Chào mừng tới Quẩy Bar Online!";
  return (
    <group>
      <group position={[0, 4.95, -11.6]}>
        <LedPanel size={[24, 6.6]} cells={MAIN_CELLS} shared={shared} />
        <Text position={[0, 2.35, 0.05]} fontSize={1.3} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#ff2bd6">
          QUẨY BAR ONLINE
        </Text>
        <Text position={[0, 1.25, 0.05]} fontSize={0.5} maxWidth={20} color="#fff7a8" anchorX="center" anchorY="middle" textAlign="center" outlineWidth={0.03} outlineColor="#000">
          {shout.slice(0, 90)}
        </Text>
      </group>
      {/* angled wings */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 14.1, 4.7, -9.9]} rotation-y={-side * 0.62}>
          <LedPanel size={[8, 5.5]} cells={WING_CELLS} shared={shared} />
        </group>
      ))}
    </group>
  );
}

/** DJ booth with an animated robo-DJ. */
function Speaker({ x }: { x: number }) {
  const cones = useRef<THREE.Mesh[]>([]);
  useFrame(() => {
    const s = 1 + pulse.bass * 0.25 + pulse.kick * 0.12;
    cones.current.forEach((c) => c && c.scale.set(s, 1, s));
  });
  return (
    <group position={[x, 0, -5.3]}>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[1.4, 3.2, 1]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.6} />
      </mesh>
      {[0.9, 2.3].map((y, i) => (
        <mesh key={y} position={[0, y, 0.51]} rotation-x={Math.PI / 2} ref={(m) => { if (m) cones.current[i] = m; }}>
          <cylinderGeometry args={[i === 0 ? 0.5 : 0.35, i === 0 ? 0.5 : 0.35, 0.04, 28]} />
          <meshStandardMaterial color="#222" emissive="#ff2bd6" emissiveIntensity={0.15} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function Speakers() {
  return (
    <>
      <Speaker x={-6.4} />
      <Speaker x={6.4} />
    </>
  );
}

/** Bar counter on the right wall with glowing bottles. */
export function BarCounter() {
  const bottles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        z: -3 + i * 0.45,
        h: 0.35 + Math.random() * 0.2,
        color: new THREE.Color().setHSL(Math.random(), 0.9, 0.5),
      })),
    [],
  );
  return (
    <group position={[15.4, 0, 3]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 1.2, 8]} />
        <meshStandardMaterial color="#1b0f12" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[-0.61, 1.15, 0]}>
        <boxGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color="#ffb300" toneMapped={false} />
      </mesh>
      {/* back shelf */}
      <mesh position={[1.7, 2.2, 0]}>
        <boxGeometry args={[0.3, 0.06, 7]} />
        <meshBasicMaterial color="#ff7a1a" toneMapped={false} />
      </mesh>
      <BottleRow bottles={bottles} />
      <Text position={[1.8, 3.6, 0]} rotation-y={-Math.PI / 2} fontSize={0.8} color="#ffb300" outlineWidth={0.03} outlineColor="#ff3b00">
        BAR
      </Text>
    </group>
  );
}

/** The glowing bottles on the bar shelf, as one instanced mesh. */
function BottleRow({ bottles }: { bottles: { z: number; h: number; color: THREE.Color }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    bottles.forEach((b, i) => {
      o.position.set(1.7, 2.23 + b.h / 2, b.z);
      o.scale.set(1, b.h, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, b.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [bottles]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bottles.length]} raycast={() => null}>
      <cylinderGeometry args={[0.07, 0.08, 1, 10]} />
      <meshBasicMaterial transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}

/** Mirror ball + the reflected light dots swirling around the room. */
export function DiscoBall() {
  const ball = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ball.current) ball.current.rotation.y += dt * (0.3 + pulse.hype * 0.6);
  });
  return (
    <group ref={ball} position={[0, 7.2, 3]}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.6]} />
        <meshBasicMaterial color="#555" />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.7, 2]} />
        <meshStandardMaterial color="#e8e8ff" metalness={1} roughness={0.08} flatShading emissive="#6655aa" emissiveIntensity={0.4} />
      </mesh>
      <Sparkles count={320} scale={[32, 8, 24]} position={[0, -3, 0]} size={4} speed={0} color="#ffffff" opacity={0.7} />
    </group>
  );
}

/** Colored moving lights washing over the crowd. */
export function MovingLights() {
  const lights = useRef<THREE.PointLight[]>([]);
  useFrame(() => {
    const t = pulse.time;
    lights.current.forEach((l, i) => {
      if (!l) return;
      l.position.x = Math.sin(t * 0.6 + i * 2.1) * 9;
      l.position.z = 3.5 + Math.cos(t * 0.5 + i * 1.3) * 5.5;
      l.intensity = 18 + pulse.kick * 40 + pulse.drop * 60;
      l.color.setHSL((t * 0.05 + i / 3) % 1, 1, 0.55);
    });
  });
  return (
    <>
      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#6a3cff", "#100018", 0.5]} />
      {[0, 1, 2].map((i) => (
        <pointLight key={i} ref={(l) => { if (l) lights.current[i] = l; }} position={[0, 4.5, 3]} distance={20} decay={1.5} />
      ))}
      <pointLight position={[0, 4, -3]} color="#ff2bd6" intensity={20} distance={10} />
    </>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Sparkles, Text } from "@react-three/drei";
import * as THREE from "three";
import { pulse } from "./pulse";
import { useClub } from "@/lib/store";

export const FLOOR = { cols: 14, rows: 10, size: 1, x0: -7, z0: -2.5 };

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
        arr.push({ x, z, d: Math.hypot(x, z - 2) });
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
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[30, 30]} />
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
    [-11.9, 0.3, 2, 0.06, 0.06, 18],
    [11.9, 0.3, 2, 0.06, 0.06, 18],
    [-11.9, 7.5, 2, 0.06, 0.06, 18],
    [11.9, 7.5, 2, 0.06, 0.06, 18],
    [0, 7.5, -7.9, 24, 0.06, 0.06],
  ];
  return (
    <group>
      <mesh position={[0, 4, 2]}>
        <boxGeometry args={[24, 8, 20]} />
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
uniform float uTime; uniform float uKick; uniform float uBass;
varying vec2 vUv;
vec3 hsl(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
void main(){
  vec2 uv = vUv * vec2(3.0, 1.0);
  vec2 cell = floor(uv * vec2(48.0, 16.0)) / vec2(48.0, 16.0);
  float bars = step(cell.y, 0.12 + 0.75 * abs(sin(cell.x * 7.0 + uTime * 2.0)) * (0.35 + uBass));
  float ring = sin(length(cell - vec2(1.5, 0.5)) * 14.0 - uTime * 6.0);
  vec3 col = hsl(fract(cell.x * 0.2 + uTime * 0.08)) * bars * 0.9;
  col += hsl(fract(0.6 + uTime * 0.05)) * smoothstep(0.7, 1.0, ring) * (0.25 + uKick);
  vec2 g = fract(uv * vec2(48.0, 16.0));
  col *= step(0.12, g.x) * step(0.12, g.y);
  gl_FragColor = vec4(col * 0.75, 1.0);
}
`;

/** Giant LED wall behind the DJ showing the visualizer + the latest shout-out. */
export function LedScreen() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const latest = useClub((s) => s.shouts.find((x) => x.kind === "chat"));
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uKick: { value: 0 }, uBass: { value: 0 } }), []);
  useFrame(() => {
    uniforms.uTime.value = pulse.time;
    uniforms.uKick.value = pulse.kick;
    uniforms.uBass.value = pulse.bass;
  });
  const shout = latest ? `${latest.name}: ${latest.text}` : "Chào mừng tới Quẩy Bar Online!";
  return (
    <group position={[0, 4.3, -7.6]}>
      <mesh>
        <planeGeometry args={[12, 4]} />
        <shaderMaterial ref={mat} vertexShader={screenVertex} fragmentShader={screenFragment} uniforms={uniforms} toneMapped={false} />
      </mesh>
      <Text position={[0, 1.0, 0.05]} fontSize={0.9} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#ff2bd6">
        QUẨY BAR ONLINE
      </Text>
      <Text position={[0, 0.05, 0.05]} fontSize={0.36} maxWidth={11} color="#fff7a8" anchorX="center" anchorY="middle" textAlign="center" outlineWidth={0.02} outlineColor="#000">
        {shout.slice(0, 90)}
      </Text>
    </group>
  );
}

/** DJ booth with an animated robo-DJ. */
export function DJBooth() {
  const dj = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Mesh>(null);
  const strip = useRef<THREE.MeshBasicMaterial>(null);
  const decks = useRef<THREE.Mesh[]>([]);
  useFrame((_, dt) => {
    if (dj.current) {
      dj.current.position.y = Math.abs(Math.sin(pulse.phase * Math.PI)) * 0.12;
      dj.current.rotation.y = Math.sin(pulse.time * 0.8) * 0.3;
    }
    if (arm.current) arm.current.rotation.z = -0.4 - pulse.kick * 1.6 - pulse.drop * 1.2;
    if (strip.current) strip.current.color.setHSL((pulse.time * 0.1) % 1, 1, 0.35 + pulse.kick * 0.3);
    decks.current.forEach((d) => d && (d.rotation.y += dt * 4));
  });
  return (
    <group position={[0, 0, -5]}>
      {/* stage */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[6, 0.5, 3]} />
        <meshStandardMaterial color="#120a1c" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* desk */}
      <mesh position={[0, 1.0, 0.6]}>
        <boxGeometry args={[3.2, 1, 0.9]} />
        <meshStandardMaterial color="#1a1026" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.0, 1.06]}>
        <boxGeometry args={[3.2, 0.12, 0.02]} />
        <meshBasicMaterial ref={strip} toneMapped={false} />
      </mesh>
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={x} position={[x, 1.53, 0.6]} ref={(m) => { if (m) decks.current[i] = m; }}>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 24]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* DJ */}
      <group ref={dj} position={[0, 0.5, -0.2]}>
        <mesh position={[0, 1.2, 0]}>
          <capsuleGeometry args={[0.32, 0.8, 6, 12]} />
          <meshStandardMaterial color="#111" emissive="#3a0050" />
        </mesh>
        <mesh position={[0, 2.05, 0]}>
          <sphereGeometry args={[0.28, 20, 20]} />
          <meshStandardMaterial color="#e8c4a0" />
        </mesh>
        {/* shades */}
        <mesh position={[0, 2.08, 0.24]}>
          <boxGeometry args={[0.42, 0.09, 0.05]} />
          <meshBasicMaterial color="#00e5ff" toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.1, 0]} rotation-z={Math.PI / 2}>
          <torusGeometry args={[0.31, 0.04, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#ff2bd6" emissive="#ff2bd6" emissiveIntensity={0.6} />
        </mesh>
        <mesh ref={arm} position={[0.38, 1.5, 0]}>
          <capsuleGeometry args={[0.08, 0.6, 4, 8]} />
          <meshStandardMaterial color="#111" emissive="#3a0050" />
        </mesh>
      </group>
      <Text position={[0, 3.25, -0.2]} fontSize={0.28} color="#00e5ff" anchorX="center" outlineWidth={0.015} outlineColor="#000">
        DJ MÕ AI
      </Text>
    </group>
  );
}

function Speaker({ x }: { x: number }) {
  const cones = useRef<THREE.Mesh[]>([]);
  useFrame(() => {
    const s = 1 + pulse.bass * 0.25 + pulse.kick * 0.12;
    cones.current.forEach((c) => c && c.scale.set(s, 1, s));
  });
  return (
    <group position={[x, 0, -5.5]}>
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
      <Speaker x={-4.6} />
      <Speaker x={4.6} />
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
    <group position={[10, 0, 2]}>
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
      {bottles.map((b, i) => (
        <mesh key={i} position={[1.7, 2.23 + b.h / 2, b.z]}>
          <cylinderGeometry args={[0.07, 0.08, b.h, 10]} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.7} transparent opacity={0.85} />
        </mesh>
      ))}
      <Text position={[1.8, 3.6, 0]} rotation-y={-Math.PI / 2} fontSize={0.8} color="#ffb300" outlineWidth={0.03} outlineColor="#ff3b00">
        BAR
      </Text>
    </group>
  );
}

/** Mirror ball + the reflected light dots swirling around the room. */
export function DiscoBall() {
  const ball = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ball.current) ball.current.rotation.y += dt * (0.3 + pulse.hype * 0.6);
  });
  return (
    <group ref={ball} position={[0, 6.4, 1]}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.6]} />
        <meshBasicMaterial color="#555" />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.7, 2]} />
        <meshStandardMaterial color="#e8e8ff" metalness={1} roughness={0.08} flatShading emissive="#6655aa" emissiveIntensity={0.4} />
      </mesh>
      <Sparkles count={260} scale={[22, 7, 18]} position={[0, -2.6, 0]} size={4} speed={0} color="#ffffff" opacity={0.7} />
    </group>
  );
}

const LASER_EMITTERS: [number, number, number][] = [
  [-5.5, 6.8, -6],
  [5.5, 6.8, -6],
  [-2.5, 7.2, -7],
  [2.5, 7.2, -7],
];

/** Sweeping laser fans that speed up with the hype meter. */
export function Lasers() {
  const groups = useRef<THREE.Group[]>([]);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const genre = useClub((s) => s.genre);
  useFrame(() => {
    const t = pulse.time;
    const speed = 0.8 + pulse.hype * 1.6;
    groups.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.x = 0.9 + Math.sin(t * speed + i) * 0.35;
      g.rotation.y = Math.sin(t * speed * 0.7 + i * 1.7) * 0.7 * (i % 2 ? 1 : -1);
    });
    const on = genre === "chill" ? 0.12 : 0.15 + pulse.kick * 0.55 + pulse.drop * 0.4;
    mats.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = on;
      m.color.setHSL(((t * 0.1 + i * 0.07) % 1 + (genre === "edm" ? 0.5 : 0)) % 1, 1, 0.55);
    });
  });
  let k = 0;
  return (
    <group>
      {LASER_EMITTERS.map((p, i) => (
        <group key={i} position={p} ref={(g) => { if (g) groups.current[i] = g; }}>
          {[-0.5, -0.25, 0, 0.25, 0.5].map((a) => {
            const idx = k++;
            return (
              <group key={a} rotation-z={a}>
                <mesh position={[0, -7, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 14, 4]} />
                  <meshBasicMaterial
                    ref={(m) => { if (m) mats.current[idx] = m; }}
                    transparent
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
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
      l.position.x = Math.sin(t * 0.6 + i * 2.1) * 6;
      l.position.z = 2 + Math.cos(t * 0.5 + i * 1.3) * 4;
      l.intensity = 18 + pulse.kick * 40 + pulse.drop * 60;
      l.color.setHSL((t * 0.05 + i / 3) % 1, 1, 0.55);
    });
  });
  return (
    <>
      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#6a3cff", "#100018", 0.5]} />
      {[0, 1, 2].map((i) => (
        <pointLight key={i} ref={(l) => { if (l) lights.current[i] = l; }} position={[0, 4, 2]} distance={14} decay={1.6} />
      ))}
      <pointLight position={[0, 4, -3]} color="#ff2bd6" intensity={20} distance={10} />
    </>
  );
}

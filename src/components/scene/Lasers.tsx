"use client";

// Ceiling laser show: a truss of emitters firing ~100 instanced beams (bright core + soft haze glow)
// that switch between show patterns every 16 beats, plus a rippling "liquid sky" laser sheet over the
// crowd. On a DROP everything goes white-hot and strobes.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pulse } from "./pulse";
import { useClub } from "@/lib/store";

const BEAMS_PER_EMITTER = 8;
const BEAM_LEN = 22;

/** Emitter heads: a row on the back truss plus a few on the side walls. */
const EMITTERS: { pos: THREE.Vector3; side: number }[] = [
  ...[-8, -5.5, -3, -1, 1, 3, 5.5, 8].map((x) => ({ pos: new THREE.Vector3(x, 7.3, -6.6), side: Math.sign(x) })),
  { pos: new THREE.Vector3(-11.6, 6.4, -1), side: -1 },
  { pos: new THREE.Vector3(11.6, 6.4, -1), side: 1 },
  { pos: new THREE.Vector3(-11.6, 6.4, 4), side: -1 },
  { pos: new THREE.Vector3(11.6, 6.4, 4), side: 1 },
];
const COUNT = EMITTERS.length * BEAMS_PER_EMITTER;

export const LASER_MODES = ["Quạt quét", "Đường hầm", "Cắt kéo", "Đuổi nhịp", "Bắn ngang"] as const;

/** Basic additive material whose alpha fades along the beam (bright at the emitter). */
function beamMaterial(strength: number) {
  const m = new THREE.MeshBasicMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    opacity: strength,
  });
  m.defines = { USE_UV: "" };
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      // uv.y = 1 at the emitter end, 0 at the far end; the haze also thins out with distance
      "#include <color_fragment>\n  diffuseColor.a *= pow(vUv.y, 1.6);",
    );
  };
  return m;
}

const down = new THREE.Vector3(0, -1, 0);
const dir = new THREE.Vector3();
const target = new THREE.Vector3();
const q = new THREE.Quaternion();
const m4 = new THREE.Matrix4();
const one = new THREE.Vector3(1, 1, 1);
const col = new THREE.Color();

export function Lasers() {
  const core = useRef<THREE.InstancedMesh>(null);
  const glow = useRef<THREE.InstancedMesh>(null);
  const genre = useClub((s) => s.genre);

  const { coreGeo, glowGeo, coreMat, glowMat } = useMemo(() => {
    // Cylinder hanging from its top (the emitter) down along -y.
    const mk = (r: number) => {
      const g = new THREE.CylinderGeometry(r, r * 1.6, BEAM_LEN, 6, 1, true);
      g.translate(0, -BEAM_LEN / 2, 0);
      return g;
    };
    return { coreGeo: mk(0.012), glowGeo: mk(0.09), coreMat: beamMaterial(1), glowMat: beamMaterial(0.22) };
  }, []);

  useFrame(() => {
    const c = core.current;
    const g = glow.current;
    if (!c || !g) return;
    const t = pulse.time;
    const dropping = pulse.drop > 0.15;
    const mode = dropping ? 1 : Math.floor(pulse.beat / 16) % LASER_MODES.length;
    const chill = genre === "chill" && !useClub.getState().yt;
    const step = Math.floor((pulse.beat + pulse.phase) * 4); // 16th-note counter for chases
    const strobe = dropping ? (Math.floor(t * 18) % 2 ? 1 : 0.15) : 1;
    const level = (chill ? 0.25 : 0.45 + pulse.kick * 0.55 + pulse.hype * 0.25) * strobe;
    const speed = chill ? 0.4 : 0.8 + pulse.hype * 1.2;

    let i = 0;
    EMITTERS.forEach((em, e) => {
      for (let k = 0; k < BEAMS_PER_EMITTER; k++, i++) {
        const u = k / (BEAMS_PER_EMITTER - 1); // 0..1 across the fan
        let lit = 1;
        switch (mode) {
          case 0: // big fans sweeping over the floor
            target.set((u - 0.5) * 18 + Math.sin(t * speed * 1.3 + e) * 4, 0, 2 + Math.sin(t * speed + e * 0.7) * 4.5);
            break;
          case 1: {
            // rotating cones ("tunnels") around moving hot spots
            const a = (k / BEAMS_PER_EMITTER) * Math.PI * 2 + t * speed * 2.5 * (e % 2 ? 1 : -1);
            const r = 2.2 + Math.sin(t * 2 + e) * 0.8;
            target.set(Math.sin(t * 0.5 + e) * 3 + Math.cos(a) * r, 0, 2 + Math.cos(t * 0.4 + e) * 2 + Math.sin(a) * r);
            break;
          }
          case 2: {
            // scissors: left and right banks sweep across each other
            const sweep = ((u + t * speed * 0.25) % 1) * 2 - 1;
            target.set(-em.side * sweep * 9, 0, -1 + u * 8);
            break;
          }
          case 3: // chase: one beam per emitter fires on each 16th, racing across
            target.set((u - 0.5) * 16, 0, 2.5 + Math.sin(e) * 3);
            lit = (k + e) % BEAMS_PER_EMITTER === step % BEAMS_PER_EMITTER ? 1.6 : 0.08;
            break;
          case 4: // flat beams shooting over the crowd's heads toward the back wall
            target.set((u - 0.5) * 22 + Math.sin(t * speed + e) * 2, 3.6 + Math.sin(t * 3 + k + e) * 0.6, 12);
            break;
        }
        dir.subVectors(target, em.pos).normalize();
        q.setFromUnitVectors(down, dir);
        m4.compose(em.pos, q, one);
        c.setMatrixAt(i, m4);
        g.setMatrixAt(i, m4);

        // color: DROP = white-hot rainbow; otherwise each mode has its own palette
        if (dropping) col.setHSL((t * 0.5 + u * 0.3 + e * 0.05) % 1, 0.6, 0.75);
        else {
          const base = [0.33, 0.83, 0.55, 0.0, 0.12][mode];
          col.setHSL((base + u * 0.08 + Math.sin(t * 0.2) * 0.05 + 1) % 1, 1, 0.55);
        }
        col.multiplyScalar(level * lit);
        c.setColorAt(i, col);
        g.setColorAt(i, col);
      }
    });
    c.instanceMatrix.needsUpdate = g.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={core} args={[coreGeo, coreMat, COUNT]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={glow} args={[glowGeo, glowMat, COUNT]} frustumCulled={false} raycast={() => null} />
      <LaserTruss />
      <LaserSheet />
    </group>
  );
}

/** The truss the back emitters hang from, with a glowing lens per head. */
function LaserTruss() {
  const lenses = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(() => {
    lenses.current.forEach((m, i) => {
      if (m) m.color.setHSL((pulse.time * 0.2 + i * 0.08) % 1, 1, 0.5 + pulse.kick * 0.3);
    });
  });
  return (
    <group>
      <mesh position={[0, 7.65, -6.6]}>
        <boxGeometry args={[18.5, 0.18, 0.18]} />
        <meshStandardMaterial color="#2a2a33" metalness={0.8} roughness={0.35} />
      </mesh>
      {EMITTERS.map((em, i) => (
        <group key={i} position={em.pos}>
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.36, 0.3, 0.36]} />
            <meshStandardMaterial color="#15151b" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshBasicMaterial ref={(m) => { if (m) lenses.current[i] = m; }} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const sheetFragment = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uHue;
varying vec2 vUv;
vec3 hsl(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
void main(){
  // interference ripples, like a laser sheet scanned through haze
  vec2 p = (vUv - vec2(0.5, 0.0)) * vec2(26.0, 20.0);
  float d = length(p);
  float rip = sin(d * 2.2 - uTime * 3.0) * 0.5 + sin(p.x * 0.9 + uTime * 1.3) * 0.25 + sin(p.y * 1.3 - uTime * 2.1) * 0.25;
  float band = smoothstep(0.55, 1.0, rip);
  float fade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y)) * smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
  vec3 c = hsl(fract(uHue + d * 0.01));
  gl_FragColor = vec4(c * (0.12 + band * 0.9) * uLevel * fade, 1.0);
}
`;

/** "Liquid sky": a laser sheet floating just above the crowd, shown in the flat-beam mode and on DROPs. */
function LaserSheet() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uLevel: { value: 0 }, uHue: { value: 0 } }), []);
  const level = useRef(0);
  useFrame((_, dt) => {
    const mode = Math.floor(pulse.beat / 16) % LASER_MODES.length;
    const want = pulse.drop > 0.15 ? 0.9 : mode === 4 ? 0.55 + pulse.kick * 0.3 : 0;
    level.current += (want - level.current) * Math.min(1, dt * 3);
    uniforms.uTime.value = pulse.time;
    uniforms.uLevel.value = level.current;
    uniforms.uHue.value = pulse.drop > 0.15 ? (pulse.time * 0.3) % 1 : 0.12;
  });
  return (
    <mesh position={[0, 3.3, 3]} rotation-x={-Math.PI / 2} raycast={() => null}>
      <planeGeometry args={[26, 20]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
        vertexShader="varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
        fragmentShader={sheetFragment}
      />
    </mesh>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useClub, type FloatFx } from "@/lib/store";

function FloatingEmoji({ fx }: { fx: FloatFx }) {
  const group = useRef<THREE.Group>(null);
  const el = useRef<HTMLDivElement>(null);
  const drift = useMemo(() => (Math.random() - 0.5) * 0.6, []);
  useFrame(() => {
    const age = (performance.now() - fx.born) / 2500;
    if (group.current) {
      group.current.position.set(fx.x + drift * age, 2.3 + age * 1.6, fx.z);
      group.current.visible = age < 1;
    }
    if (el.current) {
      el.current.style.opacity = String(Math.max(0, 1 - age * age));
      el.current.style.transform = `scale(${0.6 + Math.min(age * 4, 1) * 0.8})`;
    }
  });
  return (
    <group ref={group}>
      <Html center distanceFactor={8} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div ref={el} className="float-emoji">
          {fx.emoji}
        </div>
      </Html>
    </group>
  );
}

export function FloatingFxLayer() {
  const fx = useClub((s) => s.fx);
  return (
    <>
      {fx.map((f) => (
        <FloatingEmoji key={f.id} fx={f} />
      ))}
    </>
  );
}

const CONFETTI_N = 260;

function ConfettiBurst({ x, z, born }: { x: number; z: number; born: number }) {
  const points = useRef<THREE.Points>(null);
  const { geometry, velocities } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(CONFETTI_N * 3);
    const col = new Float32Array(CONFETTI_N * 3);
    const vel = new Float32Array(CONFETTI_N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < CONFETTI_N; i++) {
      pos.set([x, 2, z], i * 3);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 2.2;
      vel.set([Math.cos(a) * r, 4 + Math.random() * 4, Math.sin(a) * r], i * 3);
      c.setHSL(Math.random(), 1, 0.6);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { geometry: g, velocities: vel };
  }, [x, z]);

  useFrame((_, dt) => {
    const age = (performance.now() - born) / 1000;
    if (!points.current) return;
    points.current.visible = age < 4;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < CONFETTI_N; i++) {
      const j = i * 3;
      if (arr[j + 1] <= 0.08) continue; // landed
      velocities[j + 1] -= 9 * dt;
      velocities[j] *= 0.99;
      velocities[j + 2] *= 0.99;
      // flutter
      const vy = Math.max(velocities[j + 1], -1.6);
      arr[j] += velocities[j] * dt + Math.sin(age * 8 + i) * 0.004;
      arr[j + 1] = Math.max(0.08, arr[j + 1] + vy * dt);
      arr[j + 2] += velocities[j + 2] * dt;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.09} vertexColors toneMapped={false} />
    </points>
  );
}

export function ConfettiLayer() {
  const bursts = useClub((s) => s.confettiBursts);
  return (
    <>
      {bursts.map((b) => (
        <ConfettiBurst key={b.id} x={b.x} z={b.z} born={b.born} />
      ))}
    </>
  );
}

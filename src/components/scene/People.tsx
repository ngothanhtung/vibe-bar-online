"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { pulse } from "./pulse";
import { useClub, type Patron } from "@/lib/store";
import { AVATAR_COLORS } from "@/lib/content";

export const BOUNDS = { minX: -6.6, maxX: 6.6, minZ: -2.2, maxZ: 7 };
export const clampX = (x: number) => Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, x));
export const clampZ = (z: number) => Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, z));

const tmp = new THREE.Object3D();

/** Background NPC crowd so the club never feels empty. */
export function Crowd({ count = 46 }: { count?: number }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const people = useMemo(
    () =>
      Array.from({ length: count }, () => {
        // keep a lane in the middle of the floor free for real patrons
        let x = 0;
        while (Math.abs(x) < 2.2) x = (Math.random() - 0.5) * 13;
        return {
          x,
          z: -1.8 + Math.random() * 6.5,
          off: Math.random(),
          h: 0.85 + Math.random() * 0.3,
          sway: 0.5 + Math.random(),
          color: new THREE.Color(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]).multiplyScalar(0.55),
        };
      }),
    [count],
  );

  useEffect(() => {
    people.forEach((p, i) => {
      bodies.current?.setColorAt(i, p.color);
      heads.current?.setColorAt(i, new THREE.Color("#c99a78"));
    });
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    if (heads.current?.instanceColor) heads.current.instanceColor.needsUpdate = true;
  }, [people]);

  useFrame(() => {
    const amp = 0.08 + pulse.hype * 0.3 + pulse.drop * 0.3;
    people.forEach((p, i) => {
      const bounce = Math.abs(Math.sin((pulse.phase + p.off * 0.25) * Math.PI)) * amp;
      const rot = Math.sin(pulse.time * p.sway * 2 + p.off * 6) * 0.25;
      tmp.position.set(p.x, 0.65 * p.h + bounce, p.z);
      tmp.rotation.set(0, rot, Math.sin(pulse.time * 3 * p.sway + p.off * 9) * 0.08);
      tmp.scale.setScalar(p.h);
      tmp.updateMatrix();
      bodies.current?.setMatrixAt(i, tmp.matrix);
      tmp.position.y = 1.45 * p.h + bounce;
      tmp.updateMatrix();
      heads.current?.setMatrixAt(i, tmp.matrix);
    });
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, count]} raycast={() => null}>
        <capsuleGeometry args={[0.24, 0.6, 4, 10]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]} raycast={() => null}>
        <sphereGeometry args={[0.2, 14, 14]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

function Avatar({ patron, isMe }: { patron: Patron; isMe: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random(), []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    // Local player reads the live mutable position; others glide toward their synced spot.
    const target = isMe ? useClub.getState().myPos : patron;
    const k = isMe ? 1 : 1 - Math.exp(-dt * 3);
    const dx = target.x - g.position.x;
    const dz = target.z - g.position.z;
    g.position.x += dx * k;
    g.position.z += dz * k;
    if (Math.hypot(dx, dz) > 0.02) g.rotation.y = Math.atan2(dx, dz);
    if (body.current) {
      const amp = 0.12 + pulse.hype * 0.25 + pulse.drop * 0.3;
      body.current.position.y = Math.abs(Math.sin((pulse.phase + seed * 0.2) * Math.PI)) * amp;
      body.current.rotation.z = Math.sin(pulse.time * 4 + seed * 10) * 0.12;
    }
    if (ring.current) ring.current.scale.setScalar(1 + pulse.kick * 0.35);
  });

  return (
    <group ref={group} position={[patron.x, 0, patron.z]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.38, isMe ? 0.52 : 0.46, 32]} />
        <meshBasicMaterial color={patron.color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <group ref={body}>
        <mesh position={[0, 0.75, 0]}>
          <capsuleGeometry args={[0.27, 0.7, 6, 14]} />
          <meshStandardMaterial color={patron.color} emissive={patron.color} emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.23, 20, 20]} />
          <meshStandardMaterial color="#e2b48f" />
        </mesh>
        {/* party hat */}
        <mesh position={[0, 1.95, 0]}>
          <coneGeometry args={[0.12, 0.3, 12]} />
          <meshStandardMaterial color={patron.color} emissive={patron.color} emissiveIntensity={0.8} />
        </mesh>
      </group>
      <Html position={[0, 2.45, 0]} center distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className={`nametag ${isMe ? "me" : ""}`} style={{ borderColor: patron.color }}>
          {isMe ? "★ " : ""}
          {patron.name}
          {patron.bot ? " 🤖" : ""}
        </div>
      </Html>
    </group>
  );
}

/** Every real (or demo-bot) person in the room, plus you. */
export function Patrons() {
  const patrons = useClub((s) => s.patrons);
  const me = useClub((s) => s.me);
  const myPos = useClub((s) => s.myPos);
  const self: Patron = { id: me.id, name: me.name || "Bạn", color: me.color, x: myPos.x, z: myPos.z, lastSeen: Date.now() };
  return (
    <group>
      <Avatar key="me" patron={self} isMe />
      {patrons
        .filter((p) => p.id !== me.id)
        .map((p) => (
          <Avatar key={p.id} patron={p} isMe={false} />
        ))}
    </group>
  );
}

/** WASD / arrow keys and click-to-walk for the local avatar. */
export function useMovement() {
  const target = useRef<{ x: number; z: number } | null>(null);
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    const pos = useClub.getState().myPos; // mutated in place; synced to Firebase on an interval
    const k = keys.current;
    let vx = 0;
    let vz = 0;
    if (k.has("a") || k.has("arrowleft")) vx -= 1;
    if (k.has("d") || k.has("arrowright")) vx += 1;
    if (k.has("w") || k.has("arrowup")) vz -= 1;
    if (k.has("s") || k.has("arrowdown")) vz += 1;
    const speed = 3.2 * dt;
    if (vx || vz) {
      target.current = null;
      const len = Math.hypot(vx, vz);
      pos.x = clampX(pos.x + (vx / len) * speed);
      pos.z = clampZ(pos.z + (vz / len) * speed);
    } else if (target.current) {
      const dx = target.current.x - pos.x;
      const dz = target.current.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) target.current = null;
      else {
        const step = Math.min(d, speed);
        pos.x += (dx / d) * step;
        pos.z += (dz / d) * step;
      }
    }
  });

  return (x: number, z: number) => {
    target.current = { x: clampX(x), z: clampZ(z) };
  };
}

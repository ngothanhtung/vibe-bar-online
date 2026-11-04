"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pulse } from "./pulse";
import { useClub, type Patron } from "@/lib/store";
import { addLabel, removeLabel } from "./labels";
import { createRig, dressRig, FIGURE_HEIGHT, instancedMaterial, makeLook, PART_KEYS, partGeometries, poseRig, randomLookSeed, CHILL_DANCES, DANCES, FLASHMOB_DANCES, PARTY_DANCES, type DanceStyle, type Rig } from "./chibi";
import { AVATAR_COLORS, nameDealer } from "@/lib/content";

export const BOUNDS = { minX: -6.6, maxX: 6.6, minZ: -2.2, maxZ: 7 };
export const clampX = (x: number) => Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, x));
export const clampZ = (z: number) => Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, z));

/** Shared dance energy for everyone, from the hype meter, DROPs and the genre. */
function crowdEnergy() {
  const chill = useClub.getState().genre === "chill" && !useClub.getState().yt;
  return Math.min(1, (chill ? 0.1 : 0.25) + pulse.hype * (chill ? 0.3 : 0.65) + pulse.drop);
}

interface DanceState {
  dance: DanceStyle;
  next: number; // beat at which this dancer may switch moves
}

const pickFrom = (pool: DanceStyle[]) => pool[Math.floor(Math.random() * pool.length)];

export function newDanceState(): DanceState {
  return { dance: pickFrom(PARTY_DANCES), next: Math.floor(Math.random() * 12) };
}

/**
 * What a dancer does this frame:
 * DROP → the whole room flash-mobs the same move; otherwise the player's chosen dance,
 * or (on auto) a new random move every 8–16 beats, slow ones when the DJ plays lofi.
 */
function chooseDance(state: DanceState, chosen?: number): DanceStyle {
  if (pulse.drop > 0.2) return FLASHMOB_DANCES[Math.floor(useClub.getState().dropAt) % FLASHMOB_DANCES.length];
  if (chosen !== undefined && chosen >= 0 && chosen < DANCES.length) return chosen;
  const { genre, yt } = useClub.getState();
  const chill = genre === "chill" && !yt;
  if (pulse.beat >= state.next) {
    state.next = pulse.beat + 8 + Math.floor(Math.random() * 9);
    if (Math.random() < 0.65) state.dance = pickFrom(chill ? CHILL_DANCES : PARTY_DANCES);
  }
  if (chill && !CHILL_DANCES.includes(state.dance)) state.dance = pickFrom(CHILL_DANCES);
  return state.dance;
}

/** Background NPC crowd of instanced chibis so the club never feels empty. */
export function Crowd({ count = 46 }: { count?: number }) {
  const { figures, meshes } = useMemo(() => {
    const dealName = nameDealer();
    const figures = Array.from({ length: count }, () => {
      // keep a lane in the middle of the floor free for real patrons
      let x = 0;
      while (Math.abs(x) < 2.2) x = (Math.random() - 0.5) * 13;
      const look = makeLook(randomLookSeed(), AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
      const rig = createRig(look);
      const z = -1.8 + Math.random() * 6.5;
      rig.root.position.set(x, 0, z);
      rig.root.rotation.y = Math.atan2(-x, -5 - z) + (Math.random() - 0.5) * 0.9; // roughly face the DJ
      rig.root.scale.setScalar((look.gender === "f" ? 0.92 : 0.98) + Math.random() * 0.1);
      const seed = Math.random();
      return { rig, seed, dance: newDanceState(), palette: look.palette, name: dealName(look.gender) };
    });

    // One instanced mesh per part shape; per-instance colors dress each figure.
    // Looks differ, so count each part shape across the whole crowd.
    const total: Record<string, number> = {};
    for (const f of figures) for (const { key } of f.rig.parts) total[key] = (total[key] ?? 0) + 1;
    const g = partGeometries();
    const meshes = PART_KEYS.filter((key) => total[key]).map((key) => {
      const n = total[key];
      const mesh = new THREE.InstancedMesh(g[key], instancedMaterial(), n);
      mesh.frustumCulled = false;
      mesh.raycast = () => {};
      return { key, mesh };
    });
    // Instance order per part is the same every frame, so colors can be set once here.
    const byKey = Object.fromEntries(meshes.map((m) => [m.key, m.mesh]));
    const cursor: Record<string, number> = {};
    const c = new THREE.Color();
    for (const f of figures)
      for (const { key, slot } of f.rig.parts) {
        const i = (cursor[key] = (cursor[key] ?? -1) + 1);
        byKey[key].setColorAt(i, c.set(f.palette[slot]));
      }
    return { figures, meshes };
  }, [count]);

  useEffect(
    () => () => {
      meshes.forEach((m) => m.mesh.dispose());
    },
    [meshes],
  );

  // Small name tags above every dancer in the crowd.
  useEffect(() => {
    const labels = figures.map((f) => {
      const label = addLabel(
        "nametag npc",
        (out) => {
          f.rig.head.getWorldPosition(out);
          out.y += 0.62;
          return true;
        },
        6,
      );
      label.el.textContent = f.name;
      label.el.style.borderColor = f.palette.outfit;
      return label;
    });
    return () => labels.forEach(removeLabel);
  }, [figures]);

  useFrame(() => {
    const energy = crowdEnergy();
    const cursor: Record<string, number> = {};
    const byKey = Object.fromEntries(meshes.map((m) => [m.key, m.mesh]));
    for (const f of figures) {
      poseRig(f.rig, {
        time: pulse.time,
        phase: pulse.phase,
        beat: pulse.beat,
        energy: energy * (0.6 + f.seed * 0.5),
        style: chooseDance(f.dance),
        seed: f.seed,
      });
      f.rig.root.updateMatrixWorld(true);
      for (const { key, node } of f.rig.parts) {
        const i = (cursor[key] = (cursor[key] ?? -1) + 1);
        byKey[key].setMatrixAt(i, node.matrixWorld);
      }
    }
    meshes.forEach((m) => (m.mesh.instanceMatrix.needsUpdate = true));
  });

  return (
    <group>
      {meshes.map((m) => (
        <primitive key={m.key} object={m.mesh} />
      ))}
    </group>
  );
}

/** One person's chibi body; rebuilt whenever their outfit seed, gender or color changes. */
function AvatarBody({ look, gender, color, rigRef }: { look: number; gender?: "m" | "f"; color: string; rigRef: { current: Rig | null } }) {
  const rig = useMemo(() => {
    const l = makeLook(look, color, gender);
    const r = createRig(l);
    dressRig(r, l.palette);
    if (l.gender === "f") r.root.scale.setScalar(0.95);
    return r;
  }, [look, gender, color]);
  useEffect(() => {
    rigRef.current = rig;
  }, [rig, rigRef]);
  return <primitive object={rig.root} />;
}

function Avatar({ patron, isMe }: { patron: Patron; isMe: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random(), []);
  const rigRef = useRef<Rig | null>(null);
  const [fallbackLook] = useState(randomLookSeed);
  const danceState = useRef<DanceState | null>(null);
  const cheer = useRef(0);

  // Name tag floating above the head (plain DOM, see labels.tsx).
  useEffect(() => {
    const label = addLabel(`nametag ${isMe ? "me" : ""}`, (out) => {
      if (!group.current) return false;
      group.current.getWorldPosition(out);
      out.y += FIGURE_HEIGHT + 0.3;
      return true;
    });
    label.el.style.borderColor = patron.color;
    label.el.textContent = `${isMe ? "★ " : ""}${patron.name}${patron.bot ? " 🤖" : ""}`;
    return () => removeLabel(label);
  }, [isMe, patron.name, patron.color, patron.bot]);

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
    const moving = Math.hypot(dx, dz) > 0.02;
    if (moving) g.rotation.y = Math.atan2(dx, dz);

    // Raise a hand right after this person does an action (their emoji spawns at their feet).
    const now = performance.now();
    const acted = useClub.getState().fx.some((f) => now - f.born < 1200 && Math.hypot(f.x - g.position.x, f.z - g.position.z) < 0.7);
    cheer.current += ((acted ? 1 : 0) - cheer.current) * Math.min(1, dt * 8);

    const rig = rigRef.current;
    danceState.current ??= newDanceState();
    const chosen = isMe ? useClub.getState().me.dance : patron.dance;
    if (rig)
      poseRig(rig, {
        time: pulse.time,
        phase: pulse.phase,
        beat: pulse.beat,
        energy: crowdEnergy() * (moving ? 0.5 : 1),
        style: moving && (chosen === undefined || chosen < 0) ? 1 : chooseDance(danceState.current, chosen),
        seed,
        cheer: cheer.current,
      });
    if (ring.current) ring.current.scale.setScalar(1 + pulse.kick * 0.35);
  });

  return (
    <group ref={group} position={[patron.x, 0, patron.z]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.38, isMe ? 0.52 : 0.46, 32]} />
        <meshBasicMaterial color={patron.color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <AvatarBody look={patron.look ?? fallbackLook} gender={patron.gender} color={patron.color} rigRef={rigRef} />
    </group>
  );
}

/** Every real (or demo-bot) person in the room, plus you. */
export function Patrons() {
  const patrons = useClub((s) => s.patrons);
  const me = useClub((s) => s.me);
  const myPos = useClub((s) => s.myPos);
  const self: Patron = { id: me.id, name: me.name || "Bạn", color: me.color, x: myPos.x, z: myPos.z, lastSeen: Date.now(), look: me.look, gender: me.gender, dance: me.dance };
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

"use client";

// Waiters in black vests and red bow ties doing rounds of the room: they load beers at the bar,
// walk the edge of the dance floor, stop at tables and lounges to serve (a 🍺 pops up), and head
// back to the bar when the tray is empty. Bodies go through the FigureInstancer; trays and mugs
// are instanced too.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pulse } from "./pulse";
import { createRig, makeLook, poseRig, randomLookSeed, FIGURE_HEIGHT, SERVE, WALK, type Look, type Rig } from "./chibi";
import { POSE_PRIORITY, registerFigure } from "./figures";
import { addLabel, removeLabel } from "./labels";
import { nameDealer } from "@/lib/content";
import { useClub } from "@/lib/store";

/** A stop on the round: where to stand, which way to face while there, and what happens. */
interface Stop {
  x: number;
  z: number;
  face?: number;
  kind?: "bar" | "serve";
}

/**
 * One loop around the edge of the dance floor (world coordinates), from the bar along the right
 * tables, across the front, down the left tables and back. Waiters walk it back and forth.
 */
const ROUTE: Stop[] = [
  { x: 14.1, z: 3.8, face: Math.PI / 2, kind: "bar" },
  { x: 10.8, z: 3.8 }, // the gap between two tables, so nobody walks through furniture
  { x: 11.0, z: 2.0, face: Math.PI / 2, kind: "serve" },
  { x: 11.0, z: -1.6, face: Math.PI / 2, kind: "serve" },
  { x: 11.6, z: -4.8, face: Math.PI * 0.75, kind: "serve" },
  { x: 10.6, z: -2.6 },
  { x: 11.0, z: 5.6, face: Math.PI / 2, kind: "serve" },
  { x: 11.0, z: 9.2, face: Math.PI / 2, kind: "serve" },
  { x: 11.9, z: 11.7, face: Math.PI * 0.25, kind: "serve" },
  { x: 5.0, z: 11.9 },
  { x: -5.0, z: 11.9 },
  { x: -11.9, z: 11.7, face: -Math.PI * 0.25, kind: "serve" },
  { x: -11.0, z: 9.2, face: -Math.PI / 2, kind: "serve" },
  { x: -11.0, z: 5.6, face: -Math.PI / 2, kind: "serve" },
  { x: -11.0, z: 2.0, face: -Math.PI / 2, kind: "serve" },
  { x: -11.0, z: -1.6, face: -Math.PI / 2, kind: "serve" },
  { x: -11.6, z: -4.8, face: -Math.PI * 0.75, kind: "serve" },
];

const WAITERS = 5;
const MUGS = 3;
const SPEED = 1.25; // m/s
const STRIDE = 0.75; // metres per full walk cycle
const SERVE_TIME = 2.2;
const LOAD_TIME = 3.0;

interface Waiter {
  rig: Rig;
  look: Look;
  name: string;
  seg: number; // index of the stop we're walking towards
  dir: 1 | -1; // direction along the route
  pos: THREE.Vector2;
  heading: number;
  stride: number;
  wait: number; // seconds left standing at a stop
  serving: boolean;
  mugs: number;
}

function waiterLook(i: number): Look {
  const base = makeLook(randomLookSeed(), "#141418", i % 2 === 0 ? "m" : "f");
  return {
    ...base,
    hair: i % 2 === 0 ? "short" : "bun",
    top: "jacket",
    bottom: "pants",
    costume: "none",
    shades: false,
    glasses: false,
    chain: false,
    boots: false,
    bow: false,
    hat: "none",
    palette: { ...base.palette, outfit: "#16161c", accent: "#c8102e", pants: "#16161c", shoe: "#0f0f12", white: "#f4f4f0" },
  };
}

const tmp = new THREE.Object3D();
const local = new THREE.Vector3();

export function Waiters() {
  const waiters = useMemo<Waiter[]>(() => {
    const dealName = nameDealer();
    return Array.from({ length: WAITERS }, (_, i) => {
      const look = waiterLook(i);
      const rig = createRig(look);
      const seg = 1 + Math.floor((i / WAITERS) * (ROUTE.length - 1));
      const start = ROUTE[seg - 1];
      return {
        rig,
        look,
        name: `🍺 ${dealName(look.gender)}`,
        seg,
        dir: 1,
        pos: new THREE.Vector2(start.x, start.z),
        heading: 0,
        stride: Math.random(),
        wait: i * 0.8,
        serving: false,
        mugs: MUGS - (i % MUGS),
      };
    });
  }, []);

  useEffect(() => {
    const unreg = waiters.map((w) => registerFigure({ rig: w.rig, palette: w.look.palette, inScene: false }));
    const labels = waiters.map((w) => {
      const label = addLabel(
        "nametag staff",
        (out) => {
          out.copy(w.rig.root.position);
          out.y += FIGURE_HEIGHT + 0.42;
          return true;
        },
        6,
        24,
      );
      label.el.textContent = w.name;
      return label;
    });
    return () => {
      unreg.forEach((u) => u());
      labels.forEach(removeLabel);
    };
  }, [waiters]);

  const trays = useRef<THREE.InstancedMesh>(null);
  const mugs = useRef<THREE.InstancedMesh>(null);
  const foam = useRef<THREE.InstancedMesh>(null);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    for (const w of waiters) {
      // --- move along the route ---
      if (w.wait > 0) {
        w.wait -= dt;
        if (w.wait <= 0) w.serving = false;
      } else {
        const target = ROUTE[w.seg];
        const dx = target.x - w.pos.x;
        const dz = target.z - w.pos.y;
        const d = Math.hypot(dx, dz);
        const step = SPEED * dt;
        if (d <= step) {
          w.pos.set(target.x, target.z);
          // arrived: load up at the bar, serve at tables while beers last
          if (target.kind === "bar") {
            w.mugs = MUGS;
            w.wait = LOAD_TIME;
            w.serving = true;
          } else if (target.kind === "serve" && w.mugs > 0 && Math.random() < 0.7) {
            w.mugs--;
            w.wait = SERVE_TIME;
            w.serving = true;
            const fx = useClub.getState().addFx;
            fx("🍺", target.x + Math.sin(target.face ?? 0) * 0.9, target.z + Math.cos(target.face ?? 0) * 0.9);
          }
          if (target.face !== undefined && w.wait > 0) w.heading = target.face;
          // next stop: a full tray heads out along the route, an empty one turns back to the bar
          if (target.kind === "bar") w.dir = 1;
          else if (w.mugs === 0) w.dir = -1;
          let next = w.seg + w.dir;
          if (next >= ROUTE.length || next < 0) {
            w.dir = (-w.dir) as 1 | -1;
            next = w.seg + w.dir;
          }
          w.seg = next;
        } else {
          w.pos.x += (dx / d) * step;
          w.pos.y += (dz / d) * step;
          const want = Math.atan2(dx, dz);
          let diff = want - w.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          w.heading += diff * Math.min(1, dt * 8);
          w.stride = (w.stride + step / STRIDE) % 1;
        }
      }
      w.rig.root.position.set(w.pos.x, 0, w.pos.y);
      w.rig.root.rotation.y = w.heading;
      poseRig(w.rig, {
        time: pulse.time,
        phase: pulse.phase,
        beat: pulse.beat,
        energy: 0.3,
        style: w.serving ? SERVE : WALK,
        seed: 0,
        stride: w.stride,
      });
    }
  }, POSE_PRIORITY);

  // trays and mugs follow each waiter's raised (or lowered) right hand
  useFrame(() => {
    const t = trays.current;
    const m = mugs.current;
    const f = foam.current;
    if (!t || !m || !f) return;
    let mi = 0;
    waiters.forEach((w, i) => {
      const bob = w.serving ? 0 : Math.abs(Math.sin(w.stride * Math.PI * 2)) * 0.02;
      local.set(w.serving ? -0.16 : -0.3, (w.serving ? 0.98 : 1.17) + bob, w.serving ? 0.42 : 0.08);
      local.applyAxisAngle(THREE.Object3D.DEFAULT_UP, w.heading);
      tmp.position.set(w.pos.x + local.x, local.y, w.pos.y + local.z);
      tmp.rotation.set(0, w.heading, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      t.setMatrixAt(i, tmp.matrix);
      const base = tmp.matrix.clone();
      for (let k = 0; k < MUGS; k++) {
        const a = (k / MUGS) * Math.PI * 2 + 0.4;
        const off = new THREE.Matrix4().makeTranslation(Math.sin(a) * 0.11, 0.01, Math.cos(a) * 0.11);
        const mat = base.clone().multiply(off);
        if (k >= w.mugs) mat.scale(new THREE.Vector3(0, 0, 0)); // already served
        m.setMatrixAt(mi, mat);
        f.setMatrixAt(mi, mat);
        mi++;
      }
    });
    t.instanceMatrix.needsUpdate = true;
    m.instanceMatrix.needsUpdate = true;
    f.instanceMatrix.needsUpdate = true;
  });

  const geo = useMemo(() => {
    const tray = new THREE.CylinderGeometry(0.21, 0.2, 0.02, 24);
    const mug = new THREE.CylinderGeometry(0.042, 0.04, 0.12, 12);
    mug.translate(0, 0.07, 0);
    const head = new THREE.CylinderGeometry(0.044, 0.043, 0.03, 12);
    head.translate(0, 0.14, 0);
    return { tray, mug, head };
  }, []);

  return (
    <group>
      <instancedMesh ref={trays} args={[geo.tray, undefined, WAITERS]} frustumCulled={false} raycast={() => null}>
        <meshStandardMaterial color="#c9ccd6" metalness={0.85} roughness={0.25} />
      </instancedMesh>
      <instancedMesh ref={mugs} args={[geo.mug, undefined, WAITERS * MUGS]} frustumCulled={false} raycast={() => null}>
        <meshBasicMaterial color="#f2a516" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={foam} args={[geo.head, undefined, WAITERS * MUGS]} frustumCulled={false} raycast={() => null}>
        <meshBasicMaterial color="#fff8e6" />
      </instancedMesh>
    </group>
  );
}

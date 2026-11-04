"use client";

// Bar furniture along the walls and in the corners, leaving the middle of the floor free to dance:
// high cocktail tables with stools down both sides, U-shaped lounge booths in the four corners,
// drinks on every table, and guests sitting around them sipping and chatting.
// Everything is instanced (a handful of draw calls) and the guests go through the FigureInstancer.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pulse } from "./pulse";
import { createRig, makeLook, poseRig, randomLookSeed, SIT, FIGURE_HEIGHT, type Rig, type Palette } from "./chibi";
import { POSE_PRIORITY, registerFigure } from "./figures";
import { addLabel, removeLabel } from "./labels";
import { AVATAR_COLORS, nameDealer } from "@/lib/content";

// ---------------------------------------------------------------------------
// Layout (world coordinates)
// ---------------------------------------------------------------------------
const TABLES: [number, number][] = [
  // left wall: two staggered rows
  [-12.4, -1.6], [-12.4, 2.0], [-12.4, 5.6], [-12.4, 9.2],
  [-15.0, 0.2], [-15.0, 3.8], [-15.0, 7.4],
  // right side, in front of the bar counter
  [12.3, -1.6], [12.3, 2.0], [12.3, 5.6], [12.3, 9.2],
];
const STOOL_R = 0.78;
const STOOL_SEAT = 0.72;

/** Corner lounges: position + rotation so the open side of the U faces the dance floor. */
const LOUNGES: { x: number; z: number; rot: number }[] = [
  { x: -13.6, z: 13.2, rot: Math.PI * 0.75 },
  { x: 13.6, z: 13.2, rot: -Math.PI * 0.75 },
  { x: -13.4, z: -6.4, rot: Math.PI * 0.25 },
  { x: 13.4, z: -6.4, rot: -Math.PI * 0.25 },
];
const SOFA_SEAT = 0.42;

const tmp = new THREE.Object3D();

function stoolSpots() {
  const spots: { x: number; z: number; face: number }[] = [];
  TABLES.forEach(([tx, tz], i) => {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + i * 0.7;
      const x = tx + Math.sin(a) * STOOL_R;
      const z = tz + Math.cos(a) * STOOL_R;
      spots.push({ x, z, face: Math.atan2(tx - x, tz - z) });
    }
  });
  return spots;
}

/** Seats around each lounge's low table: [local x, local z, facing] in the lounge's frame. */
const LOUNGE_SEATS: [number, number, number][] = [
  [-0.55, -0.85, 0],
  [0.55, -0.85, 0],
  [-1.15, 0.05, Math.PI / 2],
  [1.15, 0.05, -Math.PI / 2],
];

// ---------------------------------------------------------------------------
// Instanced furniture
// ---------------------------------------------------------------------------
function useInstances(count: number, place: (i: number, o: THREE.Object3D, c: THREE.Color) => void) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      tmp.position.set(0, 0, 0);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      c.set("#ffffff");
      place(i, tmp, c);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
  return ref;
}

const RING_COLORS = ["#ff2bd6", "#00e5ff", "#ffe600", "#7cff4f", "#a66bff", "#ff7a1a"];

function CocktailTables() {
  const geo = useMemo(() => {
    const top = new THREE.CylinderGeometry(0.46, 0.46, 0.05, 28);
    top.translate(0, 1.1, 0);
    const pole = new THREE.CylinderGeometry(0.05, 0.05, 1.08, 10);
    pole.translate(0, 0.54, 0);
    const base = new THREE.CylinderGeometry(0.3, 0.34, 0.04, 22);
    base.translate(0, 0.02, 0);
    return mergeGeometries([top.toNonIndexed(), pole.toNonIndexed(), base.toNonIndexed()]);
  }, []);
  const ringGeo = useMemo(() => {
    const g = new THREE.TorusGeometry(0.46, 0.018, 6, 40);
    g.rotateX(Math.PI / 2);
    g.translate(0, 1.075, 0);
    return g;
  }, []);
  const tables = useInstances(TABLES.length, (i, o) => o.position.set(TABLES[i][0], 0, TABLES[i][1]));
  const rings = useInstances(TABLES.length, (i, o, c) => {
    o.position.set(TABLES[i][0], 0, TABLES[i][1]);
    c.set(RING_COLORS[i % RING_COLORS.length]);
  });
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (ringMat.current) ringMat.current.color.setScalar(0.7 + pulse.kick * 0.6);
  });
  return (
    <group>
      <instancedMesh ref={tables} args={[geo, undefined, TABLES.length]} raycast={() => null}>
        <meshStandardMaterial color="#17121f" metalness={0.75} roughness={0.25} />
      </instancedMesh>
      <instancedMesh ref={rings} args={[ringGeo, undefined, TABLES.length]} raycast={() => null}>
        <meshBasicMaterial ref={ringMat} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Stools({ spots }: { spots: { x: number; z: number; face: number }[] }) {
  const geo = useMemo(() => {
    const seat = new THREE.CylinderGeometry(0.2, 0.18, 0.08, 20);
    seat.translate(0, STOOL_SEAT, 0);
    const pole = new THREE.CylinderGeometry(0.03, 0.03, STOOL_SEAT, 8);
    pole.translate(0, STOOL_SEAT / 2, 0);
    const foot = new THREE.TorusGeometry(0.15, 0.012, 5, 18);
    foot.rotateX(Math.PI / 2);
    foot.translate(0, 0.28, 0);
    const base = new THREE.CylinderGeometry(0.18, 0.2, 0.03, 18);
    base.translate(0, 0.015, 0);
    return mergeGeometries([seat.toNonIndexed(), pole.toNonIndexed(), foot.toNonIndexed(), base.toNonIndexed()]);
  }, []);
  const ref = useInstances(spots.length, (i, o, c) => {
    o.position.set(spots[i].x, 0, spots[i].z);
    c.set(i % 2 ? "#b8213f" : "#2a2233");
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, spots.length]} raycast={() => null}>
      <meshStandardMaterial metalness={0.4} roughness={0.45} />
    </instancedMesh>
  );
}

/** U-shaped booth sofas around a low glowing table, one per corner. */
function Lounges() {
  const sofaGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(x, y, z);
      parts.push(g.toNonIndexed());
    };
    // back section
    box(2.0, SOFA_SEAT, 0.7, 0, SOFA_SEAT / 2, -1.2);
    box(2.0, 0.55, 0.2, 0, SOFA_SEAT + 0.27, -1.55);
    // left & right arms of the U
    for (const sx of [-1, 1]) {
      box(0.7, SOFA_SEAT, 1.6, sx * 1.35, SOFA_SEAT / 2, -0.25);
      box(0.2, 0.55, 1.8, sx * 1.7, SOFA_SEAT + 0.27, -0.35);
    }
    return mergeGeometries(parts);
  }, []);
  const tableGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 28);
    g.translate(0, 0.175, 0);
    return g;
  }, []);
  const edgeGeo = useMemo(() => {
    const g = new THREE.TorusGeometry(0.55, 0.02, 6, 40);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.34, 0);
    return g;
  }, []);
  const at = (i: number, o: THREE.Object3D) => {
    o.position.set(LOUNGES[i].x, 0, LOUNGES[i].z);
    o.rotation.y = LOUNGES[i].rot;
  };
  const sofas = useInstances(LOUNGES.length, (i, o, c) => {
    at(i, o);
    c.set(["#5a1d6b", "#1d3f6b", "#6b1d3a", "#1d6b5a"][i]);
  });
  const tables = useInstances(LOUNGES.length, at);
  const edges = useInstances(LOUNGES.length, (i, o, c) => {
    at(i, o);
    c.set(RING_COLORS[(i + 2) % RING_COLORS.length]);
  });
  return (
    <group>
      <instancedMesh ref={sofas} args={[sofaGeo, undefined, LOUNGES.length]} raycast={() => null}>
        <meshStandardMaterial roughness={0.7} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={tables} args={[tableGeo, undefined, LOUNGES.length]} raycast={() => null}>
        <meshStandardMaterial color="#15101c" metalness={0.7} roughness={0.25} />
      </instancedMesh>
      <instancedMesh ref={edges} args={[edgeGeo, undefined, LOUNGES.length]} raycast={() => null}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Glasses with coloured drinks on every table. */
function Drinks() {
  const spots = useMemo(() => {
    const s: { x: number; y: number; z: number; color: string; tall: boolean }[] = [];
    const drinkColors = ["#ffb300", "#ff2b6a", "#4fe3ff", "#9dff4f", "#f4f1e6", "#c27bff"];
    let n = 0;
    TABLES.forEach(([x, z]) => {
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + x;
        s.push({ x: x + Math.sin(a) * 0.22, y: 1.125, z: z + Math.cos(a) * 0.22, color: drinkColors[n++ % drinkColors.length], tall: k === 0 });
      }
    });
    LOUNGES.forEach(({ x, z }) => {
      for (let k = 0; k < 4; k++) {
        const a = k * 1.6;
        s.push({ x: x + Math.sin(a) * 0.3, y: 0.35, z: z + Math.cos(a) * 0.3, color: drinkColors[n++ % drinkColors.length], tall: k % 2 === 0 });
      }
    });
    return s;
  }, []);
  const glassGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.045, 0.038, 0.16, 12, 1, true);
    g.translate(0, 0.08, 0);
    return g;
  }, []);
  const liquidGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.04, 0.034, 0.1, 12);
    g.translate(0, 0.05, 0);
    return g;
  }, []);
  const place = (i: number, o: THREE.Object3D) => {
    o.position.set(spots[i].x, spots[i].y, spots[i].z);
    if (spots[i].tall) o.scale.set(0.85, 1.4, 0.85);
  };
  const glasses = useInstances(spots.length, place);
  const liquids = useInstances(spots.length, (i, o, c) => {
    place(i, o);
    c.set(spots[i].color);
  });
  return (
    <group>
      <instancedMesh ref={liquids} args={[liquidGeo, undefined, spots.length]} raycast={() => null}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glasses} args={[glassGeo, undefined, spots.length]} raycast={() => null}>
        <meshStandardMaterial color="#dff3ff" transparent opacity={0.35} metalness={0.2} roughness={0.05} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Seated guests
// ---------------------------------------------------------------------------
interface Guest {
  rig: Rig;
  palette: Palette;
  seed: number;
  seat: number;
  name: string;
}

function SeatedGuests({ stools }: { stools: { x: number; z: number; face: number }[] }) {
  const guests = useMemo(() => {
    const dealName = nameDealer();
    const out: Guest[] = [];
    const seatAt = (x: number, z: number, face: number, seat: number) => {
      const look = makeLook(randomLookSeed(), AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
      const rig = createRig(look, { cup: Math.random() < 0.8 });
      rig.root.position.set(x, 0, z);
      rig.root.rotation.y = face;
      out.push({ rig, palette: look.palette, seed: Math.random(), seat, name: dealName(look.gender) });
    };
    // about two in three stools are taken
    stools.forEach((s, i) => {
      if ((i * 7) % 3 !== 0) seatAt(s.x, s.z, s.face, STOOL_SEAT + 0.04);
    });
    LOUNGES.forEach((l) => {
      const c = Math.cos(l.rot);
      const sn = Math.sin(l.rot);
      LOUNGE_SEATS.forEach(([lx, lz, f], k) => {
        if (k === 3 && l.z < 0) return; // leave a gap in the back booths
        seatAt(l.x + lx * c + lz * sn, l.z - lx * sn + lz * c, l.rot + f, SOFA_SEAT);
      });
    });
    return out;
  }, [stools]);

  useEffect(() => {
    const unreg = guests.map((g) => registerFigure({ rig: g.rig, palette: g.palette, inScene: false }));
    const labels = guests.map((g) => {
      const label = addLabel(
        "nametag npc",
        (out) => {
          out.copy(g.rig.root.position);
          out.y += g.seat + FIGURE_HEIGHT - 0.25;
          return true;
        },
        6,
        13,
      );
      label.el.textContent = g.name;
      label.el.style.borderColor = g.palette.outfit;
      return label;
    });
    return () => {
      unreg.forEach((u) => u());
      labels.forEach(removeLabel);
    };
  }, [guests]);

  useFrame(() => {
    for (const g of guests) {
      poseRig(g.rig, { time: pulse.time, phase: pulse.phase, beat: pulse.beat, energy: 0.3, style: SIT, seed: g.seed, seat: g.seat });
    }
  }, POSE_PRIORITY);

  return null;
}

export function BarFurniture() {
  const stools = useMemo(() => stoolSpots(), []);
  return (
    <group>
      <CocktailTables />
      <Stools spots={stools} />
      <Lounges />
      <Drinks />
      <SeatedGuests stools={stools} />
    </group>
  );
}

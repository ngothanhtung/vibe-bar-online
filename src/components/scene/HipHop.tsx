"use client";

// A hip hop cypher on the dance floor: a ring of b-boys and b-girls in streetwear grooving and
// clapping on the beat, while one of them steps into the middle every 8 beats to throw a solo
// (toprock, krump, popping, freezes…). Bodies go through the shared FigureInstancer.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pulse } from "./pulse";
import { createRig, makeLook, poseRig, randomLookSeed, FIGURE_HEIGHT, FLASHMOB_DANCES, HIPHOP_GROOVES, HIPHOP_SOLOS, type Look, type Rig } from "./chibi";
import { POSE_PRIORITY, registerFigure } from "./figures";
import { addLabel, removeLabel } from "./labels";
import { nameDealer } from "@/lib/content";
import { useClub } from "@/lib/store";

/** Where the cypher happens (world coordinates) and how big the ring is. */
export const CYPHER = { x: -5.2, z: 5.6, r: 1.7 };
const MEMBERS = 8;

const STREET = ["#141418", "#f4f4f0", "#c8102e", "#1f3a8a", "#2f2f36", "#ffb300", "#0f766e", "#6b21a8"];

function streetLook(i: number): Look {
  const base = makeLook(randomLookSeed(), STREET[i % STREET.length], i % 3 === 2 ? "f" : "m");
  return {
    ...base,
    costume: "none",
    top: i % 2 ? "hoodie" : "tee",
    bottom: "pants",
    hair: base.gender === "f" ? "pony" : i % 4 === 0 ? "spiky" : "short",
    hat: (["snapback", "bucket", "none", "snapback", "headband", "bucket", "none", "snapback"] as const)[i % 8],
    chain: i % 2 === 0,
    shades: i % 3 === 0,
    glasses: false,
    boots: false,
    bow: false,
    palette: { ...base.palette, pants: ["#1d2a44", "#2b2b30", "#4a4f5c", "#141418"][i % 4], shoe: ["#f5f5f0", "#ff3b5c", "#ffe600", "#141418"][i % 4] },
  };
}

interface Member {
  rig: Rig;
  look: Look;
  name: string;
  angle: number; // home spot on the ring
  seed: number;
}

export function HipHopCypher() {
  const members = useMemo<Member[]>(() => {
    const deal = nameDealer();
    return Array.from({ length: MEMBERS }, (_, i) => {
      const look = streetLook(i);
      return { rig: createRig(look), look, name: `🎤 ${deal(look.gender)}`, angle: (i / MEMBERS) * Math.PI * 2, seed: Math.random() * 0.3 };
    });
  }, []);

  useEffect(() => {
    const unreg = members.map((m) => registerFigure({ rig: m.rig, palette: m.look.palette, inScene: false }));
    const labels = members.map((m) => {
      const label = addLabel(
        "nametag npc hiphop",
        (out) => {
          out.copy(m.rig.root.position);
          out.y += FIGURE_HEIGHT + 0.15;
          return true;
        },
        6,
        16,
      );
      label.el.textContent = m.name;
      label.el.style.borderColor = m.look.palette.outfit;
      return label;
    });
    return () => {
      unreg.forEach((u) => u());
      labels.forEach(removeLabel);
    };
  }, [members]);

  const glow = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const phrase = Math.floor(pulse.beat / 8);
    const soloist = phrase % MEMBERS;
    const dropping = pulse.drop > 0.2;
    const flashmob = FLASHMOB_DANCES[Math.floor(useClub.getState().dropAt) % FLASHMOB_DANCES.length];
    members.forEach((m, i) => {
      const solo = i === soloist;
      // the soloist walks into the middle at the start of the phrase and back out at the end
      const inPhrase = (pulse.beat % 8) + pulse.phase;
      const inward = solo ? Math.min(1, inPhrase / 1.0) * Math.min(1, (8 - inPhrase) / 0.8) : 0;
      const r = CYPHER.r * (1 - inward * 0.95);
      const x = CYPHER.x + Math.sin(m.angle) * r;
      const z = CYPHER.z + Math.cos(m.angle) * r;
      m.rig.root.position.set(x, 0, z);
      // ring faces the middle; the soloist turns to face the crowd and the camera
      const faceIn = m.angle + Math.PI;
      const toCrowd = Math.atan2(Math.sin(0 - faceIn), Math.cos(0 - faceIn)); // shortest turn to face +z
      m.rig.root.rotation.y = faceIn + toCrowd * inward;
      const style = dropping
        ? flashmob
        : solo && inward > 0.6
          ? HIPHOP_SOLOS[phrase % HIPHOP_SOLOS.length]
          : HIPHOP_GROOVES[(i + Math.floor(pulse.beat / 16)) % HIPHOP_GROOVES.length];
      poseRig(m.rig, { time: pulse.time, phase: pulse.phase, beat: pulse.beat, energy: 0.85, style, seed: m.seed * 0.2 });
    });
    if (glow.current) glow.current.color.setHSL((pulse.time * 0.1) % 1, 1, 0.3 + pulse.kick * 0.35);
  }, POSE_PRIORITY);

  return (
    // a glowing ring on the floor marks the cypher
    <mesh position={[CYPHER.x, 0.08, CYPHER.z]} rotation-x={-Math.PI / 2} raycast={() => null}>
      <ringGeometry args={[CYPHER.r + 0.35, CYPHER.r + 0.5, 48]} />
      <meshBasicMaterial ref={glow} toneMapped={false} transparent opacity={0.85} />
    </mesh>
  );
}

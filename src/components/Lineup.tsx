"use client";

// Showcase of every dance: a 4x4 grid of random chibis, one dance each, under bright light.
// Handy for tuning the character and the moves without entering the club.

import { useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { COSTUMES, createRig, DANCES, dressRig, makeLook, poseRig, randomLookSeed } from "./scene/chibi";
import { pulse } from "./scene/pulse";
import { usePixelCanvas } from "./scene/pixel";
import { AVATAR_COLORS } from "@/lib/content";

function Clock() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const bpm = 124;
    const beats = (t * bpm) / 60;
    pulse.time = t;
    pulse.phase = beats % 1;
    pulse.beat = Math.floor(beats);
    pulse.hype = 0.6;
  });
  return null;
}

function Dancer({ index, x, z }: { index: number; x: number; z: number }) {
  const rig = useMemo(() => {
    // the front row shows off the hero costumes, the rest are random party-goers
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    let seed = randomLookSeed();
    const want = index < 3 ? COSTUMES[index] : null;
    for (let i = 0; want && i < 500 && (makeLook(seed, color).costume ?? "none") !== want; i++) seed = randomLookSeed();
    const look = makeLook(seed, color);
    const r = createRig(look);
    dressRig(r, look.palette);
    return r;
  }, [index]);
  useFrame(() => {
    poseRig(rig, { time: pulse.time, phase: pulse.phase, beat: pulse.beat, energy: 0.7, style: index, seed: 0 });
  });
  return (
    <group position={[x, 0, z]}>
      <primitive object={rig.root} />
      <Text position={[0, 0.01, 0.55]} rotation-x={-Math.PI / 2} fontSize={0.16} color="#2a1840" anchorX="center">
        {`${index + 1}. ${DANCES[index].name}`}
      </Text>
    </group>
  );
}

export default function Lineup() {
  const pixel = usePixelCanvas(false);
  return (
    <Canvas dpr={pixel.dpr} camera={{ position: [0, 6.5, 9.5], fov: 50 }} style={{ position: "fixed", inset: 0, background: "#f3e9ff", ...pixel.style }}>
      <Clock />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#e6d6fb" />
      </mesh>
      {DANCES.map((_, i) => (
        <Dancer key={i} index={i} x={(i % 6) * 1.5 - 3.75} z={Math.floor(i / 6) * 1.6 - 4.2} />
      ))}
      <OrbitControls target={[0, 0.6, -0.6]} />
    </Canvas>
  );
}

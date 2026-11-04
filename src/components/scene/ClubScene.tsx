"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import * as THREE from "three";
import { engine } from "@/lib/audio";
import { useClub } from "@/lib/store";
import { pulse } from "./pulse";
import { BarCounter, DanceFloor, DiscoBall, DJBooth, Lasers, LedScreen, MovingLights, Room, Speakers } from "./Venue";
import { Crowd, Patrons, useMovement } from "./People";
import { ConfettiLayer, FloatingFxLayer } from "./Effects";

/** Samples the audio engine once per frame into the shared `pulse` object. */
function AudioPulse() {
  useFrame((state, dt) => {
    const lv = engine.levels();
    const s = useClub.getState();
    pulse.time = state.clock.elapsedTime;
    pulse.kick = engine.kickEnvelope();
    pulse.bass = lv.bass;
    pulse.mid = lv.mid;
    pulse.high = lv.high;
    pulse.phase = engine.beatPhase();
    pulse.hype += (s.hype / 100 - pulse.hype) * Math.min(1, dt * 2);
    pulse.drop = Math.max(0, 1 - (performance.now() - s.dropAt) / 3500);
  });
  return null;
}

/** Wobbles the whole world when you've had a few drinks (or during a DROP). */
function World({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const tipsy = useClub.getState().tipsy;
    const w = Math.min(tipsy, 10) / 10;
    if (g.current) {
      g.current.rotation.z = Math.sin(pulse.time * 0.9) * 0.05 * w;
      g.current.rotation.x = Math.sin(pulse.time * 0.6 + 1) * 0.025 * w;
      g.current.position.y = pulse.drop > 0 ? (Math.random() - 0.5) * 0.08 * pulse.drop : 0;
    }
  });
  return <group ref={g}>{children}</group>;
}

function Post() {
  const bloom = useRef<{ intensity: number } | null>(null);
  const ca = useRef<{ offset: THREE.Vector2 } | null>(null);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = 0.9 + pulse.hype * 0.8 + pulse.kick * 0.5 + pulse.drop;
    if (ca.current) {
      const t = Math.min(useClub.getState().tipsy, 10) / 10;
      const o = 0.0004 + t * 0.004 + pulse.drop * 0.003;
      ca.current.offset.set(o, o);
    }
  });
  return (
    <EffectComposer multisampling={0}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Bloom ref={bloom as any} mipmapBlur luminanceThreshold={0.25} luminanceSmoothing={0.3} intensity={1.2} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ChromaticAberration ref={ca as any} offset={new THREE.Vector2(0.0005, 0.0005)} radialModulation={false} modulationOffset={0} />
      <Vignette eskil={false} offset={0.2} darkness={0.85} />
    </EffectComposer>
  );
}

/** Widen the lens on portrait phones so the DJ and the floor both fit. */
function ResponsiveCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    camera.fov = aspect < 0.8 ? 78 : aspect < 1.2 ? 65 : 55;
    camera.updateProjectionMatrix();
  }, [aspect, camera]);
  return null;
}

function SceneContent() {
  const walkTo = useMovement();
  return (
    <>
      <AudioPulse />
      <ResponsiveCamera />
      <color attach="background" args={["#05020a"]} />
      <fog attach="fog" args={["#07030d", 12, 30]} />
      <MovingLights />
      <World>
        <Room />
        <DanceFloor onPick={walkTo} />
        <LedScreen />
        <DJBooth />
        <Speakers />
        <BarCounter />
        <DiscoBall />
        <Lasers />
        <Crowd />
        <Patrons />
        <FloatingFxLayer />
        <ConfettiLayer />
      </World>
      <OrbitControls
        target={[0, 1.4, 0]}
        enablePan={false}
        minDistance={4}
        maxDistance={16}
        minPolarAngle={0.6}
        maxPolarAngle={1.45}
        enableDamping
      />
      <Post />
    </>
  );
}

export default function ClubScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 4.2, 11.5], fov: 55 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0 }}
    >
      <SceneContent />
    </Canvas>
  );
}

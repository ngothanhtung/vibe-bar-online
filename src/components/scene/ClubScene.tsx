"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import * as THREE from "three";
import { engine } from "@/lib/audio";
import { useClub } from "@/lib/store";
import { pulse } from "./pulse";
import { updateSpectrum } from "./spectrum";
import { BarCounter, DanceFloor, LedScreen, MovingLights, Room } from "./Venue";
import { FloorSideLeds, MirrorBalls } from "./Glitter";
import { Lasers } from "./Lasers";
import { PaSystem } from "./PaSystem";
import { BarFurniture } from "./Furniture";
import { Waiters } from "./Waiters";
import { HipHopCypher } from "./HipHop";
import { DJBooth } from "./DjBooth";
import { Crowd, Patrons, useMovement } from "./People";
import { ConfettiLayer, FloatingFxLayer } from "./Effects";
import { LabelLayer } from "./labels";
import { FigureInstancer } from "./figures";
import { usePixelCanvas } from "./pixel";

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
    const phase = engine.beatPhase();
    if (phase < pulse.phase - 0.5) pulse.beat++;
    pulse.phase = phase;
    pulse.hype += (s.hype / 100 - pulse.hype) * Math.min(1, dt * 2);
    pulse.drop = Math.max(0, 1 - (performance.now() - s.dropAt) / 3500);
    updateSpectrum(dt);
  }, -2); // before anything that reads `pulse`
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
      <Bloom ref={bloom as any} mipmapBlur levels={6} resolutionScale={0.5} luminanceThreshold={0.25} luminanceSmoothing={0.3} intensity={1.2} />
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

const CAM_PRESETS = {
  floor: { pos: new THREE.Vector3(0, 7.2, 19.5), target: new THREE.Vector3(0, 1.2, 1.5) },
  stage: { pos: new THREE.Vector3(0.3, 3.4, 6.2), target: new THREE.Vector3(0, 2.8, -5.5) },
};

/** Glides the camera to the chosen preset, then hands control back to OrbitControls. */
function CameraFocus() {
  const focus = useClub((s) => s.camFocus);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const camera = useThree((s) => s.camera);
  const until = useRef(0);
  useEffect(() => {
    until.current = performance.now() + 1400;
  }, [focus]);
  useFrame((_, dt) => {
    if (!controls || performance.now() > until.current) return;
    const p = CAM_PRESETS[focus];
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(p.pos, k);
    controls.target.lerp(p.target, k);
    controls.update();
  });
  return null;
}

function SceneContent() {
  const walkTo = useMovement();
  return (
    <>
      <AudioPulse />
      <ResponsiveCamera />
      <LabelLayer />
      <color attach="background" args={["#05020a"]} />
      <fog attach="fog" args={["#07030d", 20, 52]} />
      <MovingLights />
      <World>
        <Room />
        <DanceFloor onPick={walkTo} />
        <LedScreen />
        <DJBooth />
        <PaSystem />
        <BarCounter />
        <BarFurniture />
        <Waiters />
        <MirrorBalls />
        <FloorSideLeds />
        <Lasers />
        <Crowd />
        <HipHopCypher />
        <Patrons />
        <FloatingFxLayer />
        <ConfettiLayer />
      </World>
      {/* every character, drawn in ~40 instanced calls (outside World: rigs already carry its transform) */}
      <FigureInstancer />
      <CameraFocus />
      <OrbitControls
        makeDefault
        target={[0, 1.2, 1.5]}
        enablePan={false}
        minDistance={2.5}
        maxDistance={28}
        minPolarAngle={0.6}
        maxPolarAngle={1.45}
        enableDamping
      />
      <Post />
    </>
  );
}

export default function ClubScene() {
  const pixelArt = useClub((s) => s.pixelArt);
  // Resolution cap that drops automatically when the frame rate does (and climbs back when it recovers).
  const [dprCap, setDprCap] = useState(1.5);
  const pixel = usePixelCanvas(pixelArt, dprCap);
  return (
    <Canvas
      dpr={pixel.dpr}
      camera={{ position: [0, 7.2, 19.5], fov: 55 }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      style={{ position: "fixed", inset: 0, ...pixel.style }}
    >
      {/* Steps the resolution between 0.85x and 1.5x with the measured frame rate. The floor keeps
          it sharp, and a slow start (shader compiles) can't lock it low: on fallback it settles at 1x. */}
      <PerformanceMonitor
        ms={400}
        iterations={8}
        onDecline={() => setDprCap((c) => Math.max(0.85, +(c - 0.15).toFixed(2)))}
        onIncline={() => setDprCap((c) => Math.min(1.5, +(c + 0.15).toFixed(2)))}
        flipflops={6}
        onFallback={() => setDprCap(1)}
      />
      <SceneContent />
    </Canvas>
  );
}

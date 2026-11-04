"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import * as THREE from "three";
import { engine } from "@/lib/audio";
import { useClub } from "@/lib/store";
import { pulse } from "./pulse";
import { BarCounter, DanceFloor, DiscoBall, LedScreen, MovingLights, Room, Speakers } from "./Venue";
import { Lasers } from "./Lasers";
import { DJBooth } from "./DjBooth";
import { Crowd, Patrons, useMovement } from "./People";
import { ConfettiLayer, FloatingFxLayer } from "./Effects";
import { LabelLayer } from "./labels";
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

const CAM_PRESETS = {
  floor: { pos: new THREE.Vector3(0, 4.2, 11.5), target: new THREE.Vector3(0, 1.4, 0) },
  stage: { pos: new THREE.Vector3(0.6, 2.9, -0.4), target: new THREE.Vector3(0, 1.8, -4.8) },
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
      <CameraFocus />
      <OrbitControls
        makeDefault
        target={[0, 1.4, 0]}
        enablePan={false}
        minDistance={2.5}
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
  const pixelArt = useClub((s) => s.pixelArt);
  const pixel = usePixelCanvas(pixelArt);
  return (
    <Canvas
      dpr={pixel.dpr}
      camera={{ position: [0, 4.2, 11.5], fov: 55 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0, ...pixel.style }}
    >
      <SceneContent />
    </Canvas>
  );
}

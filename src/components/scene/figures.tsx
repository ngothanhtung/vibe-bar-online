"use client";

// One instanced renderer for every character in the club (crowd, players, DJ crew, dancers).
// Each figure registers its rig + palette; once per frame every body part of every figure is
// written into one InstancedMesh per part shape. ~40 draw calls total instead of ~30 per person.

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { instancedMaterial, PART_KEYS, partGeometries, type Palette, type PartKey, type Rig } from "./chibi";

export interface FigureEntry {
  rig: Rig;
  palette: Palette;
  /** true when rig.root is attached to the scene (its ancestors move it); false for free rigs. */
  inScene: boolean;
}

interface Registered extends FigureEntry {
  /** palette pre-parsed into THREE.Colors so the frame loop never parses colour strings */
  colors: Record<string, THREE.Color>;
}

const entries = new Set<Registered>();

export function registerFigure(entry: FigureEntry) {
  const colors: Record<string, THREE.Color> = {};
  for (const [slot, hex] of Object.entries(entry.palette)) colors[slot] = new THREE.Color(hex);
  const reg: Registered = { ...entry, colors };
  entries.add(reg);
  return () => {
    entries.delete(reg);
  };
}

/** Register a rig for as long as the calling component is mounted. */
export function useFigure(rig: Rig | null, palette: Palette | null, inScene = true) {
  useEffect(() => {
    if (!rig || !palette) return;
    return registerFigure({ rig, palette, inScene });
  }, [rig, palette, inScene]);
}

/** Frame-loop priority for posing figures: runs before the instancer reads their joints. */
export const POSE_PRIORITY = -1;

const MAX_FIGURES = 160;
/** Upper bound of how many times one figure can use a part (e.g. 9 flower prints, 2 eyes). */
const PER_FIGURE: Partial<Record<PartKey, number>> = {
  flower: 9,
  eye: 2,
  blush: 2,
  catEar: 2,
  upperArm: 2,
  forearm: 2,
  hand: 2,
  thigh: 2,
  shin: 2,
  foot: 2,
};

export function FigureInstancer() {
  const meshes = useMemo(() => {
    const g = partGeometries();
    const map = new Map<PartKey, THREE.InstancedMesh>();
    for (const key of PART_KEYS) {
      const m = new THREE.InstancedMesh(g[key], instancedMaterial(), MAX_FIGURES * (PER_FIGURE[key] ?? 1));
      m.count = 0;
      m.frustumCulled = false;
      m.raycast = () => {};
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      map.set(key, m);
    }
    return map;
  }, []);

  useEffect(() => () => meshes.forEach((m) => m.dispose()), [meshes]);

  useFrame(() => {
    const used = new Map<PartKey, number>();
    for (const e of entries) {
      // world matrices: walk up from the scene for attached rigs, or straight from the root for free ones
      if (e.inScene) e.rig.root.updateWorldMatrix(true, true);
      else e.rig.root.updateMatrixWorld(true);
      for (const { key, node, slot } of e.rig.parts) {
        const mesh = meshes.get(key)!;
        const i = used.get(key) ?? 0;
        if (i >= mesh.instanceMatrix.count) continue;
        mesh.setMatrixAt(i, node.matrixWorld);
        mesh.setColorAt(i, e.colors[slot]);
        used.set(key, i + 1);
      }
    }
    meshes.forEach((m, key) => {
      m.count = used.get(key) ?? 0;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  });

  return (
    <group>
      {[...meshes.entries()].map(([key, m]) => (
        <primitive key={key} object={m} />
      ))}
    </group>
  );
}

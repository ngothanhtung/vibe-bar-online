"use client";

// Lightweight 3D-anchored HTML labels. Each label is a plain DOM node positioned
// every frame, so adding/removing them never creates or unmounts a React root
// (drei <Html> does, which races with React 19 when labels come and go quickly).

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface Label {
  el: HTMLDivElement;
  /** Fill `out` with the world position; return false to hide the label this frame. */
  place: (out: THREE.Vector3) => boolean;
  /** Size multiplier relative to distance (like drei's distanceFactor). */
  distanceFactor: number;
}

const labels = new Set<Label>();
let layer: HTMLDivElement | null = null;

export function addLabel(className: string, place: Label["place"], distanceFactor = 9): Label {
  const el = document.createElement("div");
  el.className = className;
  Object.assign(el.style, { position: "absolute", left: "0", top: "0", willChange: "transform", pointerEvents: "none" });
  const label = { el, place, distanceFactor };
  labels.add(label);
  layer?.appendChild(el);
  return label;
}

export function removeLabel(label: Label) {
  labels.delete(label);
  label.el.remove();
}

const v = new THREE.Vector3();

/** Mount once inside the Canvas. */
export function LabelLayer() {
  const gl = useThree((s) => s.gl);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;
    const div = document.createElement("div");
    Object.assign(div.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "5" });
    parent.appendChild(div);
    ref.current = layer = div;
    labels.forEach((l) => div.appendChild(l.el));
    return () => {
      div.remove();
      if (layer === div) layer = null;
    };
  }, [gl]);

  useFrame(({ camera, size }) => {
    labels.forEach((l) => {
      if (!l.place(v)) {
        l.el.style.display = "none";
        return;
      }
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1) {
        l.el.style.display = "none";
        return;
      }
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const s = Math.min(1.6, Math.max(0.35, l.distanceFactor / dist));
      l.el.style.display = "";
      l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
    });
  });

  return null;
}

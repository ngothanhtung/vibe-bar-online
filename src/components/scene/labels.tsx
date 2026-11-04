"use client";

// Lightweight 3D-anchored HTML labels. Each label is a plain DOM node positioned
// every frame, so adding/removing them never creates or unmounts a React root
// (drei <Html> does, which races with React 19 when labels come and go quickly).

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FIGURE_HEIGHT } from "./chibi";

export interface Label {
  el: HTMLDivElement;
  /** Fill `out` with the world position; return false to hide the label this frame. */
  place: (out: THREE.Vector3) => boolean;
  /** Size multiplier relative to distance (like drei's distanceFactor). */
  distanceFactor: number;
  /** Hide the label beyond this camera distance (keeps far crowds uncluttered and cheap). */
  maxDistance: number;
  /** Last values written to the DOM, so unchanged labels cost nothing. */
  shown: boolean;
  transform: string;
}

const labels = new Set<Label>();
let layer: HTMLDivElement | null = null;

export function addLabel(className: string, place: Label["place"], distanceFactor = 9, maxDistance = Infinity): Label {
  const el = document.createElement("div");
  el.className = className;
  Object.assign(el.style, { position: "absolute", left: "0", top: "0", willChange: "transform", pointerEvents: "none", display: "none" });
  const label: Label = { el, place, distanceFactor, maxDistance, shown: false, transform: "" };
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
    const screenScale = THREE.MathUtils.clamp(
      Math.min(size.width / 1280, size.height / 720),
      0.65,
      1.3,
    );
    const show = (l: Label, on: boolean) => {
      if (l.shown === on) return;
      l.shown = on;
      l.el.style.display = on ? "" : "none";
    };
    labels.forEach((l) => {
      if (!l.place(v)) return show(l, false);
      const dist = camera.position.distanceTo(v);
      if (dist > l.maxDistance) return show(l, false);
      v.project(camera);
      if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) return show(l, false);
      // whole pixels + 2-decimal scale keep the string stable, so still labels skip the DOM write
      const x = Math.round((v.x * 0.5 + 0.5) * size.width);
      const y = Math.round((-v.y * 0.5 + 0.5) * size.height);
      const s = Math.min(1.6, Math.max(0.35, (l.distanceFactor / dist) * screenScale)).toFixed(2);
      const transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${s})`;
      show(l, true);
      if (transform !== l.transform) {
        l.transform = transform;
        l.el.style.transform = transform;
      }
    });
  });

  return null;
}

/** Crisp DOM name tag floating above a performer (same style as the players' tags). */
export function useStageTag(group: { current: THREE.Object3D | null }, name: string, color: string, height = FIGURE_HEIGHT + 0.3, splitAfterWords = 0) {
  useEffect(() => {
    const label = addLabel(`nametag stage${splitAfterWords > 0 ? " multiline" : ""}`, (out) => {
      if (!group.current) return false;
      group.current.getWorldPosition(out);
      out.y += height;
      return true;
    });
    const words = name.split(" ");
    label.el.textContent = splitAfterWords > 0 && words.length > splitAfterWords
      ? `${words.slice(0, splitAfterWords).join(" ")}\n${words.slice(splitAfterWords).join(" ")}`
      : name;
    label.el.style.borderColor = color;
    label.el.style.color = color;
    return () => removeLabel(label);
  }, [group, name, color, height, splitAfterWords]);
}

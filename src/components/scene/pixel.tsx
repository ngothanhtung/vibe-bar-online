"use client";

import { useEffect, useState } from "react";

/** Virtual vertical resolution of the pixel-art render (like a retro game screen). */
export const PIXEL_ROWS = 360;

const pixelDpr = () => (typeof window === "undefined" ? 1 : Math.min(1, Math.max(0.15, PIXEL_ROWS / window.innerHeight)));

/**
 * Canvas props for the pixel-art look: a small drawing buffer that the browser upscales with
 * nearest-neighbour sampling, so outlines, lasers and bloom all turn into chunky pixels.
 */
export function usePixelCanvas(enabled: boolean, dprCap = 1.5) {
  const [dpr, setDpr] = useState(pixelDpr);
  useEffect(() => {
    const onResize = () => setDpr(pixelDpr());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return {
    dpr: enabled ? dpr : Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio, dprCap),
    style: { imageRendering: enabled ? ("pixelated" as const) : ("auto" as const) },
  };
}

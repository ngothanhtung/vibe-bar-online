// One spectrum per frame, shared by every LED surface as a tiny texture:
// R = band level (0..1), G = falling peak cap. Updated from <AudioPulse/>.

import * as THREE from "three";
import { engine } from "@/lib/audio";

export const BANDS = 48;

const levels = new Float32Array(BANDS);
const smooth = new Float32Array(BANDS);
const peaks = new Float32Array(BANDS);
const peakHold = new Float32Array(BANDS);
const data = new Uint8Array(BANDS * 4);

/** Smoothed band levels (0..1), readable on the CPU by anything that wants to dance to the EQ. */
export const spectrumLevels = smooth;

export const spectrumTexture = new THREE.DataTexture(data, BANDS, 1, THREE.RGBAFormat);
spectrumTexture.minFilter = spectrumTexture.magFilter = THREE.NearestFilter;
spectrumTexture.needsUpdate = true;

export function updateSpectrum(dt: number) {
  engine.spectrum(levels);
  for (let i = 0; i < BANDS; i++) {
    // fast attack, slower release, like a real meter
    const v = levels[i];
    smooth[i] = v > smooth[i] ? v : smooth[i] + (v - smooth[i]) * Math.min(1, dt * 9);
    // peak caps hold briefly, then fall
    if (smooth[i] >= peaks[i]) {
      peaks[i] = smooth[i];
      peakHold[i] = 0.35;
    } else if (peakHold[i] > 0) peakHold[i] -= dt;
    else peaks[i] = Math.max(smooth[i], peaks[i] - dt * 0.7);
    data[i * 4] = Math.round(smooth[i] * 255);
    data[i * 4 + 1] = Math.round(peaks[i] * 255);
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  spectrumTexture.needsUpdate = true;
}

/** GLSL helpers: sample band level / peak at band coordinate u (0..1). */
export const SPECTRUM_GLSL = /* glsl */ `
uniform sampler2D uSpec;
float specLevel(float u) { return texture2D(uSpec, vec2((floor(u * ${BANDS}.0) + 0.5) / ${BANDS}.0, 0.5)).r; }
float specPeak(float u) { return texture2D(uSpec, vec2((floor(u * ${BANDS}.0) + 0.5) / ${BANDS}.0, 0.5)).g; }
`;

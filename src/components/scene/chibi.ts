// Minimal "toy" characters: a big round head with a bowl-cut, dot eyes and a little smile,
// a cylinder body, tube arms and legs, and chunky block shoes, all in flat matte colours.
// One joint rig drives both the instanced NPC crowd and the individual avatars; every part
// belongs to a colour slot (skin, hair, outfit…) so each figure can be dressed differently.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type PartKey =
  | "head"
  | "hair"
  | "spikes"
  | "hairBack"
  | "bun"
  | "pony"
  | "capDome"
  | "capBrim"
  | "bow"
  | "eye"
  | "mouth"
  | "blush"
  | "glasses"
  | "shades"
  | "bucketHat"
  | "headband"
  | "catEar"
  | "chain"
  | "flower"
  | "shirtFront"
  | "bowtie"
  | "cape"
  | "emblem"
  | "domino"
  | "helmet"
  | "visor"
  | "core"
  | "hoodTop"
  | "hoodLow"
  | "sash"
  | "torso"
  | "cropTop"
  | "bikiniTop"
  | "bikiniBottom"
  | "dress"
  | "skirt"
  | "hood"
  | "pelvis"
  | "upperArm"
  | "forearm"
  | "hand"
  | "thigh"
  | "shin"
  | "foot";
export type Slot = "skin" | "hair" | "eye" | "white" | "blush" | "outfit" | "accent" | "pants" | "shoe" | "dark" | "gold" | "visor";

export const PART_KEYS: PartKey[] = [
  "head", "hair", "spikes", "hairBack", "bun", "pony", "capDome", "capBrim", "bow", "eye", "mouth", "blush", "glasses", "shades",
  "bucketHat", "headband", "catEar", "chain", "flower", "shirtFront", "bowtie", "cape", "emblem", "domino", "helmet", "visor", "core",
  "hoodTop", "hoodLow", "sash", "torso", "cropTop", "bikiniTop", "bikiniBottom", "dress", "skirt", "hood", "pelvis", "upperArm", "forearm", "hand", "thigh", "shin", "foot",
];

// Proportions: about three heads tall, the head as wide as the shoulders.
const LIMB = { upperArm: 0.16, forearm: 0.15, thigh: 0.15, shin: 0.15 };
// hips node height: hip joints sit 0.04 below it, then thigh + shin + shoe (0.0725) to the floor
export const HIP_HEIGHT = 0.04 + 0.15 + 0.15 + 0.0725;
const TORSO_H = 0.36; // spine joint -> neck joint (top of the body)
const TORSO_DEPTH = 0.85; // body is a slightly flattened cylinder
/** Height of the top of the head, for placing name tags. */
export const FIGURE_HEIGHT = 1.34;

const HEAD = { rx: 0.27, ry: 0.26, rz: 0.26, y: 0.25 };
export const HEAD_SIZE = HEAD;
/** Z of the head surface at (x, y) relative to the head centre, for sticking face parts on. */
const faceZ = (x: number, y: number) => HEAD.rz * Math.sqrt(Math.max(0, 1 - (x / HEAD.rx) ** 2 - (y / HEAD.ry) ** 2));
const EYE_X = 0.085;
const EYE_DY = -0.02;
export const FACE = {
  eyeX: EYE_X,
  eyeY: HEAD.y + EYE_DY,
  eyeZ: faceZ(EYE_X, EYE_DY) - 0.004,
  mouthY: HEAD.y - 0.1,
  mouthZ: faceZ(0, -0.1) - 0.002,
  blushX: 0.15,
  blushY: HEAD.y - 0.07,
  blushZ: faceZ(0.15, -0.07) - 0.003,
};
/** Polar angle (from the top) of the eye line on the head, for bands like masks and visors. */
const EYE_THETA = Math.acos(EYE_DY / HEAD.ry);

function ellipsoid(rx: number, ry: number, rz: number, seg = 20) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  g.scale(rx, ry, rz);
  g.computeVertexNormals();
  return g;
}

/**
 * Capsule limb segment hanging down from its joint. Both rounded ends are centred exactly on the
 * joints (y = 0 and y = -length), so two segments meeting at an elbow or knee always form one
 * smooth, continuous bent tube, whatever the angle.
 */
function limb(rTop: number, rBottom: number, length: number) {
  const pts: THREE.Vector2[] = [];
  const n = 8;
  // bottom cap: from the bottom pole up to the equator at y = -length
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * rBottom, -length - Math.cos(a) * rBottom));
  }
  // top cap: from the equator at the joint up to the top pole
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * rTop, Math.sin(a) * rTop));
  }
  const g = new THREE.LatheGeometry(pts, 18);
  g.computeVertexNormals();
  return g;
}

function mergeGeoms(list: THREE.BufferGeometry[]) {
  // Tiny merge for position/normal attributes.
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const count = parts.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of parts) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}

/** Shell band of the head sphere, slightly inflated (hair, caps, masks). */
function headShell(inflate: number, phiStart: number, phiLength: number, thetaStart: number, thetaLength: number, seg = 28) {
  const g = new THREE.SphereGeometry(1, seg, 14, phiStart, phiLength, thetaStart, thetaLength);
  g.scale(HEAD.rx + inflate, HEAD.ry + inflate, HEAD.rz + inflate);
  g.translate(0, HEAD.y, 0);
  g.computeVertexNormals();
  return g;
}

function lathe(pts: [number, number][], depth: number, seg = 28) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.scale(1, 1, depth);
  g.computeVertexNormals();
  return g;
}

/** Body profile: a cylinder with softly rounded shoulders. */
const TORSO_PTS: [number, number][] = [
  [0.0, -0.02],
  [0.16, -0.02],
  [0.175, 0.02],
  [0.178, 0.27],
  [0.165, 0.325],
  [0.12, 0.355],
  [0.0, 0.362],
];
function torsoRadius(y: number) {
  for (let i = 1; i < TORSO_PTS.length; i++) {
    const [r1, y1] = TORSO_PTS[i];
    const [r0, y0] = TORSO_PTS[i - 1];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
  }
  return 0;
}
/** Point on the front of the body at height y. */
const chestZ = (y: number) => torsoRadius(y) * TORSO_DEPTH;

let geoms: Record<PartKey, THREE.BufferGeometry> | null = null;

export function partGeometries() {
  geoms ??= {
    head: (() => {
      const g = ellipsoid(HEAD.rx, HEAD.ry, HEAD.rz, 32);
      g.translate(0, HEAD.y, 0);
      return g;
    })(),
    // Bowl cut: a cap with a straight fringe above the eyes, longer at the back.
    hair: (() => {
      const g = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.53);
      g.scale(HEAD.rx + 0.016, HEAD.ry + 0.018, HEAD.rz + 0.016);
      g.rotateX(-0.32);
      g.translate(0, HEAD.y + 0.012, -0.004);
      g.computeVertexNormals();
      return g;
    })(),
    spikes: (() => {
      const cones: THREE.BufferGeometry[] = [];
      const spots: [number, number, number][] = [
        [0, 0.25, 0.08], [0.12, 0.22, 0.0], [-0.12, 0.22, 0.0], [0.065, 0.23, -0.11], [-0.065, 0.23, -0.11], [0, 0.2, 0.18],
      ];
      for (const [x, y, z] of spots) {
        const c = new THREE.ConeGeometry(0.06, 0.16, 7);
        c.rotateX(z * 3.2);
        c.rotateZ(-x * 3.4);
        c.translate(x, HEAD.y + y, z);
        cones.push(c);
      }
      return mergeGeoms(cones);
    })(),
    hairBack: (() => {
      const g = ellipsoid(0.27, 0.27, 0.12, 22);
      g.translate(0, HEAD.y - 0.12, -0.15);
      return g;
    })(),
    bun: (() => {
      const g = ellipsoid(0.095, 0.09, 0.095, 16);
      g.translate(0, HEAD.y + 0.27, -0.04);
      return g;
    })(),
    pony: (() => {
      const g = ellipsoid(0.07, 0.16, 0.07, 14);
      g.rotateX(0.55);
      g.translate(0, HEAD.y + 0.0, -0.31);
      return g;
    })(),
    capDome: headShell(0.026, 0, Math.PI * 2, 0, Math.PI * 0.48),
    capBrim: (() => {
      const g = new THREE.CylinderGeometry(0.18, 0.18, 0.024, 24, 1, false, -Math.PI / 2, Math.PI);
      g.scale(1, 1, 1.15);
      g.translate(0, HEAD.y + 0.08, 0.2);
      return g;
    })(),
    bow: (() => {
      const l = ellipsoid(0.06, 0.045, 0.028, 12);
      l.translate(-0.052, 0, 0);
      const r = ellipsoid(0.06, 0.045, 0.028, 12);
      r.translate(0.052, 0, 0);
      const g = mergeGeoms([l, r, ellipsoid(0.024, 0.024, 0.024, 8)]);
      g.rotateZ(-0.4);
      g.translate(0.17, HEAD.y + 0.2, 0.07);
      return g;
    })(),
    // --- face: just two dots and a smile ---
    eye: ellipsoid(0.026, 0.031, 0.014, 14),
    mouth: (() => {
      const g = new THREE.TorusGeometry(0.038, 0.008, 6, 14, Math.PI);
      g.rotateZ(Math.PI);
      return g;
    })(),
    blush: ellipsoid(0.04, 0.022, 0.008, 12),
    glasses: (() => {
      const l = new THREE.TorusGeometry(0.048, 0.009, 6, 18);
      l.translate(-EYE_X, 0, 0);
      const r = new THREE.TorusGeometry(0.048, 0.009, 6, 18);
      r.translate(EYE_X, 0, 0);
      const g = mergeGeoms([l, r, new THREE.BoxGeometry(0.075, 0.01, 0.01)]);
      g.translate(0, FACE.eyeY, FACE.eyeZ + 0.022);
      return g;
    })(),
    shades: (() => {
      const l = ellipsoid(0.055, 0.038, 0.016, 14);
      l.translate(-EYE_X, 0, 0);
      const r = ellipsoid(0.055, 0.038, 0.016, 14);
      r.translate(EYE_X, 0, 0);
      const bridge = new THREE.BoxGeometry(0.06, 0.012, 0.012);
      bridge.translate(0, 0.015, 0);
      const g = mergeGeoms([l, r, bridge]);
      g.translate(0, FACE.eyeY, FACE.eyeZ + 0.026);
      return g;
    })(),
    bucketHat: (() => {
      const crown = new THREE.CylinderGeometry(0.23, 0.29, 0.16, 26);
      crown.translate(0, 0.08, 0);
      const brim = new THREE.CylinderGeometry(0.3, 0.39, 0.055, 30, 1, true);
      brim.translate(0, -0.015, 0);
      const top = new THREE.CircleGeometry(0.23, 26);
      top.rotateX(-Math.PI / 2);
      top.translate(0, 0.16, 0);
      const g = mergeGeoms([crown, brim, top]);
      g.rotateX(-0.12);
      g.translate(0, HEAD.y + 0.11, -0.01);
      return g;
    })(),
    headband: (() => {
      const g = new THREE.TorusGeometry(1, 0.07, 8, 36);
      g.scale(HEAD.rx + 0.012, HEAD.rz + 0.012, 0.5);
      g.rotateX(Math.PI / 2 - 0.3);
      g.translate(0, HEAD.y + 0.11, 0);
      g.computeVertexNormals();
      return g;
    })(),
    catEar: (() => {
      const g = new THREE.ConeGeometry(0.065, 0.12, 4);
      g.rotateY(Math.PI / 4);
      g.rotateZ(-0.35);
      g.translate(0.16, HEAD.y + 0.24, -0.02);
      return g;
    })(),
    chain: (() => {
      const g = new THREE.TorusGeometry(0.11, 0.012, 6, 28);
      g.rotateX(Math.PI / 2 - 0.5);
      g.translate(0, TORSO_H - 0.045, 0.045);
      return g;
    })(),
    flower: ellipsoid(0.03, 0.03, 0.01, 10),
    // white shirt V under a jacket, with a bow tie
    shirtFront: (() => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.065, 0.0);
      shape.lineTo(0.065, 0.0);
      shape.lineTo(0, -0.2);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false });
      g.translate(0, TORSO_H - 0.02, chestZ(0.25) - 0.004);
      g.computeVertexNormals();
      return g;
    })(),
    bowtie: (() => {
      const l = new THREE.ConeGeometry(0.03, 0.06, 4);
      l.rotateZ(Math.PI / 2);
      l.translate(0.028, 0, 0);
      const r = new THREE.ConeGeometry(0.03, 0.06, 4);
      r.rotateZ(-Math.PI / 2);
      r.translate(-0.028, 0, 0);
      const g = mergeGeoms([l, r, ellipsoid(0.014, 0.014, 0.014, 8)]);
      g.translate(0, TORSO_H - 0.035, chestZ(0.32) + 0.012);
      return g;
    })(),
    // --- hero costumes (original designs) ---
    cape: (() => {
      const g = new THREE.CylinderGeometry(0.19, 0.32, 0.62, 18, 1, true, Math.PI - 1.25, 2.5);
      g.translate(0, -0.31, 0);
      return g;
    })(),
    emblem: (() => {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        const rad = i % 2 === 0 ? 1 : 0.45;
        if (i === 0) shape.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else shape.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
      g.scale(0.065, 0.065, 0.065);
      g.translate(0, 0.22, chestZ(0.22) - 0.006);
      g.computeVertexNormals();
      return g;
    })(),
    domino: headShell(0.007, Math.PI / 2 - 1.05, 2.1, EYE_THETA - 0.15, 0.3),
    helmet: (() => {
      const g = ellipsoid(HEAD.rx + 0.03, HEAD.ry + 0.03, HEAD.rz + 0.03, 32);
      g.translate(0, HEAD.y, 0);
      return g;
    })(),
    visor: headShell(0.038, Math.PI / 2 - 0.85, 1.7, EYE_THETA - 0.17, 0.32),
    core: (() => {
      const g = new THREE.CylinderGeometry(0.05, 0.05, 0.025, 20);
      g.rotateX(Math.PI / 2);
      g.translate(0, 0.22, chestZ(0.22) + 0.004);
      return g;
    })(),
    hoodTop: headShell(0.016, 0, Math.PI * 2, 0, EYE_THETA - 0.14),
    hoodLow: headShell(0.016, 0, Math.PI * 2, EYE_THETA + 0.16, Math.PI - EYE_THETA - 0.16),
    sash: (() => {
      const g = new THREE.TorusGeometry(0.18, 0.03, 8, 24);
      g.rotateX(Math.PI / 2);
      g.scale(1, 1, TORSO_DEPTH);
      g.translate(0, 0.02, 0);
      return g;
    })(),
    torso: lathe(TORSO_PTS, TORSO_DEPTH),
    // crop top: the upper band of the body, a hair bigger so it sits over the skin
    cropTop: lathe(
      [[0.0, 0.17], [0.181, 0.17], [0.183, 0.27], [0.17, 0.327], [0.124, 0.358], [0.0, 0.366]],
      TORSO_DEPTH,
    ),
    // sleeveless top flaring into a bell skirt down to the knees
    // swimsuit pieces: a band over the chest and a band over the hips
    bikiniTop: lathe([[0.18, 0.2], [0.183, 0.205], [0.184, 0.29], [0.18, 0.295]], TORSO_DEPTH),
    bikiniBottom: lathe([[0.0, -0.08], [0.171, -0.08], [0.18, -0.03], [0.181, 0.0], [0.176, 0.008]], TORSO_DEPTH),
    dress: lathe([[0.0, -0.3], [0.31, -0.3], [0.29, -0.22], [0.2, -0.06], [0.175, 0.04], [0.178, 0.27], [0.165, 0.325], [0.12, 0.355], [0.0, 0.362]], 0.95),
    skirt: lathe([[0.0, -0.2], [0.26, -0.2], [0.2, 0.04], [0.0, 0.04]], 0.95),
    hood: (() => {
      const g = new THREE.TorusGeometry(0.13, 0.055, 8, 20);
      g.rotateX(Math.PI / 2 - 0.5);
      g.translate(0, TORSO_H - 0.01, -0.08);
      return g;
    })(),
    // shorts block / hips
    pelvis: lathe([[0.0, -0.08], [0.168, -0.08], [0.176, 0.03], [0.0, 0.03]], TORSO_DEPTH),
    upperArm: limb(0.052, 0.049, LIMB.upperArm),
    forearm: limb(0.0465, 0.044, LIMB.forearm),
    hand: (() => {
      const g = ellipsoid(0.05, 0.055, 0.047, 12);
      g.translate(0, -0.035, 0);
      return g;
    })(),
    thigh: limb(0.066, 0.061, LIMB.thigh),
    shin: limb(0.058, 0.054, LIMB.shin),
    // chunky block shoes
    foot: (() => {
      const g = new RoundedBoxGeometry(0.12, 0.075, 0.18, 3, 0.03);
      g.translate(0, -0.035, 0.03);
      return g;
    })(),
  };
  return geoms;
}

/** Matte material with a bit of self-glow from the albedo, so figures stay readable in a dark club. */
function toyMaterial(color: THREE.ColorRepresentation) {
  const m = new THREE.MeshLambertMaterial({ color });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.4;",
    );
  };
  return m;
}

let instanceMat: THREE.Material | null = null;
/** White base material for instanced crowds; the per-instance colour does the tinting. */
export function instancedMaterial() {
  instanceMat ??= toyMaterial("#ffffff");
  return instanceMat;
}

const matCache = new Map<string, THREE.Material>();
function slotMaterial(color: string) {
  let m = matCache.get(color);
  if (!m) {
    m = toyMaterial(color);
    matCache.set(color, m);
  }
  return m;
}

export type Palette = Record<Slot, string>;

export type Gender = "m" | "f";
export interface Look {
  gender: Gender;
  hair: "short" | "bald" | "long" | "bun" | "pony" | "cap" | "spiky";
  top: "tee" | "long" | "tank" | "hoodie" | "dress" | "floral" | "jacket" | "crop" | "bikini";
  bottom: "pants" | "shorts" | "skirt" | "none" | "bikini";
  glasses: boolean;
  bow: boolean;
  blush: boolean;
  shades?: boolean;
  chain?: boolean;
  /** Knee-high boots (shins take the shoe colour). */
  boots?: boolean;
  hat?: "none" | "bucket" | "snapback" | "headband" | "catEars";
  /** Original superhero costumes (not any real franchise's design). */
  costume?: "none" | "cape" | "armor" | "ninja";
  /** Spare randomness for small extras. */
  seedBits?: number;
  palette: Palette;
}

export const COSTUMES = ["cape", "armor", "ninja"] as const;

const SKINS = ["#f6d2b4", "#eec09a", "#d9a37c", "#b9805a", "#fde3cc", "#8d5b3c"];
const HAIRS = ["#1d1a1f", "#1d1a1f", "#1d1a1f", "#3b2618", "#6b3f22", "#e8c66a", "#ff6fb5", "#58c7ff", "#eceaf2", "#eceaf2", "#9b5cff"];
const PANTS = ["#2b3346", "#1a1a1f", "#4c5a78", "#e9e4da", "#3a2a24", "#6b7f5a"];
const SHOES = ["#f5f5f0", "#1c1c20", "#ff3b5c", "#ffe600", "#58c7ff"];
const ACCENTS = ["#ffffff", "#1c1c20", "#ffe600", "#ff6fb5", "#58c7ff", "#7cff4f", "#ff7a1a"];

/** Small deterministic PRNG so a whole look can be shared as one number. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomLookSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Builds a full outfit from a seed. `outfit` is the main clothing color (the patron's color). */
export function makeLook(seed: number, outfit: string, gender?: Gender): Look {
  const r = mulberry32(seed);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const chance = (p: number) => r() < p;
  const g: Gender = gender ?? (chance(0.5) ? "m" : "f");
  const skin = pick(SKINS);
  const hair = g === "f" ? pick(["short", "short", "long", "long", "bun", "pony", "cap"] as const) : pick(["short", "short", "short", "spiky", "bald", "cap"] as const);
  const top = g === "f"
    ? pick(["tee", "dress", "dress", "tank", "hoodie", "long", "floral", "jacket", "crop", "crop"] as const)
    : pick(["tee", "tee", "long", "tank", "hoodie", "floral", "floral", "jacket"] as const);
  const bottom: Look["bottom"] = top === "dress" ? "none" : g === "f" ? pick(["skirt", "pants", "shorts"] as const) : pick(["pants", "pants", "shorts"] as const);
  const costume: Look["costume"] = chance(0.2) ? pick(COSTUMES) : "none";
  const shades = chance(0.3);
  return {
    gender: g,
    hair,
    top,
    bottom,
    glasses: !shades && chance(0.18),
    shades,
    chain: chance(0.28),
    boots: g === "f" && chance(0.3),
    // heroes keep their heads clear: no hats or cat ears with a costume
    hat: hair === "cap" || costume !== "none" ? "none" : pick(["none", "none", "none", "none", "bucket", "snapback", "headband", "catEars"] as const),
    bow: g === "f" && (hair === "long" || hair === "pony" || hair === "bun") && chance(0.45),
    blush: g === "f" && chance(0.5),
    costume,
    seedBits: Math.floor(r() * 1024),
    palette: {
      skin,
      hair: pick(HAIRS),
      eye: "#16121c",
      white: "#ffffff",
      blush: "#ff9db2",
      outfit,
      accent: pick(ACCENTS),
      pants: pick(PANTS),
      shoe: pick(SHOES),
      dark: "#141418",
      gold: "#f5c542",
      visor: "#7df9ff",
    },
  };
}

export interface Rig {
  root: THREE.Object3D;
  hips: THREE.Object3D;
  spine: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  shoulder: [THREE.Object3D, THREE.Object3D]; // [left(+x), right(-x)]
  elbow: [THREE.Object3D, THREE.Object3D];
  wrist: [THREE.Object3D, THREE.Object3D];
  hip: [THREE.Object3D, THREE.Object3D];
  knee: [THREE.Object3D, THREE.Object3D];
  ankle: [THREE.Object3D, THREE.Object3D];
  cape?: THREE.Object3D;
  parts: { key: PartKey; node: THREE.Object3D; slot: Slot }[];
}

/** Builds the joint hierarchy for a look. Figure faces +z and stands on y=0. */
export function createRig(look: Look): Rig {
  const parts: Rig["parts"] = [];
  let rigCape: THREE.Object3D | undefined;
  const node = (parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const part = (parent: THREE.Object3D, key: PartKey, slot: Slot, x = 0, y = 0, z = 0, ry = 0) => {
    if (x || y || z || ry) parent = node(parent, x, y, z);
    if (ry) parent.rotation.y = ry;
    parts.push({ key, node: parent, slot });
  };

  const costume = look.costume ?? "none";
  const suit = costume !== "none"; // full bodysuit
  const topKind = suit ? "tee" : look.top;
  const bottomKind = suit ? "pants" : look.bottom;
  const sleeveless = !suit && (topKind === "tank" || topKind === "dress" || topKind === "crop" || topKind === "bikini");
  const sleeveUpper: Slot = sleeveless ? "skin" : "outfit";
  const sleeveLower: Slot = suit || topKind === "long" || topKind === "hoodie" || topKind === "jacket" ? "outfit" : "skin";
  const legUpper: Slot = suit ? "outfit" : bottomKind === "pants" || bottomKind === "shorts" ? "pants" : "skin";
  const legLower: Slot = suit ? "outfit" : look.boots ? "shoe" : bottomKind === "pants" ? "pants" : "skin";
  const handSlot: Slot = costume === "cape" ? "accent" : costume === "armor" ? "gold" : costume === "ninja" ? "outfit" : "skin";
  const footSlot: Slot = costume === "cape" ? "accent" : costume === "armor" ? "gold" : costume === "ninja" ? "dark" : "shoe";

  const root = new THREE.Object3D();
  const hips = node(root, 0, HIP_HEIGHT);
  part(hips, "pelvis", suit ? "outfit" : bottomKind === "pants" || bottomKind === "shorts" ? "pants" : bottomKind === "bikini" ? "skin" : "outfit");
  if (bottomKind === "bikini") part(hips, "bikiniBottom", "outfit");
  if (bottomKind === "skirt") part(hips, "skirt", "accent");
  if (costume === "ninja") part(hips, "sash", "accent");
  const spine = node(hips, 0, 0.03);
  spine.rotation.order = "YXZ";
  part(spine, topKind === "dress" ? "dress" : "torso", topKind === "crop" || topKind === "bikini" ? "skin" : "outfit");
  if (topKind === "bikini") part(spine, "bikiniTop", "outfit");
  if (topKind === "crop") part(spine, "cropTop", "outfit");
  if (topKind === "hoodie") part(spine, "hood", "outfit");
  if (topKind === "jacket") {
    part(spine, "shirtFront", "white");
    part(spine, "bowtie", "accent");
  }
  if (topKind === "floral") {
    // flower print scattered around the shirt: [angle around the body, height]
    for (const [a, y] of [[0.35, 0.08], [-0.5, 0.2], [1.0, 0.27], [-1.15, 0.06], [2.5, 0.14], [-2.35, 0.25], [Math.PI, 0.05], [1.7, 0.12], [-1.75, 0.17]]) {
      const rad = torsoRadius(y) + 0.002;
      part(spine, "flower", "accent", Math.sin(a) * rad, y, Math.cos(a) * rad * TORSO_DEPTH, a);
    }
  }
  if (look.chain && costume !== "armor") part(spine, "chain", "gold");
  if (costume === "cape") {
    part(spine, "emblem", "gold");
    const cape = node(spine, 0, TORSO_H - 0.03, -0.04);
    cape.rotation.order = "YXZ";
    part(cape, "cape", "accent");
    rigCape = cape;
  }
  if (costume === "armor") part(spine, "core", "visor");
  const neck = node(spine, 0, TORSO_H);
  const head = node(neck, 0, 0);
  part(head, "head", "skin");

  if (costume === "armor") {
    // full helmet with a glowing visor, no face showing
    part(head, "helmet", "outfit");
    part(head, "visor", "visor");
  } else {
    if (costume === "ninja") {
      part(head, "hoodTop", "outfit");
      part(head, "hoodLow", "outfit");
    } else if (look.hair === "cap" || look.hat === "snapback") {
      if (look.hat === "snapback") part(head, "hair", "hair");
      part(head, "capDome", "accent");
      // a snapback is worn backwards
      part(head, "capBrim", "accent", 0, 0, 0, look.hat === "snapback" ? Math.PI : 0);
    } else if (look.hair !== "bald") {
      part(head, "hair", "hair");
      if (look.hair === "spiky" && (look.hat === "none" || look.hat === undefined || look.hat === "headband")) part(head, "spikes", "hair");
    }
    if (costume !== "ninja") {
      if (look.hair === "long") part(head, "hairBack", "hair");
      if (look.hair === "bun") part(head, "bun", "hair");
      if (look.hair === "pony") part(head, "pony", "hair");
      if (look.bow) part(head, "bow", "accent");
      if (look.hat === "bucket") part(head, "bucketHat", "accent");
      if (look.hat === "headband") part(head, "headband", "accent");
      if (look.hat === "catEars") {
        part(head, "catEar", "hair");
        part(head, "catEar", "hair", 0, 0, 0, Math.PI); // mirrored by a half turn
      }
    }
    for (const sx of [1, -1]) {
      part(head, "eye", "eye", sx * FACE.eyeX, FACE.eyeY, FACE.eyeZ, sx * 0.3);
      if (look.blush && costume !== "ninja") part(head, "blush", "blush", sx * FACE.blushX, FACE.blushY, FACE.blushZ, sx * 0.55);
    }
    if (costume !== "ninja") part(head, "mouth", "eye", 0, FACE.mouthY, FACE.mouthZ);
    if (look.shades) part(head, "shades", "dark");
    else if (costume === "cape") part(head, "domino", "dark");
    else if (look.glasses) part(head, "glasses", "dark");
  }

  const arm = (side: 1 | -1) => {
    const sh = node(spine, 0.19 * side, TORSO_H - 0.065);
    sh.rotation.order = "ZXY";
    part(sh, "upperArm", sleeveUpper);
    const el = node(sh, 0, -LIMB.upperArm);
    el.rotation.order = "YXZ";
    part(el, "forearm", sleeveLower);
    const wr = node(el, 0, -LIMB.forearm);
    part(wr, "hand", handSlot);
    return [sh, el, wr] as const;
  };
  const leg = (side: 1 | -1) => {
    const hp = node(hips, 0.085 * side, -0.04);
    part(hp, "thigh", legUpper);
    const kn = node(hp, 0, -LIMB.thigh);
    part(kn, "shin", legLower);
    const an = node(kn, 0, -LIMB.shin);
    part(an, "foot", footSlot);
    return [hp, kn, an] as const;
  };
  const [shL, elL, wrL] = arm(1);
  const [shR, elR, wrR] = arm(-1);
  const [hpL, knL, anL] = leg(1);
  const [hpR, knR, anR] = leg(-1);

  return {
    root,
    hips,
    spine,
    neck,
    head,
    shoulder: [shL, shR],
    elbow: [elL, elR],
    wrist: [wrL, wrR],
    hip: [hpL, hpR],
    knee: [knL, knR],
    ankle: [anL, anR],
    cape: rigCape,
    parts,
  };
}

/** Attach real meshes to a rig, for individually rendered figures. */
export function dressRig(rig: Rig, palette: Palette) {
  const g = partGeometries();
  for (const { key, node, slot } of rig.parts) {
    const m = new THREE.Mesh(g[key], slotMaterial(palette[slot]));
    m.raycast = () => {};
    node.add(m);
  }
}

/** Every dance a chibi knows. Index = DanceStyle. */
export const DANCES = [
  { emoji: "👊", name: "Đấm tay" },
  { emoji: "🤗", name: "Dang tay lắc lư" },
  { emoji: "🙌", name: "Giơ tay" },
  { emoji: "🤔", name: "Chill chống cằm" },
  { emoji: "👟", name: "Shuffle" },
  { emoji: "🧵", name: "Floss" },
  { emoji: "💥", name: "Dab" },
  { emoji: "🌀", name: "Bay lắc" },
  { emoji: "🐎", name: "Cưỡi ngựa" },
  { emoji: "🐔", name: "Con gà" },
  { emoji: "🌪️", name: "Xoay vòng" },
  { emoji: "🤖", name: "Robot" },
  { emoji: "🦘", name: "Bật nhảy" },
  { emoji: "🎸", name: "Headbang guitar" },
  { emoji: "🐍", name: "Sóng tay" },
  { emoji: "🦵", name: "Ngồi đá chân" },
  { emoji: "💃", name: "Lắc hông" },
  { emoji: "💁", name: "Vẩy tóc" },
] as const;

export type DanceStyle = number;
/** Dances that suit a slow lofi groove. */
export const CHILL_DANCES: DanceStyle[] = [1, 3, 5, 14];
/** High-energy dances the whole crowd does together on a DROP. */
export const FLASHMOB_DANCES: DanceStyle[] = [12, 7, 4, 5, 15, 10, 8, 2];
export const PARTY_DANCES: DanceStyle[] = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
/** What the go-go dancers on the podiums cycle through. */
export const GOGO_DANCES: DanceStyle[] = [16, 7, 17, 14, 5, 2, 16, 4];

export interface PoseInput {
  time: number;
  phase: number; // 0..1 within the beat
  beat: number; // running beat counter
  energy: number; // 0..1, how hard to dance
  style: DanceStyle;
  seed: number;
  cheer?: number; // 0..1 raise-a-hand overlay
}

const S = Math.sin;
const PI = Math.PI;

// Robot keyframes: [shLx, shLz, elLx, shRx, shRz, elRx, headY, spineY], snapped every half beat.
const ROBOT = [
  [-1.57, 0.1, 0, 0, -0.1, -1.57, 0.6, 0.3],
  [0, 1.57, -1.57, 0, -1.57, -1.57, 0, 0],
  [0, 0.1, -1.57, -1.57, -0.1, 0, -0.6, -0.3],
  [-1.57, 0.1, -1.57, -1.57, -0.1, -1.57, 0, 0],
];

/** Procedural dance, all angles in radians. Figure faces +z; index 0 = left (+x) side. */
export function poseRig(r: Rig, p: PoseInput) {
  const { time: t, energy: e, seed } = p;
  const shifted = p.phase + seed * 0.13;
  const ph = shifted % 1;
  const B = p.beat + Math.floor(shifted);
  const bounce = Math.abs(S(ph * PI)); // 0..1 down-up each beat
  const sway = S((t + seed * 7) * 2.1);
  const up = Math.max(0, S(ph * PI * 2));
  const [shL, shR] = r.shoulder;
  const [elL, elR] = r.elbow;

  // --- reset everything, then lay down the default groove ---
  for (const i of [0, 1] as const) {
    // relaxed rest: arms slightly away from the body, elbows softly bent
    r.shoulder[i].rotation.set(0, 0, i === 0 ? 0.1 : -0.1);
    r.elbow[i].rotation.set(-0.15, 0, 0);
    r.wrist[i].rotation.set(0, 0, 0);
  }
  r.hips.position.set(0, HIP_HEIGHT, 0);
  const leg = (i: 0 | 1, hipX: number, kneeX: number, hipZ = 0.06) => {
    r.hip[i].rotation.set(hipX, 0, (i === 0 ? 1 : -1) * hipZ);
    r.knee[i].rotation.set(kneeX, 0, 0);
    r.ankle[i].rotation.set(-(hipX + kneeX) * 0.6, 0, 0);
  };
  /** Both feet planted, knees bent by `a`; drops the hips to match. */
  const squat = (a: number, hipZ = 0.06) => {
    leg(0, -a, a * 2, hipZ);
    leg(1, -a, a * 2, hipZ);
    r.ankle[0].rotation.x = r.ankle[1].rotation.x = -a;
    r.hips.position.y = HIP_HEIGHT - 2 * LIMB.thigh * (1 - Math.cos(a));
  };
  /** Arm helper that can mirror a pose to the other side. */
  const arm = (i: 0 | 1, x: number, z: number, ex: number, ey = 0, mirror = false) => {
    const side = mirror ? ((1 - i) as 0 | 1) : i;
    r.shoulder[side].rotation.set(x, 0, mirror ? -z : z);
    r.elbow[side].rotation.set(ex, mirror ? -ey : ey, 0);
  };

  squat(0.1 + bounce * (0.15 + e * 0.4));
  r.hips.rotation.set(0, sway * 0.15 * e, sway * 0.06 * e);
  r.spine.rotation.set(0.04 + bounce * 0.06 * e, sway * 0.18 * e, -sway * 0.06);
  r.head.rotation.set(-0.05 + S(ph * PI * 2) * (0.06 + 0.1 * e), sway * 0.18, sway * 0.12 * (0.4 + e));

  switch (p.style) {
    case 0: // fist pump
      shR.rotation.set(-1.4 - up * 1.2 * (0.4 + e), 0, -0.35);
      elR.rotation.set(-0.8 + up * 0.6, 0, 0);
      shL.rotation.set(-0.2 + sway * 0.25, 0, 0.35);
      elL.rotation.set(-1.0, 0, 0);
      break;
    case 1: // arms out, swaying
      shL.rotation.set(-0.2, 0, 1.1 + sway * 0.4 * (0.5 + e));
      shR.rotation.set(-0.2, 0, -1.1 + sway * 0.4 * (0.5 + e));
      elL.rotation.set(-0.7 - bounce * 0.3, 0, 0);
      elR.rotation.set(-0.7 - bounce * 0.3, 0, 0);
      break;
    case 2: {
      // hands in the air
      const w = S((t + seed) * 4) * 0.3;
      shL.rotation.set(-0.15, 0, 2.7 + w * (0.5 + e));
      shR.rotation.set(-0.15, 0, -2.7 + w * (0.5 + e));
      elL.rotation.set(-0.2 - up * 0.3, 0, 0);
      elR.rotation.set(-0.2 - up * 0.3, 0, 0);
      break;
    }
    case 3: // chill: arm across the tummy, hand on chin
      shL.rotation.set(-0.6, 0, -0.1);
      elL.rotation.set(-1.6, 1.1, 0);
      shR.rotation.set(-1.2, 0, 0.35);
      elR.rotation.set(-2.2 + up * 0.08 * e, 0, 0);
      r.head.rotation.x = 0.1 + S(ph * PI * 2) * 0.05;
      r.head.rotation.z = 0.15;
      break;
    case 4: {
      // shuffle running man + T-step heel twist
      const side = (B % 2) as 0 | 1;
      const l = S(ph * PI);
      leg(side, -0.2 - l * (0.6 + e * 0.6), 1.5 * l);
      leg((1 - side) as 0 | 1, 0.35 * l - 0.15, 0.35);
      r.hips.position.y = HIP_HEIGHT - 0.02 - 0.03 * l;
      r.hips.rotation.y = (side ? 1 : -1) * 0.4 * l;
      arm(0, side ? -0.9 * l : 0.6 * l, 0.2, -1.5);
      arm(1, side ? 0.6 * l : -0.9 * l, -0.2, -1.5);
      break;
    }
    case 5: {
      // floss: arms swing past the hips one way, hips the other
      const w = S(PI * (B + ph));
      shL.rotation.set(-0.5 * w, 0, 0.3 + 0.6 * w);
      shR.rotation.set(0.5 * w, 0, -0.3 + 0.6 * w);
      elL.rotation.set(-0.1, 0, 0);
      elR.rotation.set(-0.1, 0, 0);
      r.hips.rotation.z = -0.2 * w;
      r.hips.position.x = -0.07 * w;
      r.spine.rotation.z = 0.12 * w;
      break;
    }
    case 6: {
      // dab on every other beat, switching sides
      if (B % 2 === 0) {
        const k = Math.min(1, ph * 6);
        const mirror = B % 4 === 2;
        arm(1, -0.4 * k, -2.3 * k, 0, 0, mirror);
        arm(0, -1.5 * k, -0.9 * k, -1.6 * k, 0, mirror);
        r.head.rotation.set(0.55 * k, (mirror ? 0.6 : -0.6) * k, 0);
        r.spine.rotation.z = (mirror ? 0.15 : -0.15) * k;
      } else {
        arm(0, -0.3, 0.3, -1.2);
        arm(1, -0.3, -0.3, -1.2);
      }
      break;
    }
    case 7: // "bay lắc": hands up, wrists twisting, head shaking like crazy
      shL.rotation.set(-0.4, 0, 2.3 + 0.15 * S(t * 8));
      shR.rotation.set(-0.4, 0, -2.3 - 0.15 * S(t * 8 + 1));
      elL.rotation.set(-1.3, S(t * 14) * 0.7, 0);
      elR.rotation.set(-1.3, -S(t * 14) * 0.7, 0);
      r.wrist[0].rotation.y = S(t * 16) * 0.9;
      r.wrist[1].rotation.y = -S(t * 16) * 0.9;
      r.head.rotation.set(-0.15, S(t * 13) * 0.6 * (0.5 + e), S(t * 6.5) * 0.15);
      r.spine.rotation.z = S(t * 6) * 0.08;
      squat(0.12 + bounce * 0.45);
      break;
    case 8: {
      // horse riding: hands on the reins, hop-step, lasso every other bar
      const side = (B % 2) as 0 | 1;
      const l = S(ph * PI);
      leg(side, -0.7 * l, 1.1 * l);
      leg((1 - side) as 0 | 1, -0.2, 0.4);
      r.hips.position.y = HIP_HEIGHT - 0.02 + 0.06 * l;
      shL.rotation.set(-1.25, 0, -0.35);
      elL.rotation.set(-0.4, 0, 0);
      if (B % 8 >= 4) {
        shR.rotation.set(-0.3, 0, -2.8);
        elR.rotation.set(-0.6, t * 10, 0);
      } else {
        shR.rotation.set(-1.25, 0, 0.35);
        elR.rotation.set(-0.4, 0, 0);
      }
      break;
    }
    case 9: {
      // chicken: flap the elbows, peck with the head
      const flap = Math.abs(S(ph * PI * 2));
      shL.rotation.set(0.2, 0, 0.35 + 0.8 * flap);
      shR.rotation.set(0.2, 0, -0.35 - 0.8 * flap);
      elL.rotation.set(-2.5, 0, 0);
      elR.rotation.set(-2.5, 0, 0);
      r.spine.rotation.x = 0.25;
      r.head.rotation.set(0.4 * S(ph * PI * 4), 0, 0);
      break;
    }
    case 10: // spin like a top
      r.hips.rotation.y = t * (5 + 3 * e) + seed * 10;
      shL.rotation.set(-0.2, 0, 1.5);
      shR.rotation.set(-0.2, 0, -1.5);
      elL.rotation.set(-0.2, 0, 0);
      elR.rotation.set(-0.2, 0, 0);
      r.head.rotation.set(-0.3, 0, 0.2);
      break;
    case 11: {
      // robot: snap between keyframes on every half beat
      const k = ROBOT[(B * 2 + (ph >= 0.5 ? 1 : 0)) % 4];
      shL.rotation.set(k[0], 0, k[1]);
      elL.rotation.set(k[2], 0, 0);
      shR.rotation.set(k[3], 0, k[4]);
      elR.rotation.set(k[5], 0, 0);
      r.head.rotation.set(0, k[6], 0);
      r.spine.rotation.set(0, k[7], 0);
      squat(ph < 0.5 ? 0.05 : 0.18);
      break;
    }
    case 12: {
      // jump! every 4th beat is a star jump
      const j = Math.max(0, S(ph * PI));
      const star = B % 4 === 3;
      r.hips.position.y = HIP_HEIGHT + j * 0.35 * (0.4 + e);
      if (star) {
        leg(0, 0, 0, 0.6 * j);
        leg(1, 0, 0, 0.6 * j);
        shL.rotation.set(0, 0, 0.3 + 2.0 * j);
        shR.rotation.set(0, 0, -0.3 - 2.0 * j);
      } else {
        leg(0, -0.7 * j, 1.3 * j);
        leg(1, -0.7 * j, 1.3 * j);
        shL.rotation.set(-0.3, 0, 0.3 + 2.4 * j);
        shR.rotation.set(-0.3, 0, -0.3 - 2.4 * j);
      }
      break;
    }
    case 13: // headbang + air guitar
      r.spine.rotation.x = 0.15 + 0.45 * bounce;
      r.head.rotation.set(-0.2 + 0.6 * bounce, 0, 0);
      shL.rotation.set(-1.0, 0, -0.6);
      elL.rotation.set(-0.8, 0.6, 0);
      shR.rotation.set(-0.5 + 0.25 * S(t * 22), 0, 0.2);
      elR.rotation.set(-1.4, 0, 0);
      squat(0.2 + bounce * 0.15, 0.22);
      break;
    case 14: {
      // arm wave rippling from one hand to the other
      const w = (o: number) => S(t * 5 - o);
      shL.rotation.set(-0.1, 0, 1.5 + 0.35 * w(0));
      elL.rotation.set(0, 0, 0.7 * w(0.8));
      r.wrist[0].rotation.z = 0.6 * w(1.2);
      shR.rotation.set(-0.1, 0, -1.5 + 0.35 * w(2.4));
      elR.rotation.set(0, 0, 0.7 * w(1.6));
      r.wrist[1].rotation.z = 0.6 * w(2.0);
      r.spine.rotation.z = 0.15 * w(1.2);
      r.head.rotation.z = 0.2 * w(1.4);
      break;
    }
    case 15: {
      // deep squat, kicking legs out in turn, arms folded
      const side = (B % 2) as 0 | 1;
      const k = S(ph * PI);
      leg(side, -1.4 * k - 0.3, 0.3 * (1 - k) + 0.1);
      leg((1 - side) as 0 | 1, -1.0, 2.0);
      r.hips.position.y = HIP_HEIGHT - 2 * LIMB.thigh * (1 - Math.cos(1.0)) - 0.02 * k;
      r.spine.rotation.x = -0.1;
      shL.rotation.set(-1.45, 0, -0.25);
      shR.rotation.set(-1.45, 0, 0.25);
      elL.rotation.set(-1.3, 0, 0);
      elR.rotation.set(-1.3, 0, 0);
      break;
    }
  }
  if (p.style === 16) {
    // hip sway: hips swing side to side, one arm overhead, the other on the hip, swapping every 2 beats
    const w = S(PI * (B + ph));
    const flip = Math.floor(B / 2) % 2 === 0;
    r.hips.rotation.set(0, 0.15 * w, 0.22 * w);
    r.hips.position.x = 0.05 * w;
    r.spine.rotation.set(0.02, -0.1 * w, -0.18 * w);
    r.head.rotation.set(-0.05, 0.2 * w, 0.15 * w);
    arm(0, -0.25, 2.55 + 0.15 * S(t * 4), -0.7, 0, flip);
    arm(1, 0.25, -0.55, -1.7, 0.6, flip);
    leg(0, -0.15 - 0.15 * Math.max(0, w), 0.3 + 0.3 * Math.max(0, w));
    leg(1, -0.15 - 0.15 * Math.max(0, -w), 0.3 + 0.3 * Math.max(0, -w));
  } else if (p.style === 17) {
    // hair whip: the head rolls in circles, arms flung wide
    r.head.rotation.set(0.35 * S(t * 6), 0, 0.35 * Math.cos(t * 6));
    r.spine.rotation.set(0.2 + 0.1 * S(t * 6), 0, 0.12 * Math.cos(t * 6));
    shL.rotation.set(-0.4, 0, 1.4 + 0.4 * S(t * 3));
    shR.rotation.set(-0.4, 0, -1.4 - 0.4 * S(t * 3 + 1));
    elL.rotation.set(-0.5, 0, 0);
    elR.rotation.set(-0.5, 0, 0);
    squat(0.18 + bounce * 0.25, 0.14);
  }
  if (r.cape) {
    // the cape flutters with the groove and flies out on jumps and spins
    const fly = p.style === 10 || p.style === 12 ? 0.9 : 0;
    r.cape.rotation.set(0.12 + bounce * 0.18 * (0.4 + e) + fly + S(t * 7 + seed * 5) * 0.05, 0, S(t * 3 + seed) * 0.08);
  }
  if (p.cheer && p.cheer > 0) {
    const c = p.cheer;
    shR.rotation.x = shR.rotation.x * (1 - c) + -2.8 * c;
    shR.rotation.z = shR.rotation.z * (1 - c) + -0.35 * c;
    elR.rotation.x = elR.rotation.x * (1 - c) + -0.3 * c;
    elR.rotation.y *= 1 - c;
  }
  // real joints only bend one way: no elbows or knees folding backwards
  for (const i of [0, 1] as const) {
    r.elbow[i].rotation.x = Math.min(r.elbow[i].rotation.x, 0);
    r.knee[i].rotation.x = Math.max(r.knee[i].rotation.x, 0);
  }
}

// Cute chibi club-goers: oversized round head, little body, stubby limbs.
// One joint rig drives both the instanced NPC crowd and the individual avatars;
// every part belongs to a color slot (skin, hair, outfit…) so each figure can be dressed differently.

import * as THREE from "three";

export type PartKey =
  | "head"
  | "hair"
  | "hairBack"
  | "bun"
  | "pony"
  | "capDome"
  | "capBrim"
  | "bow"
  | "eye"
  | "blush"
  | "glasses"
  | "neck"
  | "torso"
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
export type Slot = "skin" | "hair" | "eye" | "blush" | "outfit" | "accent" | "pants" | "shoe" | "dark";

export const PART_KEYS: PartKey[] = [
  "head", "hair", "hairBack", "bun", "pony", "capDome", "capBrim", "bow", "eye", "blush", "glasses", "neck",
  "torso", "dress", "skirt", "hood", "pelvis", "upperArm", "forearm", "hand", "thigh", "shin", "foot",
];

const LIMB = { upperArm: 0.16, forearm: 0.14, thigh: 0.15, shin: 0.15 };
export const HIP_HEIGHT = 0.37;
/** Height of the top of the head, for placing name tags. */
export const FIGURE_HEIGHT = 1.42;

function ellipsoid(rx: number, ry: number, rz: number, seg = 20) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  g.scale(rx, ry, rz);
  g.computeVertexNormals();
  return g;
}

/** Rounded stub hanging down from its joint (origin at the top). */
function limb(rTop: number, rBottom: number, length: number) {
  const pts: THREE.Vector2[] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * rBottom, -length + rBottom - Math.cos(a) * rBottom));
  }
  for (let i = n; i >= 0; i--) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * rTop, -rTop + Math.cos(a) * rTop));
  }
  const g = new THREE.LatheGeometry(pts, 14);
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

let geoms: Record<PartKey, THREE.BufferGeometry> | null = null;

export function partGeometries() {
  geoms ??= {
    head: (() => {
      const g = ellipsoid(0.3, 0.28, 0.285, 24);
      g.translate(0, 0.27, 0);
      return g;
    })(),
    // A cap of hair over the top/back of the head (bald when tinted with the skin color).
    hair: (() => {
      const g = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52);
      g.scale(0.315, 0.3, 0.305);
      g.rotateX(-0.35);
      g.translate(0, 0.29, -0.02);
      g.computeVertexNormals();
      return g;
    })(),
    // long hair falling down the back
    hairBack: (() => {
      const g = ellipsoid(0.29, 0.3, 0.12, 18);
      g.translate(0, 0.13, -0.18);
      return g;
    })(),
    bun: (() => {
      const g = ellipsoid(0.11, 0.1, 0.11, 14);
      g.translate(0, 0.58, -0.06);
      return g;
    })(),
    pony: (() => {
      const g = ellipsoid(0.08, 0.17, 0.08, 12);
      g.rotateX(0.5);
      g.translate(0, 0.27, -0.34);
      return g;
    })(),
    capDome: (() => {
      const g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      g.scale(0.32, 0.3, 0.315);
      g.translate(0, 0.33, 0);
      g.computeVertexNormals();
      return g;
    })(),
    capBrim: (() => {
      const g = new THREE.CylinderGeometry(0.2, 0.2, 0.025, 20, 1, false, -Math.PI / 2, Math.PI);
      g.scale(1, 1, 1.1);
      g.translate(0, 0.35, 0.2);
      return g;
    })(),
    bow: (() => {
      const l = ellipsoid(0.07, 0.05, 0.03, 10);
      l.translate(-0.06, 0, 0);
      const r = ellipsoid(0.07, 0.05, 0.03, 10);
      r.translate(0.06, 0, 0);
      const g = mergeGeoms([l, r]);
      g.rotateZ(-0.4);
      g.translate(0.2, 0.5, 0.05);
      return g;
    })(),
    eye: ellipsoid(0.032, 0.042, 0.02, 10),
    blush: ellipsoid(0.05, 0.025, 0.012, 10),
    glasses: (() => {
      const l = new THREE.TorusGeometry(0.06, 0.014, 6, 16);
      l.translate(-0.1, 0, 0);
      const r = new THREE.TorusGeometry(0.06, 0.014, 6, 16);
      r.translate(0.1, 0, 0);
      const bridge = new THREE.BoxGeometry(0.06, 0.015, 0.015);
      const g = mergeGeoms([l, r, bridge]);
      g.translate(0, 0.26, 0.285);
      return g;
    })(),
    neck: (() => {
      const g = new THREE.CylinderGeometry(0.07, 0.08, 0.06, 12);
      g.translate(0, 0.0, 0);
      return g;
    })(),
    // Little tunic flaring toward the hem.
    torso: (() => {
      const pts = [
        new THREE.Vector2(0.0, -0.06),
        new THREE.Vector2(0.23, -0.06),
        new THREE.Vector2(0.24, 0.0),
        new THREE.Vector2(0.2, 0.2),
        new THREE.Vector2(0.17, 0.36),
        new THREE.Vector2(0.11, 0.43),
        new THREE.Vector2(0.0, 0.44),
      ];
      const g = new THREE.LatheGeometry(pts, 20);
      g.computeVertexNormals();
      return g;
    })(),
    // dress replaces the tunic and reaches the knees
    dress: (() => {
      const pts = [
        new THREE.Vector2(0.0, -0.26),
        new THREE.Vector2(0.3, -0.26),
        new THREE.Vector2(0.29, -0.2),
        new THREE.Vector2(0.21, 0.12),
        new THREE.Vector2(0.17, 0.32),
        new THREE.Vector2(0.11, 0.43),
        new THREE.Vector2(0.0, 0.44),
      ];
      const g = new THREE.LatheGeometry(pts, 20);
      g.computeVertexNormals();
      return g;
    })(),
    skirt: (() => {
      const pts = [new THREE.Vector2(0.0, -0.2), new THREE.Vector2(0.28, -0.2), new THREE.Vector2(0.26, -0.15), new THREE.Vector2(0.19, 0.06), new THREE.Vector2(0.0, 0.06)];
      const g = new THREE.LatheGeometry(pts, 20);
      g.computeVertexNormals();
      return g;
    })(),
    hood: (() => {
      const g = new THREE.TorusGeometry(0.15, 0.06, 8, 18);
      g.rotateX(Math.PI / 2 - 0.5);
      g.translate(0, 0.42, -0.08);
      return g;
    })(),
    pelvis: ellipsoid(0.16, 0.08, 0.12, 14),
    upperArm: limb(0.065, 0.058, LIMB.upperArm),
    forearm: limb(0.058, 0.055, LIMB.forearm),
    hand: (() => {
      const g = ellipsoid(0.058, 0.06, 0.058, 12);
      g.translate(0, -0.03, 0);
      return g;
    })(),
    thigh: limb(0.085, 0.075, LIMB.thigh),
    shin: limb(0.075, 0.07, LIMB.shin),
    foot: (() => {
      const g = ellipsoid(0.08, 0.05, 0.12, 14);
      g.translate(0, -0.02, 0.03);
      return g;
    })(),
  };
  return geoms;
}

/** Lambert shading plus a bit of self-glow from the albedo, so figures stay readable in a dark club. */
function cuteMaterial(color: THREE.ColorRepresentation) {
  const m = new THREE.MeshLambertMaterial({ color });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.42;",
    );
  };
  return m;
}

let instanceMat: THREE.Material | null = null;
/** White base material for instanced crowds; the per-instance color does the tinting. */
export function instancedMaterial() {
  instanceMat ??= cuteMaterial("#ffffff");
  return instanceMat;
}

const matCache = new Map<string, THREE.Material>();
function slotMaterial(color: string) {
  let m = matCache.get(color);
  if (!m) {
    m = cuteMaterial(color);
    matCache.set(color, m);
  }
  return m;
}

export type Palette = Record<Slot, string>;

export type Gender = "m" | "f";
export interface Look {
  gender: Gender;
  hair: "short" | "bald" | "long" | "bun" | "pony" | "cap";
  top: "tee" | "long" | "tank" | "hoodie" | "dress";
  bottom: "pants" | "shorts" | "skirt" | "none";
  glasses: boolean;
  bow: boolean;
  blush: boolean;
  palette: Palette;
}

const SKINS = ["#f6d2b4", "#eec09a", "#d9a37c", "#b9805a", "#fde3cc", "#8d5b3c"];
const HAIRS = ["#1d1a1f", "#1d1a1f", "#3b2618", "#6b3f22", "#e8c66a", "#ff6fb5", "#58c7ff", "#c8c8d0", "#9b5cff"];
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
  const g: Gender = gender ?? (r() < 0.5 ? "m" : "f");
  const skin = pick(SKINS);
  const hair = g === "f" ? pick(["long", "long", "bun", "pony", "short", "cap"] as const) : pick(["short", "short", "bald", "cap", "long"] as const);
  const top = g === "f" ? pick(["tee", "dress", "dress", "tank", "hoodie", "long"] as const) : pick(["tee", "tee", "long", "tank", "hoodie"] as const);
  const bottom: Look["bottom"] = top === "dress" ? "none" : g === "f" ? pick(["skirt", "pants", "shorts"] as const) : pick(["pants", "pants", "shorts"] as const);
  return {
    gender: g,
    hair,
    top,
    bottom,
    glasses: r() < 0.22,
    bow: g === "f" && (hair === "long" || hair === "pony" || hair === "bun") && r() < 0.45,
    blush: g === "f" || r() < 0.15,
    palette: {
      skin,
      hair: pick(HAIRS),
      eye: "#16121a",
      blush: "#ff8fa8",
      outfit,
      accent: pick(ACCENTS),
      pants: pick(PANTS),
      shoe: pick(SHOES),
      dark: "#141418",
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
  parts: { key: PartKey; node: THREE.Object3D; slot: Slot }[];
}

/** Builds the joint hierarchy. Figure faces +z and stands on y=0. */
export function createRig(look: Look): Rig {
  const parts: Rig["parts"] = [];
  const node = (parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const part = (parent: THREE.Object3D, key: PartKey, slot: Slot, x = 0, y = 0, z = 0) => {
    if (x || y || z) parent = node(parent, x, y, z);
    parts.push({ key, node: parent, slot });
  };
  const sleeveUpper: Slot = look.top === "tank" ? "skin" : "outfit";
  const sleeveLower: Slot = look.top === "long" || look.top === "hoodie" ? "outfit" : "skin";
  const legUpper: Slot = look.bottom === "pants" || look.bottom === "shorts" ? "pants" : "skin";
  const legLower: Slot = look.bottom === "pants" ? "pants" : "skin";

  const root = new THREE.Object3D();
  const hips = node(root, 0, HIP_HEIGHT);
  part(hips, "pelvis", look.bottom === "pants" || look.bottom === "shorts" ? "pants" : "outfit");
  if (look.bottom === "skirt") part(hips, "skirt", "accent");
  const spine = node(hips, 0, 0.03);
  spine.rotation.order = "YXZ";
  part(spine, look.top === "dress" ? "dress" : "torso", "outfit");
  if (look.top === "hoodie") part(spine, "hood", "outfit");
  const neck = node(spine, 0, 0.44);
  part(neck, "neck", "skin");
  const head = node(neck, 0, 0.0);
  part(head, "head", "skin");
  if (look.hair === "cap") {
    part(head, "capDome", "accent");
    part(head, "capBrim", "accent");
  } else if (look.hair !== "bald") part(head, "hair", "hair");
  if (look.hair === "long") part(head, "hairBack", "hair");
  if (look.hair === "bun") part(head, "bun", "hair");
  if (look.hair === "pony") part(head, "pony", "hair");
  if (look.bow) part(head, "bow", "accent");
  part(head, "eye", "eye", 0.1, 0.26, 0.27);
  part(head, "eye", "eye", -0.1, 0.26, 0.27);
  if (look.blush) {
    part(head, "blush", "blush", 0.17, 0.18, 0.245);
    part(head, "blush", "blush", -0.17, 0.18, 0.245);
  }
  if (look.glasses) part(head, "glasses", "dark");

  const arm = (side: 1 | -1) => {
    const sh = node(spine, 0.2 * side, 0.34);
    sh.rotation.order = "ZXY";
    part(sh, "upperArm", sleeveUpper);
    const el = node(sh, 0, -LIMB.upperArm);
    el.rotation.order = "YXZ";
    part(el, "forearm", sleeveLower);
    const wr = node(el, 0, -LIMB.forearm);
    part(wr, "hand", "skin");
    return [sh, el, wr] as const;
  };
  const leg = (side: 1 | -1) => {
    const hp = node(hips, 0.085 * side, -0.02);
    part(hp, "thigh", legUpper);
    const kn = node(hp, 0, -LIMB.thigh);
    part(kn, "shin", legLower);
    const an = node(kn, 0, -LIMB.shin);
    part(an, "foot", "shoe");
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

export type DanceStyle = 0 | 1 | 2 | 3;

export interface PoseInput {
  time: number;
  phase: number; // 0..1 within the beat
  energy: number; // 0..1, how hard to dance
  style: DanceStyle; // 0 pump, 1 sway, 2 hands up, 3 chill (hand on chin)
  seed: number;
  cheer?: number; // 0..1 raise-a-hand overlay
}

const S = Math.sin;

/** Procedural dance, all angles in radians. */
export function poseRig(r: Rig, p: PoseInput) {
  const { time, energy: e, seed } = p;
  const beat = p.phase + seed * 0.13;
  const bounce = Math.abs(S(beat * Math.PI)); // 0..1 down-up each beat
  const sway = S((time + seed * 7) * 2.1);

  // Stubby legs: knee bend on every beat, feet stay planted.
  const bend = 0.1 + bounce * (0.15 + e * 0.4);
  for (const i of [0, 1] as const) {
    const off = (i === 0 ? 1 : -1) * 0.05 * sway;
    r.hip[i].rotation.set(-bend - off, 0, (i === 0 ? 1 : -1) * 0.06);
    r.knee[i].rotation.set(bend * 2 + off, 0, 0);
    r.ankle[i].rotation.set(-bend, 0, 0);
  }
  r.hips.position.y = HIP_HEIGHT - 2 * LIMB.thigh * (1 - Math.cos(bend));
  r.hips.rotation.set(0, sway * 0.15 * e, sway * 0.06 * e);

  r.spine.rotation.set(0.04 + bounce * 0.06 * e, sway * 0.18 * e, -sway * 0.06);
  // Big chibi head: bob and tilt on the beat.
  r.head.rotation.set(-0.05 + S(beat * Math.PI * 2) * (0.06 + 0.1 * e), sway * 0.18, sway * 0.12 * (0.4 + e));

  const [shL, shR] = r.shoulder;
  const [elL, elR] = r.elbow;
  const up = Math.max(0, S(beat * Math.PI * 2));
  switch (p.style) {
    case 0: // fist pump with the right arm, left arm loose
      shR.rotation.set(-1.4 - up * 1.2 * (0.4 + e), 0, -0.35);
      elR.rotation.set(-0.8 + up * 0.6, 0, 0);
      shL.rotation.set(-0.2 + sway * 0.25, 0, 0.35);
      elL.rotation.set(-1.0, 0, 0);
      break;
    case 1: // arms out, swaying side to side
      shL.rotation.set(-0.2, 0, 1.1 + sway * 0.4 * (0.5 + e));
      shR.rotation.set(-0.2, 0, -1.1 + sway * 0.4 * (0.5 + e));
      elL.rotation.set(-0.7 - bounce * 0.3, 0, 0);
      elR.rotation.set(-0.7 - bounce * 0.3, 0, 0);
      break;
    case 2: {
      // hands in the air, alternating wave
      const w = S((time + seed) * 4) * 0.3;
      shL.rotation.set(-0.15, 0, 2.7 + w * (0.5 + e));
      shR.rotation.set(-0.15, 0, -2.7 + w * (0.5 + e));
      elL.rotation.set(-0.2 - up * 0.3, 0, 0);
      elR.rotation.set(-0.2 - up * 0.3, 0, 0);
      break;
    }
    case 3: // chill: one arm across the tummy, other hand on the chin
      shL.rotation.set(-0.6, 0, -0.1);
      elL.rotation.set(-1.6, 1.1, 0);
      shR.rotation.set(-1.2, 0, 0.35);
      elR.rotation.set(-2.2 + up * 0.08 * e, 0, 0);
      r.head.rotation.x = 0.1 + S(beat * Math.PI * 2) * 0.05;
      r.head.rotation.z = 0.15;
      break;
  }
  if (p.cheer && p.cheer > 0) {
    const c = p.cheer;
    shR.rotation.x = shR.rotation.x * (1 - c) + -2.8 * c;
    shR.rotation.z = shR.rotation.z * (1 - c) + -0.35 * c;
    elR.rotation.x = elR.rotation.x * (1 - c) + -0.3 * c;
    elR.rotation.y *= 1 - c;
  }
}

import { create } from "zustand";
import type { Genre } from "./audio";
import type { ActionKind } from "./content";

export interface Patron {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  lastSeen: number;
  bot?: boolean;
}

export interface Shout {
  id: string;
  uid: string;
  name: string;
  color: string;
  text: string;
  kind: "chat" | "action";
  action?: ActionKind;
  createdAt: number;
}

export interface FloatFx {
  id: string;
  emoji: string;
  x: number;
  z: number;
  born: number;
}

export interface Stats {
  dzo: number;
  drinks: number;
  quay: number;
  confetti: number;
}

interface ClubState {
  joined: boolean;
  me: { id: string; name: string; color: string };
  myPos: { x: number; z: number };
  genre: Genre;
  muted: boolean;
  hype: number; // 0..100 "độ phê"
  tipsy: number; // grows with drinks, decays slowly
  online: boolean; // Firebase connected (false = demo mode)
  patrons: Patron[];
  shouts: Shout[];
  stats: Stats;
  fx: FloatFx[];
  confettiBursts: { id: string; x: number; z: number; born: number }[];
  dropAt: number; // timestamp of the last "DROP"

  set: (p: Partial<ClubState>) => void;
  addFx: (emoji: string, x: number, z: number) => void;
  addConfetti: (x: number, z: number) => void;
  bumpHype: (n: number) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useClub = create<ClubState>((set, get) => ({
  joined: false,
  me: { id: "local-" + uid(), name: "", color: "#ff2bd6" },
  myPos: { x: (Math.random() - 0.5) * 6, z: 1 + Math.random() * 2 },
  genre: "vinahouse",
  muted: false,
  hype: 20,
  tipsy: 0,
  online: false,
  patrons: [],
  shouts: [],
  stats: { dzo: 0, drinks: 0, quay: 0, confetti: 0 },
  fx: [],
  confettiBursts: [],
  dropAt: 0,

  set: (p) => set(p),
  addFx: (emoji, x, z) => {
    const now = performance.now();
    set({ fx: [...get().fx.filter((f) => now - f.born < 2500), { id: uid(), emoji, x, z, born: now }] });
  },
  addConfetti: (x, z) => {
    const now = performance.now();
    set({ confettiBursts: [...get().confettiBursts.filter((c) => now - c.born < 4000), { id: uid(), x, z, born: now }] });
  },
  bumpHype: (n) => {
    const hype = Math.min(100, get().hype + n);
    if (hype >= 100) {
      set({ hype: 35, dropAt: performance.now() });
    } else set({ hype });
  },
}));

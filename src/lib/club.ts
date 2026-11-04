"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { engine } from "./audio";
import { getFirebase } from "./firebase";
import { ACTIONS, AVATAR_COLORS, BOT_NAMES, BOT_SHOUTS, randomOf, type ActionKind } from "./content";
import { useClub, type Patron, type Shout, type Stats } from "./store";

const PRESENCE_TTL = 45_000;
const STAT_KEY: Partial<Record<ActionKind, keyof Stats>> = {
  beer: "drinks",
  cocktail: "drinks",
  shot: "drinks",
  dzo: "dzo",
  quay: "quay",
  confetti: "confetti",
};

let db: Firestore | null = null;
let pushPresence: (() => void) | null = null;

const LOOK_KEY = "quaybar:look";

/** New random outfit for me; others see it on the next presence write. */
export function rerollLook() {
  const s = useClub.getState();
  const look = Math.floor(Math.random() * 2 ** 31);
  s.set({ me: { ...s.me, look } });
  try {
    localStorage.setItem(LOOK_KEY, String(look));
  } catch {}
  pushPresence?.();
}
let joinedAt = 0;

// ---------------------------------------------------------------------------
// Local effects (what happens on screen + speakers for an action)
// ---------------------------------------------------------------------------
function playAction(kind: ActionKind, x: number, z: number, mine: boolean) {
  const s = useClub.getState();
  const a = ACTIONS[kind];
  s.addFx(a.emoji, x, z);
  const before = s.dropAt;
  const loud = mine ? 1 : 0.4; // others' actions raise the room's hype a bit too
  switch (kind) {
    case "beer":
    case "cocktail":
    case "shot":
      if (mine) {
        engine.sfx("gulp");
        s.set({ tipsy: s.tipsy + (kind === "shot" ? 1.6 : 1) });
      }
      s.bumpHype(4 * loud);
      break;
    case "dzo":
      if (mine) engine.sfx("clink");
      s.bumpHype(8 * loud);
      break;
    case "quay":
      s.addFx("🔥", x + 0.3, z);
      s.bumpHype(6 * loud);
      break;
    case "confetti":
      if (mine) engine.sfx("pop");
      s.addConfetti(x, z);
      s.bumpHype(10 * loud);
      break;
    case "horn":
      if (mine) engine.sfx("horn");
      s.bumpHype(12 * loud);
      break;
  }
  if (useClub.getState().dropAt !== before) {
    engine.sfx("whoosh");
    setTimeout(() => engine.sfx("horn"), 400);
  }
  if (!db) {
    const key = STAT_KEY[kind];
    if (key) useClub.setState((st) => ({ stats: { ...st.stats, [key]: st.stats[key] + 1 } }));
  }
}

// ---------------------------------------------------------------------------
// Public API used by the HUD
// ---------------------------------------------------------------------------
let lastAction = 0;
export function doAction(kind: ActionKind) {
  const now = Date.now();
  if (now - lastAction < 350) return; // spam guard
  lastAction = now;
  const s = useClub.getState();
  playAction(kind, s.myPos.x, s.myPos.z, true);
  const shout: Omit<Shout, "id" | "createdAt"> = {
    uid: s.me.id,
    name: s.me.name,
    color: s.me.color,
    text: ACTIONS[kind].verb,
    kind: "action",
    action: kind,
  };
  if (db) {
    addDoc(collection(db, "shouts"), { ...shout, createdAt: serverTimestamp() }).catch(console.warn);
    const key = STAT_KEY[kind];
    if (key) setDoc(doc(db, "stats", "global"), { [key]: increment(1) }, { merge: true }).catch(console.warn);
  } else {
    pushLocalShout(shout);
  }
}

let lastChat = 0;
export function sendShout(text: string): boolean {
  const clean = text.trim().slice(0, 100);
  const now = Date.now();
  if (!clean || now - lastChat < 1500) return false;
  lastChat = now;
  const s = useClub.getState();
  const shout = { uid: s.me.id, name: s.me.name, color: s.me.color, text: clean, kind: "chat" as const };
  s.addFx("💬", s.myPos.x, s.myPos.z);
  if (db) addDoc(collection(db, "shouts"), { ...shout, createdAt: serverTimestamp() }).catch(console.warn);
  else pushLocalShout(shout);
  return true;
}

function pushLocalShout(sh: Omit<Shout, "id" | "createdAt">) {
  const full: Shout = { ...sh, id: Math.random().toString(36).slice(2), createdAt: Date.now() };
  useClub.setState((st) => ({ shouts: [full, ...st.shouts].slice(0, 30) }));
}

// ---------------------------------------------------------------------------
// Firebase realtime sync
// ---------------------------------------------------------------------------
function startFirebase(): () => void {
  const fb = getFirebase()!;
  db = fb.db;
  const unsubs: (() => void)[] = [];
  let rawPresence: Patron[] = [];
  let myUid: string | null = null;
  let lastSent = { x: NaN, z: NaN, t: 0 };

  const refreshPatrons = () => {
    const now = Date.now();
    useClub.getState().set({ patrons: rawPresence.filter((p) => now - p.lastSeen < PRESENCE_TTL) });
  };

  const writePresence = (force = false) => {
    if (!myUid || !db) return;
    const s = useClub.getState();
    const moved = Math.hypot(s.myPos.x - lastSent.x, s.myPos.z - lastSent.z) > 0.15;
    if (!force && !moved) return;
    lastSent = { x: s.myPos.x, z: s.myPos.z, t: Date.now() };
    setDoc(doc(db, "presence", myUid), {
      name: s.me.name,
      color: s.me.color,
      look: s.me.look,
      gender: s.me.gender,
      x: Math.round(s.myPos.x * 100) / 100,
      z: Math.round(s.myPos.z * 100) / 100,
      lastSeen: serverTimestamp(),
    }).catch(console.warn);
  };

  const unAuth = onAuthStateChanged(fb.auth, (user) => {
    if (!user) {
      signInAnonymously(fb.auth).catch((e) => {
        console.warn("Anonymous sign-in failed, staying in demo mode", e);
        useClub.getState().set({ online: false });
      });
      return;
    }
    myUid = user.uid;
    const s = useClub.getState();
    s.set({ me: { ...s.me, id: user.uid }, online: true });
    writePresence(true);

    unsubs.push(
      onSnapshot(query(collection(db!, "presence"), orderBy("lastSeen", "desc"), limit(60)), (snap) => {
        rawPresence = snap.docs.map((d) => {
          const v = d.data({ serverTimestamps: "estimate" });
          return {
            id: d.id,
            name: String(v.name ?? "Ẩn danh"),
            color: String(v.color ?? "#ffffff"),
            x: Number(v.x ?? 0),
            z: Number(v.z ?? 0),
            lastSeen: v.lastSeen?.toMillis?.() ?? Date.now(),
            look: typeof v.look === "number" ? v.look : undefined,
            gender: v.gender === "f" || v.gender === "m" ? v.gender : undefined,
          };
        });
        refreshPatrons();
      }),
    );

    unsubs.push(
      onSnapshot(query(collection(db!, "shouts"), orderBy("createdAt", "desc"), limit(30)), (snap) => {
        const shouts: Shout[] = snap.docs.map((d) => {
          const v = d.data({ serverTimestamps: "estimate" });
          return {
            id: d.id,
            uid: String(v.uid),
            name: String(v.name ?? "Ẩn danh"),
            color: String(v.color ?? "#fff"),
            text: String(v.text ?? ""),
            kind: v.kind === "action" ? "action" : "chat",
            action: v.action as ActionKind | undefined,
            createdAt: v.createdAt?.toMillis?.() ?? Date.now(),
          };
        });
        // Replay other people's fresh actions as effects above their avatar.
        for (const ch of snap.docChanges()) {
          if (ch.type !== "added" || ch.doc.metadata.hasPendingWrites) continue;
          const sh = shouts.find((x) => x.id === ch.doc.id);
          if (!sh || sh.uid === myUid || sh.createdAt < joinedAt || sh.kind !== "action" || !sh.action || !(sh.action in ACTIONS)) continue;
          const p = rawPresence.find((x) => x.id === sh.uid);
          playAction(sh.action, p?.x ?? 0, p?.z ?? 2, false);
        }
        useClub.getState().set({ shouts });
      }),
    );

    unsubs.push(
      onSnapshot(doc(db!, "stats", "global"), (d) => {
        const v = d.data() ?? {};
        useClub.getState().set({
          stats: { dzo: v.dzo ?? 0, drinks: v.drinks ?? 0, quay: v.quay ?? 0, confetti: v.confetti ?? 0 },
        });
      }),
    );
  });
  unsubs.push(unAuth);

  pushPresence = () => writePresence(true);
  const moveTimer = setInterval(() => writePresence(false), 1000);
  const heartbeat = setInterval(() => {
    writePresence(true);
    refreshPatrons();
  }, 15_000);
  const leave = () => {
    if (myUid && db) deleteDoc(doc(db, "presence", myUid)).catch(() => {});
  };
  window.addEventListener("pagehide", leave);

  return () => {
    clearInterval(moveTimer);
    clearInterval(heartbeat);
    window.removeEventListener("pagehide", leave);
    leave();
    pushPresence = null;
    unsubs.forEach((u) => u());
    db = null;
  };
}

// ---------------------------------------------------------------------------
// Offline demo mode: a few bots wander, drink and shout so it still feels alive
// ---------------------------------------------------------------------------
function startDemo(): () => void {
  const bots: Patron[] = BOT_NAMES.map((name, i) => ({
    id: "bot-" + i,
    name,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    x: (Math.random() - 0.5) * 8,
    z: Math.random() * 6 - 1,
    lastSeen: Date.now(),
    bot: true,
    look: Math.floor(Math.random() * 2 ** 31),
    gender: (i % 2 === 0 ? "m" : "f") as "m" | "f",
  }));
  useClub.getState().set({ patrons: bots, online: false });

  const wander = setInterval(() => {
    const moved = useClub.getState().patrons.map((b) =>
      Math.random() < 0.35
        ? { ...b, x: Math.max(-6, Math.min(6, b.x + (Math.random() - 0.5) * 3)), z: Math.max(-2, Math.min(6.5, b.z + (Math.random() - 0.5) * 3)) }
        : b,
    );
    useClub.getState().set({ patrons: moved });
  }, 2500);

  const chatter = setInterval(() => {
    const b = randomOf(useClub.getState().patrons);
    if (!b) return;
    if (Math.random() < 0.6) {
      const kind = randomOf(Object.keys(ACTIONS) as ActionKind[]);
      playAction(kind, b.x, b.z, false);
      pushLocalShout({ uid: b.id, name: b.name, color: b.color, text: ACTIONS[kind].verb, kind: "action", action: kind });
    } else {
      pushLocalShout({ uid: b.id, name: b.name, color: b.color, text: randomOf(BOT_SHOUTS), kind: "chat" });
    }
  }, 4200);

  return () => {
    clearInterval(wander);
    clearInterval(chatter);
  };
}

/** Mount once after the user enters the bar. */
export function useClubSync(active: boolean) {
  useEffect(() => {
    if (!active) return;
    joinedAt = Date.now();
    const stop = getFirebase() ? startFirebase() : startDemo();

    // Hype slowly cools down, drinks slowly wear off.
    const decay = setInterval(() => {
      const s = useClub.getState();
      s.set({ hype: Math.max(10, s.hype - 1.2), tipsy: Math.max(0, s.tipsy - 0.08) });
    }, 1000);
    return () => {
      stop();
      clearInterval(decay);
    };
  }, [active]);
}

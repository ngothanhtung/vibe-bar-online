"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { engine } from "@/lib/audio";
import { useClubSync } from "@/lib/club";
import { useClub } from "@/lib/store";
import { DEFAULT_YOUTUBE_ID } from "@/lib/youtube";
import EntryGate from "./EntryGate";
import Hud from "./Hud";
import { playYouTube } from "./YouTubeDj";

// three.js needs `window`, so the canvas is client-only.
const ClubScene = dynamic(() => import("./scene/ClubScene"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 grid place-items-center text-sm opacity-60">Đang mở cửa bar…</div>,
});

export default function ClubApp() {
  const [joined, setJoined] = useState(false);
  useClubSync(joined);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <ClubScene />
      {joined ? (
        <Hud />
      ) : (
        <EntryGate
          onEnter={async (name, color, gender, look) => {
            const s = useClub.getState();
            s.set({ me: { ...s.me, name, color, gender, look: look ?? s.me.look }, joined: true });
            try {
              localStorage.setItem("quaybar:look", String(look ?? s.me.look)); // keep the same outfit next visit
            } catch {}
            await engine.start(); // must run inside the click to unlock audio
            engine.sfx("horn");
            playYouTube(DEFAULT_YOUTUBE_ID);
            setJoined(true);
          }}
        />
      )}
    </main>
  );
}

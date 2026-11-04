"use client";

import { useState } from "react";
import { engine } from "@/lib/audio";
import { useClub } from "@/lib/store";
import { parseYouTubeId, ytAudio } from "@/lib/youtube";

/** Switch the club from the built-in synth to a YouTube track (audio only). */
export function playYouTube(id: string) {
  const { set, bpm } = useClub.getState();
  engine.useExternal(bpm);
  set({ yt: { id, title: "Đang tải…", status: "loading" } });
  ytAudio
    .play(id, {
      onPlaying: (title) => set({ yt: { id, title, status: "playing" } }),
      onPaused: () => {
        const yt = useClub.getState().yt;
        if (yt) set({ yt: { ...yt, status: "paused" } });
      },
      onEnded: () => stopYouTube(),
      onError: (error) => set({ yt: { id, title: "", status: "error", error } }),
    })
    .catch((e: Error) => set({ yt: { id, title: "", status: "error", error: e.message } }));
}

/** Back to the built-in DJ. */
export function stopYouTube() {
  ytAudio.stop();
  engine.useInternal();
  useClub.getState().set({ yt: null });
}

/** Paste-a-link box shown under the DJ panel. */
export function YouTubeLinkForm({ onDone }: { onDone: () => void }) {
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  return (
    <form
      className="glass pointer-events-auto flex w-full max-w-xl flex-col gap-1 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const id = parseYouTubeId(link);
        if (!id) {
          setErr("Link chưa đúng. Dán link dạng youtube.com/watch?v=… hoặc youtu.be/…");
          return;
        }
        playYouTube(id);
        setLink("");
        setErr("");
        onDone();
      }}
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Dán link YouTube vào đây… (chỉ phát nhạc)"
          aria-label="Link YouTube"
          className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-red-500"
        />
        <button type="submit" className="rounded-lg bg-red-600 px-4 text-sm font-bold hover:bg-red-500">
          ▶ Phát
        </button>
      </div>
      {err && <div className="px-1 text-xs text-amber-300">{err}</div>}
    </form>
  );
}

/** Shows the current YouTube track title. */
export function NowPlaying() {
  const yt = useClub((s) => s.yt);
  if (!yt) return null;

  if (yt.status === "error") {
    return (
      <div className="glass pointer-events-auto flex max-w-xl items-center gap-2 border-red-500/50 px-3 py-2 text-xs">
        <span>⚠️ {yt.error}</span>
        <button className="chip" onClick={stopYouTube}>
          Về DJ
        </button>
      </div>
    );
  }

  return (
    <div className="glass pointer-events-auto max-w-full truncate px-3 py-1.5 text-xs font-medium" title={yt.title}>
      {yt.title}
    </div>
  );
}

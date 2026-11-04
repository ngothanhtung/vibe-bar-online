"use client";

import { useRef, useState } from "react";
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

/** Now-playing bar: title, pause, tempo for the light show, and a way back to the DJ. */
export function NowPlaying() {
  const yt = useClub((s) => s.yt);
  const bpm = useClub((s) => s.bpm);
  const set = useClub((s) => s.set);
  const taps = useRef<number[]>([]);
  if (!yt) return null;

  const setBpm = (v: number, align = false) => {
    const b = Math.round(Math.max(60, Math.min(200, v)));
    engine.setExternalBpm(b, align);
    set({ bpm: b });
  };

  const tap = () => {
    const now = performance.now();
    const t = taps.current.filter((x) => now - x < 2500);
    t.push(now);
    taps.current = t.slice(-6);
    if (t.length >= 3) {
      const gaps = t.slice(1).map((x, i) => x - t[i]);
      setBpm(60_000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length), true);
    }
  };

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
    <div className="glass pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto px-2 py-1.5 text-xs">
      <span className="text-red-500">▶</span>
      <span className="max-w-[40vw] truncate font-medium sm:max-w-xs" title={yt.title}>
        {yt.title}
      </span>
      <button
        className="chip"
        aria-label={yt.status === "paused" ? "Phát tiếp" : "Tạm dừng"}
        disabled={yt.status === "loading"}
        onClick={() => (yt.status === "paused" ? ytAudio.resume() : ytAudio.pause())}
      >
        {yt.status === "paused" ? "▶" : "⏸"}
      </button>
      <span className="ml-1 opacity-60">BPM</span>
      <button className="chip" aria-label="Giảm BPM" onClick={() => setBpm(bpm - 2)}>
        −
      </button>
      <span className="w-7 text-center font-display">{bpm}</span>
      <button className="chip" aria-label="Tăng BPM" onClick={() => setBpm(bpm + 2)}>
        +
      </button>
      <button className="chip" title="Gõ theo nhịp nhạc 4 lần để đèn bắt nhịp" onClick={tap}>
        👆 Tap nhịp
      </button>
      <button className="chip" aria-label="Tắt YouTube, về DJ" onClick={stopYouTube}>
        ✕
      </button>
    </div>
  );
}

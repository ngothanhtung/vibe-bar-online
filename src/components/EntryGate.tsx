"use client";

import { useEffect, useState } from "react";
import { AVATAR_COLORS } from "@/lib/content";

const NAME_KEY = "quaybar:name";
const COLOR_KEY = "quaybar:color";

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function EntryGate({ onEnter }: { onEnter: (name: string, color: string) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [adult, setAdult] = useState(false);

  useEffect(() => {
    // Restore the last name/color after hydration (localStorage is browser-only).
    const n = load(NAME_KEY);
    const c = load(COLOR_KEY);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (n) setName(n);
    if (c && AVATAR_COLORS.includes(c)) setColor(c);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const valid = name.trim().length > 0 && adult;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]">
      <form
        className="gate-card w-full max-w-md p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const n = name.trim().slice(0, 24);
          try {
            localStorage.setItem(NAME_KEY, n);
            localStorage.setItem(COLOR_KEY, color);
          } catch {}
          onEnter(n, color);
        }}
      >
        <p className="text-center text-xs uppercase tracking-[0.35em] text-cyan-300/80">Đi chùa online thì có rồi…</p>
        <h1 className="neon-title mt-2 text-center text-5xl sm:text-6xl">QUẨY BAR</h1>
        <p className="mt-1 text-center font-display text-lg text-fuchsia-300">ONLINE</p>
        <p className="mt-4 text-center text-sm opacity-80">
          Gọi bia, cụng ly, bắn pháo giấy, xin quẻ đêm nay — quẩy cùng cả nước mà không cần ra khỏi nhà.
        </p>

        <label className="mt-6 block text-xs uppercase tracking-widest opacity-70" htmlFor="nick">
          Nickname dân chơi
        </label>
        <input
          id="nick"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="VD: Tùng Tùng Chát"
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-fuchsia-400"
        />

        <div className="mt-4 text-xs uppercase tracking-widest opacity-70">Màu outfit</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`Chọn màu ${c}`}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full transition ${color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-black" : "opacity-70"}`}
              style={{ background: c, boxShadow: `0 0 14px ${c}` }}
            />
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="h-4 w-4 accent-fuchsia-500" />
          Tôi đã đủ 18 tuổi (bảo vệ check CCCD ảo 🪪)
        </label>

        <button type="submit" disabled={!valid} className="btn-primary mt-6 w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-40">
          VÀO BAR 🎧
        </button>
        <p className="mt-3 text-center text-[11px] opacity-50">Nên đeo tai nghe · Nhạc được tổng hợp trực tiếp bằng Web Audio</p>
      </form>
    </div>
  );
}

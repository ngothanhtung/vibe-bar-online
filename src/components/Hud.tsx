"use client";

import { useEffect, useState } from "react";
import { engine, GENRES, type Genre } from "@/lib/audio";
import { doAction, rerollLook, sendShout, setDance } from "@/lib/club";
import { DANCES } from "./scene/chibi";
import { ACTIONS, DRUNK_LINES, FORTUNES, randomOf, type ActionKind } from "@/lib/content";
import { useClub } from "@/lib/store";
import { ytAudio } from "@/lib/youtube";
import { NowPlaying, stopYouTube, YouTubeLinkForm } from "./YouTubeDj";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const ORDER: ActionKind[] = ["beer", "cocktail", "shot", "dzo", "quay", "confetti", "horn"];

function TopBar() {
  const online = useClub((s) => s.online);
  const count = useClub((s) => s.patrons.length);
  const stats = useClub((s) => s.stats);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto">
        <h1 className="neon-title text-2xl sm:text-3xl">QUẨY BAR</h1>
        <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${online ? "bg-lime-400 animate-pulse" : "bg-amber-400"}`} />
          {online ? `${fmt(count)} dân chơi đang online` : `Chế độ demo · ${count} bot đang quẩy`}
        </div>
        <button className="chip ml-2 mt-1 bg-black/50 text-xs backdrop-blur" onClick={() => rerollLook()} title="Random bộ đồ, kiểu tóc, phụ kiện mới">
          🎲 Đổi đồ
        </button>
        <button className="chip ml-1 mt-1 bg-black/50 text-xs backdrop-blur" onClick={() => rerollLook("hero")} title="Hóa thân siêu anh hùng: áo choàng, giáp, ninja">
          🦸 Siêu anh hùng
        </button>
        <PixelToggle />
      </div>
      <div className="pointer-events-auto grid grid-cols-4 gap-1.5 text-xs sm:flex sm:gap-2 sm:text-sm">
        {[
          ["🥂", stats.dzo, "lần dzô"],
          ["🍺", stats.drinks, "ly đã cạn"],
          ["🕺", stats.quay, "lượt quẩy"],
          ["🎉", stats.confetti, "pháo giấy"],
        ].map(([e, n, l]) => (
          <div key={l as string} className="glass px-2 py-1 text-center sm:px-3 sm:py-1.5">
            <div className="font-display text-sm sm:text-lg">
              {e} {fmt(n as number)}
            </div>
            <div className="hidden text-[10px] uppercase tracking-wider opacity-60 sm:block">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PixelToggle() {
  const pixelArt = useClub((s) => s.pixelArt);
  const set = useClub((s) => s.set);
  return (
    <button
      className={`chip ml-1 mt-1 text-xs backdrop-blur ${pixelArt ? "chip-on" : "bg-black/50"}`}
      onClick={() => set({ pixelArt: !pixelArt })}
      aria-pressed={pixelArt}
      title="Bật/tắt đồ họa pixel art"
    >
      👾 Pixel
    </button>
  );
}

function DjPanel() {
  const genre = useClub((s) => s.genre);
  const muted = useClub((s) => s.muted);
  const camFocus = useClub((s) => s.camFocus);
  const yt = useClub((s) => s.yt);
  const set = useClub((s) => s.set);
  const [linkOpen, setLinkOpen] = useState(false);
  const pick = (g: Genre) => {
    if (useClub.getState().yt) stopYouTube();
    engine.setGenre(g);
    engine.sfx("whoosh");
    set({ genre: g });
  };
  return (
    <>
      {linkOpen && <YouTubeLinkForm onDone={() => setLinkOpen(false)} />}
      <NowPlaying />
      <div className="glass pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto p-1.5 text-xs">
        <span className="px-2 opacity-70">DJ ơi:</span>
        {(Object.keys(GENRES) as Genre[]).map((g) => (
          <button key={g} onClick={() => pick(g)} className={`chip ${!yt && genre === g ? "chip-on" : ""}`}>
            {GENRES[g].emoji} {GENRES[g].label}
          </button>
        ))}
        <button
          onClick={() => setLinkOpen((o) => !o)}
          className={`chip ${yt ? "chip-yt" : ""}`}
          aria-expanded={linkOpen}
          title="Dán link YouTube để phát nhạc"
        >
          <span className="text-red-500">▶</span> YouTube
        </button>
        <button
          className={`chip ${camFocus === "stage" ? "chip-on" : ""}`}
          onClick={() => set({ camFocus: camFocus === "stage" ? "floor" : "stage" })}
          title="Đưa camera lên sát sân khấu DJ"
        >
          {camFocus === "stage" ? "🕺 Về sàn" : "🎧 Xem DJ"}
        </button>
        <button
          className="chip"
          aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
          onClick={() => {
            engine.setVolume(muted ? 0.8 : 0);
            ytAudio.setVolume(muted ? 0.8 : 0);
            set({ muted: !muted });
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </>
  );
}

function HypeMeter() {
  const hype = useClub((s) => s.hype);
  const tipsy = useClub((s) => s.tipsy);
  return (
    <div className="pointer-events-none fixed left-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 sm:flex">
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Độ phê</div>
      <div className="relative h-56 w-4 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-300"
          style={{ height: `${hype}%`, background: "linear-gradient(to top,#00e5ff,#ff2bd6,#ffe600)" }}
        />
      </div>
      <div className="font-display text-sm">{Math.round(hype)}%</div>
      <div className="mt-3 text-center text-[10px] uppercase tracking-widest opacity-80">
        Độ say
        <div className="mt-1 text-lg">{tipsy < 1 ? "😎" : tipsy < 3 ? "🙂" : tipsy < 6 ? "🥴" : "🫠"}</div>
      </div>
    </div>
  );
}

function Feed() {
  const shouts = useClub((s) => s.shouts);
  return (
    <div className="pointer-events-none fixed right-3 top-28 z-10 hidden w-72 flex-col gap-1.5 md:flex">
      {shouts.slice(0, 9).map((s, i) => (
        <div
          key={s.id}
          className="feed-item rounded-xl bg-black/45 px-3 py-1.5 text-sm backdrop-blur"
          style={{ opacity: 1 - i * 0.09 }}
        >
          <b style={{ color: s.color }}>{s.name}</b>{" "}
          {s.kind === "action" ? <i className="opacity-80">{s.text} {s.action ? ACTIONS[s.action]?.emoji : ""}</i> : <span>: {s.text}</span>}
        </div>
      ))}
    </div>
  );
}

function FortuneModal({ onClose }: { onClose: () => void }) {
  const [f] = useState(() => randomOf(FORTUNES));
  const [no] = useState(() => 1 + Math.floor(Math.random() * 99));
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="fortune-card max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl">🔮</div>
        <div className="mt-2 text-xs uppercase tracking-[0.3em] opacity-70">Quẻ số {no} · đêm nay</div>
        <div className="font-display mt-2 text-2xl text-amber-300">{f.rank}</div>
        <p className="mt-3 text-base leading-relaxed">{f.text}</p>
        <button className="btn-primary mt-5 w-full" onClick={onClose}>
          Nhận quẻ, quẩy tiếp 🕺
        </button>
      </div>
    </div>
  );
}

/** Grid of every dance; the pick shows on your avatar and is synced to everyone. */
function DancePicker({ onClose }: { onClose: () => void }) {
  const dance = useClub((s) => s.me.dance);
  const choose = (d: number) => {
    setDance(d);
    onClose();
  };
  return (
    <div className="glass pointer-events-auto w-full max-w-xl p-2">
      <div className="mb-1.5 flex items-center justify-between px-1 text-xs">
        <span className="opacity-70">Chọn điệu nhảy · DROP thì cả bar đồng diễn</span>
        <button className="chip" onClick={onClose} aria-label="Đóng">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        <button onClick={() => choose(-1)} className={`dance-chip ${dance < 0 ? "chip-on" : ""}`}>
          <span className="text-xl">🎲</span>
          <span>Tự động</span>
        </button>
        {DANCES.map((d, i) => (
          <button key={d.name} onClick={() => choose(i)} className={`dance-chip ${dance === i ? "chip-on" : ""}`}>
            <span className="text-xl">{d.emoji}</span>
            <span>{d.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionBar({ onFortune }: { onFortune: () => void }) {
  const [text, setText] = useState("");
  const [dancesOpen, setDancesOpen] = useState(false);
  const dance = useClub((s) => s.me.dance);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3 sm:p-4">
      {dancesOpen && <DancePicker onClose={() => setDancesOpen(false)} />}
      <DjPanel />
      <div className="pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto pb-1">
        {ORDER.map((k) => (
          <button key={k} className="action-btn" onClick={() => doAction(k)} title={ACTIONS[k].label}>
            <span className="text-2xl sm:text-3xl">{ACTIONS[k].emoji}</span>
            <span className="text-[10px] sm:text-xs">{ACTIONS[k].label}</span>
          </button>
        ))}
        <button className="action-btn" onClick={() => setDancesOpen((o) => !o)} aria-expanded={dancesOpen} title="Chọn điệu nhảy">
          <span className="text-2xl sm:text-3xl">{dance >= 0 ? DANCES[dance].emoji : "💃"}</span>
          <span className="text-[10px] sm:text-xs">Điệu nhảy</span>
        </button>
        <button className="action-btn action-gold" onClick={onFortune}>
          <span className="text-2xl sm:text-3xl">🔮</span>
          <span className="text-[10px] sm:text-xs">Xin quẻ</span>
        </button>
      </div>
      <form
        className="pointer-events-auto flex w-full max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (sendShout(text)) setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100}
          placeholder="Hét gì đó lên màn hình LED... 📣"
          className="glass flex-1 px-4 py-2.5 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-fuchsia-500"
        />
        <button className="btn-primary px-5" type="submit">
          Hét!
        </button>
      </form>
    </div>
  );
}

function Overlays() {
  const dropAt = useClub((s) => s.dropAt);
  const tipsy = useClub((s) => s.tipsy);
  const [doneDrop, setDoneDrop] = useState(0);
  const [dismissedAt, setDismissedAt] = useState(-1);
  const showDrop = dropAt > 0 && doneDrop !== dropAt;

  useEffect(() => {
    if (!dropAt) return;
    const t = setTimeout(() => setDoneDrop(dropAt), 2600);
    return () => clearTimeout(t);
  }, [dropAt]);

  const warnLevel = Math.floor(tipsy / 4);
  const showWarn = tipsy >= 4 && warnLevel !== dismissedAt;

  return (
    <>
      {showDrop && (
        <div className="drop-flash pointer-events-none fixed inset-0 z-30 grid place-items-center">
          <div className="neon-title drop-text text-6xl sm:text-8xl">DROP!!!</div>
        </div>
      )}
      {showWarn && (
        <div className="fixed inset-x-0 top-24 z-30 flex justify-center px-3">
          <div className="glass pointer-events-auto flex max-w-md items-center gap-3 border-amber-400/60 px-4 py-3 text-sm">
            <span className="text-2xl">🚕</span>
            <div>
              <b>{DRUNK_LINES[Math.min(warnLevel - 1, DRUNK_LINES.length - 1)]}</b>
              <div className="opacity-80">Đã uống rượu bia thì không lái xe. Nhớ đặt xe về nhà nha!</div>
            </div>
            <button className="chip" onClick={() => setDismissedAt(warnLevel)}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Hud() {
  const [fortune, setFortune] = useState(false);
  return (
    <>
      <TopBar />
      <HypeMeter />
      <Feed />
      <ActionBar
        onFortune={() => {
          engine.sfx("whoosh");
          setFortune(true);
        }}
      />
      <Overlays />
      {fortune && <FortuneModal onClose={() => setFortune(false)} />}
      <div className="pointer-events-none fixed bottom-1 right-2 z-10 hidden text-[10px] opacity-40 lg:block">
        WASD / chạm sàn để đi · kéo để xoay camera · cuộn để zoom
      </div>
    </>
  );
}

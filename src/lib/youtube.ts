"use client";

// Audio-only YouTube playback: the IFrame Player lives in an invisible 1x1 box,
// so the user hears the track while the 3D club stays on screen.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Accepts youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, /live/, music.youtube.com or a bare 11-char id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
    if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

let apiPromise: Promise<any> | null = null;

export function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => {
      apiPromise = null;
      reject(new Error("Không tải được YouTube API"));
    };
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export interface YtCallbacks {
  onPlaying: (title: string) => void;
  onPaused: () => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

const ERRORS: Record<number, string> = {
  2: "Link YouTube không hợp lệ",
  5: "Video này không phát được trên web",
  100: "Video không tồn tại hoặc đã bị gỡ",
  101: "Chủ video không cho phát ngoài YouTube",
  150: "Chủ video không cho phát ngoài YouTube",
};

class YouTubeAudio {
  private player: any = null;
  private host: HTMLDivElement | null = null;
  private cb: YtCallbacks | null = null;
  private volume = 80;

  async play(videoId: string, cb: YtCallbacks) {
    this.cb = cb;
    const YT = await loadYouTubeApi();
    if (this.player) {
      this.player.loadVideoById(videoId);
      return;
    }
    this.host = document.createElement("div");
    // Invisible but still "rendered" so browsers don't throttle playback.
    Object.assign(this.host.style, {
      position: "fixed",
      left: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
    });
    const mount = document.createElement("div");
    this.host.appendChild(mount);
    document.body.appendChild(this.host);

    this.player = new YT.Player(mount, {
      width: 1,
      height: 1,
      videoId,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: (e: any) => {
          e.target.setVolume(this.volume);
          e.target.playVideo();
        },
        onStateChange: (e: any) => {
          const S = YT.PlayerState;
          if (e.data === S.PLAYING) this.cb?.onPlaying(e.target.getVideoData?.().title || "YouTube");
          else if (e.data === S.PAUSED) this.cb?.onPaused();
          else if (e.data === S.ENDED) this.cb?.onEnded();
        },
        onError: (e: any) => this.cb?.onError(ERRORS[e.data] ?? "Không phát được video này"),
      },
    });
  }

  pause() {
    this.player?.pauseVideo?.();
  }

  resume() {
    this.player?.playVideo?.();
  }

  setVolume(v: number) {
    this.volume = Math.round(v * 100);
    this.player?.setVolume?.(this.volume);
  }

  stop() {
    this.player?.destroy?.();
    this.player = null;
    this.host?.remove();
    this.host = null;
  }
}

export const ytAudio = new YouTubeAudio();

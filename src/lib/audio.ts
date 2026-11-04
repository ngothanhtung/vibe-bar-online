// Procedural club music engine built on the Web Audio API.
// No audio files: every kick, bass and lead is synthesized live, so there are
// no licensing issues and the visuals can sync to the exact scheduled beats.

export type Genre = "vinahouse" | "edm" | "chill";

export const GENRES: Record<Genre, { label: string; bpm: number; emoji: string }> = {
  vinahouse: { label: "Vinahouse", bpm: 138, emoji: "🔥" },
  edm: { label: "EDM Bigroom", bpm: 128, emoji: "⚡" },
  chill: { label: "Lofi Chill", bpm: 84, emoji: "🌙" },
};

// A minor progression (Am - F - C - G), as MIDI roots for the bass.
const PROGRESSION = [57, 53, 48, 55];
// Chord tones (semitones over root) for the lead/arp.
const CHORDS = [
  [0, 3, 7, 12],
  [0, 4, 7, 12],
  [0, 4, 7, 12],
  [0, 4, 7, 11],
];

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class BeatEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private analyser!: AnalyserNode;
  private noise!: AudioBuffer;
  private freqData!: Uint8Array<ArrayBuffer>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0; // 16th-note counter
  private kickTimes: number[] = [];
  genre: Genre = "vinahouse";
  playing = false;

  async start() {
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") await ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setVolume(v: number) {
    if (this.master) this.master.gain.value = v;
  }

  setGenre(g: Genre) {
    this.genre = g;
    // Restart the bar so the new groove lands on the one.
    this.step = 0;
    if (this.ctx) this.nextNoteTime = this.ctx.currentTime + 0.05;
  }

  private init() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.musicBus = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.75;
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    this.musicBus.connect(comp);
    comp.connect(this.analyser);
    this.analyser.connect(this.master);
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // ---------- scheduler ----------
  private schedule() {
    const ctx = this.ctx!;
    const spb = 60 / GENRES[this.genre].bpm / 4; // seconds per 16th
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextNoteTime, spb);
      let t = spb;
      // Lofi swing: delay every off-16th a little.
      if (this.genre === "chill") t = this.step % 2 === 0 ? spb * 1.16 : spb * 0.84;
      this.nextNoteTime += t;
      this.step++;
    }
  }

  private playStep(step: number, t: number, spb: number) {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const chordIdx = bar % 4;
    const root = PROGRESSION[chordIdx];
    const phrase = bar % 16; // 16-bar phrase, last bar = build/fill

    if (this.genre === "vinahouse") {
      if (s % 4 === 0) this.kick(t, 1);
      // signature offbeat "tung tung" bass
      if (s % 4 === 2) this.bass(t, midiToFreq(root - 12), spb * 1.6, "sawtooth", 900);
      if (s % 4 === 3) this.bass(t, midiToFreq(root), spb * 0.8, "square", 1400, 0.12);
      if (s % 2 === 1) this.hat(t, s % 4 === 2 ? 0.16 : 0.07, 0.04);
      if (s === 4 || s === 12) this.clap(t, 0.5);
      // pluck arp riding on top
      if (s % 2 === 0) {
        const notes = CHORDS[chordIdx];
        const n = notes[(s / 2 + bar) % notes.length];
        this.pluck(t, midiToFreq(root + 12 + n), spb * 1.5, 0.07);
      }
      if (phrase === 15 && s >= 8) this.clap(t, 0.25 + (s - 8) * 0.06); // snare roll
    } else if (this.genre === "edm") {
      if (s % 4 === 0) this.kick(t, 1.1);
      if (s === 4 || s === 12) this.clap(t, 0.6);
      if (s % 4 === 2) this.hat(t, 0.18, 0.06);
      if (s % 4 === 2) this.bass(t, midiToFreq(root - 12), spb * 2, "sawtooth", 600, 0.22);
      // supersaw stabs on the offbeat
      if (s % 4 === 2 || s === 15) {
        for (const n of CHORDS[chordIdx].slice(0, 3)) this.stab(t, midiToFreq(root + 12 + n), spb * 1.2);
      }
      if (phrase === 15) this.clap(t, 0.15 + s * 0.03);
    } else {
      // lofi chill
      if (s === 0 || s === 7 || s === 10) this.kick(t, 0.7);
      if (s === 4 || s === 12) this.clap(t, 0.25);
      if (s % 2 === 0) this.hat(t, 0.04, 0.03);
      if (s === 0) {
        for (const n of CHORDS[chordIdx]) this.pad(t, midiToFreq(root + n), spb * 15);
        this.bass(t, midiToFreq(root - 12), spb * 6, "triangle", 500, 0.3);
      }
      if (s === 8) this.bass(t, midiToFreq(root - 12 + 7), spb * 4, "triangle", 500, 0.22);
    }
  }

  // ---------- instruments ----------
  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  private kick(t: number, amp: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = this.env(t, amp, 0.002, 0.35);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.4);
    this.kickTimes.push(t);
    if (this.kickTimes.length > 16) this.kickTimes.shift();
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, amp: number, decay: number, out: AudioNode = this.musicBus) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.env(t, amp, 0.001, decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  }

  private hat(t: number, amp: number, decay: number) {
    this.noiseHit(t, "highpass", 8000, amp, decay);
  }

  private clap(t: number, amp: number) {
    this.noiseHit(t, "bandpass", 1600, amp, 0.16);
  }

  private bass(t: number, f: number, dur: number, type: OscillatorType, cutoff: number, amp = 0.25) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(cutoff * 2, t);
    lp.frequency.exponentialRampToValueAtTime(cutoff * 0.5, t + dur);
    const g = this.env(t, amp, 0.005, dur);
    o.connect(lp).connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pluck(t: number, f: number, dur: number, amp: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(4000, t);
    lp.frequency.exponentialRampToValueAtTime(400, t + dur);
    const g = this.env(t, amp, 0.003, dur);
    o.connect(lp).connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private stab(t: number, f: number, dur: number) {
    const ctx = this.ctx!;
    for (const detune of [-14, 0, 14]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = detune;
      const g = this.env(t, 0.035, 0.005, dur);
      o.connect(g).connect(this.musicBus);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private pad(t: number, f: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // ---------- sound effects for user actions ----------
  sfx(kind: "clink" | "horn" | "pop" | "gulp" | "whoosh") {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    if (kind === "clink") {
      for (const [f, a] of [[2637, 0.12], [3520, 0.08], [5274, 0.04]] as const) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const g = this.env(t, a, 0.001, 0.6);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 0.7);
      }
    } else if (kind === "horn") {
      // "toot toot tooooot"
      const pattern: [number, number][] = [[0, 0.12], [0.18, 0.12], [0.36, 0.55]];
      for (const [off, len] of pattern) {
        for (const f of [466, 587, 698]) {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(f * 0.97, t + off);
          o.frequency.linearRampToValueAtTime(f, t + off + 0.05);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t + off);
          g.gain.exponentialRampToValueAtTime(0.06, t + off + 0.02);
          g.gain.setValueAtTime(0.06, t + off + len - 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, t + off + len);
          o.connect(g).connect(this.master);
          o.start(t + off);
          o.stop(t + off + len + 0.02);
        }
      }
    } else if (kind === "pop") {
      this.noiseHit(t, "bandpass", 900, 0.5, 0.12, this.master);
      this.noiseHit(t + 0.03, "highpass", 5000, 0.2, 0.3, this.master);
    } else if (kind === "gulp") {
      for (const [off, f] of [[0, 220], [0.14, 180]] as const) {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f * 1.6, t + off);
        o.frequency.exponentialRampToValueAtTime(f, t + off + 0.08);
        const g = this.env(t + off, 0.25, 0.005, 0.1);
        o.connect(g).connect(this.master);
        o.start(t + off);
        o.stop(t + off + 0.15);
      }
    } else if (kind === "whoosh") {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 3;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(6000, t + 0.9);
      const g = this.env(t, 0.4, 0.5, 0.4);
      src.connect(f).connect(g).connect(this.master);
      src.start(t);
      src.stop(t + 1);
    }
  }

  // ---------- analysis for visuals ----------
  /** 0..1, spikes on every scheduled kick and decays quickly. */
  kickEnvelope() {
    if (!this.ctx || !this.playing) return 0;
    const now = this.ctx.currentTime;
    let last = -Infinity;
    for (const k of this.kickTimes) if (k <= now && k > last) last = k;
    if (last === -Infinity) return 0;
    return Math.exp(-(now - last) * 7);
  }

  /** Beat phase 0..1 within the current quarter note. */
  beatPhase() {
    if (!this.ctx || !this.playing) return (performance.now() / 500) % 1;
    const spb = 60 / GENRES[this.genre].bpm;
    return (this.ctx.currentTime / spb) % 1;
  }

  levels() {
    if (!this.ctx) return { bass: 0, mid: 0, high: 0 };
    this.analyser.getByteFrequencyData(this.freqData);
    const d = this.freqData;
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += d[i];
      return s / (b - a) / 255;
    };
    return { bass: avg(1, 6), mid: avg(6, 40), high: avg(40, 110) };
  }
}

export const engine = new BeatEngine();

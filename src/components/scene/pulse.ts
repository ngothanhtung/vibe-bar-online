// Per-frame audio snapshot shared by every 3D component.
// Mutated in place by <AudioPulse/> so readers never trigger React renders.
export const pulse = {
  time: 0,
  kick: 0,
  bass: 0,
  mid: 0,
  high: 0,
  phase: 0,
  hype: 0.2, // 0..1
  drop: 0, // 1 right after a DROP, decays to 0
};

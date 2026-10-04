// Deterministic noise, so a re-run of the simulator produces the same day.

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: a small, fast PRNG; returns a value in [0, 1).
function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function noise(key: string): number {
  return mulberry32(hashString(key));
}

// Multiplicative jitter around 1, e.g. spread 0.15 gives 0.85..1.15.
export function jitter(key: string, spread: number): number {
  return 1 + (noise(key) * 2 - 1) * spread;
}

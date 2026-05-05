/**
 * Tiny seeded PRNG (mulberry32). When SEED is provided the simulator becomes
 * deterministic, which is invaluable for screenshots, demos, and tests.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a 0..1 generator. If `seed` is undefined or non-finite, fall back
 * to Math.random.
 */
export function makeRandom(seed: number | undefined): () => number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return mulberry32(seed);
  }
  return Math.random;
}

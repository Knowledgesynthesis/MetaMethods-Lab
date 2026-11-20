/** Seeded pseudo-random generation for reproducible simulations (mulberry32). */

export function rng(seed: number) {
  let a = seed >>> 0
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  let spare: number | null = null
  const normal = (mean = 0, sd = 1) => {
    if (spare !== null) {
      const s = spare
      spare = null
      return mean + sd * s
    }
    let u = 0
    let v = 0
    while (u === 0) u = uniform()
    while (v === 0) v = uniform()
    const r = Math.sqrt(-2 * Math.log(u))
    spare = r * Math.sin(2 * Math.PI * v)
    return mean + sd * r * Math.cos(2 * Math.PI * v)
  }
  const binomial = (n: number, p: number) => {
    if (n > 200) {
      const x = Math.round(normal(n * p, Math.sqrt(n * p * (1 - p))))
      return Math.min(n, Math.max(0, x))
    }
    let x = 0
    for (let i = 0; i < n; i++) if (uniform() < p) x++
    return x
  }
  const int = (lo: number, hi: number) => lo + Math.floor(uniform() * (hi - lo + 1))
  return { uniform, normal, binomial, int }
}

export type Rng = ReturnType<typeof rng>

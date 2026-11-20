/**
 * Bayesian normal–normal hierarchical model
 *   y_i | θ_i ~ N(θ_i, v_i),  θ_i | μ, τ ~ N(μ, τ²),  μ ~ N(m0, s0²) (or flat),  τ ~ p(τ)
 * solved semi-analytically: μ is integrated out in closed form and τ by dense quadrature
 * (the approach of Röver 2020, bayesmeta). No MCMC, so results are deterministic.
 * Verified against bayesmeta::bayesmeta().
 */
import { pnormFast as pnorm } from './distributions'

export type TauPrior =
  | { kind: 'halfnormal'; scale: number }
  | { kind: 'halfcauchy'; scale: number }
  | { kind: 'uniform'; max: number }

export interface BayesOptions {
  tauPrior: TauPrior
  /** null → improper flat prior on μ */
  muPrior: { mean: number; sd: number } | null
  gridSize?: number
}

export interface BayesResult {
  mu: { mean: number; median: number; ci: [number, number]; sd: number }
  tau: { median: number; ci: [number, number]; mode: number }
  theta: { median: number; ci: [number, number] }
  pMuBelow: (x: number) => number
  muDensity: { x: number; y: number }[]
  tauDensity: { x: number; y: number; prior: number }[]
  predDensity: { x: number; y: number }[]
}

export function tauPriorDensity(p: TauPrior, t: number): number {
  if (t < 0) return 0
  switch (p.kind) {
    case 'halfnormal':
      return (Math.sqrt(2 / Math.PI) / p.scale) * Math.exp((-0.5 * t * t) / (p.scale * p.scale))
    case 'halfcauchy':
      return 2 / (Math.PI * p.scale * (1 + (t / p.scale) ** 2))
    case 'uniform':
      return t <= p.max ? 1 / p.max : 0
  }
}

function quantileFromCDF(cdf: (x: number) => number, q: number, lo: number, hi: number) {
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi)
    if (cdf(mid) < q) lo = mid
    else hi = mid
    if (hi - lo < 1e-10) break
  }
  return 0.5 * (lo + hi)
}

export function bayesMeta(yi: number[], vi: number[], opts: BayesOptions): BayesResult {
  const G = opts.gridSize ?? 900
  const range = Math.max(...yi) - Math.min(...yi)
  const maxSE = Math.sqrt(Math.max(...vi))
  const priorUpper =
    opts.tauPrior.kind === 'uniform'
      ? opts.tauPrior.max
      : opts.tauPrior.kind === 'halfnormal'
        ? 6 * opts.tauPrior.scale
        : 60 * opts.tauPrior.scale
  const tMax = Math.min(priorUpper, Math.max(5 * range, 10 * maxSE, 1e-3) + (opts.tauPrior.kind === 'uniform' ? 0 : 3 * range))
  const taus: number[] = []
  // denser grid near zero
  for (let g = 0; g < G; g++) taus.push(tMax * (g / (G - 1)) ** 1.5)

  const m0 = opts.muPrior?.mean ?? 0
  const s0 = opts.muPrior?.sd ?? Infinity
  const comps = taus.map((t) => {
    const w = vi.map((v) => 1 / (v + t * t))
    const sw = w.reduce((a, b) => a + b, 0)
    let logLik: number
    let P: number
    let m: number
    const sumLog = vi.reduce((a, v) => a + Math.log(v + t * t), 0)
    if (Number.isFinite(s0)) {
      const r = yi.map((y) => y - m0)
      const swr = r.reduce((a, ri, i) => a + w[i] * ri, 0)
      const swr2 = r.reduce((a, ri, i) => a + w[i] * ri * ri, 0)
      const s02 = s0 * s0
      logLik = -0.5 * sumLog - 0.5 * Math.log(1 + s02 * sw) - 0.5 * (swr2 - (s02 * swr * swr) / (1 + s02 * sw))
      P = 1 / s02 + sw
      m = (m0 / s02 + yi.reduce((a, y, i) => a + w[i] * y, 0)) / P
    } else {
      const mhat = yi.reduce((a, y, i) => a + w[i] * y, 0) / sw
      const Q = yi.reduce((a, y, i) => a + w[i] * (y - mhat) ** 2, 0)
      logLik = -0.5 * sumLog - 0.5 * Math.log(sw) - 0.5 * Q
      P = sw
      m = mhat
    }
    const lp = Math.log(Math.max(1e-300, tauPriorDensity(opts.tauPrior, t)))
    return { t, logPost: logLik + lp, m, sd: 1 / Math.sqrt(P), prior: tauPriorDensity(opts.tauPrior, t) }
  })
  // normalise with trapezoid weights on the non-uniform grid
  const mx = Math.max(...comps.map((c) => c.logPost))
  const dens = comps.map((c) => Math.exp(c.logPost - mx))
  const trap = taus.map((_, g) => {
    const left = g > 0 ? taus[g] - taus[g - 1] : 0
    const right = g < G - 1 ? taus[g + 1] - taus[g] : 0
    return 0.5 * (left + right)
  })
  const Z = dens.reduce((a, d, g) => a + d * trap[g], 0)
  const post = dens.map((d) => d / Z)
  const mass = post.map((d, g) => d * trap[g])

  // mixture components with non-negligible posterior mass (speeds up CDF evaluations)
  const live = comps.map((c, g) => ({ c, w: mass[g], sp: Math.sqrt(c.sd ** 2 + c.t ** 2) })).filter((x) => x.w > 1e-12)
  const liveW = live.reduce((a, x) => a + x.w, 0)
  const muCDF = (x: number) => live.reduce((a, l) => a + l.w * pnorm((x - l.c.m) / l.c.sd), 0) / liveW
  const predCDF = (x: number) => live.reduce((a, l) => a + l.w * pnorm((x - l.c.m) / l.sp), 0) / liveW
  const muMean = comps.reduce((a, c, g) => a + mass[g] * c.m, 0)
  const muVar = comps.reduce((a, c, g) => a + mass[g] * (c.sd ** 2 + c.m ** 2), 0) - muMean ** 2
  const lo = Math.min(...yi) - 10 * maxSE - 5 * tMax
  const hi = Math.max(...yi) + 10 * maxSE + 5 * tMax
  const q = (cdf: (x: number) => number, p: number) => quantileFromCDF(cdf, p, lo, hi)

  // τ posterior CDF on the grid
  const cum: number[] = []
  mass.reduce((a, m, g) => ((cum[g] = a + m), a + m), 0)
  const tauQ = (p: number) => {
    const g = cum.findIndex((c) => c >= p)
    if (g <= 0) return taus[0]
    const f = (p - cum[g - 1]) / (cum[g] - cum[g - 1])
    return taus[g - 1] + f * (taus[g] - taus[g - 1])
  }
  const modeIdx = post.indexOf(Math.max(...post))

  const muSD = Math.sqrt(Math.max(0, muVar))
  const xs = Array.from({ length: 200 }, (_, i) => muMean - 5 * muSD + (10 * muSD * i) / 199)
  const normPdf = (x: number, m: number, s: number) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI))
  const muDensity = xs.map((x) => ({ x, y: comps.reduce((a, c, g) => a + mass[g] * normPdf(x, c.m, c.sd), 0) }))
  const pm = q(predCDF, 0.5)
  const pl = q(predCDF, 0.025)
  const ph = q(predCDF, 0.975)
  const pxs = Array.from({ length: 200 }, (_, i) => pl - (ph - pl) * 0.4 + ((ph - pl) * 1.8 * i) / 199)
  const predDensity = pxs.map((x) => ({
    x,
    y: comps.reduce((a, c, g) => a + mass[g] * normPdf(x, c.m, Math.sqrt(c.sd ** 2 + c.t ** 2)), 0),
  }))
  const tauUpper = tauQ(0.999)
  const tauDensity = taus
    .map((t, g) => ({ x: t, y: post[g], prior: comps[g].prior }))
    .filter((d) => d.x <= Math.max(tauUpper * 1.2, 1e-3))

  return {
    mu: { mean: muMean, median: q(muCDF, 0.5), ci: [q(muCDF, 0.025), q(muCDF, 0.975)], sd: muSD },
    tau: { median: tauQ(0.5), ci: [tauQ(0.025), tauQ(0.975)], mode: taus[modeIdx] },
    theta: { median: pm, ci: [pl, ph] },
    pMuBelow: muCDF,
    muDensity,
    tauDensity,
    predDensity,
  }
}

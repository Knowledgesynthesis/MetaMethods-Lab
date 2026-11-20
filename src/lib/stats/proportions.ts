/**
 * Meta-analysis of single proportions.
 *
 * Transformation approaches (then inverse-variance pooling): raw (PR), logit (PLO),
 * arcsine square-root (PAS) and Freeman–Tukey double arcsine (PFT, with Miller's 1978 inversion
 * using the harmonic mean sample size — the back-transformation shown to be seriously misleading
 * by Schwarzer et al. 2019). The one-stage alternative is a random-intercept logistic regression
 * (binomial–normal GLMM; Stijnen et al. 2010), fitted here by maximum likelihood with adaptive
 * Gauss–Hermite quadrature. Verified against metafor::escalc/rma and metafor::rma.glmm.
 */
import { clopperPearson, expit, qnorm } from './distributions'
import { metaAnalysis, type MetaOptions, type MetaResult, typicalVariance } from './pairwise'
import { hessian, nelderMead } from './optimize'
import { inverse } from './linalg'

export type PropTransform = 'PR' | 'PLO' | 'PAS' | 'PFT'

export interface ProportionStudy {
  x: number
  n: number
}

export function transformProportion(s: ProportionStudy, t: PropTransform): { yi: number; vi: number; corrected: boolean } {
  const { x, n } = s
  const edge = x === 0 || x === n
  switch (t) {
    case 'PR': {
      // metafor convention: 0.5 added to events and non-events when x = 0 or x = n
      const add = edge ? 0.5 : 0
      const p = (x + add) / (n + 2 * add)
      return { yi: p, vi: (p * (1 - p)) / (n + 2 * add), corrected: edge }
    }
    case 'PLO': {
      const add = edge ? 0.5 : 0
      return { yi: Math.log((x + add) / (n - x + add)), vi: 1 / (x + add) + 1 / (n - x + add), corrected: edge }
    }
    case 'PAS':
      return { yi: Math.asin(Math.sqrt(x / n)), vi: 1 / (4 * n), corrected: false }
    case 'PFT':
      return {
        yi: 0.5 * (Math.asin(Math.sqrt(x / (n + 1))) + Math.asin(Math.sqrt((x + 1) / (n + 1)))),
        vi: 1 / (4 * n + 2),
        corrected: false,
      }
  }
}

/** Freeman–Tukey value for x events out of n (half-sum convention as in metafor). */
export const pft = (x: number, n: number) => 0.5 * (Math.asin(Math.sqrt(x / (n + 1))) + Math.asin(Math.sqrt((x + 1) / (n + 1))))

/** Miller (1978) inversion of the Freeman–Tukey transformation for sample size n. */
export function inversePFT(t: number, n: number): number {
  if (t > pft(n, n)) return 1
  if (t < pft(0, n)) return 0
  const s = Math.sin(2 * t)
  const inner = 1 - (s + (s - 1 / s) / n) ** 2
  const val = 0.5 * (1 - Math.sign(Math.cos(2 * t)) * Math.sqrt(Math.max(0, inner)))
  return Number.isFinite(val) ? val : NaN
}

export const harmonicMean = (ns: number[]) => ns.length / ns.reduce((s, n) => s + 1 / n, 0)

export function backTransform(value: number, t: PropTransform, nHarmonic: number): number {
  switch (t) {
    case 'PR':
      return value
    case 'PLO':
      return expit(value)
    case 'PAS': {
      const v = Math.min(Math.PI / 2, Math.max(0, value))
      return Math.sin(v) ** 2
    }
    case 'PFT':
      return inversePFT(value, nHarmonic)
  }
}

export interface ProportionPoolResult {
  method: PropTransform | 'GLMM'
  /** pooled proportion (back-transformed) */
  estimate: number
  ci: [number, number]
  pi: [number, number] | null
  /** scale of analysis */
  analysisEstimate: number
  analysisSE: number
  tau2: number
  I2: number | null
  k: number
  excluded: number
  meta?: MetaResult
  notes: string[]
}

export function poolTransformed(studies: ProportionStudy[], t: PropTransform, opts: MetaOptions = {}): ProportionPoolResult {
  const notes: string[] = []
  const use = studies
  const excluded = 0
  const edges = studies.filter((s) => s.x === 0 || s.x === s.n).length
  if (edges > 0 && (t === 'PR' || t === 'PLO'))
    notes.push(
      t === 'PR'
        ? `${edges} stud${edges === 1 ? 'y is' : 'ies are'} at 0% or 100%: without a correction the raw variance p(1−p)/n would be 0 (infinite weight); 0.5 was added to events and non-events.`
        : `${edges} stud${edges === 1 ? 'y is' : 'ies are'} at 0% or 100%: logit undefined, 0.5 added to events and non-events.`,
    )
  const tr = use.map((s) => transformProportion(s, t))
  const m = metaAnalysis(
    tr.map((r) => r.yi),
    tr.map((r) => r.vi),
    opts,
  )
  const nh = harmonicMean(use.map((s) => s.n))
  const bt = (v: number) => backTransform(v, t, nh)
  const est = bt(m.estimate)
  if (t === 'PR' && (m.ci[0] < 0 || m.ci[1] > 1)) notes.push('Raw-scale CI extends outside [0, 1].')
  if (t === 'PFT') notes.push(`Back-transformed with the harmonic-mean sample size n = ${nh.toFixed(1)} (Miller 1978).`)
  return {
    method: t,
    estimate: est,
    ci: [bt(m.ci[0]), bt(m.ci[1])],
    pi: m.pi ? [bt(m.pi[0]), bt(m.pi[1])] : null,
    analysisEstimate: m.estimate,
    analysisSE: m.se,
    tau2: m.tau2,
    I2: m.I2,
    k: use.length,
    excluded,
    meta: m,
    notes,
  }
}

// ------------------------------------------------------------------ GLMM (binomial–normal)

/** Gauss–Hermite nodes and weights (physicists' convention), Golub–Welsch-free Newton iteration. */
export function gaussHermite(n: number): { x: number[]; w: number[] } {
  const x = new Array(n).fill(0)
  const w = new Array(n).fill(0)
  const m = Math.floor((n + 1) / 2)
  let z = 0
  for (let i = 0; i < m; i++) {
    if (i === 0) z = Math.sqrt(2 * n + 1) - 1.85575 * (2 * n + 1) ** -0.16667
    else if (i === 1) z -= (1.14 * n ** 0.426) / z
    else if (i === 2) z = 1.86 * z - 0.86 * x[0]
    else if (i === 3) z = 1.91 * z - 0.91 * x[1]
    else z = 2 * z - x[i - 2]
    let pp = 0
    for (let it = 0; it < 100; it++) {
      let p1 = Math.PI ** -0.25
      let p2 = 0
      for (let j = 1; j <= n; j++) {
        const p3 = p2
        p2 = p1
        p1 = z * Math.sqrt(2 / j) * p2 - Math.sqrt((j - 1) / j) * p3
      }
      pp = Math.sqrt(2 * n) * p2
      const z1 = z
      z = z1 - p1 / pp
      if (Math.abs(z - z1) < 1e-14) break
    }
    x[i] = z
    x[n - 1 - i] = -z
    w[i] = 2 / (pp * pp)
    w[n - 1 - i] = w[i]
  }
  return { x, w }
}

const GH = gaussHermite(21)
const LOG_SQRT_2PI = 0.5 * Math.log(2 * Math.PI)

function log1pexp(x: number) {
  return x > 35 ? x : Math.log1p(Math.exp(x))
}

/** Marginal log-likelihood of one study (binomial coefficient omitted). */
function studyLogLik(x: number, n: number, mu: number, tau: number): number {
  if (tau < 1e-8) return x * mu - n * log1pexp(mu)
  const h = (z: number) => x * (mu + tau * z) - n * log1pexp(mu + tau * z) - 0.5 * z * z - LOG_SQRT_2PI
  // mode of the integrand (Newton)
  let z = 0
  for (let it = 0; it < 50; it++) {
    const p = expit(mu + tau * z)
    const g = tau * (x - n * p) - z
    const H = -tau * tau * n * p * (1 - p) - 1
    const step = g / H
    z -= step
    if (Math.abs(step) < 1e-12) break
  }
  const p = expit(mu + tau * z)
  const sigma = 1 / Math.sqrt(tau * tau * n * p * (1 - p) + 1)
  const terms = GH.x.map((t, j) => Math.log(GH.w[j]) + t * t + h(z + Math.SQRT2 * sigma * t))
  const mx = Math.max(...terms)
  return Math.log(Math.SQRT2 * sigma) + mx + Math.log(terms.reduce((s, v) => s + Math.exp(v - mx), 0))
}

export function glmmLogLik(studies: ProportionStudy[], mu: number, tau: number) {
  return studies.reduce((s, st) => s + studyLogLik(st.x, st.n, mu, tau), 0)
}

export function poolGLMM(studies: ProportionStudy[], level = 0.95): ProportionPoolResult {
  const z = qnorm(1 - (1 - level) / 2)
  const sx = studies.reduce((s, r) => s + r.x, 0)
  const sn = studies.reduce((s, r) => s + r.n, 0)
  const notes: string[] = []
  // boundary (τ = 0) solution
  const mu0 = Math.log((sx + 1e-9) / (sn - sx + 1e-9))
  const ll0 = glmmLogLik(studies, mu0, 0)
  // interior optimum over (μ, log τ)
  const plo = studies.map((s) => transformProportion(s, 'PLO'))
  const start = [mu0, Math.log(0.5)]
  const nll = (p: number[]) => -glmmLogLik(studies, p[0], Math.exp(Math.max(-15, Math.min(4, p[1]))))
  const opt = nelderMead(nll, start, { tol: 1e-12, maxIter: 6000 })
  let mu = opt.x[0]
  let tau = Math.exp(Math.max(-15, Math.min(4, opt.x[1])))
  let ll = -opt.fx
  if (ll0 >= ll - 1e-8 || tau < 1e-4) {
    mu = mu0
    tau = 0
    ll = ll0
  }
  // SE of μ from the observed information (full Hessian in (μ, τ)) as in lme4
  let se: number
  if (tau > 0) {
    const f = (p: number[]) => -glmmLogLik(studies, p[0], p[1])
    const H = hessian(f, [mu, tau], 1e-4)
    se = Math.sqrt(inverse(H)[0][0])
  } else {
    const p = expit(mu)
    se = 1 / Math.sqrt(sn * p * (1 - p))
    notes.push('Between-study variance estimated at 0 (boundary).')
  }
  const tau2 = tau * tau
  const s2 = studies.length > 1 ? typicalVariance(plo.map((r) => r.vi)) : NaN
  const ci: [number, number] = [mu - z * se, mu + z * se]
  const piHalf = z * Math.sqrt(tau2 + se * se)
  return {
    method: 'GLMM',
    estimate: expit(mu),
    ci: [expit(ci[0]), expit(ci[1])],
    pi: [expit(mu - piHalf), expit(mu + piHalf)],
    analysisEstimate: mu,
    analysisSE: se,
    tau2,
    I2: Number.isFinite(s2) ? (100 * tau2) / (tau2 + s2) : null,
    k: studies.length,
    excluded: 0,
    notes,
  }
}

export function studyProportionCIs(studies: ProportionStudy[], level = 0.95) {
  return studies.map((s) => ({ p: s.x / s.n, ci: clopperPearson(s.x, s.n, level) }))
}

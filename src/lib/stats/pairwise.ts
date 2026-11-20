/**
 * Inverse-variance pairwise meta-analysis.
 *
 * Implements the methods offered in RevMan since 2024 and described in the Cochrane Handbook
 * v6.5.1 (2026), §10.10.4: REML (default) or DerSimonian–Laird τ², Paule–Mandel and ML as
 * alternatives; Wald-type or Hartung–Knapp–Sidik–Jonkman (HKSJ) confidence intervals; prediction
 * intervals M ± c·√(τ² + SE(M)²) with c = t(k−1) under HKSJ and z under Wald; Q-profile CI for τ².
 * Results are verified against metafor::rma() in __tests__/pairwise.test.ts.
 */
import { brent } from './optimize'
import { pchisqUpper, pFromT, pFromZ, qchisq, qnorm, qt } from './distributions'

export type Tau2Method = 'REML' | 'DL' | 'PM' | 'ML'
export type CIMethod = 'wald' | 'hksj'
export type ModelType = 'common' | 'random'
export type PIMethod = 'cochrane' | 'higgins2009'

export interface MetaOptions {
  model?: ModelType
  tau2Method?: Tau2Method
  ciMethod?: CIMethod
  /** Truncate the HKSJ scaling factor at 1 (Röver et al. 2015 "ad hoc" modification). */
  hksjAdhoc?: boolean
  piMethod?: PIMethod
  level?: number
}

export interface MetaResult {
  k: number
  model: ModelType
  tau2Method: Tau2Method
  ciMethod: CIMethod
  level: number
  estimate: number
  se: number
  ci: [number, number]
  stat: number
  df: number | null
  pval: number
  pi: [number, number] | null
  common: { estimate: number; se: number; ci: [number, number]; pval: number }
  random: { estimate: number; se: number; ci: [number, number]; pval: number }
  tau2: number
  tau: number
  tau2CI: [number, number] | null
  I2: number
  I2CI: [number, number] | null
  H2: number
  Q: number
  Qdf: number
  Qp: number
  /** 'typical' within-study variance (Higgins & Thompson 2002) */
  s2: number
  hksjFactor: number | null
  weights: number[]
  weightsCommon: number[]
  weightsRandom: number[]
  yi: number[]
  vi: number[]
  studyCI: [number, number][]
  notes: string[]
}

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)

function wmean(y: number[], w: number[]) {
  const sw = sum(w)
  return sum(y.map((yi, i) => yi * w[i])) / sw
}

/** Generalised Q statistic at a given τ². */
export function generalizedQ(yi: number[], vi: number[], tau2: number): number {
  const w = vi.map((v) => 1 / (v + tau2))
  const mu = wmean(yi, w)
  return sum(yi.map((y, i) => w[i] * (y - mu) ** 2))
}

export function tau2DL(yi: number[], vi: number[]): number {
  const k = yi.length
  if (k < 2) return 0
  const w = vi.map((v) => 1 / v)
  const sw = sum(w)
  const Q = generalizedQ(yi, vi, 0)
  const C = sw - sum(w.map((x) => x * x)) / sw
  return Math.max(0, (Q - (k - 1)) / C)
}

function tau2Iterative(yi: number[], vi: number[], kind: 'REML' | 'ML'): number {
  const k = yi.length
  if (k < 2) return 0
  let tau2 = Math.max(tau2DL(yi, vi), 0.01 * Math.min(...vi))
  for (let iter = 0; iter < 1000; iter++) {
    const w = vi.map((v) => 1 / (v + tau2))
    const sw = sum(w)
    const mu = wmean(yi, w)
    const w2 = w.map((x) => x * x)
    const sw2 = sum(w2)
    const res2w2 = sum(yi.map((y, i) => w2[i] * (y - mu) ** 2))
    let adj: number
    if (kind === 'REML') {
      const trP = sw - sw2 / sw
      const trPP = sw2 - (2 * sum(w.map((x) => x ** 3))) / sw + (sw2 * sw2) / (sw * sw)
      adj = (res2w2 - trP) / trPP
    } else {
      adj = (res2w2 - sw) / sw2
    }
    while (tau2 + adj < 0) adj /= 2
    tau2 += adj
    if (Math.abs(adj) < 1e-12) break
  }
  return tau2 < 1e-10 ? 0 : tau2
}

export function tau2PM(yi: number[], vi: number[]): number {
  const k = yi.length
  if (k < 2) return 0
  const target = k - 1
  if (generalizedQ(yi, vi, 0) <= target) return 0
  let hi = Math.max(1, tau2DL(yi, vi) * 4)
  while (generalizedQ(yi, vi, hi) > target) hi *= 4
  return brent((t) => generalizedQ(yi, vi, t) - target, 0, hi)
}

export function estimateTau2(yi: number[], vi: number[], method: Tau2Method): number {
  switch (method) {
    case 'DL':
      return tau2DL(yi, vi)
    case 'PM':
      return tau2PM(yi, vi)
    case 'ML':
      return tau2Iterative(yi, vi, 'ML')
    default:
      return tau2Iterative(yi, vi, 'REML')
  }
}

/** 'Typical' within-study variance s² = (k−1)Σw / ((Σw)² − Σw²). */
export function typicalVariance(vi: number[]): number {
  const w = vi.map((v) => 1 / v)
  const sw = sum(w)
  return ((vi.length - 1) * sw) / (sw * sw - sum(w.map((x) => x * x)))
}

/** Q-profile confidence interval for τ² (Viechtbauer 2007). */
export function tau2QProfile(yi: number[], vi: number[], level = 0.95): [number, number] | null {
  const k = yi.length
  if (k < 2) return null
  const df = k - 1
  const alpha = 1 - level
  const critHi = qchisq(1 - alpha / 2, df)
  const critLo = qchisq(alpha / 2, df)
  const q0 = generalizedQ(yi, vi, 0)
  const solve = (crit: number) => {
    if (q0 <= crit) return 0
    let hi = 1
    while (generalizedQ(yi, vi, hi) > crit) hi *= 4
    return brent((t) => generalizedQ(yi, vi, t) - crit, 0, hi)
  }
  return [solve(critHi), solve(critLo)]
}

export function metaAnalysis(yi: number[], vi: number[], opts: MetaOptions = {}): MetaResult {
  const model = opts.model ?? 'random'
  const tau2Method = opts.tau2Method ?? 'REML'
  const level = opts.level ?? 0.95
  const k = yi.length
  if (k === 0) throw new Error('No studies')
  if (vi.some((v) => !(v > 0))) throw new Error('All sampling variances must be positive')
  const ciMethodRequested = opts.ciMethod ?? 'wald'
  const z = qnorm(1 - (1 - level) / 2)
  const notes: string[] = []

  // Common-effect (fixed-effect) inverse-variance
  const wC = vi.map((v) => 1 / v)
  const swC = sum(wC)
  const muC = wmean(yi, wC)
  const seC = Math.sqrt(1 / swC)
  const Q = sum(yi.map((y, i) => wC[i] * (y - muC) ** 2))
  const Qdf = k - 1
  const Qp = k > 1 ? pchisqUpper(Q, Qdf) : NaN

  const tau2 = k > 1 ? estimateTau2(yi, vi, tau2Method) : 0
  const s2 = k > 1 ? typicalVariance(vi) : NaN
  const I2 = k > 1 ? (100 * tau2) / (tau2 + s2) : 0
  const H2 = k > 1 ? (tau2 + s2) / s2 : 1
  const tau2CI = k > 2 ? tau2QProfile(yi, vi, level) : null
  const I2CI: [number, number] | null = tau2CI
    ? [(100 * tau2CI[0]) / (tau2CI[0] + s2), (100 * tau2CI[1]) / (tau2CI[1] + s2)]
    : null

  // Random-effects
  const wR = vi.map((v) => 1 / (v + tau2))
  const swR = sum(wR)
  const muR = wmean(yi, wR)
  const seRWald = Math.sqrt(1 / swR)

  const ciMethod: CIMethod = k < 2 ? 'wald' : ciMethodRequested
  let seR = seRWald
  let multR = z
  let df: number | null = null
  let hksjFactor: number | null = null
  if (ciMethod === 'hksj') {
    let q = sum(yi.map((y, i) => wR[i] * (y - muR) ** 2)) / (k - 1)
    if (opts.hksjAdhoc && q < 1) q = 1
    hksjFactor = q
    seR = Math.sqrt(q / swR)
    df = k - 1
    multR = qt(1 - (1 - level) / 2, df)
    if (k === 2) notes.push('HKSJ with two studies typically gives an extremely wide interval (t with 1 df).')
    if (tau2 === 0) notes.push('τ² = 0: HKSJ can be overly narrow here; Cochrane recommends the Wald-type CI when τ² = 0.')
  }
  const statR = muR / seR
  const pR = df === null ? pFromZ(statR) : pFromT(statR, df)
  const ciR: [number, number] = [muR - multR * seR, muR + multR * seR]

  let pi: [number, number] | null = null
  if (k >= 2) {
    if ((opts.piMethod ?? 'cochrane') === 'higgins2009') {
      if (k >= 3) {
        const m = qt(1 - (1 - level) / 2, k - 2)
        const half = m * Math.sqrt(tau2 + seRWald ** 2)
        pi = [muR - half, muR + half]
      }
    } else {
      const half = multR * Math.sqrt(tau2 + seR ** 2)
      pi = [muR - half, muR + half]
    }
  }
  if (k < 5) notes.push('Fewer than 5 studies: τ², I² and the prediction interval are very imprecise.')

  const ciC: [number, number] = [muC - z * seC, muC + z * seC]
  const common = { estimate: muC, se: seC, ci: ciC, pval: pFromZ(muC / seC) }
  const random = { estimate: muR, se: seR, ci: ciR, pval: pR }
  const isRandom = model === 'random'
  const weightsCommon = wC.map((w) => (100 * w) / swC)
  const weightsRandom = wR.map((w) => (100 * w) / swR)

  return {
    k,
    model,
    tau2Method,
    ciMethod: isRandom ? ciMethod : 'wald',
    level,
    estimate: isRandom ? muR : muC,
    se: isRandom ? seR : seC,
    ci: isRandom ? ciR : ciC,
    stat: isRandom ? statR : muC / seC,
    df: isRandom ? df : null,
    pval: isRandom ? pR : common.pval,
    pi: isRandom ? pi : null,
    common,
    random,
    tau2,
    tau: Math.sqrt(tau2),
    tau2CI,
    I2,
    I2CI,
    H2,
    Q,
    Qdf,
    Qp,
    s2,
    hksjFactor: isRandom ? hksjFactor : null,
    weights: isRandom ? weightsRandom : weightsCommon,
    weightsCommon,
    weightsRandom,
    yi,
    vi,
    studyCI: yi.map((y, i) => [y - z * Math.sqrt(vi[i]), y + z * Math.sqrt(vi[i])]),
    notes,
  }
}

/** The CI method Cochrane/RevMan recommends for a given fit (τ² > 0 and k > 2 → HKSJ). */
export function recommendedCIMethod(tau2: number, k: number): CIMethod {
  return tau2 > 0 && k > 2 ? 'hksj' : 'wald'
}

export function leaveOneOut(yi: number[], vi: number[], opts: MetaOptions) {
  return yi.map((_, i) => {
    const y = yi.filter((_, j) => j !== i)
    const v = vi.filter((_, j) => j !== i)
    return metaAnalysis(y, v, opts)
  })
}

export function cumulative(yi: number[], vi: number[], opts: MetaOptions) {
  return yi.map((_, i) => metaAnalysis(yi.slice(0, i + 1), vi.slice(0, i + 1), opts))
}

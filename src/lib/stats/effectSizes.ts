/**
 * Study-level effect sizes and their sampling variances.
 * Conventions follow metafor::escalc (Viechtbauer 2010) unless stated; parity is tested against R.
 */
import { lgamma, qnorm, qt } from './distributions'

export interface EffectEstimate {
  yi: number
  vi: number
}

// ------------------------------------------------------------------ Continuous outcomes

export interface ArmContinuous {
  mean: number
  sd: number
  n: number
}

/** Mean difference (treatment − control). */
export function meanDifference(t: ArmContinuous, c: ArmContinuous): EffectEstimate {
  return { yi: t.mean - c.mean, vi: (t.sd * t.sd) / t.n + (c.sd * c.sd) / c.n }
}

/** Exact small-sample bias-correction factor J(m) for Cohen's d (Hedges 1981). */
export function hedgesJ(m: number): number {
  return Math.exp(lgamma(m / 2) - 0.5 * Math.log(m / 2) - lgamma((m - 1) / 2))
}

export function pooledSD(t: ArmContinuous, c: ArmContinuous): number {
  return Math.sqrt(((t.n - 1) * t.sd ** 2 + (c.n - 1) * c.sd ** 2) / (t.n + c.n - 2))
}

/**
 * Standardized mean difference with Hedges' correction (Hedges' g).
 * Variance: large-sample approximation 1/n1 + 1/n2 + g²/(2(n1+n2)) (metafor vtype = "LS").
 */
export function hedgesG(t: ArmContinuous, c: ArmContinuous): EffectEstimate & { d: number; J: number } {
  const d = (t.mean - c.mean) / pooledSD(t, c)
  const J = hedgesJ(t.n + c.n - 2)
  const g = J * d
  return { yi: g, vi: 1 / t.n + 1 / c.n + (g * g) / (2 * (t.n + c.n)), d, J }
}

/** Log ratio of means (requires positive means on a ratio scale). */
export function logRatioOfMeans(t: ArmContinuous, c: ArmContinuous): EffectEstimate {
  return {
    yi: Math.log(t.mean / c.mean),
    vi: (t.sd * t.sd) / (t.n * t.mean * t.mean) + (c.sd * c.sd) / (c.n * c.mean * c.mean),
  }
}

// ------------------------------------------------------------------ Binary outcomes

export interface TwoByTwo {
  /** events, treatment */
  ai: number
  /** total, treatment */
  n1: number
  /** events, control */
  ci: number
  /** total, control */
  n2: number
}

export type BinaryMeasure = 'RR' | 'OR' | 'RD'
export type ContinuityCorrection = 'none' | 'constant' | 'treatment-arm'

export interface BinaryEffect extends EffectEstimate {
  corrected: boolean
  doubleZero: boolean
  /** Undefined effect (e.g. zero cell with no correction) */
  undefined: boolean
}

export const hasZeroCell = (s: TwoByTwo) => s.ai === 0 || s.ci === 0 || s.ai === s.n1 || s.ci === s.n2
export const isDoubleZero = (s: TwoByTwo) => (s.ai === 0 && s.ci === 0) || (s.ai === s.n1 && s.ci === s.n2)

/**
 * Cell increments for a study with a zero cell.
 *  - constant: 0.5 to every cell (metafor/RevMan default "only0")
 *  - treatment-arm: Sweeting et al. (2004) — increments proportional to the reciprocal of the
 *    size of the opposite arm, summing to 1 across arms: k_T = n1/(n1+n2), k_C = n2/(n1+n2).
 */
export function cellIncrements(s: TwoByTwo, cc: ContinuityCorrection): [number, number] {
  if (cc === 'none' || !hasZeroCell(s)) return [0, 0]
  if (cc === 'constant') return [0.5, 0.5]
  const N = s.n1 + s.n2
  return [s.n1 / N, s.n2 / N]
}

export function binaryEffect(s: TwoByTwo, measure: BinaryMeasure, cc: ContinuityCorrection = 'constant'): BinaryEffect {
  const doubleZero = isDoubleZero(s)
  const [kt, kc] = cellIncrements(s, cc)
  const a = s.ai + kt
  const b = s.n1 - s.ai + kt
  const c = s.ci + kc
  const d = s.n2 - s.ci + kc
  const n1 = a + b
  const n2 = c + d
  const corrected = kt > 0 || kc > 0
  let yi: number
  let vi: number
  if (measure === 'RR') {
    yi = Math.log(a / n1 / (c / n2))
    vi = 1 / a - 1 / n1 + 1 / c - 1 / n2
  } else if (measure === 'OR') {
    yi = Math.log((a * d) / (b * c))
    vi = 1 / a + 1 / b + 1 / c + 1 / d
  } else {
    const p1 = a / n1
    const p2 = c / n2
    yi = p1 - p2
    vi = (p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2
  }
  const undef = !Number.isFinite(yi) || !Number.isFinite(vi) || vi <= 0
  return { yi, vi, corrected, doubleZero, undefined: undef }
}

/** Convert a baseline (control) risk and a relative effect to absolute numbers. */
export function absoluteFromRelative(baselineRisk: number, measure: 'RR' | 'OR', ratio: number) {
  const p0 = baselineRisk
  const p1 = measure === 'RR' ? p0 * ratio : (ratio * p0) / (1 - p0 + ratio * p0)
  const rd = p1 - p0
  return { p0, p1, rd, nnt: rd === 0 ? Infinity : 1 / Math.abs(rd), per1000: rd * 1000 }
}

/** OR → RR at a given control-group risk (Zhang & Yu 1998 identity). */
export const orToRR = (or: number, p0: number) => or / (1 - p0 + p0 * or)

/** Convert SMD ↔ log OR assuming logistic latent distributions (Chinn 2000). */
export const smdToLogOR = (smd: number) => (smd * Math.PI) / Math.sqrt(3)
export const logORToSMD = (lor: number) => (lor * Math.sqrt(3)) / Math.PI

// ------------------------------------------------------------------ Correlations

export function fisherZ(r: number, n: number): EffectEstimate {
  return { yi: Math.atanh(r), vi: 1 / (n - 3) }
}

// ------------------------------------------------------------------ Data-extraction toolkit

/** SD from a standard error of a mean. */
export const sdFromSE = (se: number, n: number) => se * Math.sqrt(n)

/** SD from a 95% CI of a mean; uses t(n−1) for small samples (Cochrane Handbook §6.5.2.2). */
export function sdFromCI(lower: number, upper: number, n: number, useT = n < 60): number {
  const mult = useT ? qt(0.975, n - 1) : qnorm(0.975)
  return (Math.sqrt(n) * (upper - lower)) / (2 * mult)
}

/** Combine two groups (e.g. two doses) into one — Cochrane Handbook Table 6.5.a. */
export function combineGroups(g1: ArmContinuous, g2: ArmContinuous): ArmContinuous {
  const n = g1.n + g2.n
  const mean = (g1.n * g1.mean + g2.n * g2.mean) / n
  const sd = Math.sqrt(
    ((g1.n - 1) * g1.sd ** 2 + (g2.n - 1) * g2.sd ** 2 + ((g1.n * g2.n) / n) * (g1.mean ** 2 + g2.mean ** 2 - 2 * g1.mean * g2.mean)) /
      (n - 1),
  )
  return { mean, sd, n }
}

export interface MedianSummary {
  n: number
  median: number
  q1?: number
  q3?: number
  min?: number
  max?: number
}

/**
 * Estimate mean and SD from median-based summaries.
 * Mean: Luo et al. (2018). SD: Wan et al. (2014) for {min,max} or {q1,q3}; Shi et al. (2020) for all five.
 * These assume approximate normality; check skewness before use.
 */
export function meanSDFromMedian(s: MedianSummary): { mean: number; sd: number; scenario: 'S1' | 'S2' | 'S3' } | null {
  const { n, median: m, q1, q3, min: a, max: b } = s
  const hasRange = a !== undefined && b !== undefined
  const hasIQR = q1 !== undefined && q3 !== undefined
  const xi = 2 * qnorm((n - 0.375) / (n + 0.25))
  const eta = 2 * qnorm((0.75 * n - 0.125) / (n + 0.25))
  if (hasRange && hasIQR) {
    const w3 = 2.2 / (2.2 + n ** 0.75)
    const w4 = 0.7 - 0.72 / n ** 0.55
    const mean = w3 * ((a! + b!) / 2) + w4 * ((q1! + q3!) / 2) + (1 - w3 - w4) * m
    const ws = 1 / (1 + 0.07 * n ** 0.6)
    const sd = ws * ((b! - a!) / xi) + (1 - ws) * ((q3! - q1!) / eta)
    return { mean, sd, scenario: 'S3' }
  }
  if (hasRange) {
    const w1 = 4 / (4 + n ** 0.75)
    return { mean: w1 * ((a! + b!) / 2) + (1 - w1) * m, sd: (b! - a!) / xi, scenario: 'S1' }
  }
  if (hasIQR) {
    const w2 = 0.7 + 0.39 / n
    return { mean: w2 * ((q1! + q3!) / 2) + (1 - w2) * m, sd: (q3! - q1!) / eta, scenario: 'S2' }
  }
  return null
}

/** log HR and its SE from a reported HR and 95% CI (Tierney et al. 2007). */
export function logHRFromCI(hr: number, lower: number, upper: number): EffectEstimate & { se: number } {
  const se = (Math.log(upper) - Math.log(lower)) / (2 * qnorm(0.975))
  return { yi: Math.log(hr), vi: se * se, se }
}

/** log HR from log-rank O−E and its variance V (Peto approach). */
export function logHRFromOE(oMinusE: number, v: number): EffectEstimate & { se: number } {
  return { yi: oMinusE / v, vi: 1 / v, se: 1 / Math.sqrt(v) }
}

/** SE of a log ratio from a two-sided p-value (use only when nothing better is reported). */
export function seFromP(logEstimate: number, p: number): number {
  return Math.abs(logEstimate) / qnorm(1 - p / 2)
}

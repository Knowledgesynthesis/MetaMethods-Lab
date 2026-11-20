/**
 * Common-effect methods for 2×2 data that work directly on counts (no zero-cell correction needed
 * unless the same cell is zero in every study — Cochrane Handbook §10.4.4.1).
 *  - Mantel–Haenszel OR with Robins–Breslow–Greenland variance
 *  - Mantel–Haenszel RR with Greenland–Robins variance
 *  - Mantel–Haenszel RD with Sato–Greenland–Robins variance
 *  - Peto one-step OR (Yusuf et al. 1985)
 * Verified against metafor::rma.mh() and metafor::rma.peto().
 */
import { pchisqUpper, pFromZ, qnorm } from './distributions'
import type { BinaryMeasure, TwoByTwo } from './effectSizes'

export interface CountMethodResult {
  method: 'MH' | 'Peto'
  measure: BinaryMeasure
  /** pooled estimate on the analysis scale (log for RR/OR) */
  estimate: number
  se: number
  ci: [number, number]
  pval: number
  Q: number
  Qdf: number
  Qp: number
  I2: number
  /** number of studies contributing information */
  kUsed: number
  undefined: boolean
}

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)

export function mantelHaenszel(studies: TwoByTwo[], measure: BinaryMeasure, level = 0.95): CountMethodResult {
  const z = qnorm(1 - (1 - level) / 2)
  const rows = studies.map((s) => {
    const a = s.ai
    const b = s.n1 - s.ai
    const c = s.ci
    const d = s.n2 - s.ci
    return { a, b, c, d, n1: s.n1, n2: s.n2, n: s.n1 + s.n2 }
  })
  let est: number
  let v: number
  if (measure === 'OR') {
    const R = rows.map((r) => (r.a * r.d) / r.n)
    const S = rows.map((r) => (r.b * r.c) / r.n)
    const P = rows.map((r) => (r.a + r.d) / r.n)
    const Qx = rows.map((r) => (r.b + r.c) / r.n)
    const sR = sum(R)
    const sS = sum(S)
    est = Math.log(sR / sS)
    v =
      sum(P.map((p, i) => p * R[i])) / (2 * sR * sR) +
      sum(P.map((p, i) => p * S[i] + Qx[i] * R[i])) / (2 * sR * sS) +
      sum(Qx.map((q, i) => q * S[i])) / (2 * sS * sS)
  } else if (measure === 'RR') {
    const R = rows.map((r) => (r.a * r.n2) / r.n)
    const S = rows.map((r) => (r.c * r.n1) / r.n)
    const sR = sum(R)
    const sS = sum(S)
    est = Math.log(sR / sS)
    v = sum(rows.map((r) => (r.n1 * r.n2 * (r.a + r.c) - r.a * r.c * r.n) / (r.n * r.n))) / (sR * sS)
  } else {
    const W = rows.map((r) => (r.n1 * r.n2) / r.n)
    const sW = sum(W)
    est = sum(rows.map((r) => (r.a * r.n2 - r.c * r.n1) / r.n)) / sW
    const P = sum(rows.map((r) => (r.n1 * r.n1 * r.c - r.n2 * r.n2 * r.a + (r.n1 * r.n2 * (r.n2 - r.n1)) / 2) / (r.n * r.n)))
    const Qs = sum(rows.map((r) => (r.a * (r.n2 - r.c) + r.c * (r.n1 - r.a)) / (2 * r.n)))
    v = (est * P + Qs) / (sW * sW)
  }
  const se = Math.sqrt(v)
  const undef = !Number.isFinite(est) || !Number.isFinite(se)
  // Cochran's Q around the MH estimate using inverse-variance weights of the (corrected) study estimates
  const het = heterogeneityAround(studies, measure, est)
  return {
    method: 'MH',
    measure,
    estimate: est,
    se,
    ci: [est - z * se, est + z * se],
    pval: pFromZ(est / se),
    ...het,
    undefined: undef,
  }
}

export function peto(studies: TwoByTwo[], level = 0.95): CountMethodResult {
  const z = qnorm(1 - (1 - level) / 2)
  const terms = studies
    .map((s) => {
      const n = s.n1 + s.n2
      const m1 = s.ai + s.ci
      const m0 = n - m1
      const E = (s.n1 * m1) / n
      const V = (s.n1 * s.n2 * m1 * m0) / (n * n * (n - 1))
      return { OE: s.ai - E, V }
    })
    .filter((t) => t.V > 0)
  const sOE = sum(terms.map((t) => t.OE))
  const sV = sum(terms.map((t) => t.V))
  const est = sOE / sV
  const se = Math.sqrt(1 / sV)
  const Q = sum(terms.map((t) => (t.OE * t.OE) / t.V)) - (sOE * sOE) / sV
  const Qdf = terms.length - 1
  return {
    method: 'Peto',
    measure: 'OR',
    estimate: est,
    se,
    ci: [est - z * se, est + z * se],
    pval: pFromZ(est / se),
    Q,
    Qdf,
    Qp: Qdf > 0 ? pchisqUpper(Q, Qdf) : NaN,
    I2: Qdf > 0 ? Math.max(0, (100 * (Q - Qdf)) / Q) : 0,
    kUsed: terms.length,
    undefined: !Number.isFinite(est),
  }
}

/** Per-study Peto log OR and variance (for forest plots). */
export function petoStudy(s: TwoByTwo): { yi: number; vi: number } | null {
  const n = s.n1 + s.n2
  const m1 = s.ai + s.ci
  const V = (s.n1 * s.n2 * m1 * (n - m1)) / (n * n * (n - 1))
  if (!(V > 0)) return null
  return { yi: (s.ai - (s.n1 * m1) / n) / V, vi: 1 / V }
}

function heterogeneityAround(studies: TwoByTwo[], measure: BinaryMeasure, est: number) {
  const ys: number[] = []
  const ws: number[] = []
  for (const s of studies) {
    const dz = (s.ai === 0 && s.ci === 0) || (s.ai === s.n1 && s.ci === s.n2)
    if (dz && measure !== 'RD') continue
    const zero = s.ai === 0 || s.ci === 0 || s.ai === s.n1 || s.ci === s.n2
    const k = zero && measure !== 'RD' ? 0.5 : 0
    const a = s.ai + k
    const b = s.n1 - s.ai + k
    const c = s.ci + k
    const d = s.n2 - s.ci + k
    let y: number
    let v: number
    if (measure === 'OR') {
      y = Math.log((a * d) / (b * c))
      v = 1 / a + 1 / b + 1 / c + 1 / d
    } else if (measure === 'RR') {
      y = Math.log(a / (a + b) / (c / (c + d)))
      v = 1 / a - 1 / (a + b) + 1 / c - 1 / (c + d)
    } else {
      const p1 = a / (a + b)
      const p2 = c / (c + d)
      y = p1 - p2
      v = (p1 * (1 - p1)) / (a + b) + (p2 * (1 - p2)) / (c + d)
    }
    if (v > 0 && Number.isFinite(y)) {
      ys.push(y)
      ws.push(1 / v)
    }
  }
  const Q = sum(ys.map((y, i) => ws[i] * (y - est) ** 2))
  const Qdf = ys.length - 1
  return {
    Q,
    Qdf,
    Qp: Qdf > 0 ? pchisqUpper(Q, Qdf) : NaN,
    I2: Qdf > 0 && Q > 0 ? Math.max(0, (100 * (Q - Qdf)) / Q) : 0,
    kUsed: ys.length,
  }
}

/**
 * Small-study effects and missing-evidence sensitivity analyses.
 *  - Egger's regression test (Egger et al. 1997): WLS of y on SE with weights 1/v (metafor regtest model="lm")
 *  - Peters' test for binary outcomes (Peters et al. 2006): WLS of log OR on 1/N
 *  - Begg & Mazumdar rank correlation (normal approximation)
 *  - Trim-and-fill, L0 estimator (Duval & Tweedie 2000), replicating metafor::trimfill
 *  - PET / PEESE limit estimates (Stanley & Doucouliagos 2014)
 * Cochrane Handbook ch.13: tests only meaningful with ≥10 studies of varying size; the original
 * Egger test is not recommended for odds ratios or SMDs (artefactual correlation of estimate and SE).
 */
import { inverse, type Matrix, matvec, xtwx, xtwy } from './linalg'
import { pFromT, pFromZ, qt } from './distributions'
import { metaAnalysis, type MetaOptions, type MetaResult } from './pairwise'
import { metaRegression } from './metaRegression'

export interface RegTestResult {
  /** slope on the small-study predictor (the asymmetry coefficient) */
  coef: number
  se: number
  t: number
  df: number
  pval: number
  /** intercept: estimate for an infinitely large study (limit / PET-type estimate) */
  limitEstimate: number
  limitCI: [number, number]
}

function wls(y: number[], X: Matrix, w: number[]) {
  const k = y.length
  const p = X[0].length
  const XtWXi = inverse(xtwx(X, w))
  const beta = matvec(XtWXi, xtwy(X, w, y))
  const resid = y.map((yi, i) => yi - X[i].reduce((s, x, j) => s + x * beta[j], 0))
  const sigma2 = resid.reduce((s, r, i) => s + w[i] * r * r, 0) / (k - p)
  const V = XtWXi.map((r) => r.map((x) => x * sigma2))
  return { beta, se: V.map((r, i) => Math.sqrt(r[i])), df: k - p }
}

function regTest(y: number[], predictor: number[], w: number[]): RegTestResult {
  const X = predictor.map((x) => [1, x])
  const { beta, se, df } = wls(y, X, w)
  const t = beta[1] / se[1]
  const crit = qt(0.975, df)
  return {
    coef: beta[1],
    se: se[1],
    t,
    df,
    pval: pFromT(t, df),
    limitEstimate: beta[0],
    limitCI: [beta[0] - crit * se[0], beta[0] + crit * se[0]],
  }
}

export function eggerTest(yi: number[], vi: number[]): RegTestResult {
  return regTest(
    yi,
    vi.map((v) => Math.sqrt(v)),
    vi.map((v) => 1 / v),
  )
}

/** Peters' test: log OR regressed on 1/N with weights E·F/N (E, F = total events / non-events). */
export function petersTest(logOR: number[], totals: number[], events: number[]): RegTestResult {
  return regTest(
    logOR,
    totals.map((n) => 1 / n),
    totals.map((n, i) => (events[i] * (n - events[i])) / n),
  )
}

export function peese(yi: number[], vi: number[]): RegTestResult {
  return regTest(
    yi,
    vi,
    vi.map((v) => 1 / v),
  )
}

export function beggTest(yi: number[], vi: number[]) {
  const k = yi.length
  const w = vi.map((v) => 1 / v)
  const sw = w.reduce((s, x) => s + x, 0)
  const theta = yi.reduce((s, y, i) => s + w[i] * y, 0) / sw
  const ts = yi.map((y, i) => (y - theta) / Math.sqrt(vi[i] - 1 / sw))
  let C = 0
  let D = 0
  for (let i = 0; i < k; i++)
    for (let j = i + 1; j < k; j++) {
      const s = Math.sign(ts[i] - ts[j]) * Math.sign(vi[i] - vi[j])
      if (s > 0) C++
      else if (s < 0) D++
    }
  const tau = (C - D) / ((k * (k - 1)) / 2)
  const z = (C - D) / Math.sqrt((k * (k - 1) * (2 * k + 5)) / 18)
  return { tau, z, pval: pFromZ(z) }
}

export interface TrimFillResult {
  k0: number
  side: 'left' | 'right'
  filled: { yi: number; vi: number }[]
  adjusted: MetaResult
  original: MetaResult
}

/** Trim-and-fill with the L0 estimator, following metafor::trimfill.rma.uni. */
export function trimAndFill(yi: number[], vi: number[], opts: MetaOptions = {}): TrimFillResult {
  const k = yi.length
  const original = metaAnalysis(yi, vi, opts)
  // side: from the sign of the SE slope in a meta-regression on √v
  const regMethod = opts.model === 'common' ? 'FE' : opts.tau2Method === 'DL' ? 'DL' : 'REML'
  const reg = metaRegression(
    yi,
    vi,
    vi.map((v) => [1, Math.sqrt(v)]),
    { method: regMethod },
  )
  const side: 'left' | 'right' = reg.beta[1] < 0 ? 'right' : 'left'
  const flip = side === 'right' ? -1 : 1
  const order = yi.map((y, i) => ({ y: flip * y, v: vi[i] })).sort((a, b) => a.y - b.y)
  const ys = order.map((o) => o.y)
  const vs = order.map((o) => o.v)
  let k0 = 0
  let prev = -1
  let beta = 0
  for (let iter = 0; iter < 100 && k0 !== prev; iter++) {
    prev = k0
    const m = metaAnalysis(ys.slice(0, k - k0), vs.slice(0, k - k0), opts)
    beta = m.estimate
    const c = ys.map((y) => y - beta)
    const ranks = rankFirst(c.map(Math.abs))
    const Sr = c.reduce((s, ci, i) => (ci > 0 ? s + ranks[i] : s), 0)
    const est = (4 * Sr - k * (k + 1)) / (2 * k - 1)
    k0 = Math.max(0, Math.round(est))
  }
  const filled: { yi: number; vi: number }[] = []
  for (let i = k - k0; i < k; i++) filled.push({ yi: flip * (2 * beta - ys[i]), vi: vs[i] })
  const adjusted =
    k0 > 0 ? metaAnalysis([...yi, ...filled.map((f) => f.yi)], [...vi, ...filled.map((f) => f.vi)], opts) : original
  return { k0, side, filled, adjusted, original }
}

/** Ranks 1..n with ties broken by order of appearance (R's ties.method = "first"). */
function rankFirst(x: number[]): number[] {
  const idx = x.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const r = new Array(x.length)
  idx.forEach(([, i], rank) => (r[i] = rank + 1))
  return r
}

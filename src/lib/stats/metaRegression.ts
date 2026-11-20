/**
 * Mixed-effects meta-regression: y_i = x_i'β + u_i + e_i, u_i ~ N(0, τ²), e_i ~ N(0, v_i).
 * Residual τ² by REML (Fisher scoring) or method of moments (DL-type); Wald (z / χ²) or
 * Knapp–Hartung (t / F) inference. Verified against metafor::rma(yi, vi, mods = ...).
 */
import { inverse, matmul, matvec, type Matrix, transpose, xtwx, xtwy, zeros } from './linalg'
import { pchisqUpper, pFromT, pFromZ, pfUpper, qnorm, qt } from './distributions'
import { metaAnalysis, type MetaResult, type Tau2Method } from './pairwise'

export type RegTau2 = 'REML' | 'DL' | 'FE'
export type RegTest = 'z' | 'knha'

export interface MetaRegResult {
  k: number
  p: number
  method: RegTau2
  test: RegTest
  beta: number[]
  se: number[]
  ci: [number, number][]
  stat: number[]
  pval: number[]
  vcov: Matrix
  tau2: number
  I2res: number
  R2: number | null
  QE: number
  QEdf: number
  QEp: number
  QM: number
  QMdf: number
  QMp: number
  /** residual degrees of freedom for KH tests */
  dfRes: number
  knhaScale: number | null
  predict: (x0: number[]) => { fit: number; se: number; ci: [number, number] }
}

function projection(X: Matrix, w: number[]) {
  // P = W − W X (X'WX)^{-1} X' W
  const k = X.length
  const XtWXi = inverse(xtwx(X, w))
  const WX = X.map((row, i) => row.map((x) => x * w[i]))
  const H = matmul(matmul(WX, XtWXi), transpose(WX))
  const P = zeros(k, k)
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) P[i][j] = (i === j ? w[i] : 0) - H[i][j]
  return P
}

const traceOf = (P: Matrix) => P.reduce((s, r, i) => s + r[i], 0)

function residualTau2(yi: number[], vi: number[], X: Matrix, method: RegTau2): number {
  const k = yi.length
  const p = X[0].length
  if (method === 'FE' || k <= p) return 0
  const w0 = vi.map((v) => 1 / v)
  const P0 = projection(X, w0)
  const QE = yi.reduce((s, yii, i) => s + yii * P0[i].reduce((t, pij, j) => t + pij * yi[j], 0), 0)
  const dl = Math.max(0, (QE - (k - p)) / traceOf(P0))
  if (method === 'DL') return dl
  let tau2 = Math.max(dl, 0.01 * Math.min(...vi))
  for (let iter = 0; iter < 500; iter++) {
    const w = vi.map((v) => 1 / (v + tau2))
    const P = projection(X, w)
    const Py = matvec(P, yi)
    const yPPy = Py.reduce((s, x) => s + x * x, 0)
    const trP = traceOf(P)
    let trPP = 0
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) trPP += P[i][j] * P[j][i]
    let adj = (yPPy - trP) / trPP
    while (tau2 + adj < 0) adj /= 2
    tau2 += adj
    if (Math.abs(adj) < 1e-12) break
  }
  return tau2 < 1e-10 ? 0 : tau2
}

/**
 * @param X design matrix INCLUDING the intercept column when wanted
 * @param intercept whether column 0 is an intercept (excluded from the omnibus QM test)
 */
export function metaRegression(
  yi: number[],
  vi: number[],
  X: Matrix,
  { method = 'REML', test = 'z', intercept = true, level = 0.95 }: { method?: RegTau2; test?: RegTest; intercept?: boolean; level?: number } = {},
): MetaRegResult {
  const k = yi.length
  const p = X[0].length
  if (k <= p) throw new Error(`Need more studies (k = ${k}) than coefficients (p = ${p}).`)
  const tau2 = residualTau2(yi, vi, X, method)
  const w = vi.map((v) => 1 / (v + tau2))
  let V = inverse(xtwx(X, w))
  const beta = matvec(V, xtwy(X, w, yi))
  const fitted = X.map((row) => row.reduce((s, x, j) => s + x * beta[j], 0))
  const dfRes = k - p
  let knhaScale: number | null = null
  if (test === 'knha') {
    const s2 = yi.reduce((s, y, i) => s + w[i] * (y - fitted[i]) ** 2, 0) / dfRes
    knhaScale = s2
    V = V.map((r) => r.map((x) => x * s2))
  }
  const se = V.map((r, i) => Math.sqrt(r[i]))
  const crit = test === 'knha' ? qt(1 - (1 - level) / 2, dfRes) : qnorm(1 - (1 - level) / 2)
  const stat = beta.map((b, i) => b / se[i])
  const pval = stat.map((s) => (test === 'knha' ? pFromT(s, dfRes) : pFromZ(s)))
  const ci = beta.map((b, i) => [b - crit * se[i], b + crit * se[i]] as [number, number])

  // Residual heterogeneity test (common-effect weights)
  const w0 = vi.map((v) => 1 / v)
  const P0 = projection(X, w0)
  const QE = yi.reduce((s, yii, i) => s + yii * P0[i].reduce((t, pij, j) => t + pij * yi[j], 0), 0)
  const QEp = pchisqUpper(QE, dfRes)
  const vt = dfRes / traceOf(P0)
  const I2res = (100 * tau2) / (tau2 + vt)

  // Omnibus test of moderators
  const idx = intercept ? [...Array(p).keys()].slice(1) : [...Array(p).keys()]
  let QM = 0
  let QMp = NaN
  if (idx.length > 0) {
    const Vm = idx.map((i) => idx.map((j) => V[i][j]))
    const bm = idx.map((i) => beta[i])
    const Vmi = inverse(Vm)
    QM = bm.reduce((s, b, i) => s + b * Vmi[i].reduce((t, x, j) => t + x * bm[j], 0), 0)
    if (test === 'knha') {
      QM /= idx.length
      QMp = pfUpper(QM, idx.length, dfRes)
    } else QMp = pchisqUpper(QM, idx.length)
  }

  // Pseudo-R²: proportional reduction in τ² relative to the intercept-only model
  let R2: number | null = null
  if (intercept && method !== 'FE' && p > 1) {
    const m0 = metaAnalysis(yi, vi, { tau2Method: method as Tau2Method })
    R2 = m0.tau2 > 0 ? Math.max(0, (100 * (m0.tau2 - tau2)) / m0.tau2) : 0
  }

  const predict = (x0: number[]) => {
    const fit = x0.reduce((s, x, j) => s + x * beta[j], 0)
    const v = x0.reduce((s, xi, i) => s + xi * x0.reduce((t, xj, j) => t + xj * V[i][j], 0), 0)
    const s = Math.sqrt(v)
    return { fit, se: s, ci: [fit - crit * s, fit + crit * s] as [number, number] }
  }

  return {
    k,
    p,
    method,
    test,
    beta,
    se,
    ci,
    stat,
    pval,
    vcov: V,
    tau2,
    I2res,
    R2,
    QE,
    QEdf: dfRes,
    QEp,
    QM,
    QMdf: idx.length,
    QMp,
    dfRes,
    knhaScale,
    predict,
  }
}

export interface SubgroupResult {
  groups: { label: string; k: number; result: MetaResult }[]
  Qbetween: number
  df: number
  pval: number
}

/**
 * Subgroup analysis with separate τ² per subgroup and a test for subgroup differences
 * Q_between = Σ w_g (μ_g − μ̄)², w_g = 1/SE_g² (as in RevMan / meta::metagen).
 */
export function subgroupAnalysis(
  yi: number[],
  vi: number[],
  groups: string[],
  opts: { tau2Method?: Tau2Method; model?: 'common' | 'random'; ciMethod?: 'wald' | 'hksj' } = {},
): SubgroupResult {
  const labels = [...new Set(groups)]
  const res = labels.map((label) => {
    const idx = groups.map((g, i) => (g === label ? i : -1)).filter((i) => i >= 0)
    const r = metaAnalysis(
      idx.map((i) => yi[i]),
      idx.map((i) => vi[i]),
      { model: opts.model ?? 'random', tau2Method: opts.tau2Method ?? 'REML', ciMethod: opts.ciMethod ?? 'wald' },
    )
    return { label, k: idx.length, result: r }
  })
  const w = res.map((g) => 1 / g.result.se ** 2)
  const sw = w.reduce((s, x) => s + x, 0)
  const mbar = res.reduce((s, g, i) => s + w[i] * g.result.estimate, 0) / sw
  const Qb = res.reduce((s, g, i) => s + w[i] * (g.result.estimate - mbar) ** 2, 0)
  const df = labels.length - 1
  return { groups: res, Qbetween: Qb, df, pval: df > 0 ? pchisqUpper(Qb, df) : NaN }
}

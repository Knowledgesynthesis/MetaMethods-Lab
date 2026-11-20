/**
 * Diagnostic test accuracy meta-analysis.
 *
 * Bivariate random-effects model (Reitsma et al. 2005; Chu & Cole 2006 normal approximation):
 *   (logit sens_i, logit FPR_i) ~ N(μ, Ψ + D_i), D_i = diag(1/TP+1/FN, 1/FP+1/TN)
 * fitted by REML. The SROC curve uses the Rutter–Gatsonis (HSROC) parameterisation implied by the
 * bivariate parameters (Harbord et al. 2007): logit(sens) = μ₁ + (τ₁/τ₂)(logit(FPR) − μ₂).
 * Verified against mada::reitsma().
 */
import { cholesky, inverse, logdetSPD, type Matrix } from './linalg'
import { nelderMead } from './optimize'
import { expit, logit, qchisq, qnorm } from './distributions'

export interface DTAStudy {
  tp: number
  fp: number
  fn: number
  tn: number
}

export interface DTAPoint {
  sens: number
  spec: number
  fpr: number
  ySens: number
  yFpr: number
  vSens: number
  vFpr: number
}

export function dtaStudyPoints(studies: DTAStudy[], correction = 0.5): { points: DTAPoint[]; corrected: boolean } {
  const anyZero = studies.some((s) => s.tp === 0 || s.fp === 0 || s.fn === 0 || s.tn === 0)
  const c = anyZero ? correction : 0
  const points = studies.map((s) => {
    const tp = s.tp + c
    const fp = s.fp + c
    const fn = s.fn + c
    const tn = s.tn + c
    const sens = tp / (tp + fn)
    const fpr = fp / (fp + tn)
    return { sens, spec: 1 - fpr, fpr, ySens: logit(sens), yFpr: logit(fpr), vSens: 1 / tp + 1 / fn, vFpr: 1 / fp + 1 / tn }
  })
  return { points, corrected: anyZero }
}

export interface BivariateResult {
  k: number
  mu: [number, number]
  vcov: Matrix
  Psi: Matrix
  tauSens: number
  tauFpr: number
  rho: number
  sens: { est: number; ci: [number, number] }
  spec: { est: number; ci: [number, number] }
  fpr: { est: number; ci: [number, number] }
  lrPos: { est: number; ci: [number, number] }
  lrNeg: { est: number; ci: [number, number] }
  dor: { est: number; ci: [number, number] }
  logLik: number
  corrected: boolean
  points: DTAPoint[]
  /** SROC slope in logit space (τ_sens / τ_fpr) */
  srocSlope: number
  auc: number
}

function psiFromParams(p: number[]): Matrix {
  const l11 = Math.exp(p[0])
  const l21 = p[1]
  const l22 = Math.exp(p[2])
  return [
    [l11 * l11, l11 * l21],
    [l11 * l21, l21 * l21 + l22 * l22],
  ]
}

function remlObjective(points: DTAPoint[], Psi: Matrix) {
  let sumSi: Matrix = [
    [0, 0],
    [0, 0],
  ]
  let sumSiy = [0, 0]
  let logdet = 0
  const Sinv: Matrix[] = []
  for (const pt of points) {
    const S = [
      [Psi[0][0] + pt.vSens, Psi[0][1]],
      [Psi[1][0], Psi[1][1] + pt.vFpr],
    ]
    const Si = inverse(S)
    Sinv.push(Si)
    logdet += logdetSPD(S)
    sumSi = [
      [sumSi[0][0] + Si[0][0], sumSi[0][1] + Si[0][1]],
      [sumSi[1][0] + Si[1][0], sumSi[1][1] + Si[1][1]],
    ]
    sumSiy = [
      sumSiy[0] + Si[0][0] * pt.ySens + Si[0][1] * pt.yFpr,
      sumSiy[1] + Si[1][0] * pt.ySens + Si[1][1] * pt.yFpr,
    ]
  }
  const V = inverse(sumSi)
  const mu = [V[0][0] * sumSiy[0] + V[0][1] * sumSiy[1], V[1][0] * sumSiy[0] + V[1][1] * sumSiy[1]]
  let quad = 0
  points.forEach((pt, i) => {
    const r = [pt.ySens - mu[0], pt.yFpr - mu[1]]
    const Si = Sinv[i]
    quad += r[0] * (Si[0][0] * r[0] + Si[0][1] * r[1]) + r[1] * (Si[1][0] * r[0] + Si[1][1] * r[1])
  })
  const nll = 0.5 * (logdet + logdetSPD(sumSi) + quad)
  return { nll, mu: mu as [number, number], V }
}

export function bivariateDTA(studies: DTAStudy[], level = 0.95): BivariateResult {
  const { points, corrected } = dtaStudyPoints(studies)
  const k = points.length
  if (k < 3) throw new Error('The bivariate model needs at least 3 studies.')
  const sd = (a: number[]) => {
    const m = a.reduce((s, x) => s + x, 0) / a.length
    return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1))
  }
  const s1 = Math.max(0.05, sd(points.map((p) => p.ySens)))
  const s2 = Math.max(0.05, sd(points.map((p) => p.yFpr)))
  const obj = (p: number[]) => {
    try {
      return remlObjective(points, psiFromParams(p)).nll
    } catch {
      return Infinity
    }
  }
  // multi-start Nelder–Mead for robustness
  const starts = [
    [Math.log(s1 * 0.7), 0, Math.log(s2 * 0.7)],
    [Math.log(s1 * 0.3), -0.5 * s2 * 0.3, Math.log(s2 * 0.3)],
    [Math.log(s1), 0.5 * s2, Math.log(s2)],
  ]
  let best = nelderMead(obj, starts[0], { tol: 1e-13, maxIter: 8000 })
  for (const s of starts.slice(1)) {
    const r = nelderMead(obj, s, { tol: 1e-13, maxIter: 8000 })
    if (r.fx < best.fx) best = r
  }
  best = nelderMead(obj, best.x, { tol: 1e-14, maxIter: 8000, step: 0.05 })
  const Psi = psiFromParams(best.x)
  const { mu, V } = remlObjective(points, Psi)
  const z = qnorm(1 - (1 - level) / 2)
  const ciL = (m: number, v: number): [number, number] => [expit(m - z * Math.sqrt(v)), expit(m + z * Math.sqrt(v))]
  const sens = expit(mu[0])
  const fpr = expit(mu[1])
  const tauSens = Math.sqrt(Psi[0][0])
  const tauFpr = Math.sqrt(Psi[1][1])
  const rho = Psi[0][1] / (tauSens * tauFpr)
  // delta-method CIs on the log scale
  const g1 = [1 - sens, -(1 - fpr)]
  const vLrp = g1[0] ** 2 * V[0][0] + g1[1] ** 2 * V[1][1] + 2 * g1[0] * g1[1] * V[0][1]
  const g2 = [-sens, fpr]
  const vLrn = g2[0] ** 2 * V[0][0] + g2[1] ** 2 * V[1][1] + 2 * g2[0] * g2[1] * V[0][1]
  const vDor = V[0][0] + V[1][1] - 2 * V[0][1]
  const lrp = sens / fpr
  const lrn = (1 - sens) / (1 - fpr)
  const ldor = mu[0] - mu[1]
  const expCI = (m: number, v: number): [number, number] => [Math.exp(m - z * Math.sqrt(v)), Math.exp(m + z * Math.sqrt(v))]
  const slope = tauSens / tauFpr
  const res: BivariateResult = {
    k,
    mu,
    vcov: V,
    Psi,
    tauSens,
    tauFpr,
    rho,
    sens: { est: sens, ci: ciL(mu[0], V[0][0]) },
    fpr: { est: fpr, ci: ciL(mu[1], V[1][1]) },
    spec: { est: 1 - fpr, ci: [1 - ciL(mu[1], V[1][1])[1], 1 - ciL(mu[1], V[1][1])[0]] },
    lrPos: { est: lrp, ci: expCI(Math.log(lrp), vLrp) },
    lrNeg: { est: lrn, ci: expCI(Math.log(lrn), vLrn) },
    dor: { est: Math.exp(ldor), ci: expCI(ldor, vDor) },
    logLik: -best.fx,
    corrected,
    points,
    srocSlope: slope,
    auc: 0,
  }
  res.auc = srocAUC(res)
  return res
}

/** Sensitivity on the SROC curve at a given false-positive rate. */
export const srocSens = (fit: Pick<BivariateResult, 'mu' | 'srocSlope'>, fpr: number) =>
  expit(fit.mu[0] + fit.srocSlope * (logit(fpr) - fit.mu[1]))

export function srocAUC(fit: Pick<BivariateResult, 'mu' | 'srocSlope'>) {
  const n = 2000
  let s = 0
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n
    s += srocSens(fit, x) / n
  }
  return s
}

/** Points of the 95% confidence (or prediction) region in ROC space. */
export function dtaRegion(fit: BivariateResult, type: 'confidence' | 'prediction', level = 0.95, n = 120) {
  const S: Matrix =
    type === 'confidence'
      ? fit.vcov
      : [
          [fit.vcov[0][0] + fit.Psi[0][0], fit.vcov[0][1] + fit.Psi[0][1]],
          [fit.vcov[1][0] + fit.Psi[1][0], fit.vcov[1][1] + fit.Psi[1][1]],
        ]
  const L = cholesky(S)
  const r = Math.sqrt(qchisq(level, 2))
  const pts: { fpr: number; sens: number }[] = []
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n
    const u = [r * Math.cos(a), r * Math.sin(a)]
    const ys = fit.mu[0] + L[0][0] * u[0]
    const yf = fit.mu[1] + L[1][0] * u[0] + L[1][1] * u[1]
    pts.push({ sens: expit(ys), fpr: expit(yf) })
  }
  return pts
}

/** Post-test probabilities and natural frequencies per 1000 tested. */
export function postTest(sens: number, spec: number, prevalence: number) {
  const tp = sens * prevalence
  const fn = (1 - sens) * prevalence
  const fp = (1 - spec) * (1 - prevalence)
  const tn = spec * (1 - prevalence)
  return {
    ppv: tp / (tp + fp),
    npv: tn / (tn + fn),
    per1000: { tp: tp * 1000, fn: fn * 1000, fp: fp * 1000, tn: tn * 1000 },
  }
}

/**
 * Every quantitative statement made in the lesson text about the course datasets is asserted here,
 * so that content and engine cannot drift apart.
 */
import { describe, expect, it } from 'vitest'
import { BP_TRIALS, DOSE_TRIALS, DTA_STUDIES, FEW_TRIALS, NMA_TRIALS, PREVALENCE_STUDIES, RARE_AE_TRIALS, SMALL_STUDY_TRIALS } from '../../../data/datasets'
import { binaryEffect, isDoubleZero, meanDifference } from '../effectSizes'
import { metaAnalysis } from '../pairwise'
import { mantelHaenszel, peto } from '../binary'
import { poolGLMM, poolTransformed } from '../proportions'
import { metaRegression } from '../metaRegression'
import { rng } from '../random'
import { eggerTest, petersTest, trimAndFill } from '../pubBias'
import { qnorm } from '../distributions'

describe('Module 2 claims', () => {
  it('moving the largest BP trial shifts the common-effect estimate more than the random-effects mean', () => {
    const rows = BP_TRIALS.map((s) => meanDifference(s.t, s.c))
    const sizes = BP_TRIALS.map((s) => s.t.n + s.c.n)
    const big = sizes.indexOf(Math.max(...sizes))
    const before = metaAnalysis(rows.map((r) => r.yi), rows.map((r) => r.vi))
    const moved = rows.map((r, i) => (i === big ? { ...r, yi: 5 } : r))
    const after = metaAnalysis(moved.map((r) => r.yi), moved.map((r) => r.vi))
    expect(Math.abs(after.common.estimate - before.common.estimate)).toBeGreaterThan(Math.abs(after.random.estimate - before.random.estimate))
    expect(after.tau2).toBeGreaterThan(before.tau2)
  })
})

describe('Module 3 claims', () => {
  it('estimators disagree about τ² (≥2-fold, ML smallest) while means barely move', () => {
    const sets = [
      { yi: [-0.05, -0.45, -0.6, -0.3, -0.7, -0.4], vi: [0.03, 0.2, 0.25, 0.22, 0.3, 0.18].map((s) => s * s), tol: 0.05 },
      { yi: [-9, -1, -6], vi: [3.2, 2.8, 3.6].map((s) => s * s), tol: 0.2 },
    ]
    for (const d of sets) {
      const fits = (['DL', 'REML', 'PM', 'ML'] as const).map((m) => metaAnalysis(d.yi, d.vi, { tau2Method: m }))
      const t2 = fits.map((f) => f.tau2)
      expect(Math.max(...t2) / Math.min(...t2)).toBeGreaterThan(2)
      expect(fits[3].tau2).toBeLessThan(fits[1].tau2) // ML < REML
      const mus = fits.map((f) => f.estimate)
      expect(Math.max(...mus) - Math.min(...mus)).toBeLessThan(d.tol)
    }
  })
  it('I² rises with study size while τ stays put (Lab 1 construction)', () => {
    const BASE_SE = [0.32, 0.18, 0.26, 0.4, 0.22, 0.3, 0.2, 0.36, 0.24, 0.28]
    const Q = Array.from({ length: 10 }, (_, i) => qnorm((i + 0.5) / 10))
    const NOISE = [0.6, -1.1, 0.2, 1.3, -0.4, -0.9, 0.9, -0.2, 0.4, -0.7]
    const ORDER = [3, 7, 1, 9, 0, 5, 8, 2, 6, 4]
    const fit = (mult: number) => {
      const se = BASE_SE.map((s) => s / Math.sqrt(mult))
      const yi = se.map((s, i) => -0.3 + 0.15 * Q[ORDER[i]] + s * NOISE[i])
      return metaAnalysis(yi, se.map((s) => s * s))
    }
    const a = fit(1)
    const b = fit(32)
    expect(b.I2).toBeGreaterThan(a.I2 + 30)
    expect(Math.abs(b.tau - 0.15)).toBeLessThan(0.05)
  })
})

describe('Module 4 claims', () => {
  it('inverse-variance OR estimates sit closer to 1 than MH and Peto in the rare-AE dataset', () => {
    const use = RARE_AE_TRIALS.filter((s) => !isDoubleZero(s))
    const iv = (cc: 'constant' | 'treatment-arm') => {
      const e = use.map((s) => binaryEffect(s, 'OR', cc))
      return metaAnalysis(e.map((x) => x.yi), e.map((x) => x.vi), { model: 'common' }).estimate
    }
    const mh = mantelHaenszel(RARE_AE_TRIALS, 'OR').estimate
    const pt = peto(RARE_AE_TRIALS).estimate
    for (const v of [iv('constant'), iv('treatment-arm')]) {
      expect(v).toBeLessThan(mh)
      expect(v).toBeLessThan(pt)
    }
    expect(RARE_AE_TRIALS.filter(isDoubleZero).length).toBe(2)
  })
})

describe('Module 5 claims', () => {
  it('raw-scale pooling underestimates relative to the GLMM in the prevalence dataset', () => {
    const raw = poolTransformed(PREVALENCE_STUDIES, 'PR').estimate
    const glmm = poolGLMM(PREVALENCE_STUDIES).estimate
    expect(raw).toBeLessThan(glmm)
  })
  it('the Freeman–Tukey trap returns exactly 0 while the GLMM does not', () => {
    const TRAP = [
      { x: 1, n: 20 },
      { x: 0, n: 15 },
      { x: 1, n: 25 },
      { x: 12, n: 5000 },
      { x: 30, n: 12000 },
      { x: 0, n: 30 },
    ]
    expect(poolTransformed(TRAP, 'PFT').estimate).toBe(0)
    const g = poolGLMM(TRAP).estimate
    expect(g).toBeGreaterThan(0.002)
    expect(g).toBeLessThan(0.003)
  })
})

describe('Module 6 claims', () => {
  const E = DOSE_TRIALS.map((s) => ({ ...s, ...binaryEffect(s, 'OR') }))
  const fit = (k: number, method: 'REML' | 'FE', test: 'knha' | 'z') =>
    metaRegression(E.slice(0, k).map((s) => s.yi), E.slice(0, k).map((s) => s.vi), E.slice(0, k).map((s) => [1, s.dose]), { method, test })
  it('dose slope is detected with 18 trials and is consistent with the truth', () => {
    const f = fit(18, 'REML', 'knha')
    expect(f.pval[1]).toBeLessThan(0.01)
    expect(f.ci[1][0] * 10).toBeLessThan(-0.12)
    expect(f.ci[1][1] * 10).toBeGreaterThan(-0.12)
  })
  it('ignoring residual τ² gives a narrower slope CI', () => {
    const a = fit(18, 'REML', 'knha')
    const b = fit(18, 'FE', 'z')
    expect(b.ci[1][1] - b.ci[1][0]).toBeLessThan(a.ci[1][1] - a.ci[1][0])
  })
  it('R² reaches 100% at k = 10 because residual τ² hits zero', () => {
    const f = fit(10, 'REML', 'knha')
    expect(f.tau2).toBe(0)
    expect(f.R2).toBe(100)
  })
  it('fixed-effect meta-regression has an inflated false-positive rate, KH does not', () => {
    const r = rng(3)
    const hits = [0, 0]
    const n = 600
    for (let s = 0; s < n; s++) {
      const vi = Array.from({ length: 10 }, () => 0.02 + 0.2 * r.uniform())
      const yi = vi.map((v) => r.normal(-0.3, Math.sqrt(v + 0.09)))
      const X = Array.from({ length: 10 }, () => [1, r.normal()])
      if (metaRegression(yi, vi, X, { method: 'FE', test: 'z' }).pval[1] < 0.05) hits[0]++
      if (metaRegression(yi, vi, X, { method: 'REML', test: 'knha' }).pval[1] < 0.05) hits[1]++
    }
    expect(hits[0] / n).toBeGreaterThan(0.14)
    expect(hits[1] / n).toBeLessThan(0.08)
  })
})

describe('Module 7 claims', () => {
  it('worked example shows strong small-study effects detected by Peters and filled on the harm side', () => {
    const e = SMALL_STUDY_TRIALS.map((s) => binaryEffect(s, 'OR'))
    const yi = e.map((x) => x.yi)
    const vi = e.map((x) => x.vi)
    const pe = petersTest(yi, SMALL_STUDY_TRIALS.map((s) => s.n1 + s.n2), SMALL_STUDY_TRIALS.map((s) => s.ai + s.ci))
    expect(pe.pval).toBeLessThan(0.01)
    const tf = trimAndFill(yi, vi)
    expect(tf.k0).toBeGreaterThan(0)
    expect(tf.side).toBe('right')
    expect(eggerTest(yi, vi).coef).toBeLessThan(0)
  })
  it('selective publication exaggerates the published OR while Egger rarely detects it (default simulator settings)', () => {
    const pubOR: number[] = []
    let flagged = 0
    for (let seed = 17; seed < 117; seed++) {
      const r = rng(seed)
      const st = Array.from({ length: 50 }, () => {
        const nn = Math.round(Math.exp(Math.log(30) + r.uniform() * Math.log(1500 / 30)))
        const v = 2 / (nn * 0.25 * 0.75)
        const y = r.normal(r.normal(-0.1, 0.05), Math.sqrt(v))
        return { y, v, pub: y / Math.sqrt(v) < -1.96 || r.uniform() < 0.2 }
      }).filter((s) => s.pub)
      pubOR.push(Math.exp(metaAnalysis(st.map((s) => s.y), st.map((s) => s.v)).estimate))
      if (eggerTest(st.map((s) => s.y), st.map((s) => s.v)).pval < 0.1) flagged++
    }
    const med = pubOR.sort((a, b) => a - b)[50]
    expect(med).toBeLessThan(0.87)
    expect(flagged).toBeLessThan(30)
  })
})

describe('datasets are well formed', () => {
  it('counts are consistent', () => {
    for (const s of [...RARE_AE_TRIALS, ...DOSE_TRIALS, ...SMALL_STUDY_TRIALS, ...FEW_TRIALS]) {
      expect(s.ai).toBeLessThanOrEqual(s.n1)
      expect(s.ci).toBeLessThanOrEqual(s.n2)
    }
    for (const s of DTA_STUDIES) expect(Math.min(s.tp, s.fp, s.fn, s.tn)).toBeGreaterThanOrEqual(0)
    for (const s of NMA_TRIALS) expect(s.e1 <= s.n1 && s.e2 <= s.n2).toBe(true)
    for (const s of PREVALENCE_STUDIES) expect(s.x).toBeLessThanOrEqual(s.n)
  })
})

import { describe, expect, it } from 'vitest'
import { close } from './helpers'
import { absoluteFromRelative, combineGroups, logHRFromCI, meanSDFromMedian, orToRR, sdFromCI } from '../effectSizes'
import { metaAnalysis, recommendedCIMethod } from '../pairwise'
import { inversePFT, pft, poolGLMM } from '../proportions'
import { bucher, networkMetaAnalysis } from '../nma'
import { postTest } from '../dta'
import { rng } from '../random'

describe('data-extraction toolkit (vs R meta::metamean)', () => {
  // reference values from meta 9.0-0, method.mean = "Luo", method.sd = "Wan"/"Shi"
  it('median + IQR (Wan Table 2 for n ≤ 201)', () => {
    const r = meanSDFromMedian({ n: 40, median: 10, q1: 7, q3: 14 })!
    close(r.mean, 10.354875, 1e-9)
    close(r.sd, 5.37221795855718, 1e-9)
    const r2 = meanSDFromMedian({ n: 12, median: 3.1, q1: 2.2, q3: 4.9 })!
    close(r2.mean, 3.429625, 1e-9)
    close(r2.sd, 2.23880597014925, 1e-9)
  })
  it('median + range (Wan Table 1 for n ≤ 50)', () => {
    const r = meanSDFromMedian({ n: 25, median: 5, min: 1, max: 15 })!
    close(r.mean, 5.79049613440355, 1e-9)
    close(r.sd, 3.56143474942763, 1e-9)
  })
  it('five-number summary (Luo + Shi)', () => {
    const r = meanSDFromMedian({ n: 120, median: 30, q1: 22, q3: 41, min: 8, max: 80 })!
    close(r.mean, 31.7733026126982, 1e-9)
    close(r.sd, 14.164242495267, 1e-9)
  })
  it('combining groups and SD from CI', () => {
    // Cochrane Handbook Table 6.5.a formula; two identical groups keep their mean and (approximately) SD
    const c = combineGroups({ mean: 10, sd: 2, n: 50 }, { mean: 10, sd: 2, n: 50 })
    close(c.mean, 10, 1e-12)
    expect(c.sd).toBeCloseTo(2, 1)
    close(sdFromCI(8, 12, 100, false), (Math.sqrt(100) * 4) / 3.919927969080108, 1e-9)
    close(logHRFromCI(0.8, 0.64, 1.0).se, (Math.log(1) - Math.log(0.64)) / 3.919927969080108, 1e-9)
  })
  it('absolute effects from relative ones', () => {
    const a = absoluteFromRelative(0.2, 'RR', 0.75)
    close(a.p1, 0.15, 1e-12)
    close(a.nnt, 20, 1e-9)
    close(orToRR(2, 0.3), 2 / (0.7 + 0.6), 1e-12)
  })
})

describe('engine behaviour at the edges', () => {
  it('k = 1 returns the study itself', () => {
    const r = metaAnalysis([0.3], [0.04])
    close(r.estimate, 0.3, 1e-12)
    expect(r.tau2).toBe(0)
  })
  it('rejects non-positive variances', () => {
    expect(() => metaAnalysis([0.1, 0.2], [0.1, 0])).toThrow()
  })
  it('Cochrane CI rule: HKSJ only when τ² > 0 and k > 2', () => {
    expect(recommendedCIMethod(0.1, 3)).toBe('hksj')
    expect(recommendedCIMethod(0, 10)).toBe('wald')
    expect(recommendedCIMethod(0.1, 2)).toBe('wald')
  })
  it('prediction interval equals CI when τ² = 0 (same multiplier)', () => {
    const r = metaAnalysis([0.1, 0.11, 0.09, 0.1], [0.04, 0.05, 0.03, 0.04])
    expect(r.tau2).toBe(0)
    close(r.pi![0], r.ci[0], 1e-12)
    close(r.pi![1], r.ci[1], 1e-12)
  })
  it('Freeman–Tukey inversion round-trips and reproduces the Schwarzer 2019 zero artefact', () => {
    for (const n of [10, 50, 300]) for (const x of [1, 3, Math.floor(n / 2)]) expect(Math.abs(inversePFT(pft(x, n), n) - x / n)).toBeLessThan(0.08)
    // values below pft(0, n) back-transform to exactly 0
    expect(inversePFT(pft(0, 100) - 1e-3, 100)).toBe(0)
  })
  it('GLMM handles all-zero-heterogeneity data at the boundary', () => {
    const r = poolGLMM([{ x: 10, n: 100 }, { x: 10, n: 100 }, { x: 10, n: 100 }])
    expect(r.tau2).toBe(0)
    close(r.estimate, 0.1, 1e-6)
  })
  it('NMA rejects a disconnected network', () => {
    expect(() =>
      networkMetaAnalysis([
        { id: '1', t1: 'A', t2: 'B', yi: 0.1, vi: 0.1 },
        { id: '2', t1: 'C', t2: 'D', yi: 0.1, vi: 0.1 },
      ]),
    ).toThrow(/disconnected/)
  })
  it('Bucher indirect comparison adds variances', () => {
    const b = bucher(-0.5, 0.2, -0.2, 0.15)
    close(b.est, -0.3, 1e-12)
    close(b.se, 0.25, 1e-12)
  })
  it('post-test probabilities', () => {
    const p = postTest(0.9, 0.8, 0.1)
    close(p.ppv, 0.09 / (0.09 + 0.18), 1e-12)
    close(p.per1000.tp + p.per1000.fn + p.per1000.fp + p.per1000.tn, 1000, 1e-9)
  })
  it('seeded RNG is reproducible', () => {
    const a = rng(42)
    const b = rng(42)
    expect([a.normal(), a.uniform(), a.binomial(50, 0.3)]).toEqual([b.normal(), b.uniform(), b.binomial(50, 0.3)])
  })
})

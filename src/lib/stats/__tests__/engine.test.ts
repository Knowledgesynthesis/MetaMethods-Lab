/**
 * Parity tests: every number is compared with the reference implementation in R
 * (metafor, meta, netmeta, mada, bayesmeta — versions in fixtures/versions.json).
 * Regenerate fixtures with `npm run validate:r`.
 */
import { describe, expect, it } from 'vitest'
import { close } from './helpers'
import distFx from './fixtures/distributions.json'
import pwFx from './fixtures/pairwise.json'
import escFx from './fixtures/escalc.json'
import mhFx from './fixtures/mh.json'
import propFx from './fixtures/proportions.json'
import regFx from './fixtures/metareg.json'
import sgFx from './fixtures/subgroup.json'
import pbFx from './fixtures/pubbias.json'
import petersFx from './fixtures/peters.json'
import dtaFx from './fixtures/dta.json'
import nmaFx from './fixtures/nma.json'
import bayesFx from './fixtures/bayes.json'
import { pchisq, pf, pnorm, pt, qbeta, qchisq, qnorm, qt } from '../distributions'
import { metaAnalysis, type Tau2Method } from '../pairwise'
import { binaryEffect, hedgesG, logRatioOfMeans, meanDifference } from '../effectSizes'
import { mantelHaenszel, peto } from '../binary'
import { poolGLMM, poolTransformed, transformProportion } from '../proportions'
import { metaRegression, subgroupAnalysis } from '../metaRegression'
import { beggTest, eggerTest, petersTest, trimAndFill } from '../pubBias'
import { bivariateDTA, srocSens } from '../dta'
import { networkMetaAnalysis } from '../nma'
import { bayesMeta } from '../bayes'

describe('distributions (vs R stats)', () => {
  it('normal', () => {
    distFx.pnorm.forEach((r) => close(pnorm(r.x), r.p, 1e-10, 1e-300, `pnorm(${r.x})`))
    distFx.qnorm.forEach((r) => close(qnorm(r.p), r.q, 1e-10, 1e-12, `qnorm(${r.p})`))
  })
  it('t', () => {
    distFx.pt.forEach((r) => close(pt(r.x, r.df), r.p, 1e-9, 1e-14, `pt(${r.x},${r.df})`))
    distFx.qt.forEach((r) => close(qt(r.p, r.df), r.q, 1e-8, 1e-10, `qt(${r.p},${r.df})`))
  })
  it('chi-square, F, beta', () => {
    distFx.pchisq.forEach((r) => close(pchisq(r.x, r.df), r.p, 1e-9, 1e-14, `pchisq(${r.x},${r.df})`))
    distFx.qchisq.forEach((r) => close(qchisq(r.p, r.df), r.q, 1e-8, 1e-10, `qchisq(${r.p},${r.df})`))
    distFx.pf.forEach((r) => close(pf(r.x, r.df1, r.df2), r.p, 1e-9, 1e-12, 'pf'))
    distFx.qbeta.forEach((r) => close(qbeta(r.p, r.a, r.b), r.q, 1e-8, 1e-10, 'qbeta'))
  })
})

describe('pairwise meta-analysis (vs metafor::rma)', () => {
  for (const d of pwFx) {
    it(`${d.name} (k = ${d.yi.length})`, () => {
      const fe = metaAnalysis(d.yi, d.vi, { model: 'common' })
      close(fe.estimate, d.common.est, 1e-9, 1e-12, 'FE est')
      close(fe.se, d.common.se, 1e-9, 1e-12, 'FE se')
      close(fe.Q, d.common.Q, 1e-9, 1e-10, 'Q')
      for (const m of ['REML', 'DL', 'PM', 'ML'] as Tau2Method[]) {
        for (const t of ['z', 'knha'] as const) {
          const ref = (d as Record<string, unknown>)[`${m}_${t}`] as
            | { est: number; se: number; ci: number[]; pval: number; tau2: number; I2: number; H2: number; pi: number[]; tau2CI?: number[] }
            | undefined
          if (!ref) continue
          const r = metaAnalysis(d.yi, d.vi, { model: 'random', tau2Method: m, ciMethod: t === 'knha' ? 'hksj' : 'wald' })
          const tag = `${m}/${t}`
          close(r.tau2, ref.tau2, 1e-5, 1e-8, `${tag} tau2`)
          close(r.estimate, ref.est, 1e-6, 1e-8, `${tag} est`)
          close(r.se, ref.se, 1e-5, 1e-8, `${tag} se`)
          close(r.ci[0], ref.ci[0], 1e-5, 1e-7, `${tag} ci.lb`)
          close(r.ci[1], ref.ci[1], 1e-5, 1e-7, `${tag} ci.ub`)
          close(r.pval, ref.pval, 1e-4, 1e-9, `${tag} p`)
          close(r.I2, ref.I2, 1e-5, 1e-6, `${tag} I2`)
          close(r.H2, ref.H2, 1e-5, 1e-6, `${tag} H2`)
          if (r.pi) {
            close(r.pi[0], ref.pi[0], 1e-5, 1e-7, `${tag} pi.lb`)
            close(r.pi[1], ref.pi[1], 1e-5, 1e-7, `${tag} pi.ub`)
          }
          if (ref.tau2CI && r.tau2CI && m === 'REML' && t === 'z') {
            close(r.tau2CI[0], ref.tau2CI[0], 1e-4, 1e-6, `${tag} tau2 lb`)
            close(r.tau2CI[1], ref.tau2CI[1], 1e-4, 1e-6, `${tag} tau2 ub`)
          }
        }
      }
    })
  }
  it('reproduces the BCG REML textbook values', () => {
    const d = pwFx[0]
    const r = metaAnalysis(d.yi, d.vi)
    expect(r.estimate).toBeCloseTo(-0.7145, 4)
    expect(r.tau2).toBeCloseTo(0.3132, 4)
    expect(r.I2).toBeCloseTo(92.22, 2)
  })
})

describe('effect sizes (vs metafor::escalc)', () => {
  it('binary RR / OR / RD with only0 correction', () => {
    for (const t of escFx.binary) {
      for (const m of ['RR', 'OR', 'RD'] as const) {
        const e = binaryEffect({ ai: t.ai, n1: t.n1, ci: t.ci, n2: t.n2 }, m, 'constant')
        close(e.yi, t[m].yi, 1e-10, 1e-12, `${m} yi ${JSON.stringify(t)}`)
        close(e.vi, t[m].vi, 1e-10, 1e-12, `${m} vi`)
      }
    }
  })
  it('continuous MD / SMD (Hedges g) / ROM', () => {
    for (const c of escFx.continuous) {
      const T = { mean: c.m1, sd: c.s1, n: c.n1 }
      const C = { mean: c.m2, sd: c.s2, n: c.n2 }
      close(meanDifference(T, C).yi, c.MD.yi, 1e-12)
      close(meanDifference(T, C).vi, c.MD.vi, 1e-12)
      close(hedgesG(T, C).yi, c.SMD.yi, 1e-9)
      close(hedgesG(T, C).vi, c.SMD.vi, 1e-9)
      close(logRatioOfMeans(T, C).yi, c.ROM.yi, 1e-12)
      close(logRatioOfMeans(T, C).vi, c.ROM.vi, 1e-12)
    }
  })
  it('proportions PR / PLO / PAS / PFT', () => {
    for (const p of escFx.proportions) {
      for (const m of ['PR', 'PLO', 'PAS', 'PFT'] as const) {
        const e = transformProportion({ x: p.x, n: p.n }, m)
        close(e.yi, p[m].yi, 1e-10, 1e-12, `${m} yi x=${p.x} n=${p.n}`)
        close(e.vi, p[m].vi, 1e-10, 1e-12, `${m} vi`)
      }
    }
  })
})

describe('Mantel–Haenszel and Peto (vs metafor::rma.mh / rma.peto)', () => {
  mhFx.forEach((d, i) => {
    it(`dataset ${i + 1}`, () => {
      const studies = d.ai.map((a: number, j: number) => ({ ai: a, n1: d.n1[j], ci: d.ci[j], n2: d.n2[j] }))
      for (const m of ['OR', 'RR', 'RD'] as const) {
        const ref = (d as Record<string, unknown>)[m] as { est: number; se: number; Q: number } | undefined
        if (!ref) continue
        const r = mantelHaenszel(studies, m)
        close(r.estimate, ref.est, 1e-8, 1e-10, `MH ${m} est`)
        close(r.se, ref.se, 1e-8, 1e-10, `MH ${m} se`)
        close(r.Q, ref.Q, 1e-6, 1e-8, `MH ${m} Q`)
      }
      if (d.PETO) {
        const r = peto(studies)
        close(r.estimate, d.PETO.est, 1e-8, 1e-10, 'Peto est')
        close(r.se, d.PETO.se, 1e-8, 1e-10, 'Peto se')
        close(r.Q, d.PETO.Q, 1e-6, 1e-8, 'Peto Q')
      }
    })
  })
})

describe('proportions pooling (vs metafor rma / rma.glmm)', () => {
  propFx.forEach((d, i) => {
    it(`dataset ${i + 1}`, () => {
      const st = d.x.map((x: number, j: number) => ({ x, n: d.n[j] }))
      const ft = poolTransformed(st, 'PFT', { tau2Method: 'REML' })
      close(ft.analysisEstimate, d.PFT.est, 1e-6, 1e-8, 'PFT est')
      close(ft.tau2, d.PFT.tau2, 1e-5, 1e-8, 'PFT tau2')
      close(ft.estimate, d.PFT.back, 1e-6, 1e-8, 'PFT back-transformed')
      close(ft.ci[0], d.PFT.back_ci[0], 1e-6, 1e-8, 'PFT back ci.lb')
      close(ft.ci[1], d.PFT.back_ci[1], 1e-6, 1e-8, 'PFT back ci.ub')
      const lo = poolTransformed(st, 'PLO', { tau2Method: 'REML' })
      close(lo.analysisEstimate, d.PLO.est, 1e-6, 1e-8, 'PLO est')
      if (d.GLMM) {
        const g = poolGLMM(st)
        close(g.analysisEstimate, d.GLMM.est, 2e-3, 2e-3, 'GLMM est')
        close(g.analysisSE, d.GLMM.se, 2e-2, 2e-3, 'GLMM se')
        close(Math.sqrt(g.tau2), Math.sqrt(d.GLMM.tau2), 2e-2, 5e-3, 'GLMM tau')
      }
    })
  })
})

describe('meta-regression (vs metafor::rma with mods)', () => {
  regFx.forEach((d) => {
    it(`${d.name} ${d.method}/${d.test}`, () => {
      const r = metaRegression(d.yi, d.vi, d.X, { method: d.method as 'REML' | 'DL', test: d.test as 'z' | 'knha' })
      close(r.tau2, d.tau2, 1e-5, 1e-8, 'tau2')
      d.beta.forEach((b: number, j: number) => close(r.beta[j], b, 1e-6, 1e-8, `beta${j}`))
      d.se.forEach((s: number, j: number) => close(r.se[j], s, 1e-5, 1e-8, `se${j}`))
      close(r.QE, d.QE, 1e-8, 1e-8, 'QE')
      close(r.QM, d.QM, 1e-5, 1e-8, 'QM')
      close(r.QMp, d.QMp, 1e-4, 1e-10, 'QMp')
      close(r.I2res, d.I2, 1e-5, 1e-6, 'I2res')
      if (d.R2 !== null && r.R2 !== null) close(r.R2, d.R2, 1e-4, 1e-5, 'R2')
    })
  })
  it('subgroup differences test (vs meta::metagen)', () => {
    const r = subgroupAnalysis(sgFx.yi, sgFx.vi, sgFx.groups, { tau2Method: 'REML' })
    close(r.Qbetween, sgFx.Q, 1e-5, 1e-8, 'Q between')
    close(r.pval, sgFx.p, 1e-4, 1e-9, 'p between')
  })
})

describe('small-study effects (vs metafor regtest / ranktest / trimfill, meta::metabias)', () => {
  pbFx.forEach((d, i) => {
    it(`dataset ${i + 1}`, () => {
      const eg = eggerTest(d.yi, d.vi)
      close(eg.t, d.REML.egger_t, 1e-8, 1e-10, 'Egger t')
      close(eg.pval, d.REML.egger_p, 1e-6, 1e-10, 'Egger p')
      close(eg.limitEstimate, d.REML.egger_limit, 1e-8, 1e-10, 'Egger limit')
      close(beggTest(d.yi, d.vi).tau, d.begg_tau, 1e-10, 1e-12, 'Begg tau')
      const cases: [string, Parameters<typeof trimAndFill>[2]][] = [
        ['REML', { model: 'random', tau2Method: 'REML' }],
        ['DL', { model: 'random', tau2Method: 'DL' }],
        ['EE', { model: 'common' }],
      ]
      for (const [key, opts] of cases) {
        const ref = (d as Record<string, unknown>)[key] as { tf_k0: number; tf_side: string; tf_est: number; tf_se: number } | undefined
        if (!ref) continue
        const tf = trimAndFill(d.yi, d.vi, opts)
        expect(tf.k0, `${key} k0`).toBe(ref.tf_k0)
        expect(tf.side, `${key} side`).toBe(ref.tf_side)
        // metafor's internal trimming fits use default (1e-5) convergence, hence the looser tolerance
        close(tf.adjusted.estimate, ref.tf_est, 1e-4, 1e-6, `${key} trimfill est`)
        close(tf.adjusted.se, ref.tf_se, 1e-3, 1e-6, `${key} trimfill se`)
      }
    })
  })
  petersFx.forEach((d, i) => {
    it(`Peters test ${i + 1}`, () => {
      const lor: number[] = []
      const totals: number[] = []
      const events: number[] = []
      d.ai.forEach((a: number, j: number) => {
        const e = binaryEffect({ ai: a, n1: d.n1[j], ci: d.ci[j], n2: d.n2[j] }, 'OR')
        lor.push(e.yi)
        totals.push(d.n1[j] + d.n2[j])
        events.push(a + d.ci[j])
      })
      const r = petersTest(lor, totals, events)
      close(r.t, d.t, 1e-6, 1e-8, 'Peters t')
      close(r.pval, d.p, 1e-6, 1e-8, 'Peters p')
      close(r.coef, d.bias, 1e-6, 1e-8, 'Peters slope')
    })
  })
})

describe('DTA bivariate model (vs mada::reitsma)', () => {
  dtaFx.forEach((d) => {
    it(d.name, () => {
      const st = d.TP.map((tp: number, j: number) => ({ tp, fn: d.FN[j], fp: d.FP[j], tn: d.TN[j] }))
      const r = bivariateDTA(st)
      close(r.mu[0], d.coef[0], 1e-4, 1e-4, 'mu sens')
      close(r.mu[1], d.coef[1], 1e-4, 1e-4, 'mu fpr')
      close(r.Psi[0][0], d.Psi[0][0], 2e-3, 1e-4, 'Psi11')
      close(r.Psi[1][1], d.Psi[1][1], 2e-3, 1e-4, 'Psi22')
      close(r.Psi[0][1], d.Psi[0][1], 5e-3, 2e-4, 'Psi12')
      close(r.vcov[0][0], d.vcov[0][0], 2e-3, 1e-5, 'V11')
      close(r.vcov[1][1], d.vcov[1][1], 2e-3, 1e-5, 'V22')
      // SROC curve: reproduce mada's AUC discretisation (trapezoid on FPR = 0.01…0.99, divided by 99)
      const s = Array.from({ length: 99 }, (_, j) => srocSens(r, (j + 1) / 100))
      const madaAUC = (s[0] / 2 + s.slice(1, 98).reduce((a, b) => a + b, 0) + s[98] / 2) / 99
      close(madaAUC, d.auc, 1e-3, 1e-4, 'SROC (mada AUC)')
      expect(r.auc).toBeGreaterThan(madaAUC - 0.02)
    })
  })
})

describe('network meta-analysis (vs netmeta)', () => {
  nmaFx.forEach((d, i) => {
    it(`network ${i + 1}`, () => {
      const studies = d.studies.map((s: { id: string; t1: string; t2: string; yi: number; vi: number }) => s)
      const tr: string[] = d.treatments
      for (const model of ['common', 'random'] as const) {
        const r = networkMetaAnalysis(studies, { reference: 'A', model, smallerIsBetter: true })
        if (model === 'random') close(r.tau2, d.tau2, 1e-6, 1e-9, 'tau2')
        close(r.Q, d.Q, 1e-8, 1e-8, 'Q')
        close(r.Qhet, d.Qhet, 1e-8, 1e-8, 'Q het')
        close(r.Qinc, d.Qinc, 1e-6, 1e-8, 'Q inc')
        const TE = model === 'common' ? d.TE_common : d.TE_random
        const SE = model === 'common' ? d.seTE_common : d.seTE_random
        tr.forEach((a, ia) =>
          tr.forEach((b, ib) => {
            if (a === b) return
            const c = r.league(b, a) // effect of a vs b
            close(c.est, TE[ia][ib], 1e-7, 1e-9, `${model} TE ${a} vs ${b}`)
            close(c.se, SE[ia][ib], 1e-7, 1e-9, `${model} seTE ${a} vs ${b}`)
          }),
        )
        const ps = model === 'common' ? d.pscore_common : d.pscore_random
        tr.forEach((t, j) => close(r.pscores[t], ps[j], 1e-6, 1e-8, `${model} P-score ${t}`))
        if (model === 'random') {
          for (const row of d.split) {
            if (row.direct === null) continue // no direct evidence for this pair
            const [a, b] = row.comparison.split(':')
            const s = r.split.find((x) => (x.t1 === b && x.t2 === a) || (x.t1 === a && x.t2 === b))
            expect(s, row.comparison).toBeTruthy()
            const sign = s!.t2 === a ? 1 : -1 // row is a vs b
            close(sign * s!.direct.est, row.direct, 1e-6, 1e-8, `direct ${row.comparison}`)
            if (row.indirect !== null && s!.indirect) {
              close(sign * s!.indirect.est, row.indirect, 1e-5, 1e-8, `indirect ${row.comparison}`)
              close(s!.pval!, row.p, 1e-4, 1e-8, `split p ${row.comparison}`)
            }
          }
        }
      }
    })
  })
})

describe('Bayesian random-effects (vs bayesmeta)', () => {
  bayesFx.forEach((d, i) => {
    it(`dataset ${i + 1} (half-normal ${d.scale})`, () => {
      const r = bayesMeta(d.yi, d.vi, { tauPrior: { kind: 'halfnormal', scale: d.scale }, muPrior: { mean: 0, sd: 4 } })
      close(r.mu.median, d.mu_median, 2e-3, 2e-3, 'mu median')
      close(r.mu.ci[0], d.mu_lo, 2e-3, 3e-3, 'mu lo')
      close(r.mu.ci[1], d.mu_hi, 2e-3, 3e-3, 'mu hi')
      close(r.mu.mean, d.mu_mean, 2e-3, 2e-3, 'mu mean')
      close(r.tau.median, d.tau_median, 5e-3, 3e-3, 'tau median')
      close(r.theta.ci[0], d.theta_lo, 3e-3, 5e-3, 'theta lo')
      close(r.theta.ci[1], d.theta_hi, 3e-3, 5e-3, 'theta hi')
    })
  })
})

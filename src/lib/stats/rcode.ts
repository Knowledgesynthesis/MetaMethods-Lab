/** Generate R code that reproduces an analysis in metafor / meta (the reference implementations). */
import type { CIMethod, ModelType, Tau2Method } from './pairwise'

const vec = (xs: (number | string)[]) =>
  `c(${xs.map((x) => (typeof x === 'string' ? JSON.stringify(x) : Number.isFinite(x) ? String(+x.toPrecision(10)) : 'NA')).join(', ')})`

export interface PairwiseRSpec {
  labels: string[]
  model: ModelType
  tau2Method: Tau2Method
  ciMethod: CIMethod
  measure: 'MD' | 'SMD' | 'RR' | 'OR' | 'RD' | 'GEN'
  /** arm-level continuous */
  cont?: { m1: number[]; sd1: number[]; n1: number[]; m2: number[]; sd2: number[]; n2: number[] }
  /** arm-level binary */
  bin?: { ai: number[]; n1: number[]; ci: number[]; n2: number[] }
  /** generic yi / sei */
  gen?: { yi: number[]; sei: number[] }
}

export function pairwiseR(s: PairwiseRSpec): string {
  const method = s.model === 'common' ? 'EE' : s.tau2Method
  const test = s.ciMethod === 'hksj' && s.model === 'random' ? ', test = "knha"' : ''
  const lines: string[] = ['# install.packages(c("metafor", "meta"))', 'library(metafor)', '']
  lines.push(`study <- ${vec(s.labels)}`)
  if (s.cont) {
    lines.push(
      `m1 <- ${vec(s.cont.m1)}; sd1 <- ${vec(s.cont.sd1)}; n1 <- ${vec(s.cont.n1)}`,
      `m2 <- ${vec(s.cont.m2)}; sd2 <- ${vec(s.cont.sd2)}; n2 <- ${vec(s.cont.n2)}`,
      `dat <- escalc(measure = "${s.measure}", m1i = m1, sd1i = sd1, n1i = n1, m2i = m2, sd2i = sd2, n2i = n2, slab = study)`,
    )
  } else if (s.bin) {
    lines.push(
      `ai <- ${vec(s.bin.ai)}; n1 <- ${vec(s.bin.n1)}`,
      `ci <- ${vec(s.bin.ci)}; n2 <- ${vec(s.bin.n2)}`,
      `dat <- escalc(measure = "${s.measure}", ai = ai, n1i = n1, ci = ci, n2i = n2, slab = study)`,
    )
  } else if (s.gen) {
    lines.push(`yi <- ${vec(s.gen.yi)}`, `sei <- ${vec(s.gen.sei)}`, 'dat <- escalc(measure = "GEN", yi = yi, sei = sei, slab = study)')
  }
  lines.push(
    `res <- rma(yi, vi, data = dat, method = "${method}"${test})`,
    'res',
    'predict(res' + (s.measure === 'RR' || s.measure === 'OR' ? ', transf = exp)' : ')') + '   # includes the prediction interval',
    s.model === 'random' ? 'confint(res)                 # Q-profile CI for tau^2 and I^2' : '',
    `forest(res${s.measure === 'RR' || s.measure === 'OR' ? ', atransf = exp' : ''}, addpred = TRUE, header = TRUE)`,
    'leave1out(res)',
  )
  return lines.filter((l) => l !== '').join('\n')
}

export function proportionsR(labels: string[], x: number[], n: number[]): string {
  return [
    'library(meta)',
    `study <- ${vec(labels)}`,
    `x <- ${vec(x)}; n <- ${vec(n)}`,
    '# Recommended one-stage model: random-intercept logistic regression (GLMM)',
    'glmm <- metaprop(x, n, studlab = study, method = "GLMM", sm = "PLOGIT")',
    'summary(glmm); forest(glmm)',
    '# Two-stage logit sensitivity analysis with REML and HKSJ',
    'logit <- metaprop(x, n, studlab = study, method = "Inverse", sm = "PLOGIT", method.tau = "REML", method.random.ci = "HK")',
    'summary(logit)',
  ].join('\n')
}

export function dtaR(labels: string[], d: { tp: number[]; fp: number[]; fn: number[]; tn: number[] }): string {
  return [
    'library(mada)',
    `dat <- data.frame(study = ${vec(labels)},`,
    `  TP = ${vec(d.tp)}, FP = ${vec(d.fp)},`,
    `  FN = ${vec(d.fn)}, TN = ${vec(d.tn)})`,
    'fit <- reitsma(dat)          # bivariate model (REML)',
    'summary(fit)',
    'plot(fit, sroclwd = 2, predict = TRUE); points(fpr(dat), sens(dat))',
    '# Exact-binomial alternative: lme4::glmer (Chu & Cole 2006) or the metadta / diagmeta packages',
  ].join('\n')
}

export function nmaR(rows: { study: string; t1: string; t2: string; yi: number; sei: number }[], reference: string, smallBetter: boolean): string {
  return [
    'library(netmeta)',
    `study <- ${vec(rows.map((r) => r.study))}`,
    `treat1 <- ${vec(rows.map((r) => r.t2))}   # netmeta: TE is treat1 vs treat2`,
    `treat2 <- ${vec(rows.map((r) => r.t1))}`,
    `TE <- ${vec(rows.map((r) => r.yi))}`,
    `seTE <- ${vec(rows.map((r) => r.sei))}`,
    `net <- netmeta(TE, seTE, treat1, treat2, studlab = study, sm = "OR", reference.group = "${reference}", common = TRUE, random = TRUE)`,
    'summary(net); netgraph(net)',
    'netleague(net, digits = 2)',
    `netrank(net, small.values = "${smallBetter ? 'desirable' : 'undesirable'}")   # P-scores`,
    'netsplit(net)            # direct vs indirect (SIDE)',
    'decomp.design(net)       # design-by-treatment Q decomposition',
  ].join('\n')
}

export function bayesR(yi: number[], sei: number[], labels: string[], priorScale: number, muSD: number | null): string {
  return [
    'library(bayesmeta)',
    `y <- ${vec(yi)}; sigma <- ${vec(sei)}`,
    `fit <- bayesmeta(y = y, sigma = sigma, labels = ${vec(labels)},`,
    `  tau.prior = function(t) dhalfnormal(t, scale = ${priorScale})${muSD ? `,\n  mu.prior.mean = 0, mu.prior.sd = ${muSD}` : ''})`,
    'fit$summary',
    'fit$qposterior(mu.p = c(0.025, 0.5, 0.975))',
    'fit$pposterior(mu = 0)   # P(mu < 0)',
    'forestplot(fit)',
  ].join('\n')
}

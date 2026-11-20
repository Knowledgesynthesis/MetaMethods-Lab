import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { CodeBlock } from '@/components/lesson/CodeBlock'
import { RocPlot } from '@/components/plots/RocPlot'
import { SliderField, Stat, Toggle } from '@/components/ui/controls'
import { DTA_STUDIES } from '@/data/datasets'
import { bivariateDTA, dtaRegion, dtaStudyPoints, postTest, srocSens, type BivariateResult, type DTAStudy } from '@/lib/stats/dta'
import { metaAnalysis } from '@/lib/stats/pairwise'
import { expit, pnorm } from '@/lib/stats/distributions'
import { rng } from '@/lib/stats/random'
import { dtaR } from '@/lib/stats/rcode'
import { fmt, fmtCI } from '@/lib/utils'

function srocPath(fit: BivariateResult, lo: number, hi: number) {
  return Array.from({ length: 60 }, (_, i) => {
    const f = lo + ((hi - lo) * i) / 59
    return { fpr: f, sens: srocSens(fit, f) }
  })
}

function ExplorerLab() {
  const [showConf, setShowConf] = useState(true)
  const [showPred, setShowPred] = useState(true)
  const [showSroc, setShowSroc] = useState(true)
  const fit = useMemo(() => bivariateDTA(DTA_STUDIES), [])
  const fprs = fit.points.map((p) => p.fpr)
  const uni = useMemo(() => {
    const s = metaAnalysis(fit.points.map((p) => p.ySens), fit.points.map((p) => p.vSens))
    const f = metaAnalysis(fit.points.map((p) => p.yFpr), fit.points.map((p) => p.vFpr))
    return { sens: s, fpr: f }
  }, [fit])
  return (
    <Lab title="Lab 1 · ROC-space explorer" description="14 studies of a rapid antigen test that used different positivity thresholds. Bivariate random-effects model fitted by REML (matches R mada::reitsma).">
      <div className="flex flex-wrap gap-4">
        <Toggle checked={showConf} onChange={setShowConf} label="Confidence region" />
        <Toggle checked={showPred} onChange={setShowPred} label="Prediction region" />
        <Toggle checked={showSroc} onChange={setShowSroc} label="SROC curve" />
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">
        <RocPlot
          points={DTA_STUDIES.map((s, i) => ({ fpr: fit.points[i].fpr, sens: fit.points[i].sens, size: s.tp + s.fn + s.fp + s.tn, label: s.study }))}
          summary={{ fpr: fit.fpr.est, sens: fit.sens.est }}
          confidence={showConf ? dtaRegion(fit, 'confidence') : null}
          prediction={showPred ? dtaRegion(fit, 'prediction') : null}
          sroc={showSroc ? srocPath(fit, Math.min(...fprs), Math.max(...fprs)) : null}
        />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Sensitivity" value={`${fmt(100 * fit.sens.est, 1)}%`} sub={`95% CI ${fmt(100 * fit.sens.ci[0], 1)}–${fmt(100 * fit.sens.ci[1], 1)}%`} tone="primary" />
            <Stat label="Specificity" value={`${fmt(100 * fit.spec.est, 1)}%`} sub={`95% CI ${fmt(100 * fit.spec.ci[0], 1)}–${fmt(100 * fit.spec.ci[1], 1)}%`} tone="primary" />
            <Stat label="LR+" value={fmt(fit.lrPos.est, 2)} sub={`95% CI ${fmtCI(fit.lrPos.ci)}`} />
            <Stat label="LR−" value={fmt(fit.lrNeg.est, 3)} sub={`95% CI ${fmtCI(fit.lrNeg.ci, 3)}`} />
            <Stat label="Diagnostic OR" value={fmt(fit.dor.est, 1)} sub={`95% CI ${fmtCI(fit.dor.ci, 1)}`} />
            <Stat label="Correlation ρ (logit sens, logit FPR)" value={fmt(fit.rho, 2)} sub={fit.rho > 0.3 ? 'positive: threshold effect' : 'weak'} />
            <Stat label="τ (logit sens)" value={fmt(fit.tauSens, 2)} />
            <Stat label="τ (logit FPR)" value={fmt(fit.tauFpr, 2)} />
          </div>
          <DataTable
            head={['Approach', 'Sensitivity', 'Specificity']}
            rows={[
              ['Bivariate (joint)', `${fmt(100 * fit.sens.est, 1)}%`, `${fmt(100 * fit.spec.est, 1)}%`],
              ['Two separate univariate models', `${fmt(100 * expit(uni.sens.estimate), 1)}%`, `${fmt(100 * (1 - expit(uni.fpr.estimate)), 1)}%`],
            ]}
          />
        </div>
      </div>
      <CodeBlock code={dtaR(DTA_STUDIES.map((s) => s.study), { tp: DTA_STUDIES.map((s) => s.tp), fp: DTA_STUDIES.map((s) => s.fp), fn: DTA_STUDIES.map((s) => s.fn), tn: DTA_STUDIES.map((s) => s.tn) })} title="Reproduce in R (mada)" />
    </Lab>
  )
}

function simulateDTA(k: number, delta: number, thrSD: number, accSD: number, seed: number): DTAStudy[] {
  const r = rng(seed)
  return Array.from({ length: k }, () => {
    const c = r.normal(1, thrSD)
    const d = r.normal(delta, accSD)
    const nd = r.int(40, 150)
    const nn = r.int(100, 400)
    const tp = r.binomial(nd, 1 - pnorm(c - d))
    const fp = r.binomial(nn, 1 - pnorm(c))
    return { tp, fn: nd - tp, fp, tn: nn - fp }
  })
}

function ThresholdLab() {
  const [thrSD, setThrSD] = useState(0.6)
  const [accSD, setAccSD] = useState(0.15)
  const [seed, setSeed] = useState(5)
  const delta = 2
  const studies = useMemo(() => simulateDTA(16, delta, thrSD, accSD, seed), [thrSD, accSD, seed])
  const fit = useMemo(() => {
    try {
      return bivariateDTA(studies)
    } catch {
      return null
    }
  }, [studies])
  const pts = dtaStudyPoints(studies).points
  const truth = Array.from({ length: 80 }, (_, i) => {
    const c = -3 + (8 * i) / 79
    return { fpr: 1 - pnorm(c), sens: 1 - pnorm(c - delta) }
  })
  const fprs = pts.map((p) => p.fpr)
  return (
    <Lab
      title="Lab 2 · Threshold effects"
      description="Studies sampled from one underlying binormal test (true AUC fixed). Vary how much positivity thresholds and true accuracy differ between studies."
      actions={
        <button type="button" onClick={() => setSeed(seed + 1)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent">
          <Shuffle className="h-3.5 w-3.5" /> Resample
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SliderField label="Threshold variation between studies (SD)" value={thrSD} onChange={setThrSD} min={0} max={1.2} step={0.05} format={(v) => fmt(v)} />
        <SliderField label="Variation in true accuracy (SD)" value={accSD} onChange={setAccSD} min={0} max={1} step={0.05} format={(v) => fmt(v)} />
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <RocPlot
          points={pts.map((p) => ({ fpr: p.fpr, sens: p.sens }))}
          summary={fit ? { fpr: fit.fpr.est, sens: fit.sens.est } : null}
          sroc={fit ? srocPath(fit, Math.min(...fprs), Math.max(...fprs)) : null}
          truth={truth}
          height={340}
        />
        {fit ? (
          <div className="grid h-fit grid-cols-2 gap-2">
            <Stat label="Estimated ρ" value={fmt(fit.rho, 2)} sub="logit sens vs logit FPR" tone="primary" />
            <Stat label="SROC AUC" value={fmt(fit.auc, 3)} sub={`true AUC ${fmt(pnorm(delta / Math.SQRT2), 3)}`} />
            <Stat label="Summary sensitivity" value={`${fmt(100 * fit.sens.est, 0)}%`} />
            <Stat label="Summary specificity" value={`${fmt(100 * fit.spec.est, 0)}%`} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Model did not converge for this sample — resample.</p>
        )}
      </div>
    </Lab>
  )
}

function PostTestLab() {
  const fit = useMemo(() => bivariateDTA(DTA_STUDIES), [])
  const [prev, setPrev] = useState(0.1)
  const pt = postTest(fit.sens.est, fit.spec.est, prev)
  const region = dtaRegion(fit, 'prediction', 0.95, 72)
  const ranges = region.map((p) => postTest(p.sens, 1 - p.fpr, prev))
  const ppvR = [Math.min(...ranges.map((r) => r.ppv)), Math.max(...ranges.map((r) => r.ppv))]
  const npvR = [Math.min(...ranges.map((r) => r.npv)), Math.max(...ranges.map((r) => r.npv))]
  const cells = Array.from({ length: 100 }, (_, i) => {
    const tp = Math.round(pt.per1000.tp / 10)
    const fn = Math.round(pt.per1000.fn / 10)
    const fp = Math.round(pt.per1000.fp / 10)
    return i < tp ? 'tp' : i < tp + fn ? 'fn' : i < tp + fn + fp ? 'fp' : 'tn'
  })
  const color = { tp: 'bg-chart-blue', fn: 'bg-chart-vermillion', fp: 'bg-chart-orange', tn: 'bg-muted' }
  return (
    <Lab title="Lab 3 · What a result means for a patient" description="Summary sensitivity and specificity from Lab 1, applied at the pre-test probability you choose.">
      <SliderField label="Pre-test probability (prevalence in the tested population)" value={prev} onChange={setPrev} min={0.01} max={0.6} step={0.01} format={(v) => `${Math.round(100 * v)}%`} />
      <div className="mt-4 grid gap-6 md:grid-cols-[auto_1fr]">
        <div>
          <div className="grid w-[220px] grid-cols-10 gap-0.5" role="img" aria-label="Outcomes per 100 people tested">
            {cells.map((c, i) => (
              <span key={i} className={`h-5 w-5 rounded-sm ${color[c as keyof typeof color]}`} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 text-xs text-muted-foreground">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-chart-blue" />true positive</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-chart-vermillion" />missed (FN)</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-chart-orange" />false alarm (FP)</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-muted" />true negative</span>
          </div>
        </div>
        <div className="grid h-fit grid-cols-2 gap-2">
          <Stat label="P(disease | positive)" value={`${fmt(100 * pt.ppv, 0)}%`} sub={`new-setting range ${fmt(100 * ppvR[0], 0)}–${fmt(100 * ppvR[1], 0)}%`} tone="primary" />
          <Stat label="P(no disease | negative)" value={`${fmt(100 * pt.npv, 1)}%`} sub={`new-setting range ${fmt(100 * npvR[0], 1)}–${fmt(100 * npvR[1], 1)}%`} tone="primary" />
          <Stat label="Per 1000 tested: missed" value={fmt(pt.per1000.fn, 0)} />
          <Stat label="Per 1000 tested: false positives" value={fmt(pt.per1000.fp, 0)} />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Ranges use the 95% prediction region: plausible accuracy in a new setting, not just uncertainty in the average.</p>
    </Lab>
  )
}

const SECTIONS = [
  { id: 'measures', title: 'Accuracy measures' },
  { id: 'why', title: 'Why DTA needs its own models' },
  { id: 'bivariate', title: 'The bivariate and HSROC models' },
  { id: 'threshold', title: 'Threshold effects' },
  { id: 'patients', title: 'From accuracy to patients' },
  { id: 'pitfalls', title: 'Pitfalls' },
]

export default function DTA() {
  return (
    <Lesson
      id="dta"
      sections={SECTIONS}
      refs={['cochrane-dta', 'reitsma2005', 'rutter2001', 'harbord2007', 'chu2006', 'takwoingi2017', 'leeflang2013', 'prisma-dta']}
      objectives={[
        'Compute sensitivity, specificity, likelihood ratios and the diagnostic odds ratio.',
        'Explain why sensitivity and specificity must be meta-analysed jointly.',
        'Interpret a bivariate summary point, confidence and prediction regions, and an SROC curve.',
        'Translate summary accuracy into post-test probabilities for a given prevalence.',
      ]}
    >
      <Section id="measures" title="Accuracy measures">
        <DataTable
          head={['', 'Target condition present', 'Target condition absent']}
          rows={[
            ['Test positive', 'TP', 'FP'],
            ['Test negative', 'FN', 'TN'],
          ]}
        />
        <Tex block>{'\\text{Sens}=\\frac{TP}{TP+FN},\\quad \\text{Spec}=\\frac{TN}{TN+FP},\\quad LR^{+}=\\frac{\\text{Sens}}{1-\\text{Spec}},\\quad LR^{-}=\\frac{1-\\text{Sens}}{\\text{Spec}},\\quad DOR=\\frac{LR^+}{LR^-}'}</Tex>
        <p>
          Sensitivity and specificity are conditional on disease status; predictive values also depend on prevalence. The DOR condenses accuracy into one number
          but hides the sensitivity–specificity balance that matters clinically.
        </p>
      </Section>

      <Section id="why" title="Why DTA needs its own models">
        <ul>
          <li>Each study gives two linked outcomes: sensitivity (from diseased participants) and specificity (from non-diseased).</li>
          <li>
            Studies use different <strong>thresholds</strong> (explicitly or implicitly), so sensitivity and specificity trade off — they are negatively
            correlated across studies (positively correlated as logit sensitivity vs logit FPR).
          </li>
          <li>Heterogeneity beyond chance is the rule, not the exception.</li>
        </ul>
        <Callout kind="rule">
          <p>
            Hierarchical models — the bivariate model and the HSROC model — are the recommended approach <Cite id="cochrane-dta" />. The older Moses–Littenberg
            SROC regression ignores within- and between-study variability and should not be used.
          </p>
        </Callout>
      </Section>

      <Section id="bivariate" title="The bivariate and HSROC models">
        <Tex block>{'\\begin{pmatrix}\\mathrm{logit}\\,\\widehat{\\text{Sens}}_i\\\\ \\mathrm{logit}\\,\\widehat{\\text{FPR}}_i\\end{pmatrix}\\sim N\\left(\\begin{pmatrix}\\mu_1\\\\ \\mu_2\\end{pmatrix},\\; \\Sigma+S_i\\right),\\qquad \\Sigma=\\begin{pmatrix}\\tau_1^2 & \\rho\\tau_1\\tau_2\\\\ \\rho\\tau_1\\tau_2 & \\tau_2^2\\end{pmatrix}'}</Tex>
        <p>
          <Tex>{'S_i'}</Tex> holds the within-study variances <Tex>{'1/TP+1/FN'}</Tex> and <Tex>{'1/FP+1/TN'}</Tex> <Cite id="reitsma2005" />. Without
          covariates the HSROC model <Cite id="rutter2001" /> is a reparameterisation of the same model <Cite id="harbord2007" />; its curve is the line
          through the summary point with slope <Tex>{'\\tau_1/\\tau_2'}</Tex> on the logit scale.
        </p>
        <ExplorerLab />
        <ul>
          <li>
            <strong>Summary point</strong> (diamond): the average sensitivity and specificity — meaningful when studies share a threshold.
          </li>
          <li>
            <strong>95% confidence region</strong>: uncertainty about that average.
          </li>
          <li>
            <strong>95% prediction region</strong>: where a new study’s true sensitivity/specificity is expected — usually far larger.
          </li>
          <li>
            <strong>SROC curve</strong>: how accuracy varies with threshold; draw it only over the range of observed FPRs.
          </li>
        </ul>
        <Callout kind="tip">
          <p>
            With sparse data (zero cells, few studies) prefer the exact-binomial bivariate GLMM <Cite id="chu2006" />; if it fails to converge, simplify (e.g.
            ρ = 0, or univariate models) as described by Takwoingi et al. <Cite id="takwoingi2017" />.
          </p>
        </Callout>
      </Section>

      <Section id="threshold" title="Threshold effects">
        <ThresholdLab />
        <Predict
          prompt="Set accuracy variation to 0 and increase threshold variation from 0 to 1.2. Where do the study points go, and what happens to ρ?"
          options={['They scatter randomly; ρ ≈ 0', 'They spread along the ROC curve; ρ becomes strongly positive', 'They cluster at the summary point']}
          reveal={
            <>
              They spread along the true ROC curve: lower thresholds buy sensitivity at the cost of specificity. The estimated ρ (logit sensitivity vs logit
              FPR) becomes strongly positive, and the SROC curve tracks the truth. Raise accuracy variation instead and the points scatter off the curve — that is
              heterogeneity in accuracy, which an SROC curve cannot explain.
            </>
          }
        />
      </Section>

      <Section id="patients" title="From accuracy to patients">
        <PostTestLab />
        <Callout kind="evidence">
          <p>
            Sensitivity and specificity are not fixed properties of a test: they vary with the spectrum of disease and the setting, and often with prevalence{' '}
            <Cite id="leeflang2013" />. Report the prediction region, and present results as natural frequencies (per 1000 tested) at realistic prevalences.
          </p>
        </Callout>
        <QuickCheck
          item={{
            id: 'dta-q1',
            q: 'A test has sensitivity 90% and specificity 90%. In a population with 2% prevalence, what proportion of positive results are true positives?',
            options: ['90%', '50%', 'about 16%', 'about 2%'],
            answer: 2,
            why: (
              <>
                Per 1000: 20 diseased → 18 TP; 980 non-diseased → 98 FP. PPV = 18/(18 + 98) ≈ 16%. Even an accurate test produces mostly false positives when the
                condition is rare.
              </>
            ),
          }}
        />
      </Section>

      <Section id="pitfalls" title="Pitfalls">
        <ul>
          <li>Pooling sensitivity and specificity separately and plotting the two pooled values as if they were a joint estimate.</li>
          <li>Including several thresholds from the same study as if they were independent studies.</li>
          <li>Reporting an SROC curve outside the range of the data, or a summary point when thresholds clearly differ.</li>
          <li>Ignoring risk of bias (QUADAS-2) and applicability — partial verification and case–control designs inflate accuracy.</li>
          <li>Using funnel-plot tests designed for interventions; for DTA, Deeks’ test is the recommended option, and it too has low power.</li>
        </ul>
        <p>
          Comparing several tests is a network problem; network ideas are in <ModuleLink to="/learn/nma">Module 9</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'Meta-analyse sensitivity and specificity jointly with a bivariate or HSROC model.',
          'Report the summary point with confidence and prediction regions; use an SROC curve when thresholds vary.',
          'Positive correlation of logit sensitivity with logit FPR signals a threshold effect.',
          'Accuracy depends on spectrum and setting; translate results into post-test probabilities at realistic prevalences.',
          'Use exact-binomial models with sparse data, and simplify transparently if they fail.',
        ]}
      />
    </Lesson>
  )
}

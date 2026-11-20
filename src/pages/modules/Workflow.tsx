import { useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { CodeBlock } from '@/components/lesson/CodeBlock'
import { Segmented } from '@/components/ui/controls'
import { cn } from '@/lib/utils'

type Aim = 'pairwise' | 'multiple' | 'single' | 'dta'
type Outcome = 'binary' | 'cont-same' | 'cont-diff' | 'tte'
type Rarity = 'common' | 'rare' | 'zeros'
type K = '2' | '3-4' | '5-9' | '10+'

interface Rec {
  label: string
  value: ReactNode
}

function recommend(aim: Aim, outcome: Outcome, rarity: Rarity, k: K): { recs: Rec[]; code: string; modules: [string, string][] } {
  const few = k === '2' || k === '3-4'
  const recs: Rec[] = []
  let code = ''
  const modules: [string, string][] = []
  if (aim === 'dta') {
    recs.push(
      { label: 'Model', value: 'Bivariate random-effects (or HSROC) on logit sensitivity and specificity' },
      { label: 'Report', value: 'Summary sensitivity/specificity, 95% confidence and prediction regions; SROC curve if thresholds vary' },
      { label: 'Sparse data', value: 'Exact-binomial bivariate GLMM; simplify (ρ = 0, univariate) transparently if it fails' },
      { label: 'Small-study effects', value: 'Deeks’ test only if ≥10 studies; low power' },
    )
    code = 'library(mada)\nfit <- reitsma(dat)   # dat: TP, FN, FP, TN\nsummary(fit); plot(fit, predict = TRUE)'
    modules.push(['/learn/dta', 'Module 8'])
  } else if (aim === 'single') {
    recs.push(
      { label: 'Model', value: 'Random-intercept logistic regression (binomial–normal GLMM)' },
      { label: 'Sensitivity', value: 'Two-stage logit (REML + HKSJ); avoid Freeman–Tukey unless back-transformation is checked' },
      { label: 'Heterogeneity', value: 'Report τ (logit) and the prediction interval in %; I² will be high and uninformative' },
    )
    code = 'library(meta)\nm <- metaprop(event, n, studlab = study, method = "GLMM", sm = "PLOGIT", prediction = TRUE)\nsummary(m); forest(m)'
    modules.push(['/learn/proportions', 'Module 5'])
  } else {
    const measure =
      outcome === 'binary'
        ? 'Risk ratio or odds ratio (pool relative, report absolute effects at stated baseline risks)'
        : outcome === 'cont-same'
          ? 'Mean difference'
          : outcome === 'cont-diff'
            ? "Standardised mean difference (Hedges' g); re-express in a familiar scale"
            : 'Log hazard ratio from Cox models or O−E/V'
    recs.push({ label: 'Effect measure', value: measure })
    if (outcome === 'binary' && rarity !== 'common') {
      recs.push({
        label: 'Sparse-data method',
        value:
          rarity === 'rare'
            ? 'Peto OR if arms balanced and effect modest; otherwise Mantel–Haenszel without correction'
            : 'MH or GLMM (no corrections); exclude double-zero studies from OR/RR; never use RD for rare events',
      })
      modules.push(['/learn/binary-rare', 'Module 4'])
    }
    if (aim === 'multiple') {
      recs.push(
        { label: 'Model', value: 'Network meta-analysis (frequentist netmeta or Bayesian) after a documented transitivity assessment' },
        { label: 'Inconsistency', value: 'Node-splitting (local) and design-by-treatment (global); low power' },
        { label: 'Conclusions', value: 'GRADE minimally contextualised framework; CINeMA for confidence; no ranking without effects and certainty' },
      )
      code = 'library(netmeta)\nnet <- netmeta(TE, seTE, treat1, treat2, studlab, sm = "OR", random = TRUE)\nnetleague(net); netsplit(net); decomp.design(net)'
      modules.push(['/learn/nma', 'Module 9'])
    } else {
      recs.push({
        label: 'Model',
        value: few
          ? 'Random effects if heterogeneity is plausible, but with very few studies consider a Bayesian model with a weakly informative τ prior; present a common-effect analysis as sensitivity'
          : 'Random effects (REML τ²)',
      })
      recs.push({
        label: 'CI for the mean',
        value: k === '2' ? 'Wald (HKSJ with 2 studies is uninformative); interpret with great caution' : 'HKSJ if τ̂² > 0, otherwise Wald (Cochrane rule)',
      })
      recs.push({ label: 'Prediction interval', value: few ? 'Optional; very imprecise with < 5 studies' : 'Report it, with τ and I² (with CI)' })
      code =
        outcome === 'binary'
          ? `library(metafor)\ndat <- escalc("RR", ai = ai, n1i = n1, ci = ci, n2i = n2, slab = study)\nres <- rma(yi, vi, data = dat, method = "REML", test = "knha")\npredict(res, transf = exp); confint(res)`
          : `library(metafor)\ndat <- escalc("${outcome === 'cont-diff' ? 'SMD' : 'MD'}", m1i = m1, sd1i = sd1, n1i = n1, m2i = m2, sd2i = sd2, n2i = n2)\nres <- rma(yi, vi, data = dat, method = "REML", test = "knha")\npredict(res); confint(res)`
      modules.push(['/learn/pairwise', 'Module 2'], ['/learn/heterogeneity', 'Module 3'])
      if (few) modules.push(['/learn/bayesian', 'Module 10'])
    }
  }
  recs.push({
    label: 'Explaining heterogeneity',
    value: k === '10+' ? 'Pre-specified subgroups / meta-regression (≥10 studies per covariate), Knapp–Hartung' : 'Meta-regression not advised (< 10 studies); describe differences qualitatively',
  })
  recs.push({
    label: 'Missing evidence',
    value: k === '10+' ? 'ROB-ME; contour-enhanced funnel plot and an appropriate asymmetry test' : 'ROB-ME (registries, protocols); no funnel-plot tests with < 10 studies',
  })
  if (k === '10+') modules.push(['/learn/meta-regression', 'Module 6'], ['/learn/small-study', 'Module 7'])
  return { recs, code, modules }
}

function Chooser() {
  const [aim, setAim] = useState<Aim>('pairwise')
  const [outcome, setOutcome] = useState<Outcome>('binary')
  const [rarity, setRarity] = useState<Rarity>('common')
  const [k, setK] = useState<K>('5-9')
  const r = recommend(aim, outcome, rarity, k)
  return (
    <Lab title="Lab 1 · Method chooser" description="Answer four questions; the recommendation follows the guidance taught in Modules 1–10.">
      <div className="grid gap-4 md:grid-cols-2">
        <Segmented
          label="What are you synthesising?"
          value={aim}
          onChange={setAim}
          size="sm"
          options={[
            { value: 'pairwise', label: 'Two interventions' },
            { value: 'multiple', label: '≥3 interventions' },
            { value: 'single', label: 'Single-group proportion' },
            { value: 'dta', label: 'Test accuracy' },
          ]}
        />
        <Segmented label="Number of studies" value={k} onChange={setK} size="sm" options={(['2', '3-4', '5-9', '10+'] as K[]).map((v) => ({ value: v, label: v }))} />
        {(aim === 'pairwise' || aim === 'multiple') && (
          <Segmented
            label="Outcome"
            value={outcome}
            onChange={setOutcome}
            size="sm"
            options={[
              { value: 'binary', label: 'Binary' },
              { value: 'cont-same', label: 'Continuous, same scale' },
              { value: 'cont-diff', label: 'Continuous, different scales' },
              { value: 'tte', label: 'Time-to-event' },
            ]}
          />
        )}
        {(aim === 'pairwise' || aim === 'multiple') && outcome === 'binary' && (
          <Segmented
            label="Events"
            value={rarity}
            onChange={setRarity}
            size="sm"
            options={[
              { value: 'common', label: 'Not rare' },
              { value: 'rare', label: 'Rare (< 1%)' },
              { value: 'zeros', label: 'Zero cells / double zeros' },
            ]}
          />
        )}
      </div>
      <dl className="mt-5 divide-y rounded-lg border">
        {r.recs.map((x) => (
          <div key={x.label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[180px_1fr]">
            <dt className="text-sm font-semibold">{x.label}</dt>
            <dd className="text-sm text-foreground/90">{x.value}</dd>
          </div>
        ))}
      </dl>
      {r.code && <CodeBlock code={r.code} title="Starting point in R" />}
      <p className="text-sm text-muted-foreground">
        Revisit:{' '}
        {r.modules.map(([to, l], i) => (
          <span key={to}>
            {i > 0 && ' · '}
            <ModuleLink to={to}>{l}</ModuleLink>
          </span>
        ))}
      </p>
    </Lab>
  )
}

const STATEMENTS: { text: string; ok: boolean; why: string }[] = [
  {
    text: 'Because heterogeneity was not significant (Q test P = 0.12, I² = 35%), we used a fixed-effect model.',
    ok: false,
    why: 'The model must be chosen on conceptual grounds; the Q test has low power and Cochrane states the choice should never be based on a heterogeneity test.',
  },
  {
    text: 'The random-effects summary RR was 0.80 (95% CI 0.70 to 0.91; REML, HKSJ); τ = 0.12 and the 95% prediction interval was 0.58 to 1.10.',
    ok: true,
    why: 'Complete random-effects reporting: method, mean with CI, τ and prediction interval.',
  },
  {
    text: 'The pooled odds ratio of 0.60 shows that the intervention reduces the risk of relapse (control risk 45%) by 40%.',
    ok: false,
    why: 'With a common outcome the OR exaggerates the risk reduction. At 45% control risk, OR 0.60 corresponds to RR ≈ 0.73 — a 27% relative reduction.',
  },
  {
    text: 'Egger’s test (P = 0.03) in our 6 trials demonstrates publication bias.',
    ok: false,
    why: 'Funnel-plot tests need ≥10 studies, and asymmetry has causes other than publication bias. Use ROB-ME.',
  },
  {
    text: 'The effect differed by sex: significant in women (P = 0.01) but not in men (P = 0.30).',
    ok: false,
    why: 'Subgroups must be compared directly with an interaction test, not by their separate P values.',
  },
  {
    text: 'Two trials with no events in either arm were excluded from the odds-ratio meta-analysis and included in a risk-difference sensitivity analysis.',
    ok: true,
    why: 'Standard practice for double-zero studies, with a transparent sensitivity analysis.',
  },
  {
    text: 'Meta-regression across 6 trials showed that mean age significantly modified the effect (P = 0.04).',
    ok: false,
    why: 'Meta-regression should generally not be done with fewer than 10 studies; with 6 it is very prone to spurious findings and ecological bias.',
  },
  {
    text: 'Treatment D was the best treatment (SUCRA 92%).',
    ok: false,
    why: 'Rankings alone mislead. Report D’s effects against a reference with CIs and certainty (GRADE minimally contextualised approach).',
  },
  {
    text: 'Prevalence was pooled with a random-intercept logistic model; a two-stage logit analysis gave similar results.',
    ok: true,
    why: 'GLMM as primary analysis with a transparent sensitivity analysis.',
  },
  {
    text: 'I² was 92%, so the effect varies widely and the pooled estimate is meaningless.',
    ok: false,
    why: 'I² is relative and grows with study size. Look at τ and the prediction interval before judging how much effects vary.',
  },
]

function ErrorSpotter() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const done = Object.keys(answers).length
  const correct = STATEMENTS.filter((s, i) => answers[i] !== undefined && answers[i] === s.ok).length
  return (
    <Lab title="Lab 2 · Spot the error" description="Sentences of the kind found in published meta-analyses. Is each one acceptable?">
      <ol className="space-y-3">
        {STATEMENTS.map((s, i) => {
          const a = answers[i]
          const answered = a !== undefined
          const right = answered && a === s.ok
          return (
            <li key={i} className={cn('rounded-lg border p-3', answered && (right ? 'border-ok/50' : 'border-bad/50'))}>
              <p className="text-sm leading-6">“{s.text}”</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    disabled={answered}
                    onClick={() => setAnswers({ ...answers, [i]: v })}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium',
                      answered && a === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                      answered && a !== v && 'opacity-50',
                    )}
                  >
                    {v ? 'Acceptable' : 'Problem'}
                  </button>
                ))}
                {answered && (
                  <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', right ? 'text-ok' : 'text-bad')}>
                    {right ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {right ? 'Correct' : 'Not quite'}
                  </span>
                )}
              </div>
              {answered && <p className="mt-2 text-sm text-muted-foreground">{s.why}</p>}
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>
          Score: {correct}/{done} answered ({STATEMENTS.length} total)
        </span>
        <button type="button" onClick={() => setAnswers({})} className="text-primary hover:underline">
          Reset
        </button>
      </div>
    </Lab>
  )
}

const SECTIONS = [
  { id: 'protocol', title: 'Decide before you see the data' },
  { id: 'choose', title: 'Choosing the analysis' },
  { id: 'grade', title: 'From numbers to certainty (GRADE)' },
  { id: 'report', title: 'Reporting (PRISMA 2020)' },
  { id: 'errors', title: 'Common errors' },
]

export default function Workflow() {
  return (
    <Lesson
      id="workflow"
      sections={SECTIONS}
      refs={['cochrane-handbook', 'prisma2020', 'grade2008', 'rob-me', 'grade-nma-minimal', 'cinema', 'prisma-dta', 'prisma-nma']}
      objectives={[
        'Write the analysis section of a protocol that pre-specifies every key decision.',
        'Select an analysis for a given data situation and justify it.',
        'Map meta-analysis outputs onto GRADE certainty domains.',
        'Report a synthesis completely and recognise common errors in published work.',
      ]}
    >
      <Section id="protocol" title="Decide before you see the data">
        <p>Register a protocol (e.g. PROSPERO) that fixes, before results are known:</p>
        <ul>
          <li>Effect measures for each outcome, and how missing SDs, multi-arm trials and cluster trials will be handled.</li>
          <li>Model, τ² estimator, CI method and whether prediction intervals will be reported.</li>
          <li>Planned subgroup analyses / meta-regressions with rationale and expected direction (few, with ≥10 studies each).</li>
          <li>Sensitivity analyses (risk of bias, model and estimator, imputation) and how missing evidence will be assessed (ROB-ME).</li>
          <li>How certainty of evidence will be rated (GRADE) and what thresholds define important effects.</li>
        </ul>
        <Callout kind="key">
          <p>Most analytical errors are decisions made after seeing the data. Pre-specification is the cheapest protection against them.</p>
        </Callout>
      </Section>

      <Section id="choose" title="Choosing the analysis">
        <Chooser />
      </Section>

      <Section id="grade" title="From numbers to certainty (GRADE)">
        <p>
          GRADE rates certainty for each outcome as high, moderate, low or very low <Cite id="grade2008" />. Randomised evidence starts high and may be rated
          down for five domains, each of which uses outputs from this course:
        </p>
        <DataTable
          head={['GRADE domain', 'What to look at', 'Module']}
          rows={[
            ['Risk of bias', 'Study-level RoB; sensitivity analysis restricted to low-RoB studies', '2'],
            ['Inconsistency', 'Prediction interval relative to decision thresholds, τ, overlap of CIs, I² with its CI; unexplained after subgroup analysis', '3, 6'],
            ['Indirectness', 'Population, intervention, comparator, outcome; intransitivity in NMA', '9'],
            ['Imprecision', 'CI relative to decision thresholds; optimal information size; few events', '2, 4'],
            ['Publication bias', 'ROB-ME judgement; funnel plots and tests only when appropriate', '7'],
          ]}
        />
        <Callout kind="tip">
          <p>
            Present results in a Summary of Findings table with absolute effects per 1000 at relevant baseline risks. For NMA, rate certainty per comparison
            (e.g. with CINeMA <Cite id="cinema" />) and draw conclusions with the minimally contextualised framework <Cite id="grade-nma-minimal" />.
          </p>
        </Callout>
        <QuickCheck
          item={{
            id: 'wf-q1',
            q: 'Pooled RR 0.85 (95% CI 0.70 to 1.03); the decision threshold is RR 0.90. The 95% PI is 0.60 to 1.20 and I² = 45%. Which GRADE domains are most clearly of concern?',
            options: ['None', 'Imprecision only', 'Imprecision and inconsistency', 'Publication bias'],
            answer: 2,
            why: (
              <>
                The CI includes both important benefit and no effect (imprecision), and the prediction interval spans clinically different conclusions
                (inconsistency). Publication bias cannot be judged from these numbers.
              </>
            ),
          }}
        />
      </Section>

      <Section id="report" title="Reporting (PRISMA 2020)">
        <p>PRISMA 2020 <Cite id="prisma2020" /> expects, for every synthesis:</p>
        <ul>
          <li>The effect measure(s) and the methods used to prepare data (conversions, imputations).</li>
          <li>The model, the τ² estimator, the CI method and software (with version).</li>
          <li>Methods to explore heterogeneity and sensitivity analyses — pre-specified or post hoc.</li>
          <li>Methods to assess reporting bias and certainty of evidence.</li>
          <li>Results: summary estimate with CI, measures of heterogeneity (τ², I², prediction interval), and results of all sensitivity analyses.</li>
        </ul>
        <p>Use the extensions where relevant: PRISMA-DTA and PRISMA-NMA (an update of PRISMA-NMA is in development).</p>
      </Section>

      <Section id="errors" title="Common errors">
        <ErrorSpotter />
        <p>
          You have now covered the full course. Test yourself across all modules in the <ModuleLink to="/assessment">assessment</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'Pre-specify effect measures, models, estimators, subgroups and sensitivity analyses in a registered protocol.',
          'Choose methods from the data situation: outcome type, event frequency, number of studies, number of interventions.',
          'Translate prediction intervals, CIs and ROB-ME judgements into GRADE certainty ratings.',
          'Report every analytic choice and every sensitivity analysis (PRISMA 2020).',
        ]}
      />
    </Lesson>
  )
}

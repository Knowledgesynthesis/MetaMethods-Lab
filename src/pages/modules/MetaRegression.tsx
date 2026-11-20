import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { ScatterPlot } from '@/components/plots/ScatterPlot'
import { ForestPlot } from '@/components/plots/ForestPlot'
import { Legend, C } from '@/components/plots/core'
import { Segmented, SliderField, Stat } from '@/components/ui/controls'
import { DOSE_TRIALS } from '@/data/datasets'
import { binaryEffect } from '@/lib/stats/effectSizes'
import { metaRegression, subgroupAnalysis, type RegTau2, type RegTest } from '@/lib/stats/metaRegression'
import { rng } from '@/lib/stats/random'
import { fmt, fmtCI, fmtP } from '@/lib/utils'

const EFF = DOSE_TRIALS.map((s) => ({ ...s, ...binaryEffect(s, 'OR') }))
type Cov = 'dose' | 'year' | 'blinded'

function RegressionLab() {
  const [cov, setCov] = useState<Cov>('dose')
  const [method, setMethod] = useState<RegTau2>('REML')
  const [test, setTest] = useState<RegTest>('knha')
  const [k, setK] = useState(EFF.length)
  const data = EFF.slice(0, k)
  const xval = (s: (typeof EFF)[number]) => (cov === 'blinded' ? (s.blinded ? 1 : 0) : cov === 'dose' ? s.dose : s.year)
  const fit = useMemo(() => {
    try {
      return metaRegression(
        data.map((s) => s.yi),
        data.map((s) => s.vi),
        data.map((s) => [1, xval(s)]),
        { method, test },
      )
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cov, method, test])
  const xs = data.map(xval)
  const band = useMemo(() => {
    if (!fit) return []
    const lo = Math.min(...xs)
    const hi = Math.max(...xs)
    return Array.from({ length: 41 }, (_, i) => {
      const x = lo + ((hi - lo) * i) / 40
      const p = fit.predict([1, x])
      return { x, fit: p.fit, lo: p.ci[0], hi: p.ci[1] }
    })
  }, [fit, xs])
  const unit = cov === 'dose' ? 'per 10 mg' : cov === 'year' ? 'per 10 years' : 'blinded vs open'
  const scale = cov === 'blinded' ? 1 : 10
  return (
    <Lab
      title="Lab 1 · Meta-regression on study-level covariates"
      description="18 placebo-controlled trials; outcome log OR of response failure (below 0 favours the drug). Data were simulated with a true dose slope of −0.12 per 10 mg."
    >
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Covariate"
          value={cov}
          onChange={setCov}
          options={[
            { value: 'dose', label: 'Dose (mg)' },
            { value: 'year', label: 'Year' },
            { value: 'blinded', label: 'Blinded (0/1)' },
          ]}
        />
        <Segmented
          label="Residual τ²"
          value={method}
          onChange={setMethod}
          options={[
            { value: 'REML', label: 'REML' },
            { value: 'DL', label: 'Moments' },
            { value: 'FE', label: 'None (fixed)' },
          ]}
        />
        <Segmented
          label="Inference"
          value={test}
          onChange={setTest}
          options={[
            { value: 'knha', label: 'Knapp–Hartung (t/F)' },
            { value: 'z', label: 'Wald (z)' },
          ]}
        />
      </div>
      <div className="mt-3 max-w-sm">
        <SliderField label="Number of trials used (in publication order)" value={k} onChange={setK} min={5} max={EFF.length} step={1} />
      </div>
      {fit ? (
        <>
          <div className="mt-4">
            <ScatterPlot
              ariaLabel="Bubble plot of log odds ratio against covariate"
              points={data.map((s, i) => ({ x: xs[i] + (cov === 'blinded' ? (i % 5) * 0.03 - 0.06 : 0), y: s.yi, size: 1 / (s.vi + fit.tau2), label: `${s.study}: ${fmt(s.yi)}` }))}
              band={band}
              xLabel={cov === 'dose' ? 'Daily dose (mg)' : cov === 'year' ? 'Year of publication' : 'Blinded (0 = open label, 1 = blinded)'}
              yLabel="log odds ratio"
              yRef={0}
            />
            <Legend
              items={[
                { label: 'Trial (area ∝ random-effects weight)', color: C.blue },
                { label: 'Fitted line with 95% CI', color: C.orange, shape: 'line' },
              ]}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat
              label={`Slope (${unit})`}
              value={fmt(fit.beta[1] * scale, 3)}
              sub={`95% CI ${fmtCI([fit.ci[1][0] * scale, fit.ci[1][1] * scale], 3)}`}
              tone="primary"
            />
            <Stat label="P (slope)" value={fmtP(fit.pval[1])} sub={test === 'knha' ? `t test, ${fit.dfRes} df` : 'z test'} />
            <Stat label="Residual τ²" value={fmt(fit.tau2, 4)} sub={`I²res = ${fmt(fit.I2res, 0)}%`} />
            <Stat label="R² (τ² explained)" value={fit.R2 === null ? '—' : `${fmt(fit.R2, 0)}%`} sub={`QE = ${fmt(fit.QE, 1)}, p = ${fmtP(fit.QEp)}`} />
          </div>
          {k < 10 && <p className="mt-2 text-sm text-warn">Fewer than 10 studies: Cochrane advises that meta-regression should generally not be considered.</p>}
        </>
      ) : (
        <p className="mt-3 text-sm text-bad">Model cannot be fitted with these data.</p>
      )}
    </Lab>
  )
}

function SubgroupLab() {
  const res = useMemo(
    () =>
      subgroupAnalysis(
        EFF.map((s) => s.yi),
        EFF.map((s) => s.vi),
        EFF.map((s) => (s.blinded ? 'Blinded' : 'Open label')),
        { tau2Method: 'REML' },
      ),
    [],
  )
  return (
    <Lab title="Lab 2 · Subgroup analysis: blinded vs open-label trials" description="Separate random-effects analyses per subgroup, then a test for subgroup differences.">
      <ForestPlot
        rows={EFF.map((s) => ({ label: `${s.study}${s.blinded ? '' : ' (open)'}`, yi: s.yi, ci: [s.yi - 1.96 * Math.sqrt(s.vi), s.yi + 1.96 * Math.sqrt(s.vi)] as [number, number] }))}
        summaries={res.groups.map((g, i) => ({ label: `${g.label} (k = ${g.k})`, est: g.result.estimate, ci: g.result.ci, color: i ? 'hsl(var(--c-purple))' : 'hsl(var(--foreground))' }))}
        ratio
        xLabel="Odds ratio of failure (log scale)"
        favours={['drug', 'placebo']}
        showWeights={false}
      />
      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        {res.groups.map((g) => (
          <Stat
            key={g.label}
            label={g.label}
            value={`OR ${fmt(Math.exp(g.result.estimate))}`}
            sub={`95% CI ${fmtCI(g.result.ci, 2, Math.exp)}; p = ${fmtP(g.result.pval)}`}
          />
        ))}
        <Stat label="Test for subgroup differences" value={`Q = ${fmt(res.Qbetween, 2)}`} sub={`df = ${res.df}, p = ${fmtP(res.pval)}`} tone="primary" />
      </div>
    </Lab>
  )
}

interface FPRow {
  label: string
  rate: number
}

function falsePositives(k: number, tau: number, nSim: number, seed: number): FPRow[] {
  const r = rng(seed)
  const hits = [0, 0, 0]
  for (let s = 0; s < nSim; s++) {
    const vi = Array.from({ length: k }, () => 0.02 + 0.2 * r.uniform())
    const yi = vi.map((v) => r.normal(-0.3, Math.sqrt(v + tau * tau)))
    const x = Array.from({ length: k }, () => r.normal())
    const X = x.map((xi) => [1, xi])
    const fe = metaRegression(yi, vi, X, { method: 'FE', test: 'z' })
    const rz = metaRegression(yi, vi, X, { method: 'REML', test: 'z' })
    const kh = metaRegression(yi, vi, X, { method: 'REML', test: 'knha' })
    ;[fe, rz, kh].forEach((f, j) => {
      if (f.pval[1] < 0.05) hits[j]++
    })
  }
  return [
    { label: 'Fixed-effect meta-regression (z)', rate: (100 * hits[0]) / nSim },
    { label: 'Random-effects, Wald z', rate: (100 * hits[1]) / nSim },
    { label: 'Random-effects, Knapp–Hartung t', rate: (100 * hits[2]) / nSim },
  ]
}

function FalsePositiveLab() {
  const [k, setK] = useState(10)
  const [tau, setTau] = useState(0.3)
  const [res, setRes] = useState<FPRow[] | null>(null)
  const [seed, setSeed] = useState(3)
  return (
    <Lab title="Lab 3 · How often does a useless covariate look “significant”?" description="Each simulated meta-analysis has heterogeneity but a covariate of pure noise. The nominal false-positive rate is 5%.">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <SliderField label="Studies per meta-analysis" value={k} onChange={setK} min={5} max={30} />
        <SliderField label="True τ (unexplained heterogeneity)" value={tau} onChange={setTau} min={0} max={0.6} step={0.05} format={(v) => fmt(v)} />
        <button
          type="button"
          onClick={() => {
            setRes(falsePositives(k, tau, 400, seed))
            setSeed(seed + 1)
          }}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Play className="h-4 w-4" /> Simulate 400
        </button>
      </div>
      {res && (
        <DataTable
          className="mt-4"
          head={['Analysis', 'False-positive rate', 'Testing 10 such covariates: P(at least one “hit”)']}
          rows={res.map((r) => [
            r.label,
            <span key="r" className={r.rate > 7.5 ? 'text-bad' : 'text-ok'}>
              {fmt(r.rate, 1)}%
            </span>,
            `${fmt(100 * (1 - (1 - r.rate / 100) ** 10), 0)}%`,
          ])}
        />
      )}
    </Lab>
  )
}

const SECTIONS = [
  { id: 'why', title: 'Investigating heterogeneity' },
  { id: 'model', title: 'The meta-regression model' },
  { id: 'subgroups', title: 'Subgroup analyses' },
  { id: 'false', title: 'Spurious findings' },
  { id: 'credible', title: 'Is the effect modification credible?' },
]

export default function MetaRegression() {
  return (
    <Lesson
      id="meta-regression"
      sections={SECTIONS}
      refs={['cochrane-ch10', 'thompson2002', 'higgins2004', 'knapp2003', 'sharp1996', 'altman2003', 'iceman2020']}
      objectives={[
        'Fit and interpret a random-effects meta-regression: slope, residual τ², R².',
        'Run a subgroup analysis and test for subgroup differences correctly.',
        'Explain why fixed-effect meta-regression and multiple covariates produce false positives.',
        'Judge the credibility of a claimed effect modifier.',
      ]}
    >
      <Section id="why" title="Investigating heterogeneity">
        <p>
          Heterogeneity is information: effects may genuinely differ by dose, population or design. Subgroup analysis and meta-regression relate effect
          sizes to <strong>study-level</strong> characteristics. They are observational comparisons <em>across</em> studies — randomisation protects
          comparisons within trials, not between them.
        </p>
        <Callout kind="rule">
          <ul>
            <li>Meta-regression should generally not be considered when there are fewer than ten studies; ideally ≥10 studies per characteristic modelled.</li>
            <li>Pre-specify the characteristics, with a rationale, in the protocol.</li>
            <li>Compare subgroups directly (test for interaction); never compare their separate P values <Cite id="cochrane-ch10" />.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="model" title="The meta-regression model">
        <Tex block>{'\\hat\\theta_i=\\beta_0+\\beta_1x_i+u_i+\\varepsilon_i,\\qquad u_i\\sim N(0,\\tau^2_{\\mathrm{res}}),\\quad \\varepsilon_i\\sim N(0,v_i)'}</Tex>
        <p>
          <Tex>{'\\beta_1'}</Tex> is the change in effect per unit of <Tex>{'x'}</Tex>. Residual heterogeneity <Tex>{'\\tau^2_{\\mathrm{res}}'}</Tex> must be
          modelled (random-effects meta-regression); ignoring it is the classic error <Cite id="thompson2002" />. The proportion of between-study variance
          explained is
        </p>
        <Tex block>{'R^2=\\max\\left(0,\\;\\frac{\\hat\\tau^2_0-\\hat\\tau^2_{\\mathrm{res}}}{\\hat\\tau^2_0}\\right)'}</Tex>
        <p>
          where <Tex>{'\\hat\\tau^2_0'}</Tex> comes from the model without covariates. Inference should use the Knapp–Hartung adjustment (t and F
          distributions), which keeps the false-positive rate near nominal <Cite id="knapp2003" /> <Cite id="higgins2004" />.
        </p>
        <RegressionLab />
        <Predict
          prompt="With all 18 trials and the dose model, switch residual τ² to “None (fixed)” and inference to Wald (z). What happens to the slope’s CI?"
          options={['Narrower', 'About the same', 'Wider']}
          reveal={
            <>
              Narrower (about −0.13 to −0.05 per 10 mg instead of −0.15 to −0.04): ignoring residual heterogeneity treats unexplained between-study variation
              as if it did not exist, overstating precision. Now return to REML and reduce to 10 trials: R² jumps to 100% only because the residual τ² is
              estimated as 0 — with few studies R² is very unstable.
            </>
          }
        />
        <Callout kind="pitfall" title="Ecological bias and confounding">
          <ul>
            <li>
              A study-level association (mean age vs effect) need not hold for individuals within studies. Patient-level effect modification needs
              within-study (ideally individual participant) data.
            </li>
            <li>Study characteristics travel together (newer trials use higher doses and better blinding), so any single covariate may be a proxy.</li>
            <li>
              Regressing effects on the <em>observed</em> control-group risk is biased by regression to the mean, because the same data appear on both axes{' '}
              <Cite id="sharp1996" />.
            </li>
          </ul>
        </Callout>
      </Section>

      <Section id="subgroups" title="Subgroup analyses">
        <p>
          A subgroup analysis is a meta-regression on a categorical covariate. Pool within each subgroup, then test whether subgroup means differ:
        </p>
        <Tex block>{'Q_{\\mathrm{between}}=\\sum_{g} w_g(\\hat\\mu_g-\\bar\\mu)^2\\sim\\chi^2_{G-1},\\qquad w_g=1/\\mathrm{SE}(\\hat\\mu_g)^2'}</Tex>
        <SubgroupLab />
        <QuickCheck
          item={{
            id: 'mr-q1',
            q: 'In men the pooled RR is 0.75 (p = 0.01); in women 0.85 (p = 0.20). What can you conclude about sex as an effect modifier?',
            options: [
              'The treatment works in men but not in women.',
              'Nothing until the subgroups are compared directly with a test for interaction.',
              'Sex modifies the effect because one P value is significant and the other is not.',
              'The analysis should be repeated with a fixed-effect model.',
            ],
            answer: 1,
            why: (
              <>
                “Significant in one, not in the other” is not evidence of a difference <Cite id="altman2003" />. The CIs overlap heavily; the interaction test
                would very likely be non-significant. Differences in power (women may be fewer) easily produce this pattern.
              </>
            ),
          }}
        />
      </Section>

      <Section id="false" title="Spurious findings">
        <p>
          With few studies, many candidate covariates and unexplained heterogeneity, meta-regression generates false positives readily. Fixed-effect
          meta-regression ignores residual τ² entirely; even random-effects meta-regression with Wald tests is anti-conservative <Cite id="higgins2004" />.
        </p>
        <FalsePositiveLab />
        <Predict
          prompt="With 10 studies and τ = 0.3, what false-positive rate will fixed-effect meta-regression show?"
          options={['≈ 5%', '≈ 10%', '≥ 20%']}
          reveal={
            <>
              Around 20% in our simulations — four times the nominal rate — because the model mistakes unexplained heterogeneity for covariate effects.
              Random-effects with Wald tests gives about 7–9%, Knapp–Hartung about 5–7%. Test ten covariates and a spurious “finding” becomes likely —
              hence pre-specification and few covariates.
            </>
          }
        />
      </Section>

      <Section id="credible" title="Is the effect modification credible?">
        <p>Use a structured instrument such as ICEMAN <Cite id="iceman2020" />. Key questions:</p>
        <ol>
          <li>Was the analysis pre-specified with a stated direction?</li>
          <li>Is the comparison within studies (stronger) or between studies (weaker)?</li>
          <li>Is the interaction statistically convincing and the number of analyses small?</li>
          <li>Is the effect consistent across related outcomes and supported by external evidence or biology?</li>
          <li>Is the difference large enough to change decisions?</li>
        </ol>
        <p>
          Funnel-plot asymmetry is itself a form of effect modification — by study size. That is <ModuleLink to="/learn/small-study">Module 7</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'Subgroup analysis and meta-regression are observational, across-study comparisons.',
          'Model residual heterogeneity (random effects) and use Knapp–Hartung inference.',
          'Need ≥10 studies (per covariate); pre-specify a few covariates with a rationale.',
          'Compare subgroups with a test for interaction, not with separate P values.',
          'Beware ecological bias, confounding between study characteristics, and regression on observed baseline risk.',
        ]}
      />
    </Lesson>
  )
}

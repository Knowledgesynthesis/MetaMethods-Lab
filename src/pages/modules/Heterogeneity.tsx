import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { ForestPlot } from '@/components/plots/ForestPlot'
import { AxisBottom, C, linear, niceTicks, useWidth } from '@/components/plots/core'
import { Segmented, SliderField, Stat } from '@/components/ui/controls'
import { BP_TRIALS, MORTALITY_TRIALS } from '@/data/datasets'
import { binaryEffect, meanDifference } from '@/lib/stats/effectSizes'
import { metaAnalysis, type Tau2Method } from '@/lib/stats/pairwise'
import { qnorm } from '@/lib/stats/distributions'
import { rng } from '@/lib/stats/random'
import { fmt, fmtCI } from '@/lib/utils'

// ------------------------------------------------------------------ Lab 1: I² is not absolute
const K = 10
const BASE_SE = [0.32, 0.18, 0.26, 0.4, 0.22, 0.3, 0.2, 0.36, 0.24, 0.28]
const Q_TRUE = Array.from({ length: K }, (_, i) => qnorm((i + 0.5) / K))
const NOISE = [0.6, -1.1, 0.2, 1.3, -0.4, -0.9, 0.9, -0.2, 0.4, -0.7]
const ORDER = [3, 7, 1, 9, 0, 5, 8, 2, 6, 4]

function I2Lab() {
  const [tau, setTau] = useState(0.15)
  const [log2n, setLog2n] = useState(0)
  const mult = 2 ** log2n
  const data = useMemo(() => {
    const se = BASE_SE.map((s) => s / Math.sqrt(mult))
    const yi = se.map((s, i) => -0.3 + tau * Q_TRUE[ORDER[i]] + s * NOISE[i])
    const r = metaAnalysis(
      yi,
      se.map((s) => s * s),
    )
    return { se, yi, r }
  }, [tau, mult])
  const { r } = data
  return (
    <Lab
      title="Lab 1 · I² is not an absolute measure"
      description="Ten studies whose true effects spread with a fixed SD τ. Make every study bigger and watch I² — but not τ — change."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SliderField label="True between-study SD (τ)" value={tau} onChange={setTau} min={0} max={0.5} step={0.01} format={(v) => fmt(v)} />
        <SliderField
          label="Study size (all studies)"
          value={log2n}
          onChange={setLog2n}
          min={-2}
          max={5}
          step={0.5}
          format={(v) => `×${fmt(2 ** v, 2)}`}
          hint="Within-study variance falls as studies grow; τ is unchanged."
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="I²" value={`${fmt(r.I2, 0)}%`} tone="primary" sub={r.I2CI ? `95% CI ${fmt(r.I2CI[0], 0)}–${fmt(r.I2CI[1], 0)}%` : ''} />
        <Stat label="τ (estimated)" value={fmt(r.tau, 3)} sub={`true τ = ${fmt(tau, 2)}`} />
        <Stat label="Typical within-study SD" value={fmt(Math.sqrt(r.s2), 3)} />
        <Stat label="Prediction interval (log OR)" value={r.pi ? fmtCI(r.pi, 2) : '—'} />
      </div>
      <div className="mt-4">
        <ForestPlot
          rows={data.yi.map((y, i) => ({ label: `Study ${i + 1}`, yi: y, ci: r.studyCI[i], weight: r.weights[i] }))}
          summaries={[{ label: 'Random effects', est: r.estimate, ci: r.ci, pi: r.pi }]}
          xLabel="log odds ratio"
          showWeights={false}
        />
      </div>
    </Lab>
  )
}

// ------------------------------------------------------------------ Lab 2: estimator comparison
const DATASETS = {
  bp: {
    name: 'Blood pressure (MD)',
    rows: BP_TRIALS.map((s) => meanDifference(s.t, s.c)),
  },
  mort: {
    name: 'Mortality (log RR)',
    rows: MORTALITY_TRIALS.map((s) => binaryEffect(s, 'RR')),
  },
  few: {
    name: 'Three small trials (MD)',
    rows: [
      { yi: -9, vi: 3.2 ** 2 },
      { yi: -1, vi: 2.8 ** 2 },
      { yi: -6, vi: 3.6 ** 2 },
    ],
  },
  mixed: {
    name: 'One mega-trial + small trials',
    rows: [
      { yi: -0.05, vi: 0.03 ** 2 },
      { yi: -0.45, vi: 0.2 ** 2 },
      { yi: -0.6, vi: 0.25 ** 2 },
      { yi: -0.3, vi: 0.22 ** 2 },
      { yi: -0.7, vi: 0.3 ** 2 },
      { yi: -0.4, vi: 0.18 ** 2 },
    ],
  },
} as const

function EstimatorLab() {
  const [ds, setDs] = useState<keyof typeof DATASETS>('mixed')
  const rows = DATASETS[ds].rows
  const table = useMemo(() => {
    const yi = rows.map((r) => r.yi)
    const vi = rows.map((r) => r.vi)
    return (['DL', 'REML', 'PM', 'ML'] as Tau2Method[]).map((m) => {
      const wald = metaAnalysis(yi, vi, { tau2Method: m, ciMethod: 'wald' })
      const hk = metaAnalysis(yi, vi, { tau2Method: m, ciMethod: 'hksj' })
      return { m, wald, hk }
    })
  }, [rows])
  return (
    <Lab title="Lab 2 · Same data, different τ² estimators" description="Estimators disagree most when study sizes are very unequal or k is small.">
      <Segmented
        value={ds}
        onChange={setDs}
        options={Object.entries(DATASETS).map(([k, v]) => ({ value: k as keyof typeof DATASETS, label: v.name }))}
        size="sm"
      />
      <DataTable
        className="mt-4"
        head={['Estimator', 'τ²', 'I²', 'Mean', '95% CI (Wald)', '95% CI (HKSJ)', '95% PI (HKSJ rule)']}
        rows={table.map(({ m, wald, hk }) => [
          m === 'REML' ? 'REML (default)' : m,
          fmt(wald.tau2, 4),
          `${fmt(wald.I2, 1)}%`,
          fmt(wald.estimate, 3),
          fmtCI(wald.ci, 3),
          fmtCI(hk.ci, 3),
          hk.pi ? fmtCI(hk.pi, 3) : '—',
        ])}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        All values are checked against metafor. Note two patterns: τ² estimates can differ two- to three-fold, with ML systematically smallest (it ignores the
        degree of freedom used to estimate the mean; REML corrects this), yet the pooled means barely move — “substantial differences in estimates of
        heterogeneity, but seldom major implications for estimating summary effects” <Cite id="cochrane-ch10" />. The prediction interval, which depends on
        τ², is where the choice matters.
      </p>
    </Lab>
  )
}

// ------------------------------------------------------------------ Lab 3: coverage simulation
interface SimResult {
  method: string
  short: string
  coverage: number
  width: number
}

function simulate(k: number, tau: number, nSim: number, seed: number): SimResult[] {
  const r = rng(seed)
  const methods = [
    { method: 'DL + Wald (old RevMan default)', short: 'DL + Wald', opts: { tau2Method: 'DL' as const, ciMethod: 'wald' as const } },
    { method: 'REML + Wald', short: 'REML + Wald', opts: { tau2Method: 'REML' as const, ciMethod: 'wald' as const } },
    { method: 'REML + HKSJ', short: 'REML + HKSJ', opts: { tau2Method: 'REML' as const, ciMethod: 'hksj' as const } },
    { method: 'Cochrane rule (REML; HKSJ if τ̂² > 0 and k > 2)', short: 'Cochrane rule', opts: null },
  ]
  const cover = methods.map(() => 0)
  const widths: number[][] = methods.map(() => [])
  for (let s = 0; s < nSim; s++) {
    const vi = Array.from({ length: k }, () => 0.01 + 0.15 * r.uniform() ** 2)
    const yi = vi.map((v) => r.normal(0, Math.sqrt(v + tau * tau)))
    methods.forEach((m, j) => {
      let res = m.opts ? metaAnalysis(yi, vi, m.opts) : metaAnalysis(yi, vi, { tau2Method: 'REML', ciMethod: 'wald' })
      if (!m.opts && res.tau2 > 0 && k > 2) res = metaAnalysis(yi, vi, { tau2Method: 'REML', ciMethod: 'hksj' })
      if (res.ci[0] <= 0 && res.ci[1] >= 0) cover[j]++
      widths[j].push(res.ci[1] - res.ci[0])
    })
  }
  return methods.map((m, j) => {
    const w = widths[j].sort((a, b) => a - b)
    return { method: m.method, short: m.short, coverage: (100 * cover[j]) / nSim, width: w[Math.floor(w.length / 2)] }
  })
}

function CoverageLab() {
  const [k, setK] = useState(5)
  const [tau, setTau] = useState(0.2)
  const [res, setRes] = useState<SimResult[] | null>(null)
  const [seed, setSeed] = useState(1)
  const [ref, width] = useWidth<HTMLDivElement>()
  const run = () => {
    setRes(simulate(k, tau, 1000, seed))
    setSeed(seed + 1)
  }
  const h = 200
  const m = { l: 112, r: 56, t: 10, b: 36 }
  const x = linear([50, 100], [m.l, Math.max(m.l + 50, width - m.r)])
  return (
    <Lab
      title="Lab 3 · Do 95% confidence intervals really cover 95% of the time?"
      description="Simulate 1000 meta-analyses with a known true mean of 0 and count how often each interval contains it."
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <SliderField label="Number of studies (k)" value={k} onChange={setK} min={2} max={20} step={1} />
        <SliderField label="True τ (log OR scale)" value={tau} onChange={setTau} min={0} max={0.6} step={0.05} format={(v) => fmt(v)} />
        <button type="button" onClick={run} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Play className="h-4 w-4" /> Run 1000 simulations
        </button>
      </div>
      <div ref={ref} className="mt-4">
        {res ? (
          <>
            <svg width={width} height={h} role="img" aria-label="Coverage of confidence-interval methods">
              <AxisBottom scale={x} y={h - m.b} ticks={niceTicks(50, 100, 5)} format={(v) => `${v}%`} label="Coverage of the true mean" />
              <line x1={x(95)} x2={x(95)} y1={m.t} y2={h - m.b} stroke={C.green} strokeDasharray="4 3" strokeWidth={2} />
              {res.map((r, i) => {
                const y = m.t + i * 38 + 6
                const good = r.coverage >= 93
                return (
                  <g key={r.method}>
                    <text x={m.l - 8} y={y + 16} textAnchor="end" fontSize={12} fill={C.fg}>
                      {r.short}
                    </text>
                    <rect x={x(50)} y={y} width={Math.max(0, x(Math.max(50, r.coverage)) - x(50))} height={24} rx={3} fill={good ? C.green : C.vermillion} opacity={0.8} />
                    <text x={x(Math.max(50, r.coverage)) + 6} y={y + 16} fontSize={12} fill={C.fg} className="num">
                      {fmt(r.coverage, 1)}%
                    </text>
                  </g>
                )
              })}
            </svg>
            <DataTable head={['Method', 'Coverage', 'Median CI width']} rows={res.map((r) => [r.method, `${fmt(r.coverage, 1)}%`, fmt(r.width, 3)])} />
            <p className="mt-2 text-xs text-muted-foreground">Monte Carlo error ≈ ±1.4 percentage points. Press run again for a new seed.</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Set k and τ, then run. Try k = 3 with τ = 0.3, then k = 20 with τ = 0.</p>
        )}
      </div>
    </Lab>
  )
}

const SECTIONS = [
  { id: 'q', title: 'Cochran’s Q' },
  { id: 'tau', title: 'τ² and the prediction interval' },
  { id: 'i2', title: 'I² — useful, but relative' },
  { id: 'estimators', title: 'Estimating τ²' },
  { id: 'few', title: 'The few-studies problem' },
  { id: 'report', title: 'What to report' },
]

export default function Heterogeneity() {
  return (
    <Lesson
      id="heterogeneity"
      sections={SECTIONS}
      refs={[
        'cochrane-ch10',
        'cochrane-re-explainer',
        'higgins2002',
        'higgins2009',
        'borenstein2017',
        'rucker2008',
        'veroniki2016',
        'langan2019',
        'viechtbauer2007',
        'inthout2014',
        'rover2015',
        'wiksten2016',
        'inthout2016',
      ]}
      objectives={[
        'Compute and interpret Q, τ², τ, I² and a prediction interval.',
        'Explain why I² depends on study size and τ does not.',
        'Choose a τ² estimator and confidence-interval method following current Cochrane guidance.',
        'Recognise when few studies make random-effects inference unreliable.',
      ]}
    >
      <Section id="q" title="Cochran’s Q">
        <p>Q measures how far study estimates scatter around the common-effect estimate, in units of their own sampling error:</p>
        <Tex block>{'Q=\\sum_{i=1}^{k} w_i(\\hat\\theta_i-\\hat\\theta_{\\mathrm{CE}})^2 \\;\\sim\\; \\chi^2_{k-1}\\ \\text{under homogeneity}'}</Tex>
        <p>
          With homogeneity, Q is expected to equal its degrees of freedom, <Tex>{'k-1'}</Tex>. The test has low power with few studies (hence the occasional
          use of P &lt; 0.10) and excessive power with many large ones. Neither a non-significant Q nor a significant one tells you whether heterogeneity
          matters clinically <Cite id="cochrane-ch10" />.
        </p>
      </Section>

      <Section id="tau" title="τ² and the prediction interval">
        <p>
          τ² is the variance of the true effects; τ is their standard deviation, in the units of the effect measure (log OR, mmHg…). τ is what tells you{' '}
          <em>how much</em> effects vary. Its most interpretable form is the 95% prediction interval for the true effect in a new comparable study{' '}
          <Cite id="higgins2009" />. Current Cochrane implementation <Cite id="cochrane-ch10" />:
        </p>
        <Tex block>{'\\hat\\mu \\pm c\\,\\sqrt{\\hat\\tau^2+\\mathrm{SE}(\\hat\\mu)^2},\\qquad c=\\begin{cases}t_{k-1,\\,0.975} & \\text{HKSJ CI}\\\\ z_{0.975}=1.96 & \\text{Wald CI}\\end{cases}'}</Tex>
        <p>
          Using the same multiplier as the CI makes the PI equal the CI when <Tex>{'\\hat\\tau^2=0'}</Tex>. (Higgins et al. 2009 originally used{' '}
          <Tex>{'t_{k-2}'}</Tex>; R’s metafor and meta implement both.)
        </p>
        <Callout kind="evidence">
          <p>
            Among 479 statistically significant Cochrane meta-analyses with heterogeneity, the 95% prediction interval was compatible with no effect or an
            opposite effect in 72%, and in 20% it extended to a clearly opposite effect <Cite id="inthout2016" />. A CI alone routinely overstates how
            consistently an intervention works.
          </p>
        </Callout>
      </Section>

      <Section id="i2" title="I² — useful, but relative">
        <p>I² is the proportion of total variability in the estimates that is due to between-study heterogeneity rather than sampling error:</p>
        <Tex block>{'I^2=\\frac{\\hat\\tau^2}{\\hat\\tau^2+s^2}\\times100\\%,\\qquad s^2=\\frac{(k-1)\\sum w_i}{(\\sum w_i)^2-\\sum w_i^2}'}</Tex>
        <p>
          where <Tex>{'s^2'}</Tex> is the “typical” within-study variance <Cite id="higgins2002" />. With the DL estimator this equals the familiar{' '}
          <Tex>{'(Q-(k-1))/Q'}</Tex>. Because the denominator contains <Tex>{'s^2'}</Tex>, I² rises as studies get larger even if τ² is unchanged{' '}
          <Cite id="rucker2008" /> <Cite id="borenstein2017" />.
        </p>
        <I2Lab />
        <Predict
          prompt="Set τ = 0.15. Increase the study size from ×1 to ×32. What happens to I² and to τ?"
          options={['Both stay the same', 'I² rises, τ stays ~0.15', 'Both rise']}
          reveal={
            <>
              I² climbs towards 100% while the estimated τ stays near 0.15: the <em>amount</em> of heterogeneity is unchanged, only the sampling error has
              shrunk. The prediction interval — driven by τ — barely moves. This is why “I² = 90%” does not mean “effects vary a lot”.
            </>
          }
        />
        <Callout kind="rule" title="Cochrane’s rough guide to I² (overlapping on purpose)">
          <ul>
            <li>0% to 40%: might not be important</li>
            <li>30% to 60%: may represent moderate heterogeneity</li>
            <li>50% to 90%: may represent substantial heterogeneity</li>
            <li>75% to 100%: considerable heterogeneity</li>
          </ul>
          <p>
            Importance depends on the magnitude and direction of effects and the strength of evidence for heterogeneity (P value or CI for I²){' '}
            <Cite id="cochrane-ch10" />. The fixed 25/50/75% labels of 2003 <Cite id="higgins2003" /> are no longer the recommended reading.
          </p>
        </Callout>
        <QuickCheck
          item={{
            id: 'het-q1',
            q: 'Meta-analysis A (five small trials) has I² = 30%; meta-analysis B (five mega-trials) has I² = 85%. Both report τ = 0.10 on the log RR scale. Which has more variation in true effects?',
            options: ['A', 'B', 'They have the same', 'Cannot compare I² across meta-analyses'],
            answer: 2,
            why: (
              <>
                τ, not I², measures the spread of true effects, and it is the same. B’s higher I² reflects its far smaller within-study variances. (A τ of 0.10
                means true RRs roughly between e<sup>−0.2</sup> and e<sup>+0.2</sup> times the mean — modest.)
              </>
            ),
          }}
        />
      </Section>

      <Section id="estimators" title="Estimating τ²">
        <p>
          The DerSimonian–Laird moment estimator was the only option in RevMan until 2024. It is simple, but in simulations it tends to underestimate τ²
          when heterogeneity is large and study sizes vary, and its Wald interval undercovers. Simulation studies favour REML or Paule–Mandel, while noting no estimator is universally best <Cite id="langan2019" />{' '}
          <Cite id="veroniki2016" />. RevMan now uses <strong>REML by default</strong>; the Q-profile method gives a CI for τ² <Cite id="viechtbauer2007" />{' '}
          <Cite id="cochrane-re-explainer" />.
        </p>
        <EstimatorLab />
      </Section>

      <Section id="few" title="The few-studies problem">
        <p>
          The Wald CI, <Tex>{'\\hat\\mu\\pm1.96\\,\\mathrm{SE}'}</Tex>, treats τ² as known. With few studies τ² is very uncertain, and the interval is too narrow{' '}
          <Cite id="inthout2014" />. The Hartung–Knapp–Sidik–Jonkman (HKSJ) method rescales the variance by the observed scatter and uses a{' '}
          <Tex>{'t_{k-1}'}</Tex> quantile:
        </p>
        <Tex block>{'\\widehat{\\mathrm{Var}}_{\\mathrm{HK}}(\\hat\\mu)=\\frac{\\sum w_i^*(\\hat\\theta_i-\\hat\\mu)^2}{(k-1)\\sum w_i^*},\\qquad \\hat\\mu\\pm t_{k-1,0.975}\\sqrt{\\widehat{\\mathrm{Var}}_{\\mathrm{HK}}}'}</Tex>
        <Callout kind="rule" title="Current Cochrane / RevMan rule">
          <ul>
            <li>
              τ̂² &gt; 0 and more than two studies → <strong>HKSJ</strong>.
            </li>
            <li>
              τ̂² = 0, or only two studies → <strong>Wald</strong>. (HKSJ can be too narrow when τ̂² = 0 <Cite id="wiksten2016" />, and absurdly wide with k = 2,
              where <Tex>{'t_1=12.7'}</Tex> <Cite id="rover2015" />.)
            </li>
            <li>With two or three studies, consider a sensitivity analysis — or a Bayesian analysis with a weakly informative prior on τ (Module 10).</li>
          </ul>
        </Callout>
        <CoverageLab />
        <Predict
          prompt="With k = 3 and τ = 0.3, what coverage do you expect from the DL + Wald interval?"
          options={['≈ 95%', '≈ 90%', '≈ 80% or lower']}
          reveal={
            <>
              About 83% in our simulations: roughly one in six “95%” intervals misses the true mean. HKSJ brings coverage back to about 92–94%, at the
              price of wider intervals. With k = 20 the methods converge. Run it to see the numbers for your settings.
            </>
          }
        />
      </Section>

      <Section id="report" title="What to report">
        <DataTable
          head={['Quantity', 'Why', 'Example']}
          rows={[
            ['Mean effect + 95% CI (method stated)', 'Average effect and its uncertainty', 'RR 0.80 (0.70 to 0.91), REML, HKSJ'],
            ['τ (or τ²) with Q-profile CI', 'Absolute amount of heterogeneity', 'τ = 0.12 (0.00 to 0.31)'],
            ['95% prediction interval', 'Range of effects in a new setting', '0.58 to 1.10'],
            ['I² with CI', 'Share of variability from heterogeneity', '42% (0% to 75%)'],
            ['Q, df, P', 'Test of homogeneity (low power)', 'Q = 15.6, df = 9, P = 0.08'],
          ]}
        />
        <p className="mt-4">
          Then try to <em>explain</em> heterogeneity with pre-specified subgroups or covariates — <ModuleLink to="/learn/meta-regression">Module 6</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'τ measures how much true effects vary; the prediction interval translates it into the outcome scale.',
          'I² is a proportion that grows with study size; never read it as an absolute amount of heterogeneity.',
          'Use REML (or Paule–Mandel) rather than DerSimonian–Laird.',
          'With τ̂² > 0 and k > 2 use the HKSJ interval; with very few studies, interpret any random-effects result with great caution.',
          'Never choose between common and random effects on the basis of Q or I².',
        ]}
      />
    </Lesson>
  )
}

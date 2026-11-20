import { useMemo, useState } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { ForestPlot } from '@/components/plots/ForestPlot'
import { SliderField, Toggle } from '@/components/ui/controls'
import { DEFAULT_SETTINGS, MetaSettings, type MetaSettingsState } from '@/components/labs/MetaSettings'
import { ResultsPanel } from '@/components/labs/ResultsPanel'
import { useMeta, type StudyRow } from '@/components/labs/useMeta'
import { Sandbox } from '@/components/labs/Sandbox'
import { BP_TRIALS, MORTALITY_TRIALS } from '@/data/datasets'
import { binaryEffect, meanDifference } from '@/lib/stats/effectSizes'
import { fmt } from '@/lib/utils'

interface Preset {
  name: string
  ratio: boolean
  xLabel: string
  favours: [string, string]
  rows: StudyRow[]
}

const bp: StudyRow[] = BP_TRIALS.map((s) => {
  const e = meanDifference(s.t, s.c)
  return { label: s.study, yi: e.yi, sei: Math.sqrt(e.vi) }
})
const mort: StudyRow[] = MORTALITY_TRIALS.map((s) => {
  const e = binaryEffect(s, 'RR')
  return { label: s.study, yi: e.yi, sei: Math.sqrt(e.vi) }
})

const PRESETS: Preset[] = [
  { name: 'Blood pressure (MD)', ratio: false, xLabel: 'Mean difference in SBP (mmHg)', favours: ['drug', 'placebo'], rows: bp },
  { name: 'Mortality (RR)', ratio: true, xLabel: 'Risk ratio (log scale)', favours: ['new strategy', 'usual care'], rows: mort },
  {
    name: 'One outlier',
    ratio: false,
    xLabel: 'Mean difference',
    favours: ['treatment', 'control'],
    rows: [...bp.slice(0, 7), { label: 'Outlier 2021', yi: 6, sei: 1.4 }],
  },
  {
    name: 'Three small trials',
    ratio: false,
    xLabel: 'Mean difference',
    favours: ['treatment', 'control'],
    rows: [
      { label: 'Small A', yi: -9, sei: 3.2 },
      { label: 'Small B', yi: -1, sei: 2.8 },
      { label: 'Small C', yi: -6, sei: 3.6 },
    ],
  },
]

function Playground() {
  const [presetIdx, setPresetIdx] = useState(0)
  const preset = PRESETS[presetIdx]
  const [rows, setRows] = useState<StudyRow[]>(preset.rows)
  const [sel, setSel] = useState<number | null>(null)
  const [settings, setSettings] = useState<MetaSettingsState>(DEFAULT_SETTINGS)
  const [compare, setCompare] = useState(true)
  const res = useMeta(rows, settings)
  const base = useMemo(() => preset.rows, [preset])
  const range = useMemo(() => {
    const ys = base.map((r) => r.yi)
    const span = Math.max(...ys) - Math.min(...ys) || 1
    return [Math.min(...ys) - 1.5 * span, Math.max(...ys) + 1.5 * span] as [number, number]
  }, [base])

  const load = (i: number) => {
    setPresetIdx(i)
    setRows(PRESETS[i].rows)
    setSel(null)
  }
  const update = (i: number, patch: Partial<StudyRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const selRow = sel !== null ? rows[sel] : null
  const baseSE = sel !== null && base[sel] ? base[sel].sei : selRow?.sei ?? 1
  const sizeMult = selRow ? (baseSE / selRow.sei) ** 2 : 1

  return (
    <Lab
      title="Lab · Forest-plot playground"
      description="Click a study to edit it. Every statistic is recomputed with the same algorithms as R's metafor."
      actions={
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => load(i)}
              className={`rounded-full border px-2.5 py-1 text-xs ${i === presetIdx ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <MetaSettings value={settings} onChange={setSettings} />
        <Toggle checked={compare} onChange={setCompare} label="Show both models" />
      </div>
      {res && (
        <div className="mt-4">
          <ForestPlot
            rows={rows.map((r, i) => ({ label: r.label, yi: r.yi, ci: res.studyCI[i], weight: res.weights[i] }))}
            summaries={[
              ...(settings.model === 'random' || compare
                ? [{ label: 'Random effects', est: res.random.estimate, ci: res.random.ci, pi: settings.model === 'random' ? res.pi : null, color: 'hsl(var(--foreground))' }]
                : []),
              ...(settings.model === 'common' || compare
                ? [{ label: 'Common effect', est: res.common.estimate, ci: res.common.ci, color: 'hsl(var(--c-purple))' }]
                : []),
            ]}
            ratio={preset.ratio}
            xLabel={preset.xLabel}
            favours={preset.favours}
            highlight={sel}
            onRowClick={(i) => setSel(sel === i ? null : i)}
          />
        </div>
      )}
      <div className="mt-4 space-y-4">
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          {selRow && sel !== null ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Editing: {selRow.label}</div>
                <button
                  type="button"
                  onClick={() => {
                    setRows(rows.filter((_, j) => j !== sel))
                    setSel(null)
                  }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-bad hover:bg-bad/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
              <SliderField
                label="Effect estimate"
                value={selRow.yi}
                onChange={(v) => update(sel, { yi: v })}
                min={range[0]}
                max={range[1]}
                step={(range[1] - range[0]) / 200}
                format={(v) => fmt(preset.ratio ? Math.exp(v) : v)}
              />
              <SliderField
                label="Sample size (relative to original)"
                value={Math.log2(sizeMult)}
                onChange={(v) => update(sel, { sei: baseSE / Math.sqrt(2 ** v) })}
                min={-4}
                max={4}
                step={0.25}
                format={(v) => `×${fmt(2 ** v, 2)}`}
                hint="SE shrinks with √n: quadrupling n halves the SE."
              />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a study row in the forest plot to move its estimate or change its size.</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                const med = [...rows.map((r) => r.sei)].sort((a, b) => a - b)[Math.floor(rows.length / 2)] ?? 1
                setRows([...rows, { label: `New ${rows.length + 1}`, yi: res?.estimate ?? 0, sei: med }])
                setSel(rows.length)
              }}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" /> Add study
            </button>
            <button
              type="button"
              onClick={() => load(presetIdx)}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>
        {res && <ResultsPanel r={res} ratio={preset.ratio} />}
      </div>
      {res && (
        <details className="mt-4 rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">Weights under each model</summary>
          <DataTable
            className="mt-3"
            head={['Study', 'Estimate', 'SE', 'Weight (common)', 'Weight (random)']}
            rows={rows.map((r, i) => [
              r.label,
              fmt(preset.ratio ? Math.exp(r.yi) : r.yi),
              fmt(r.sei, 3),
              `${fmt(res.weightsCommon[i], 1)}%`,
              `${fmt(res.weightsRandom[i], 1)}%`,
            ])}
          />
        </details>
      )}
    </Lab>
  )
}

const SECTIONS = [
  { id: 'iv', title: 'Inverse-variance pooling' },
  { id: 'models', title: 'Common-effect vs random-effects' },
  { id: 'read', title: 'Reading a forest plot' },
  { id: 'sensitivity', title: 'Sensitivity analyses' },
  { id: 'sandbox', title: 'Analyse your own data' },
]

export default function Pairwise() {
  return (
    <Lesson
      id="pairwise"
      sections={SECTIONS}
      refs={['cochrane-ch10', 'borenstein2021', 'dersimonian1986', 'riley2011', 'higgins2009', 'viechtbauer2010', 'balduzzi2019']}
      objectives={[
        'Compute an inverse-variance pooled estimate and its standard error by hand.',
        'State the assumptions of common-effect and random-effects models and what each summary means.',
        'Read every element of a forest plot, including the prediction interval.',
        'Run and report sensitivity analyses, and reproduce an analysis in R.',
      ]}
    >
      <Section id="iv" title="Inverse-variance pooling">
        <p>
          Weight each study by its precision, <Tex>{'w_i = 1/v_i'}</Tex>. The pooled estimate is the weighted mean, and its variance is the reciprocal of the
          total weight:
        </p>
        <Tex block>{'\\hat\\theta = \\frac{\\sum_i w_i\\hat\\theta_i}{\\sum_i w_i}, \\qquad \\mathrm{SE}(\\hat\\theta)=\\frac{1}{\\sqrt{\\sum_i w_i}}'}</Tex>
        <p>
          These weights minimise the variance of the pooled estimate. They depend on SEs — sample size, event counts and outcome variability — not on study
          quality, which must be handled separately (risk-of-bias assessment, sensitivity analyses).
        </p>
        <Playground />
        <Predict
          prompt="In the playground (Blood pressure preset), select the largest trial and drag its estimate to +5 mmHg. Which diamond moves further?"
          options={['Common effect', 'Random effects', 'Both equally']}
          reveal={
            <>
              The <strong>common-effect</strong> diamond moves more: it gives the big trial a large share of the weight. Under random effects the induced
              heterogeneity raises τ², which flattens the weights (open “Weights under each model”), so the large trial counts for less. Notice also how
              much wider the random-effects CI and the prediction interval become.
            </>
          }
        />
      </Section>

      <Section id="models" title="Common-effect vs random-effects">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="!mt-0">Common effect (fixed effect)</h3>
            <Tex block>{'\\hat\\theta_i \\sim N(\\theta,\\, v_i)'}</Tex>
            <p className="text-sm">
              One true effect shared by all studies; differences between results are sampling error only. The summary estimates that single effect.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="!mt-0">Random effects</h3>
            <Tex block>{'\\hat\\theta_i \\sim N(\\theta_i, v_i),\\quad \\theta_i \\sim N(\\mu,\\,\\tau^2)'}</Tex>
            <p className="text-sm">
              True effects differ between studies around a mean <Tex>{'\\mu'}</Tex> with SD <Tex>{'\\tau'}</Tex>. Weights become{' '}
              <Tex>{'w_i^* = 1/(v_i+\\tau^2)'}</Tex>.
            </p>
          </div>
        </div>
        <Callout kind="rule">
          <p>
            “The choice between a fixed-effect and a random-effects meta-analysis should never be made on the basis of a statistical test for
            heterogeneity.” <Cite id="cochrane-ch10" /> Decide a priori: if the studies are not functionally identical (different populations, doses,
            settings), heterogeneity is expected and random effects is the natural model.
          </p>
        </Callout>
        <p>The two summaries answer different questions:</p>
        <ul>
          <li>
            <strong>Common effect:</strong> “What is the effect?” — assuming there is only one.
          </li>
          <li>
            <strong>Random effects:</strong> “What is the <em>average</em> effect across settings like these, and how much does it vary?” The CI describes
            uncertainty about the average <Tex>{'\\mu'}</Tex>, not the spread of effects — that is what τ and the prediction interval show{' '}
            <Cite id="riley2011" />.
          </li>
        </ul>
        <Callout kind="pitfall">
          <ul>
            <li>Random effects does not “correct for” heterogeneity; it models it. Unexplained heterogeneity still limits conclusions.</li>
            <li>
              Random effects gives small studies relatively more weight. If small studies are biased (Module 7), the random-effects mean is pulled further
              towards them than the common-effect estimate.
            </li>
            <li>With few studies τ² is poorly estimated; see Module 3 for the CI method this requires.</li>
          </ul>
        </Callout>
        <QuickCheck
          item={{
            id: 'pw-q1',
            q: 'A random-effects meta-analysis reports a mean RR of 0.80 (95% CI 0.70 to 0.91) and a 95% prediction interval of 0.55 to 1.16. Which statement is correct?',
            options: [
              'The treatment reduces risk in every setting.',
              'On average the treatment reduces risk, but in some settings the true effect may be null or harmful.',
              'The result is not statistically significant.',
              'The prediction interval is wider only because of small sample sizes.',
            ],
            answer: 1,
            why: (
              <>
                The CI excludes 1, so the <em>average</em> effect is beneficial. The prediction interval, which incorporates τ², includes 1: a new setting
                could see no benefit or harm. Reporting only the CI would overstate consistency <Cite id="inthout2016" />.
              </>
            ),
          }}
        />
      </Section>

      <Section id="read" title="Reading a forest plot">
        <ul>
          <li>
            <strong>Squares</strong>: study estimates; area proportional to weight. <strong>Lines</strong>: 95% CIs (arrows when clipped).
          </li>
          <li>
            <strong>Vertical line</strong>: no effect (0 for differences, 1 for ratios, which are plotted on a log axis so that 0.5 and 2 are equidistant
            from 1).
          </li>
          <li>
            <strong>Diamond</strong>: pooled estimate (centre) and its CI (width). Which diamond — common or random — must be stated.
          </li>
          <li>
            <strong>Red bar</strong>: 95% prediction interval for the true effect in a new comparable study.
          </li>
          <li>
            Look for overlap of CIs (heterogeneity), the direction labels (“favours …”), and whether results hinge on one or two large studies.
          </li>
        </ul>
        <QuickCheck
          item={{
            id: 'pw-q2',
            q: 'Three trials have SEs 0.1, 0.2 and 0.4 (log RR). What share of the common-effect weight does the most precise trial get?',
            options: ['33%', '57%', '76%', '91%'],
            answer: 2,
            why: (
              <>
                Weights are 1/0.01 = 100, 1/0.04 = 25 and 1/0.16 = 6.25; 100/131.25 = 76%. Halving an SE quadruples the weight.
              </>
            ),
          }}
        />
      </Section>

      <Section id="sensitivity" title="Sensitivity analyses">
        <p>A result is only as credible as its robustness to reasonable alternative decisions. Pre-specify and report:</p>
        <ul>
          <li>Leave-one-out analysis and influence of the largest or outlying studies (the sandbox below runs it).</li>
          <li>Restricting to studies at low risk of bias.</li>
          <li>Alternative effect measure (RR vs OR), τ² estimator (REML vs PM) and CI method (HKSJ vs Wald).</li>
          <li>Imputation choices for missing SDs or missing participants.</li>
          <li>Common-effect vs random-effects — a large discrepancy signals small-study effects (Module 7).</li>
        </ul>
        <Callout kind="tip">
          <p>Report sensitivity analyses in a table: the decision, the alternative, the estimate and CI. Readers should not have to infer robustness.</p>
        </Callout>
      </Section>

      <Section id="sandbox" title="Analyse your own data">
        <p>
          Use your own extracted data — or the course datasets — and export the R code that reproduces the analysis in metafor <Cite id="viechtbauer2010" />.
          Continue with <ModuleLink to="/learn/heterogeneity">Module 3</ModuleLink> to interpret τ², I² and the prediction interval properly.
        </p>
        <Sandbox />
      </Section>

      <Takeaways
        items={[
          'Inverse-variance weights reflect precision, not quality.',
          'Common effect assumes one true effect; random effects estimates the mean of a distribution of effects.',
          'Choose the model on conceptual grounds, never on a heterogeneity test.',
          'A random-effects result needs three numbers: the mean with its CI, τ, and the prediction interval.',
          'Robustness must be shown with pre-specified sensitivity analyses.',
        ]}
      />
    </Lesson>
  )
}

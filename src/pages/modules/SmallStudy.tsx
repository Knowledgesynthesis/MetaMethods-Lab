import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { FunnelPlot, type FunnelPoint } from '@/components/plots/FunnelPlot'
import { Segmented, SliderField, Stat, Toggle } from '@/components/ui/controls'
import { SMALL_STUDY_TRIALS } from '@/data/datasets'
import { binaryEffect } from '@/lib/stats/effectSizes'
import { metaAnalysis } from '@/lib/stats/pairwise'
import { beggTest, eggerTest, peese, petersTest, trimAndFill } from '@/lib/stats/pubBias'
import { rng } from '@/lib/stats/random'
import { fmt, fmtCI, fmtP } from '@/lib/utils'

interface SimStudy {
  yi: number
  vi: number
  published: boolean
}

function simulateLiterature(theta: number, tau: number, k: number, pPublishNS: number, mode: 'direction' | 'significance', seed: number): SimStudy[] {
  const r = rng(seed)
  return Array.from({ length: k }, () => {
    const n = Math.round(Math.exp(Math.log(30) + r.uniform() * Math.log(1500 / 30)))
    const vi = 2 / (n * 0.25 * 0.75)
    const yi = r.normal(r.normal(theta, tau), Math.sqrt(vi))
    const z = yi / Math.sqrt(vi)
    const favourableSig = mode === 'direction' ? z < -1.96 : Math.abs(z) > 1.96
    return { yi, vi, published: favourableSig || r.uniform() < pPublishNS }
  })
}

function SimulatorLab() {
  const [theta, setTheta] = useState(-0.1)
  const [tau, setTau] = useState(0.05)
  const [pub, setPub] = useState(0.2)
  const [mode, setMode] = useState<'direction' | 'significance'>('direction')
  const [seed, setSeed] = useState(17)
  const [reveal, setReveal] = useState(false)
  const studies = useMemo(() => simulateLiterature(theta, tau, 50, pub, mode, seed), [theta, tau, pub, mode, seed])
  const published = studies.filter((s) => s.published)
  const res = useMemo(() => {
    if (published.length < 3) return null
    const all = metaAnalysis(studies.map((s) => s.yi), studies.map((s) => s.vi))
    const pubM = metaAnalysis(published.map((s) => s.yi), published.map((s) => s.vi))
    const tf = trimAndFill(published.map((s) => s.yi), published.map((s) => s.vi))
    const eg = eggerTest(published.map((s) => s.yi), published.map((s) => s.vi))
    return { all, pubM, tf, eg }
  }, [studies, published])
  const points: FunnelPoint[] = [
    ...studies.filter((s) => s.published || reveal).map((s) => ({ yi: s.yi, se: Math.sqrt(s.vi), kind: s.published ? ('published' as const) : ('hidden' as const) })),
    ...(res && !reveal ? res.tf.filled.map((f) => ({ yi: f.yi, se: Math.sqrt(f.vi), kind: 'imputed' as const })) : []),
  ]
  return (
    <Lab
      title="Lab 1 · Publication-bias simulator"
      description="50 trials are conducted. Statistically significant ‘positive’ results are always published; the rest only with the probability you set."
      actions={
        <button type="button" onClick={() => setSeed(seed + 1)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent">
          <Shuffle className="h-3.5 w-3.5" /> New literature
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <SliderField label="True mean log OR" value={theta} onChange={setTheta} min={-0.6} max={0.2} step={0.05} format={(v) => `${fmt(v)} (OR ${fmt(Math.exp(v))})`} />
        <SliderField label="True τ" value={tau} onChange={setTau} min={0} max={0.4} step={0.05} format={(v) => fmt(v)} />
        <SliderField label="P(publish | not significant)" value={pub} onChange={setPub} min={0} max={1} step={0.05} format={(v) => `${Math.round(100 * v)}%`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'direction', label: 'Selection on significant benefit' },
            { value: 'significance', label: 'Selection on any significance' },
          ]}
        />
        <Toggle checked={reveal} onChange={setReveal} label="Reveal unpublished trials" />
      </div>
      {res ? (
        <>
          <div className="mt-4">
            <FunnelPlot points={points} center={res.pubM.estimate} xLabel="log odds ratio (below 0 favours treatment)" eggerLine={reveal ? undefined : { a: res.eg.limitEstimate, b: res.eg.coef }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Truth" value={`OR ${fmt(Math.exp(theta))}`} />
            <Stat label="All 50 trials" value={`OR ${fmt(Math.exp(res.all.estimate))}`} sub="what a complete evidence base gives" />
            <Stat label={`Published (k = ${published.length})`} value={`OR ${fmt(Math.exp(res.pubM.estimate))}`} sub={`95% CI ${fmtCI(res.pubM.ci, 2, Math.exp)}`} tone="bad" />
            <Stat label="Trim-and-fill" value={`OR ${fmt(Math.exp(res.tf.adjusted.estimate))}`} sub={`${res.tf.k0} studies imputed`} />
            <Stat label="PET limit estimate" value={`OR ${fmt(Math.exp(res.eg.limitEstimate))}`} sub={`95% CI ${fmtCI(res.eg.limitCI, 2, Math.exp)}`} />
            <Stat label="Egger test" value={`p = ${fmtP(res.eg.pval)}`} sub={`t = ${fmt(res.eg.t)}, ${res.eg.df} df`} tone={res.eg.pval < 0.1 ? 'warn' : undefined} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Too few published trials — raise the publication probability.</p>
      )}
    </Lab>
  )
}

function ExampleLab() {
  const [model, setModel] = useState<'random' | 'common'>('random')
  const d = useMemo(() => {
    const e = SMALL_STUDY_TRIALS.map((s) => binaryEffect(s, 'OR'))
    const yi = e.map((x) => x.yi)
    const vi = e.map((x) => x.vi)
    const re = metaAnalysis(yi, vi)
    const ce = metaAnalysis(yi, vi, { model: 'common' })
    const tf = trimAndFill(yi, vi, { model })
    const eg = eggerTest(yi, vi)
    const pe = petersTest(
      yi,
      SMALL_STUDY_TRIALS.map((s) => s.n1 + s.n2),
      SMALL_STUDY_TRIALS.map((s) => s.ai + s.ci),
    )
    const bg = beggTest(yi, vi)
    const ps = peese(yi, vi)
    return { yi, vi, re, ce, tf, eg, pe, bg, ps }
  }, [model])
  return (
    <Lab title="Lab 2 · A worked example" description="16 trials of a perioperative intervention (OR for complications). Small trials report larger benefits.">
      <Segmented
        size="sm"
        label="Model for trim-and-fill"
        value={model}
        onChange={setModel}
        options={[
          { value: 'random', label: 'Random effects' },
          { value: 'common', label: 'Common effect' },
        ]}
      />
      <div className="mt-3">
        <FunnelPlot
          points={[
            ...d.yi.map((y, i) => ({ yi: y, se: Math.sqrt(d.vi[i]), kind: 'published' as const, label: SMALL_STUDY_TRIALS[i].study })),
            ...d.tf.filled.map((f) => ({ yi: f.yi, se: Math.sqrt(f.vi), kind: 'imputed' as const })),
          ]}
          center={model === 'random' ? d.re.estimate : d.ce.estimate}
          ratio
          xLabel="Odds ratio (log scale)"
        />
      </div>
      <DataTable
        className="mt-4"
        head={['Analysis', 'OR', '95% CI', 'Note']}
        rows={[
          ['Random effects (REML)', fmt(Math.exp(d.re.estimate)), fmtCI(d.re.ci, 2, Math.exp), `τ² = ${fmt(d.re.tau2, 3)}`],
          ['Common effect', fmt(Math.exp(d.ce.estimate)), fmtCI(d.ce.ci, 2, Math.exp), 'large trials dominate'],
          [`Trim-and-fill (${model})`, fmt(Math.exp(d.tf.adjusted.estimate)), fmtCI(d.tf.adjusted.ci, 2, Math.exp), `${d.tf.k0} imputed on the ${d.tf.side}`],
          ['PET (limit, SE → 0)', fmt(Math.exp(d.eg.limitEstimate)), fmtCI(d.eg.limitCI, 2, Math.exp), 'regression on SE'],
          ['PEESE (limit, var → 0)', fmt(Math.exp(d.ps.limitEstimate)), fmtCI(d.ps.limitCI, 2, Math.exp), 'regression on variance'],
        ]}
      />
      <DataTable
        className="mt-3"
        head={['Asymmetry test', 'Statistic', 'P', 'Recommended for OR?']}
        rows={[
          ["Peters (log OR on 1/N)", `t = ${fmt(d.pe.t)}`, fmtP(d.pe.pval), 'Yes'],
          ["Egger (log OR on SE)", `t = ${fmt(d.eg.t)}`, fmtP(d.eg.pval), 'No — SE of log OR is correlated with log OR'],
          ['Begg rank correlation', `τ = ${fmt(d.bg.tau)}`, fmtP(d.bg.pval), 'Low power'],
        ]}
      />
    </Lab>
  )
}

const SECTIONS = [
  { id: 'causes', title: 'Small-study effects and their causes' },
  { id: 'funnel', title: 'Funnel plots done properly' },
  { id: 'simulate', title: 'Watching bias happen' },
  { id: 'tests', title: 'Tests and adjustments' },
  { id: 'robme', title: 'ROB-ME: judging missing evidence' },
]

export default function SmallStudy() {
  return (
    <Lesson
      id="small-study"
      sections={SECTIONS}
      refs={['cochrane-ch13', 'rob-me', 'sterne2011', 'sterne2001', 'egger1997', 'peters2006', 'harbord2006', 'peters2008', 'duval2000', 'stanley2014', 'begg1994', 'lau2006']}
      objectives={[
        'List the causes of small-study effects and why asymmetry is not proof of publication bias.',
        'Draw and read a contour-enhanced funnel plot.',
        'Choose an appropriate asymmetry test for the effect measure, and know when not to test.',
        'Use trim-and-fill, PET-PEESE and ROB-ME as sensitivity tools, not corrections.',
      ]}
    >
      <Section id="causes" title="Small-study effects and their causes">
        <p>
          A <strong>small-study effect</strong> is a tendency for smaller studies to show larger effects. Publication bias is only one explanation{' '}
          <Cite id="cochrane-ch13" />:
        </p>
        <DataTable
          head={['Cause', 'Mechanism']}
          rows={[
            ['Non-reporting bias', 'Small studies with null or unfavourable results are not published, or their results are selectively reported'],
            ['Poor methodological quality', 'Small trials are more often unblinded or poorly concealed, exaggerating effects'],
            ['True heterogeneity', 'Small trials may enrol higher-risk patients or deliver the intervention more intensively'],
            ['Artefact', 'For OR and SMD the SE is mathematically correlated with the estimate'],
            ['Chance', 'Especially with few studies'],
          ]}
        />
      </Section>

      <Section id="funnel" title="Funnel plots done properly">
        <ul>
          <li>Plot the effect (log scale for ratios) against its <strong>standard error</strong>, inverted, not against sample size <Cite id="sterne2001" />.</li>
          <li>
            <strong>Contour-enhance</strong> around the null: if “missing” studies fall in regions of non-significance, non-reporting becomes a more plausible
            explanation than if they fall where significance is high <Cite id="peters2008" />.
          </li>
          <li>
            Only interpret (and test) with at least <strong>10 studies</strong> of varying size, and not when studies have similar SEs <Cite id="sterne2011" />.
          </li>
          <li>Visual judgement is unreliable even among experts <Cite id="lau2006" />.</li>
        </ul>
      </Section>

      <Section id="simulate" title="Watching bias happen">
        <SimulatorLab />
        <Predict
          prompt="With the default settings (true OR 0.90, 20% of non-significant trials published), how will the published pooled OR compare with the truth across many literatures?"
          options={['About right (≈ 0.90)', 'Exaggerated (≈ 0.80)', 'Hugely exaggerated (≈ 0.50)']}
          reveal={
            <>
              Exaggerated. Across 200 simulated literatures the median published OR was 0.83 and the published result was “significant” in 86% — yet
              Egger’s test flagged asymmetry in only about 13%. Trim-and-fill barely moved the estimate (median 0.84); PET came closer (0.87). Drop the
              publication probability to 10% and the exaggeration grows (median 0.79). Press “New literature” a few times and reveal the hidden trials.
            </>
          }
        />
        <Callout kind="pitfall">
          <p>
            Random-effects models give small studies relatively more weight. When small-study effects are present, a random-effects mean far from the
            common-effect estimate is a warning sign — not a better answer.
          </p>
        </Callout>
      </Section>

      <Section id="tests" title="Tests and adjustments">
        <p>Egger’s test regresses the standardised effect on precision; equivalently, a weighted regression of the effect on its SE:</p>
        <Tex block>{'\\hat\\theta_i=\\beta_0+\\beta_1\\,\\mathrm{SE}_i+\\varepsilon_i,\\quad \\text{weights } 1/\\mathrm{SE}_i^2;\\qquad H_0:\\beta_1=0'}</Tex>
        <p>
          <Tex>{'\\beta_1'}</Tex> measures asymmetry; <Tex>{'\\beta_0'}</Tex> is the extrapolated effect in an infinitely large study (the PET estimate){' '}
          <Cite id="egger1997" /> <Cite id="stanley2014" />.
        </p>
        <Callout kind="rule">
          <ul>
            <li>Tests are appropriate only in a minority of meta-analyses (≥10 studies, varying sizes, not dominated by one study) <Cite id="cochrane-ch13" />.</li>
            <li>
              The original Egger test is not recommended for odds ratios or SMDs (artefactual correlation); use Peters’ or Harbord’s test for ORs{' '}
              <Cite id="peters2006" /> <Cite id="harbord2006" />.
            </li>
            <li>Low power: a non-significant test does not exclude bias.</li>
          </ul>
        </Callout>
        <ExampleLab />
        <p>
          <strong>Trim-and-fill</strong> iteratively removes the most extreme small studies until the funnel is symmetric, re-estimates the centre, then
          imputes mirror-image studies <Cite id="duval2000" />. It assumes asymmetry is caused by suppression of the most extreme results and performs poorly
          under heterogeneity. <strong>Selection models</strong> and <strong>PET-PEESE</strong> make other strong assumptions. Treat all of them as
          sensitivity analyses: if conclusions change, the evidence is fragile.
        </p>
        <QuickCheck
          item={{
            id: 'ssb-q1',
            q: 'A meta-analysis of 7 trials shows funnel-plot asymmetry; Egger’s test gives p = 0.04. Which conclusion is justified?',
            options: [
              'Publication bias is present; report the trim-and-fill estimate as primary.',
              'With only 7 studies the plot and test are unreliable; assess missing evidence with ROB-ME (registries, protocols) instead.',
              'There is no bias because p > 0.01.',
              'Switch to a random-effects model to remove the bias.',
            ],
            answer: 1,
            why: (
              <>
                Fewer than 10 studies: funnel plots and tests should not be used <Cite id="sterne2011" />. Even with more studies, asymmetry has many causes.
                Searching registries and protocols for unreported results (ROB-ME) addresses the actual question. Random effects would increase small-study
                influence.
              </>
            ),
          }}
        />
      </Section>

      <Section id="robme" title="ROB-ME: judging missing evidence">
        <p>
          ROB-ME (2023), now in Handbook chapter 13, structures the judgement of bias due to missing evidence for each synthesis <Cite id="rob-me" />. It asks
          about two kinds of missingness:
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="!mt-0">Known unknowns</h3>
            <p className="text-sm">
              Studies you know about whose results for this outcome are unavailable (e.g. outcome listed in the registry or protocol but not reported, or
              reported only as “not significant”).
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="!mt-0">Unknown unknowns</h3>
            <p className="text-sm">
              Studies that may exist but were not identified. Considered through the search (registries, regulatory documents, grey literature), the
              likelihood of suppression in the field, and — when appropriate — funnel plots and sensitivity analyses.
            </p>
          </div>
        </div>
        <p className="mt-4">
          The judgement is <strong>low risk</strong>, <strong>some concerns</strong> or <strong>high risk</strong>, and feeds into GRADE’s “publication
          bias” domain (<ModuleLink to="/learn/workflow">Module 11</ModuleLink>). Prevention beats detection: search trial registries, clinical study reports
          and regulatory documents, and contact investigators.
        </p>
      </Section>

      <Takeaways
        items={[
          'Funnel-plot asymmetry means small-study effects — publication bias is only one possible cause.',
          'Plot against SE, contour-enhance, and only interpret with ≥10 studies of varying size.',
          'Use Peters or Harbord tests for odds ratios; Egger for MDs; expect low power.',
          'Trim-and-fill, PET-PEESE and selection models are sensitivity analyses with strong assumptions.',
          'Assess missing evidence with ROB-ME, and prevent it by searching registries and regulatory sources.',
        ]}
      />
    </Lesson>
  )
}

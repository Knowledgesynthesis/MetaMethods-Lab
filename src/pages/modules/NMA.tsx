import { useMemo, useState } from 'react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { CodeBlock } from '@/components/lesson/CodeBlock'
import { NetworkPlot } from '@/components/plots/NetworkPlot'
import { ForestPlot } from '@/components/plots/ForestPlot'
import { NumberField, Segmented, SelectField, SliderField, Stat } from '@/components/ui/controls'
import { NMA_TRIALS } from '@/data/datasets'
import { binaryEffect } from '@/lib/stats/effectSizes'
import { bucher, networkMetaAnalysis, type NMAStudy } from '@/lib/stats/nma'
import { pFromZ } from '@/lib/stats/distributions'
import { nmaR } from '@/lib/stats/rcode'
import { cn, fmt, fmtCI, fmtP } from '@/lib/utils'

const BASE: NMAStudy[] = NMA_TRIALS.map((s) => {
  const e = binaryEffect({ ai: s.e2, n1: s.n2, ci: s.e1, n2: s.n1 }, 'OR')
  return { id: s.study, t1: s.t1, t2: s.t2, yi: e.yi, vi: e.vi }
})
const NAMES: Record<string, string> = { P: 'Placebo', A: 'A', B: 'B', C: 'C', D: 'D' }

function BucherLab() {
  const [dAB, setDAB] = useState(0.4)
  const [seAB, setSeAB] = useState(0.12)
  const [dCB, setDCB] = useState(0.55)
  const [seCB, setSeCB] = useState(0.15)
  const [dirAC, setDirAC] = useState(-0.3)
  const [seDir, setSeDir] = useState(0.2)
  const ind = bucher(dAB, seAB, dCB, seCB)
  const IF = dirAC - ind.est
  const seIF = Math.sqrt(seDir ** 2 + ind.se ** 2)
  return (
    <Lab title="Lab 1 · Bucher indirect comparison and loop inconsistency" description="Effects are log ORs versus the common comparator B (here: placebo).">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="A vs B: log OR" value={dAB} onChange={setDAB} step={0.05} />
          <NumberField label="A vs B: SE" value={seAB} onChange={setSeAB} step={0.01} />
          <NumberField label="C vs B: log OR" value={dCB} onChange={setDCB} step={0.05} />
          <NumberField label="C vs B: SE" value={seCB} onChange={setSeCB} step={0.01} />
          <NumberField label="Direct A vs C: log OR" value={dirAC} onChange={setDirAC} step={0.05} />
          <NumberField label="Direct A vs C: SE" value={seDir} onChange={setSeDir} step={0.01} />
        </div>
        <div className="space-y-2">
          <Tex block>{'\\hat d_{AC}^{\\,ind}=\\hat d_{AB}-\\hat d_{CB},\\qquad \\mathrm{SE}=\\sqrt{\\mathrm{SE}_{AB}^2+\\mathrm{SE}_{CB}^2}'}</Tex>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Indirect A vs C" value={`OR ${fmt(Math.exp(ind.est))}`} sub={`log OR ${fmt(ind.est)} (SE ${fmt(ind.se, 3)}); CI ${fmtCI(ind.ci, 2, Math.exp)}`} tone="primary" />
            <Stat label="Direct A vs C" value={`OR ${fmt(Math.exp(dirAC))}`} sub={`CI ${fmtCI([dirAC - 1.96 * seDir, dirAC + 1.96 * seDir], 2, Math.exp)}`} />
            <Stat label="Inconsistency factor" value={fmt(IF, 2)} sub={`SE ${fmt(seIF, 3)}; ratio of ORs ${fmt(Math.exp(IF))}`} />
            <Stat label="P (direct = indirect)" value={fmtP(pFromZ(IF / seIF))} tone={pFromZ(IF / seIF) < 0.05 ? 'bad' : undefined} />
          </div>
          <p className="text-xs text-muted-foreground">The indirect SE is always larger than either input SE: indirect evidence is weaker than direct evidence of the same size.</p>
        </div>
      </div>
    </Lab>
  )
}

function NetworkLab() {
  const [model, setModel] = useState<'random' | 'common'>('random')
  const [reference, setReference] = useState('P')
  const [biasEdge, setBiasEdge] = useState('B|C')
  const [delta, setDelta] = useState(0)
  const [sel, setSel] = useState<string | null>('B|C')
  const studies = useMemo(
    () => BASE.map((s) => (`${s.t1}|${s.t2}` === biasEdge || `${s.t2}|${s.t1}` === biasEdge ? { ...s, yi: s.yi + (s.t1 + '|' + s.t2 === biasEdge ? delta : -delta) } : s)),
    [biasEdge, delta],
  )
  const res = useMemo(() => networkMetaAnalysis(studies, { reference, model, smallerIsBetter: false }), [studies, reference, model])
  const ranked = [...res.treatments].sort((a, b) => res.pscores[b] - res.pscores[a])
  const split = res.split.find((s) => `${s.t1}|${s.t2}` === sel)
  const N = (t: string) => NMA_TRIALS.reduce((acc, s) => acc + (s.t1 === t ? s.n1 : 0) + (s.t2 === t ? s.n2 : 0), 0)
  return (
    <Lab
      title="Lab 2 · Network explorer"
      description="22 two-arm trials of four active treatments and placebo; outcome abstinence at 6 months (OR > 1 favours the first-named treatment). Click an edge to split its evidence."
    >
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Model"
          value={model}
          onChange={setModel}
          options={[
            { value: 'random', label: 'Random effects (common τ²)' },
            { value: 'common', label: 'Common effect' },
          ]}
        />
        <SelectField label="Reference" value={reference} onChange={setReference} options={res.treatments.map((t) => ({ value: t, label: NAMES[t] }))} />
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div>
          <NetworkPlot
            nodes={res.treatments.map((t) => ({ id: t, label: t, size: N(t) }))}
            edges={res.edges.map((e) => ({ a: e.t1, b: e.t2, k: e.k }))}
            selectedEdge={sel}
            onEdgeClick={setSel}
            reference={reference}
          />
          <p className="text-xs text-muted-foreground">Node area ∝ participants; edge width ∝ number of trials (labels).</p>
        </div>
        <div className="space-y-3">
          <ForestPlot
            rows={res.treatments
              .filter((t) => t !== reference)
              .map((t) => ({ label: `${NAMES[t]} vs ${NAMES[reference]}`, yi: res.vsRef[t].est, ci: res.vsRef[t].ci }))}
            ratio
            xLabel={`Odds ratio vs ${NAMES[reference]} (log scale)`}
            favours={[NAMES[reference], 'comparator']}
            showWeights={false}
          />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="τ² (common)" value={fmt(res.tau2, 4)} />
            <Stat label="Q total" value={fmt(res.Q, 1)} sub={`df ${res.df}, p ${fmtP(res.Qp)}`} />
            <Stat label="Within designs" value={fmt(res.Qhet, 1)} sub={`df ${res.dfHet}, p ${fmtP(res.QhetP)}`} />
            <Stat label="Between designs (inconsistency)" value={fmt(res.Qinc, 1)} sub={`df ${res.dfInc}, p ${fmtP(res.QincP)}`} tone={res.QincP < 0.1 ? 'bad' : undefined} />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 text-sm font-semibold">Inject bias into one comparison</div>
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <SelectField
            label="Comparison"
            value={biasEdge}
            onChange={(v) => {
              setBiasEdge(v)
              setSel(v)
            }}
            options={res.edges.map((e) => ({ value: `${e.t1}|${e.t2}`, label: `${NAMES[e.t2]} vs ${NAMES[e.t1]} (${e.k} trials)` }))}
          />
          <SliderField label="Shift added to these trials (log OR)" value={delta} onChange={setDelta} min={-1} max={1} step={0.05} format={(v) => fmt(v)} />
        </div>
      </div>

      {split && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">
            Evidence split for {NAMES[split.t2]} vs {NAMES[split.t1]} ({split.kDirect} direct trial{split.kDirect > 1 ? 's' : ''})
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Direct" value={`OR ${fmt(Math.exp(split.direct.est))}`} sub={`CI ${fmtCI(split.direct.ci, 2, Math.exp)}`} />
            <Stat label="Indirect" value={split.indirect ? `OR ${fmt(Math.exp(split.indirect.est))}` : 'none'} sub={split.indirect ? `CI ${fmtCI(split.indirect.ci, 2, Math.exp)}` : 'no other path'} />
            <Stat label="Network (mixed)" value={`OR ${fmt(Math.exp(split.network.est))}`} sub={`${fmt(100 * split.propDirect, 0)}% direct evidence`} tone="primary" />
            <Stat label="Direct vs indirect" value={split.pval === null ? '—' : `p = ${fmtP(split.pval)}`} tone={split.pval !== null && split.pval < 0.1 ? 'bad' : undefined} />
          </div>
        </div>
      )}

      <details className="mt-4 rounded-lg border p-3" open>
        <summary className="cursor-pointer text-sm font-medium">League table (OR, row vs column) and P-scores</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="num w-full text-xs">
            <tbody>
              {ranked.map((r) => (
                <tr key={r}>
                  {ranked.map((c) => {
                    if (r === c)
                      return (
                        <td key={c} className="border bg-primary/10 p-2 text-center font-semibold">
                          {NAMES[r]}
                          <div className="font-normal text-muted-foreground">P-score {fmt(res.pscores[r], 2)}</div>
                        </td>
                      )
                    const x = res.league(c, r)
                    const sig = x.ci[0] > 0 || x.ci[1] < 0
                    return (
                      <td key={c} className={cn('border p-2 text-center font-mono', sig && 'font-semibold text-primary')}>
                        {fmt(Math.exp(x.est))}
                        <div className="text-[10px] text-muted-foreground">
                          {fmt(Math.exp(x.ci[0]))}–{fmt(Math.exp(x.ci[1]))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Ordered by P-score. Bold: 95% CI excludes 1. Read each cell as the row treatment versus the column treatment.</p>
      </details>
      <CodeBlock code={nmaR(BASE.map((s) => ({ study: s.id, t1: s.t1, t2: s.t2, yi: s.yi, sei: Math.sqrt(s.vi) })), reference, false)} title="Reproduce in R (netmeta)" />
    </Lab>
  )
}

const SECTIONS = [
  { id: 'indirect', title: 'Indirect evidence' },
  { id: 'transitivity', title: 'Transitivity' },
  { id: 'model', title: 'The network model' },
  { id: 'consistency', title: 'Checking consistency' },
  { id: 'ranking', title: 'Rankings that do not mislead' },
  { id: 'pitfalls', title: 'Pitfalls' },
]

export default function NMA() {
  return (
    <Lesson
      id="nma"
      sections={SECTIONS}
      refs={['cochrane-ch11', 'bucher1997', 'salanti2012', 'rucker2012', 'rucker2015', 'salanti2011', 'dias2010', 'higgins2012', 'cinema', 'grade-nma-minimal', 'prisma-nma', 'dias2018']}
      objectives={[
        'Compute an adjusted indirect comparison and a loop inconsistency factor.',
        'Explain transitivity and how to assess it before any analysis.',
        'Fit and interpret a network meta-analysis: league table, τ², local and global inconsistency.',
        'Present rankings responsibly with GRADE’s minimally contextualised approach and CINeMA.',
      ]}
    >
      <Section id="indirect" title="Indirect evidence">
        <p>
          If trials compare A with B and C with B, the <em>adjusted indirect comparison</em> of A with C preserves randomisation within each trial
          <Cite id="bucher1997" />:
        </p>
        <Tex block>{'\\hat d_{AC}=\\hat d_{AB}-\\hat d_{CB},\\qquad \\mathrm{Var}(\\hat d_{AC})=\\mathrm{Var}(\\hat d_{AB})+\\mathrm{Var}(\\hat d_{CB})'}</Tex>
        <p>
          Comparing the A arms of A–B trials with the C arms of C–B trials directly (a “naive” comparison) breaks randomisation and is never acceptable.
        </p>
        <BucherLab />
      </Section>

      <Section id="transitivity" title="Transitivity">
        <p>
          The indirect estimate is valid only if the A–B and C–B trials are similar in everything that modifies the treatment effect — the{' '}
          <strong>transitivity</strong> assumption <Cite id="salanti2012" />. A practical test: could every participant in the network have been randomised to any of the treatments? If A–B trials enrolled mild disease and C–B trials severe disease, and severity modifies effects, A vs C through B is biased.
        </p>
        <Callout kind="tip" title="Assess transitivity before analysis">
          <ul>
            <li>List plausible effect modifiers in the protocol (severity, dose, background therapy, year, risk of bias).</li>
            <li>Tabulate their distribution by comparison and look for systematic differences.</li>
            <li>Define nodes carefully: lumping different doses or co-interventions creates intransitivity.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="model" title="The network model">
        <p>
          With basic parameters <Tex>{'d_{\\text{ref},j}'}</Tex> (each treatment vs the reference), every comparison is a difference of two of them; a
          random-effects NMA estimates them jointly by weighted least squares with a common <Tex>{'\\tau^2'}</Tex> <Cite id="rucker2012" />:
        </p>
        <Tex block>{'\\hat\\theta_s = d_{\\text{ref},t_2(s)}-d_{\\text{ref},t_1(s)}+u_s+\\varepsilon_s,\\qquad u_s\\sim N(0,\\tau^2),\\ \\varepsilon_s\\sim N(0,v_s)'}</Tex>
        <p>
          Frequentist (netmeta) and Bayesian (gemtc, multinma) implementations give similar answers with vague priors; Bayesian models make it easy to use
          informative priors for τ when the network is sparse <Cite id="dias2018" />. Multi-arm trials need their within-trial correlation modelled — this lab
          uses two-arm trials only.
        </p>
        <NetworkLab />
      </Section>

      <Section id="consistency" title="Checking consistency">
        <p>
          <strong>Consistency</strong> (coherence) is the statistical footprint of transitivity: direct and indirect estimates should agree.
        </p>
        <ul>
          <li>
            <strong>Local</strong>: split each comparison into direct and indirect evidence (node-splitting / SIDE, here by back-calculation) and test the
            difference <Cite id="dias2010" />.
          </li>
          <li>
            <strong>Global</strong>: decompose Q into within-design heterogeneity and between-design inconsistency (design-by-treatment interaction){' '}
            <Cite id="higgins2012" />.
          </li>
        </ul>
        <Predict
          prompt="In Lab 2, set the shift for B vs C to +0.8. Which statistics react, and does the D vs Placebo estimate change?"
          options={['Only B vs C changes', 'Inconsistency tests react and other estimates shift too', 'Nothing changes — NMA averages it out']}
          reveal={
            <>
              The B–C split shows direct and indirect estimates diverging, the between-design Q rises, and estimates that borrow strength through B–C — including
              those for D, which is connected to the rest of the network only through B and C — shift. Bias in one comparison propagates through the network. These
              tests have low power: absence of detected inconsistency is not proof of consistency.
            </>
          }
        />
      </Section>

      <Section id="ranking" title="Rankings that do not mislead">
        <p>
          The <strong>P-score</strong> of treatment <Tex>{'i'}</Tex> is the mean, over all competitors, of the one-sided probability that <Tex>{'i'}</Tex> is better{' '}
          <Cite id="rucker2015" />; SUCRA is its Bayesian counterpart <Cite id="salanti2011" />:
        </p>
        <Tex block>{'P_i=\\frac{1}{T-1}\\sum_{j\\neq i}\\Phi\\!\\left(\\frac{\\hat d_{ij}}{\\mathrm{SE}(\\hat d_{ij})}\\right)'}</Tex>
        <p>
          A P-score or SUCRA summarises certainty of being better, not how much better. A treatment with a tiny, imprecise advantage can rank first. GRADE
          therefore recommends classifying interventions into groups (e.g. “among the most effective”) using effect sizes against a reference <em>and</em>{' '}
          certainty of evidence — the minimally contextualised approach <Cite id="grade-nma-minimal" /> — with certainty rated per comparison, for example
          with CINeMA <Cite id="cinema" />.
        </p>
        <QuickCheck
          item={{
            id: 'nma-q1',
            q: 'Treatment D has the highest P-score (0.91) but is connected to the network only through 3 trials. What should the conclusion say?',
            options: [
              'D is the best treatment.',
              'D ranks first, so guidelines should recommend it.',
              'D may be among the most effective, but its effect estimates are imprecise and rest on few trials; certainty should be rated before any claim.',
              'Rankings are meaningless and should never be reported.',
            ],
            answer: 2,
            why: (
              <>
                Rankings without magnitudes and certainty mislead. Report D’s effect versus placebo with its CI, its certainty (likely downgraded for imprecision),
                and group it accordingly <Cite id="grade-nma-minimal" />.
              </>
            ),
          }}
        />
      </Section>

      <Section id="pitfalls" title="Pitfalls">
        <ul>
          <li>Starting with the analysis instead of a transitivity assessment.</li>
          <li>Treating multi-arm trials as independent two-arm comparisons (double counting).</li>
          <li>Over-interpreting a sparse or star-shaped network, where most comparisons rest on indirect evidence.</li>
          <li>Reporting rankings without effect sizes, uncertainty and certainty of evidence.</li>
          <li>Ignoring the design-by-treatment inconsistency test or relying on it alone (low power).</li>
        </ul>
        <p>
          Report following PRISMA-NMA <Cite id="prisma-nma" />. Bayesian estimation, which NMA often uses, is the subject of{' '}
          <ModuleLink to="/learn/bayesian">Module 10</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'Adjusted indirect comparisons preserve randomisation; their variance is the sum of the variances.',
          'Transitivity is a clinical assumption to assess before analysis; consistency is its testable consequence.',
          'Check inconsistency locally (node-splitting) and globally (design-by-treatment), knowing both have low power.',
          'Bias in one comparison propagates through the network.',
          'Rank with effect sizes and certainty (GRADE minimally contextualised, CINeMA), not P-scores alone.',
        ]}
      />
    </Lesson>
  )
}

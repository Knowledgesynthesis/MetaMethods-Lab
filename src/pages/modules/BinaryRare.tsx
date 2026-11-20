import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { ForestPlot } from '@/components/plots/ForestPlot'
import { Segmented, SliderField, Toggle } from '@/components/ui/controls'
import { RARE_AE_TRIALS } from '@/data/datasets'
import { binaryEffect, isDoubleZero, type ContinuityCorrection, type TwoByTwo } from '@/lib/stats/effectSizes'
import { mantelHaenszel, peto, petoStudy } from '@/lib/stats/binary'
import { metaAnalysis } from '@/lib/stats/pairwise'
import { qnorm } from '@/lib/stats/distributions'
import { rng } from '@/lib/stats/random'
import { fmt, fmtCI } from '@/lib/utils'

const Z = qnorm(0.975)
type Method = 'MH' | 'Peto' | 'IV-0.5' | 'IV-TACC'

function ivPooled(studies: TwoByTwo[], cc: ContinuityCorrection) {
  const use = studies.filter((s) => !isDoubleZero(s))
  const es = use.map((s) => binaryEffect(s, 'OR', cc))
  return { use, es, res: metaAnalysis(es.map((e) => e.yi), es.map((e) => e.vi), { model: 'common' }) }
}

function MethodLab() {
  const [method, setMethod] = useState<Method>('MH')
  const [balancedOnly, setBalancedOnly] = useState(false)
  const studies = useMemo(
    () =>
      RARE_AE_TRIALS.filter((s) => !balancedOnly || Math.max(s.n1, s.n2) / Math.min(s.n1, s.n2) < 1.5).map((s) => ({
        label: s.study,
        ai: s.ai,
        n1: s.n1,
        ci: s.ci,
        n2: s.n2,
      })),
    [balancedOnly],
  )
  const summary = useMemo(() => {
    const mh = mantelHaenszel(studies, 'OR')
    const pt = peto(studies)
    const iv5 = ivPooled(studies, 'constant').res
    const ivT = ivPooled(studies, 'treatment-arm').res
    return [
      { m: 'MH' as Method, label: 'Mantel–Haenszel OR', est: mh.estimate, ci: mh.ci, note: 'no correction needed' },
      { m: 'Peto' as Method, label: 'Peto OR', est: pt.estimate, ci: pt.ci, note: 'one-step; biased if arms unbalanced or OR far from 1' },
      { m: 'IV-0.5' as Method, label: 'Inverse variance, +0.5 to zero-cell studies', est: iv5.estimate, ci: iv5.ci, note: 'biased towards 1' },
      { m: 'IV-TACC' as Method, label: 'Inverse variance, treatment-arm correction', est: ivT.estimate, ci: ivT.ci, note: 'still inverse-variance weighted' },
    ]
  }, [studies])
  const rows = useMemo(() => {
    return studies.map((s) => {
      if (isDoubleZero(s)) return { label: `${s.label} (0/0 excluded)`, yi: 0, ci: [0, 0] as [number, number], style: 'excluded' as const }
      let e: { yi: number; vi: number }
      if (method === 'Peto') e = petoStudy(s)!
      else e = binaryEffect(s, 'OR', method === 'IV-TACC' ? 'treatment-arm' : 'constant')
      const corrected = method !== 'Peto' && (s.ai === 0 || s.ci === 0)
      return {
        label: `${s.label}${corrected ? ' *' : ''}`,
        yi: e.yi,
        ci: [e.yi - Z * Math.sqrt(e.vi), e.yi + Z * Math.sqrt(e.vi)] as [number, number],
      }
    })
  }, [studies, method])
  const chosen = summary.find((s) => s.m === method)!
  return (
    <Lab
      title="Lab 1 · Four methods, one sparse dataset"
      description="Serious adverse events with ~0.6% control risk; several trials randomised 3:1. True OR used to simulate the data: 1.6."
    >
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Study-level estimates shown"
          value={method}
          onChange={setMethod}
          options={[
            { value: 'MH', label: 'MH' },
            { value: 'Peto', label: 'Peto' },
            { value: 'IV-0.5', label: 'IV +0.5' },
            { value: 'IV-TACC', label: 'IV treatment-arm' },
          ]}
        />
        <Toggle checked={balancedOnly} onChange={setBalancedOnly} label="Only trials with ~1:1 allocation" />
      </div>
      <div className="mt-4">
        <ForestPlot
          rows={rows}
          summaries={[{ label: chosen.label.split(',')[0], est: chosen.est, ci: chosen.ci }]}
          ratio
          xLabel="Odds ratio (log scale)"
          favours={['fewer events with treatment', 'more events']}
          showWeights={false}
        />
        <p className="text-xs text-muted-foreground">* zero cell: continuity correction applied to this study’s own estimate. Studies with no events in either arm carry no information about an OR.</p>
      </div>
      <DataTable
        className="mt-4"
        head={['Method (common effect)', 'OR', '95% CI', 'Comment']}
        rows={summary.map((s) => [s.label, fmt(Math.exp(s.est)), fmtCI(s.ci, 2, Math.exp), s.note])}
      />
    </Lab>
  )
}

interface SimRow {
  method: string
  meanOR: number
  coverage: number
}

function simulateRare(p0: number, trueOR: number, ratio: number, seed: number, nSim = 400): SimRow[] {
  const r = rng(seed)
  const k = 10
  const names = ['Mantel–Haenszel', 'Peto', 'IV +0.5', 'IV treatment-arm']
  const sums = [0, 0, 0, 0]
  const cover = [0, 0, 0, 0]
  const counts = [0, 0, 0, 0]
  const p1 = (trueOR * p0) / (1 - p0 + trueOR * p0)
  const lt = Math.log(trueOR)
  for (let s = 0; s < nSim; s++) {
    const studies: TwoByTwo[] = []
    for (let i = 0; i < k; i++) {
      const nC = r.int(80, 250)
      const nT = Math.round(nC * ratio)
      studies.push({ ai: r.binomial(nT, p1), n1: nT, ci: r.binomial(nC, p0), n2: nC })
    }
    const ests = [
      (() => {
        const m = mantelHaenszel(studies, 'OR')
        return m.undefined ? null : m
      })(),
      (() => {
        const m = peto(studies)
        return Number.isFinite(m.estimate) ? m : null
      })(),
      (() => {
        const u = studies.filter((x) => !isDoubleZero(x))
        return u.length ? ivPooled(studies, 'constant').res : null
      })(),
      (() => {
        const u = studies.filter((x) => !isDoubleZero(x))
        return u.length ? ivPooled(studies, 'treatment-arm').res : null
      })(),
    ]
    ests.forEach((e, j) => {
      if (!e || !Number.isFinite(e.estimate)) return
      counts[j]++
      sums[j] += e.estimate
      if (e.ci[0] <= lt && e.ci[1] >= lt) cover[j]++
    })
  }
  return names.map((n, j) => ({ method: n, meanOR: Math.exp(sums[j] / Math.max(1, counts[j])), coverage: (100 * cover[j]) / Math.max(1, counts[j]) }))
}

function SimLab() {
  const [p0, setP0] = useState(0.01)
  const [or, setOr] = useState(2)
  const [ratio, setRatio] = useState<'1' | '3'>('1')
  const [res, setRes] = useState<SimRow[] | null>(null)
  const [seed, setSeed] = useState(11)
  return (
    <Lab title="Lab 2 · Which method is unbiased when events are rare?" description="400 simulated meta-analyses of 10 trials each. Compare the average estimate with the truth.">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
        <SliderField label="Control-group risk" value={p0} onChange={setP0} min={0.002} max={0.1} step={0.002} format={(v) => `${fmt(100 * v, 1)}%`} />
        <SliderField label="True odds ratio" value={or} onChange={setOr} min={0.25} max={5} step={0.25} format={(v) => fmt(v)} />
        <Segmented
          label="Allocation (T:C)"
          value={ratio}
          onChange={setRatio}
          options={[
            { value: '1', label: '1:1' },
            { value: '3', label: '3:1' },
          ]}
        />
        <button
          type="button"
          onClick={() => {
            setRes(simulateRare(p0, or, Number(ratio), seed))
            setSeed(seed + 1)
          }}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Play className="h-4 w-4" /> Simulate
        </button>
      </div>
      {res ? (
        <DataTable
          className="mt-4"
          head={['Method', 'Average OR (geometric)', 'True OR', 'Coverage of 95% CI']}
          rows={res.map((r) => [
            r.method,
            <span key="m" className={Math.abs(Math.log(r.meanOR / or)) > 0.1 ? 'text-bad' : 'text-ok'}>
              {fmt(r.meanOR)}
            </span>,
            fmt(or),
            <span key="c" className={r.coverage < 92 ? 'text-bad' : 'text-ok'}>
              {fmt(r.coverage, 1)}%
            </span>,
          ])}
        />
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Try risk 1%, OR 2, 1:1 — then 3:1. Expect MH to stay close to the truth, inverse-variance methods to shrink towards 1, and Peto to drift once arms are unbalanced.</p>
      )}
    </Lab>
  )
}

const SECTIONS = [
  { id: 'why', title: 'Why sparse data are different' },
  { id: 'zero', title: 'Zero cells and corrections' },
  { id: 'counts', title: 'Methods that use the counts' },
  { id: 'compare', title: 'Comparing methods' },
  { id: 'choose', title: 'Choosing a method' },
]

export default function BinaryRare() {
  return (
    <Lesson
      id="binary-rare"
      sections={SECTIONS}
      refs={['cochrane-ch10', 'mantel1959', 'greenland1985', 'robins1986', 'yusuf1985', 'sweeting2004', 'bradburn2007', 'stijnen2010']}
      objectives={[
        'Explain why inverse-variance methods fail with few events.',
        'Apply Mantel–Haenszel and Peto methods and state when each is appropriate.',
        'Handle zero cells and double-zero studies according to current guidance.',
        'Predict the direction of bias of continuity corrections.',
      ]}
    >
      <Section id="why" title="Why sparse data are different">
        <p>
          Inverse-variance pooling assumes each study’s log OR is approximately normal with a known variance. With few events neither holds: the variance{' '}
          <Tex>{'1/a+1/b+1/c+1/d'}</Tex> is dominated by the smallest cell, is itself estimated very imprecisely, and is correlated with the estimate.
          “Certainly risks of 1 in 1000 constitute rare events, and many would classify risks of 1 in 100 the same way” <Cite id="cochrane-ch10" />.
        </p>
      </Section>

      <Section id="zero" title="Zero cells and corrections">
        <p>A zero in any cell makes the OR or RR (and its variance) undefined. Options:</p>
        <ul>
          <li>
            <strong>Constant correction</strong>: add 0.5 to every cell of affected studies (default in RevMan and metafor for inverse-variance methods). It
            biases estimates towards no effect and inflates their variance, especially with unbalanced arms <Cite id="sweeting2004" />.
          </li>
          <li>
            <strong>Treatment-arm correction</strong>: increments proportional to the reciprocal of the size of the opposite arm,{' '}
            <Tex>{'k_T = n_T/(n_T+n_C)'}</Tex>, <Tex>{'k_C = n_C/(n_T+n_C)'}</Tex>. Less biased than the constant correction when allocation is unbalanced{' '}
            <Cite id="sweeting2004" />, but it cannot remove the bias that inverse-variance weighting itself introduces with sparse data (see Lab 2).
          </li>
          <li>
            <strong>No correction</strong> with methods that work on the counts (MH, Peto, GLMM).
          </li>
        </ul>
        <Callout kind="rule">
          <ul>
            <li>Mantel–Haenszel needs a zero-cell correction only if the same cell is zero in all included studies.</li>
            <li>
              Studies with no events in either arm are, by standard practice, excluded from OR and RR meta-analyses: they carry no information about the
              direction or size of a relative effect.
            </li>
            <li>Risk-difference methods are not suitable for rare events: intervals are too wide and power is low <Cite id="cochrane-ch10" />.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="counts" title="Methods that use the counts">
        <h3>Mantel–Haenszel</h3>
        <Tex block>{'\\widehat{\\mathrm{OR}}_{MH}=\\frac{\\sum_i a_i d_i/N_i}{\\sum_i b_i c_i/N_i},\\qquad \\widehat{\\mathrm{RR}}_{MH}=\\frac{\\sum_i a_i n_{2i}/N_i}{\\sum_i c_i n_{1i}/N_i}'}</Tex>
        <p>
          A common-effect method whose weights do not depend on estimated variances, so it behaves well with sparse data. The variance of the log OR uses the
          Robins–Breslow–Greenland estimator <Cite id="robins1986" />. Cochrane: the MH method is generally preferable to inverse variance for common-effect
          analyses when events are few <Cite id="cochrane-ch10" />.
        </p>
        <h3>Peto one-step odds ratio</h3>
        <Tex block>{'\\ln\\widehat{\\mathrm{OR}}_{Peto}=\\frac{\\sum_i (O_i-E_i)}{\\sum_i V_i},\\qquad \\mathrm{SE}=\\frac{1}{\\sqrt{\\sum_i V_i}}'}</Tex>
        <p>
          where <Tex>{'O_i'}</Tex> is the observed and <Tex>{'E_i'}</Tex> the expected number of events in the treatment arm under the null, and{' '}
          <Tex>{'V_i'}</Tex> the hypergeometric variance. It needs no correction and performs well when events are very rare, effects are small and arms are
          balanced; otherwise it is biased, so it is “not recommended as a default approach” <Cite id="cochrane-ch10" /> <Cite id="bradburn2007" />.
        </p>
      </Section>

      <Section id="compare" title="Comparing methods">
        <MethodLab />
        <Predict
          prompt="Which estimates will sit closest to 1 (no effect)?"
          options={['Mantel–Haenszel', 'Peto', 'The two inverse-variance analyses']}
          reveal={
            <>
              The inverse-variance analyses (OR ≈ 1.8) sit closer to 1 than MH (2.25) and Peto (2.06). With sparse data, inverse-variance weights are
              correlated with the estimates and corrections add pseudo-events, both shrinking towards the null. (In this one sample every method exceeds the
              true 1.6 by chance — Lab 2 shows the systematic behaviour.) Tick “only ~1:1 trials” and the methods move closer together.
            </>
          }
        />
        <SimLab />
        <QuickCheck
          item={{
            id: 'rare-q1',
            q: 'Eight trials of a rare harm (0.3% control risk), all randomised 1:1, expected OR near 1.3. Which analysis is most defensible as primary?',
            options: ['Inverse-variance OR with 0.5 correction', 'Peto odds ratio', 'Risk difference, random effects', 'Exclude all trials with a zero cell'],
            answer: 1,
            why: (
              <>
                Very rare events, balanced arms and a modest effect are exactly Peto’s favourable conditions <Cite id="bradburn2007" />. MH without correction
                is a good sensitivity analysis. RD methods have poor power for rare events, and excluding zero-cell trials throws away information.
              </>
            ),
          }}
        />
      </Section>

      <Section id="choose" title="Choosing a method">
        <DataTable
          head={['Situation', 'Primary analysis', 'Sensitivity analysis']}
          rows={[
            ['Events not rare (> ~5%)', 'Inverse variance, random effects (REML + HKSJ)', 'MH common effect'],
            ['Rare events, balanced arms, OR near 1', 'Peto OR', 'MH OR (no correction)'],
            ['Rare events, unbalanced arms or large effects', 'MH OR / RR (no correction)', 'GLMM or treatment-arm correction'],
            ['Heterogeneity must be modelled with sparse data', 'Binomial–normal GLMM (one-stage)', 'Bayesian model with weakly informative τ prior'],
            ['Double-zero studies', 'Exclude from OR/RR', 'Include via RD or GLMM to show impact'],
          ]}
        />
        <Callout kind="tip">
          <p>
            One-stage models (binomial–normal GLMM, conditional logistic or beta-binomial models) use the exact binomial likelihood and avoid corrections
            altogether <Cite id="stijnen2010" />. In R: <code>metafor::rma.glmm()</code> or <code>meta::metabin(..., method = "GLMM")</code>.
          </p>
        </Callout>
        <p>
          The same binomial-likelihood idea is the recommended route for single proportions — <ModuleLink to="/learn/proportions">Module 5</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'With few events, normal approximations and estimated variances break down.',
          'A 0.5 correction biases towards the null, worst with unbalanced allocation.',
          'MH (no correction) and Peto (very rare, balanced, small effects) are the standard count-based methods.',
          'Exclude double-zero studies from OR/RR analyses; avoid RD for rare events.',
          'One-stage GLMMs model heterogeneity without corrections.',
        ]}
      />
    </Lesson>
  )
}

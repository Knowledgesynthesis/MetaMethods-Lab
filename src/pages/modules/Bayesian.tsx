import { useMemo, useState } from 'react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { CodeBlock } from '@/components/lesson/CodeBlock'
import { LinePlot } from '@/components/plots/LinePlot'
import { C } from '@/components/plots/core'
import { Segmented, SliderField, Stat } from '@/components/ui/controls'
import { FEW_TRIALS } from '@/data/datasets'
import { binaryEffect } from '@/lib/stats/effectSizes'
import { bayesMeta, type TauPrior } from '@/lib/stats/bayes'
import { metaAnalysis } from '@/lib/stats/pairwise'
import { bayesR } from '@/lib/stats/rcode'
import { fmt, fmtCI } from '@/lib/utils'

const EFF = FEW_TRIALS.map((s) => ({ study: s.study, ...binaryEffect(s, 'OR') }))
type PriorKey = 'hn025' | 'hn05' | 'hn1' | 'hc05' | 'unif'
const PRIORS: Record<PriorKey, { label: string; prior: TauPrior; note: string }> = {
  hn025: { label: 'Half-normal(0.25)', prior: { kind: 'halfnormal', scale: 0.25 }, note: 'expects little heterogeneity' },
  hn05: { label: 'Half-normal(0.5)', prior: { kind: 'halfnormal', scale: 0.5 }, note: 'weakly informative for log OR' },
  hn1: { label: 'Half-normal(1.0)', prior: { kind: 'halfnormal', scale: 1 }, note: 'allows very large heterogeneity' },
  hc05: { label: 'Half-Cauchy(0.5)', prior: { kind: 'halfcauchy', scale: 0.5 }, note: 'heavy tail' },
  unif: { label: 'Uniform(0, 4)', prior: { kind: 'uniform', max: 4 }, note: '“vague” — but puts most mass on huge τ' },
}

function PriorLab() {
  const [pk, setPk] = useState<PriorKey>('hn05')
  const [mcid, setMcid] = useState(0.8)
  const yi = EFF.map((e) => e.yi)
  const vi = EFF.map((e) => e.vi)
  const post = useMemo(() => bayesMeta(yi, vi, { tauPrior: PRIORS[pk].prior, muPrior: { mean: 0, sd: 4 } }), [pk, yi, vi])
  const all = useMemo(
    () =>
      (Object.keys(PRIORS) as PriorKey[]).map((k) => ({ k, r: bayesMeta(yi, vi, { tauPrior: PRIORS[k].prior, muPrior: { mean: 0, sd: 4 } }) })),
    [yi, vi],
  )
  const reml = useMemo(() => ({ wald: metaAnalysis(yi, vi, { ciMethod: 'wald' }), hk: metaAnalysis(yi, vi, { ciMethod: 'hksj' }) }), [yi, vi])
  const pBenefit = post.pMuBelow(0)
  const pMcid = post.pMuBelow(Math.log(mcid))
  const tauMax = Math.max(1.5, post.tau.ci[1] * 1.4)
  return (
    <Lab
      title="Lab · Prior sensitivity with three small trials"
      description="Three trials in a rare disease (treatment failure; OR < 1 favours treatment). μ ~ N(0, 4²) on the log-OR scale; choose the prior for τ."
    >
      <DataTable head={['Trial', 'Failures (T)', 'Failures (C)', 'OR [95% CI]']} rows={FEW_TRIALS.map((s, i) => [s.study, `${s.ai}/${s.n1}`, `${s.ci}/${s.n2}`, `${fmt(Math.exp(EFF[i].yi))} [${fmtCI([EFF[i].yi - 1.96 * Math.sqrt(EFF[i].vi), EFF[i].yi + 1.96 * Math.sqrt(EFF[i].vi)], 2, Math.exp)}]`])} />
      <div className="mt-4">
        <Segmented label="Prior for τ" value={pk} onChange={setPk} options={(Object.keys(PRIORS) as PriorKey[]).map((k) => ({ value: k, label: PRIORS[k].label, hint: PRIORS[k].note }))} size="sm" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-sm font-medium">Mean effect μ (posterior) and a new trial’s effect (predictive)</div>
          <LinePlot
            series={[
              { label: 'Posterior of μ', color: C.blue, fill: true, points: post.muDensity.map((p) => ({ x: Math.exp(p.x), y: p.y / Math.exp(p.x) })) },
              { label: 'Predictive θ_new', color: C.vermillion, dashed: true, points: post.predDensity.map((p) => ({ x: Math.exp(p.x), y: p.y / Math.exp(p.x) })) },
            ]}
            xLabel="Odds ratio"
            vlines={[{ x: 1, color: C.ink }]}
            xDomain={[0.05, 2.5]}
          />
        </div>
        <div>
          <div className="mb-1 text-sm font-medium">Heterogeneity τ: prior vs posterior</div>
          <LinePlot
            series={[
              { label: 'Prior', color: C.muted, dashed: true, points: post.tauDensity.filter((p) => p.x <= tauMax).map((p) => ({ x: p.x, y: p.prior })) },
              { label: 'Posterior', color: C.purple, fill: true, points: post.tauDensity.filter((p) => p.x <= tauMax).map((p) => ({ x: p.x, y: p.y })) },
            ]}
            xLabel="τ (log-OR scale)"
            xDomain={[0, tauMax]}
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Posterior median OR" value={fmt(Math.exp(post.mu.median))} sub={`95% CrI ${fmtCI(post.mu.ci, 2, Math.exp)}`} tone="primary" />
        <Stat label="P(OR < 1)" value={`${fmt(100 * pBenefit, 0)}%`} sub="probability of any benefit" />
        <Stat label={`P(OR < ${fmt(mcid)})`} value={`${fmt(100 * pMcid, 0)}%`} sub="clinically important benefit" />
        <Stat label="τ posterior median" value={fmt(post.tau.median, 2)} sub={`95% CrI ${fmt(post.tau.ci[0], 2)}–${fmt(post.tau.ci[1], 2)}`} />
      </div>
      <div className="mt-3 max-w-sm">
        <SliderField label="Threshold for an important benefit (OR)" value={mcid} onChange={setMcid} min={0.5} max={0.95} step={0.05} format={(v) => fmt(v)} />
      </div>
      <DataTable
        className="mt-4"
        head={['Analysis', 'OR (median / estimate)', '95% interval for the mean', '95% interval for a new trial']}
        rows={[
          ...all.map(({ k, r }) => [
            <span key="l" className={k === pk ? 'font-semibold text-primary' : ''}>
              Bayes, τ ~ {PRIORS[k].label}
            </span>,
            fmt(Math.exp(r.mu.median)),
            fmtCI(r.mu.ci, 2, Math.exp),
            fmtCI(r.theta.ci, 2, Math.exp),
          ]),
          ['REML + Wald', fmt(Math.exp(reml.wald.estimate)), fmtCI(reml.wald.ci, 2, Math.exp), reml.wald.pi ? fmtCI(reml.wald.pi, 2, Math.exp) : '—'],
          ['REML + HKSJ', fmt(Math.exp(reml.hk.estimate)), fmtCI(reml.hk.ci, 2, Math.exp), reml.hk.pi ? fmtCI(reml.hk.pi, 2, Math.exp) : '—'],
        ]}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        REML estimates τ² = {fmt(reml.wald.tau2, 3)} here. Bayesian results are computed by exact numerical integration (checked against bayesmeta).
      </p>
      <CodeBlock code={bayesR(yi, vi.map(Math.sqrt), EFF.map((e) => e.study), pk.startsWith('hn') ? (PRIORS[pk].prior as { scale: number }).scale : 0.5, 4)} title="Reproduce in R (bayesmeta)" />
    </Lab>
  )
}

const SECTIONS = [
  { id: 'idea', title: 'The Bayesian idea' },
  { id: 'model', title: 'The hierarchical model and its priors' },
  { id: 'few', title: 'Why it matters most with few studies' },
  { id: 'report', title: 'Reporting a Bayesian meta-analysis' },
]

export default function Bayesian() {
  return (
    <Lesson
      id="bayesian"
      sections={SECTIONS}
      refs={['rover2020', 'rover2021', 'turner2015', 'friede2017', 'cochrane-ch10', 'higgins2009']}
      objectives={[
        'Interpret posterior distributions, credible intervals and posterior probabilities.',
        'Choose and justify a weakly informative prior for τ.',
        'Explain why Bayesian random-effects analysis is attractive when studies are few.',
        'Run and report a prior sensitivity analysis.',
      ]}
    >
      <Section id="idea" title="The Bayesian idea">
        <Tex block>{'p(\\mu,\\tau\\mid y)\\;\\propto\\;p(y\\mid\\mu,\\tau)\\;p(\\mu)\\;p(\\tau)'}</Tex>
        <p>
          The posterior combines the likelihood of the data with prior distributions. It answers the questions decision-makers actually ask: “What is the
          probability that the treatment reduces the odds of failure by at least 20%?” A 95% <strong>credible interval</strong> contains the parameter with
          95% posterior probability — a direct statement a confidence interval cannot make.
        </p>
      </Section>

      <Section id="model" title="The hierarchical model and its priors">
        <Tex block>{'\\hat\\theta_i\\mid\\theta_i\\sim N(\\theta_i,v_i),\\qquad \\theta_i\\mid\\mu,\\tau\\sim N(\\mu,\\tau^2),\\qquad \\mu\\sim N(0,4^2),\\qquad \\tau\\sim\\text{half-normal}(s)'}</Tex>
        <ul>
          <li>
            <strong>Prior for μ</strong>: a vague normal is usually harmless — the data dominate.
          </li>
          <li>
            <strong>Prior for τ</strong>: matters, because few studies carry little information about heterogeneity. Weakly informative half-normal priors
            (scale 0.5 for log ORs is a common default) or empirically based priors are recommended <Cite id="rover2021" /> <Cite id="turner2015" />.
          </li>
          <li>
            “Vague” priors for τ can be strongly informative in practice: a Uniform(0, 4) prior on the log-OR scale puts most of its mass on implausibly large
            heterogeneity.
          </li>
        </ul>
        <p>
          Here the model is solved by integrating μ out analytically and τ numerically — no MCMC, no convergence diagnostics needed <Cite id="rover2020" />.
        </p>
      </Section>

      <Section id="few" title="Why it matters most with few studies">
        <p>
          With two or three studies, frequentist random-effects analysis has no good option: τ² is often estimated as 0 (then the Wald CI is too narrow), or
          HKSJ produces intervals spanning orders of magnitude (Module 3). A Bayesian analysis averages over plausible values of τ, weighted by data and prior{' '}
          <Cite id="friede2017" />. Cochrane lists the Bayesian approach as an option that encompasses full uncertainty in τ <Cite id="cochrane-ch10" />.
        </p>
        <PriorLab />
        <Predict
          prompt="Switch from Half-normal(0.5) to Uniform(0, 4). What happens to the 95% interval for the mean OR?"
          options={['Narrower', 'About the same', 'Much wider']}
          reveal={
            <>
              Much wider: the “vague” uniform prior expects large heterogeneity, so the posterior for τ shifts upwards and uncertainty about μ balloons. The
              posterior for τ barely differs from the prior with three trials — the data cannot learn τ. That is why the τ prior must be chosen deliberately and
              varied in a sensitivity analysis.
            </>
          }
        />
        <QuickCheck
          item={{
            id: 'bayes-q1',
            q: 'A Bayesian meta-analysis reports: posterior median OR 0.62, 95% CrI 0.33 to 1.15, P(OR < 1) = 93%. Which interpretation is correct?',
            options: [
              'The treatment does not work because the interval includes 1.',
              'Given the model and priors, there is a 93% probability that the treatment reduces the odds of failure.',
              'There is a 93% chance that a future trial will be statistically significant.',
              'The result is not valid because Bayesian analyses depend on priors.',
            ],
            answer: 1,
            why: (
              <>
                Posterior probabilities are direct statements about the parameter, conditional on the model and priors. A CrI including 1 does not mean “no
                effect”; the probability of benefit is high, though the size of benefit remains uncertain.
              </>
            ),
          }}
        />
      </Section>

      <Section id="report" title="Reporting a Bayesian meta-analysis">
        <ul>
          <li>State and justify all priors (with plots), especially for τ; cite empirical sources when used <Cite id="turner2015" />.</li>
          <li>Report posterior medians with 95% credible intervals, the predictive distribution for a new study, and probabilities of clinically relevant effects.</li>
          <li>Present a prior sensitivity analysis — the lab’s table is the minimum.</li>
          <li>When MCMC is used (gemtc, brms, multinma), report convergence diagnostics (R̂, effective sample sizes).</li>
        </ul>
        <p>
          Bring all modules together — choosing methods, rating certainty and reporting — in <ModuleLink to="/learn/workflow">Module 11</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'Posterior probabilities answer decision questions directly; a credible interval is a probability statement about the parameter.',
          'Priors for μ rarely matter; priors for τ matter a great deal when studies are few.',
          'Use weakly informative or empirical priors for τ; “vague” uniform priors can be strongly informative.',
          'Bayesian random-effects models handle very small meta-analyses more sensibly than Wald or HKSJ intervals.',
          'Always report a prior sensitivity analysis.',
        ]}
      />
    </Lesson>
  )
}

import { useMemo, useState } from 'react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { CodeBlock } from '@/components/lesson/CodeBlock'
import { ForestPlot } from '@/components/plots/ForestPlot'
import { Segmented } from '@/components/ui/controls'
import { PREVALENCE_STUDIES } from '@/data/datasets'
import {
  harmonicMean,
  inversePFT,
  pft,
  poolGLMM,
  poolTransformed,
  studyProportionCIs,
  type PropTransform,
  type ProportionPoolResult,
} from '@/lib/stats/proportions'
import { proportionsR } from '@/lib/stats/rcode'
import { fmt } from '@/lib/utils'

type Choice = PropTransform | 'GLMM'
const LABEL: Record<Choice, string> = {
  PR: 'Raw proportion',
  PLO: 'Logit',
  PAS: 'Arcsine √p',
  PFT: 'Freeman–Tukey',
  GLMM: 'GLMM (one-stage)',
}

function pool(studies: { x: number; n: number }[], c: Choice): ProportionPoolResult {
  return c === 'GLMM' ? poolGLMM(studies) : poolTransformed(studies, c, { tau2Method: 'REML', ciMethod: 'wald' })
}

function TransformLab() {
  const [choice, setChoice] = useState<Choice>('GLMM')
  const studies = PREVALENCE_STUDIES
  const all = useMemo(() => (['PR', 'PLO', 'PAS', 'PFT', 'GLMM'] as Choice[]).map((c) => ({ c, r: pool(studies, c) })), [studies])
  const cur = all.find((a) => a.c === choice)!.r
  const cis = useMemo(() => studyProportionCIs(studies), [studies])
  return (
    <Lab title="Lab 1 · One dataset, five ways to pool a prevalence" description="14 community surveys (n = 28 to 2600), including one with zero cases. Random effects (REML, Wald CI) for the two-stage methods.">
      <Segmented value={choice} onChange={setChoice} options={(Object.keys(LABEL) as Choice[]).map((k) => ({ value: k, label: LABEL[k] }))} size="sm" />
      <div className="mt-4">
        <ForestPlot
          rows={studies.map((s, i) => ({ label: `${s.study} (${s.x}/${s.n})`, yi: 100 * cis[i].p, ci: [100 * cis[i].ci[0], 100 * cis[i].ci[1]] as [number, number] }))}
          summaries={[{ label: LABEL[choice], est: 100 * cur.estimate, ci: [100 * cur.ci[0], 100 * cur.ci[1]], pi: cur.pi ? [100 * cur.pi[0], 100 * cur.pi[1]] : null }]}
          xLabel="Prevalence (%) — study CIs are exact (Clopper–Pearson)"
          digits={1}
          showWeights={false}
        />
        {cur.notes.length > 0 && <p className="mt-1 text-xs text-warn">{cur.notes.join(' ')}</p>}
      </div>
      <DataTable
        className="mt-4"
        head={['Method', 'Pooled %', '95% CI', '95% PI', 'τ² (analysis scale)', 'I²']}
        rows={all.map(({ c, r }) => [
          <span key="l" className={c === choice ? 'font-semibold text-primary' : ''}>
            {LABEL[c]}
          </span>,
          fmt(100 * r.estimate, 2),
          `${fmt(100 * r.ci[0], 2)} to ${fmt(100 * r.ci[1], 2)}`,
          r.pi ? `${fmt(100 * r.pi[0], 1)} to ${fmt(100 * r.pi[1], 1)}` : '—',
          fmt(r.tau2, 4),
          r.I2 === null ? '—' : `${fmt(r.I2, 0)}%`,
        ])}
      />
      <CodeBlock code={proportionsR(studies.map((s) => s.study), studies.map((s) => s.x), studies.map((s) => s.n))} title="Reproduce in R (meta)" />
    </Lab>
  )
}

const TRAP = [
  { study: 'Small centre 1', x: 1, n: 20 },
  { study: 'Small centre 2', x: 0, n: 15 },
  { study: 'Small centre 3', x: 1, n: 25 },
  { study: 'Registry A', x: 12, n: 5000 },
  { study: 'Registry B', x: 30, n: 12000 },
  { study: 'Small centre 4', x: 0, n: 30 },
]

function TrapLab() {
  const rows = useMemo(() => (['PFT', 'PLO', 'PAS', 'GLMM'] as Choice[]).map((c) => ({ c, r: pool(TRAP, c) })), [])
  const ft = rows[0].r
  const nh = harmonicMean(TRAP.map((s) => s.n))
  const crude = TRAP.reduce((a, s) => a + s.x, 0) / TRAP.reduce((a, s) => a + s.n, 0)
  return (
    <Lab title="Lab 2 · The Freeman–Tukey back-transformation trap" description="Device-infection rate: two large registries and four small centres.">
      <DataTable head={['Study', 'Events', 'n', 'Rate']} rows={TRAP.map((s) => [s.study, s.x, s.n, `${fmt((100 * s.x) / s.n, 2)}%`])} />
      <DataTable
        className="mt-4"
        head={['Method', 'Pooled rate', 'Comment']}
        rows={[
          ...rows.map(({ c, r }) => [
            LABEL[c],
            <span key="v" className={c === 'PFT' ? 'font-semibold text-bad' : ''}>
              {fmt(100 * r.estimate, 3)}%
            </span>,
            c === 'PFT'
              ? `pooled FT value ${fmt(ft.analysisEstimate, 4)} < FT(0 events, n = ${fmt(nh, 1)}) = ${fmt(pft(0, nh), 4)} → back-transforms to exactly 0`
              : c === 'PLO'
                ? '0.5 added to zero-event studies; small studies pull the mean up'
                : c === 'GLMM'
                  ? 'exact binomial likelihood, no corrections'
                  : 'variance-stabilising; back-transform needs no n',
          ]),
          ['Crude pooled rate (Σx / Σn)', `${fmt(100 * crude, 3)}%`, 'reference point only (ignores heterogeneity)'],
        ]}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Check: the inverse at n = 12 000 would give {fmt(100 * inversePFT(ft.analysisEstimate, 12000), 3)}%; at n = 15 it gives{' '}
        {fmt(100 * inversePFT(ft.analysisEstimate, 15), 3)}%. The answer depends on an arbitrary choice of n.
      </p>
    </Lab>
  )
}

const SECTIONS = [
  { id: 'problem', title: 'Why proportions need care' },
  { id: 'two-stage', title: 'Two-stage: transform, pool, back-transform' },
  { id: 'trap', title: 'The Freeman–Tukey trap' },
  { id: 'glmm', title: 'One-stage: the binomial–normal GLMM' },
  { id: 'heterogeneity', title: 'Heterogeneity in prevalence reviews' },
]

export default function Proportions() {
  return (
    <Lesson
      id="proportions"
      sections={SECTIONS}
      refs={['freeman1950', 'miller1978', 'schwarzer2019', 'doi2021', 'stijnen2010', 'lin2020', 'hamza2008', 'viechtbauer2010']}
      objectives={[
        'Explain why raw proportions violate the assumptions of inverse-variance pooling.',
        'Apply logit, arcsine and Freeman–Tukey transformations and back-transform correctly.',
        'Recognise when the Freeman–Tukey back-transformation gives nonsense.',
        'Fit and interpret a random-intercept logistic (GLMM) meta-analysis.',
      ]}
    >
      <Section id="problem" title="Why proportions need care">
        <p>
          A proportion <Tex>{'\\hat p = x/n'}</Tex> has variance <Tex>{'p(1-p)/n'}</Tex>, which depends on <Tex>{'p'}</Tex> itself. Near 0 or 1 this
          causes three problems: the estimated variance is 0 when <Tex>{'x=0'}</Tex> (an infinite weight), the sampling distribution is skewed, and
          symmetric CIs cross the 0–1 boundary. Weights become correlated with estimates — studies that happen to observe fewer events get more weight.
        </p>
      </Section>

      <Section id="two-stage" title="Two-stage: transform, pool, back-transform">
        <DataTable
          head={['Transformation', 'Estimate', 'Variance', 'Back-transform']}
          rows={[
            ['Raw (PR)', 'x/n', 'p(1−p)/n', '—'],
            ['Logit (PLO)', 'ln[x/(n−x)]', '1/x + 1/(n−x)', 'expit(·)'],
            ['Arcsine (PAS)', 'arcsin √(x/n)', '1/(4n)', 'sin²(·)'],
            ['Freeman–Tukey (PFT)', '½[arcsin√(x/(n+1)) + arcsin√((x+1)/(n+1))]', '1/(4n+2)', 'Miller (1978): requires one n'],
          ]}
        />
        <p className="mt-3">
          Logit is the natural scale for proportions but needs a correction when <Tex>{'x=0'}</Tex> or <Tex>{'x=n'}</Tex>. The arcsine and Freeman–Tukey
          transformations stabilise the variance (it no longer depends on <Tex>{'p'}</Tex>) and handle zeros without correction <Cite id="freeman1950" />.
        </p>
        <TransformLab />
        <Predict
          prompt="Select “Raw proportion”, then “GLMM”. Which gives the higher pooled prevalence, and why?"
          options={['Raw', 'GLMM', 'Same']}
          reveal={
            <>
              The raw-scale pooled estimate is lower: studies with low observed prevalence have smaller variances <Tex>{'\\hat p(1-\\hat p)/n'}</Tex>, so they
              receive more weight — a built-in downward bias. The raw CI and PI can also extend below 0%.
            </>
          }
        />
      </Section>

      <Section id="trap" title="The Freeman–Tukey trap">
        <p>
          Miller’s inversion of the double arcsine requires a single sample size <Tex>{'n'}</Tex>. For a pooled estimate there is none, so software uses the
          harmonic mean of the study sizes. When sizes differ widely, the harmonic mean is dominated by the small studies and the back-transformed pooled
          proportion can be badly wrong — including exactly 0 <Cite id="schwarzer2019" />.
        </p>
        <TrapLab />
        <Callout kind="evidence">
          <p>
            Schwarzer et al. recommend using the Freeman–Tukey transformation only with special caution and point to GLMMs as the alternative{' '}
            <Cite id="schwarzer2019" />. Others argue the criticism is overstated for typical datasets <Cite id="doi2021" />. The back-transformation
            problem itself is not in dispute: if you use it, report the n used for back-transformation and check the result against a GLMM.
          </p>
        </Callout>
      </Section>

      <Section id="glmm" title="One-stage: the binomial–normal GLMM">
        <Tex block>{'x_i\\sim\\mathrm{Bin}(n_i,p_i),\\qquad \\mathrm{logit}(p_i)=\\mu+u_i,\\quad u_i\\sim N(0,\\tau^2)'}</Tex>
        <p>
          The likelihood is exact, so no continuity correction or variance approximation is needed, and zero-event studies contribute correctly{' '}
          <Cite id="stijnen2010" /> <Cite id="hamza2008" />. The pooled estimate <Tex>{'\\mathrm{expit}(\\hat\\mu)'}</Tex> is the median prevalence across
          settings. Here it is fitted by maximum likelihood with adaptive Gauss–Hermite quadrature (as <code>lme4::glmer</code>, used by{' '}
          <code>metafor::rma.glmm</code> and <code>meta::metaprop(method = "GLMM")</code>) <Cite id="lin2020" />.
        </p>
        <Callout kind="pitfall">
          <ul>
            <li>There are no study weights in the inverse-variance sense; forest-plot weights from GLMM software are approximations.</li>
            <li>With very few studies, the Wald CI for μ can be too narrow — interpret cautiously or use a Bayesian model.</li>
            <li>
              <Tex>{'\\mathrm{expit}(\\hat\\mu)'}</Tex> is a median, not a mean, prevalence across settings when τ &gt; 0.
            </li>
          </ul>
        </Callout>
        <QuickCheck
          item={{
            id: 'prop-q1',
            q: 'A prevalence review includes one study with 0/40 events and three large registries. Which primary analysis best handles the zero?',
            options: [
              'Raw proportions with inverse-variance weights',
              'Logit transformation with a 0.5 correction',
              'Random-intercept logistic regression (GLMM)',
              'Exclude the zero-event study',
            ],
            answer: 2,
            why: (
              <>
                The GLMM uses the binomial likelihood, so 0/40 contributes exactly the information it contains without corrections. Raw proportions give it zero
                variance; the logit needs an arbitrary correction; excluding it biases the estimate upwards.
              </>
            ),
          }}
        />
      </Section>

      <Section id="heterogeneity" title="Heterogeneity in prevalence reviews">
        <p>
          Prevalence studies almost always show I² above 90%: large surveys have tiny within-study variances (Module 3). Report τ on the logit scale and,
          more usefully, the prediction interval on the percentage scale — it tells readers what prevalence to expect in a new setting. Then explain
          heterogeneity with pre-specified characteristics (case definition, sampling frame, region) using meta-regression —{' '}
          <ModuleLink to="/learn/meta-regression">Module 6</ModuleLink>.
        </p>
      </Section>

      <Takeaways
        items={[
          'Raw-scale pooling of proportions gives correlated weights and impossible CIs near 0 or 1.',
          'Transformations stabilise variance, but every two-stage method needs a back-transformation.',
          'The Freeman–Tukey back-transformation depends on an arbitrary n and can return nonsensical values.',
          'A binomial–normal GLMM is the preferred primary analysis; state the method and check sensitivity.',
          'For prevalence, I² is nearly always high and uninformative; report τ and the prediction interval.',
        ]}
      />
    </Lesson>
  )
}

import { useMemo, useState } from 'react'
import { Lesson, Section } from '@/components/lesson/Lesson'
import { Callout, Cite, DataTable, Lab, ModuleLink, Predict, QuickCheck, Takeaways } from '@/components/lesson/blocks'
import { Tex } from '@/components/lesson/Tex'
import { NumberField, Segmented, SliderField, Stat } from '@/components/ui/controls'
import { AxisBottom, AxisLeft, C, Legend, linear, niceTicks, useWidth } from '@/components/plots/core'
import {
  absoluteFromRelative,
  binaryEffect,
  combineGroups,
  hedgesG,
  logHRFromCI,
  logRatioOfMeans,
  meanDifference,
  meanSDFromMedian,
  orToRR,
  sdFromCI,
  sdFromSE,
  smdToLogOR,
} from '@/lib/stats/effectSizes'
import { qnorm, qt } from '@/lib/stats/distributions'
import { fmt, fmtCI } from '@/lib/utils'

const Z = qnorm(0.975)

function TwoByTwoLab() {
  const [ai, setAi] = useState(15)
  const [n1, setN1] = useState(120)
  const [ci, setCi] = useState(30)
  const [n2, setN2] = useState(118)
  const valid = [ai, n1, ci, n2].every((v) => Number.isFinite(v) && v >= 0) && ai <= n1 && ci <= n2 && n1 > 0 && n2 > 0
  const r = useMemo(() => {
    if (!valid) return null
    const rr = binaryEffect({ ai, n1, ci, n2 }, 'RR')
    const or = binaryEffect({ ai, n1, ci, n2 }, 'OR')
    const rd = binaryEffect({ ai, n1, ci, n2 }, 'RD')
    const ciOf = (e: { yi: number; vi: number }): [number, number] => [e.yi - Z * Math.sqrt(e.vi), e.yi + Z * Math.sqrt(e.vi)]
    return { rr, or, rd, ciRR: ciOf(rr), ciOR: ciOf(or), ciRD: ciOf(rd), p1: ai / n1, p2: ci / n2 }
  }, [ai, n1, ci, n2, valid])
  return (
    <Lab title="Lab 1 · 2×2 calculator" description="Enter one trial's counts. Ratios are computed on the log scale (where their sampling distribution is approximately normal) and back-transformed.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-2 text-sm">
            <span />
            <span className="text-xs font-medium text-muted-foreground">Events</span>
            <span className="text-xs font-medium text-muted-foreground">Total</span>
            <span className="text-sm font-medium">Treatment</span>
            <NumberField label="" value={ai} onChange={setAi} min={0} />
            <NumberField label="" value={n1} onChange={setN1} min={1} />
            <span className="text-sm font-medium">Control</span>
            <NumberField label="" value={ci} onChange={setCi} min={0} />
            <NumberField label="" value={n2} onChange={setN2} min={1} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              ['Typical', 15, 120, 30, 118],
              ['Common outcome', 60, 100, 80, 100],
              ['Zero cell', 0, 150, 6, 148],
              ['No effect', 20, 200, 20, 200],
            ].map(([l, a, b, c, d]) => (
              <button
                key={l as string}
                type="button"
                className="rounded-full border px-2.5 py-1 hover:bg-accent"
                onClick={() => {
                  setAi(a as number)
                  setN1(b as number)
                  setCi(c as number)
                  setN2(d as number)
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {r ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Risk (treat.)" value={`${fmt(100 * r.p1, 1)}%`} />
              <Stat label="Risk (control)" value={`${fmt(100 * r.p2, 1)}%`} />
              <Stat label="Risk ratio" value={fmt(Math.exp(r.rr.yi))} sub={`95% CI ${fmtCI(r.ciRR, 2, Math.exp)}`} tone="primary" />
              <Stat label="Odds ratio" value={fmt(Math.exp(r.or.yi))} sub={`95% CI ${fmtCI(r.ciOR, 2, Math.exp)}`} tone="primary" />
              <Stat label="Risk difference" value={`${fmt(100 * r.rd.yi, 1)} pp`} sub={`95% CI ${fmtCI(r.ciRD, 1, (x) => 100 * x)}`} />
              <Stat
                label={r.rd.yi < 0 ? 'NNT (benefit)' : 'NNH (harm)'}
                value={r.rd.yi === 0 ? '∞' : fmt(1 / Math.abs(r.rd.yi), 1)}
                sub="over the trial's follow-up"
              />
              <Stat label="SE of ln RR" value={fmt(Math.sqrt(r.rr.vi), 3)} />
              <Stat label="SE of ln OR" value={fmt(Math.sqrt(r.or.vi), 3)} />
            </div>
            {r.rr.corrected && (
              <Callout kind="pitfall" title="Zero cell detected">
                <p>
                  RR and OR are undefined with a zero cell, so 0.5 was added to all four cells (the metafor/RevMan default for inverse-variance
                  methods). This pulls the estimate towards 1 — Module 4 shows methods that avoid it.
                </p>
              </Callout>
            )}
          </div>
        ) : (
          <p className="text-sm text-bad">Events must be between 0 and the group total.</p>
        )}
      </div>
    </Lab>
  )
}

function OrRrLab() {
  const [or, setOr] = useState(0.5)
  const [p0, setP0] = useState(0.3)
  const [ref, width] = useWidth<HTMLDivElement>()
  const h = 240
  const m = { l: 48, r: 16, t: 12, b: 40 }
  const x = linear([0, 0.9], [m.l, width - m.r])
  const y = linear([0, 1.6], [h - m.b, m.t])
  const pts = Array.from({ length: 91 }, (_, i) => i / 100)
  const rr = orToRR(or, p0)
  const abs = absoluteFromRelative(p0, 'OR', or)
  return (
    <Lab title="Lab 2 · When does an odds ratio approximate a risk ratio?" description="Hold the OR fixed and change the control-group risk.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
        <div className="space-y-4">
          <SliderField label="Odds ratio" value={or} onChange={setOr} min={0.1} max={3} step={0.05} format={(v) => fmt(v)} />
          <SliderField label="Control-group risk" value={p0} onChange={setP0} min={0.01} max={0.9} step={0.01} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Implied RR" value={fmt(rr)} tone="primary" />
            <Stat label="Treated risk" value={`${fmt(100 * abs.p1, 1)}%`} />
            <Stat label="Risk difference" value={`${fmt(100 * abs.rd, 1)} pp`} />
            <Stat label={abs.rd < 0 ? 'NNT' : 'NNH'} value={fmt(abs.nnt, 1)} />
          </div>
          <p className="text-xs text-muted-foreground">
            RR = OR / (1 − p₀ + p₀·OR) <Cite id="zhang1998" />.
          </p>
        </div>
        <div ref={ref}>
          <svg width={width} height={h} role="img" aria-label="Implied risk ratio as a function of control-group risk">
            <AxisLeft scale={y} x={m.l} ticks={niceTicks(0, 1.6, 4)} format={(v) => fmt(v, 1)} label="Ratio" grid={width - m.r} />
            <AxisBottom scale={x} y={h - m.b} ticks={niceTicks(0, 0.9, 6)} format={(v) => `${Math.round(v * 100)}%`} label="Control-group risk" />
            <line x1={x(0)} x2={x(0.9)} y1={y(or)} y2={y(or)} stroke={C.orange} strokeWidth={2} strokeDasharray="5 4" />
            <path
              d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(p)},${y(Math.min(1.6, orToRR(or, p)))}`).join(' ')}
              fill="none"
              stroke={C.blue}
              strokeWidth={2.5}
            />
            <circle cx={x(p0)} cy={y(Math.min(1.6, rr))} r={5} fill={C.blue} />
          </svg>
          <Legend
            items={[
              { label: 'Odds ratio (fixed)', color: C.orange, shape: 'dash' },
              { label: 'Implied risk ratio', color: C.blue, shape: 'line' },
            ]}
          />
        </div>
      </div>
    </Lab>
  )
}

function ContinuousLab() {
  const [m1, setM1] = useState(22)
  const [s1, setS1] = useState(8)
  const [n1, setN1] = useState(40)
  const [m2, setM2] = useState(26)
  const [s2, setS2] = useState(9)
  const [n2, setN2] = useState(42)
  const ok = [m1, s1, n1, m2, s2, n2].every(Number.isFinite) && s1 > 0 && s2 > 0 && n1 > 1 && n2 > 1
  const res = useMemo(() => {
    if (!ok) return null
    const T = { mean: m1, sd: s1, n: n1 }
    const Cc = { mean: m2, sd: s2, n: n2 }
    const md = meanDifference(T, Cc)
    const g = hedgesG(T, Cc)
    const rom = m1 > 0 && m2 > 0 ? logRatioOfMeans(T, Cc) : null
    return { md, g, rom }
  }, [ok, m1, s1, n1, m2, s2, n2])
  return (
    <Lab title="Lab 3 · Continuous outcomes: MD, SMD (Hedges' g) and ratio of means" description="Default values: a depression score (lower is better).">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Mean (T)" value={m1} onChange={setM1} step={0.5} />
          <NumberField label="SD (T)" value={s1} onChange={setS1} step={0.5} min={0} />
          <NumberField label="n (T)" value={n1} onChange={setN1} min={2} />
          <NumberField label="Mean (C)" value={m2} onChange={setM2} step={0.5} />
          <NumberField label="SD (C)" value={s2} onChange={setS2} step={0.5} min={0} />
          <NumberField label="n (C)" value={n2} onChange={setN2} min={2} />
        </div>
        {res ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Mean difference" value={fmt(res.md.yi)} sub={`95% CI ${fmtCI([res.md.yi - Z * Math.sqrt(res.md.vi), res.md.yi + Z * Math.sqrt(res.md.vi)])}`} tone="primary" />
            <Stat label="Cohen's d" value={fmt(res.g.d, 3)} sub="biased upwards in small samples" />
            <Stat
              label="Hedges' g"
              value={fmt(res.g.yi, 3)}
              sub={`J = ${fmt(res.g.J, 4)}; CI ${fmtCI([res.g.yi - Z * Math.sqrt(res.g.vi), res.g.yi + Z * Math.sqrt(res.g.vi)])}`}
              tone="primary"
            />
            <Stat label="Ratio of means" value={res.rom ? fmt(Math.exp(res.rom.yi), 3) : 'n/a'} sub="bias-corrected (Lajeunesse 2015)" />
            <Stat label="g as log OR" value={fmt(smdToLogOR(res.g.yi), 3)} sub={`OR ≈ ${fmt(Math.exp(smdToLogOR(res.g.yi)))} (Chinn 2000)`} />
            <Stat label="Skew check (T)" value={m1 < 2 * s1 ? 'possible skew' : 'ok'} sub="mean < 2·SD on a bounded scale" tone={m1 < 2 * s1 ? 'warn' : 'ok'} />
          </div>
        ) : (
          <p className="text-sm text-bad">SDs must be positive and n ≥ 2.</p>
        )}
      </div>
    </Lab>
  )
}

function ExtractionLab() {
  const [tool, setTool] = useState<'median' | 'ci' | 'combine' | 'hr'>('median')
  const [med, setMed] = useState({ n: 60, median: 12, q1: 8, q3: 18, min: 2, max: 40 })
  const [useRange, setUseRange] = useState<'iqr' | 'range' | 'both'>('iqr')
  const [ci, setCi] = useState({ lower: 4.1, upper: 7.9, n: 25, se: 0.9 })
  const [g, setG] = useState({ m1: 10, s1: 3, n1: 30, m2: 14, s2: 4, n2: 32 })
  const [hr, setHr] = useState({ hr: 0.78, lo: 0.64, hi: 0.95 })
  const est = meanSDFromMedian({
    n: med.n,
    median: med.median,
    ...(useRange !== 'range' ? { q1: med.q1, q3: med.q3 } : {}),
    ...(useRange !== 'iqr' ? { min: med.min, max: med.max } : {}),
  })
  const comb = combineGroups({ mean: g.m1, sd: g.s1, n: g.n1 }, { mean: g.m2, sd: g.s2, n: g.n2 })
  const lhr = logHRFromCI(hr.hr, hr.lo, hr.hi)
  return (
    <Lab title="Lab 4 · Data-extraction toolkit" description="The conversions you need when papers report the 'wrong' statistic. Same formulas as R's meta package.">
      <Segmented
        value={tool}
        onChange={setTool}
        options={[
          { value: 'median', label: 'Median → mean/SD' },
          { value: 'ci', label: 'SD from SE or CI' },
          { value: 'combine', label: 'Combine two arms' },
          { value: 'hr', label: 'log HR from CI' },
        ]}
      />
      <div className="mt-4">
        {tool === 'median' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Segmented
                size="sm"
                value={useRange}
                onChange={setUseRange}
                options={[
                  { value: 'iqr', label: 'median + IQR' },
                  { value: 'range', label: 'median + range' },
                  { value: 'both', label: 'all five' },
                ]}
              />
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="n" value={med.n} onChange={(v) => setMed({ ...med, n: v })} min={2} />
                <NumberField label="Median" value={med.median} onChange={(v) => setMed({ ...med, median: v })} />
                {useRange !== 'range' && <NumberField label="Q1" value={med.q1} onChange={(v) => setMed({ ...med, q1: v })} />}
                {useRange !== 'range' && <NumberField label="Q3" value={med.q3} onChange={(v) => setMed({ ...med, q3: v })} />}
                {useRange !== 'iqr' && <NumberField label="Min" value={med.min} onChange={(v) => setMed({ ...med, min: v })} />}
                {useRange !== 'iqr' && <NumberField label="Max" value={med.max} onChange={(v) => setMed({ ...med, max: v })} />}
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Estimated mean" value={est ? fmt(est.mean, 2) : '—'} sub="Luo et al. 2018" tone="primary" />
                <Stat label="Estimated SD" value={est ? fmt(est.sd, 2) : '—'} sub={useRange === 'both' ? 'Shi et al. 2020' : 'Wan et al. 2014'} tone="primary" />
              </div>
              {est && Math.abs(med.median - (med.q1 + med.q3) / 2) > 0.25 * (med.q3 - med.q1) && useRange !== 'range' && (
                <p className="text-sm text-warn">The median is far from the middle of the IQR: the data look skewed, so normal-based conversion may mislead. Consider a sensitivity analysis or the ratio of means.</p>
              )}
            </div>
          </div>
        )}
        {tool === 'ci' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="n (group)" value={ci.n} onChange={(v) => setCi({ ...ci, n: v })} min={2} />
              <NumberField label="SE of mean" value={ci.se} onChange={(v) => setCi({ ...ci, se: v })} step={0.1} />
              <NumberField label="95% CI lower" value={ci.lower} onChange={(v) => setCi({ ...ci, lower: v })} step={0.1} />
              <NumberField label="95% CI upper" value={ci.upper} onChange={(v) => setCi({ ...ci, upper: v })} step={0.1} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="SD from SE" value={fmt(sdFromSE(ci.se, ci.n), 2)} sub="SD = SE·√n" tone="primary" />
              <Stat
                label="SD from CI"
                value={fmt(sdFromCI(ci.lower, ci.upper, ci.n), 2)}
                sub={ci.n < 60 ? `uses t(${ci.n - 1}) = ${fmt(qt(0.975, ci.n - 1), 3)} (n < 60)` : 'uses z = 1.96'}
                tone="primary"
              />
            </div>
          </div>
        )}
        {tool === 'combine' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="Mean 1" value={g.m1} onChange={(v) => setG({ ...g, m1: v })} />
              <NumberField label="SD 1" value={g.s1} onChange={(v) => setG({ ...g, s1: v })} />
              <NumberField label="n 1" value={g.n1} onChange={(v) => setG({ ...g, n1: v })} />
              <NumberField label="Mean 2" value={g.m2} onChange={(v) => setG({ ...g, m2: v })} />
              <NumberField label="SD 2" value={g.s2} onChange={(v) => setG({ ...g, s2: v })} />
              <NumberField label="n 2" value={g.n2} onChange={(v) => setG({ ...g, n2: v })} />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Combined mean" value={fmt(comb.mean, 2)} tone="primary" />
                <Stat label="Combined SD" value={fmt(comb.sd, 2)} tone="primary" />
                <Stat label="n" value={comb.n} />
              </div>
              <p className="text-xs text-muted-foreground">
                Cochrane Handbook Table 6.5.a. Use this (not double-counting a shared control group) when a trial has two relevant arms — e.g. two doses vs one placebo.
              </p>
            </div>
          </div>
        )}
        {tool === 'hr' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="HR" value={hr.hr} onChange={(v) => setHr({ ...hr, hr: v })} step={0.01} />
              <NumberField label="95% CI lower" value={hr.lo} onChange={(v) => setHr({ ...hr, lo: v })} step={0.01} />
              <NumberField label="95% CI upper" value={hr.hi} onChange={(v) => setHr({ ...hr, hi: v })} step={0.01} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="ln HR (yi)" value={fmt(lhr.yi, 4)} tone="primary" />
              <Stat label="SE (sei)" value={fmt(lhr.se, 4)} sub="(ln U − ln L) / 3.92" tone="primary" />
            </div>
          </div>
        )}
      </div>
    </Lab>
  )
}

const SECTIONS = [
  { id: 'what', title: 'What gets pooled' },
  { id: 'binary', title: 'Binary outcomes' },
  { id: 'choose', title: 'Choosing RR, OR or RD' },
  { id: 'continuous', title: 'Continuous outcomes' },
  { id: 'tte', title: 'Time-to-event outcomes' },
  { id: 'extract', title: 'Extracting data from papers' },
]

export default function EffectSizes() {
  return (
    <Lesson
      id="effect-sizes"
      sections={SECTIONS}
      refs={['cochrane-ch10', 'deeks2002', 'hedges1981', 'chinn2000', 'zhang1998', 'tierney2007', 'wan2014', 'luo2018', 'shi2020', 'lajeunesse2015']}
      objectives={[
        'Compute RR, OR, RD, MD, SMD and their standard errors from summary data.',
        'Explain why ratio measures are pooled on the log scale.',
        'Choose an effect measure using consistency, mathematical properties and interpretability.',
        'Convert medians/IQRs, CIs, SEs and hazard ratios into analysable inputs.',
      ]}
    >
      <Section id="what" title="What gets pooled">
        <p>
          Every study contributes two numbers to a meta-analysis: an <strong>effect estimate</strong> <Tex>{'\\hat\\theta_i'}</Tex> and its{' '}
          <strong>sampling variance</strong> <Tex>{'v_i = \\mathrm{SE}_i^2'}</Tex>. Everything else — forest plots, weights, heterogeneity — is built from
          these pairs. The effect must be on a scale where its sampling distribution is approximately normal, which is why ratios (RR, OR, HR, ratio of
          means) are analysed as logarithms and back-transformed for presentation.
        </p>
        <Callout kind="key">
          <p>
            A ratio of 2 and a ratio of 0.5 are equally far from “no effect”: <Tex>{'\\ln 2 = 0.69'}</Tex> and <Tex>{'\\ln 0.5 = -0.69'}</Tex>. On the raw
            ratio scale they are not, and their confidence intervals are asymmetric.
          </p>
        </Callout>
      </Section>

      <Section id="binary" title="Binary outcomes">
        <p>
          For a 2×2 table with <Tex>{'a'}</Tex> events among <Tex>{'n_1'}</Tex> treated and <Tex>{'c'}</Tex> events among <Tex>{'n_2'}</Tex> controls (
          <Tex>{'b = n_1-a,\\; d = n_2-c'}</Tex>):
        </p>
        <Tex block>{'\\ln\\mathrm{RR} = \\ln\\frac{a/n_1}{c/n_2},\\qquad \\mathrm{Var} = \\frac1a-\\frac1{n_1}+\\frac1c-\\frac1{n_2}'}</Tex>
        <Tex block>{'\\ln\\mathrm{OR} = \\ln\\frac{ad}{bc},\\qquad \\mathrm{Var} = \\frac1a+\\frac1b+\\frac1c+\\frac1d'}</Tex>
        <Tex block>{'\\mathrm{RD} = \\frac{a}{n_1}-\\frac{c}{n_2},\\qquad \\mathrm{Var} = \\frac{p_1(1-p_1)}{n_1}+\\frac{p_2(1-p_2)}{n_2}'}</Tex>
        <TwoByTwoLab />
        <Predict
          prompt="Load “Common outcome” (60% vs 80%). The RR is 0.75. Will the OR be closer to 1 or further from 1 than the RR?"
          options={['Closer to 1', 'About the same', 'Further from 1']}
          reveal={
            <>
              The OR is 0.375 — <strong>further</strong> from 1. When events are common the OR always exaggerates the RR (in either direction). Reading OR =
              0.375 as “62% fewer events” would badly overstate a 25% relative risk reduction. With rare events (“Typical”) the two nearly coincide.
            </>
          }
        />
        <OrRrLab />
        <QuickCheck
          item={{
            id: 'es-q1',
            q: 'A trial reports OR = 0.50 for death; control-group mortality was 40%. What is the risk ratio closest to?',
            options: ['0.50', '0.63', '0.75', '0.80'],
            answer: 1,
            why: (
              <>
                RR = OR / (1 − p₀ + p₀·OR) = 0.5 / (1 − 0.4 + 0.2) = 0.625. Treated risk is 25% vs 40%: an absolute reduction of 15 percentage points (NNT ≈
                7).
              </>
            ),
          }}
        />
      </Section>

      <Section id="choose" title="Choosing RR, OR or RD">
        <p>
          The Handbook frames the choice around three criteria <Cite id="cochrane-ch10" /> <Cite id="deeks2002" />:
        </p>
        <ol>
          <li>
            <strong>Consistency</strong> across studies. In thousands of Cochrane meta-analyses, ratio measures (RR, OR) were more consistent than risk
            differences, because baseline risk varies between trials and absolute effects follow it <Cite id="deeks2002" />.
          </li>
          <li>
            <strong>Mathematical properties</strong>. The OR is symmetric for event/non-event and always bounded; the RR is not symmetric (the RR for “death”
            and for “survival” give different answers) and cannot be applied to high baseline risks without producing risks above 100%.
          </li>
          <li>
            <strong>Interpretability</strong>. RR is easier to communicate than OR; the RD and NNT are easiest of all, but only for a stated baseline risk and
            time frame.
          </li>
        </ol>
        <Callout kind="tip">
          <p>
            Pool a relative measure, then report <strong>absolute effects</strong> for one or more realistic baseline risks (as in a GRADE Summary of
            Findings table): “RR 0.80; at a 10% baseline risk, 20 fewer deaths per 1000 (NNT 50)”. Lab 2 does this conversion.
          </p>
        </Callout>
        <Callout kind="pitfall">
          <ul>
            <li>Describing an OR as “x% lower risk” when the outcome is common.</li>
            <li>Quoting an NNT without the baseline risk and follow-up duration it applies to.</li>
            <li>Pooling RDs from trials with very different baseline risks — heterogeneity is then almost guaranteed.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="continuous" title="Continuous outcomes">
        <p>
          Use the <strong>mean difference</strong> when all studies measure the outcome on the same scale; it keeps the units clinicians understand. Use the{' '}
          <strong>standardised mean difference</strong> only when studies use different instruments for the same construct (e.g. several depression
          scales):
        </p>
        <Tex block>{'g = J\\,\\frac{\\bar x_1-\\bar x_2}{s_p},\\quad s_p=\\sqrt{\\frac{(n_1-1)s_1^2+(n_2-1)s_2^2}{n_1+n_2-2}},\\quad J\\approx 1-\\frac{3}{4(n_1+n_2)-9}'}</Tex>
        <Tex block>{'\\mathrm{Var}(g) \\approx \\frac{1}{n_1}+\\frac{1}{n_2}+\\frac{g^2}{2(n_1+n_2)}'}</Tex>
        <p>
          <Tex>{'J'}</Tex> corrects the upward bias of Cohen’s <Tex>{'d'}</Tex> in small samples <Cite id="hedges1981" />. For strictly positive outcomes the{' '}
          <strong>ratio of means</strong> (analysed as a log, bias-corrected) is a unit-free alternative that does not depend on SDs{' '}
          <Cite id="lajeunesse2015" />.
        </p>
        <ContinuousLab />
        <Predict
          prompt="Two trials both reduce a score by 4 points. Trial B recruited a more homogeneous population (SD 4 instead of 8). How do their SMDs compare?"
          options={['Equal', 'B’s SMD is half', 'B’s SMD is double']}
          reveal={
            <>
              B’s SMD is <strong>double</strong> (≈ −1.0 vs −0.5) although the clinical effect is identical. The SMD mixes the treatment effect with how
              variable the population is — a reason to prefer the MD whenever a common scale exists. Try it: set both SDs in Lab 3 to 4, then to 8.
            </>
          }
        />
        <Callout kind="rule" title="Cochrane rules worth memorising">
          <ul>
            <li>Change-from-baseline and final-value MDs may be combined in a meta-analysis of MDs, but not in a meta-analysis of SMDs.</li>
            <li>Cohen’s 0.2/0.5/0.8 labels are context-free. Re-express an SMD in the units of a familiar instrument (multiply by its typical SD) or as an OR.</li>
            <li>For bounded, positive scales a mean smaller than about twice the SD suggests skewness.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="tte" title="Time-to-event outcomes">
        <p>
          Pool the log hazard ratio with its SE, not the proportion with events at an arbitrary time point. When a paper gives only the HR and CI, the SE
          follows from the CI width; log-rank observed-minus-expected events and their variance give <Tex>{'\\ln\\mathrm{HR} = (O-E)/V'}</Tex>,{' '}
          <Tex>{'\\mathrm{SE} = 1/\\sqrt V'}</Tex> <Cite id="tierney2007" />.
        </p>
        <Tex block>{'\\mathrm{SE}(\\ln\\mathrm{HR}) = \\frac{\\ln U - \\ln L}{2\\times 1.96}'}</Tex>
        <Callout kind="pitfall">
          <p>
            A single HR summarises the whole follow-up only under proportional hazards. When survival curves cross, report the restricted mean survival time
            difference or time-specific risks, ideally from reconstructed individual data.
          </p>
        </Callout>
      </Section>

      <Section id="extract" title="Extracting data from papers">
        <p>
          Missing SDs are the commonest reason studies are dropped. These conversions recover them, under assumptions you must state in the protocol. Mean
          and SD estimated from a median assume approximate normality <Cite id="luo2018" /> <Cite id="wan2014" /> <Cite id="shi2020" />.
        </p>
        <ExtractionLab />
        <DataTable
          head={['Reported', 'Convert to', 'Formula']}
          rows={[
            ['SE of a mean', 'SD', 'SD = SE·√n'],
            ['95% CI of a mean', 'SD', 'SD = √n·(U − L)/(2·t₀.₉₇₅,ₙ₋₁)'],
            ['95% CI of an MD', 'SE of MD', 'SE = (U − L)/3.92'],
            ['P value of an MD (t test)', 'SE of MD', 'SE = MD / t_{p, n₁+n₂−2}'],
            ['Two arms vs one control', 'One arm', 'Combine (Table 6.5.a) or split the control'],
          ]}
        />
        <QuickCheck
          item={{
            id: 'es-q2',
            q: 'A trial reports an HR of 0.70 (95% CI 0.55 to 0.89). What is the SE of ln(HR)?',
            options: ['0.061', '0.123', '0.245', '0.34'],
            answer: 1,
            why: (
              <>
                (ln 0.89 − ln 0.55)/3.92 = (−0.117 + 0.598)/3.92 = 0.123. You then pool yi = ln 0.70 = −0.357 with sei = 0.123.
              </>
            ),
          }}
        />
        <p>
          Next, <ModuleLink to="/learn/pairwise">Module 2</ModuleLink> combines these study-level estimates.
        </p>
      </Section>

      <Takeaways
        items={[
          'A meta-analysis pools (estimate, variance) pairs; ratios are pooled as logs.',
          'Choose the measure on consistency, mathematical properties and interpretability; ratio measures are usually more consistent than RDs.',
          'Report absolute effects at stated baseline risks alongside any relative effect.',
          'Prefer MD over SMD whenever studies share a scale; the SMD depends on population variability.',
          'Recover missing SDs and log HRs with standard conversions, and say so in the methods.',
        ]}
      />
    </Lesson>
  )
}

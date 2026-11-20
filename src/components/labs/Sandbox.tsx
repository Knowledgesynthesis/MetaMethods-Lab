import { useMemo, useState } from 'react'
import { ForestPlot } from '@/components/plots/ForestPlot'
import { CodeBlock } from '@/components/lesson/CodeBlock'
import { DataTable, Lab } from '@/components/lesson/blocks'
import { Segmented } from '@/components/ui/controls'
import { binaryEffect, hedgesG, meanDifference, type BinaryMeasure } from '@/lib/stats/effectSizes'
import { leaveOneOut } from '@/lib/stats/pairwise'
import { pairwiseR } from '@/lib/stats/rcode'
import { fmt, fmtCI } from '@/lib/utils'
import { DEFAULT_SETTINGS, MetaSettings, type MetaSettingsState } from './MetaSettings'
import { ResultsPanel } from './ResultsPanel'
import { runMeta, type StudyRow } from './useMeta'

type Format = 'binary' | 'continuous' | 'generic'
type Measure = BinaryMeasure | 'MD' | 'SMD' | 'GEN'

const EXAMPLES: Record<Format, string> = {
  binary: `study, events_t, total_t, events_c, total_c
Dubois 2013, 22, 180, 52, 185
Eriksen 2018, 115, 755, 156, 827
Fontaine 2011, 42, 524, 86, 546
Goldberg 2012, 26, 569, 54, 529
Haddad 2016, 61, 511, 100, 517`,
  continuous: `study, mean_t, sd_t, n_t, mean_c, sd_c, n_c
Abara 2009, -9.9, 15.5, 69, -1.6, 13.4, 76
Bennett 2019, -6.9, 11.7, 168, -3.9, 11.2, 142
Castillo 2008, -6.2, 13.9, 280, 1.5, 15, 273
Dubois 2010, -9.5, 12.5, 308, -2, 13.7, 300`,
  generic: `study, yi, se
Trial A, -0.35, 0.15
Trial B, -0.12, 0.10
Trial C, -0.48, 0.22
Trial D, -0.05, 0.12`,
}

interface Parsed {
  rows: StudyRow[]
  errors: string[]
  raw: number[][]
  labels: string[]
}

function parse(text: string, format: Format, measure: Measure): Parsed {
  const need = format === 'binary' ? 4 : format === 'continuous' ? 6 : 2
  const errors: string[] = []
  const rows: StudyRow[] = []
  const raw: number[][] = []
  const labels: string[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  lines.forEach((line, li) => {
    const cells = line.split(/[,;\t]/).map((c) => c.trim())
    const nums = cells.slice(1).map((c) => Number(c.replace('−', '-')))
    if (li === 0 && nums.some((n) => Number.isNaN(n))) return // header
    if (cells.length < need + 1) return void errors.push(`Line ${li + 1}: expected ${need + 1} columns, found ${cells.length}.`)
    if (nums.slice(0, need).some((n) => !Number.isFinite(n))) return void errors.push(`Line ${li + 1}: non-numeric value.`)
    const label = cells[0] || `Study ${rows.length + 1}`
    let yi: number
    let vi: number
    if (format === 'binary') {
      const [a, n1, c, n2] = nums
      if (a < 0 || c < 0 || a > n1 || c > n2 || n1 <= 0 || n2 <= 0) return void errors.push(`Line ${li + 1}: events must lie between 0 and the total.`)
      const e = binaryEffect({ ai: a, n1, ci: c, n2 }, measure as BinaryMeasure)
      if (e.doubleZero && measure !== 'RD') return void errors.push(`Line ${li + 1} (${label}): no events in either arm — excluded (standard practice for RR/OR).`)
      yi = e.yi
      vi = e.vi
    } else if (format === 'continuous') {
      const [m1, s1, n1, m2, s2, n2] = nums
      if (s1 <= 0 || s2 <= 0 || n1 < 2 || n2 < 2) return void errors.push(`Line ${li + 1}: SDs must be > 0 and n ≥ 2.`)
      const e = measure === 'SMD' ? hedgesG({ mean: m1, sd: s1, n: n1 }, { mean: m2, sd: s2, n: n2 }) : meanDifference({ mean: m1, sd: s1, n: n1 }, { mean: m2, sd: s2, n: n2 })
      yi = e.yi
      vi = e.vi
    } else {
      const [y, se] = nums
      if (se <= 0) return void errors.push(`Line ${li + 1}: SE must be positive.`)
      yi = y
      vi = se * se
    }
    rows.push({ label, yi, sei: Math.sqrt(vi) })
    raw.push(nums.slice(0, need))
    labels.push(label)
  })
  return { rows, errors, raw, labels }
}

export function Sandbox() {
  const [format, setFormat] = useState<Format>('binary')
  const [measure, setMeasure] = useState<Measure>('RR')
  const [text, setText] = useState(EXAMPLES.binary)
  const [settings, setSettings] = useState<MetaSettingsState>(DEFAULT_SETTINGS)
  const parsed = useMemo(() => parse(text, format, measure), [text, format, measure])
  const res = useMemo(() => (parsed.rows.length ? runMeta(parsed.rows, settings) : null), [parsed, settings])
  const ratio = measure === 'RR' || measure === 'OR'
  const loo = useMemo(() => {
    if (!res || parsed.rows.length < 3) return null
    return leaveOneOut(
      parsed.rows.map((r) => r.yi),
      parsed.rows.map((r) => r.sei ** 2),
      { model: settings.model, tau2Method: settings.tau2Method, ciMethod: res.ciMethod },
    )
  }, [res, parsed, settings])

  const rcode = useMemo(() => {
    if (!res) return ''
    const col = (i: number) => parsed.raw.map((r) => r[i])
    return pairwiseR({
      labels: parsed.labels,
      model: settings.model,
      tau2Method: settings.tau2Method,
      ciMethod: res.ciMethod,
      measure: format === 'generic' ? 'GEN' : (measure as 'RR'),
      bin: format === 'binary' ? { ai: col(0), n1: col(1), ci: col(2), n2: col(3) } : undefined,
      cont: format === 'continuous' ? { m1: col(0), sd1: col(1), n1: col(2), m2: col(3), sd2: col(4), n2: col(5) } : undefined,
      gen: format === 'generic' ? { yi: col(0), sei: col(1) } : undefined,
    })
  }, [res, parsed, settings, format, measure])

  const t = ratio ? Math.exp : (x: number) => x
  return (
    <Lab
      title="Sandbox · Analyse your own data"
      description="Paste or type study-level data (comma, semicolon or tab separated; a header row is optional). Everything runs in your browser."
    >
      <div className="flex flex-wrap gap-4">
        <Segmented
          label="Data format"
          value={format}
          onChange={(f) => {
            setFormat(f)
            setText(EXAMPLES[f])
            setMeasure(f === 'binary' ? 'RR' : f === 'continuous' ? 'MD' : 'GEN')
          }}
          options={[
            { value: 'binary', label: 'Events / totals' },
            { value: 'continuous', label: 'Means / SDs' },
            { value: 'generic', label: 'Estimate + SE' },
          ]}
        />
        {format !== 'generic' && (
          <Segmented
            label="Measure"
            value={measure}
            onChange={setMeasure}
            options={
              format === 'binary'
                ? [
                    { value: 'RR', label: 'RR' },
                    { value: 'OR', label: 'OR' },
                    { value: 'RD', label: 'RD' },
                  ]
                : [
                    { value: 'MD', label: 'MD' },
                    { value: 'SMD', label: "SMD (Hedges' g)" },
                  ]
            }
          />
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        aria-label="Study data"
        className="mt-3 h-40 w-full rounded-lg border bg-background p-3 font-mono text-xs leading-5"
      />
      {format === 'generic' && <p className="text-xs text-muted-foreground">For ratios, enter ln(ratio) and its SE (see Module 1, Lab 4).</p>}
      {parsed.errors.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-bad">
          {parsed.errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <MetaSettings value={settings} onChange={setSettings} />
      </div>
      {res && (
        <div className="mt-4 space-y-4">
          <ForestPlot
            rows={parsed.rows.map((r, i) => ({ label: r.label, yi: r.yi, ci: res.studyCI[i], weight: res.weights[i] }))}
            summaries={[{ label: settings.model === 'random' ? 'Random effects' : 'Common effect', est: res.estimate, ci: res.ci, pi: res.pi }]}
            ratio={ratio}
            xLabel={format === 'generic' ? 'Estimate' : measure}
          />
          <ResultsPanel r={res} ratio={ratio} digits={measure === 'RD' ? 3 : 2} />
          {loo && (
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">Leave-one-out sensitivity analysis</summary>
              <DataTable
                className="mt-3"
                head={['Omitting', 'Estimate', '95% CI', 'τ²', 'I²']}
                rows={loo.map((l, i) => [parsed.rows[i].label, fmt(t(l.estimate)), fmtCI(l.ci, 2, t), fmt(l.tau2, 4), `${fmt(l.I2, 1)}%`])}
              />
            </details>
          )}
          <CodeBlock code={rcode} title="Reproduce in R (metafor)" />
        </div>
      )}
    </Lab>
  )
}

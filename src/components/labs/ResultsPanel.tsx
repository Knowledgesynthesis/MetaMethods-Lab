import { Stat } from '@/components/ui/controls'
import type { MetaResult } from '@/lib/stats/pairwise'
import { fmt, fmtCI, fmtP } from '@/lib/utils'

/** Compact numerical summary of a meta-analysis on the display scale. */
export function ResultsPanel({ r, ratio = false, digits = 2, unit = '' }: { r: MetaResult; ratio?: boolean; digits?: number; unit?: string }) {
  const t = ratio ? Math.exp : (x: number) => x
  const isRandom = r.model === 'random'
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label={isRandom ? 'Random-effects mean' : 'Common effect'}
          value={`${fmt(t(r.estimate), digits)}${unit}`}
          sub={`95% CI ${fmtCI(r.ci, digits, t)}`}
          tone="primary"
        />
        <Stat label="P value" value={fmtP(r.pval)} sub={r.df !== null ? `t test, ${r.df} df` : 'z test'} />
        {isRandom && (
          <Stat
            label="95% prediction interval"
            value={r.pi ? fmtCI(r.pi, digits, t) : '—'}
            sub="where a new study’s true effect is expected"
            tone={r.pi && r.pi[0] < 0 && r.pi[1] > 0 ? 'warn' : undefined}
          />
        )}
        <Stat label="τ (between-study SD)" value={fmt(r.tau, 3)} sub={`τ² = ${fmt(r.tau2, 4)}${r.tau2CI ? ` [${fmt(r.tau2CI[0], 3)}, ${fmt(r.tau2CI[1], 3)}]` : ''}`} />
        <Stat label="I²" value={`${fmt(r.I2, 1)}%`} sub={r.I2CI ? `95% CI ${fmt(r.I2CI[0], 0)}–${fmt(r.I2CI[1], 0)}%` : 'CI needs k ≥ 3'} />
        <Stat label="Cochran’s Q" value={fmt(r.Q, 2)} sub={`df = ${r.Qdf}, p = ${fmtP(r.Qp)}`} />
        <Stat label="Studies" value={r.k} sub={isRandom ? `${r.tau2Method}, ${r.ciMethod === 'hksj' ? 'HKSJ' : 'Wald'} CI` : 'inverse variance'} />
        {isRandom && (
          <Stat label="Common-effect estimate" value={fmt(t(r.common.estimate), digits)} sub={`95% CI ${fmtCI(r.common.ci, digits, t)}`} />
        )}
      </div>
      {r.notes.length > 0 && (
        <ul className="space-y-1 text-xs text-warn">
          {r.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { AxisBottom, AxisLeft, C, Legend, linear, useWidth } from './core'
import { fmt } from '@/lib/utils'

export interface RocPoint {
  fpr: number
  sens: number
  size?: number
  label?: string
}

export function RocPlot({
  points,
  summary,
  confidence,
  prediction,
  sroc,
  truth,
  height = 380,
}: {
  points: RocPoint[]
  summary?: { fpr: number; sens: number } | null
  confidence?: { fpr: number; sens: number }[] | null
  prediction?: { fpr: number; sens: number }[] | null
  sroc?: { fpr: number; sens: number }[] | null
  truth?: { fpr: number; sens: number }[] | null
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const size = Math.min(width, height + 40)
  const m = { l: 52, r: 12, t: 10, b: 44 }
  const x = linear([0, 1], [m.l, size - m.r])
  const y = linear([0, 1], [size - m.b, m.t])
  const poly = (pts: { fpr: number; sens: number }[]) => pts.map((p) => `${x(p.fpr)},${y(p.sens)}`).join(' ')
  const path = (pts: { fpr: number; sens: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.fpr)},${y(p.sens)}`).join(' ')
  const maxS = Math.max(1, ...points.map((p) => p.size ?? 1))
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1]
  return (
    <div ref={ref} className="w-full">
      <svg width={size} height={size} role="img" aria-label="Studies and summary estimates in ROC space">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke={C.grid} />
            <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke={C.grid} />
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={C.ink} strokeDasharray="4 4" opacity={0.6} />
        {prediction && <polygon points={poly(prediction)} fill="none" stroke={C.vermillion} strokeWidth={1.5} strokeDasharray="6 4" />}
        {confidence && <polygon points={poly(confidence)} fill={C.orange} fillOpacity={0.15} stroke={C.orange} strokeWidth={1.5} />}
        {truth && <path d={path(truth)} fill="none" stroke={C.green} strokeWidth={2} strokeDasharray="2 3" />}
        {sroc && <path d={path(sroc)} fill="none" stroke={C.purple} strokeWidth={2.5} />}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.fpr)} cy={y(p.sens)} r={3 + 8 * Math.sqrt((p.size ?? 1) / maxS)} fill={C.blue} fillOpacity={0.35} stroke={C.blue} strokeWidth={1.2}>
            {p.label && <title>{`${p.label}: sens ${fmt(100 * p.sens, 0)}%, spec ${fmt(100 * (1 - p.fpr), 0)}%`}</title>}
          </circle>
        ))}
        {summary && <rect x={x(summary.fpr) - 6} y={y(summary.sens) - 6} width={12} height={12} transform={`rotate(45 ${x(summary.fpr)} ${y(summary.sens)})`} fill={C.fg} stroke={C.bg} strokeWidth={1.5} />}
        <AxisLeft scale={y} x={m.l} ticks={ticks} format={(v) => `${Math.round(v * 100)}`} label="Sensitivity (%)" />
        <AxisBottom scale={x} y={size - m.b} ticks={ticks} format={(v) => `${Math.round(v * 100)}`} label="1 − specificity (%)" />
      </svg>
      <Legend
        items={[
          { label: 'Study (area ∝ n)', color: C.blue },
          ...(summary ? [{ label: 'Summary point', color: C.fg, shape: 'diamond' as const }] : []),
          ...(confidence ? [{ label: '95% confidence region', color: C.orange, shape: 'line' as const }] : []),
          ...(prediction ? [{ label: '95% prediction region', color: C.vermillion, shape: 'dash' as const }] : []),
          ...(sroc ? [{ label: 'SROC curve (HSROC)', color: C.purple, shape: 'line' as const }] : []),
          ...(truth ? [{ label: 'True ROC curve', color: C.green, shape: 'dash' as const }] : []),
        ]}
      />
    </div>
  )
}

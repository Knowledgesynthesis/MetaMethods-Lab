import { AxisBottom, AxisLeft, C, Legend, linear, niceTicks, useWidth } from './core'
import { fmt } from '@/lib/utils'

export interface Series {
  label: string
  color: string
  dashed?: boolean
  fill?: boolean
  points: { x: number; y: number }[]
}

export function LinePlot({
  series,
  xLabel,
  yLabel = 'Density',
  height = 220,
  vlines = [],
  xFormat = (v) => fmt(v, 2),
  xDomain,
}: {
  series: Series[]
  xLabel: string
  yLabel?: string
  height?: number
  vlines?: { x: number; color: string; label?: string }[]
  xFormat?: (v: number) => string
  xDomain?: [number, number]
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const m = { l: 52, r: 12, t: 12, b: 42 }
  const xs = series.flatMap((s) => s.points.map((p) => p.x))
  const ys = series.flatMap((s) => s.points.map((p) => p.y))
  const x = linear(xDomain ?? [Math.min(...xs), Math.max(...xs)], [m.l, width - m.r])
  const y = linear([0, Math.max(...ys) * 1.08 || 1], [height - m.b, m.t])
  const inDomain = (p: { x: number }) => p.x >= x.domain[0] && p.x <= x.domain[1]
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="img" aria-label={`${yLabel} curves for ${series.map((s) => s.label).join(', ')}`}>
        <AxisLeft scale={y} x={m.l} ticks={niceTicks(0, y.domain[1], 3)} format={(v) => fmt(v, v < 1 ? 1 : 0)} label={yLabel} grid={width - m.r} />
        <AxisBottom scale={x} y={height - m.b} ticks={niceTicks(x.domain[0], x.domain[1], width < 500 ? 4 : 7)} format={xFormat} label={xLabel} />
        {vlines.map((v, i) => (
          <line key={i} x1={x(v.x)} x2={x(v.x)} y1={m.t} y2={height - m.b} stroke={v.color} strokeDasharray="4 3" strokeWidth={1.5} />
        ))}
        {series.map((s) => {
          const pts = s.points.filter(inDomain)
          if (pts.length < 2) return null
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.x)},${y(p.y)}`).join(' ')
          return (
            <g key={s.label}>
              {s.fill && <path d={`${d} L${x(pts[pts.length - 1].x)},${y(0)} L${x(pts[0].x)},${y(0)} Z`} fill={s.color} opacity={0.15} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dashed ? '5 4' : undefined} />
            </g>
          )
        })}
      </svg>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color, shape: s.dashed ? ('dash' as const) : ('line' as const) }))} />
      {vlines.some((v) => v.label) && <span className="sr-only">{vlines.map((v) => v.label).join(', ')}</span>}
    </div>
  )
}

export { C as PLOT_COLORS }

import { useMemo } from 'react'
import { AxisBottom, AxisLeft, C, Legend, linear, niceTicks, ratioTicks, useWidth } from './core'
import { fmt } from '@/lib/utils'

export interface FunnelPoint {
  yi: number
  se: number
  kind?: 'published' | 'hidden' | 'imputed'
  label?: string
}

export function FunnelPlot({
  points,
  center,
  contours = true,
  ratio = false,
  xLabel,
  eggerLine,
  height = 340,
}: {
  points: FunnelPoint[]
  center: number
  contours?: boolean
  ratio?: boolean
  xLabel: string
  /** intercept and slope of y = a + b·SE (regression of estimate on SE) */
  eggerLine?: { a: number; b: number }
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const m = { l: 56, r: 14, t: 12, b: 44 }
  const maxSE = Math.max(...points.map((p) => p.se)) * 1.08
  const { x, y } = useMemo(() => {
    const half = Math.max(2.7 * maxSE, ...points.map((p) => Math.abs(p.yi - center) * 1.05))
    const lo = Math.min(center - half, -2.7 * maxSE * 0.6, ...points.map((p) => p.yi))
    const hi = Math.max(center + half, 2.7 * maxSE * 0.6, ...points.map((p) => p.yi))
    return { x: linear([lo, hi], [m.l, width - m.r]), y: linear([0, maxSE], [m.t, height - m.b]) }
  }, [points, center, maxSE, width, height, m.l, m.r, m.t, m.b])
  const tri = (c: number, z: number) => `${x(c)},${y(0)} ${x(c - z * maxSE)},${y(maxSE)} ${x(c + z * maxSE)},${y(maxSE)}`
  const xt = ratio ? ratioTicks(x.domain[0], x.domain[1]) : niceTicks(x.domain[0], x.domain[1], 6)
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="img" aria-label="Funnel plot of effect estimates against standard error">
        <defs>
          <clipPath id="funnel-clip">
            <rect x={m.l} y={m.t} width={width - m.l - m.r} height={height - m.t - m.b} />
          </clipPath>
        </defs>
        <g clipPath="url(#funnel-clip)">
          {contours && (
            <>
              <rect x={m.l} y={m.t} width={width - m.l - m.r} height={height - m.t - m.b} fill={C.ink} opacity={0.16} />
              <polygon points={tri(0, 2.576)} fill={C.ink} opacity={0.1} />
              <polygon points={tri(0, 1.96)} fill={C.bg} opacity={0.55} />
              <polygon points={tri(0, 1.645)} fill={C.bg} opacity={1} />
            </>
          )}
          <polyline
            points={`${x(center - 1.96 * maxSE)},${y(maxSE)} ${x(center)},${y(0)} ${x(center + 1.96 * maxSE)},${y(maxSE)}`}
            fill="none"
            stroke={C.ink}
            strokeDasharray="5 4"
          />
          <line x1={x(center)} x2={x(center)} y1={y(0)} y2={y(maxSE)} stroke={C.fg} strokeWidth={1.5} />
          {eggerLine && (
            <line
              x1={x(eggerLine.a)}
              y1={y(0)}
              x2={x(eggerLine.a + eggerLine.b * maxSE)}
              y2={y(maxSE)}
              stroke={C.vermillion}
              strokeWidth={2}
            />
          )}
          {points.map((p, i) => {
            const color = p.kind === 'imputed' ? C.orange : p.kind === 'hidden' ? C.muted : C.blue
            return (
              <circle
                key={i}
                cx={x(p.yi)}
                cy={y(p.se)}
                r={4.5}
                fill={p.kind === 'published' || !p.kind ? color : 'none'}
                fillOpacity={0.8}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={p.kind === 'hidden' ? '2 2' : undefined}
              >
                {p.label && <title>{p.label}</title>}
              </circle>
            )
          })}
        </g>
        <AxisLeft scale={y} x={m.l} ticks={niceTicks(0, maxSE, 5)} format={(v) => fmt(v, 2)} label="Standard error" />
        <AxisBottom scale={x} y={height - m.b} ticks={xt} format={(v) => (ratio ? fmt(Math.exp(v), 2) : fmt(v, 1))} label={xLabel} />
      </svg>
      <Legend
        items={[
          ...(contours
            ? [
                { label: 'p > 0.10', color: 'hsl(var(--background))', shape: 'square' as const },
                { label: '0.05 < p < 0.10', color: 'hsl(var(--c-ink) / 0.3)', shape: 'square' as const },
                { label: '0.01 < p < 0.05', color: 'hsl(var(--c-ink) / 0.45)', shape: 'square' as const },
                { label: 'p < 0.01', color: 'hsl(var(--c-ink) / 0.6)', shape: 'square' as const },
              ]
            : []),
          { label: 'Pseudo 95% limits', color: C.ink, shape: 'dash' as const },
          ...(points.some((p) => p.kind === 'hidden') ? [{ label: 'Unpublished (unseen in practice)', color: C.muted, shape: 'ring' as const }] : []),
          ...(points.some((p) => p.kind === 'imputed') ? [{ label: 'Imputed by trim-and-fill', color: C.orange, shape: 'ring' as const }] : []),
          ...(eggerLine ? [{ label: 'Egger regression line', color: C.vermillion, shape: 'line' as const }] : []),
        ]}
      />
    </div>
  )
}

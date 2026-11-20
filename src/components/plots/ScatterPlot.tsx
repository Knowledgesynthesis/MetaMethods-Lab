import { useMemo, type ReactNode } from 'react'
import { AxisBottom, AxisLeft, C, linear, niceTicks, useWidth } from './core'
import { fmt } from '@/lib/utils'

export interface Bubble {
  x: number
  y: number
  /** relative size (e.g. weight) */
  size?: number
  color?: string
  label?: string
  hollow?: boolean
}

export interface Band {
  x: number
  lo: number
  hi: number
  fit: number
}

export function ScatterPlot({
  points,
  band,
  xLabel,
  yLabel,
  height = 300,
  yRef,
  xDomain,
  yDomain,
  yFormat = (v) => fmt(v, 1),
  xFormat = (v) => fmt(v, Number.isInteger(v) ? 0 : 1),
  children,
  ariaLabel,
}: {
  points: Bubble[]
  band?: Band[]
  xLabel: string
  yLabel: string
  height?: number
  yRef?: number
  xDomain?: [number, number]
  yDomain?: [number, number]
  yFormat?: (v: number) => string
  xFormat?: (v: number) => string
  children?: (sx: (v: number) => number, sy: (v: number) => number) => ReactNode
  ariaLabel: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const m = { l: 58, r: 14, t: 12, b: 44 }
  const { x, y } = useMemo(() => {
    const xs = points.map((p) => p.x)
    const ys = [...points.map((p) => p.y), ...(band?.flatMap((b) => [b.lo, b.hi]) ?? []), ...(yRef !== undefined ? [yRef] : [])]
    const xd = xDomain ?? [Math.min(...xs), Math.max(...xs)]
    const xpad = (xd[1] - xd[0] || 1) * 0.06
    const yd = yDomain ?? [Math.min(...ys), Math.max(...ys)]
    const ypad = (yd[1] - yd[0] || 1) * 0.08
    return {
      x: linear(xDomain ?? [xd[0] - xpad, xd[1] + xpad], [m.l, width - m.r]),
      y: linear(yDomain ?? [yd[0] - ypad, yd[1] + ypad], [height - m.b, m.t]),
    }
  }, [points, band, width, height, xDomain, yDomain, yRef, m.l, m.r, m.b, m.t])
  const maxS = Math.max(1e-9, ...points.map((p) => p.size ?? 1))
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        <AxisLeft scale={y} x={m.l} ticks={niceTicks(y.domain[0], y.domain[1], 5)} format={yFormat} label={yLabel} grid={width - m.r} />
        <AxisBottom scale={x} y={height - m.b} ticks={niceTicks(x.domain[0], x.domain[1], width < 500 ? 4 : 7)} format={xFormat} label={xLabel} />
        {yRef !== undefined && <line x1={m.l} x2={width - m.r} y1={y(yRef)} y2={y(yRef)} stroke={C.ink} strokeOpacity={0.6} strokeDasharray="4 3" />}
        {band && band.length > 1 && (
          <>
            <path
              d={`${band.map((b, i) => `${i ? 'L' : 'M'}${x(b.x)},${y(b.hi)}`).join(' ')} ${[...band]
                .reverse()
                .map((b) => `L${x(b.x)},${y(b.lo)}`)
                .join(' ')} Z`}
              fill={C.orange}
              opacity={0.18}
            />
            <path d={band.map((b, i) => `${i ? 'L' : 'M'}${x(b.x)},${y(b.fit)}`).join(' ')} stroke={C.orange} strokeWidth={2.5} fill="none" />
          </>
        )}
        {points.map((p, i) => {
          const r = 3 + 12 * Math.sqrt((p.size ?? 1) / maxS)
          const color = p.color ?? C.blue
          return (
            <circle key={i} cx={x(p.x)} cy={y(p.y)} r={r} fill={p.hollow ? 'none' : color} fillOpacity={0.55} stroke={color} strokeWidth={1.5}>
              {p.label && <title>{p.label}</title>}
            </circle>
          )
        })}
        {children?.(x, y)}
      </svg>
    </div>
  )
}

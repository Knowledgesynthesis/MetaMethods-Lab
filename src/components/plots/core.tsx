import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export type Scale = ((x: number) => number) & { domain: [number, number]; range: [number, number]; invert: (y: number) => number }

export function linear(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  const f = ((x: number) => r0 + (x - d0) * k) as Scale
  f.domain = domain
  f.range = range
  f.invert = (y: number) => (k === 0 ? d0 : d0 + (y - r0) / k)
  return f
}

/** "Nice" tick values (Heckbert's algorithm). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]
  const span = max - min
  const step0 = Math.pow(10, Math.floor(Math.log10(span / count)))
  const err = (count / span) * step0
  const step = err <= 0.15 ? step0 * 10 : err <= 0.35 ? step0 * 5 : err <= 0.75 ? step0 * 2 : step0
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12))
  return ticks
}

/** Ticks for a ratio measure displayed on a log axis (values are on the natural-log scale). */
export function ratioTicks(minLog: number, maxLog: number): number[] {
  const candidates = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 0.67, 1, 1.5, 2, 4, 5, 10, 20, 50, 100]
  let ticks = candidates.filter((c) => Math.log(c) >= minLog - 1e-9 && Math.log(c) <= maxLog + 1e-9)
  if (ticks.length > 7) ticks = ticks.filter((c) => [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 10, 20, 100].includes(c))
  return ticks.map(Math.log)
}

/** Track an element's width (responsive SVG). */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.max(240, Math.floor(el.getBoundingClientRect().width)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function AxisBottom({
  scale,
  y,
  ticks,
  format = (v) => String(v),
  label,
}: {
  scale: Scale
  y: number
  ticks: number[]
  format?: (v: number) => string
  label?: ReactNode
}) {
  const [r0, r1] = scale.range
  return (
    <g aria-hidden>
      <line x1={r0} x2={r1} y1={y} y2={y} stroke="hsl(var(--c-ink))" strokeOpacity={0.5} />
      {ticks.map((t) => (
        <g key={t} transform={`translate(${scale(t)},${y})`}>
          <line y2={5} stroke="hsl(var(--c-ink))" strokeOpacity={0.5} />
          <text y={17} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))" className="num">
            {format(t)}
          </text>
        </g>
      ))}
      {label && (
        <text x={(r0 + r1) / 2} y={y + 34} textAnchor="middle" fontSize={12} fill="hsl(var(--foreground))">
          {label}
        </text>
      )}
    </g>
  )
}

export function AxisLeft({
  scale,
  x,
  ticks,
  format = (v) => String(v),
  label,
  grid,
}: {
  scale: Scale
  x: number
  ticks: number[]
  format?: (v: number) => string
  label?: ReactNode
  grid?: number
}) {
  const [r0, r1] = scale.range
  return (
    <g aria-hidden>
      <line x1={x} x2={x} y1={r0} y2={r1} stroke="hsl(var(--c-ink))" strokeOpacity={0.5} />
      {ticks.map((t) => (
        <g key={t} transform={`translate(${x},${scale(t)})`}>
          {grid !== undefined && <line x2={grid - x} stroke="hsl(var(--c-grid))" />}
          <line x2={-5} stroke="hsl(var(--c-ink))" strokeOpacity={0.5} />
          <text x={-8} dy="0.32em" textAnchor="end" fontSize={11} fill="hsl(var(--muted-foreground))" className="num">
            {format(t)}
          </text>
        </g>
      ))}
      {label && (
        <text transform={`translate(${x - 44},${(r0 + r1) / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="hsl(var(--foreground))">
          {label}
        </text>
      )}
    </g>
  )
}

export const C = {
  blue: 'hsl(var(--c-blue))',
  orange: 'hsl(var(--c-orange))',
  sky: 'hsl(var(--c-sky))',
  green: 'hsl(var(--c-green))',
  vermillion: 'hsl(var(--c-vermillion))',
  purple: 'hsl(var(--c-purple))',
  ink: 'hsl(var(--c-ink))',
  grid: 'hsl(var(--c-grid))',
  muted: 'hsl(var(--muted-foreground))',
  fg: 'hsl(var(--foreground))',
  bg: 'hsl(var(--background))',
  card: 'hsl(var(--card))',
}

export function Legend({ items }: { items: { label: ReactNode; color: string; shape?: 'dot' | 'line' | 'dash' | 'square' | 'diamond' | 'ring' }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <svg width="16" height="10" aria-hidden>
            {it.shape === 'line' && <line x1="0" x2="16" y1="5" y2="5" stroke={it.color} strokeWidth="2" />}
            {it.shape === 'dash' && <line x1="0" x2="16" y1="5" y2="5" stroke={it.color} strokeWidth="2" strokeDasharray="4 3" />}
            {it.shape === 'square' && <rect x="4" y="1" width="8" height="8" fill={it.color} />}
            {it.shape === 'diamond' && <polygon points="8,0 15,5 8,10 1,5" fill={it.color} />}
            {it.shape === 'ring' && <circle cx="8" cy="5" r="3.5" fill="none" stroke={it.color} strokeWidth="1.5" />}
            {(!it.shape || it.shape === 'dot') && <circle cx="8" cy="5" r="4" fill={it.color} />}
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

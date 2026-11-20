import { useMemo } from 'react'
import { AxisBottom, C, linear, niceTicks, ratioTicks, useWidth } from './core'
import { fmt } from '@/lib/utils'

export interface ForestRow {
  label: string
  yi: number
  ci: [number, number]
  /** percentage weight */
  weight?: number
  /** marks imputed (e.g. trim-and-fill) or excluded studies */
  style?: 'normal' | 'imputed' | 'excluded'
}

export interface ForestSummary {
  label: string
  est: number
  ci: [number, number]
  pi?: [number, number] | null
  color?: string
}

export interface ForestPlotProps {
  rows: ForestRow[]
  summaries?: ForestSummary[]
  /** analysis scale is log; display exp() */
  ratio?: boolean
  xLabel?: string
  favours?: [string, string]
  digits?: number
  highlight?: number | null
  onRowClick?: (i: number) => void
  showWeights?: boolean
}

const ROW = 22

export function ForestPlot({
  rows,
  summaries = [],
  ratio = false,
  xLabel,
  favours,
  digits = 2,
  highlight = null,
  onRowClick,
  showWeights = true,
}: ForestPlotProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const narrow = width < 560
  /** phones: show only point estimates in the text column */
  const compact = width < 480
  const labelW = narrow ? 92 : 150
  const textW = compact ? 50 : 150
  const weightW = showWeights && !narrow ? 52 : 0
  const plotL = labelW + 8
  const plotR = width - textW - weightW - 8
  const piRows = summaries.filter((s) => s.pi).length
  const nLines = rows.length + summaries.length + piRows
  const top = 26
  const height = top + nLines * ROW + 14 + (favours ? 18 : 0) + 44

  const { x, ticks } = useMemo(() => {
    const ys = [...rows.map((r) => r.yi), ...summaries.map((s) => s.est), 0]
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    const span = Math.max(yMax - yMin, ratio ? 0.3 : 0.1)
    let lo = Math.min(0, ...rows.map((r) => r.ci[0]), ...summaries.flatMap((s) => [s.ci[0], s.pi?.[0] ?? Infinity]))
    let hi = Math.max(0, ...rows.map((r) => r.ci[1]), ...summaries.flatMap((s) => [s.ci[1], s.pi?.[1] ?? -Infinity]))
    lo = Math.max(lo, yMin - 2 * span)
    hi = Math.min(hi, yMax + 2 * span)
    const pad = (hi - lo) * 0.04
    lo -= pad
    hi += pad
    const xs = linear([lo, hi], [plotL, plotR])
    const t = ratio ? ratioTicks(lo, hi) : niceTicks(lo, hi, narrow ? 4 : 6)
    return { x: xs, ticks: t }
  }, [rows, summaries, ratio, plotL, plotR, narrow])

  const disp = (v: number) => fmt(ratio ? Math.exp(v) : v, digits)
  const maxW = Math.max(1, ...rows.map((r) => r.weight ?? 1))
  const clampX = (v: number) => Math.min(plotR, Math.max(plotL, x(v)))
  const yAxis = top + nLines * ROW + 6

  let line = 0
  return (
    <div ref={ref} className="w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Forest plot of ${rows.length} studies${summaries[0] ? `; ${summaries[0].label} ${disp(summaries[0].est)} (${disp(summaries[0].ci[0])} to ${disp(summaries[0].ci[1])})` : ''}`}
        className="select-none"
      >
        <text x={0} y={14} fontSize={11} fontWeight={600} fill={C.muted}>
          Study
        </text>
        <text x={width - weightW - 4} y={14} fontSize={11} fontWeight={600} fill={C.muted} textAnchor="end">
          {ratio ? 'Ratio' : 'Estimate'}
          {compact ? '' : ' [95% CI]'}
        </text>
        {weightW > 0 && (
          <text x={width - 2} y={14} fontSize={11} fontWeight={600} fill={C.muted} textAnchor="end">
            Weight
          </text>
        )}
        {/* null line */}
        <line x1={x(0)} x2={x(0)} y1={top - 4} y2={yAxis} stroke={C.ink} strokeOpacity={0.6} />
        {ticks.map((t) => (
          <line key={t} x1={x(t)} x2={x(t)} y1={top - 4} y2={yAxis} stroke={C.grid} strokeDasharray="2 3" />
        ))}

        {rows.map((r, i) => {
          const cy = top + line++ * ROW + ROW / 2
          const side = 4 + 10 * Math.sqrt((r.weight ?? maxW) / maxW)
          const color = r.style === 'imputed' ? C.orange : C.blue
          const lo = r.ci[0] < x.domain[0]
          const hiClip = r.ci[1] > x.domain[1]
          const faded = r.style === 'excluded'
          return (
            <g
              key={i}
              opacity={faded ? 0.35 : 1}
              onClick={onRowClick ? () => onRowClick(i) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(i)
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              aria-label={onRowClick ? `Select ${r.label}` : undefined}
              aria-pressed={onRowClick ? highlight === i : undefined}
              className={onRowClick ? 'cursor-pointer outline-none focus-visible:[&>rect:first-child]:fill-[hsl(var(--primary)/0.15)]' : undefined}
            >
              {onRowClick && <rect x={0} y={cy - ROW / 2} width={width} height={ROW} fill="transparent" />}
              {highlight === i && <rect x={0} y={cy - ROW / 2} width={width} height={ROW} fill="hsl(var(--primary))" opacity={0.08} />}
              <text x={0} y={cy} dy="0.32em" fontSize={12} fill={C.fg}>
                {r.label.length > (narrow ? 13 : 22) ? r.label.slice(0, narrow ? 12 : 21) + '…' : r.label}
              </text>
              <line x1={clampX(r.ci[0])} x2={clampX(r.ci[1])} y1={cy} y2={cy} stroke={color} strokeWidth={1.5} />
              {lo && <polygon points={`${plotL},${cy} ${plotL + 6},${cy - 4} ${plotL + 6},${cy + 4}`} fill={color} />}
              {hiClip && <polygon points={`${plotR},${cy} ${plotR - 6},${cy - 4} ${plotR - 6},${cy + 4}`} fill={color} />}
              {x(r.yi) >= plotL && x(r.yi) <= plotR && (
                <rect
                  x={x(r.yi) - side / 2}
                  y={cy - side / 2}
                  width={side}
                  height={side}
                  fill={r.style === 'imputed' ? 'none' : color}
                  stroke={color}
                  strokeWidth={r.style === 'imputed' ? 1.5 : 0}
                />
              )}
              <text x={width - weightW - 4} y={cy} dy="0.32em" fontSize={11.5} textAnchor="end" fill={C.fg} className="num">
                {compact ? disp(r.yi) : `${disp(r.yi)} [${disp(r.ci[0])}, ${disp(r.ci[1])}]`}
              </text>
              {weightW > 0 && (
                <text x={width - 2} y={cy} dy="0.32em" fontSize={11.5} textAnchor="end" fill={C.muted} className="num">
                  {r.weight !== undefined ? `${fmt(r.weight, 1)}%` : ''}
                </text>
              )}
            </g>
          )
        })}

        {summaries.map((s, i) => {
          const cy = top + line++ * ROW + ROW / 2
          const color = s.color ?? (i === 0 ? C.fg : C.purple)
          const pts = [
            [clampX(s.ci[0]), cy],
            [x(s.est), cy - 7],
            [clampX(s.ci[1]), cy],
            [x(s.est), cy + 7],
          ]
            .map((p) => p.join(','))
            .join(' ')
          const piEl = s.pi
            ? (() => {
                const py = top + line++ * ROW + ROW / 2
                return (
                  <g>
                    <text x={0} y={py} dy="0.32em" fontSize={11.5} fill={C.vermillion}>
                      {compact ? 'Prediction' : 'Prediction interval'}
                    </text>
                    <line x1={clampX(s.pi[0])} x2={clampX(s.pi[1])} y1={py} y2={py} stroke={C.vermillion} strokeWidth={2.5} />
                    <line x1={clampX(s.pi[0])} x2={clampX(s.pi[0])} y1={py - 4} y2={py + 4} stroke={C.vermillion} strokeWidth={2} />
                    <line x1={clampX(s.pi[1])} x2={clampX(s.pi[1])} y1={py - 4} y2={py + 4} stroke={C.vermillion} strokeWidth={2} />
                    <text x={width - weightW - 4} y={py} dy="0.32em" fontSize={11.5} textAnchor="end" fill={C.vermillion} className="num">
                      {compact ? '' : `[${disp(s.pi[0])}, ${disp(s.pi[1])}]`}
                    </text>
                  </g>
                )
              })()
            : null
          return (
            <g key={`s${i}`}>
              <line x1={0} x2={width} y1={cy - ROW / 2} y2={cy - ROW / 2} stroke={C.grid} />
              <text x={0} y={cy} dy="0.32em" fontSize={12} fontWeight={600} fill={color}>
                {s.label}
              </text>
              <polygon points={pts} fill={color} />
              <text x={width - weightW - 4} y={cy} dy="0.32em" fontSize={11.5} fontWeight={600} textAnchor="end" fill={color} className="num">
                {compact ? disp(s.est) : `${disp(s.est)} [${disp(s.ci[0])}, ${disp(s.ci[1])}]`}
              </text>
              {piEl}
            </g>
          )
        })}

        <AxisBottom scale={x} y={yAxis} ticks={ticks} format={(t) => (ratio ? fmt(Math.exp(t), Math.exp(t) < 0.1 ? 2 : Math.exp(t) < 1 ? 2 : 1) : fmt(t, Math.abs(t) < 10 ? (Number.isInteger(t) ? 0 : 1) : 0))} />
        {favours && (
          <g fontSize={11} fill={C.muted}>
            <text x={x(0) - 6} y={yAxis + 32} textAnchor="end">
              ← {favours[0]}
            </text>
            <text x={x(0) + 6} y={yAxis + 32}>
              {favours[1]} →
            </text>
          </g>
        )}
        {xLabel && (
          <text x={(plotL + plotR) / 2} y={height - 4} textAnchor="middle" fontSize={12} fill={C.fg}>
            {xLabel}
          </text>
        )}
      </svg>
    </div>
  )
}

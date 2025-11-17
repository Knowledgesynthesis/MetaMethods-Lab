import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell, ErrorBar } from 'recharts'
import type { Study, EffectSize } from '@/types'

interface ForestPlotProps {
  studies: Array<{
    study: Study
    effect: EffectSize
  }>
  pooledEffect?: EffectSize
  nullValue?: number
  xAxisLabel?: string
}

export default function ForestPlot({ studies, pooledEffect, nullValue = 0, xAxisLabel = 'Effect Size' }: ForestPlotProps) {
  const plotData = useMemo(() => {
    const data = studies.map(({ study, effect }) => ({
      name: study.name,
      estimate: effect.estimate,
      lower: effect.ci[0],
      upper: effect.ci[1],
      weight: effect.weight || 0,
      errorLower: effect.estimate - effect.ci[0],
      errorUpper: effect.ci[1] - effect.estimate,
    }))

    if (pooledEffect) {
      data.push({
        name: 'Pooled',
        estimate: pooledEffect.estimate,
        lower: pooledEffect.ci[0],
        upper: pooledEffect.ci[1],
        weight: 100,
        errorLower: pooledEffect.estimate - pooledEffect.ci[0],
        errorUpper: pooledEffect.ci[1] - pooledEffect.estimate,
      })
    }

    return data
  }, [studies, pooledEffect])

  const xDomain = useMemo(() => {
    const allValues = plotData.flatMap(d => [d.lower, d.upper])
    const min = Math.min(...allValues, nullValue)
    const max = Math.max(...allValues, nullValue)
    const padding = (max - min) * 0.2
    return [min - padding, max + padding]
  }, [plotData, nullValue])

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(300, plotData.length * 50)}>
        <BarChart
          data={plotData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            type="number"
            domain={xDomain}
            label={{ value: xAxisLabel, position: 'bottom' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">
                      Estimate: {data.estimate.toFixed(2)}
                    </p>
                    <p className="text-sm">
                      95% CI: [{data.lower.toFixed(2)}, {data.upper.toFixed(2)}]
                    </p>
                    {data.weight > 0 && (
                      <p className="text-sm">Weight: {data.weight.toFixed(1)}%</p>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceLine x={nullValue} stroke="hsl(var(--destructive))" strokeWidth={2} />
          <Bar dataKey="estimate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
            {plotData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.name === 'Pooled' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                opacity={entry.name === 'Pooled' ? 1 : 0.7}
              />
            ))}
            <ErrorBar
              dataKey="errorLower"
              width={4}
              strokeWidth={2}
              stroke="hsl(var(--foreground))"
              direction="x"
            />
            <ErrorBar
              dataKey="errorUpper"
              width={4}
              strokeWidth={2}
              stroke="hsl(var(--foreground))"
              direction="x"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-muted-foreground text-center">
        <p>Squares represent point estimates with horizontal lines showing 95% confidence intervals.</p>
        <p>Square size is proportional to study weight. Red vertical line indicates null effect.</p>
      </div>
    </div>
  )
}

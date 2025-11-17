import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { proportionStudies } from '@/data/syntheticData'
import { freemanTukeyTransform, freemanTukeyBackTransform, logitTransform, logitBackTransform, formatNumber } from '@/lib/utils'
import type { TransformType } from '@/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProportionsLab() {
  const [transformType, setTransformType] = useState<TransformType>('none')

  const results = useMemo(() => {
    const studyResults = proportionStudies.map((study) => {
      const rawProportion = study.events / study.total
      const rawSE = Math.sqrt((rawProportion * (1 - rawProportion)) / study.total)

      let transformed: number
      let transformedSE: number
      let backTransformed: number

      switch (transformType) {
        case 'logit':
          transformed = logitTransform(rawProportion)
          // SE on logit scale (approximate)
          transformedSE = Math.sqrt(1 / (study.events + 0.5) + 1 / (study.total - study.events + 0.5))
          backTransformed = logitBackTransform(transformed)
          break

        case 'freeman-tukey':
          transformed = freemanTukeyTransform(study.events, study.total)
          // SE on Freeman-Tukey scale (approximate)
          transformedSE = Math.sqrt(1 / (4 * study.total))
          backTransformed = freemanTukeyBackTransform(transformed)
          break

        case 'arcsine':
          transformed = Math.asin(Math.sqrt(rawProportion))
          transformedSE = Math.sqrt(1 / (4 * study.total))
          backTransformed = Math.pow(Math.sin(transformed), 2)
          break

        default:
          transformed = rawProportion
          transformedSE = rawSE
          backTransformed = rawProportion
      }

      return {
        study,
        raw: { proportion: rawProportion, se: rawSE },
        transformed: { value: transformed, se: transformedSE },
        backTransformed,
      }
    })

    // Calculate pooled estimates (inverse-variance weighted)
    const weights = studyResults.map((r) => 1 / (r.transformed.se * r.transformed.se))
    const sumWeights = weights.reduce((a, b) => a + b, 0)

    const pooledTransformed = studyResults.reduce(
      (sum, r, i) => sum + r.transformed.value * weights[i],
      0
    ) / sumWeights

    const pooledSE = Math.sqrt(1 / sumWeights)

    let pooledProportion: number
    if (transformType === 'logit') {
      pooledProportion = logitBackTransform(pooledTransformed)
    } else if (transformType === 'freeman-tukey') {
      pooledProportion = freemanTukeyBackTransform(pooledTransformed)
    } else if (transformType === 'arcsine') {
      pooledProportion = Math.pow(Math.sin(pooledTransformed), 2)
    } else {
      pooledProportion = pooledTransformed
    }

    // Calculate heterogeneity
    const Q = studyResults.reduce(
      (sum, r, i) => sum + weights[i] * Math.pow(r.transformed.value - pooledTransformed, 2),
      0
    )
    const df = studyResults.length - 1
    const I2 = Math.max(0, ((Q - df) / Q) * 100)

    return {
      studies: studyResults,
      pooled: {
        proportion: pooledProportion,
        transformed: pooledTransformed,
        se: pooledSE,
        ci: [
          pooledTransformed - 1.96 * pooledSE,
          pooledTransformed + 1.96 * pooledSE,
        ],
      },
      heterogeneity: { Q, df, I2 },
    }
  }, [transformType])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proportions & Transformations Lab</h1>
        <p className="text-muted-foreground mt-2">
          Compare different transformations for single-arm meta-analysis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose Transformation</CardTitle>
          <CardDescription>
            Different transformations help stabilize variance and handle boundary issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={transformType}
            onValueChange={(v) => setTransformType(v as TransformType)}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="none">None (Raw)</TabsTrigger>
              <TabsTrigger value="logit">Logit</TabsTrigger>
              <TabsTrigger value="freeman-tukey">Freeman-Tukey</TabsTrigger>
              <TabsTrigger value="arcsine">Arcsine</TabsTrigger>
            </TabsList>

            <TabsContent value="none" className="mt-4 space-y-2">
              <h3 className="font-semibold">Raw Proportion (No Transformation)</h3>
              <p className="text-sm text-muted-foreground">
                Simple proportion p = events/total. Variance depends on p (larger near 0.5).
                Can be problematic when p is near 0 or 1.
              </p>
            </TabsContent>

            <TabsContent value="logit" className="mt-4 space-y-2">
              <h3 className="font-semibold">Logit Transformation</h3>
              <p className="text-sm text-muted-foreground">
                logit(p) = log(p / (1-p)). Maps [0,1] to (-∞, +∞). Common in logistic regression.
                More stable variance, but requires continuity correction for p = 0 or 1.
              </p>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                logit(p) = ln(p / (1 - p))
              </div>
            </TabsContent>

            <TabsContent value="freeman-tukey" className="mt-4 space-y-2">
              <h3 className="font-semibold">Freeman-Tukey Double Arcsine</h3>
              <p className="text-sm text-muted-foreground">
                Variance-stabilizing transformation that works well for proportions near boundaries.
                Does not require continuity correction for zero events.
              </p>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                FT = 0.5 × [arcsin(√(r/(n+1))) + arcsin(√((r+1)/(n+1)))]
              </div>
            </TabsContent>

            <TabsContent value="arcsine" className="mt-4 space-y-2">
              <h3 className="font-semibold">Arcsine (Square Root) Transformation</h3>
              <p className="text-sm text-muted-foreground">
                arcsin(√p). Simpler variance-stabilizing transformation. Variance ≈ 1/(4n).
                Also handles boundary values better than raw proportions.
              </p>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                transformed = arcsin(√p)
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pooled Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Result</h3>
                <div className="text-sm space-y-1">
                  <p>
                    Pooled Proportion:{' '}
                    <span className="font-mono">
                      {formatNumber(results.pooled.proportion * 100, 2)}%
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    ({results.pooled.proportion.toFixed(4)} on 0-1 scale)
                  </p>
                  {transformType !== 'none' && (
                    <>
                      <p className="mt-2">
                        On transformed scale:{' '}
                        <span className="font-mono">
                          {formatNumber(results.pooled.transformed, 3)}
                        </span>
                      </p>
                      <p>
                        SE (transformed):{' '}
                        <span className="font-mono">
                          {formatNumber(results.pooled.se, 3)}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Heterogeneity</h3>
                <div className="text-sm space-y-1">
                  <p>
                    Q: <span className="font-mono">{formatNumber(results.heterogeneity.Q, 2)}</span>
                  </p>
                  <p>
                    df: <span className="font-mono">{results.heterogeneity.df}</span>
                  </p>
                  <p>
                    I²: <span className="font-mono">{formatNumber(results.heterogeneity.I2, 1)}%</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Study Proportions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.studies.map((r) => ({
                name: r.study.name,
                proportion: r.raw.proportion * 100,
              }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Bar dataKey="proportion" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Study</th>
                    <th className="text-right p-2">Events</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Proportion</th>
                    <th className="text-right p-2">SE (Raw)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.studies.map((r) => (
                    <tr key={r.study.id} className="border-b">
                      <td className="p-2">{r.study.name}</td>
                      <td className="text-right p-2 font-mono">{r.study.events}</td>
                      <td className="text-right p-2 font-mono">{r.study.total}</td>
                      <td className="text-right p-2 font-mono">
                        {formatNumber(r.raw.proportion * 100, 2)}%
                      </td>
                      <td className="text-right p-2 font-mono">
                        {formatNumber(r.raw.se, 4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Why Use Transformations?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Problems with Raw Proportions</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Variance depends on the proportion (largest at p = 0.5)</li>
                <li>Confidence intervals can exceed [0, 1]</li>
                <li>Normal approximation poor near 0 or 1</li>
                <li>Asymmetric distribution near boundaries</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Benefits of Transformations</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Stabilize variance across the range</li>
                <li>Improve normal approximation</li>
                <li>Better handle extreme proportions (near 0 or 1)</li>
                <li>More appropriate for inverse-variance weighting</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">Choosing a Transformation</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Logit:</strong> Good general choice, widely used, but requires continuity correction for zero events.
              </p>
              <p>
                <strong>Freeman-Tukey:</strong> Excellent for proportions near 0 or 1, no continuity correction needed.
                Recommended by Cochrane for single-arm studies.
              </p>
              <p>
                <strong>Arcsine:</strong> Simpler variance stabilization, but less commonly used than Freeman-Tukey.
              </p>
              <p>
                <strong>None (Raw):</strong> Use only if all proportions well away from boundaries and sample sizes large.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

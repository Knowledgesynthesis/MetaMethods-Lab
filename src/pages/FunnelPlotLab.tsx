import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { binaryStudies } from '@/data/syntheticData'
import { calculateLogRR, performMetaAnalysis } from '@/lib/metaAnalysis'
import { formatNumber } from '@/lib/utils'

export default function FunnelPlotLab() {
  const funnelData = useMemo(() => {
    const effectSizes = binaryStudies.map((study) => {
      const effect = calculateLogRR(study)
      return { study, effect }
    })

    const pooledResult = performMetaAnalysis(
      effectSizes.map((r) => r.effect),
      'random'
    )

    const data = effectSizes.map((r) => ({
      name: r.study.name,
      logRR: r.effect.estimate,
      se: r.effect.se,
      precision: 1 / r.effect.se,
    }))

    return {
      data,
      pooledEffect: pooledResult.estimate,
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funnel Plot & Small-Study Effects Lab</h1>
        <p className="text-muted-foreground mt-2">
          Visualize and assess publication bias and small-study effects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funnel Plot</CardTitle>
          <CardDescription>
            Effect size vs precision (inverse of standard error)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="logRR"
                domain={['auto', 'auto']}
                label={{
                  value: 'Log Risk Ratio',
                  position: 'bottom',
                  offset: 40,
                }}
              />
              <YAxis
                type="number"
                dataKey="precision"
                label={{
                  value: 'Precision (1/SE)',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm">Log RR: {formatNumber(data.logRR, 3)}</p>
                        <p className="text-sm">SE: {formatNumber(data.se, 3)}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine
                x={funnelData.pooledEffect}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                label={{ value: 'Pooled', position: 'top' }}
              />
              <Scatter name="Studies" data={funnelData.data} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground text-center">
            In the absence of bias, studies should be symmetrically distributed around the pooled effect.
            Small studies (low precision) show more scatter. Large studies (high precision) cluster near the pooled estimate.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interpreting Funnel Plot Asymmetry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">Possible Causes of Asymmetry</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Publication Bias</p>
                  <p className="text-xs text-muted-foreground">
                    Small studies with null or negative results less likely to be published.
                    Creates asymmetric funnel with missing studies on one side.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">True Heterogeneity</p>
                  <p className="text-xs text-muted-foreground">
                    If effect size varies by study size (e.g., larger trials more rigorous),
                    can create asymmetry without publication bias.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Selective Outcome Reporting</p>
                  <p className="text-xs text-muted-foreground">
                    Studies report only positive outcomes, biasing meta-analysis even if study
                    itself is published.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Chance</p>
                  <p className="text-xs text-muted-foreground">
                    With few studies, asymmetry can occur by chance alone. Need at least 10 studies
                    for reliable funnel plot interpretation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistical Tests for Small-Study Effects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">Egger's Regression Test</h3>
              <p className="text-sm text-muted-foreground">
                Regresses standardized effect (effect/SE) on precision (1/SE). Tests whether intercept
                significantly differs from zero. P &lt; 0.10 suggests asymmetry.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Limitations:</strong> Low power with few studies; can be affected by heterogeneity;
                assumes linear relationship.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Begg's Rank Correlation Test</h3>
              <p className="text-sm text-muted-foreground">
                Non-parametric test based on correlation between standardized effect and variance.
                Less powerful than Egger's but not affected by outliers.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Trim-and-Fill Method</h3>
              <p className="text-sm text-muted-foreground">
                Estimates number of missing studies, imputes them, and re-calculates pooled effect.
                Provides adjusted estimate accounting for potential publication bias.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Caution:</strong> Makes strong assumptions about symmetry. Results should be interpreted
                as sensitivity analysis, not definitive correction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold mb-2">When to Use Funnel Plots</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Need at least 10 studies for meaningful interpretation</li>
              <li>Works best when effect measure is continuous (e.g., log RR, SMD)</li>
              <li>Should be combined with other assessments of bias (risk of bias tools, etc.)</li>
              <li>Consider contour-enhanced funnel plots to distinguish bias from other causes of asymmetry</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Preventing Publication Bias</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Search trial registries (ClinicalTrials.gov, etc.) for unpublished studies</li>
              <li>Contact authors about unpublished data</li>
              <li>Search conference abstracts and dissertations</li>
              <li>Report search methods transparently (PRISMA guidelines)</li>
              <li>Pre-register systematic review protocol (PROSPERO)</li>
            </ul>
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Remember:</strong> Absence of funnel plot asymmetry doesn't prove absence of bias.
              Conversely, asymmetry doesn't always mean publication bias. Use funnel plots as part of
              broader critical appraisal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

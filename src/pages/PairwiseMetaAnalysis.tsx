import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import ForestPlot from '@/components/visualizations/ForestPlot'
import { continuousStudies, binaryStudies } from '@/data/syntheticData'
import { calculateMD, calculateLogRR, performMetaAnalysis } from '@/lib/metaAnalysis'
import { formatNumber, formatPValue } from '@/lib/utils'
import type { ModelType } from '@/types'

export default function PairwiseMetaAnalysis() {
  const [modelType, setModelType] = useState<ModelType>('random')
  const [outcomeType, setOutcomeType] = useState<'continuous' | 'binary'>('continuous')

  const continuousResults = useMemo(() => {
    const effectSizes = continuousStudies.map((study) => {
      const effect = calculateMD(study)
      return { study, effect }
    })

    const pooledResult = performMetaAnalysis(
      effectSizes.map((r) => r.effect),
      modelType
    )

    return {
      studies: effectSizes.map((r, i) => ({
        study: r.study,
        effect: pooledResult.studies[i].effect,
      })),
      pooled: pooledResult,
    }
  }, [modelType])

  const binaryResults = useMemo(() => {
    const effectSizes = binaryStudies.map((study) => {
      const effect = calculateLogRR(study)
      return { study, effect }
    })

    const pooledResult = performMetaAnalysis(
      effectSizes.map((r) => r.effect),
      modelType
    )

    return {
      studies: effectSizes.map((r, i) => ({
        study: r.study,
        effect: pooledResult.studies[i].effect,
      })),
      pooled: pooledResult,
    }
  }, [modelType])

  const currentResults = outcomeType === 'continuous' ? continuousResults : binaryResults

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Forest Plot Playground</h1>
        <p className="text-muted-foreground mt-2">
          Interactive pairwise meta-analysis with forest plots
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta-Analysis Settings</CardTitle>
          <CardDescription>
            Choose outcome type and model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Model Type</label>
              <p className="text-sm text-muted-foreground">
                {modelType === 'random' ? 'Random-effects (DerSimonian-Laird)' : 'Fixed-effect (Inverse-variance)'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm">Fixed</label>
              <Switch
                checked={modelType === 'random'}
                onCheckedChange={(checked) => setModelType(checked ? 'random' : 'fixed')}
              />
              <label className="text-sm">Random</label>
            </div>
          </div>

          <Tabs value={outcomeType} onValueChange={(v) => setOutcomeType(v as 'continuous' | 'binary')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="continuous">Continuous Outcome</TabsTrigger>
              <TabsTrigger value="binary">Binary Outcome</TabsTrigger>
            </TabsList>
            <TabsContent value="continuous" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Mean Difference (MD) for blood pressure reduction (mmHg)
              </p>
            </TabsContent>
            <TabsContent value="binary" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Log Risk Ratio (log RR) for mortality or adverse events
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forest Plot</CardTitle>
          <CardDescription>
            Visualization of individual study effects and pooled estimate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForestPlot
            studies={currentResults.studies}
            pooledEffect={{
              estimate: currentResults.pooled.estimate,
              se: currentResults.pooled.se,
              variance: currentResults.pooled.se * currentResults.pooled.se,
              ci: currentResults.pooled.ci,
            }}
            nullValue={0}
            xAxisLabel={outcomeType === 'continuous' ? 'Mean Difference (mmHg)' : 'Log Risk Ratio'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meta-Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Pooled Effect</h3>
                <div className="text-sm space-y-1">
                  <p>
                    Estimate: <span className="font-mono">{formatNumber(currentResults.pooled.estimate, 3)}</span>
                    {outcomeType === 'binary' && (
                      <span className="ml-2 text-muted-foreground">
                        (RR: {formatNumber(Math.exp(currentResults.pooled.estimate), 3)})
                      </span>
                    )}
                  </p>
                  <p>
                    95% CI: <span className="font-mono">
                      [{formatNumber(currentResults.pooled.ci[0], 3)}, {formatNumber(currentResults.pooled.ci[1], 3)}]
                    </span>
                  </p>
                  <p>
                    Z-score: <span className="font-mono">{formatNumber(currentResults.pooled.z, 2)}</span>
                  </p>
                  <p>
                    P-value: <span className="font-mono">{formatPValue(currentResults.pooled.p)}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Heterogeneity</h3>
                <div className="text-sm space-y-1">
                  <p>
                    Q: <span className="font-mono">{formatNumber(currentResults.pooled.heterogeneity.Q, 2)}</span>
                    {' '}(df = {currentResults.pooled.heterogeneity.df})
                  </p>
                  <p>
                    P-value: <span className="font-mono">{formatPValue(currentResults.pooled.heterogeneity.p)}</span>
                  </p>
                  <p>
                    I²: <span className="font-mono">{formatNumber(currentResults.pooled.heterogeneity.I2, 1)}%</span>
                  </p>
                  <p>
                    τ²: <span className="font-mono">{formatNumber(currentResults.pooled.heterogeneity.tau2, 4)}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <h3 className="font-semibold">Interpretation</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>I² interpretation:</strong>{' '}
                  {currentResults.pooled.heterogeneity.I2 < 25
                    ? 'Low heterogeneity - studies are relatively consistent'
                    : currentResults.pooled.heterogeneity.I2 < 50
                    ? 'Moderate heterogeneity - some variation between studies'
                    : currentResults.pooled.heterogeneity.I2 < 75
                    ? 'Substantial heterogeneity - considerable variation between studies'
                    : 'Considerable heterogeneity - high variation between studies, consider sources of heterogeneity'}
                </p>
                <p>
                  <strong>Model choice:</strong>{' '}
                  {modelType === 'random'
                    ? 'Random-effects model assumes true effect varies between studies. Wider confidence intervals account for between-study heterogeneity.'
                    : 'Fixed-effect model assumes one true effect across all studies. Use with caution if I² is high.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Understanding Heterogeneity Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="font-semibold mb-2">Q Statistic</h3>
              <p className="text-sm text-muted-foreground">
                Weighted sum of squared differences between individual study effects and pooled effect.
                Tests null hypothesis of homogeneity.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">I² Statistic</h3>
              <p className="text-sm text-muted-foreground">
                Percentage of total variation due to heterogeneity rather than chance. Not affected by number of studies.
                Formula: I² = [(Q - df) / Q] × 100%
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">τ² (Tau-squared)</h3>
              <p className="text-sm text-muted-foreground">
                Estimate of between-study variance in random-effects model. Used to calculate random-effects weights.
                Here using DerSimonian-Laird method.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

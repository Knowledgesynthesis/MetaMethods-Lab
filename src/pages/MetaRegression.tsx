import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ZAxis } from 'recharts'
import { studiesWithCovariate } from '@/data/syntheticData'
import { calculateLogRR } from '@/lib/metaAnalysis'
import { formatNumber } from '@/lib/utils'

export default function MetaRegression() {

  const regressionData = useMemo(() => {
    // Calculate log RR for each study
    const data = studiesWithCovariate.map((study) => {
      const effect = calculateLogRR(study)
      return {
        study: study.name,
        baselineRisk: study.baselineRisk,
        yearFromStart: study.yearFromStart,
        logRR: effect.estimate,
        rr: Math.exp(effect.estimate),
        se: effect.se,
        weight: 1 / (effect.se * effect.se),
      }
    })

    // Simple weighted linear regression
    const weights = data.map((d) => d.weight)
    const sumWeights = weights.reduce((a, b) => a + b, 0)

    const meanX = data.reduce((sum, d, i) => sum + d.baselineRisk * weights[i], 0) / sumWeights
    const meanY = data.reduce((sum, d, i) => sum + d.logRR * weights[i], 0) / sumWeights

    const numerator = data.reduce(
      (sum, d, i) => sum + weights[i] * (d.baselineRisk - meanX) * (d.logRR - meanY),
      0
    )
    const denominator = data.reduce(
      (sum, d, i) => sum + weights[i] * Math.pow(d.baselineRisk - meanX, 2),
      0
    )

    const slope = numerator / denominator
    const intercept = meanY - slope * meanX

    // Calculate residual heterogeneity
    const fitted = data.map((d) => intercept + slope * d.baselineRisk)
    const residuals = data.map((d, i) => d.logRR - fitted[i])
    const Qresidual = residuals.reduce((sum, r, i) => sum + weights[i] * r * r, 0)
    const dfResidual = data.length - 2
    const I2residual = Math.max(0, ((Qresidual - dfResidual) / Qresidual) * 100)

    // Create regression line points
    const minX = Math.min(...data.map((d) => d.baselineRisk))
    const maxX = Math.max(...data.map((d) => d.baselineRisk))
    const regressionLine = [
      { baselineRisk: minX, logRR: intercept + slope * minX },
      { baselineRisk: maxX, logRR: intercept + slope * maxX },
    ]

    return {
      data,
      regression: { slope, intercept, Qresidual, dfResidual, I2residual },
      regressionLine,
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meta-regression Visualizer</h1>
        <p className="text-muted-foreground mt-2">
          Explore how study-level covariates affect treatment effects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meta-regression: Baseline Risk vs Treatment Effect</CardTitle>
          <CardDescription>
            Does baseline risk (control group event rate) modify treatment effect?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="baselineRisk"
                name="Baseline Risk"
                label={{
                  value: 'Baseline Risk (Control Group)',
                  position: 'bottom',
                  offset: 40,
                }}
                domain={[0.1, 0.35]}
              />
              <YAxis
                type="number"
                dataKey="logRR"
                name="Log RR"
                label={{ value: 'Log Risk Ratio', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="weight" range={[50, 400]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.study}</p>
                        <p className="text-sm">
                          Baseline Risk: {formatNumber(data.baselineRisk * 100, 1)}%
                        </p>
                        <p className="text-sm">Log RR: {formatNumber(data.logRR, 3)}</p>
                        <p className="text-sm">RR: {formatNumber(data.rr, 3)}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter
                name="Studies"
                data={regressionData.data}
                fill="hsl(var(--primary))"
                opacity={0.6}
              />
              <Line
                type="linear"
                dataKey="logRR"
                data={regressionData.regressionLine}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
              />
            </ScatterChart>
          </ResponsiveContainer>

          <p className="text-sm text-muted-foreground text-center">
            Bubble size represents study weight (inverse variance). Line shows weighted regression fit.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regression Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Regression Coefficients</h3>
                <div className="text-sm space-y-1">
                  <p>
                    Intercept:{' '}
                    <span className="font-mono">
                      {formatNumber(regressionData.regression.intercept, 3)}
                    </span>
                  </p>
                  <p>
                    Slope:{' '}
                    <span className="font-mono">
                      {formatNumber(regressionData.regression.slope, 3)}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-2">
                    Interpretation: For each 0.1 (10%) increase in baseline risk,
                    log RR changes by{' '}
                    {formatNumber(regressionData.regression.slope * 0.1, 3)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Residual Heterogeneity</h3>
                <div className="text-sm space-y-1">
                  <p>
                    Q_residual:{' '}
                    <span className="font-mono">
                      {formatNumber(regressionData.regression.Qresidual, 2)}
                    </span>
                  </p>
                  <p>
                    df: <span className="font-mono">{regressionData.regression.dfResidual}</span>
                  </p>
                  <p>
                    I²_residual:{' '}
                    <span className="font-mono">
                      {formatNumber(regressionData.regression.I2residual, 1)}%
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-2">
                    Residual heterogeneity after accounting for baseline risk
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Understanding Meta-regression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">What is Meta-regression?</h3>
            <p className="text-sm text-muted-foreground">
              Meta-regression explores whether study-level characteristics (covariates) explain
              heterogeneity in treatment effects. It's analogous to regular regression, but the
              observations are studies rather than individuals.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Key Concepts</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>Study-level covariates:</strong> Characteristics that vary between studies
                (e.g., baseline risk, mean age, year of publication)
              </li>
              <li>
                <strong>Weighted regression:</strong> Studies are weighted by inverse variance,
                giving more weight to larger, more precise studies
              </li>
              <li>
                <strong>Residual heterogeneity:</strong> Remaining variation in effects after
                accounting for the covariate
              </li>
              <li>
                <strong>Ecological bias:</strong> Study-level associations may differ from
                individual-level associations (caution in interpretation!)
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Interpretation Cautions</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Observational nature:</strong> Meta-regression is observational, not
                experimental. Confounding between study-level characteristics is possible.
              </p>
              <p>
                <strong>Power:</strong> With few studies (typically &lt;10), meta-regression has
                low power. Results should be considered hypothesis-generating.
              </p>
              <p>
                <strong>Multiple testing:</strong> Avoid data dredging by pre-specifying
                covariates of interest.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">When to Use Meta-regression vs Subgroup Analysis</h3>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">Meta-regression:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Continuous covariates</li>
                  <li>Multiple covariates simultaneously</li>
                  <li>Adjust for confounders</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Subgroup analysis:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Categorical characteristics</li>
                  <li>Pre-specified groups</li>
                  <li>Simpler interpretation</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

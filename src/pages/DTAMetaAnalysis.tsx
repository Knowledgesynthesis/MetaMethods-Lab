import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { dtaStudies } from '@/data/syntheticData'
import { formatNumber } from '@/lib/utils'

export default function DTAMetaAnalysis() {
  const dtaResults = useMemo(() => {
    const studyResults = dtaStudies.map((study) => {
      const sensitivity = study.tp / (study.tp + study.fn)
      const specificity = study.tn / (study.tn + study.fp)
      const fpr = 1 - specificity // False positive rate
      const tpr = sensitivity // True positive rate

      return {
        study,
        sensitivity,
        specificity,
        fpr,
        tpr,
      }
    })

    // Calculate summary estimates (simple average for demonstration)
    const meanSensitivity =
      studyResults.reduce((sum, r) => sum + r.sensitivity, 0) / studyResults.length
    const meanSpecificity =
      studyResults.reduce((sum, r) => sum + r.specificity, 0) / studyResults.length

    return {
      studies: studyResults,
      summary: {
        sensitivity: meanSensitivity,
        specificity: meanSpecificity,
      },
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DTA Meta-analysis</h1>
        <p className="text-muted-foreground mt-2">
          Diagnostic Test Accuracy: Sensitivity, Specificity, and SROC
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROC Space</CardTitle>
          <CardDescription>
            Studies plotted in receiver operating characteristic (ROC) space
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="fpr"
                domain={[0, 1]}
                label={{
                  value: 'False Positive Rate (1 - Specificity)',
                  position: 'bottom',
                  offset: 40,
                }}
              />
              <YAxis
                type="number"
                dataKey="tpr"
                domain={[0, 1]}
                label={{ value: 'True Positive Rate (Sensitivity)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.study.name}</p>
                        <p className="text-sm">
                          Sensitivity: {formatNumber(data.sensitivity * 100, 1)}%
                        </p>
                        <p className="text-sm">
                          Specificity: {formatNumber(data.specificity * 100, 1)}%
                        </p>
                        <p className="text-sm text-muted-foreground text-xs mt-1">
                          TP:{data.study.tp} FP:{data.study.fp} FN:{data.study.fn} TN:{data.study.tn}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: 1, y: 1 },
                ]}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{ value: 'No discrimination', position: 'insideBottomRight' }}
              />
              <Scatter
                name="Studies"
                data={dtaResults.studies}
                fill="hsl(var(--primary))"
                opacity={0.7}
              />
              <Scatter
                name="Summary"
                data={[
                  {
                    fpr: 1 - dtaResults.summary.specificity,
                    tpr: dtaResults.summary.sensitivity,
                  },
                ]}
                fill="hsl(var(--destructive))"
                shape="diamond"
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground text-center">
            Each point represents a study. Red diamond shows summary estimate. Diagonal line = random chance.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Pooled Sensitivity</h3>
              <p className="text-2xl font-bold">
                {formatNumber(dtaResults.summary.sensitivity * 100, 1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                Proportion of truly positive cases correctly identified
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Pooled Specificity</h3>
              <p className="text-2xl font-bold">
                {formatNumber(dtaResults.summary.specificity * 100, 1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                Proportion of truly negative cases correctly identified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Study Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Study</th>
                  <th className="text-right p-2">TP</th>
                  <th className="text-right p-2">FP</th>
                  <th className="text-right p-2">FN</th>
                  <th className="text-right p-2">TN</th>
                  <th className="text-right p-2">Sensitivity</th>
                  <th className="text-right p-2">Specificity</th>
                </tr>
              </thead>
              <tbody>
                {dtaResults.studies.map((r) => (
                  <tr key={r.study.id} className="border-b">
                    <td className="p-2">{r.study.name}</td>
                    <td className="text-right p-2 font-mono">{r.study.tp}</td>
                    <td className="text-right p-2 font-mono">{r.study.fp}</td>
                    <td className="text-right p-2 font-mono">{r.study.fn}</td>
                    <td className="text-right p-2 font-mono">{r.study.tn}</td>
                    <td className="text-right p-2 font-mono">
                      {formatNumber(r.sensitivity * 100, 1)}%
                    </td>
                    <td className="text-right p-2 font-mono">
                      {formatNumber(r.specificity * 100, 1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Understanding DTA Meta-analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">What is DTA Meta-analysis?</h3>
            <p className="text-sm text-muted-foreground">
              Diagnostic Test Accuracy meta-analysis synthesizes studies evaluating how well a diagnostic test
              identifies patients with and without a target condition. Unlike treatment meta-analysis, DTA
              deals with paired outcomes: sensitivity and specificity.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Key Concepts</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong>Sensitivity (TPR):</strong> P(Test+ | Disease+)
                </li>
                <li>
                  <strong>Specificity (TNR):</strong> P(Test- | Disease-)
                </li>
                <li>
                  <strong>Trade-off:</strong> Sensitivity and specificity are typically negatively correlated
                </li>
                <li>
                  <strong>Threshold effects:</strong> Different test thresholds create different sensitivity/specificity pairs
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Advanced Models</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Bivariate random-effects model:</strong> Accounts for correlation between
                  sensitivity and specificity, provides summary operating point.
                </p>
                <p>
                  <strong>HSROC (Hierarchical SROC):</strong> Models underlying accuracy and threshold,
                  produces summary ROC curve.
                </p>
                <p className="text-xs mt-2">
                  Note: This demo shows simple pooling for illustration. Real DTA meta-analyses should
                  use specialized software (e.g., R mada/meta packages, Stata midas).
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">Interpretation Challenges</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Heterogeneity often high due to different populations, test thresholds, reference standards</li>
              <li>Cannot pool sensitivity and specificity independently (correlated)</li>
              <li>Clinical utility depends on prevalence and consequences of false positives/negatives</li>
              <li>SROC curve more informative than single summary point when threshold varies</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

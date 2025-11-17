import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function EffectSizeBasics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Effect Size Fundamentals</h1>
        <p className="text-muted-foreground mt-2">
          Understanding different effect measures and when to use them
        </p>
      </div>

      <Tabs defaultValue="continuous" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="continuous">Continuous</TabsTrigger>
          <TabsTrigger value="binary">Binary</TabsTrigger>
          <TabsTrigger value="time-to-event">Time-to-Event</TabsTrigger>
        </TabsList>

        <TabsContent value="continuous" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mean Difference (MD)</CardTitle>
              <CardDescription>
                The difference between two means on the same scale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Formula:</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  MD = Mean₁ - Mean₂
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">When to use:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Continuous outcomes measured on the same scale across studies</li>
                  <li>Example: Blood pressure measured in mmHg, weight in kg</li>
                  <li>Directly interpretable in original units</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Interpretation:</h3>
                <p className="text-sm text-muted-foreground">
                  A positive MD means the treatment group had higher values than control.
                  The magnitude is directly meaningful (e.g., "5 mmHg reduction in blood pressure").
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Standardized Mean Difference (SMD)</CardTitle>
              <CardDescription>
                Effect size standardized by pooled standard deviation (Cohen's d, Hedges' g)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Formula (Cohen's d):</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  d = (Mean₁ - Mean₂) / SD_pooled
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">When to use:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Continuous outcomes measured on different scales across studies</li>
                  <li>Example: Different depression scales (HAM-D, BDI, etc.)</li>
                  <li>Allows pooling across different measurement instruments</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Interpretation (Cohen's conventions):</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Small effect: d ≈ 0.2</li>
                  <li>Medium effect: d ≈ 0.5</li>
                  <li>Large effect: d ≈ 0.8</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="binary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Ratio (RR) / Relative Risk</CardTitle>
              <CardDescription>
                The ratio of risk in the treatment group to risk in the control group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Formula:</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  RR = (Events₁/Total₁) / (Events₂/Total₂)
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">When to use:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Cohort studies, randomized trials with binary outcomes</li>
                  <li>Preferred when outcome is common (&gt;10%)</li>
                  <li>More intuitive interpretation than odds ratio</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Interpretation:</h3>
                <p className="text-sm text-muted-foreground">
                  RR = 1: No difference. RR &gt; 1: Increased risk in treatment group.
                  RR &lt; 1: Reduced risk in treatment group. Example: RR = 0.75 means 25% risk reduction.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Odds Ratio (OR)</CardTitle>
              <CardDescription>
                The ratio of odds of an event in the treatment vs control group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Formula:</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  OR = (Events₁/Non-events₁) / (Events₂/Non-events₂)
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">When to use:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Case-control studies</li>
                  <li>Logistic regression outputs</li>
                  <li>Meta-analyses using inverse-variance on log scale</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Caution:</h3>
                <p className="text-sm text-muted-foreground">
                  OR overestimates RR when outcomes are common. OR approximates RR only when outcomes are rare (&lt;10%).
                  Interpreting OR as RR can be misleading.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Difference (RD)</CardTitle>
              <CardDescription>
                The absolute difference in risk between groups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Formula:</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  RD = (Events₁/Total₁) - (Events₂/Total₂)
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">When to use:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>When absolute effect is clinically relevant</li>
                  <li>To calculate number needed to treat (NNT = 1/RD)</li>
                  <li>Easier for non-statisticians to interpret</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time-to-event" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hazard Ratio (HR)</CardTitle>
              <CardDescription>
                The ratio of hazard rates between treatment groups over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Concept:</h3>
                <p className="text-sm text-muted-foreground">
                  Hazard ratio represents the instantaneous risk of an event at any given time,
                  comparing treatment to control. From survival analysis methods like Cox regression.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">When to use:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Time-to-event data (survival, recurrence, etc.)</li>
                  <li>Accounts for censoring</li>
                  <li>Commonly used in oncology, cardiovascular trials</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Interpretation:</h3>
                <p className="text-sm text-muted-foreground">
                  HR = 1: No difference. HR &lt; 1: Reduced hazard (improved survival) in treatment group.
                  HR &gt; 1: Increased hazard in treatment group.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Note:</h3>
                <p className="text-sm text-muted-foreground">
                  In meta-analysis, typically extracted from published HRs and confidence intervals,
                  or calculated from log-rank test statistics or survival curves.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Choosing the Right Effect Measure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Decision Factors:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Type of outcome (continuous, binary, time-to-event)</li>
                  <li>Study designs included</li>
                  <li>Prevalence/frequency of outcome</li>
                  <li>Clinical interpretability</li>
                  <li>Statistical properties (symmetry, variance stabilization)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Common Pitfalls:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Interpreting OR as RR for common outcomes</li>
                  <li>Using SMD when MD is interpretable</li>
                  <li>Mixing effect measures inappropriately</li>
                  <li>Ignoring baseline risk when interpreting ratios</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NetworkMetaAnalysis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Network Meta-analysis</h1>
        <p className="text-muted-foreground mt-2">
          Compare multiple treatments using direct and indirect evidence
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Example Treatment Network</CardTitle>
          <CardDescription>
            Network of 4 treatments with direct comparisons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center items-center h-96 bg-muted/20 rounded-lg">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Treatment Network Visualization</p>
              <p className="text-sm text-muted-foreground max-w-md">
                In a full implementation, this would show an interactive network graph with nodes
                representing treatments and edges representing direct comparisons. Users could
                drag nodes, highlight evidence paths, and explore network geometry.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Direct Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Evidence from head-to-head randomized trials comparing two treatments directly.
              Forms the edges in the network graph.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indirect Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Evidence inferred through a common comparator. E.g., if A vs B and B vs C are known,
              we can estimate A vs C indirectly.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Assumptions in Network Meta-analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-1">1. Transitivity</h3>
              <p className="text-sm text-muted-foreground">
                The distribution of effect modifiers is similar across different comparisons.
                If A vs B studies differ systematically from B vs C studies, indirect estimates may be biased.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">2. Consistency (Coherence)</h3>
              <p className="text-sm text-muted-foreground">
                Direct and indirect evidence should agree. Inconsistency suggests violation of transitivity
                or other problems. Can be assessed via loop inconsistency or node-splitting methods.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">3. Homogeneity</h3>
              <p className="text-sm text-muted-foreground">
                Similar to pairwise meta-analysis, but applied across the network. Random-effects models
                can accommodate some heterogeneity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interpreting Network Meta-analysis Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Treatment Rankings</h3>
            <p className="text-sm text-muted-foreground">
              NMA allows ranking treatments by effectiveness. Common approaches:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>SUCRA (Surface Under Cumulative RAnking):</strong> Probability that a treatment
                is among the best. Values 0-100%, higher = better.
              </li>
              <li>
                <strong>Rankograms:</strong> Probability distribution across all possible ranks for each treatment.
              </li>
              <li>
                <strong>P-scores:</strong> Frequentist analogue to SUCRA.
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold">Important Caveats</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Rankings don't account for uncertainty - confidence in rankings may be low</li>
              <li>Different outcomes may yield different rankings</li>
              <li>Network geometry matters - star networks vs. well-connected networks</li>
              <li>Indirect estimates have wider uncertainty than direct estimates</li>
              <li>Must assess transitivity and consistency before trusting results</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bayesian vs Frequentist NMA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Bayesian Approach</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Uses MCMC sampling (e.g., WinBUGS, JAGS)</li>
                <li>Provides posterior probabilities for rankings</li>
                <li>Can incorporate prior information</li>
                <li>Flexible for complex models</li>
                <li>Credible intervals instead of confidence intervals</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Frequentist Approach</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Uses maximum likelihood or restricted ML</li>
                <li>Available in standard software (Stata, R netmeta)</li>
                <li>More familiar to many researchers</li>
                <li>P-scores for treatment ranking</li>
                <li>Traditional confidence intervals</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Software & Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>For real network meta-analyses, use specialized software:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>R packages: netmeta, gemtc, bnma, multinma</li>
            <li>Stata: network, mvmeta</li>
            <li>WinBUGS / OpenBUGS / JAGS for Bayesian NMA</li>
            <li>GRADEpro for GRADE assessments of NMA evidence</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Key references:</strong> Cochrane Handbook Chapter 11, NICE Decision Support Unit
            Technical Support Documents, Dias et al. (2013) Network Meta-Analysis for Decision Making.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

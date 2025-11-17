import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import NetworkGraph from '@/components/visualizations/NetworkGraph'

export default function NetworkMetaAnalysis() {
  // Example network: 5 treatments (Placebo, Drug A, Drug B, Drug C, Drug D)
  const networkData = useMemo(() => {
    const nodes = [
      { id: 'placebo', name: 'Placebo', x: 300, y: 50 },
      { id: 'drugA', name: 'Drug A', x: 150, y: 150 },
      { id: 'drugB', name: 'Drug B', x: 450, y: 150 },
      { id: 'drugC', name: 'Drug C', x: 100, y: 300 },
      { id: 'drugD', name: 'Drug D', x: 500, y: 300 },
    ]

    const edges = [
      { source: 'placebo', target: 'drugA', studies: 8 },
      { source: 'placebo', target: 'drugB', studies: 6 },
      { source: 'drugA', target: 'drugB', studies: 4 },
      { source: 'drugA', target: 'drugC', studies: 3 },
      { source: 'drugB', target: 'drugD', studies: 5 },
      { source: 'drugC', target: 'drugD', studies: 2 },
    ]

    return { nodes, edges }
  }, [])

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
            Network of 5 treatments with direct comparisons (numbers indicate study count)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/20 rounded-lg p-6">
            <div className="max-w-2xl mx-auto" style={{ height: '350px' }}>
              <NetworkGraph nodes={networkData.nodes} edges={networkData.edges} />
            </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Network structure:</strong> Each circle represents a treatment. Lines represent direct
              head-to-head comparisons, with thickness indicating the number of studies.
            </p>
            <p>
              <strong>Direct evidence:</strong> Placebo vs Drug A (8 studies), Placebo vs Drug B (6 studies),
              Drug A vs Drug B (4 studies), etc.
            </p>
            <p>
              <strong>Indirect evidence:</strong> For comparisons without direct trials (e.g., Drug C vs Drug B),
              we can estimate effects indirectly through common comparators.
            </p>
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
              Forms the edges in the network graph. Example: The 8 studies directly comparing
              Placebo to Drug A provide direct evidence for that comparison.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indirect Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Evidence inferred through a common comparator. E.g., to compare Drug C vs Drug D indirectly,
              we can use the path Drug C → Drug A → Placebo → Drug B → Drug D, combining effects
              along the path.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">This Example Network</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>5 treatments (nodes)</li>
                <li>6 direct comparisons (edges)</li>
                <li>Total of 28 studies</li>
                <li>Well-connected through Placebo and Drug A</li>
                <li>Contains multiple evidence loops for consistency checking</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Network Geometry Implications</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>More connections = more robust indirect estimates</li>
                <li>Star networks (all through one comparator) are less robust</li>
                <li>Closed loops allow assessment of consistency</li>
                <li>Sparse networks have wider uncertainty for indirect estimates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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
                If A vs B studies differ systematically from B vs C studies (e.g., different patient
                populations, disease severity), indirect estimates may be biased.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">2. Consistency (Coherence)</h3>
              <p className="text-sm text-muted-foreground">
                Direct and indirect evidence should agree. For example, in the loop Placebo → Drug A
                → Drug B → Placebo, the combined indirect estimate should match direct evidence (if available).
                Inconsistency suggests violation of transitivity or other problems.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">3. Homogeneity</h3>
              <p className="text-sm text-muted-foreground">
                Similar to pairwise meta-analysis, but applied across the network. Random-effects models
                can accommodate some heterogeneity, but extreme heterogeneity undermines the NMA.
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
                is among the best. Values 0-100%, higher = better. Based on Bayesian posterior probabilities.
              </li>
              <li>
                <strong>Rankograms:</strong> Probability distribution across all possible ranks for each treatment.
                Shows uncertainty in rankings.
              </li>
              <li>
                <strong>P-scores:</strong> Frequentist analogue to SUCRA. Based on point estimates and SEs.
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold">Important Caveats</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Rankings don't account for uncertainty - confidence in rankings may be low</li>
              <li>Different outcomes may yield different rankings (efficacy vs safety)</li>
              <li>Network geometry matters - star networks vs. well-connected networks</li>
              <li>Indirect estimates have wider uncertainty than direct estimates</li>
              <li>Must assess transitivity and consistency before trusting results</li>
              <li>Small networks (few treatments/studies) have limited power</li>
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
                <li>Uses MCMC sampling (e.g., WinBUGS, JAGS, Stan)</li>
                <li>Provides posterior probabilities for rankings (SUCRA)</li>
                <li>Can incorporate prior information</li>
                <li>Flexible for complex models and heterogeneity structures</li>
                <li>Credible intervals instead of confidence intervals</li>
                <li>Natural handling of multi-arm trials</li>
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
                <li>Often faster computation than Bayesian MCMC</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
            Both approaches typically give similar point estimates when using non-informative priors in
            Bayesian NMA. Choice often depends on software availability, familiarity, and specific
            modeling needs.
          </p>
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
            <li>R packages: netmeta, gemtc, bnma, multinma, pcnetmeta</li>
            <li>Stata: network, mvmeta, network graphs</li>
            <li>WinBUGS / OpenBUGS / JAGS for Bayesian NMA</li>
            <li>GRADEpro for GRADE assessments of NMA evidence</li>
            <li>CINeMA (Confidence in Network Meta-Analysis) web app</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Key references:</strong> Cochrane Handbook Chapter 11 (Comparing multiple interventions),
            NICE Decision Support Unit Technical Support Documents, Dias et al. (2018) Network Meta-Analysis
            for Decision Making, Salanti et al. (2014) Evaluating the quality of evidence from a NMA.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

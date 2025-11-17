import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { GlossaryTerm } from '@/types'

const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Cochran\'s Q',
    definition: 'A test statistic used to assess heterogeneity in meta-analysis. It is the weighted sum of squared differences between individual study effects and the pooled effect.',
    relatedTerms: ['I²', 'τ²', 'Heterogeneity'],
  },
  {
    term: 'Confidence Interval (CI)',
    definition: 'A range of values that likely contains the true effect size. Typically set at 95%, meaning if we repeated the study many times, 95% of CIs would contain the true value.',
    relatedTerms: ['Credible Interval', 'Standard Error'],
  },
  {
    term: 'Continuity Correction',
    definition: 'Adding 0.5 to all cells of a 2×2 table when zero cells are present, to allow calculation of odds ratios and risk ratios.',
    relatedTerms: ['Zero cells', 'Rare events'],
  },
  {
    term: 'DerSimonian-Laird',
    definition: 'A commonly used method to estimate between-study variance (τ²) in random-effects meta-analysis. Named after Rebecca DerSimonian and Nan Laird.',
    relatedTerms: ['τ²', 'Random-effects model', 'REML'],
  },
  {
    term: 'Effect Size',
    definition: 'A quantitative measure of the magnitude of a phenomenon. In meta-analysis, standardized measures of treatment effect (e.g., MD, SMD, OR, RR).',
    relatedTerms: ['MD', 'SMD', 'OR', 'RR'],
  },
  {
    term: 'Fixed-Effect Model',
    definition: 'A meta-analysis model assuming one true effect size underlies all studies. Weights studies by inverse variance alone.',
    relatedTerms: ['Random-effects model', 'Inverse-variance weighting'],
  },
  {
    term: 'Forest Plot',
    definition: 'A graphical display of individual study results and pooled estimate in meta-analysis. Shows effect sizes with confidence intervals.',
    relatedTerms: ['Meta-analysis', 'Confidence Interval'],
  },
  {
    term: 'Freeman-Tukey Transformation',
    definition: 'A variance-stabilizing double arcsine transformation for proportions: 0.5 × [arcsin(√(r/(n+1))) + arcsin(√((r+1)/(n+1)))]. Works well near boundaries.',
    formula: 'FT = 0.5 × [arcsin(√(r/(n+1))) + arcsin(√((r+1)/(n+1)))]',
    relatedTerms: ['Logit transformation', 'Proportions meta-analysis'],
  },
  {
    term: 'Funnel Plot',
    definition: 'A scatter plot of study effect size vs. precision (or sample size). Used to assess publication bias; should be symmetric in absence of bias.',
    relatedTerms: ['Publication bias', 'Egger\'s test', 'Small-study effects'],
  },
  {
    term: 'Hazard Ratio (HR)',
    definition: 'The ratio of hazard rates between groups. Used in survival analysis for time-to-event outcomes. HR < 1 favors treatment.',
    relatedTerms: ['Risk Ratio', 'Time-to-event'],
  },
  {
    term: 'Heterogeneity',
    definition: 'Variability in true effect sizes across studies. Can be clinical (different populations, interventions) or statistical (measured by Q, I², τ²).',
    relatedTerms: ['I²', 'τ²', 'Q statistic'],
  },
  {
    term: 'HSROC',
    definition: 'Hierarchical Summary Receiver Operating Characteristic model for diagnostic test accuracy meta-analysis. Models accuracy and threshold parameters.',
    relatedTerms: ['DTA meta-analysis', 'SROC', 'Bivariate model'],
  },
  {
    term: 'I² Statistic',
    definition: 'Percentage of total variation across studies due to heterogeneity rather than chance. Formula: I² = ((Q - df)/Q) × 100%. Ranges 0-100%.',
    formula: 'I² = ((Q - df) / Q) × 100%',
    relatedTerms: ['Q statistic', 'τ²', 'Heterogeneity'],
  },
  {
    term: 'Inconsistency (NMA)',
    definition: 'In network meta-analysis, disagreement between direct and indirect evidence. May indicate violation of transitivity assumption.',
    relatedTerms: ['Transitivity', 'Network meta-analysis', 'Loop inconsistency'],
  },
  {
    term: 'Inverse-Variance Weighting',
    definition: 'Weighting studies by the reciprocal of their variance (1/variance). Gives more weight to precise studies.',
    relatedTerms: ['Fixed-effect model', 'Random-effects model', 'Standard Error'],
  },
  {
    term: 'Logit Transformation',
    definition: 'Transformation of proportion p to log-odds: logit(p) = log(p/(1-p)). Maps [0,1] to (-∞, +∞).',
    formula: 'logit(p) = ln(p / (1 - p))',
    relatedTerms: ['Freeman-Tukey transformation', 'Proportions meta-analysis'],
  },
  {
    term: 'Mean Difference (MD)',
    definition: 'The difference between means of two groups. Used for continuous outcomes on the same scale. Directly interpretable.',
    relatedTerms: ['SMD', 'Effect size'],
  },
  {
    term: 'Meta-regression',
    definition: 'Regression analysis in meta-analysis where studies are observations and study-level characteristics are covariates. Explores sources of heterogeneity.',
    relatedTerms: ['Heterogeneity', 'Subgroup analysis', 'Ecological bias'],
  },
  {
    term: 'Network Meta-analysis (NMA)',
    definition: 'Meta-analysis comparing multiple treatments simultaneously, combining direct and indirect evidence. Also called mixed treatment comparison.',
    relatedTerms: ['Transitivity', 'Consistency', 'SUCRA'],
  },
  {
    term: 'Odds Ratio (OR)',
    definition: 'Ratio of odds of event in treatment vs control: (a/b)/(c/d). Common in case-control studies and logistic regression.',
    formula: 'OR = (a×d) / (b×c)',
    relatedTerms: ['Risk Ratio', 'Log odds ratio'],
  },
  {
    term: 'Publication Bias',
    definition: 'Tendency for studies with positive/significant results to be published more than those with null/negative results. Distorts meta-analysis.',
    relatedTerms: ['Funnel plot', 'Trim-and-fill', 'Egger\'s test'],
  },
  {
    term: 'Random-Effects Model',
    definition: 'Meta-analysis model assuming true effects vary across studies. Weights by inverse of (variance + τ²). Gives wider CIs than fixed-effect.',
    relatedTerms: ['Fixed-effect model', 'τ²', 'DerSimonian-Laird'],
  },
  {
    term: 'Risk Ratio (RR)',
    definition: 'Ratio of risk (proportion with event) in treatment vs control. RR = (a/(a+b)) / (c/(c+d)). More interpretable than OR for common outcomes.',
    relatedTerms: ['Odds Ratio', 'Risk Difference'],
  },
  {
    term: 'Sensitivity',
    definition: 'In diagnostic tests: probability of test being positive given disease present. True positive rate. Sensitivity = TP/(TP+FN).',
    relatedTerms: ['Specificity', 'DTA meta-analysis'],
  },
  {
    term: 'Specificity',
    definition: 'In diagnostic tests: probability of test being negative given disease absent. True negative rate. Specificity = TN/(TN+FP).',
    relatedTerms: ['Sensitivity', 'DTA meta-analysis'],
  },
  {
    term: 'Standardized Mean Difference (SMD)',
    definition: 'Effect size for continuous outcomes on different scales. Mean difference divided by pooled SD. Common measures: Cohen\'s d, Hedges\' g.',
    relatedTerms: ['Mean Difference', 'Cohen\'s d', 'Hedges\' g'],
  },
  {
    term: 'SROC Curve',
    definition: 'Summary Receiver Operating Characteristic curve. Shows trade-off between sensitivity and specificity across diagnostic threshold in DTA meta-analysis.',
    relatedTerms: ['DTA meta-analysis', 'HSROC', 'Sensitivity', 'Specificity'],
  },
  {
    term: 'Subgroup Analysis',
    definition: 'Comparing pooled effects across pre-defined subgroups of studies. Used to explore heterogeneity and assess effect modification.',
    relatedTerms: ['Meta-regression', 'Heterogeneity'],
  },
  {
    term: 'SUCRA',
    definition: 'Surface Under the Cumulative RAnking curve in network meta-analysis. Probability-based ranking metric; values 0-100%, higher = better.',
    relatedTerms: ['Network meta-analysis', 'P-score', 'Treatment ranking'],
  },
  {
    term: 'τ² (Tau-squared)',
    definition: 'Estimate of between-study variance in random-effects meta-analysis. Quantifies heterogeneity on the scale of the effect measure.',
    relatedTerms: ['I²', 'Random-effects model', 'DerSimonian-Laird'],
  },
  {
    term: 'Transitivity',
    definition: 'In network meta-analysis: assumption that effect modifiers are similarly distributed across comparisons. Prerequisite for combining direct/indirect evidence.',
    relatedTerms: ['Network meta-analysis', 'Consistency', 'Inconsistency'],
  },
].sort((a, b) => a.term.localeCompare(b.term))

export default function Glossary() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTerms = glossaryTerms.filter(
    (term) =>
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
        <p className="text-muted-foreground mt-2">
          Key terms and concepts in meta-analytic methods
        </p>
      </div>

      <div className="sticky top-16 z-10 bg-background pb-4">
        <Input
          type="text"
          placeholder="Search terms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="space-y-4">
        {filteredTerms.map((term) => (
          <Card key={term.term}>
            <CardHeader>
              <CardTitle className="text-xl">{term.term}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{term.definition}</p>

              {term.formula && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Formula:</p>
                  <code className="text-sm font-mono">{term.formula}</code>
                </div>
              )}

              {term.relatedTerms && term.relatedTerms.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Related terms:</p>
                  <div className="flex flex-wrap gap-2">
                    {term.relatedTerms.map((related) => (
                      <span
                        key={related}
                        className="text-xs bg-secondary px-2 py-1 rounded"
                      >
                        {related}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredTerms.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No terms found matching "{searchTerm}"
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

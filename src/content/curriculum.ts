export type ModuleId =
  | 'effect-sizes'
  | 'pairwise'
  | 'heterogeneity'
  | 'binary-rare'
  | 'proportions'
  | 'meta-regression'
  | 'small-study'
  | 'dta'
  | 'nma'
  | 'bayesian'
  | 'workflow'

export interface ModuleMeta {
  id: ModuleId
  n: number
  path: string
  title: string
  blurb: string
  minutes: number
  group: 'Foundations' | 'Special data' | 'Advanced' | 'Practice'
  prereq: ModuleId[]
  labs: string[]
}

export const MODULES: ModuleMeta[] = [
  {
    id: 'effect-sizes',
    n: 1,
    path: '/learn/effect-sizes',
    title: 'Effect sizes',
    blurb: 'MD, SMD, RR, OR, RD, HR — computing them, choosing between them, and extracting them from papers.',
    minutes: 40,
    group: 'Foundations',
    prereq: [],
    labs: ['2×2 calculator', 'OR vs RR divergence', 'Continuous calculator', 'Data-extraction toolkit'],
  },
  {
    id: 'pairwise',
    n: 2,
    path: '/learn/pairwise',
    title: 'Pairwise meta-analysis',
    blurb: 'Inverse-variance weighting, common- vs random-effects, forest plots, sensitivity analyses — and analysing your own data.',
    minutes: 45,
    group: 'Foundations',
    prereq: ['effect-sizes'],
    labs: ['Forest-plot playground', 'Leave-one-out', 'Your-data sandbox + R code'],
  },
  {
    id: 'heterogeneity',
    n: 3,
    path: '/learn/heterogeneity',
    title: 'Heterogeneity',
    blurb: 'Q, τ², I², prediction intervals, τ² estimators and the few-studies problem (Wald vs HKSJ).',
    minutes: 40,
    group: 'Foundations',
    prereq: ['pairwise'],
    labs: ['I² is not absolute', 'Estimator comparison', 'Few-studies coverage simulation'],
  },
  {
    id: 'binary-rare',
    n: 4,
    path: '/learn/binary-rare',
    title: 'Binary outcomes & rare events',
    blurb: 'Mantel–Haenszel, Peto, continuity corrections, double-zero studies — what to do when events are sparse.',
    minutes: 30,
    group: 'Special data',
    prereq: ['pairwise'],
    labs: ['Zero-cell explorer', 'Method comparison'],
  },
  {
    id: 'proportions',
    n: 5,
    path: '/learn/proportions',
    title: 'Proportions & prevalence',
    blurb: 'Logit, arcsine and Freeman–Tukey transformations, their back-transformation traps, and the GLMM alternative.',
    minutes: 35,
    group: 'Special data',
    prereq: ['heterogeneity'],
    labs: ['Transformation lab', 'Freeman–Tukey trap', 'GLMM vs two-stage'],
  },
  {
    id: 'meta-regression',
    n: 6,
    path: '/learn/meta-regression',
    title: 'Subgroups & meta-regression',
    blurb: 'Explaining heterogeneity with study-level covariates without fooling yourself.',
    minutes: 40,
    group: 'Advanced',
    prereq: ['heterogeneity'],
    labs: ['Bubble-plot regression', 'Subgroup test', 'False-positive simulator'],
  },
  {
    id: 'small-study',
    n: 7,
    path: '/learn/small-study',
    title: 'Small-study effects & missing evidence',
    blurb: 'Funnel plots, contour enhancement, Egger/Peters tests, trim-and-fill, and ROB-ME.',
    minutes: 40,
    group: 'Advanced',
    prereq: ['heterogeneity'],
    labs: ['Publication-bias simulator', 'Contour-enhanced funnel', 'Trim-and-fill'],
  },
  {
    id: 'dta',
    n: 8,
    path: '/learn/dta',
    title: 'Diagnostic test accuracy',
    blurb: 'Bivariate model, SROC curves, confidence vs prediction regions, and what accuracy means for patients.',
    minutes: 45,
    group: 'Advanced',
    prereq: ['heterogeneity'],
    labs: ['ROC-space explorer', 'Threshold simulator', 'Post-test probability'],
  },
  {
    id: 'nma',
    n: 9,
    path: '/learn/nma',
    title: 'Network meta-analysis',
    blurb: 'Indirect evidence, transitivity, consistency, league tables and rankings that do not mislead.',
    minutes: 50,
    group: 'Advanced',
    prereq: ['heterogeneity'],
    labs: ['Bucher calculator', 'Network explorer', 'Inconsistency injector'],
  },
  {
    id: 'bayesian',
    n: 10,
    path: '/learn/bayesian',
    title: 'Bayesian meta-analysis',
    blurb: 'Priors for τ, posterior probabilities, and why Bayesian methods help most when studies are few.',
    minutes: 35,
    group: 'Advanced',
    prereq: ['heterogeneity'],
    labs: ['Prior sensitivity lab', 'Posterior probability of benefit'],
  },
  {
    id: 'workflow',
    n: 11,
    path: '/learn/workflow',
    title: 'From protocol to conclusion',
    blurb: 'Choosing the analysis, rating certainty (GRADE), reporting (PRISMA 2020) and the most common errors.',
    minutes: 30,
    group: 'Practice',
    prereq: [],
    labs: ['Method chooser', 'Error spotter'],
  },
]

export const moduleById = (id: ModuleId) => MODULES.find((m) => m.id === id)!
export const nextModule = (id: ModuleId) => MODULES[MODULES.findIndex((m) => m.id === id) + 1]

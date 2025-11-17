// Effect size types
export type EffectMeasure = 'MD' | 'SMD' | 'RR' | 'OR' | 'HR' | 'RD' | 'Proportion'

export type OutcomeType = 'continuous' | 'binary' | 'time-to-event' | 'proportion'

export type ModelType = 'fixed' | 'random'

export type TransformType = 'none' | 'logit' | 'freeman-tukey' | 'log' | 'arcsine'

// Study data interfaces
export interface Study {
  id: string
  name: string
  year?: number
  author?: string
}

export interface ContinuousStudy extends Study {
  treatment: {
    mean: number
    sd: number
    n: number
  }
  control: {
    mean: number
    sd: number
    n: number
  }
}

export interface BinaryStudy extends Study {
  treatment: {
    events: number
    total: number
  }
  control: {
    events: number
    total: number
  }
}

export interface ProportionStudy extends Study {
  events: number
  total: number
}

export interface DTAStudy extends Study {
  tp: number  // True positives
  fp: number  // False positives
  fn: number  // False negatives
  tn: number  // True negatives
}

// Effect size result
export interface EffectSize {
  estimate: number
  se: number
  variance: number
  ci: [number, number]
  weight?: number
}

// Meta-analysis result
export interface MetaAnalysisResult {
  estimate: number
  se: number
  ci: [number, number]
  z: number
  p: number
  heterogeneity: {
    Q: number
    df: number
    p: number
    I2: number
    tau2: number
  }
  studies: Array<{
    study: Study
    effect: EffectSize
  }>
}

// Network meta-analysis
export interface Treatment {
  id: string
  name: string
}

export interface Comparison {
  id: string
  treatment1: string
  treatment2: string
  studies: BinaryStudy[]
}

export interface NetworkNode {
  id: string
  treatment: Treatment
  x?: number
  y?: number
}

export interface NetworkEdge {
  id: string
  source: string
  target: string
  weight: number  // Number of studies
  direct?: boolean
}

export interface Network {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

// Meta-regression
export interface Covariate {
  name: string
  values: number[]
  type: 'continuous' | 'categorical'
}

export interface MetaRegressionResult extends MetaAnalysisResult {
  covariate: Covariate
  slope: number
  slopeCI: [number, number]
  slopeP: number
  residualHeterogeneity: {
    tau2: number
    I2: number
  }
}

// DTA meta-analysis
export interface DTAResult {
  sensitivity: {
    estimate: number
    ci: [number, number]
  }
  specificity: {
    estimate: number
    ci: [number, number]
  }
  srocCurve: Array<{
    fpr: number
    tpr: number
  }>
  studies: Array<{
    study: DTAStudy
    sensitivity: number
    specificity: number
  }>
}

// Assessment questions
export interface Question {
  id: string
  module: string
  question: string
  options: string[]
  correctAnswer: number
  rationale: string
  difficulty: 'easy' | 'medium' | 'hard'
}

// Module structure
export interface Module {
  id: string
  title: string
  description: string
  prerequisites: string[]
  objectives: string[]
  bloomLevel: string
  content: {
    sections: Section[]
  }
  interactive?: string  // ID of interactive component
  assessment?: Question[]
}

export interface Section {
  id: string
  title: string
  content: string
  examples?: Example[]
}

export interface Example {
  title: string
  description: string
  data: unknown
}

// Glossary
export interface GlossaryTerm {
  term: string
  definition: string
  relatedTerms?: string[]
  formula?: string
}

// User progress (for offline storage)
export interface UserProgress {
  userId: string
  completedModules: string[]
  assessmentScores: Record<string, number>
  bookmarks: string[]
  lastAccessed: Date
}

// App settings
export interface AppSettings {
  darkMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  colorBlindMode: boolean
  offlineMode: boolean
}

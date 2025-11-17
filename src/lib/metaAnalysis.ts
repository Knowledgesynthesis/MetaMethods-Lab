import type { ContinuousStudy, BinaryStudy, EffectSize, MetaAnalysisResult, ModelType } from '@/types'
import { calculateCI, calculateI2, calculateTau2DL } from './utils'

// Calculate effect size for continuous outcomes (Mean Difference)
export function calculateMD(study: ContinuousStudy): EffectSize {
  const md = study.treatment.mean - study.control.mean
  const n1 = study.treatment.n
  const n2 = study.control.n
  const sd1 = study.treatment.sd
  const sd2 = study.control.sd

  // Variance of MD
  const variance = (sd1 * sd1) / n1 + (sd2 * sd2) / n2
  const se = Math.sqrt(variance)

  return {
    estimate: md,
    se,
    variance,
    ci: calculateCI(md, se),
  }
}

// Calculate effect size for continuous outcomes (Standardized Mean Difference - Cohen's d)
export function calculateSMD(study: ContinuousStudy): EffectSize {
  const md = study.treatment.mean - study.control.mean
  const n1 = study.treatment.n
  const n2 = study.control.n
  const sd1 = study.treatment.sd
  const sd2 = study.control.sd

  // Pooled SD
  const pooledSD = Math.sqrt(
    ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2)
  )

  const smd = md / pooledSD

  // Variance of SMD (approximate)
  const variance = (n1 + n2) / (n1 * n2) + (smd * smd) / (2 * (n1 + n2))
  const se = Math.sqrt(variance)

  return {
    estimate: smd,
    se,
    variance,
    ci: calculateCI(smd, se),
  }
}

// Calculate log Risk Ratio
export function calculateLogRR(study: BinaryStudy): EffectSize {
  const a = study.treatment.events
  const b = study.treatment.total - a
  const c = study.control.events
  const d = study.control.total - c

  // Apply continuity correction if zero cells
  const correction = (a === 0 || b === 0 || c === 0 || d === 0) ? 0.5 : 0

  const a_adj = a + correction
  const b_adj = b + correction
  const c_adj = c + correction
  const d_adj = d + correction

  const rr = (a_adj / (a_adj + b_adj)) / (c_adj / (c_adj + d_adj))
  const logRR = Math.log(rr)

  // Variance of log RR
  const variance = 1 / a_adj - 1 / (a_adj + b_adj) + 1 / c_adj - 1 / (c_adj + d_adj)
  const se = Math.sqrt(variance)

  return {
    estimate: logRR,
    se,
    variance,
    ci: calculateCI(logRR, se),
  }
}

// Calculate log Odds Ratio
export function calculateLogOR(study: BinaryStudy): EffectSize {
  const a = study.treatment.events
  const b = study.treatment.total - a
  const c = study.control.events
  const d = study.control.total - c

  // Apply continuity correction if zero cells
  const correction = (a === 0 || b === 0 || c === 0 || d === 0) ? 0.5 : 0

  const a_adj = a + correction
  const b_adj = b + correction
  const c_adj = c + correction
  const d_adj = d + correction

  const or = (a_adj * d_adj) / (b_adj * c_adj)
  const logOR = Math.log(or)

  // Variance of log OR
  const variance = 1 / a_adj + 1 / b_adj + 1 / c_adj + 1 / d_adj
  const se = Math.sqrt(variance)

  return {
    estimate: logOR,
    se,
    variance,
    ci: calculateCI(logOR, se),
  }
}

// Perform meta-analysis with inverse-variance weighting
export function performMetaAnalysis(
  effectSizes: EffectSize[],
  modelType: ModelType = 'random'
): MetaAnalysisResult {
  const k = effectSizes.length

  // Calculate inverse-variance weights
  const weights = effectSizes.map((es) => 1 / es.variance)
  const sumWeights = weights.reduce((a, b) => a + b, 0)

  // Fixed-effect estimate
  const fixedEffect = effectSizes.reduce((sum, es, i) => sum + es.estimate * weights[i], 0) / sumWeights
  const fixedSE = Math.sqrt(1 / sumWeights)

  // Calculate Q statistic
  const Q = effectSizes.reduce((sum, es, i) => {
    return sum + weights[i] * Math.pow(es.estimate - fixedEffect, 2)
  }, 0)

  const df = k - 1
  const pQ = 1 - chiSquareCDF(Q, df)

  // Calculate I²
  const I2 = calculateI2(Q, df)

  // Calculate τ² (DerSimonian-Laird estimator)
  const tau2 = calculateTau2DL(
    effectSizes.map((es) => es.estimate),
    effectSizes.map((es) => es.variance),
    weights
  )

  let finalEffect: number
  let finalSE: number
  let studyResults: Array<{ study: any; effect: EffectSize }>

  if (modelType === 'random' && tau2 > 0) {
    // Random-effects weights
    const randomWeights = effectSizes.map((es) => 1 / (es.variance + tau2))
    const sumRandomWeights = randomWeights.reduce((a, b) => a + b, 0)

    finalEffect = effectSizes.reduce((sum, es, i) => sum + es.estimate * randomWeights[i], 0) / sumRandomWeights
    finalSE = Math.sqrt(1 / sumRandomWeights)

    // Calculate percentage weights for display
    studyResults = effectSizes.map((es, i) => ({
      study: { id: `study-${i}`, name: `Study ${i + 1}` },
      effect: {
        ...es,
        weight: (randomWeights[i] / sumRandomWeights) * 100,
      },
    }))
  } else {
    // Fixed-effect model
    finalEffect = fixedEffect
    finalSE = fixedSE

    studyResults = effectSizes.map((es, i) => ({
      study: { id: `study-${i}`, name: `Study ${i + 1}` },
      effect: {
        ...es,
        weight: (weights[i] / sumWeights) * 100,
      },
    }))
  }

  const z = finalEffect / finalSE
  const p = 2 * (1 - normalCDF(Math.abs(z)))

  return {
    estimate: finalEffect,
    se: finalSE,
    ci: calculateCI(finalEffect, finalSE),
    z,
    p,
    heterogeneity: {
      Q,
      df,
      p: pQ,
      I2,
      tau2,
    },
    studies: studyResults,
  }
}

// Standard normal CDF (approximation)
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - prob : prob
}

// Chi-square CDF (approximation using gamma function)
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0
  if (df <= 0) return 0

  // Simple approximation for common cases
  if (df === 1) {
    return 2 * normalCDF(Math.sqrt(x)) - 1
  }

  // For other df, use normal approximation
  const mean = df
  const variance = 2 * df
  const z = (x - mean) / Math.sqrt(variance)
  return normalCDF(z)
}

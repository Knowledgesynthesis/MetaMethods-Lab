import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Statistical utility functions
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

export function calculateVariance(values: number[], mean?: number): number {
  if (values.length === 0) return 0
  const m = mean ?? calculateMean(values)
  return values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length
}

export function calculateSD(values: number[], mean?: number): number {
  return Math.sqrt(calculateVariance(values, mean))
}

export function calculateSE(sd: number, n: number): number {
  return sd / Math.sqrt(n)
}

// Convert effect sizes
export function oddsRatioToLogOddsRatio(or: number): number {
  return Math.log(or)
}

export function logOddsRatioToOddsRatio(lor: number): number {
  return Math.exp(lor)
}

export function riskRatioToLogRiskRatio(rr: number): number {
  return Math.log(rr)
}

export function logRiskRatioToRiskRatio(lrr: number): number {
  return Math.exp(lrr)
}

// Freeman-Tukey double arcsine transformation
export function freemanTukeyTransform(events: number, total: number): number {
  return 0.5 * (Math.asin(Math.sqrt(events / (total + 1))) + Math.asin(Math.sqrt((events + 1) / (total + 1))))
}

export function freemanTukeyBackTransform(transformed: number): number {
  return Math.pow(Math.sin(transformed), 2)
}

// Logit transformation for proportions
export function logitTransform(p: number): number {
  if (p <= 0 || p >= 1) {
    // Apply continuity correction
    const adjusted = p <= 0 ? 0.5 / 100 : p >= 1 ? (100 - 0.5) / 100 : p
    return Math.log(adjusted / (1 - adjusted))
  }
  return Math.log(p / (1 - p))
}

export function logitBackTransform(logit: number): number {
  return Math.exp(logit) / (1 + Math.exp(logit))
}

// Confidence interval calculation
export function calculateCI(estimate: number, se: number, _level: number = 0.95): [number, number] {
  const z = 1.96 // For 95% CI
  return [estimate - z * se, estimate + z * se]
}

// Heterogeneity metrics
export function calculateI2(Q: number, df: number): number {
  if (df <= 0) return 0
  return Math.max(0, ((Q - df) / Q) * 100)
}

export function calculateTau2DL(effects: number[], _variances: number[], weights: number[]): number {
  const k = effects.length
  if (k <= 1) return 0

  const weightedMean = effects.reduce((sum, e, i) => sum + e * weights[i], 0) / weights.reduce((a, b) => a + b, 0)
  const Q = effects.reduce((sum, e, i) => sum + weights[i] * Math.pow(e - weightedMean, 2), 0)
  const df = k - 1

  const sumWeights = weights.reduce((a, b) => a + b, 0)
  const sumSquaredWeights = weights.reduce((sum, w) => sum + w * w, 0)
  const C = sumWeights - (sumSquaredWeights / sumWeights)

  const tau2 = Math.max(0, (Q - df) / C)
  return tau2
}

// Format numbers for display
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}

export function formatPValue(p: number): string {
  if (p < 0.001) return '<0.001'
  if (p < 0.01) return p.toFixed(3)
  return p.toFixed(2)
}

/**
 * Probability distributions used throughout the engine.
 *
 * All functions are double-precision implementations of standard algorithms:
 *  - log-gamma: Lanczos approximation (g = 7, n = 9)
 *  - regularized incomplete gamma: series + Lentz continued fraction (Numerical Recipes §6.2)
 *  - regularized incomplete beta: Lentz continued fraction (Numerical Recipes §6.4)
 *  - normal quantile: Wichura (1988) AS 241, PPND16 (~1e-16 relative accuracy)
 * Quantiles of t, chi-square, F and beta are obtained by safeguarded root-finding on the CDF.
 * Accuracy is verified against R in src/lib/stats/__tests__/distributions.test.ts.
 */

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
]

export function lgamma(x: number): number {
  if (x < 0.5) {
    // Reflection formula
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x)
  }
  x -= 1
  let a = LANCZOS[0]
  const t = x + 7.5
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

const EPS = 1e-15
const FPMIN = 1e-300

/** Regularized lower incomplete gamma P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0
  if (!Number.isFinite(x)) return 1
  if (x < a + 1) return gammaSeries(a, x)
  return 1 - gammaCF(a, x)
}

/** Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x), accurate in the upper tail. */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1
  if (!Number.isFinite(x)) return 0
  if (x < a + 1) return 1 - gammaSeries(a, x)
  return gammaCF(a, x)
}

function gammaSeries(a: number, x: number): number {
  let ap = a
  let sum = 1 / a
  let del = sum
  for (let n = 0; n < 10000; n++) {
    ap += 1
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * EPS) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a))
}

function gammaCF(a: number, x: number): number {
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i < 10000; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h
}

/** Regularized incomplete beta I_x(a, b). */
export function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return (bt * betaCF(x, a, b)) / a
  return 1 - (bt * betaCF(1 - x, b, a)) / b
}

function betaCF(x: number, a: number, b: number): number {
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m < 10000; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

// ---------------------------------------------------------------- Normal

export function dnorm(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI))
}

/** Standard normal CDF, accurate to ~1e-15 relative in both tails (via the incomplete gamma function). */
export function pnorm(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd
  if (Number.isNaN(z)) return NaN
  if (z === Infinity) return 1
  if (z === -Infinity) return 0
  const q = 0.5 * gammaQ(0.5, (z * z) / 2) // P(|Z| > |z|) / 2
  return z < 0 ? q : 1 - q
}

/**
 * Fast standard normal CDF — Hart's algorithm 5666 (West 2005). Absolute error < 1e-14,
 * relative error ~1e-8 for |z| > 7. Used in tight loops (Bayesian mixtures), not for p-values.
 */
export function pnormFast(z: number): number {
  if (Number.isNaN(z)) return NaN
  const a = Math.abs(z)
  let c: number
  if (a > 37) c = 0
  else {
    const e = Math.exp((-a * a) / 2)
    if (a < 7.07106781186547) {
      let b = 3.52624965998911e-2 * a + 0.700383064443688
      b = b * a + 6.37396220353165
      b = b * a + 33.912866078383
      b = b * a + 112.079291497871
      b = b * a + 221.213596169931
      b = b * a + 220.206867912376
      c = e * b
      b = 8.83883476483184e-2 * a + 1.75566716318264
      b = b * a + 16.064177579207
      b = b * a + 86.7807322029461
      b = b * a + 296.564248779674
      b = b * a + 637.333633378831
      b = b * a + 793.826512519948
      b = b * a + 440.413735824752
      c /= b
    } else {
      let b = a + 0.65
      b = a + 4 / b
      b = a + 3 / b
      b = a + 2 / b
      b = a + 1 / b
      c = e / b / 2.506628274631
    }
  }
  return z > 0 ? 1 - c : c
}

/** Upper tail P(Z > z) without cancellation. */
export function pnormUpper(z: number): number {
  return pnorm(-z)
}

/** Standard normal quantile — Wichura AS 241 (PPND16). */
export function qnorm(p: number, mean = 0, sd = 1): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const q = p - 0.5
  let r: number
  let val: number
  if (Math.abs(q) <= 0.425) {
    r = 0.180625 - q * q
    val =
      (q *
        (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r +
          45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r +
          133.14166789178437745) * r + 3.387132872796366608)) /
      (((((((r * 5226.495278852545925 + 28729.085735721942674) * r + 39307.89580009271061) * r +
        21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r +
        42.313330701600911252) * r + 1)
    return mean + sd * val
  }
  r = q < 0 ? p : 1 - p
  r = Math.sqrt(-Math.log(r))
  if (r <= 5) {
    r -= 1.6
    val =
      (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + 0.24178072517745061177) * r +
        1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r +
        4.6303378461565452959) * r + 1.42343711074968357734) /
      (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
        0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r +
        2.05319162663775882187) * r + 1)
  } else {
    r -= 5
    val =
      (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
        0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r +
        5.4637849111641143699) * r + 6.6579046435011037772) /
      (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
        7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r +
        0.59983220655588793769) * r + 1)
  }
  if (q < 0) val = -val
  return mean + sd * val
}

// ---------------------------------------------------------------- Student t

export function pt(t: number, df: number): number {
  if (!Number.isFinite(df)) return pnorm(t)
  if (Number.isNaN(t)) return NaN
  if (t === Infinity) return 1
  if (t === -Infinity) return 0
  const x = df / (df + t * t)
  const tail = 0.5 * betaInc(x, df / 2, 0.5)
  return t > 0 ? 1 - tail : tail
}

export function qt(p: number, df: number): number {
  if (!Number.isFinite(df)) return qnorm(p)
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (p === 0.5) return 0
  // Bracket and refine with bisection + Newton safeguard
  const sign = p < 0.5 ? -1 : 1
  const pp = p < 0.5 ? 1 - p : p
  let lo = 0
  let hi = Math.max(1, qnorm(pp) * 2)
  while (pt(hi, df) < pp) hi *= 2
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi)
    if (pt(mid, df) < pp) lo = mid
    else hi = mid
    if (hi - lo < 1e-13 * Math.max(1, hi)) break
  }
  return sign * 0.5 * (lo + hi)
}

// ---------------------------------------------------------------- Chi-square & F

export function pchisq(x: number, df: number): number {
  if (x <= 0) return 0
  return gammaP(df / 2, x / 2)
}

/** Upper tail P(X > x) without cancellation (p-values of Q statistics). */
export function pchisqUpper(x: number, df: number): number {
  if (x <= 0) return 1
  return gammaQ(df / 2, x / 2)
}

export function qchisq(p: number, df: number): number {
  if (p <= 0) return 0
  if (p >= 1) return Infinity
  let lo = 0
  let hi = Math.max(1, df)
  while (pchisq(hi, df) < p) hi *= 2
  for (let i = 0; i < 300; i++) {
    const mid = 0.5 * (lo + hi)
    if (pchisq(mid, df) < p) lo = mid
    else hi = mid
    if (hi - lo < 1e-12 * Math.max(1, hi)) break
  }
  return 0.5 * (lo + hi)
}

export function pf(x: number, df1: number, df2: number): number {
  if (x <= 0) return 0
  return betaInc((df1 * x) / (df1 * x + df2), df1 / 2, df2 / 2)
}

export function pfUpper(x: number, df1: number, df2: number): number {
  if (x <= 0) return 1
  return betaInc(df2 / (df2 + df1 * x), df2 / 2, df1 / 2)
}

// ---------------------------------------------------------------- Beta (for exact binomial CIs)

export function qbeta(p: number, a: number, b: number): number {
  if (p <= 0) return 0
  if (p >= 1) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi)
    if (betaInc(mid, a, b) < p) lo = mid
    else hi = mid
    if (hi - lo < 1e-14) break
  }
  return 0.5 * (lo + hi)
}

/** Clopper–Pearson exact CI for a binomial proportion. */
export function clopperPearson(x: number, n: number, level = 0.95): [number, number] {
  const alpha = 1 - level
  const lower = x === 0 ? 0 : qbeta(alpha / 2, x, n - x + 1)
  const upper = x === n ? 1 : qbeta(1 - alpha / 2, x + 1, n - x)
  return [lower, upper]
}

/** Two-sided p-value from a z statistic. */
export function pFromZ(z: number): number {
  return 2 * pnorm(-Math.abs(z))
}

/** Two-sided p-value from a t statistic. */
export function pFromT(t: number, df: number): number {
  return 2 * pt(-Math.abs(t), df)
}

export const expit = (x: number) => 1 / (1 + Math.exp(-x))
export const logit = (p: number) => Math.log(p / (1 - p))

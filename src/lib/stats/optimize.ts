/** Root finding and minimisation utilities. */

/** Brent's method for a root of f on [a, b]; f(a) and f(b) must bracket a sign change. */
export function brent(f: (x: number) => number, a: number, b: number, tol = 1e-12, maxIter = 300): number {
  let fa = f(a)
  let fb = f(b)
  if (fa === 0) return a
  if (fb === 0) return b
  if (fa * fb > 0) throw new Error('Root not bracketed')
  let c = a
  let fc = fa
  let d = b - a
  let e = d
  for (let i = 0; i < maxIter; i++) {
    if (fb * fc > 0) {
      c = a
      fc = fa
      d = b - a
      e = d
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b
      b = c
      c = a
      fa = fb
      fb = fc
      fc = fa
    }
    const tol1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tol
    const xm = 0.5 * (c - b)
    if (Math.abs(xm) <= tol1 || fb === 0) return b
    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa
      let p: number
      let q: number
      if (a === c) {
        p = 2 * xm * s
        q = 1 - s
      } else {
        const qq = fa / fc
        const r = fb / fc
        p = s * (2 * xm * qq * (qq - r) - (b - a) * (r - 1))
        q = (qq - 1) * (r - 1) * (s - 1)
      }
      if (p > 0) q = -q
      p = Math.abs(p)
      if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) {
        e = d
        d = p / q
      } else {
        d = xm
        e = d
      }
    } else {
      d = xm
      e = d
    }
    a = b
    fa = fb
    b += Math.abs(d) > tol1 ? d : xm > 0 ? tol1 : -tol1
    fb = f(b)
  }
  return b
}

export interface NelderMeadResult {
  x: number[]
  fx: number
  iterations: number
  converged: boolean
}

/** Nelder–Mead simplex minimisation (adaptive parameters, Gao & Han 2012). */
export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  { maxIter = 4000, tol = 1e-10, step = 0.5 }: { maxIter?: number; tol?: number; step?: number } = {},
): NelderMeadResult {
  const n = x0.length
  const alpha = 1
  const gamma = 1 + 2 / n
  const rho = 0.75 - 1 / (2 * n)
  const sigma = 1 - 1 / n
  const safe = (x: number[]) => {
    const v = f(x)
    return Number.isFinite(v) ? v : Infinity
  }
  let simplex = [x0.slice()]
  for (let i = 0; i < n; i++) {
    const x = x0.slice()
    x[i] = x[i] !== 0 ? x[i] * (1 + step) : step
    simplex.push(x)
  }
  let values = simplex.map(safe)
  let iter = 0
  let converged = false
  for (; iter < maxIter; iter++) {
    const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0])
    simplex = order.map(([, i]) => simplex[i])
    values = order.map(([v]) => v)
    const spread = Math.abs(values[n] - values[0])
    let size = 0
    for (let i = 1; i <= n; i++) for (let j = 0; j < n; j++) size = Math.max(size, Math.abs(simplex[i][j] - simplex[0][j]))
    if (spread < tol && size < 1e-7) {
      converged = true
      break
    }
    const centroid = new Array(n).fill(0)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n
    const worst = simplex[n]
    const xr = centroid.map((c, j) => c + alpha * (c - worst[j]))
    const fr = safe(xr)
    if (fr < values[0]) {
      const xe = centroid.map((c, j) => c + gamma * (xr[j] - c))
      const fe = safe(xe)
      if (fe < fr) {
        simplex[n] = xe
        values[n] = fe
      } else {
        simplex[n] = xr
        values[n] = fr
      }
    } else if (fr < values[n - 1]) {
      simplex[n] = xr
      values[n] = fr
    } else {
      const outside = fr < values[n]
      const xc = outside
        ? centroid.map((c, j) => c + rho * (xr[j] - c))
        : centroid.map((c, j) => c + rho * (worst[j] - c))
      const fc = safe(xc)
      if (fc < (outside ? fr : values[n])) {
        simplex[n] = xc
        values[n] = fc
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[0].map((b, j) => b + sigma * (simplex[i][j] - b))
          values[i] = safe(simplex[i])
        }
      }
    }
  }
  const best = values.indexOf(Math.min(...values))
  return { x: simplex[best], fx: values[best], iterations: iter, converged }
}

/** Numerical Hessian by central differences. */
export function hessian(f: (x: number[]) => number, x: number[], h = 1e-4): number[][] {
  const n = x.length
  const H = Array.from({ length: n }, () => new Array(n).fill(0))
  const fx = f(x)
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const hi = h * Math.max(1, Math.abs(x[i]))
      const hj = h * Math.max(1, Math.abs(x[j]))
      let v: number
      if (i === j) {
        const xp = x.slice()
        const xm = x.slice()
        xp[i] += hi
        xm[i] -= hi
        v = (f(xp) - 2 * fx + f(xm)) / (hi * hi)
      } else {
        const pp = x.slice()
        const pm = x.slice()
        const mp = x.slice()
        const mm = x.slice()
        pp[i] += hi
        pp[j] += hj
        pm[i] += hi
        pm[j] -= hj
        mp[i] -= hi
        mp[j] += hj
        mm[i] -= hi
        mm[j] -= hj
        v = (f(pp) - f(pm) - f(mp) + f(mm)) / (4 * hi * hj)
      }
      H[i][j] = v
      H[j][i] = v
    }
  }
  return H
}

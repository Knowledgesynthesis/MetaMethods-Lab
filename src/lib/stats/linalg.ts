/** Minimal dense linear algebra for small systems (k ≤ a few hundred, p ≤ ~10). */

export type Matrix = number[][]
export type Vector = number[]

export const zeros = (r: number, c: number): Matrix => Array.from({ length: r }, () => new Array(c).fill(0))

export const identity = (n: number): Matrix => {
  const m = zeros(n, n)
  for (let i = 0; i < n; i++) m[i][i] = 1
  return m
}

export const transpose = (a: Matrix): Matrix => a[0].map((_, j) => a.map((row) => row[j]))

export function matmul(a: Matrix, b: Matrix): Matrix {
  const n = a.length
  const m = b[0].length
  const p = b.length
  const out = zeros(n, m)
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++) {
      const aik = a[i][k]
      if (aik === 0) continue
      for (let j = 0; j < m; j++) out[i][j] += aik * b[k][j]
    }
  return out
}

export const matvec = (a: Matrix, v: Vector): Vector => a.map((row) => row.reduce((s, x, j) => s + x * v[j], 0))

export const dot = (a: Vector, b: Vector): number => a.reduce((s, x, i) => s + x * b[i], 0)

/** Inverse via Gauss–Jordan elimination with partial pivoting. Throws if singular. */
export function inverse(a: Matrix): Matrix {
  const n = a.length
  const m = a.map((row, i) => [...row, ...identity(n)[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r
    if (Math.abs(m[piv][col]) < 1e-14) throw new Error('Singular matrix')
    ;[m[col], m[piv]] = [m[piv], m[col]]
    const d = m[col][col]
    for (let j = 0; j < 2 * n; j++) m[col][j] /= d
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = m[r][col]
      if (f === 0) continue
      for (let j = 0; j < 2 * n; j++) m[r][j] -= f * m[col][j]
    }
  }
  return m.map((row) => row.slice(n))
}

/** log-determinant of a symmetric positive-definite matrix via Cholesky. */
export function logdetSPD(a: Matrix): number {
  const L = cholesky(a)
  let s = 0
  for (let i = 0; i < L.length; i++) s += 2 * Math.log(L[i][i])
  return s
}

export function cholesky(a: Matrix): Matrix {
  const n = a.length
  const L = zeros(n, n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = a[i][j]
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
      if (i === j) {
        if (s <= 0) throw new Error('Matrix not positive definite')
        L[i][i] = Math.sqrt(s)
      } else L[i][j] = s / L[j][j]
    }
  }
  return L
}

export const trace = (a: Matrix): number => a.reduce((s, row, i) => s + row[i], 0)

/** X' diag(w) X */
export function xtwx(X: Matrix, w: Vector): Matrix {
  const p = X[0].length
  const out = zeros(p, p)
  for (let i = 0; i < X.length; i++)
    for (let a = 0; a < p; a++)
      for (let b = 0; b < p; b++) out[a][b] += X[i][a] * w[i] * X[i][b]
  return out
}

/** X' diag(w) y */
export function xtwy(X: Matrix, w: Vector, y: Vector): Vector {
  const p = X[0].length
  const out = new Array(p).fill(0)
  for (let i = 0; i < X.length; i++) for (let a = 0; a < p; a++) out[a] += X[i][a] * w[i] * y[i]
  return out
}

/**
 * Frequentist network meta-analysis for two-arm studies (contrast-based, weighted least squares —
 * identical to the graph-theoretical approach of Rücker 2012 for two-arm trials).
 *  - common between-study variance τ² by the generalised method of moments (as netmeta)
 *  - league table, P-scores (Rücker & Schwarzer 2015)
 *  - local inconsistency: SIDE / back-calculation (Dias et al. 2010; König et al. 2013, as netmeta::netsplit)
 *  - global inconsistency: Q decomposition into within-design heterogeneity and between-design
 *    inconsistency (for two-arm studies this equals the design-by-treatment interaction test)
 * Verified against netmeta::netmeta() and netmeta::netsplit().
 */
import { inverse, type Matrix, matvec, xtwx, xtwy } from './linalg'
import { pchisqUpper, pFromZ, pnorm, qnorm } from './distributions'

export interface NMAStudy {
  id: string
  /** comparator arm */
  t1: string
  /** experimental arm; yi is the effect of t2 relative to t1 */
  t2: string
  yi: number
  vi: number
}

export interface Contrast {
  est: number
  se: number
  ci: [number, number]
  pval: number
}

export interface SplitRow {
  t1: string
  t2: string
  kDirect: number
  direct: Contrast
  indirect: Contrast | null
  network: Contrast
  propDirect: number
  diff: number | null
  diffSE: number | null
  pval: number | null
}

export interface NMAResult {
  treatments: string[]
  reference: string
  model: 'common' | 'random'
  tau2: number
  Q: number
  df: number
  Qp: number
  Qhet: number
  dfHet: number
  QhetP: number
  Qinc: number
  dfInc: number
  QincP: number
  I2: number
  /** effect of each treatment vs the reference */
  vsRef: Record<string, Contrast>
  /** league[a][b] = effect of b vs a */
  league: (a: string, b: string) => Contrast
  pscores: Record<string, number>
  split: SplitRow[]
  edges: { t1: string; t2: string; k: number }[]
  connected: boolean
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

export function isConnected(treatments: string[], studies: NMAStudy[]): boolean {
  if (treatments.length === 0) return false
  const adj = new Map<string, Set<string>>()
  treatments.forEach((t) => adj.set(t, new Set()))
  studies.forEach((s) => {
    adj.get(s.t1)?.add(s.t2)
    adj.get(s.t2)?.add(s.t1)
  })
  const seen = new Set([treatments[0]])
  const stack = [treatments[0]]
  while (stack.length) {
    const t = stack.pop()!
    adj.get(t)?.forEach((n) => {
      if (!seen.has(n)) {
        seen.add(n)
        stack.push(n)
      }
    })
  }
  return seen.size === treatments.length
}

function fit(studies: NMAStudy[], treatments: string[], reference: string, tau2: number) {
  const others = treatments.filter((t) => t !== reference)
  const col = new Map(others.map((t, i) => [t, i]))
  const X: Matrix = studies.map((s) => {
    const row = new Array(others.length).fill(0)
    if (col.has(s.t2)) row[col.get(s.t2)!] += 1
    if (col.has(s.t1)) row[col.get(s.t1)!] -= 1
    return row
  })
  const w = studies.map((s) => 1 / (s.vi + tau2))
  const V = inverse(xtwx(X, w))
  const beta = matvec(V, xtwy(X, w, studies.map((s) => s.yi)))
  const resid = studies.map((s, i) => s.yi - X[i].reduce((a, x, j) => a + x * beta[j], 0))
  const Q = resid.reduce((a, r, i) => a + w[i] * r * r, 0)
  return { X, w, V, beta, Q, others, col }
}

export function networkMetaAnalysis(
  studies: NMAStudy[],
  {
    reference,
    model = 'random',
    smallerIsBetter = true,
    level = 0.95,
  }: { reference?: string; model?: 'common' | 'random'; smallerIsBetter?: boolean; level?: number } = {},
): NMAResult {
  const treatments = [...new Set(studies.flatMap((s) => [s.t1, s.t2]))].sort()
  const ref = reference && treatments.includes(reference) ? reference : treatments[0]
  const connected = isConnected(treatments, studies)
  if (!connected) throw new Error('The network is disconnected: some treatments cannot be compared.')
  const z = qnorm(1 - (1 - level) / 2)
  const n = studies.length
  const T = treatments.length

  // Common-effect fit and generalised DL-type τ²
  const fe = fit(studies, treatments, ref, 0)
  const df = n - (T - 1)
  const sw = fe.w.reduce((a, b) => a + b, 0)
  // tr(V X'W²X)
  const XtW2X = xtwx(
    fe.X,
    fe.w.map((x) => x * x),
  )
  let tr = 0
  for (let i = 0; i < fe.V.length; i++) for (let j = 0; j < fe.V.length; j++) tr += fe.V[i][j] * XtW2X[j][i]
  const tau2 = model === 'random' && df > 0 ? Math.max(0, (fe.Q - df) / (sw - tr)) : 0
  const final = model === 'random' ? fit(studies, treatments, ref, tau2) : fe

  const coef = (t: string) => (t === ref ? 0 : final.beta[final.col.get(t)!])
  const vcov = (a: string, b: string) => (a === ref || b === ref ? 0 : final.V[final.col.get(a)!][final.col.get(b)!])
  const contrast = (a: string, b: string): Contrast => {
    const est = coef(b) - coef(a)
    const v = vcov(a, a) + vcov(b, b) - 2 * vcov(a, b)
    const se = Math.sqrt(Math.max(0, v))
    return { est, se, ci: [est - z * se, est + z * se], pval: se > 0 ? pFromZ(est / se) : NaN }
  }
  const vsRef: Record<string, Contrast> = {}
  treatments.forEach((t) => (vsRef[t] = contrast(ref, t)))

  // P-scores
  const pscores: Record<string, number> = {}
  treatments.forEach((i) => {
    let s = 0
    treatments.forEach((j) => {
      if (i === j) return
      const c = contrast(j, i) // effect of i vs j
      const p = pnorm(c.est / c.se) // P(i > j)
      s += smallerIsBetter ? 1 - p : p
    })
    pscores[i] = s / (T - 1)
  })

  // Q decomposition (common-effect)
  const designs = new Map<string, NMAStudy[]>()
  studies.forEach((s) => {
    const key = pairKey(s.t1, s.t2)
    if (!designs.has(key)) designs.set(key, [])
    designs.get(key)!.push(s)
  })
  let Qhet = 0
  let dfHet = 0
  const edges: { t1: string; t2: string; k: number }[] = []
  designs.forEach((ss, key) => {
    const [a, b] = key.split('|')
    edges.push({ t1: a, t2: b, k: ss.length })
    const ys = ss.map((s) => (s.t1 === a ? s.yi : -s.yi))
    const ws = ss.map((s) => 1 / s.vi)
    const m = ys.reduce((acc, y, i) => acc + ws[i] * y, 0) / ws.reduce((x, y) => x + y, 0)
    Qhet += ys.reduce((acc, y, i) => acc + ws[i] * (y - m) ** 2, 0)
    dfHet += ss.length - 1
  })
  const Qinc = Math.max(0, fe.Q - Qhet)
  const dfInc = df - dfHet

  // Node-splitting by back-calculation, using the network τ² for direct estimates
  const split: SplitRow[] = []
  designs.forEach((ss, key) => {
    const [a, b] = key.split('|')
    const ys = ss.map((s) => (s.t1 === a ? s.yi : -s.yi))
    const ws = ss.map((s) => 1 / (s.vi + tau2))
    const swd = ws.reduce((x, y) => x + y, 0)
    const dEst = ys.reduce((acc, y, i) => acc + ws[i] * y, 0) / swd
    const dVar = 1 / swd
    const net = contrast(a, b)
    const nVar = net.se ** 2
    const direct: Contrast = {
      est: dEst,
      se: Math.sqrt(dVar),
      ci: [dEst - z * Math.sqrt(dVar), dEst + z * Math.sqrt(dVar)],
      pval: pFromZ(dEst / Math.sqrt(dVar)),
    }
    let indirect: Contrast | null = null
    let diff: number | null = null
    let diffSE: number | null = null
    let pval: number | null = null
    const propDirect = Math.min(1, nVar / dVar)
    if (propDirect < 0.9999) {
      const iVar = 1 / (1 / nVar - 1 / dVar)
      const iEst = iVar * (net.est / nVar - dEst / dVar)
      const ise = Math.sqrt(iVar)
      indirect = { est: iEst, se: ise, ci: [iEst - z * ise, iEst + z * ise], pval: pFromZ(iEst / ise) }
      diff = dEst - iEst
      diffSE = Math.sqrt(dVar + iVar)
      pval = pFromZ(diff / diffSE)
    }
    split.push({ t1: a, t2: b, kDirect: ss.length, direct, indirect, network: net, propDirect, diff, diffSE, pval })
  })

  return {
    treatments,
    reference: ref,
    model,
    tau2,
    Q: fe.Q,
    df,
    Qp: df > 0 ? pchisqUpper(fe.Q, df) : NaN,
    Qhet,
    dfHet,
    QhetP: dfHet > 0 ? pchisqUpper(Qhet, dfHet) : NaN,
    Qinc,
    dfInc,
    QincP: dfInc > 0 ? pchisqUpper(Qinc, dfInc) : NaN,
    I2: df > 0 ? Math.max(0, (100 * (fe.Q - df)) / fe.Q) : 0,
    vsRef,
    league: contrast,
    pscores,
    split,
    edges,
    connected,
  }
}

/** Bucher adjusted indirect comparison: A vs C through common comparator B. */
export function bucher(dAB: number, seAB: number, dCB: number, seCB: number, level = 0.95) {
  // effect of A vs C = (A vs B) − (C vs B)
  const est = dAB - dCB
  const se = Math.sqrt(seAB ** 2 + seCB ** 2)
  const z = qnorm(1 - (1 - level) / 2)
  return { est, se, ci: [est - z * se, est + z * se] as [number, number], pval: pFromZ(est / se) }
}

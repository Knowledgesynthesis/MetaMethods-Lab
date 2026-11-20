import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number with fixed decimals, using a true minus sign. */
export function fmt(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—'
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞'
  let s = x.toFixed(digits)
  if (/^-0(\.0+)?$/.test(s)) s = s.slice(1)
  return s.startsWith('-') ? '−' + s.slice(1) : s
}

export function fmtP(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return '—'
  if (p < 0.0001) return '< 0.0001'
  if (p < 0.001) return p.toFixed(4)
  if (p < 0.01) return p.toFixed(3)
  return p.toFixed(2)
}

export const fmtPct = (x: number | null | undefined, digits = 1) => (x === null || x === undefined || Number.isNaN(x) ? '—' : `${fmt(x, digits)}%`)

export function fmtCI(ci: [number, number] | null | undefined, digits = 2, transform: (x: number) => number = (x) => x) {
  if (!ci) return '—'
  return `${fmt(transform(ci[0]), digits)} to ${fmt(transform(ci[1]), digits)}`
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

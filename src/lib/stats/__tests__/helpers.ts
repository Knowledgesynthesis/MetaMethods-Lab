import { expect } from 'vitest'

/** Assert |a − b| ≤ atol + rtol·|b|. */
export function close(actual: number, expected: number | null | undefined, rtol = 1e-6, atol = 1e-8, label = '') {
  if (expected === null || expected === undefined) return
  const ok = Math.abs(actual - expected) <= atol + rtol * Math.abs(expected)
  if (!ok) expect.fail(`${label} expected ${expected}, got ${actual} (diff ${Math.abs(actual - expected)})`)
}

export const asArray = <T>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x])

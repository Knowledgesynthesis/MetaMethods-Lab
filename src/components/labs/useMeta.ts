import { useMemo } from 'react'
import { estimateTau2, metaAnalysis, recommendedCIMethod, type MetaResult } from '@/lib/stats/pairwise'
import type { MetaSettingsState } from './MetaSettings'

export interface StudyRow {
  label: string
  yi: number
  sei: number
}

/** Run a meta-analysis applying the 'auto' (Cochrane) CI rule when requested. */
export function runMeta(rows: StudyRow[], s: MetaSettingsState): MetaResult | null {
  const valid = rows.filter((r) => Number.isFinite(r.yi) && r.sei > 0)
  if (valid.length === 0) return null
  const yi = valid.map((r) => r.yi)
  const vi = valid.map((r) => r.sei * r.sei)
  let ciMethod: 'wald' | 'hksj' = s.ci === 'auto' ? 'wald' : s.ci
  if (s.ci === 'auto' && s.model === 'random') {
    const t2 = valid.length > 1 ? estimateTau2(yi, vi, s.tau2Method) : 0
    ciMethod = recommendedCIMethod(t2, valid.length)
  }
  return metaAnalysis(yi, vi, { model: s.model, tau2Method: s.tau2Method, ciMethod })
}

export function useMeta(rows: StudyRow[], s: MetaSettingsState) {
  return useMemo(() => runMeta(rows, s), [rows, s])
}


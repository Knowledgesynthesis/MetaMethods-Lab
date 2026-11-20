import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleId } from '@/content/curriculum'

export type Theme = 'dark' | 'light' | 'system'
export type FontSize = 'sm' | 'md' | 'lg'

export interface QuizRecord {
  best: number
  last: number
  attempts: number
}

interface AppState {
  theme: Theme
  fontSize: FontSize
  completed: Partial<Record<ModuleId, string>>
  quiz: Record<string, QuizRecord>
  /** last answer correctness per question id — drives "review missed questions" */
  answered: Record<string, boolean>
  sidebarOpen: boolean
  setTheme: (t: Theme) => void
  setFontSize: (f: FontSize) => void
  toggleComplete: (id: ModuleId) => void
  recordQuiz: (key: string, pct: number) => void
  recordAnswer: (qid: string, correct: boolean) => void
  setSidebar: (open: boolean) => void
  resetProgress: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSize: 'md',
      completed: {},
      quiz: {},
      answered: {},
      sidebarOpen: false,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleComplete: (id) =>
        set((s) => {
          const completed = { ...s.completed }
          if (completed[id]) delete completed[id]
          else completed[id] = new Date().toISOString()
          return { completed }
        }),
      recordQuiz: (key, pct) =>
        set((s) => {
          const prev = s.quiz[key]
          return {
            quiz: {
              ...s.quiz,
              [key]: { best: Math.max(prev?.best ?? 0, pct), last: pct, attempts: (prev?.attempts ?? 0) + 1 },
            },
          }
        }),
      recordAnswer: (qid, correct) => set((s) => ({ answered: { ...s.answered, [qid]: correct } })),
      setSidebar: (sidebarOpen) => set({ sidebarOpen }),
      resetProgress: () => set({ completed: {}, quiz: {}, answered: {} }),
    }),
    {
      name: 'metamethods-v2',
      partialize: (s) => ({ theme: s.theme, fontSize: s.fontSize, completed: s.completed, quiz: s.quiz, answered: s.answered }),
    },
  ),
)

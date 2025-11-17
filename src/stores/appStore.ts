import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, UserProgress } from '@/types'

interface AppState {
  // Settings
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void

  // User progress
  progress: UserProgress
  markModuleComplete: (moduleId: string) => void
  saveAssessmentScore: (moduleId: string, score: number) => void
  toggleBookmark: (itemId: string) => void

  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
}

const defaultSettings: AppSettings = {
  darkMode: true,  // Default to dark mode as per requirements
  fontSize: 'medium',
  colorBlindMode: false,
  offlineMode: false,
}

const defaultProgress: UserProgress = {
  userId: 'default-user',
  completedModules: [],
  assessmentScores: {},
  bookmarks: [],
  lastAccessed: new Date(),
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      progress: defaultProgress,
      markModuleComplete: (moduleId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            completedModules: state.progress.completedModules.includes(moduleId)
              ? state.progress.completedModules
              : [...state.progress.completedModules, moduleId],
            lastAccessed: new Date(),
          },
        })),
      saveAssessmentScore: (moduleId, score) =>
        set((state) => ({
          progress: {
            ...state.progress,
            assessmentScores: {
              ...state.progress.assessmentScores,
              [moduleId]: score,
            },
            lastAccessed: new Date(),
          },
        })),
      toggleBookmark: (itemId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            bookmarks: state.progress.bookmarks.includes(itemId)
              ? state.progress.bookmarks.filter((id) => id !== itemId)
              : [...state.progress.bookmarks, itemId],
          },
        })),

      sidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'metamethods-storage',
    }
  )
)

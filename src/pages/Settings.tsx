import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/stores/appStore'
import { Moon, Sun, Type, Eye } from 'lucide-react'

export default function Settings() {
  const { settings, updateSettings, progress } = useAppStore()

  const handleDarkModeToggle = (checked: boolean) => {
    updateSettings({ darkMode: checked })
    if (checked) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize your learning experience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the app looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-3">
              {settings.darkMode ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <div>
                <label className="text-sm font-medium">Dark Mode</label>
                <p className="text-sm text-muted-foreground">
                  Use dark theme throughout the app
                </p>
              </div>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

          <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
            <div className="space-y-0.5 flex items-center gap-3">
              <Type className="h-5 w-5" />
              <div>
                <label className="text-sm font-medium">Font Size</label>
                <p className="text-sm text-muted-foreground">
                  Adjust text size: {settings.fontSize}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Coming soon</div>
          </div>

          <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
            <div className="space-y-0.5 flex items-center gap-3">
              <Eye className="h-5 w-5" />
              <div>
                <label className="text-sm font-medium">Color Blind Mode</label>
                <p className="text-sm text-muted-foreground">
                  Adjust colors for accessibility
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Coming soon</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>
            Track your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Modules Completed</p>
              <p className="text-3xl font-bold">{progress.completedModules.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Assessments Taken</p>
              <p className="text-3xl font-bold">
                {Object.keys(progress.assessmentScores).length}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Bookmarks</p>
              <p className="text-3xl font-bold">{progress.bookmarks.length}</p>
            </div>
          </div>

          {Object.keys(progress.assessmentScores).length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">Assessment Scores</h3>
              <div className="space-y-2">
                {Object.entries(progress.assessmentScores).map(([moduleId, score]) => (
                  <div key={moduleId} className="flex justify-between items-center">
                    <span className="text-sm">{moduleId}</span>
                    <span className="text-sm font-mono">{score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About MetaMethods Lab</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Version:</strong> 1.0.0
            </p>
            <p>
              <strong>Purpose:</strong> Educational platform for learning meta-analytic methods
            </p>
            <p className="text-muted-foreground">
              This application uses synthetic data only and is designed for educational purposes.
              For real meta-analyses, please use validated statistical software such as R, Stata,
              or RevMan.
            </p>
          </div>

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">Data Privacy</h3>
            <p className="text-sm text-muted-foreground">
              All your progress and settings are stored locally in your browser. No data is sent
              to external servers. Clearing your browser data will reset your progress.
            </p>
          </div>

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">Offline Capability</h3>
            <p className="text-sm text-muted-foreground">
              This app can work offline once fully loaded. Your progress is saved locally and
              will sync when you return online.
            </p>
          </div>

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">References</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Cochrane Handbook for Systematic Reviews of Interventions</li>
              <li>Borenstein M, et al. Introduction to Meta-Analysis (2009)</li>
              <li>Deeks JJ, et al. Cochrane Handbook Chapter 10: DTA Reviews</li>
              <li>Dias S, et al. Network Meta-Analysis for Decision Making (2018)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

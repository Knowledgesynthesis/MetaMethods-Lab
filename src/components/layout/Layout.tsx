import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Home, BookOpen, BarChart3, Network, TestTube, Settings as SettingsIcon, HelpCircle } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
}

const navigationItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/effect-size-basics', label: 'Effect Size Basics', icon: BookOpen },
  { path: '/pairwise-meta-analysis', label: 'Forest Plot Lab', icon: BarChart3 },
  { path: '/proportions-lab', label: 'Proportions Lab', icon: TestTube },
  { path: '/meta-regression', label: 'Meta-regression', icon: BarChart3 },
  { path: '/dta-meta-analysis', label: 'DTA Meta-analysis', icon: BarChart3 },
  { path: '/network-meta-analysis', label: 'Network Meta-analysis', icon: Network },
  { path: '/funnel-plot-lab', label: 'Funnel Plot Lab', icon: BarChart3 },
  { path: '/assessment', label: 'Assessment', icon: HelpCircle },
  { path: '/glossary', label: 'Glossary', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 md:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-lg font-bold">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">MetaMethods Lab</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Advanced Meta-Analytic Methods
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 px-0">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed top-16 z-30 h-[calc(100vh-4rem)] w-full shrink-0 overflow-y-auto border-r bg-background md:sticky md:block',
            sidebarOpen ? 'block' : 'hidden md:block'
          )}
        >
          <nav className="grid gap-1 p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      toggleSidebar()
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="relative py-6 lg:gap-10 lg:py-8 px-4 md:px-6">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            Educational use only. Not for real clinical meta-analyses. All data is synthetic.
          </p>
          <p className="text-sm text-muted-foreground">
            © 2024 MetaMethods Lab
          </p>
        </div>
      </footer>
    </div>
  )
}

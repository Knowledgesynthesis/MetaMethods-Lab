import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BookOpen, CheckCircle2, GraduationCap, Library, Menu, Monitor, Moon, Settings, Sun, X } from 'lucide-react'
import { MODULES } from '@/content/curriculum'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

const GROUPS = ['Foundations', 'Special data', 'Advanced', 'Practice'] as const

function ThemeButton() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const next = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system'
  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const completed = useAppStore((s) => s.completed)
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
      isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    )
  return (
    <nav aria-label="Course" className="space-y-5 p-4 text-sm">
      <NavLink to="/" end className={link} onClick={onNavigate}>
        <BookOpen className="h-4 w-4" /> Course map
      </NavLink>
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{g}</div>
          <ul className="space-y-0.5">
            {MODULES.filter((m) => m.group === g).map((m) => (
              <li key={m.id}>
                <NavLink to={m.path} className={link} onClick={onNavigate}>
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                      completed[m.id] ? 'border-ok bg-ok/15 text-ok' : 'border-border',
                    )}
                  >
                    {completed[m.id] ? <CheckCircle2 className="h-3.5 w-3.5" /> : m.n}
                  </span>
                  <span className="leading-tight">{m.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Practice & reference</div>
        <ul className="space-y-0.5">
          <li>
            <NavLink to="/assessment" className={link} onClick={onNavigate}>
              <GraduationCap className="h-4 w-4" /> Assessment
            </NavLink>
          </li>
          <li>
            <NavLink to="/glossary" className={link} onClick={onNavigate}>
              <BookOpen className="h-4 w-4" /> Glossary
            </NavLink>
          </li>
          <li>
            <NavLink to="/references" className={link} onClick={onNavigate}>
              <Library className="h-4 w-4" /> References
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={link} onClick={onNavigate}>
              <Settings className="h-4 w-4" /> Settings & progress
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const open = useAppStore((s) => s.sidebarOpen)
  const setOpen = useAppStore((s) => s.setSidebar)
  const completed = useAppStore((s) => s.completed)
  const done = MODULES.filter((m) => completed[m.id]).length

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 })
    setOpen(false)
  }, [location.pathname, location.hash, setOpen])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <div className="min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex h-14 items-center gap-2 px-3 md:px-5">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
              <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
              <path d="M7 10h10M7 16h14M7 22h8" stroke="hsl(var(--primary-foreground))" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M22 22l3-3-3-3-3 3z" fill="hsl(var(--primary-foreground))" />
            </svg>
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-tight">MetaMethods Lab</div>
              <div className="hidden text-[11px] text-muted-foreground sm:block">Meta-analysis, learned by doing</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/settings"
              className="hidden items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent sm:inline-flex"
              title="Modules completed"
            >
              <span className="relative h-2 w-16 overflow-hidden rounded-full bg-muted">
                <span className="absolute inset-y-0 left-0 rounded-full bg-ok" style={{ width: `${(100 * done) / MODULES.length}%` }} />
              </span>
              <span className="num">
                {done}/{MODULES.length}
              </span>
            </Link>
            <ThemeButton />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r lg:block">
          <Sidebar />
        </aside>
        {open && (
          <div className="fixed inset-0 top-14 z-30 lg:hidden">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto border-r bg-background shadow-xl">
              <Sidebar onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}
        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
          <footer className="mx-auto mt-16 max-w-[1180px] border-t pt-6 text-xs text-muted-foreground">
            All datasets are synthetic. Computations are validated against R (metafor, meta, netmeta, mada, bayesmeta); use the generated R code to reproduce analyses for publication.
          </footer>
        </main>
      </div>
    </div>
  )
}

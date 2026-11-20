import { useEffect, useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MODULES } from '@/content/curriculum'
import { useAppStore, type FontSize, type Theme } from '@/stores/appStore'
import { Segmented } from '@/components/ui/controls'
import { cn } from '@/lib/utils'

export default function Settings() {
  const { theme, setTheme, fontSize, setFontSize, completed, quiz, answered, resetProgress } = useAppStore()
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => {
    document.title = 'Settings & progress · MetaMethods Lab'
  }, [])

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ version: 2, completed, quiz, answered }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'metamethods-progress.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importProgress = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (data.version !== 2) throw new Error('version')
      useAppStore.setState({ completed: data.completed ?? {}, quiz: data.quiz ?? {}, answered: data.answered ?? {} })
      setMsg('Progress imported.')
    } catch {
      setMsg('That file is not a MetaMethods progress export.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings & progress</h1>
      </header>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Display</h2>
        <Segmented<Theme>
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <Segmented<FontSize>
          label="Text size"
          value={fontSize}
          onChange={setFontSize}
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ]}
        />
        <p className="text-xs text-muted-foreground">Charts use the Okabe–Ito palette, which remains distinguishable with common forms of colour-vision deficiency.</p>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Progress</h2>
        <ul className="grid gap-1.5 text-sm">
          {MODULES.map((m) => {
            const q = quiz[`module:${m.id}`]
            return (
              <li key={m.id} className="flex items-center justify-between gap-3">
                <Link to={m.path} className="hover:text-primary">
                  <span className="mr-2 font-mono text-xs text-primary">{m.n}</span>
                  {m.title}
                </Link>
                <span className="flex items-center gap-3 text-xs">
                  <span className={cn(q ? (q.best >= 80 ? 'text-ok' : 'text-warn') : 'text-muted-foreground')}>{q ? `quiz ${Math.round(q.best)}%` : 'no quiz'}</span>
                  <span className={completed[m.id] ? 'text-ok' : 'text-muted-foreground'}>{completed[m.id] ? 'completed' : 'open'}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={exportProgress} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent">
            <Download className="h-4 w-4" /> Export progress
          </button>
          <button type="button" onClick={() => file.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> Import progress
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importProgress(f)
              e.target.value = ''
            }}
          />
          {confirm ? (
            <span className="inline-flex items-center gap-2 text-sm">
              Delete all progress?
              <button
                type="button"
                onClick={() => {
                  resetProgress()
                  setConfirm(false)
                  setMsg('Progress reset.')
                }}
                className="rounded-md bg-bad px-3 py-1.5 text-xs font-medium text-white"
              >
                Yes, reset
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-bad hover:bg-bad/10">
              Reset progress
            </button>
          )}
        </div>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <p className="text-xs text-muted-foreground">Progress is stored only in this browser. Export it to move to another device.</p>
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-5 text-sm">
        <h2 className="text-lg font-semibold">About</h2>
        <p>
          MetaMethods Lab {__APP_VERSION__}. The statistical engine is verified by automated tests against R packages metafor, meta, netmeta, mada and bayesmeta
          on simulated and published datasets. Teaching datasets are synthetic.
        </p>
        <p className="text-muted-foreground">Install it from your browser menu (“Install app” / “Add to Home Screen”) to use it offline.</p>
      </section>
    </div>
  )
}

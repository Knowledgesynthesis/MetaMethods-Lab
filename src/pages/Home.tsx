import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, FlaskConical, GraduationCap, ShieldCheck } from 'lucide-react'
import { MODULES } from '@/content/curriculum'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

const GROUPS = ['Foundations', 'Special data', 'Advanced', 'Practice'] as const

const LOOP = [
  { t: 'Predict', d: 'Commit to an answer before you see the data change. Wrong predictions are where learning happens.' },
  { t: 'Experiment', d: 'Change the data, the model or the estimator in a live lab and watch every number update.' },
  { t: 'Explain', d: 'Each result is tied to the formula, the current Cochrane guidance and the primary literature.' },
  { t: 'Retrieve', d: 'Quick checks inside the text and a quiz per module, with explanations for every option.' },
]

export default function Home() {
  const completed = useAppStore((s) => s.completed)
  const quiz = useAppStore((s) => s.quiz)
  const next = MODULES.find((m) => !completed[m.id]) ?? MODULES[0]
  const started = Object.keys(completed).length > 0
  const totalMin = MODULES.reduce((s, m) => s + m.minutes, 0)

  useEffect(() => {
    document.title = 'MetaMethods Lab — meta-analysis, learned by doing'
  }, [])

  return (
    <div className="mx-auto max-w-[1180px] space-y-14">
      <section className="grid gap-8 pt-2 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">An interactive course in meta-analysis</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">Understand every number in a meta-analysis — by producing it yourself.</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Eleven modules from effect sizes to network and Bayesian meta-analysis. Every lab runs a real statistical engine that reproduces R’s
            metafor, meta, netmeta, mada and bayesmeta, and follows the Cochrane Handbook v6.5.1 (2026).
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={next.path} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90">
              {started ? `Continue: ${next.title}` : 'Start with Module 1'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/learn/workflow" className="inline-flex h-11 items-center rounded-md border px-5 font-medium hover:bg-accent">
              I have a dataset — which method?
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: '11', v: 'modules', icon: GraduationCap },
            { k: '26', v: 'interactive labs', icon: FlaskConical },
            { k: '155', v: 'test cases matched against R', icon: ShieldCheck },
            { k: `${Math.round(totalMin / 60)} h`, v: 'total study time', icon: Clock },
          ].map(({ k, v, icon: Icon }) => (
            <div key={v} className="rounded-xl border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <div className="mt-2 text-2xl font-bold">{k}</div>
              <div className="text-sm text-muted-foreground">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="loop">
        <h2 id="loop" className="text-xl font-semibold">How every module works</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {LOOP.map((s, i) => (
            <li key={s.t} className="rounded-xl border bg-card p-4">
              <div className="font-mono text-xs text-primary">0{i + 1}</div>
              <div className="mt-1 font-semibold">{s.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="map" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="map" className="text-xl font-semibold">Course map</h2>
          <p className="text-sm text-muted-foreground">Modules 1–3 are the foundation; after that, follow your needs.</p>
        </div>
        {GROUPS.map((g) => (
          <div key={g}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {MODULES.filter((m) => m.group === g).map((m) => {
                const done = !!completed[m.id]
                const q = quiz[`module:${m.id}`]
                return (
                  <Link
                    key={m.id}
                    to={m.path}
                    className={cn(
                      'group flex flex-col rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md',
                      done && 'border-ok/40',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-primary">Module {m.n}</span>
                      {done ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
                          <CheckCircle2 className="h-3.5 w-3.5" /> done
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">~{m.minutes} min</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-lg font-semibold">{m.title}</div>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{m.blurb}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.labs.map((l) => (
                        <span key={l} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {l}
                        </span>
                      ))}
                    </div>
                    {q && <div className="mt-2 text-xs text-muted-foreground">Quiz best: {Math.round(q.best)}%</div>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Current, not historical</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            REML instead of DerSimonian–Laird, Hartung–Knapp–Sidik–Jonkman intervals, prediction intervals, GLMMs for proportions, ROB-ME for missing
            evidence, GRADE’s minimally contextualised NMA conclusions.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Verifiable</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The engine is checked against R on hundreds of simulated datasets, and labs export the R code that reproduces their results.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Works offline</h3>
          <p className="mt-1 text-sm text-muted-foreground">Install it as an app; progress is stored on your device only.</p>
        </div>
      </section>
    </div>
  )
}

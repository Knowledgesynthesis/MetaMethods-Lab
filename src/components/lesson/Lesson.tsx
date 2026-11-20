import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Circle, Clock, GraduationCap, Target } from 'lucide-react'
import { moduleById, nextModule, type ModuleId } from '@/content/curriculum'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'
import { Cite } from './blocks'

export interface LessonProps {
  id: ModuleId
  objectives: ReactNode[]
  sections: { id: string; title: string }[]
  refs: string[]
  children: ReactNode
}

export function Lesson({ id, objectives, sections, refs, children }: LessonProps) {
  const meta = moduleById(id)
  const next = nextModule(id)
  const completed = useAppStore((s) => !!s.completed[id])
  const toggle = useAppStore((s) => s.toggleComplete)
  const quiz = useAppStore((s) => s.quiz[`module:${id}`])

  useEffect(() => {
    document.title = `${meta.n}. ${meta.title} · MetaMethods Lab`
  }, [meta])

  return (
    <div className="mx-auto flex max-w-[1180px] gap-10">
      <article className="min-w-0 flex-1">
        <header className="mb-6 border-b pb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">Module {meta.n}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> ~{meta.minutes} min
            </span>
            {meta.prereq.length > 0 && (
              <span>
                Builds on{' '}
                {meta.prereq.map((p, i) => (
                  <span key={p}>
                    {i > 0 && ', '}
                    <Link className="text-primary hover:underline" to={moduleById(p).path}>
                      {moduleById(p).title}
                    </Link>
                  </span>
                ))}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{meta.title}</h1>
          <p className="mt-2 max-w-3xl text-lg text-muted-foreground">{meta.blurb}</p>
          <div className="mt-5 rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" aria-hidden /> After this module you can
            </div>
            <ul className="grid gap-1.5 text-[0.95rem] leading-6 md:grid-cols-2">
              {objectives.map((o, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <div className="prose-lesson">{children}</div>

        <footer className="mt-12 space-y-6 border-t pt-8">
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <GraduationCap className="h-5 w-5 text-primary" aria-hidden /> Check your mastery
              </div>
              <p className="text-sm text-muted-foreground">
                Module quiz with explanations{quiz ? ` · best score ${Math.round(quiz.best)}%` : ''}. Aim for ≥ 80% before moving on.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/assessment?module=${id}`}
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
              >
                Take the quiz
              </Link>
              <button
                type="button"
                onClick={() => toggle(id)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium',
                  completed ? 'bg-ok/15 text-ok' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                {completed ? 'Completed' : 'Mark complete'}
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Sources for this module</h2>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {refs.map((r) => (
                <li key={r}>
                  <Cite id={r} />
                </li>
              ))}
            </ul>
            <Link to="/references" className="mt-2 inline-block text-sm text-primary hover:underline">
              Full annotated reference list →
            </Link>
          </div>

          {next && (
            <Link
              to={next.path}
              className="group flex items-center justify-between rounded-xl border bg-card p-5 transition-colors hover:border-primary/60"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next · Module {next.n}</div>
                <div className="text-lg font-semibold">{next.title}</div>
                <div className="text-sm text-muted-foreground">{next.blurb}</div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </footer>
      </article>

      <nav aria-label="On this page" className="sticky top-24 hidden h-fit w-56 shrink-0 xl:block">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</div>
        <ul className="space-y-1.5 border-l text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted-foreground hover:border-primary hover:text-foreground">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  )
}

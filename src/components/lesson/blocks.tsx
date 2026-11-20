import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BookMarked, CheckCircle2, FlaskConical, Lightbulb, Scale, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { refById, refLink } from '@/content/references'
import { useAppStore } from '@/stores/appStore'

const CALLOUTS = {
  key: { icon: Lightbulb, label: 'Key idea', cls: 'border-chart-blue/40 bg-chart-blue/5', ic: 'text-chart-blue' },
  pitfall: { icon: AlertTriangle, label: 'Pitfall', cls: 'border-chart-vermillion/40 bg-chart-vermillion/5', ic: 'text-chart-vermillion' },
  rule: { icon: Scale, label: 'Current guidance', cls: 'border-chart-green/40 bg-chart-green/5', ic: 'text-chart-green' },
  evidence: { icon: BookMarked, label: 'Evidence', cls: 'border-chart-purple/40 bg-chart-purple/5', ic: 'text-chart-purple' },
  tip: { icon: FlaskConical, label: 'In practice', cls: 'border-chart-orange/40 bg-chart-orange/5', ic: 'text-chart-orange' },
} as const

export function Callout({ kind, title, children }: { kind: keyof typeof CALLOUTS; title?: string; children: ReactNode }) {
  const c = CALLOUTS[kind]
  const Icon = c.icon
  return (
    <div className={cn('my-5 rounded-lg border-l-4 border p-4', c.cls)}>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Icon className={cn('h-4 w-4', c.ic)} aria-hidden />
        <span>{title ?? c.label}</span>
      </div>
      <div className="text-[0.95rem] leading-7 text-foreground/90 [&>p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </div>
  )
}

/** Inline citation linking to the reference list. */
export function Cite({ id }: { id: string }) {
  const r = refById[id]
  if (!r) return <span className="text-bad">[missing ref: {id}]</span>
  return (
    <a
      href={refLink(r)}
      target="_blank"
      rel="noreferrer"
      title={r.citation}
      className="whitespace-nowrap text-[0.85em] font-medium text-primary no-underline hover:underline"
    >
      [{r.short}]
    </a>
  )
}

export interface MCQ {
  id: string
  q: ReactNode
  options: ReactNode[]
  answer: number
  why: ReactNode
}

/** Inline retrieval-practice question with immediate feedback. */
export function QuickCheck({ item }: { item: MCQ }) {
  const [choice, setChoice] = useState<number | null>(null)
  const record = useAppStore((s) => s.recordAnswer)
  const done = choice !== null
  return (
    <div className="my-6 rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Quick check</div>
      <div className="font-medium leading-7">{item.q}</div>
      <div className="mt-3 grid gap-2">
        {item.options.map((o, i) => {
          const correct = i === item.answer
          const picked = choice === i
          return (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => {
                setChoice(i)
                record(item.id, correct)
              }}
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                !done && 'hover:border-primary/60 hover:bg-accent',
                done && correct && 'border-ok/60 bg-ok/10',
                done && picked && !correct && 'border-bad/60 bg-bad/10',
                done && !picked && !correct && 'opacity-60',
              )}
            >
              <span className="mt-0.5 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{o}</span>
              {done && correct && <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-label="correct" />}
              {done && picked && !correct && <XCircle className="h-4 w-4 shrink-0 text-bad" aria-label="incorrect" />}
            </button>
          )
        })}
      </div>
      {done && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm leading-6">
          <span className={cn('font-semibold', choice === item.answer ? 'text-ok' : 'text-bad')}>
            {choice === item.answer ? 'Correct. ' : 'Not quite. '}
          </span>
          {item.why}
          <button type="button" onClick={() => setChoice(null)} className="ml-2 text-xs font-medium text-primary hover:underline">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

/** Predict → observe → explain. The learner commits to a prediction before testing it in a lab. */
export function Predict({ prompt, options, reveal }: { prompt: ReactNode; options: string[]; reveal: ReactNode }) {
  const [choice, setChoice] = useState<number | null>(null)
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Predict first</div>
      <div className="font-medium leading-7">{prompt}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            onClick={() => setChoice(i)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              choice === i ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary/60',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {choice !== null && (
        <div className="mt-3 rounded-lg bg-background/70 p-3 text-sm leading-6">
          <span className="font-semibold">You predicted “{options[choice]}”. </span>
          {reveal}
        </div>
      )}
    </div>
  )
}

export function Lab({ title, children, description, actions }: { title: string; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="my-8 overflow-hidden rounded-xl border bg-card shadow-sm" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Takeaways({ items }: { items: ReactNode[] }) {
  return (
    <div className="my-8 rounded-xl border bg-card p-5">
      <h2 className="!mt-0 text-xl font-semibold">Key takeaways</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem] leading-7">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    </div>
  )
}

export function ModuleLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
      {children}
    </Link>
  )
}

/** Simple responsive table for results. */
export function DataTable({ head, rows, className }: { head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)}>
      <table className="num w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {head.map((h, i) => (
              <th key={i} className={cn('px-3 py-2 font-medium', i === 0 ? 'text-left' : 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className={cn('px-3 py-1.5', j === 0 ? 'text-left' : 'text-right font-mono')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

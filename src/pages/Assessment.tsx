import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { MODULES, moduleById, type ModuleId } from '@/content/curriculum'
import { QUESTIONS, type Question } from '@/content/questions'
import { useAppStore } from '@/stores/appStore'
import { rng } from '@/lib/stats/random'
import { cn } from '@/lib/utils'

type Mode = { kind: 'module'; id: ModuleId } | { kind: 'exam' } | { kind: 'review' }

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

/** Shuffle options deterministically per question so the answer position carries no information. */
function shuffled(q: Question) {
  const r = rng(hash(q.id))
  const order = q.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r.uniform() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}

function pickQuestions(mode: Mode, answered: Record<string, boolean>, seed: number): Question[] {
  if (mode.kind === 'module') return QUESTIONS.filter((q) => q.module === mode.id)
  if (mode.kind === 'review') return QUESTIONS.filter((q) => answered[q.id] === false)
  const r = rng(seed)
  const pool = [...QUESTIONS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r.uniform() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 22)
}

function Quiz({ mode, onExit }: { mode: Mode; onExit: () => void }) {
  const answered = useAppStore((s) => s.answered)
  const recordAnswer = useAppStore((s) => s.recordAnswer)
  const recordQuiz = useAppStore((s) => s.recordQuiz)
  const [seed] = useState(() => Date.now() % 100000)
  // freeze the question list for this attempt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => pickQuestions(mode, answered, seed), [mode, seed])
  const [idx, setIdx] = useState(0)
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [finished, setFinished] = useState(false)

  if (questions.length === 0)
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="font-medium">Nothing to review — no missed questions recorded.</p>
        <button type="button" onClick={onExit} className="mt-3 text-sm text-primary hover:underline">
          Back
        </button>
      </div>
    )

  const q = questions[idx]
  const s = shuffled(q)
  const choice = choices[q.id]
  const done = choice !== undefined
  const correctCount = questions.filter((x) => choices[x.id] !== undefined && choices[x.id] === shuffled(x).answer).length

  const finish = () => {
    const pct = (100 * correctCount) / questions.length
    recordQuiz(mode.kind === 'module' ? `module:${mode.id}` : mode.kind, pct)
    setFinished(true)
  }

  if (finished) {
    const pct = Math.round((100 * correctCount) / questions.length)
    const byModule = MODULES.map((m) => {
      const qs = questions.filter((x) => x.module === m.id)
      const c = qs.filter((x) => choices[x.id] === shuffled(x).answer).length
      return { m, n: qs.length, c }
    }).filter((x) => x.n > 0)
    return (
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-6 text-center">
          <div className={cn('text-5xl font-bold', pct >= 80 ? 'text-ok' : pct >= 60 ? 'text-warn' : 'text-bad')}>{pct}%</div>
          <p className="mt-1 text-muted-foreground">
            {correctCount} of {questions.length} correct
          </p>
          <p className="mt-3 font-medium">
            {pct >= 80 ? 'Mastery level reached.' : pct >= 60 ? 'Nearly there — revisit the modules flagged below.' : 'Work through the flagged modules, then retry.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onExit} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent">
              <RotateCcw className="h-4 w-4" /> Choose another quiz
            </button>
          </div>
        </div>
        {byModule.length > 1 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">By module</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {byModule.map(({ m, n, c }) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <Link to={m.path} className="text-primary hover:underline">
                    {m.n}. {m.title}
                  </Link>
                  <span className={cn('num font-mono', c / n >= 0.8 ? 'text-ok' : 'text-bad')}>
                    {c}/{n}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Question {idx + 1} of {questions.length} · <Link to={moduleById(q.module).path} className="text-primary hover:underline">{moduleById(q.module).title}</Link>
        </span>
        <span className="num">{correctCount} correct</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(100 * (idx + (done ? 1 : 0))) / questions.length}%` }} />
      </div>
      <div className="rounded-xl border bg-card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{q.level}</div>
        <h2 className="mt-1 text-lg font-semibold leading-7">{q.q}</h2>
        <div className="mt-4 grid gap-2">
          {s.options.map((o, i) => {
            const correct = i === s.answer
            const picked = choice === i
            return (
              <button
                key={i}
                type="button"
                disabled={done}
                onClick={() => {
                  setChoices({ ...choices, [q.id]: i })
                  recordAnswer(q.id, correct)
                }}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                  !done && 'hover:border-primary/60 hover:bg-accent',
                  done && correct && 'border-ok/60 bg-ok/10',
                  done && picked && !correct && 'border-bad/60 bg-bad/10',
                  done && !picked && !correct && 'opacity-60',
                )}
              >
                <span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{o}</span>
                {done && correct && <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />}
                {done && picked && !correct && <XCircle className="h-4 w-4 shrink-0 text-bad" />}
              </button>
            )
          })}
        </div>
        {done && <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm leading-6">{q.why}</p>}
        <div className="mt-4 flex justify-between">
          <button type="button" onClick={onExit} className="text-sm text-muted-foreground hover:text-foreground">
            Quit
          </button>
          {done &&
            (idx < questions.length - 1 ? (
              <button type="button" onClick={() => setIdx(idx + 1)} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={finish} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                See results
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}

export default function Assessment() {
  const [params, setParams] = useSearchParams()
  const quiz = useAppStore((s) => s.quiz)
  const answered = useAppStore((s) => s.answered)
  const missed = Object.values(answered).filter((v) => !v).length
  const moduleParam = params.get('module') as ModuleId | null
  const [mode, setMode] = useState<Mode | null>(moduleParam && MODULES.some((m) => m.id === moduleParam) ? { kind: 'module', id: moduleParam } : null)

  useEffect(() => {
    document.title = 'Assessment · MetaMethods Lab'
  }, [])

  const exit = () => {
    setMode(null)
    setParams({})
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Assessment</h1>
        <p className="mt-2 text-muted-foreground">
          {QUESTIONS.length} questions with explanations for every answer. Aim for ≥ 80% on each module quiz, then take the mixed exam.
        </p>
      </header>
      {mode ? (
        <Quiz key={JSON.stringify(mode)} mode={mode} onExit={exit} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setMode({ kind: 'exam' })} className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/60">
              <div className="font-semibold">Mixed exam</div>
              <p className="mt-1 text-sm text-muted-foreground">22 random questions across all modules{quiz.exam ? ` · best ${Math.round(quiz.exam.best)}%` : ''}</p>
            </button>
            <button
              type="button"
              disabled={missed === 0}
              onClick={() => setMode({ kind: 'review' })}
              className="rounded-xl border bg-card p-5 text-left transition-colors enabled:hover:border-primary/60 disabled:opacity-50"
            >
              <div className="font-semibold">Review missed questions</div>
              <p className="mt-1 text-sm text-muted-foreground">{missed} question{missed === 1 ? '' : 's'} last answered incorrectly</p>
            </button>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Module quizzes</h2>
            <div className="grid gap-2">
              {MODULES.map((m) => {
                const r = quiz[`module:${m.id}`]
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode({ kind: 'module', id: m.id })}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left text-sm hover:border-primary/60"
                  >
                    <span>
                      <span className="mr-2 font-mono text-xs text-primary">{m.n}</span>
                      {m.title}
                    </span>
                    <span className={cn('num font-mono text-xs', r ? (r.best >= 80 ? 'text-ok' : 'text-warn') : 'text-muted-foreground')}>
                      {r ? `best ${Math.round(r.best)}%` : 'not taken'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

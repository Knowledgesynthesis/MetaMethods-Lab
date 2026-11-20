import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { GLOSSARY } from '@/content/glossary'
import { moduleById } from '@/content/curriculum'
import { Tex } from '@/components/lesson/Tex'

export default function Glossary() {
  const [q, setQ] = useState('')
  useEffect(() => {
    document.title = 'Glossary · MetaMethods Lab'
  }, [])
  const terms = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? GLOSSARY.filter((t) => t.term.toLowerCase().includes(s) || t.def.toLowerCase().includes(s)) : GLOSSARY
  }, [q])
  const letters = [...new Set(terms.map((t) => t.term[0].toUpperCase()))]
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
        <p className="mt-2 text-muted-foreground">{GLOSSARY.length} terms, each linked to the module where it is taught.</p>
      </header>
      <div className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <label className="relative block max-w-md">
          <span className="sr-only">Search the glossary</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search terms and definitions…"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          />
        </label>
      </div>
      {letters.map((L) => (
        <section key={L} aria-label={L}>
          <h2 className="mb-2 font-mono text-sm font-semibold text-primary">{L}</h2>
          <dl className="divide-y rounded-xl border bg-card">
            {terms
              .filter((t) => t.term[0].toUpperCase() === L)
              .map((t) => (
                <div key={t.term} className="p-4" id={t.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
                  <dt className="font-semibold">{t.term}</dt>
                  <dd className="mt-1 text-sm leading-6 text-foreground/85">{t.def}</dd>
                  {t.tex && (
                    <dd className="mt-2 overflow-x-auto rounded bg-muted/50 px-3 py-1.5 text-sm">
                      <Tex>{t.tex}</Tex>
                    </dd>
                  )}
                  {t.module && (
                    <dd className="mt-2 text-xs">
                      <Link to={moduleById(t.module).path} className="text-primary hover:underline">
                        Module {moduleById(t.module).n}: {moduleById(t.module).title} →
                      </Link>
                    </dd>
                  )}
                </div>
              ))}
          </dl>
        </section>
      ))}
      {terms.length === 0 && <p className="text-muted-foreground">No terms match “{q}”.</p>}
    </div>
  )
}

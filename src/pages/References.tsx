import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { REFERENCES, refLink } from '@/content/references'
import { Segmented } from '@/components/ui/controls'

const TOPICS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'effect-sizes', label: 'Effect sizes' },
  { value: 'heterogeneity', label: 'Heterogeneity' },
  { value: 'binary', label: 'Rare events' },
  { value: 'proportions', label: 'Proportions' },
  { value: 'meta-regression', label: 'Meta-regression' },
  { value: 'small-study', label: 'Missing evidence' },
  { value: 'dta', label: 'DTA' },
  { value: 'nma', label: 'NMA' },
  { value: 'bayesian', label: 'Bayesian' },
  { value: 'software', label: 'Software' },
]

export default function References() {
  const [topic, setTopic] = useState('all')
  useEffect(() => {
    document.title = 'References · MetaMethods Lab'
  }, [])
  const refs = useMemo(() => (topic === 'all' ? REFERENCES : REFERENCES.filter((r) => r.topics.includes(topic))), [topic])
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">References</h1>
        <p className="mt-2 text-muted-foreground">
          The primary sources behind every method and recommendation in the course, with what each contributes. Guidance reflects the Cochrane Handbook
          v6.5.1 (chapter 10 updated November 2026).
        </p>
      </header>
      <Segmented value={topic} onChange={setTopic} options={TOPICS} size="sm" />
      <ol className="space-y-3">
        {refs.map((r) => (
          <li key={r.id} id={r.id} className="rounded-xl border bg-card p-4">
            <p className="text-sm leading-6">{r.citation}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{r.why}</p>
            <a href={refLink(r)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {r.doi ? `doi:${r.doi}` : 'Open source'} <ExternalLink className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

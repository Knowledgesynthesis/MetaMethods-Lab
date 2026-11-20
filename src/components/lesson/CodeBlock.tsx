import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CodeBlock({ code, title = 'R code' }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="my-4 overflow-hidden rounded-lg border bg-muted/40">
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium">{title}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            } catch {
              /* clipboard unavailable */
            }
          }}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 hover:bg-accent"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-3 font-mono text-[12.5px] leading-5">
        <code>{code}</code>
      </pre>
    </div>
  )
}

import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

/** Render a LaTeX expression with KaTeX. `block` renders display math. */
export function Tex({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: block,
        throwOnError: false,
        strict: 'ignore',
        output: 'htmlAndMathml',
      }),
    [children, block],
  )
  if (block) return <div className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

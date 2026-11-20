import { C, useWidth } from './core'

export interface NetNode {
  id: string
  label: string
  size: number
}
export interface NetEdge {
  a: string
  b: string
  k: number
}

export function NetworkPlot({
  nodes,
  edges,
  selectedEdge,
  onEdgeClick,
  reference,
  height = 300,
}: {
  nodes: NetNode[]
  edges: NetEdge[]
  selectedEdge?: string | null
  onEdgeClick?: (key: string) => void
  reference?: string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const cx = width / 2
  const cy = height / 2
  const R = Math.min(width, height) / 2 - 42
  const pos = new Map(nodes.map((n, i) => [n.id, { x: cx + R * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / nodes.length), y: cy + R * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / nodes.length) }]))
  const maxK = Math.max(1, ...edges.map((e) => e.k))
  const maxN = Math.max(1, ...nodes.map((n) => n.size))
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="img" aria-label="Network graph: nodes are treatments, edges are direct comparisons">
        {edges.map((e) => {
          const p = pos.get(e.a)!
          const q = pos.get(e.b)!
          const key = `${e.a}|${e.b}`
          const sel = selectedEdge === key
          return (
            <g key={key} onClick={onEdgeClick ? () => onEdgeClick(key) : undefined} className={onEdgeClick ? 'cursor-pointer' : undefined}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="transparent" strokeWidth={16} />
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={sel ? C.orange : C.ink} strokeOpacity={sel ? 1 : 0.55} strokeWidth={1.5 + 7 * (e.k / maxK)} strokeLinecap="round" />
              <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2} dy={-6} textAnchor="middle" fontSize={11} fill={C.muted} className="num">
                {e.k}
              </text>
            </g>
          )
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!
          const r = 12 + 14 * Math.sqrt(n.size / maxN)
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={r} fill={n.id === reference ? C.purple : C.blue} stroke={C.bg} strokeWidth={2} />
              <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" fontSize={13} fontWeight={700} fill="white">
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

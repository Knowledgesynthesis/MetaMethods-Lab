import { useMemo } from 'react'

interface NetworkNode {
  id: string
  name: string
  x: number
  y: number
}

interface NetworkEdge {
  source: string
  target: string
  studies: number
}

interface NetworkGraphProps {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  width?: number
  height?: number
}

export default function NetworkGraph({ nodes, edges, width = 600, height = 400 }: NetworkGraphProps) {
  const viewBox = `0 0 ${width} ${height}`

  const edgeElements = useMemo(() => {
    return edges.map((edge, i) => {
      const sourceNode = nodes.find((n) => n.id === edge.source)
      const targetNode = nodes.find((n) => n.id === edge.target)

      if (!sourceNode || !targetNode) return null

      const strokeWidth = Math.max(1, Math.min(8, edge.studies * 1.5))

      return (
        <g key={`edge-${i}`}>
          <line
            x1={sourceNode.x}
            y1={sourceNode.y}
            x2={targetNode.x}
            y2={targetNode.y}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={strokeWidth}
            opacity={0.6}
          />
          <text
            x={(sourceNode.x + targetNode.x) / 2}
            y={(sourceNode.y + targetNode.y) / 2}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
            dy={-5}
          >
            {edge.studies}
          </text>
        </g>
      )
    })
  }, [nodes, edges])

  return (
    <svg viewBox={viewBox} className="w-full h-full">
      {/* Edges */}
      {edgeElements}

      {/* Nodes */}
      {nodes.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={30}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={3}
            opacity={0.9}
          />
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-primary-foreground text-sm font-semibold"
          >
            {node.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

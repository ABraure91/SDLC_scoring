import { useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Position,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import clsx from 'clsx'
import type { SDLCGraph } from '../types'
import { getBranches, getBranchDescendants } from '../utils/graphUtils'

interface GraphVisualizationProps {
  graph: SDLCGraph
  onBranchChange?: (branchId: string | null) => void
}

// Couleurs pour les différents niveaux
const LEVEL_COLORS: Record<number, string> = {
  0: '#1e40af', // Bleu foncé pour niveau 0
  1: '#3b82f6', // Bleu moyen pour niveau 1
  2: '#60a5fa', // Bleu clair pour niveau 2
}

// Couleurs pour les types d'edges
const EDGE_COLORS: Record<string, string> = {
  sequence: '#ef4444', // Rouge pour séquence
  decomposition: '#6b7280', // Gris pour décomposition
}

export default function GraphVisualization({ graph, onBranchChange }: GraphVisualizationProps) {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)

  const branches = useMemo(() => getBranches(graph), [graph])

  // Notifier le parent quand la branche change
  useEffect(() => {
    if (onBranchChange) {
      onBranchChange(selectedBranchId)
    }
  }, [selectedBranchId, onBranchChange])

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    // Créer un layout hiérarchique basé sur les niveaux
    const nodesByLevel = new Map<number, typeof graph.nodes>()
    graph.nodes.forEach((node) => {
      if (!nodesByLevel.has(node.level)) {
        nodesByLevel.set(node.level, [])
      }
      nodesByLevel.get(node.level)!.push(node)
    })

    // Positionner les nœuds par niveau (layout simple et efficace)
    const nodeMap = new Map<string, Node>()
    const nodeWidth = 200
    const nodeHeight = 100
    const verticalSpacing = 200
    const horizontalSpacing = 240

    // Parcourir les niveaux de 0 à 2
    for (let level = 0; level <= 2; level++) {
      const levelNodes = nodesByLevel.get(level) || []
      const y = level * verticalSpacing + 100

      // Centrer les nœuds horizontalement
      const totalWidth = levelNodes.length * horizontalSpacing - (levelNodes.length > 0 ? horizontalSpacing - nodeWidth : 0)
      const startX = -totalWidth / 2

      levelNodes.forEach((node, index) => {
        const x = startX + index * horizontalSpacing
        const nodeColor = LEVEL_COLORS[node.level] || '#9ca3af'

        nodeMap.set(node.id, {
          id: node.id,
          type: 'default',
          position: { x, y },
          data: {
            label: (
              <div className="text-center px-2">
                <div className="font-semibold text-sm leading-tight">{node.label}</div>
                {node.node_type === 'leaf' && node.base_prob !== undefined && (
                  <div className="text-xs text-gray-200 mt-1">
                    Prob: {node.base_prob.toFixed(2)}
                  </div>
                )}
                {node.tags.length > 0 && (
                  <div className="text-xs text-gray-300 mt-1">
                    {node.tags.slice(0, 2).join(', ')}
                    {node.tags.length > 2 && '...'}
                  </div>
                )}
              </div>
            ),
          },
          style: {
            background: nodeColor,
            color: '#ffffff',
            border: '2px solid #1e293b',
            borderRadius: '8px',
            width: nodeWidth,
            height: nodeHeight,
            fontSize: '12px',
            fontWeight: node.node_type === 'composite' ? 'bold' : 'normal',
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        })
      })
    }

    // Filtrer les nœuds selon la branche sélectionnée
    let visibleNodeIds: Set<string>
    if (selectedBranchId) {
      const branchDescendants = getBranchDescendants(graph, selectedBranchId)
      visibleNodeIds = new Set(
        Array.from(nodeMap.values())
          .filter((node) => branchDescendants.has(node.id))
          .map((n) => n.id)
      )
    } else {
      visibleNodeIds = new Set(Array.from(nodeMap.values()).map((n) => n.id))
    }

    // Filtrer les nœuds visibles
    const filteredNodes = Array.from(nodeMap.values()).filter((node) =>
      visibleNodeIds.has(node.id)
    )

    // Créer les edges, en ne gardant que ceux dont les deux nœuds sont visibles
    const edges: Edge[] = graph.edges
      .filter((edge) => visibleNodeIds.has(edge.src) && visibleNodeIds.has(edge.dst))
      .map((edge) => {
        const edgeColor = EDGE_COLORS[edge.edge_type] || '#6b7280'
        const edgeStyle = edge.edge_type === 'sequence' ? 'solid' : 'dashed'

        return {
          id: `${edge.src}-${edge.dst}`,
          source: edge.src,
          target: edge.dst,
          type: 'smoothstep',
          animated: edge.edge_type === 'sequence',
          style: {
            stroke: edgeColor,
            strokeWidth: edge.edge_type === 'sequence' ? 3 : 2,
            strokeDasharray: edgeStyle === 'dashed' ? '5,5' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
          },
          label: edge.params?.soft_gating_strength
            ? `${edge.params.soft_gating_strength.toFixed(2)}`
            : undefined,
          labelStyle: {
            fill: edgeColor,
            fontWeight: 'bold',
            fontSize: '10px',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.8,
          },
        }
      })

    return {
      nodes: filteredNodes,
      edges,
    }
  }, [graph, selectedBranchId])

  // Ajuster la vue quand la branche change
  useEffect(() => {
    if (reactFlowInstance.current) {
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2, duration: 300 })
      }, 100)
    }
  }, [selectedBranchId, flowNodes.length])

  // Compter les nœuds et les edges
  const visibleNodeCount = flowNodes.length
  const visibleEdgeCount = flowEdges.length

  return (
    <div className="rounded-xl border border-axa-border bg-white p-4 shadow-soft">
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-base font-semibold text-axa-ink">Visualisation du graph SDLC</div>
            <div className="mt-1 text-sm text-axa-muted">
              {visibleNodeCount} nœud{visibleNodeCount > 1 ? 's' : ''} • {visibleEdgeCount} relation{visibleEdgeCount > 1 ? 's' : ''}
              {selectedBranchId && (
                <span className="ml-2">
                  (branche: {branches.find((b) => b.id === selectedBranchId)?.label || selectedBranchId})
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedBranchId(null)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                selectedBranchId === null
                  ? 'bg-axa-blue text-white'
                  : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
              )}
            >
              Tous
            </button>
            {branches.map((branch, index) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => setSelectedBranchId(branch.id)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  selectedBranchId === branch.id
                    ? 'bg-axa-blue text-white'
                    : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
                )}
              >
                Branche {index + 1} ({branch.label})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[600px] w-full rounded-lg border border-axa-border bg-axa-surface">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onInit={(instance) => {
            reactFlowInstance.current = instance
            instance.fitView({ padding: 0.2 })
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const nodeData = graph.nodes.find((n) => n.id === node.id)
              return nodeData ? LEVEL_COLORS[nodeData.level] || '#9ca3af' : '#9ca3af'
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-axa-muted">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-800"></div>
          <span>Niveau 0 (composite)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500"></div>
          <span>Niveau 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-300"></div>
          <span>Niveau 2 (leaf)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-8 bg-red-500"></div>
          <span>Séquence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-8 border-b-2 border-dashed border-gray-500"></div>
          <span>Décomposition</span>
        </div>
      </div>
    </div>
  )
}

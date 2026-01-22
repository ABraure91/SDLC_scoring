export type PreviewTable = {
  columns: string[]
  rows: Record<string, string | number | null>[]
}

export type UploadMeta = {
  encoding: string
  delimiter: string
  row_count: number
  step_count: number
}

export type UploadResponse = {
  toolNames: string[]
  stepNames: string[]
  matrix: (number | null)[][]
  minScore: number
  maxScore: number
  preview: PreviewTable
  warnings: string[]
  meta: UploadMeta
}

export type ApiErrorPayload = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export type FiltersState = {
  selectedTools: string[]
  selectedSteps: string[]
  scoreMin: number
  scoreMax: number
  radarMaxTools: number
  radarFocusTool: string | null
}

export type SDLCNode = {
  id: string
  label: string
  level: number
  node_type: 'composite' | 'leaf'
  tags: string[]
  base_prob?: number
}

export type SDLCEdge = {
  src: string
  dst: string
  edge_type: 'sequence' | 'decomposition'
  params?: {
    soft_gating_strength?: number
  }
}

export type SDLCGraph = {
  nodes: SDLCNode[]
  edges: SDLCEdge[]
}

export type GraphResponse = {
  graph: SDLCGraph
  warnings: string[]
}

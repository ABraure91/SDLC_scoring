import { useMemo } from 'react'
import Plotly from 'plotly.js-dist-min'
import Plot from 'react-plotly.js'
import type { FiltersState, SDLCGraph } from '../types'
import { createStepToBranchMap, filterStepsByBranch } from '../utils/graphUtils'

function buildRadarTraces(args: {
  toolNames: string[]
  stepNames: string[]
  matrix: (number | null)[][]
  filters: FiltersState
}): { traces: Partial<Plotly.PlotData>[]; note?: string } {
  const { toolNames, stepNames, matrix, filters } = args

  const toolSet = new Set(filters.selectedTools)
  const stepSet = new Set(filters.selectedSteps)

  const steps = stepNames.filter((s) => stepSet.has(s))
  const toolIdx = new Map<string, number>()
  toolNames.forEach((t, i) => toolIdx.set(t, i))
  const stepIdx = new Map<string, number>()
  stepNames.forEach((s, i) => stepIdx.set(s, i))

  let selectedTools = toolNames.filter((t) => toolSet.has(t))

  let note: string | undefined
  if (selectedTools.length > filters.radarMaxTools) {
    note = `Trop d’outils sélectionnés (${selectedTools.length}). Affichage limité à ${filters.radarMaxTools} outils (réglez “Radar → Nombre max d’outils”).`
    // Prefer the focus tool first, then the rest in original order
    if (filters.radarFocusTool && selectedTools.includes(filters.radarFocusTool)) {
      const rest = selectedTools.filter((t) => t !== filters.radarFocusTool)
      selectedTools = [filters.radarFocusTool, ...rest].slice(0, filters.radarMaxTools)
    } else {
      selectedTools = selectedTools.slice(0, filters.radarMaxTools)
    }
  } else {
    // If focus exists, bring it to front so it's more visible (legend order)
    if (filters.radarFocusTool && selectedTools.includes(filters.radarFocusTool)) {
      selectedTools = [filters.radarFocusTool, ...selectedTools.filter((t) => t !== filters.radarFocusTool)]
    }
  }

  const traces: Partial<Plotly.PlotData>[] = selectedTools.map((tool) => {
    const row = matrix[toolIdx.get(tool)!] || []
    const rawValues = steps.map((s) => row[stepIdx.get(s)!] ?? null)
    // We keep polygons closed by plotting missing values as 0, but we expose "N/A" in hover.
    const r = rawValues.map((v) => (v === null ? 0 : v))
    const custom = rawValues.map((v) => (v === null ? 'N/A' : String(v)))

    const isFocus = filters.radarFocusTool ? tool === filters.radarFocusTool : true

    return {
      type: 'scatterpolar',
      r,
      theta: steps,
      name: tool,
      fill: 'toself',
      opacity: isFocus ? 0.9 : 0.18,
      customdata: custom,
      hovertemplate: 'Outil: %{fullData.name}<br>Étape: %{theta}<br>Score: %{customdata}<extra></extra>'
    }
  })

  return { traces, note }
}

export default function RadarView(props: {
  toolNames: string[]
  stepNames: string[]
  matrix: (number | null)[][]
  minScore: number
  maxScore: number
  filters: FiltersState
  graph?: SDLCGraph | null
  selectedBranchId?: string | null
}) {
  const { toolNames, stepNames, matrix, minScore, maxScore, filters, graph, selectedBranchId } = props

  // Créer le mapping des étapes vers les branches
  const stepToBranchMap = useMemo(() => createStepToBranchMap(graph || null), [graph])

  // Filtrer les étapes selon la branche sélectionnée
  const filteredStepNames = useMemo(() => {
    return filterStepsByBranch(stepNames, selectedBranchId || null, stepToBranchMap)
  }, [stepNames, selectedBranchId, stepToBranchMap])

  // Filtrer les filtres pour ne garder que les étapes de la branche sélectionnée
  const adjustedFilters = useMemo(() => {
    if (!selectedBranchId || stepToBranchMap.size === 0) {
      return filters
    }
    // Ne garder que les étapes qui sont dans filteredStepNames ET dans filters.selectedSteps
    const filteredSelectedSteps = filters.selectedSteps.filter((step) =>
      filteredStepNames.includes(step)
    )
    return {
      ...filters,
      selectedSteps: filteredSelectedSteps.length > 0 ? filteredSelectedSteps : filteredStepNames
    }
  }, [filters, selectedBranchId, filteredStepNames, stepToBranchMap])

  const { traces, note } = buildRadarTraces({
    toolNames,
    stepNames, // Garder les stepNames originaux pour l'indexation de la matrice
    matrix,
    filters: adjustedFilters // Utiliser adjustedFilters qui filtre par branche
  })

  const stepsSelected = stepNames.filter((s) => filters.selectedSteps.includes(s))

  const radialMin = Math.min(0, minScore)
  const radialMax = maxScore

  const layout: Partial<Plotly.Layout> = {
    autosize: true,
    margin: { l: 40, r: 40, t: 20, b: 20 },
    paper_bgcolor: 'white',
    plot_bgcolor: 'white',
    legend: {
      orientation: 'h',
      y: -0.15
    },
    polar: {
      bgcolor: 'white',
      radialaxis: {
        visible: true,
        range: [radialMin, radialMax],
        tickfont: { color: '#475569' },
        gridcolor: '#E5E7EB'
      },
      angularaxis: {
        tickfont: { color: '#0F172A' },
        gridcolor: '#E5E7EB'
      }
    }
  }

  const config: Partial<Plotly.Config> = {
    displaylogo: false,
    responsive: true
  }

  return (
    <div className="rounded-xl border border-axa-border bg-axa-card p-5 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-base font-semibold">Radar (spider chart)</div>
        <div className="text-xs text-axa-muted">Comparez des outils sur les étapes SDLC.</div>
      </div>

      {note ? <div className="mt-3 rounded-md border border-axa-border bg-axa-surface px-3 py-2 text-xs text-axa-muted">{note}</div> : null}

      <div className="mt-4 h-[520px]">
        {stepsSelected.length < 3 ? (
          <div className="flex h-full items-center justify-center text-sm text-axa-muted">
            Sélectionnez au moins 3 étapes SDLC pour un radar lisible.
          </div>
        ) : traces.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-axa-muted">
            Sélectionnez au moins un outil dans les filtres.
          </div>
        ) : (
          <Plot
            plotly={Plotly}
            data={traces}
            layout={layout}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      <div className="mt-3 text-xs text-axa-muted">
        Note: les valeurs manquantes (“N/A”) sont tracées à 0 pour fermer les polygones, mais restent visibles au survol.
      </div>
    </div>
  )
}

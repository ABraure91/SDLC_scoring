import { useState, useEffect, useRef, useMemo } from 'react'
import Plotly from 'plotly.js-dist-min'
import Plot from 'react-plotly.js'
import type { FiltersState, SDLCGraph } from '../types'
import { createStepToBranchMap, filterStepsByBranch } from '../utils/graphUtils'

function buildFilteredMatrix(args: {
  toolNames: string[]
  stepNames: string[]
  matrix: (number | null)[][]
  filters: FiltersState
  selectedStep: string | null
}): { x: string[]; y: string[]; z: (number | null)[][] } {
  const { toolNames, stepNames, matrix, filters, selectedStep } = args

  const toolSet = new Set(filters.selectedTools)
  const stepSet = new Set(filters.selectedSteps)

  let y = toolNames.filter((t) => toolSet.has(t))
  const x = stepNames.filter((s) => stepSet.has(s))

  const toolIdx = new Map<string, number>()
  toolNames.forEach((t, i) => toolIdx.set(t, i))

  const stepIdx = new Map<string, number>()
  stepNames.forEach((s, i) => stepIdx.set(s, i))

  // Si une étape est sélectionnée, trier les outils par ordre croissant
  if (selectedStep && stepSet.has(selectedStep)) {
    const stepIndex = stepIdx.get(selectedStep)!
    y = [...y].sort((toolA, toolB) => {
      const toolAIdx = toolIdx.get(toolA)!
      const toolBIdx = toolIdx.get(toolB)!
      const scoreA = matrix[toolAIdx]?.[stepIndex] ?? null
      const scoreB = matrix[toolBIdx]?.[stepIndex] ?? null

      // Gérer les valeurs null : les placer à la fin
      if (scoreA === null && scoreB === null) return 0
      if (scoreA === null) return 1
      if (scoreB === null) return -1

      // Tri croissant
      return scoreA - scoreB
    })
  }

  const z: (number | null)[][] = y.map((t) => {
    const row = matrix[toolIdx.get(t)!] || []
    return x.map((s) => {
      const v = row[stepIdx.get(s)!] ?? null
      if (v === null) return null
      if (v < filters.scoreMin || v > filters.scoreMax) return null
      return v
    })
  })

  return { x, y, z }
}

export default function HeatmapView(props: {
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

  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)

  // Réinitialiser la sélection si l'étape sélectionnée n'est plus dans les filtres ou n'est plus de la branche sélectionnée
  useEffect(() => {
    if (selectedStep) {
      const isInFilters = adjustedFilters.selectedSteps.includes(selectedStep)
      const isInFilteredBranch = !selectedBranchId || stepToBranchMap.size === 0 || filteredStepNames.includes(selectedStep)
      if (!isInFilters || !isInFilteredBranch) {
        setSelectedStep(null)
      }
    }
  }, [selectedStep, adjustedFilters.selectedSteps, selectedBranchId, filteredStepNames, stepToBranchMap])

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

  const filtered = buildFilteredMatrix({
    toolNames,
    stepNames, // Garder les stepNames originaux pour l'indexation de la matrice
    matrix,
    filters: adjustedFilters, // Utiliser adjustedFilters qui filtre par branche
    selectedStep
  })

  // Gestionnaire de clic pour les cellules de la heatmap
  const handlePlotClick = (event: Readonly<Plotly.PlotMouseEvent> | any) => {
    if (event?.points && event.points.length > 0) {
      const point = event.points[0]
      // point.x contient le nom de l'étape (axe x)
      if (point?.x && typeof point.x === 'string') {
        const clickedStep = point.x
        // Si on clique sur la même étape, on désélectionne
        setSelectedStep(selectedStep === clickedStep ? null : clickedStep)
      }
    }
  }

  const data: Partial<Plotly.PlotData>[] = [
    {
      type: 'heatmap',
      x: filtered.x,
      y: filtered.y,
      z: filtered.z,
      hovertemplate: 'Outil: %{y}<br>Étape: %{x}<br>Score: %{z}<extra></extra>',
      coloraxis: 'coloraxis'
    }
  ]

  const layout: Partial<Plotly.Layout> = {
    autosize: true,
    margin: { l: 140, r: 30, t: 20, b: 90 },
    paper_bgcolor: 'white',
    plot_bgcolor: 'white',
    xaxis: {
      title: '',
      tickangle: -30,
      automargin: true
    },
    yaxis: {
      title: '',
      automargin: true
    },
    coloraxis: {
      cmin: minScore,
      cmax: maxScore,
      colorbar: {
        title: { text: 'Score' }
      },
      colorscale: [
        [0, '#F8FAFC'],
        [0.4, '#C7D2FE'],
        [0.7, '#2563EB'],
        [1, '#00008F']
      ]
    }
  }

  // Fonction utilitaire pour mettre à jour le style des labels de l'axe X
  const updateAxisLabelsStyle = (currentSelectedStep: string | null, availableSteps: string[]) => {
    const plotElement = plotRef.current
    if (!plotElement) return

    const xAxisLabels = plotElement.querySelectorAll('.xtick text, [class*="xtick"] text, g.xtick text')
    xAxisLabels.forEach((label) => {
      const textElement = label as SVGTextElement
      const stepName = textElement.textContent?.trim()
      
      if (stepName && currentSelectedStep === stepName) {
        // Mettre en évidence l'étape sélectionnée
        textElement.style.fontWeight = 'bold'
        textElement.style.fill = '#2563EB'
        textElement.style.cursor = 'pointer'
        textElement.style.textDecoration = 'underline'
      } else if (stepName && availableSteps.includes(stepName)) {
        // Style normal pour les autres étapes (cliquables)
        textElement.style.fontWeight = 'normal'
        textElement.style.fill = '#0F172A'
        textElement.style.cursor = 'pointer'
        textElement.style.textDecoration = 'none'
      }
    })
  }

  // Détecter les clics sur les labels de l'axe X et mettre à jour leur style
  useEffect(() => {
    const plotElement = plotRef.current
    if (!plotElement) return

    const handleAxisLabelClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Vérifier si le clic est sur un label de l'axe X
      // Plotly utilise des éléments SVG avec des classes spécifiques
      const isXAxisLabel = 
        target.tagName === 'text' && 
        (target.closest('.xtick') !== null || 
         target.closest('[class*="xtick"]') !== null ||
         target.getAttribute('class')?.includes('xtick'))

      if (isXAxisLabel) {
        const textContent = target.textContent?.trim()
        if (textContent && filtered.x.includes(textContent)) {
          // Utiliser une fonction de callback pour éviter les problèmes de closure
          setSelectedStep((prev) => prev === textContent ? null : textContent)
        }
      }
    }

    // Attacher l'écouteur d'événements pour les clics
    plotElement.addEventListener('click', handleAxisLabelClick)

    // Mettre à jour les styles après un court délai pour s'assurer que Plotly a rendu
    const timeoutId = setTimeout(() => updateAxisLabelsStyle(selectedStep, filtered.x), 150)
    
    // Observer les changements dans le DOM pour mettre à jour les styles après chaque rendu
    const observer = new MutationObserver(() => {
      setTimeout(() => updateAxisLabelsStyle(selectedStep, filtered.x), 50)
    })
    observer.observe(plotElement, { childList: true, subtree: true })

    return () => {
      plotElement.removeEventListener('click', handleAxisLabelClick)
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [filtered.x, selectedStep])

  const config: Partial<Plotly.Config> = {
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d']
  }

  // Gestionnaire appelé après chaque mise à jour du graphique Plotly
  const handlePlotUpdate = () => {
    // Petit délai pour s'assurer que le DOM est mis à jour
    setTimeout(() => updateAxisLabelsStyle(selectedStep, filtered.x), 50)
  }

  const helpText = selectedStep
    ? `Outils triés par ordre croissant pour "${selectedStep}". Cliquez à nouveau pour annuler.`
    : 'Cliquez sur une étape (axe x) pour trier les outils par ordre croissant.'

  return (
    <div className="rounded-xl border border-axa-border bg-axa-card p-5 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-base font-semibold">Heatmap de scoring</div>
        <div className="text-xs text-axa-muted">{helpText}</div>
      </div>

      <div className="mt-4 h-[520px]" ref={plotRef}>
        {filtered.x.length === 0 || filtered.y.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-axa-muted">
            Sélectionnez au moins un outil et une étape dans les filtres.
          </div>
        ) : (
          <Plot
            plotly={Plotly}
            data={data}
            layout={layout}
            config={config}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            onClick={handlePlotClick}
            onUpdate={handlePlotUpdate}
          />
        )}
      </div>
    </div>
  )
}

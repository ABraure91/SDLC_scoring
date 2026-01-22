import { useState, useEffect, useRef, useMemo } from 'react'
import Plotly from 'plotly.js-dist-min'
import Plot from 'react-plotly.js'
import clsx from 'clsx'
import type { FiltersState, SDLCGraph } from '../types'
import type { LevelFilter } from '../utils/graphUtils'
import { createStepLevelMap, filterStepsByLevel } from '../utils/graphUtils'

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
  levelFilter: LevelFilter
  onLevelFilterChange: (filter: LevelFilter) => void
}) {
  const { toolNames, stepNames, matrix, minScore, maxScore, filters, graph, levelFilter, onLevelFilterChange } = props

  // Créer le mapping des étapes vers les niveaux
  const stepLevelMap = useMemo(() => createStepLevelMap(graph || null), [graph])

  // Filtrer les étapes selon le niveau sélectionné
  const filteredStepNames = useMemo(() => {
    return filterStepsByLevel(stepNames, levelFilter, stepLevelMap)
  }, [stepNames, levelFilter, stepLevelMap])

  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)

  // Réinitialiser la sélection si l'étape sélectionnée n'est plus dans les filtres ou n'est plus du niveau sélectionné
  useEffect(() => {
    if (selectedStep) {
      const isInFilters = filters.selectedSteps.includes(selectedStep)
      const isInFilteredLevel = levelFilter === 'all' || stepLevelMap.size === 0 || filteredStepNames.includes(selectedStep)
      if (!isInFilters || !isInFilteredLevel) {
        setSelectedStep(null)
      }
    }
  }, [selectedStep, filters.selectedSteps, levelFilter, filteredStepNames, stepLevelMap])

  // Filtrer les filtres pour ne garder que les étapes du niveau sélectionné
  const adjustedFilters = useMemo(() => {
    if (levelFilter === 'all' || stepLevelMap.size === 0) {
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
  }, [filters, levelFilter, filteredStepNames, stepLevelMap])

  const filtered = buildFilteredMatrix({
    toolNames,
    stepNames, // Garder les stepNames originaux pour l'indexation de la matrice
    matrix,
    filters: adjustedFilters, // Utiliser adjustedFilters qui filtre par niveau
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

  // Afficher les boutons de filtrage seulement si un graph est chargé
  const showLevelFilter = Boolean(graph)

  return (
    <div className="rounded-xl border border-axa-border bg-axa-card p-5 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-base font-semibold">Heatmap de scoring</div>
          <div className="text-xs text-axa-muted">{helpText}</div>
        </div>

        {showLevelFilter && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onLevelFilterChange('all')}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                levelFilter === 'all'
                  ? 'bg-axa-blue text-white'
                  : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
              )}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => onLevelFilterChange(0)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                levelFilter === 0
                  ? 'bg-axa-blue text-white'
                  : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
              )}
            >
              Lv 0
            </button>
            <button
              type="button"
              onClick={() => onLevelFilterChange(1)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                levelFilter === 1
                  ? 'bg-axa-blue text-white'
                  : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
              )}
            >
              Lv 1
            </button>
            <button
              type="button"
              onClick={() => onLevelFilterChange(2)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                levelFilter === 2
                  ? 'bg-axa-blue text-white'
                  : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
              )}
            >
              Lv 2
            </button>
          </div>
        )}
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

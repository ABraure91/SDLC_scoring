import { useMemo, useState } from 'react'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import GraphUpload from './components/GraphUpload'
import GraphVisualization from './components/GraphVisualization'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorCallout from './components/ErrorCallout'
import DataPreviewTable from './components/DataPreviewTable'
import FiltersPanel from './components/FiltersPanel'
import HeatmapView from './components/HeatmapView'
import RadarView from './components/RadarView'
import Tabs, { type TabKey } from './components/Tabs'
import { ApiError, fetchSample, fetchSampleGraph, uploadCsv, uploadGraph } from './api/client'
import type { FiltersState, GraphResponse, SDLCGraph, UploadResponse } from './types'

function buildInitialFilters(data: UploadResponse): FiltersState {
  return {
    selectedTools: [...data.toolNames],
    selectedSteps: [...data.stepNames],
    scoreMin: data.minScore,
    scoreMax: data.maxScore,
    radarMaxTools: Math.min(6, data.toolNames.length || 6),
    radarFocusTool: null
  }
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('heatmap')

  const [data, setData] = useState<UploadResponse | null>(null)
  const [filters, setFilters] = useState<FiltersState | null>(null)
  const [graph, setGraph] = useState<SDLCGraph | null>(null)
  const [graphWarnings, setGraphWarnings] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [graphError, setGraphError] = useState<string | null>(null)
  const [isLoadingGraph, setIsLoadingGraph] = useState(false)

  const canRender = Boolean(data && filters)

  const load = async (fn: () => Promise<UploadResponse>) => {
    setIsLoading(true)
    setError(null)
    setWarnings([])
    try {
      const res = await fn()
      setData(res)
      setFilters(buildInitialFilters(res))
      setWarnings(res.warnings || [])
      setTab('heatmap')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erreur inattendue'
      setError(msg)
      setData(null)
      setFilters(null)
    } finally {
      setIsLoading(false)
    }
  }

  const onFileSelected = (file: File) => {
    void load(() => uploadCsv(file))
  }

  const onLoadSample = () => {
    void load(() => fetchSample())
  }

  const loadGraph = async (fn: () => Promise<GraphResponse>) => {
    setIsLoadingGraph(true)
    setGraphError(null)
    setGraphWarnings([])
    try {
      const res = await fn()
      setGraph(res.graph)
      setGraphWarnings(res.warnings || [])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erreur inattendue'
      setGraphError(msg)
      setGraph(null)
    } finally {
      setIsLoadingGraph(false)
    }
  }

  const onGraphFileSelected = (file: File) => {
    void loadGraph(() => uploadGraph(file))
  }

  const metaLine = useMemo(() => {
    if (!data) return null
    return `Délimiteur: "${data.meta.delimiter}" • Encodage: ${data.meta.encoding} • Lignes: ${data.meta.row_count} • Étapes: ${data.meta.step_count}`
  }, [data])

  return (
    <div className="min-h-screen bg-axa-surface">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6">
          <FileUpload disabled={isLoading} onFileSelected={onFileSelected} onLoadSample={onLoadSample} />

          <GraphUpload disabled={isLoadingGraph || isLoading} onFileSelected={onGraphFileSelected} />

          {isLoadingGraph ? <LoadingSpinner label="Chargement du graph SDLC…" /> : null}

          {graphError ? (
            <ErrorCallout
              message={`Erreur lors du chargement du graph: ${graphError}\n\nConseil: vérifiez que le fichier JSON contient bien les champs "nodes" et "edges".`}
            />
          ) : null}

          {graph ? (
            <>
              {graphWarnings.length > 0 ? (
                <div className="rounded-lg border border-axa-border bg-axa-surface px-4 py-3 text-xs text-axa-muted">
                  <div className="font-semibold text-axa-ink">Avertissements (graph)</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {graphWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <GraphVisualization graph={graph} />
            </>
          ) : null}

          {isLoading ? <LoadingSpinner label="Analyse du CSV et préparation des visualisations…" /> : null}

          {error ? (
            <ErrorCallout
              message={`${error}\n\nConseil: vérifiez l’en-tête (tool_name) et que toutes les valeurs de score sont numériques.`}
            />
          ) : null}

          {!data && !isLoading && !error ? (
            <div className="rounded-xl border border-axa-border bg-white p-6 text-sm text-axa-muted shadow-soft">
              <div className="font-semibold text-axa-ink">Prêt à visualiser votre matrice de scoring</div>
              <div className="mt-2">
                Importez un CSV de scoring (drag & drop ou sélection de fichier). Vous pouvez aussi charger l’exemple fourni.
              </div>
            </div>
          ) : null}

          {data ? (
            <div className="rounded-xl border border-axa-border bg-white p-4 shadow-soft">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-axa-ink">Données chargées</div>
                  <div className="text-xs text-axa-muted">{metaLine}</div>
                </div>
                <Tabs value={tab} onChange={setTab} />
              </div>

              {warnings.length > 0 ? (
                <div className="mt-4 rounded-lg border border-axa-border bg-axa-surface px-4 py-3 text-xs text-axa-muted">
                  <div className="font-semibold text-axa-ink">Avertissements</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {canRender ? (
            <>
              <FiltersPanel
                toolNames={data!.toolNames}
                stepNames={data!.stepNames}
                minScore={data!.minScore}
                maxScore={data!.maxScore}
                value={filters!}
                onChange={setFilters}
              />

              {tab === 'heatmap' ? (
                <HeatmapView
                  toolNames={data!.toolNames}
                  stepNames={data!.stepNames}
                  matrix={data!.matrix}
                  minScore={data!.minScore}
                  maxScore={data!.maxScore}
                  filters={filters!}
                />
              ) : null}

              {tab === 'radar' ? (
                <RadarView
                  toolNames={data!.toolNames}
                  stepNames={data!.stepNames}
                  matrix={data!.matrix}
                  minScore={data!.minScore}
                  maxScore={data!.maxScore}
                  filters={filters!}
                />
              ) : null}

              {tab === 'data' ? <DataPreviewTable preview={data!.preview} /> : null}
            </>
          ) : null}
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-10 text-xs text-axa-muted">
        IA SDLC Scoring Visualizer • Local-only demo app (FastAPI + React + Plotly)
      </footer>
    </div>
  )
}

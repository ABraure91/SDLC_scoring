import clsx from 'clsx'
import type { FiltersState } from '../types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export default function FiltersPanel(props: {
  toolNames: string[]
  stepNames: string[]
  minScore: number
  maxScore: number
  value: FiltersState
  onChange: (next: FiltersState) => void
  className?: string
}) {
  const { toolNames, stepNames, minScore, maxScore, value, onChange, className } = props

  const setSelectedTools = (tools: string[]) => onChange({ ...value, selectedTools: uniq(tools) })
  const setSelectedSteps = (steps: string[]) => onChange({ ...value, selectedSteps: uniq(steps) })

  const setRange = (min: number, max: number) => {
    const a = clamp(min, minScore, maxScore)
    const b = clamp(max, minScore, maxScore)
    if (a <= b) {
      onChange({ ...value, scoreMin: a, scoreMax: b })
    } else {
      onChange({ ...value, scoreMin: b, scoreMax: a })
    }
  }

  const reset = () =>
    onChange({
      ...value,
      selectedTools: [...toolNames],
      selectedSteps: [...stepNames],
      scoreMin: minScore,
      scoreMax: maxScore,
      radarMaxTools: Math.min(6, toolNames.length),
      radarFocusTool: null
    })

  const allToolsSelected = value.selectedTools.length === toolNames.length
  const allStepsSelected = value.selectedSteps.length === stepNames.length

  return (
    <div className={clsx('rounded-xl border border-axa-border bg-axa-card p-5 shadow-soft', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold">Filtres</div>
          <div className="mt-1 text-sm text-axa-muted">Affinez l’affichage par outil, étape et plage de score.</div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-axa-border bg-white px-3 py-2 text-sm font-medium hover:bg-axa-surface"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-axa-border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Outils</div>
            <div className="text-xs text-axa-muted">{value.selectedTools.length}/{toolNames.length}</div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedTools([...toolNames])}
              className={clsx(
                'rounded-md px-2 py-1 text-xs font-medium',
                allToolsSelected ? 'bg-axa-lightblue text-axa-blue' : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
              )}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => setSelectedTools([])}
              className="rounded-md bg-axa-surface px-2 py-1 text-xs font-medium text-axa-ink hover:bg-axa-lightblue/50"
            >
              Aucun
            </button>
          </div>

          <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-2">
            {toolNames.map((t) => {
              const checked = value.selectedTools.includes(t)
              return (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTools([...value.selectedTools, t])
                      else setSelectedTools(value.selectedTools.filter((x) => x !== t))
                    }}
                    className="h-4 w-4 accent-[#E60000]"
                  />
                  <span className="truncate" title={t}>{t}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-axa-border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Étapes SDLC</div>
            <div className="text-xs text-axa-muted">{value.selectedSteps.length}/{stepNames.length}</div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedSteps([...stepNames])}
              className={clsx(
                'rounded-md px-2 py-1 text-xs font-medium',
                allStepsSelected ? 'bg-axa-lightblue text-axa-blue' : 'bg-axa-surface text-axa-ink hover:bg-axa-lightblue/50'
              )}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => setSelectedSteps([])}
              className="rounded-md bg-axa-surface px-2 py-1 text-xs font-medium text-axa-ink hover:bg-axa-lightblue/50"
            >
              Aucun
            </button>
          </div>

          <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-2">
            {stepNames.map((s) => {
              const checked = value.selectedSteps.includes(s)
              return (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedSteps([...value.selectedSteps, s])
                      else setSelectedSteps(value.selectedSteps.filter((x) => x !== s))
                    }}
                    className="h-4 w-4 accent-[#E60000]"
                  />
                  <span className="truncate" title={s}>{s}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-axa-border bg-white p-4">
          <div className="text-sm font-semibold">Plage de score</div>
          <div className="mt-1 text-xs text-axa-muted">
            Min/Max détectés: {minScore} → {maxScore}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs text-axa-muted">
              Min
              <input
                type="number"
                value={value.scoreMin}
                min={minScore}
                max={value.scoreMax}
                step="any"
                onChange={(e) => setRange(Number(e.target.value), value.scoreMax)}
                className="mt-1 w-full rounded-md border border-axa-border px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-axa-muted">
              Max
              <input
                type="number"
                value={value.scoreMax}
                min={value.scoreMin}
                max={maxScore}
                step="any"
                onChange={(e) => setRange(value.scoreMin, Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-axa-border px-2 py-1 text-sm"
              />
            </label>
          </div>

          <div className="mt-3">
            <div className="relative h-8">
              <input
                type="range"
                min={minScore}
                max={maxScore}
                value={value.scoreMin}
                step="any"
                onChange={(e) => setRange(Number(e.target.value), value.scoreMax)}
                className="absolute inset-x-0 top-3 h-1 w-full appearance-none bg-axa-border accent-[#E60000]"
              />
              <input
                type="range"
                min={minScore}
                max={maxScore}
                value={value.scoreMax}
                step="any"
                onChange={(e) => setRange(value.scoreMin, Number(e.target.value))}
                className="absolute inset-x-0 top-3 h-1 w-full appearance-none bg-axa-border accent-[#E60000]"
              />
            </div>
          </div>

          <div className="mt-4 border-t border-axa-border pt-4">
            <div className="text-sm font-semibold">Radar</div>

            <label className="mt-2 block text-xs text-axa-muted">
              Nombre max d’outils affichés
              <input
                type="number"
                value={value.radarMaxTools}
                min={1}
                max={Math.max(1, toolNames.length)}
                onChange={(e) =>
                  onChange({
                    ...value,
                    radarMaxTools: clamp(Number(e.target.value), 1, Math.max(1, toolNames.length))
                  })
                }
                className="mt-1 w-full rounded-md border border-axa-border px-2 py-1 text-sm"
              />
            </label>

            <label className="mt-3 block text-xs text-axa-muted">
              Focus (optionnel)
              <select
                value={value.radarFocusTool ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    radarFocusTool: e.target.value ? e.target.value : null
                  })
                }
                className="mt-1 w-full rounded-md border border-axa-border px-2 py-1 text-sm"
              >
                <option value="">Aucun</option>
                {toolNames.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2 text-xs text-axa-muted">
              Astuce: vous pouvez aussi cliquer sur la légende du graphe Plotly pour masquer/afficher un outil.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

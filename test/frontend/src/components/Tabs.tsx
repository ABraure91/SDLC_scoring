import clsx from 'clsx'

export type TabKey = 'heatmap' | 'radar' | 'data'

export default function Tabs(props: { value: TabKey; onChange: (v: TabKey) => void }) {
  const { value, onChange } = props
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'heatmap', label: 'Heatmap' },
    { key: 'radar', label: 'Radar' },
    { key: 'data', label: 'Données' }
  ]

  return (
    <div className="inline-flex rounded-lg border border-axa-border bg-white p-1 shadow-soft">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={clsx(
            'rounded-md px-3 py-2 text-sm font-medium transition',
            value === t.key ? 'bg-axa-navy text-white' : 'text-axa-ink hover:bg-axa-surface'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

import type { PreviewTable } from '../types'

export default function DataPreviewTable(props: { preview: PreviewTable }) {
  const { preview } = props
  return (
    <div className="rounded-xl border border-axa-border bg-axa-card p-5 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-base font-semibold">Aperçu des données</div>
        <div className="text-xs text-axa-muted">Premières lignes (lecture côté backend)</div>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-axa-border bg-axa-surface">
              {preview.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-axa-ink">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, idx) => (
              <tr key={idx} className="border-b border-axa-border/70 last:border-b-0">
                {preview.columns.map((c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-2 text-axa-ink/90">
                    {row[c] === null || row[c] === undefined || row[c] === '' ? (
                      <span className="text-axa-muted">—</span>
                    ) : (
                      String(row[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

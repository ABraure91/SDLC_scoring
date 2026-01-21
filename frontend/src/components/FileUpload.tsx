import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import clsx from 'clsx'

export default function FileUpload(props: {
  disabled?: boolean
  onFileSelected: (file: File) => void
  onLoadSample: () => void
}) {
  const { disabled, onFileSelected, onLoadSample } = props

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]!)
      }
    },
    [onFileSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    accept: { 'text/csv': ['.csv'] }
  })

  return (
    <div className="rounded-xl border border-axa-border bg-axa-card p-5 shadow-soft">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold">Importer un CSV</div>
          <div className="mt-1 text-sm text-axa-muted">
            Format attendu: première colonne <span className="font-mono">tool_name</span>, puis une colonne par étape SDLC.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            disabled={disabled}
            className={clsx(
              'rounded-md border border-axa-border bg-white px-3 py-2 text-sm font-medium text-axa-ink',
              'hover:bg-axa-surface disabled:opacity-50'
            )}
          >
            Charger un exemple
          </button>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={clsx(
          'mt-4 cursor-pointer rounded-lg border-2 border-dashed px-6 py-8 text-center transition',
          isDragActive ? 'border-axa-blue bg-axa-lightblue/40' : 'border-axa-border bg-axa-surface',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="text-sm font-medium">
          {isDragActive ? 'Déposez le fichier ici…' : 'Glissez-déposez un fichier CSV ici, ou cliquez pour sélectionner'}
        </div>
        <div className="mt-1 text-xs text-axa-muted">.csv uniquement</div>
      </div>
    </div>
  )
}

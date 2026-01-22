import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import clsx from 'clsx'

export default function GraphUpload(props: {
  disabled?: boolean
  onFileSelected: (file: File) => void
}) {
  const { disabled, onFileSelected } = props

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
    accept: { 'application/json': ['.json'] }
  })

  return (
    <div className="rounded-xl border border-axa-border bg-axa-card p-5 shadow-soft">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold">Importer un graph SDLC (optionnel)</div>
          <div className="mt-1 text-sm text-axa-muted">
            Format attendu: fichier JSON avec <span className="font-mono">nodes</span> et <span className="font-mono">edges</span>.
          </div>
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
          {isDragActive ? 'Déposez le fichier ici…' : 'Glissez-déposez un fichier JSON ici, ou cliquez pour sélectionner'}
        </div>
        <div className="mt-1 text-xs text-axa-muted">.json uniquement</div>
      </div>
    </div>
  )
}

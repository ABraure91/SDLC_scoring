import clsx from 'clsx'

export default function LoadingSpinner(props: { label?: string; className?: string }) {
  const { label = 'Chargement…', className } = props
  return (
    <div className={clsx('flex items-center gap-3 text-axa-muted', className)}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-axa-border border-t-axa-blue" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

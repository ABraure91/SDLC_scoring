import clsx from 'clsx'

export default function ErrorCallout(props: { title?: string; message: string; className?: string }) {
  const { title = 'Erreur', message, className } = props
  return (
    <div className={clsx('rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900', className)}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 whitespace-pre-wrap">{message}</div>
    </div>
  )
}

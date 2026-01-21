export default function Header() {
  return (
    <header className="bg-axa-navy text-white">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">IA SDLC Scoring Visualizer</h1>
          <p className="text-sm text-white/85">
            Visualisez et comparez le scoring d’outils IA à travers les étapes de votre SDLC, à partir d’un simple fichier CSV.
          </p>
        </div>
      </div>
    </header>
  )
}

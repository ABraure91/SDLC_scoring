import type { SDLCGraph } from '../types'

export type LevelFilter = 'all' | 0 | 1 | 2

/**
 * Crée un mapping des noms d'étapes vers leurs niveaux dans le graph
 */
export function createStepLevelMap(graph: SDLCGraph | null): Map<string, number> {
  const stepLevelMap = new Map<string, number>()
  
  if (!graph) {
    return stepLevelMap
  }

  graph.nodes.forEach((node) => {
    stepLevelMap.set(node.label, node.level)
  })

  return stepLevelMap
}

/**
 * Filtre les noms d'étapes selon le niveau sélectionné
 */
export function filterStepsByLevel(
  stepNames: string[],
  levelFilter: LevelFilter,
  stepLevelMap: Map<string, number>
): string[] {
  if (levelFilter === 'all' || stepLevelMap.size === 0) {
    return stepNames
  }

  return stepNames.filter((stepName) => {
    const level = stepLevelMap.get(stepName)
    return level === levelFilter
  })
}

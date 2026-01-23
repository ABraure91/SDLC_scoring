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

/**
 * Trouve toutes les branches (nœuds de niveau 0) dans le graph
 */
export function getBranches(graph: SDLCGraph | null): Array<{ id: string; label: string }> {
  if (!graph) {
    return []
  }

  return graph.nodes
    .filter((node) => node.level === 0)
    .map((node) => ({ id: node.id, label: node.label }))
}

/**
 * Trouve tous les descendants d'une branche en suivant les edges de décomposition
 */
export function getBranchDescendants(
  graph: SDLCGraph,
  branchId: string
): Set<string> {
  const descendants = new Set<string>([branchId])
  const decompositionEdges = graph.edges.filter((e) => e.edge_type === 'decomposition')

  // Fonction récursive pour trouver tous les descendants
  const findDescendants = (nodeId: string) => {
    // Trouver tous les enfants directs (edges où dst = nodeId)
    const children = decompositionEdges
      .filter((e) => e.dst === nodeId)
      .map((e) => e.src)

    children.forEach((childId) => {
      if (!descendants.has(childId)) {
        descendants.add(childId)
        findDescendants(childId)
      }
    })
  }

  findDescendants(branchId)
  return descendants
}

/**
 * Crée un mapping des labels d'étapes vers les IDs de branches auxquelles elles appartiennent
 */
export function createStepToBranchMap(graph: SDLCGraph | null): Map<string, Set<string>> {
  const stepToBranches = new Map<string, Set<string>>()

  if (!graph) {
    return stepToBranches
  }

  const branches = getBranches(graph)

  branches.forEach((branch) => {
    const descendants = getBranchDescendants(graph, branch.id)
    descendants.forEach((nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (node) {
        if (!stepToBranches.has(node.label)) {
          stepToBranches.set(node.label, new Set())
        }
        stepToBranches.get(node.label)!.add(branch.id)
      }
    })
  })

  return stepToBranches
}

/**
 * Filtre les noms d'étapes selon la branche sélectionnée
 */
export function filterStepsByBranch(
  stepNames: string[],
  selectedBranchId: string | null,
  stepToBranchMap: Map<string, Set<string>>
): string[] {
  if (!selectedBranchId || stepToBranchMap.size === 0) {
    return stepNames
  }

  return stepNames.filter((stepName) => {
    const branches = stepToBranchMap.get(stepName)
    return branches?.has(selectedBranchId) ?? false
  })
}

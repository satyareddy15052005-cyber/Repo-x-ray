import type { FileId, DependencyEdge } from '../../types/domain';

export interface AdjacencyMaps {
  outgoing: Map<FileId, Set<FileId>>; // file -> files it imports (dependencies)
  incoming: Map<FileId, Set<FileId>>; // file -> files that import it (dependents)
}

export function buildAdjacencyMaps(
  allNodeIds: FileId[],
  edges: DependencyEdge[]
): AdjacencyMaps {
  const outgoing = new Map<FileId, Set<FileId>>();
  const incoming = new Map<FileId, Set<FileId>>();

  for (const id of allNodeIds) {
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  }

  for (const edge of edges) {
    if (!outgoing.has(edge.sourceFileId)) {
      outgoing.set(edge.sourceFileId, new Set());
    }
    outgoing.get(edge.sourceFileId)!.add(edge.targetFileId);

    if (!incoming.has(edge.targetFileId)) {
      incoming.set(edge.targetFileId, new Set());
    }
    incoming.get(edge.targetFileId)!.add(edge.sourceFileId);
  }

  return { outgoing, incoming };
}

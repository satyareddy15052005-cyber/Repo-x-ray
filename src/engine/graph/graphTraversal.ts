import type { FileId } from '../../types/domain';

export interface TraversalResult {
  direct: FileId[];
  transitive: FileId[];
  all: FileId[];
  depthMap: Map<FileId, number>;
}

/**
 * Traverses reachable nodes in a directed graph using iterative BFS (handles cycles safely).
 * @param startFileIds initial node(s)
 * @param adjacencyMap outgoing for dependencies, incoming for dependents (impact)
 * @param maxDepth optional limit
 */
export function traverseGraph(
  startFileIds: FileId[],
  adjacencyMap: Map<FileId, Set<FileId>>,
  maxDepth = Infinity
): TraversalResult {
  const visited = new Set<FileId>(startFileIds);
  const depthMap = new Map<FileId, number>();
  const direct: FileId[] = [];
  const transitive: FileId[] = [];

  // Queue of [fileId, depth]
  const queue: Array<[FileId, number]> = [];

  for (const startId of startFileIds) {
    const neighbors = adjacencyMap.get(startId) || new Set();
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        depthMap.set(n, 1);
        direct.push(n);
        queue.push([n, 1]);
      }
    }
  }

  while (queue.length > 0) {
    const [current, depth] = queue.shift()!;
    if (depth >= maxDepth) continue;

    const neighbors = adjacencyMap.get(current) || new Set();
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        depthMap.set(n, depth + 1);
        transitive.push(n);
        queue.push([n, depth + 1]);
      }
    }
  }

  return {
    direct,
    transitive,
    all: [...direct, ...transitive],
    depthMap,
  };
}

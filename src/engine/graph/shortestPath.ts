import type { FileId } from '../../types/domain';

/**
 * Finds the shortest directed path from startId to targetId using BFS.
 * Returns an array of FileIds representing the path, or null if unreachable.
 */
export function findShortestPath(
  startId: FileId,
  targetId: FileId,
  outgoingOrEdges: Map<FileId, Set<FileId>> | Array<{ sourceFileId: string; targetFileId: string }>
): FileId[] | null {
  if (startId === targetId) return [startId];

  let outgoingMap: Map<FileId, Set<FileId>>;
  if (outgoingOrEdges instanceof Map) {
    outgoingMap = outgoingOrEdges;
  } else {
    outgoingMap = new Map();
    for (const edge of outgoingOrEdges) {
      let set = outgoingMap.get(edge.sourceFileId);
      if (!set) {
        set = new Set();
        outgoingMap.set(edge.sourceFileId, set);
      }
      set.add(edge.targetFileId);
    }
  }

  const visited = new Set<FileId>([startId]);
  const parent = new Map<FileId, FileId>();
  const queue: FileId[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === targetId) {
      // Reconstruct path
      const path: FileId[] = [];
      let step: FileId | undefined = targetId;
      while (step) {
        path.unshift(step);
        step = parent.get(step);
      }
      return path;
    }

    const neighbors = outgoingMap.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return null;
}

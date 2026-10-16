import type { CycleGroup, FileId } from '../../types/domain';

/**
 * Tarjan's strongly connected components algorithm for directed graphs.
 * Finds all cyclic components (groups of 2 or more files, or self-cycles).
 */
export function findStronglyConnectedComponents(
  nodeIds: FileId[],
  outgoingAdjacency: Map<FileId, Set<FileId>>,
  filePathMap: Map<FileId, string>
): CycleGroup[] {
  let index = 0;
  const indices = new Map<FileId, number>();
  const lowlinks = new Map<FileId, number>();
  const onStack = new Set<FileId>();
  const stack: FileId[] = [];
  const sccs: FileId[][] = [];

  function strongConnect(v: FileId) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const neighbors = outgoingAdjacency.get(v) || new Set();
    for (const w of neighbors) {
      if (!indices.has(w)) {
        // Successor w has not yet been visited; recurse on it
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        // Successor w is in stack and hence in the current SCC
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (lowlinks.get(v) === indices.get(v)) {
      const scc: FileId[] = [];
      let w: FileId;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      // Only consider it a cyclic component if it has > 1 node, or a self-loop
      if (scc.length > 1) {
        sccs.push(scc);
      } else if (scc.length === 1) {
        const single = scc[0];
        if (outgoingAdjacency.get(single)?.has(single)) {
          sccs.push(scc);
        }
      }
    }
  }

  for (const node of nodeIds) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return sccs.map((fileIds, idx) => ({
    id: `cycle-group-${idx + 1}`,
    fileIds,
    paths: fileIds.map(f => filePathMap.get(f) || f),
  }));
}

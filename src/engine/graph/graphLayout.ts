import type { FileId, DependencyEdge } from '../../types/domain';

export type LayoutDirection = 'LR' | 'TB' | 'RL' | 'BT';

export interface LayoutNodePosition {
  x: number;
  y: number;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export function computeHierarchicalLayout(
  nodeIds: FileId[],
  edges: DependencyEdge[],
  direction: LayoutDirection = 'LR',
  dimensions: NodeDimensions = { width: 220, height: 74 }
): Map<FileId, LayoutNodePosition> {
  const positions = new Map<FileId, LayoutNodePosition>();
  if (nodeIds.length === 0) return positions;

  // Build incoming & outgoing maps
  const inDegree = new Map<FileId, number>();
  const outgoing = new Map<FileId, FileId[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    outgoing.set(id, []);
  }

  for (const edge of edges) {
    if (inDegree.has(edge.targetFileId)) {
      inDegree.set(edge.targetFileId, (inDegree.get(edge.targetFileId) || 0) + 1);
    }
    if (outgoing.has(edge.sourceFileId)) {
      outgoing.get(edge.sourceFileId)!.push(edge.targetFileId);
    }
  }

  // Assign layers via longest path / BFS
  const layerMap = new Map<FileId, number>();
  const queue: Array<{ id: FileId; layer: number }> = [];

  // Roots have inDegree 0
  for (const id of nodeIds) {
    if ((inDegree.get(id) || 0) === 0) {
      queue.push({ id, layer: 0 });
      layerMap.set(id, 0);
    }
  }

  // If cyclic or all inDegree > 0, pick first node as layer 0
  if (queue.length === 0 && nodeIds.length > 0) {
    queue.push({ id: nodeIds[0], layer: 0 });
    layerMap.set(nodeIds[0], 0);
  }

  const visited = new Set<FileId>();
  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    visited.add(id);

    const neighbors = outgoing.get(id) || [];
    for (const n of neighbors) {
      const nextLayer = layer + 1;
      const currentLayer = layerMap.get(n) || 0;
      if (nextLayer > currentLayer) {
        layerMap.set(n, nextLayer);
      }
      if (!visited.has(n)) {
        visited.add(n);
        queue.push({ id: n, layer: nextLayer });
      }
    }
  }

  // For any unvisited nodes (disconnected components)
  let maxAssignedLayer = 0;
  for (const l of layerMap.values()) {
    if (l > maxAssignedLayer) maxAssignedLayer = l;
  }
  for (const id of nodeIds) {
    if (!layerMap.has(id)) {
      layerMap.set(id, 0);
    }
  }

  // Group nodes by layer
  const layers = new Map<number, FileId[]>();
  for (const [id, layer] of layerMap.entries()) {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(id);
  }

  const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

  // Spacing parameters
  const xGap = direction === 'LR' || direction === 'RL' ? 120 : 60;
  const yGap = direction === 'LR' || direction === 'RL' ? 40 : 100;

  const colWidth = dimensions.width + xGap;
  const rowHeight = dimensions.height + yGap;

  for (let lIdx = 0; lIdx < sortedLayerIndices.length; lIdx++) {
    const layer = sortedLayerIndices[lIdx];
    const nodesInLayer = layers.get(layer)!;

    for (let rIdx = 0; rIdx < nodesInLayer.length; rIdx++) {
      const id = nodesInLayer[rIdx];

      let x = 0;
      let y = 0;

      if (direction === 'LR') {
        x = lIdx * colWidth + 50;
        y = rIdx * rowHeight + 50;
      } else if (direction === 'RL') {
        x = (sortedLayerIndices.length - 1 - lIdx) * colWidth + 50;
        y = rIdx * rowHeight + 50;
      } else if (direction === 'TB') {
        x = rIdx * colWidth + 50;
        y = lIdx * rowHeight + 50;
      } else if (direction === 'BT') {
        x = rIdx * colWidth + 50;
        y = (sortedLayerIndices.length - 1 - lIdx) * rowHeight + 50;
      }

      positions.set(id, { x, y });
    }
  }

  return positions;
}

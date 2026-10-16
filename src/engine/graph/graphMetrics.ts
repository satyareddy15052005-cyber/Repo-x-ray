import type {
  SourceFileRecord,
  DependencyEdge,
  FileId,
} from '../../types/domain';
import { isLikelyEntryPoint } from '../import/fileClassification';

export interface GraphMetricsResult {
  fanInMap: Map<FileId, number>;
  fanOutMap: Map<FileId, number>;
  topFanIn: Array<{ fileId: FileId; path: string; count: number }>;
  topFanOut: Array<{ fileId: FileId; path: string; count: number }>;
  potentiallyUnreferencedFileIds: FileId[];
  languageBreakdown: Record<string, number>;
}

export function computeGraphMetrics(
  files: SourceFileRecord[],
  edges: DependencyEdge[]
): GraphMetricsResult {
  const fanInMap = new Map<FileId, number>();
  const fanOutMap = new Map<FileId, number>();
  const filePathMap = new Map<FileId, string>();
  const languageBreakdown: Record<string, number> = {};

  for (const file of files) {
    fanInMap.set(file.id, 0);
    fanOutMap.set(file.id, 0);
    filePathMap.set(file.id, file.relativePath);

    const ext = file.extension || 'other';
    languageBreakdown[ext] = (languageBreakdown[ext] || 0) + 1;
  }

  for (const edge of edges) {
    fanOutMap.set(edge.sourceFileId, (fanOutMap.get(edge.sourceFileId) || 0) + 1);
    fanInMap.set(edge.targetFileId, (fanInMap.get(edge.targetFileId) || 0) + 1);
  }

  // Top fan-in
  const topFanIn = files
    .map(f => ({
      fileId: f.id,
      path: f.relativePath,
      count: fanInMap.get(f.id) || 0,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Top fan-out
  const topFanOut = files
    .map(f => ({
      fileId: f.id,
      path: f.relativePath,
      count: fanOutMap.get(f.id) || 0,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Potentially unreferenced: fan-in === 0, excluding entry points
  const potentiallyUnreferencedFileIds = files
    .filter(f => {
      const incoming = fanInMap.get(f.id) || 0;
      if (incoming > 0) return false;
      if (f.isEntryPoint || isLikelyEntryPoint(f.relativePath)) return false;
      return true;
    })
    .map(f => f.id);

  return {
    fanInMap,
    fanOutMap,
    topFanIn,
    topFanOut,
    potentiallyUnreferencedFileIds,
    languageBreakdown,
  };
}

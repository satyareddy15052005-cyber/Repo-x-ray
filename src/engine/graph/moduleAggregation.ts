import type {
  ModuleRecord,
  ModuleId,
  FileId,
  DependencyEdge,
  SourceFileRecord,
  ProjectId,
} from '../../types/domain';

export interface InterModuleEdge {
  id: string;
  sourceModuleId: ModuleId;
  targetModuleId: ModuleId;
  weight: number;
  fileEdgeIds: string[];
}

export interface ModuleAggregationResult {
  modules: ModuleRecord[];
  moduleEdges: InterModuleEdge[];
  fileToModuleMap: Map<FileId, ModuleId>;
}

export function aggregateModules(
  projectId: ProjectId,
  files: SourceFileRecord[],
  edges: DependencyEdge[]
): ModuleAggregationResult {
  const moduleMap = new Map<string, { id: ModuleId; name: string; relativePath: string; fileIds: FileId[] }>();
  const fileToModuleMap = new Map<FileId, ModuleId>();

  // Determine module for each file
  for (const file of files) {
    const parts = file.relativePath.split('/');
    let modulePath = '';
    let moduleName = '';

    if (parts.length <= 1) {
      modulePath = '.';
      moduleName = 'root';
    } else if (parts[0] === 'src' && parts.length > 2) {
      // e.g. src/components/Header.tsx -> src/components
      modulePath = `${parts[0]}/${parts[1]}`;
      moduleName = parts[1];
    } else {
      // e.g. components/Header.tsx -> components
      modulePath = parts[0];
      moduleName = parts[0];
    }

    let existing = moduleMap.get(modulePath);
    if (!existing) {
      const id = `mod-${modulePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      existing = {
        id,
        name: moduleName,
        relativePath: modulePath,
        fileIds: [],
      };
      moduleMap.set(modulePath, existing);
    }

    existing.fileIds.push(file.id);
    fileToModuleMap.set(file.id, existing.id);
  }

  // Aggregate edges
  const interEdgesMap = new Map<string, { source: ModuleId; target: ModuleId; count: number; edgeIds: string[] }>();
  const internalCounts = new Map<ModuleId, number>();
  const incomingCrossCounts = new Map<ModuleId, number>();
  const outgoingCrossCounts = new Map<ModuleId, number>();

  for (const edge of edges) {
    const srcMod = fileToModuleMap.get(edge.sourceFileId);
    const tgtMod = fileToModuleMap.get(edge.targetFileId);

    if (!srcMod || !tgtMod) continue;

    if (srcMod === tgtMod) {
      internalCounts.set(srcMod, (internalCounts.get(srcMod) || 0) + 1);
    } else {
      outgoingCrossCounts.set(srcMod, (outgoingCrossCounts.get(srcMod) || 0) + 1);
      incomingCrossCounts.set(tgtMod, (incomingCrossCounts.get(tgtMod) || 0) + 1);

      const key = `${srcMod}->${tgtMod}`;
      let inter = interEdgesMap.get(key);
      if (!inter) {
        inter = { source: srcMod, target: tgtMod, count: 0, edgeIds: [] };
        interEdgesMap.set(key, inter);
      }
      inter.count++;
      inter.edgeIds.push(edge.id);
    }
  }

  const modules: ModuleRecord[] = Array.from(moduleMap.values()).map(m => ({
    id: m.id,
    projectId,
    name: m.name,
    relativePath: m.relativePath,
    fileIds: m.fileIds,
    internalEdgeCount: internalCounts.get(m.id) || 0,
    incomingCrossEdgeCount: incomingCrossCounts.get(m.id) || 0,
    outgoingCrossEdgeCount: outgoingCrossCounts.get(m.id) || 0,
  }));

  const moduleEdges: InterModuleEdge[] = Array.from(interEdgesMap.values()).map((e, idx) => ({
    id: `mod-edge-${idx + 1}`,
    sourceModuleId: e.source,
    targetModuleId: e.target,
    weight: e.count,
    fileEdgeIds: e.edgeIds,
  }));

  return {
    modules,
    moduleEdges,
    fileToModuleMap,
  };
}

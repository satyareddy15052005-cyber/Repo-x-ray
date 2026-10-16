import type {
  SourceFileRecord,
  DependencyEdge,
  CycleGroup,
} from '../../types/domain';
import type { FullProjectData } from '../../storage/projectRepository';

export interface ComparisonDiff {
  projectA: { id: string; name: string; analyzedAt: string };
  projectB: { id: string; name: string; analyzedAt: string };
  addedFiles: SourceFileRecord[];
  removedFiles: SourceFileRecord[];
  modifiedFiles: Array<{
    fileA: SourceFileRecord;
    fileB: SourceFileRecord;
    relativePath: string;
    lineDelta: number;
    byteDelta: number;
  }>;
  unchangedFilesCount: number;
  addedEdges: DependencyEdge[];
  removedEdges: DependencyEdge[];
  newCycles: CycleGroup[];
  resolvedCycles: CycleGroup[];
  externalPackagesDiff: {
    added: string[];
    removed: string[];
  };
}

export function compareProjects(
  dataA: FullProjectData,
  dataB: FullProjectData
): ComparisonDiff {
  const mapA = new Map<string, SourceFileRecord>();
  for (const f of dataA.files) {
    mapA.set(f.relativePath, f);
  }

  const mapB = new Map<string, SourceFileRecord>();
  for (const f of dataB.files) {
    mapB.set(f.relativePath, f);
  }

  const addedFiles: SourceFileRecord[] = [];
  const removedFiles: SourceFileRecord[] = [];
  const modifiedFiles: ComparisonDiff['modifiedFiles'] = [];
  let unchangedFilesCount = 0;

  for (const [pathB, fileB] of mapB.entries()) {
    const fileA = mapA.get(pathB);
    if (!fileA) {
      addedFiles.push(fileB);
    } else {
      if (fileA.lineCount !== fileB.lineCount || fileA.byteSize !== fileB.byteSize) {
        modifiedFiles.push({
          fileA,
          fileB,
          relativePath: pathB,
          lineDelta: fileB.lineCount - fileA.lineCount,
          byteDelta: fileB.byteSize - fileA.byteSize,
        });
      } else {
        unchangedFilesCount++;
      }
    }
  }

  for (const [pathA, fileA] of mapA.entries()) {
    if (!mapB.has(pathA)) {
      removedFiles.push(fileA);
    }
  }

  // Edge changes comparison by resolved paths
  const edgePathKeyA = new Set<string>();
  const idPathA = new Map(dataA.files.map((f: SourceFileRecord) => [f.id, f.relativePath]));
  for (const e of dataA.edges) {
    const src = idPathA.get(e.sourceFileId);
    const tgt = idPathA.get(e.targetFileId);
    if (src && tgt) {
      edgePathKeyA.add(`${src} -> ${tgt}`);
    }
  }

  const edgePathKeyB = new Set<string>();
  const idPathB = new Map(dataB.files.map((f: SourceFileRecord) => [f.id, f.relativePath]));
  for (const e of dataB.edges) {
    const src = idPathB.get(e.sourceFileId);
    const tgt = idPathB.get(e.targetFileId);
    if (src && tgt) {
      edgePathKeyB.add(`${src} -> ${tgt}`);
    }
  }

  const addedEdges = dataB.edges.filter((e: DependencyEdge) => {
    const src = idPathB.get(e.sourceFileId);
    const tgt = idPathB.get(e.targetFileId);
    return src && tgt && !edgePathKeyA.has(`${src} -> ${tgt}`);
  });

  const removedEdges = dataA.edges.filter((e: DependencyEdge) => {
    const src = idPathA.get(e.sourceFileId);
    const tgt = idPathA.get(e.targetFileId);
    return src && tgt && !edgePathKeyB.has(`${src} -> ${tgt}`);
  });

  // Cycle comparison
  const cycleSignatureA = new Set<string>();
  for (const c of dataA.summary.circularGroups) {
    cycleSignatureA.add(c.paths.slice().sort().join('|'));
  }

  const cycleSignatureB = new Set<string>();
  for (const c of dataB.summary.circularGroups) {
    cycleSignatureB.add(c.paths.slice().sort().join('|'));
  }

  const newCycles = dataB.summary.circularGroups.filter(
    (c: CycleGroup) => !cycleSignatureA.has(c.paths.slice().sort().join('|'))
  );
  const resolvedCycles = dataA.summary.circularGroups.filter(
    (c: CycleGroup) => !cycleSignatureB.has(c.paths.slice().sort().join('|'))
  );

  // External package diff
  const setExtA = new Set(dataA.summary.externalPackages);
  const setExtB = new Set(dataB.summary.externalPackages);

  const addedExt = dataB.summary.externalPackages.filter((p: string) => !setExtA.has(p));
  const removedExt = dataA.summary.externalPackages.filter((p: string) => !setExtB.has(p));

  return {
    projectA: {
      id: dataA.project.id,
      name: dataA.project.name,
      analyzedAt: dataA.project.analyzedAt,
    },
    projectB: {
      id: dataB.project.id,
      name: dataB.project.name,
      analyzedAt: dataB.project.analyzedAt,
    },
    addedFiles,
    removedFiles,
    modifiedFiles,
    unchangedFilesCount,
    addedEdges,
    removedEdges,
    newCycles,
    resolvedCycles,
    externalPackagesDiff: {
      added: addedExt,
      removed: removedExt,
    },
  };
}

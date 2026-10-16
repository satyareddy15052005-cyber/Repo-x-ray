import type {
  ProjectRecord,
  SourceFileRecord,
  ImportReference,
  DependencyEdge,
  AnalysisSummary,
  AnalysisIssue,
  StoredFileContent,
  ProjectId,
  FunctionRecord,
  ProjectHealthSnapshot,
} from '../../types/domain';
import { isAnalyzableFile, getFileExtension, isLikelyEntryPoint } from '../import/fileClassification';
import { parseSourceFile } from '../parser/parseSourceFile';
import { parsePackageJson } from '../parser/parsePackageJson';
import { parseTsConfig } from '../parser/parseProjectConfig';
import { resolveImport } from '../resolver/resolveImport';
import { buildAdjacencyMaps } from '../graph/adjacency';
import { findStronglyConnectedComponents } from '../graph/stronglyConnected';
import { computeGraphMetrics } from '../graph/graphMetrics';
import { aggregateModules } from '../graph/moduleAggregation';
import { detectProjectType } from './detectProjectType';
import { computeHierarchicalLayout } from '../graph/graphLayout';
import { projectRepository } from '../../storage/projectRepository';
import { graphPositionsStorage } from '../../services/graphPositionsStorage';

// Phase 2 Engine Imports
import { extractFunctionsFromSource, type RawCallSite, type ImportedSymbolBinding } from '../functions/extractFunctions';
import { resolveFunctionCalls } from '../functions/resolveFunctionCalls';
import { detectDeadCode } from '../deadcode/detectDeadCode';
import { calculateComplexity } from '../complexity/calculateComplexity';
import { evaluateArchitectureRules, DEFAULT_ARCHITECTURE_RULES } from '../rules/ruleEngine';
import { detectDuplicates } from '../duplicates/detectDuplicates';
import { calculateChangeRisk } from '../risk/calculateChangeRisk';

export type PipelineStage =
  | 'discovering'
  | 'reading'
  | 'parsing'
  | 'resolving'
  | 'graph'
  | 'metrics'
  | 'insights'
  | 'persisting'
  | 'complete';

export interface ProgressCallback {
  (stage: PipelineStage, current: number, total: number, message: string): void;
}

export interface RawFile {
  relativePath: string;
  content: string;
  byteSize: number;
}

export interface PipelineOptions {
  projectName: string;
  sourceType: 'directory' | 'zip' | 'sample' | 'portable';
  files: RawFile[];
  persistSourceCode?: boolean;
  onProgress?: ProgressCallback;
  checkCancelled?: () => boolean;
  targetProjectId?: string;
}

export async function runAnalysisPipeline(options: PipelineOptions): Promise<ProjectId> {
  const startTime = performance.now();
  const {
    projectName,
    sourceType,
    files,
    persistSourceCode = true,
    onProgress,
    checkCancelled,
  } = options;

  function report(stage: PipelineStage, current: number, total: number, message: string) {
    if (checkCancelled && checkCancelled()) {
      throw new Error('Analysis was cancelled by user.');
    }
    if (onProgress) {
      onProgress(stage, current, total, message);
    }
  }

  report('discovering', 0, files.length, 'Cataloging files and discovering project structure...');

  const projectId = options.targetProjectId || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const allPathsSet = new Set<string>(files.map(f => f.relativePath));

  // 1. Locate config files
  report('reading', 0, files.length, 'Locating package manifests and TypeScript configurations...');
  const pkgFile = files.find(f => f.relativePath === 'package.json');
  const pkgJson = pkgFile ? parsePackageJson(pkgFile.content) : null;

  const tsConfigFile = files.find(f => f.relativePath === 'tsconfig.json' || f.relativePath === 'jsconfig.json');
  const tsConfig = tsConfigFile ? parseTsConfig(tsConfigFile.content) : null;

  // 2. Filter analyzable source files
  const analyzableFiles = files.filter(f => isAnalyzableFile(f.relativePath));
  report('parsing', 0, analyzableFiles.length, `Parsing syntax trees for ${analyzableFiles.length} source files...`);

  const sourceFiles: SourceFileRecord[] = [];
  const issues: AnalysisIssue[] = [];
  const fileContentsToStore: StoredFileContent[] = [];
  const pathToIdMap = new Map<string, string>();
  const idToPathMap = new Map<string, string>();

  // Intermediate parsed results
  const parsedMap = new Map<string, ReturnType<typeof parseSourceFile>>();

  for (let i = 0; i < analyzableFiles.length; i++) {
    if (i % 10 === 0) {
      report('parsing', i + 1, analyzableFiles.length, `Parsing syntax in ${analyzableFiles[i].relativePath} (${i + 1}/${analyzableFiles.length})...`);
      await new Promise(r => setTimeout(r, 0));
    }

    const raw = analyzableFiles[i];
    const fileId = `file-${i + 1}-${Math.random().toString(36).substring(2, 6)}`;
    pathToIdMap.set(raw.relativePath, fileId);
    idToPathMap.set(fileId, raw.relativePath);

    const parseResult = parseSourceFile(raw.content, raw.relativePath);
    parsedMap.set(raw.relativePath, parseResult);

    if (parseResult.parseError) {
      issues.push({
        id: `issue-parse-${i + 1}`,
        projectId,
        fileId,
        relativePath: raw.relativePath,
        stage: 'parser',
        severity: parseResult.parseStatus === 'failed' ? 'error' : 'warning',
        message: parseResult.parseError.message,
        line: parseResult.parseError.line,
        column: parseResult.parseError.column,
      });
    }

    sourceFiles.push({
      id: fileId,
      projectId,
      relativePath: raw.relativePath,
      filename: raw.relativePath.split('/').pop() || raw.relativePath,
      extension: getFileExtension(raw.relativePath),
      byteSize: raw.byteSize,
      lineCount: parseResult.lineCount,
      parseStatus: parseResult.parseStatus,
      exports: parseResult.exports,
      isEntryPoint: isLikelyEntryPoint(raw.relativePath),
    });

    if (persistSourceCode) {
      fileContentsToStore.push({
        id: `${projectId}:${raw.relativePath}`,
        projectId,
        relativePath: raw.relativePath,
        content: raw.content,
      });
    }
  }

  // Create fast map of source codes for analysis engines
  const fileContentsMap = new Map<string, string>();
  for (const raw of analyzableFiles) {
    fileContentsMap.set(raw.relativePath, raw.content);
  }

  // Phase 2: Feature 1 - Extract Functions and Method Declarations
  report('parsing', analyzableFiles.length, analyzableFiles.length, 'Extracting function declarations and call sites...');
  const rawFunctionsList: FunctionRecord[] = [];
  const fileCallsMap = new Map<string, RawCallSite[]>();
  const fileImportedSymbolsMap = new Map<string, ImportedSymbolBinding[]>();

  for (const file of sourceFiles) {
    const code = fileContentsMap.get(file.relativePath);
    if (!code) continue;
    const res = extractFunctionsFromSource(code, file.relativePath, file.id, projectId);
    rawFunctionsList.push(...res.functions);
    if (res.calls.length > 0) {
      fileCallsMap.set(file.id, res.calls);
    }
    if (res.importedSymbols.length > 0) {
      fileImportedSymbolsMap.set(file.id, res.importedSymbols);
    }
  }

  // 3. Resolving imports
  report('resolving', 0, sourceFiles.length, 'Resolving module import references and external packages...');
  const dependencies: ImportReference[] = [];
  const externalPackagesSet = new Set<string>();
  const fileImportsMap = new Map<string, ImportReference[]>();

  for (let i = 0; i < sourceFiles.length; i++) {
    if (i % 25 === 0) {
      report('resolving', i + 1, sourceFiles.length, `Resolving module imports (${i + 1}/${sourceFiles.length})...`);
      await new Promise(r => setTimeout(r, 0));
    }

    const file = sourceFiles[i];
    const parsed = parsedMap.get(file.relativePath);
    if (!parsed) continue;

    const currentFileDeps: ImportReference[] = [];

    for (let rIdx = 0; rIdx < parsed.imports.length; rIdx++) {
      const imp = parsed.imports[rIdx];
      const resolved = resolveImport(file.relativePath, imp.specifier, allPathsSet, tsConfig);

      let targetFileId: string | undefined;
      if (resolved.targetPath) {
        targetFileId = pathToIdMap.get(resolved.targetPath);
      }

      if (resolved.externalPackage) {
        externalPackagesSet.add(resolved.externalPackage);
      } else if (resolved.resolutionStatus === 'unresolved' && !imp.specifier.startsWith('.')) {
        externalPackagesSet.add(imp.specifier.split('/')[0]);
      }

      const depRecord: ImportReference = {
        id: `dep-${file.id}-${rIdx + 1}`,
        projectId,
        sourceFileId: file.id,
        targetFileId,
        specifier: imp.specifier,
        kind: imp.kind,
        resolutionStatus: resolved.resolutionStatus,
        externalPackage: resolved.externalPackage,
        line: imp.line,
        column: imp.column,
      };

      dependencies.push(depRecord);
      currentFileDeps.push(depRecord);
    }

    fileImportsMap.set(file.id, currentFileDeps);
  }

  // Resolve Function-level call edges across internal files
  const { edges: functionCalls, updatedFunctions: functions } = resolveFunctionCalls(
    projectId,
    rawFunctionsList,
    fileCallsMap,
    fileImportsMap,
    fileImportedSymbolsMap
  );

  // 4. Constructing Dependency Graph Edges (deduplicated file-to-file relationships)
  report('graph', 0, dependencies.length, 'Constructing dependency graph edges...');
  const edgeMap = new Map<string, { sourceFileId: string; targetFileId: string; depIds: string[] }>();

  for (const dep of dependencies) {
    if (dep.resolutionStatus === 'internal' && dep.targetFileId && dep.sourceFileId !== dep.targetFileId) {
      const edgeKey = `${dep.sourceFileId}->${dep.targetFileId}`;
      let existing = edgeMap.get(edgeKey);
      if (!existing) {
        existing = {
          sourceFileId: dep.sourceFileId,
          targetFileId: dep.targetFileId,
          depIds: [],
        };
        edgeMap.set(edgeKey, existing);
      }
      existing.depIds.push(dep.id);
    }
  }

  const edges: DependencyEdge[] = Array.from(edgeMap.values()).map((e, idx) => ({
    id: `edge-${idx + 1}`,
    projectId,
    sourceFileId: e.sourceFileId,
    targetFileId: e.targetFileId,
    importReferenceIds: e.depIds,
  }));

  // 5. Calculate Adjacency and Cycle Detection (Tarjan's SCC)
  report('metrics', 0, 100, "Detecting circular dependency groups using Tarjan's algorithm...");
  const allNodeIds = sourceFiles.map(f => f.id);
  const { outgoing } = buildAdjacencyMaps(allNodeIds, edges);
  const circularGroups = findStronglyConnectedComponents(allNodeIds, outgoing, idToPathMap);

  // Mark cycle edges
  const cycleNodeSet = new Set<string>();
  for (const group of circularGroups) {
    for (const fId of group.fileIds) {
      cycleNodeSet.add(fId);
    }
  }

  for (const edge of edges) {
    if (cycleNodeSet.has(edge.sourceFileId) && cycleNodeSet.has(edge.targetFileId)) {
      edge.isCycle = true;
    }
  }

  // 6. Compute Graph Metrics & Unreferenced files
  report('metrics', 50, 100, 'Computing fan-in/fan-out and structural architecture metrics...');
  const {
    topFanIn,
    topFanOut,
    potentiallyUnreferencedFileIds,
    languageBreakdown,
  } = computeGraphMetrics(sourceFiles, edges);

  // 7. Aggregate Modules
  const { modules, fileToModuleMap } = aggregateModules(projectId, sourceFiles, edges);
  for (const file of sourceFiles) {
    file.moduleId = fileToModuleMap.get(file.id);
  }

  // 8. Phase 2 Advanced Analysis Engines (Dead code, Complexity, Rules, Duplicates, Change Risk)
  report('insights', 0, 100, 'Running dead-code analysis and AST reference audits...');
  const deadCodeFindings = detectDeadCode(projectId, sourceFiles, dependencies, edges, fileContentsMap);

  report('insights', 30, 100, 'Measuring cyclomatic complexity and nesting depth...');
  const {
    functionComplexities,
    fileComplexities,
    summary: complexitySummary,
  } = calculateComplexity(projectId, sourceFiles, edges, fileContentsMap);

  report('insights', 60, 100, 'Evaluating architectural boundary rules...');
  // Load any existing custom rules or initialize with default rules
  const existingRules = await projectRepository.getArchitectureRules(projectId);
  const activeRules = existingRules.length > 0 ? existingRules : DEFAULT_ARCHITECTURE_RULES;
  // If first time, persist default rules for this project
  if (existingRules.length === 0) {
    for (const r of DEFAULT_ARCHITECTURE_RULES) {
      await projectRepository.saveArchitectureRule({ ...r, projectId });
    }
  }
  const ruleViolations = evaluateArchitectureRules(
    projectId,
    activeRules,
    sourceFiles,
    edges,
    dependencies,
    circularGroups
  );

  report('insights', 80, 100, 'Detecting structural duplicate code blocks...');
  const duplicateGroups = detectDuplicates(projectId, sourceFiles, fileContentsMap);

  // Calculate Change Risk for files to identify high-risk hotspots
  let highRiskCount = 0;
  for (const file of sourceFiles) {
    const risk = calculateChangeRisk(
      file.id,
      'implementation',
      sourceFiles,
      edges,
      functions,
      functionCalls,
      circularGroups,
      fileComplexities,
      ruleViolations
    );
    if (risk && risk.riskTier === 'high') {
      highRiskCount++;
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  let existingProject: ProjectRecord | undefined;
  if (options.targetProjectId) {
    existingProject = await projectRepository.getProject(options.targetProjectId);
  }
  const currentAnalysisVersion = (existingProject?.analysisVersion || 0) + 1;

  const summary: AnalysisSummary = {
    projectId,
    indexedFiles: sourceFiles.length,
    totalImports: dependencies.length,
    internalEdges: edges.length,
    externalPackages: Array.from(externalPackagesSet).sort(),
    circularGroups,
    potentiallyUnreferencedFileIds,
    parseIssuesCount: issues.length,
    analysisDurationMs: durationMs,
    languageBreakdown,
    topFanIn,
    topFanOut,
    // Phase 2 metrics
    totalFunctionsCount: functions.length,
    totalFunctionCallsCount: functionCalls.length,
    deadCodeFindingsCount: deadCodeFindings.length,
    ruleViolationsCount: ruleViolations.length,
    duplicateGroupsCount: duplicateGroups.length,
    avgCyclomaticComplexity: complexitySummary.averageFunctionComplexity,
    highRiskFilesCount: highRiskCount,
  };

  const projectRecord: ProjectRecord = {
    id: projectId,
    name: projectName?.trim() || existingProject?.name || (pkgJson ? pkgJson.name : 'Analyzed Codebase'),
    sourceType: sourceType || existingProject?.sourceType || 'directory',
    createdAt: existingProject?.createdAt || new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    fileCount: sourceFiles.length,
    analysisVersion: currentAnalysisVersion,
    sourcePersisted: persistSourceCode,
    status: 'complete',
    projectType: detectProjectType(pkgJson, Array.from(allPathsSet)),
  };

  // Phase 2: Feature 9 - Create Project Health Snapshot
  const healthSnapshot: ProjectHealthSnapshot = {
    id: `snap-${projectId}-${Date.now()}`,
    projectId,
    timestamp: new Date().toISOString(),
    analysisVersion: currentAnalysisVersion,
    schemaVersion: 2,
    fileCount: sourceFiles.length,
    internalEdgeCount: edges.length,
    circularGroupCount: circularGroups.length,
    unresolvedImportsCount: dependencies.filter(d => d.resolutionStatus === 'unresolved').length,
    deadCodeCount: deadCodeFindings.length,
    ruleViolationsCount: ruleViolations.length,
    duplicateGroupCount: duplicateGroups.length,
    avgComplexity: complexitySummary.averageFunctionComplexity,
    highRiskFileCount: highRiskCount,
    summaryNote: `Analysis v${currentAnalysisVersion}: ${sourceFiles.length} files, ${functions.length} functions, ${edges.length} edges`,
  };

  // 9. Persisting everything in IndexedDB
  report('persisting', 90, 100, 'Saving complete analysis and architectural insights in IndexedDB...');
  await projectRepository.saveAnalysis({
    project: projectRecord,
    files: sourceFiles,
    dependencies,
    edges,
    modules,
    summary,
    issues,
    fileContents: fileContentsToStore,
    // Phase 2 data
    functions,
    functionCalls,
    deadCodeFindings,
    ruleViolations,
    duplicateGroups,
    functionComplexities,
    fileComplexities,
    healthSnapshot,
  });

  // 10. Compute and cache initial dependency graph positions so the graph is stable
  report('persisting', 96, 100, 'Generating stable dependency graph layout...');
  graphPositionsStorage.clearStoredPositions(projectId);
  const layout = computeHierarchicalLayout(
    sourceFiles.map(f => f.id),
    edges,
    'LR'
  );
  const posRecord: Record<string, { x: number; y: number }> = {};
  layout.forEach((pos, fId) => {
    posRecord[fId] = pos;
  });
  graphPositionsStorage.saveStoredPositions(projectId, posRecord);

  // Notify listeners that this project was analyzed/re-analyzed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('project-reanalyzed', {
        detail: { projectId, projectName: projectRecord.name },
      })
    );
  }

  report('complete', 100, 100, 'Analysis complete!');
  return projectId;
}

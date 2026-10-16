import Dexie, { type Table } from 'dexie';
import type {
  ProjectRecord,
  SourceFileRecord,
  ImportReference,
  DependencyEdge,
  ModuleRecord,
  AnalysisSummary,
  AnalysisIssue,
  StoredFileContent,
  AppSettings,
  FunctionRecord,
  FunctionCallEdge,
  DeadCodeFinding,
  ArchitectureRule,
  RuleViolation,
  DuplicateGroup,
  FunctionComplexity,
  FileComplexity,
  ProjectHealthSnapshot,
} from '../types/domain';

export class RepoXRayDB extends Dexie {
  projects!: Table<ProjectRecord, string>;
  files!: Table<SourceFileRecord, string>;
  dependencies!: Table<ImportReference, string>;
  edges!: Table<DependencyEdge, string>;
  modules!: Table<ModuleRecord, string>;
  summaries!: Table<AnalysisSummary, string>;
  issues!: Table<AnalysisIssue, string>;
  fileContents!: Table<StoredFileContent, string>;
  settings!: Table<AppSettings, string>;

  // Phase 2 Tables
  functions!: Table<FunctionRecord, string>;
  functionCalls!: Table<FunctionCallEdge, string>;
  deadCodeFindings!: Table<DeadCodeFinding, string>;
  architectureRules!: Table<ArchitectureRule, string>;
  ruleViolations!: Table<RuleViolation, string>;
  duplicateGroups!: Table<DuplicateGroup, string>;
  functionComplexities!: Table<FunctionComplexity, string>;
  fileComplexities!: Table<FileComplexity, string>;
  healthSnapshots!: Table<ProjectHealthSnapshot, string>;

  constructor() {
    super('RepoXRayDatabase');

    this.version(1).stores({
      projects: 'id, name, createdAt, analyzedAt, status',
      files: 'id, projectId, relativePath, extension, moduleId, parseStatus',
      dependencies: 'id, projectId, sourceFileId, targetFileId, resolutionStatus, externalPackage',
      edges: 'id, projectId, sourceFileId, targetFileId, isCycle',
      modules: 'id, projectId, relativePath',
      summaries: 'projectId',
      issues: 'id, projectId, fileId, severity',
      fileContents: 'id, projectId, relativePath',
      settings: 'id',
    });

    this.version(2).stores({
      projects: 'id, name, createdAt, analyzedAt, status',
      files: 'id, projectId, relativePath, extension, moduleId, parseStatus',
      dependencies: 'id, projectId, sourceFileId, targetFileId, resolutionStatus, externalPackage',
      edges: 'id, projectId, sourceFileId, targetFileId, isCycle',
      modules: 'id, projectId, relativePath',
      summaries: 'projectId',
      issues: 'id, projectId, fileId, severity',
      fileContents: 'id, projectId, relativePath',
      settings: 'id',

      // Phase 2 stores
      functions: 'id, projectId, fileId, name, declarationType, isExported',
      functionCalls: 'id, projectId, sourceFunctionId, targetFunctionId, isCrossFile',
      deadCodeFindings: 'id, projectId, fileId, category, severity, confidence',
      architectureRules: 'id, projectId, enabled, category, severity',
      ruleViolations: 'id, projectId, ruleId, sourceFileId, targetFileId, severity',
      duplicateGroups: 'id, projectId, similarity',
      functionComplexities: 'id, projectId, fileId, name, cyclomaticComplexity',
      fileComplexities: 'id, projectId, fileId, cyclomaticComplexity',
      healthSnapshots: 'id, projectId, timestamp',
    });
  }
}

export const db = new RepoXRayDB();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'global-settings',
  defaultLayout: 'LR',
  persistSourceCode: true,
  maxFileSizeKb: 1024,
  density: 'comfortable',
  customIgnorePatterns: [],
  maxInitialRenderNodes: 250,
};

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get('global-settings');
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return settings;
}

export async function updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...newSettings };
  await db.settings.put(updated);
  return updated;
}

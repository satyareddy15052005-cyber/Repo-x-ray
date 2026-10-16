export type ProjectId = string;
export type FileId = string;
export type ModuleId = string;

export type ImportKind =
  | 'static'
  | 'dynamic-literal'
  | 'commonjs'
  | 're-export'
  | 'type-only';

export type ResolutionStatus =
  | 'internal'
  | 'external'
  | 'unresolved'
  | 'dynamic-unknown';

export interface ProjectRecord {
  id: ProjectId;
  name: string;
  sourceType: 'directory' | 'zip' | 'sample' | 'portable';
  createdAt: string;
  analyzedAt: string;
  fileCount: number;
  analysisVersion: number;
  sourcePersisted: boolean;
  status: 'complete' | 'incomplete';
  projectType?: string;
  description?: string;
}

export interface ExtractedExport {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'default' | 'all';
  line?: number;
}

export interface SourceFileRecord {
  id: FileId;
  projectId: ProjectId;
  relativePath: string;
  filename: string;
  extension: string;
  byteSize: number;
  lineCount: number;
  contentHash?: string;
  moduleId?: ModuleId;
  parseStatus: 'success' | 'partial' | 'failed';
  exports?: ExtractedExport[];
  isEntryPoint?: boolean;
}

export interface ImportReference {
  id: string;
  projectId: ProjectId;
  sourceFileId: FileId;
  targetFileId?: FileId;
  specifier: string;
  kind: ImportKind;
  resolutionStatus: ResolutionStatus;
  externalPackage?: string;
  line?: number;
  column?: number;
}

export interface DependencyEdge {
  id: string;
  projectId: ProjectId;
  sourceFileId: FileId;
  targetFileId: FileId;
  importReferenceIds: string[];
  isCycle?: boolean;
}

export interface ModuleRecord {
  id: ModuleId;
  projectId: ProjectId;
  name: string;
  relativePath: string;
  fileIds: FileId[];
  internalEdgeCount?: number;
  incomingCrossEdgeCount?: number;
  outgoingCrossEdgeCount?: number;
}

export interface AnalysisIssue {
  id: string;
  projectId: ProjectId;
  fileId?: FileId;
  relativePath?: string;
  stage: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  line?: number;
  column?: number;
}

export interface CycleGroup {
  id: string;
  fileIds: FileId[];
  paths: string[];
}

export interface AnalysisSummary {
  projectId: ProjectId;
  indexedFiles: number;
  totalImports: number;
  internalEdges: number;
  externalPackages: string[];
  circularGroups: CycleGroup[];
  potentiallyUnreferencedFileIds: FileId[];
  parseIssuesCount: number;
  analysisDurationMs: number;
  languageBreakdown: Record<string, number>;
  topFanIn: Array<{ fileId: FileId; path: string; count: number }>;
  topFanOut: Array<{ fileId: FileId; path: string; count: number }>;
  // Phase 2 metrics summary
  totalFunctionsCount?: number;
  totalFunctionCallsCount?: number;
  deadCodeFindingsCount?: number;
  ruleViolationsCount?: number;
  duplicateGroupsCount?: number;
  avgCyclomaticComplexity?: number;
  highRiskFilesCount?: number;
}

export interface StoredFileContent {
  id: string; // `${projectId}:${relativePath}`
  projectId: ProjectId;
  relativePath: string;
  content: string;
}

export interface AppSettings {
  id: string;
  defaultLayout: 'LR' | 'TB' | 'RL' | 'BT';
  persistSourceCode: boolean;
  maxFileSizeKb: number;
  density: 'comfortable' | 'compact';
  customIgnorePatterns: string[];
  maxInitialRenderNodes: number;
}

// -------------------------------------------------------------
// Phase 2: Feature 1 - Function Call Graph Domain Types
// -------------------------------------------------------------
export type FunctionDeclarationType =
  | 'function'
  | 'arrow'
  | 'method'
  | 'class-method'
  | 'expression';

export interface FunctionRecord {
  id: string; // `${fileId}#${name}#${lineStart}`
  projectId: ProjectId;
  fileId: FileId;
  relativePath: string;
  name: string;
  declarationType: FunctionDeclarationType;
  lineStart: number;
  lineEnd: number;
  columnStart?: number;
  isExported: boolean;
  isDefaultExport?: boolean;
  parametersCount: number;
  callerCount?: number;
  calleeCount?: number;
}

export interface FunctionCallEdge {
  id: string;
  projectId: ProjectId;
  sourceFunctionId: string;
  targetFunctionId: string;
  callLine?: number;
  isCrossFile: boolean;
  confidence: 'static-direct' | 'imported-resolved' | 'ambiguous';
  callExpression?: string;
}

// -------------------------------------------------------------
// Phase 2: Feature 2 - Dead Code Detection Types
// -------------------------------------------------------------
export type DeadCodeCategory =
  | 'unused-export'
  | 'unused-function'
  | 'unused-variable'
  | 'unused-class'
  | 'unused-import'
  | 'unreferenced-file'
  | 'unreachable-code';

export type DeadCodeConfidence = 'confirmed' | 'potential' | 'unverified';

export interface DeadCodeFinding {
  id: string;
  projectId: ProjectId;
  fileId: FileId;
  relativePath: string;
  symbolName: string;
  declarationType: string;
  category: DeadCodeCategory;
  confidence: DeadCodeConfidence;
  severity: 'low' | 'medium' | 'high';
  line: number;
  reason: string;
}

// -------------------------------------------------------------
// Phase 2: Feature 3 - Architecture Rule Checker Types
// -------------------------------------------------------------
export type RuleType =
  | 'forbidden-import'
  | 'allowed-layers-only'
  | 'no-cycles-in-layer'
  | 'dependency-direction';

export type RuleSeverity = 'error' | 'warning' | 'info';

export interface ArchitectureRule {
  id: string;
  projectId?: ProjectId; // If empty or 'global', applies to all projects
  name: string;
  description: string;
  type: RuleType;
  category: string;
  severity: RuleSeverity;
  sourcePattern: string; // e.g. "src/components/**", "src/features/**"
  targetPattern?: string; // e.g. "src/storage/**", "src/services/**"
  enabled: boolean;
  isCustom?: boolean;
}

export interface RuleViolation {
  id: string;
  projectId: ProjectId;
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  sourceFileId: FileId;
  sourcePath: string;
  targetFileId?: FileId;
  targetPath?: string;
  importSpecifier?: string;
  line?: number;
  explanation: string;
}

// -------------------------------------------------------------
// Phase 2: Feature 4 - Change Risk Analyzer Types
// -------------------------------------------------------------
export type ChangeType =
  | 'implementation'
  | 'signature'
  | 'exported-symbol'
  | 'remove'
  | 'dependencies';

export interface ChangeRiskFactor {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface ChangeRiskAssessment {
  fileId: FileId;
  functionId?: string;
  functionName?: string;
  relativePath: string;
  overallScore: number;
  riskTier: 'low' | 'medium' | 'high';
  changeType: ChangeType;
  directDependentsCount: number;
  transitiveDependentsCount: number;
  affectedFilesCount: number;
  affectedFunctionsCount: number;
  circularLoopParticipation: boolean;
  cyclomaticComplexity: number;
  ruleViolationsCount: number;
  factors: ChangeRiskFactor[];
  affectedFileIds: FileId[];
}

// -------------------------------------------------------------
// Phase 2: Feature 5 - Duplicate Code Detector Types
// -------------------------------------------------------------
export interface DuplicateOccurrence {
  fileId: FileId;
  relativePath: string;
  startLine: number;
  endLine: number;
  codeSnippet: string;
}

export interface DuplicateGroup {
  id: string;
  projectId: ProjectId;
  tokenCount: number;
  lineCount: number;
  similarity: number;
  occurrences: DuplicateOccurrence[];
  fingerprint: string;
}

// -------------------------------------------------------------
// Phase 2: Feature 8 - Code Complexity Analysis Types
// -------------------------------------------------------------
export type ComplexityTier = 'low' | 'moderate' | 'high' | 'very-high';

export interface FunctionComplexity {
  id: string;
  projectId: ProjectId;
  fileId: FileId;
  relativePath: string;
  name: string;
  lineStart: number;
  lineEnd: number;
  lineCount: number;
  cyclomaticComplexity: number;
  parametersCount: number;
  maxNestingDepth: number;
  branchesCount: number;
  loopsCount: number;
  returnsCount: number;
  callsCount: number;
  tier: ComplexityTier;
}

export interface FileComplexity {
  id: string;
  projectId: ProjectId;
  fileId: FileId;
  relativePath: string;
  lineCount: number;
  totalFunctions: number;
  avgCyclomaticComplexity: number;
  maxCyclomaticComplexity: number;
  fanIn: number;
  fanOut: number;
  tier: ComplexityTier;
}

export interface ComplexitySummary {
  averageFunctionComplexity: number;
  maxFunctionComplexity: number;
  highComplexityFunctionsCount: number;
  totalAnalyzedFunctions: number;
  distribution: {
    low: number;
    moderate: number;
    high: number;
    veryHigh: number;
  };
}

// -------------------------------------------------------------
// Phase 2: Feature 9 - Project Health History Snapshot Types
// -------------------------------------------------------------
export interface ProjectHealthSnapshot {
  id: string;
  projectId: ProjectId;
  timestamp: string;
  analysisVersion: number;
  schemaVersion: number;
  fileCount: number;
  internalEdgeCount: number;
  circularGroupCount: number;
  unresolvedImportsCount: number;
  deadCodeCount: number;
  ruleViolationsCount: number;
  duplicateGroupCount: number;
  avgComplexity: number;
  highRiskFileCount: number;
  summaryNote?: string;
}

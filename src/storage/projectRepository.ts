import { db } from './database';
import type {
  ProjectRecord,
  SourceFileRecord,
  ImportReference,
  DependencyEdge,
  ModuleRecord,
  AnalysisSummary,
  AnalysisIssue,
  StoredFileContent,
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

export interface FullProjectData {
  project: ProjectRecord;
  files: SourceFileRecord[];
  dependencies: ImportReference[];
  edges: DependencyEdge[];
  modules: ModuleRecord[];
  summary: AnalysisSummary;
  issues: AnalysisIssue[];
  // Phase 2 entities (optional when reading legacy analyses)
  functions?: FunctionRecord[];
  functionCalls?: FunctionCallEdge[];
  deadCodeFindings?: DeadCodeFinding[];
  ruleViolations?: RuleViolation[];
  duplicateGroups?: DuplicateGroup[];
  functionComplexities?: FunctionComplexity[];
  fileComplexities?: FileComplexity[];
  healthSnapshots?: ProjectHealthSnapshot[];
}

export const projectRepository = {
  async getAllProjects(): Promise<ProjectRecord[]> {
    return await db.projects.orderBy('analyzedAt').reverse().toArray();
  },

  async getProject(id: string): Promise<ProjectRecord | undefined> {
    return await db.projects.get(id);
  },

  async getFullProject(id: string): Promise<FullProjectData | null> {
    const project = await db.projects.get(id);
    if (!project) return null;

    const [
      files,
      dependencies,
      edges,
      modules,
      summary,
      issues,
      functions,
      functionCalls,
      deadCodeFindings,
      ruleViolations,
      duplicateGroups,
      functionComplexities,
      fileComplexities,
      healthSnapshots,
    ] = await Promise.all([
      db.files.where('projectId').equals(id).toArray(),
      db.dependencies.where('projectId').equals(id).toArray(),
      db.edges.where('projectId').equals(id).toArray(),
      db.modules.where('projectId').equals(id).toArray(),
      db.summaries.get(id),
      db.issues.where('projectId').equals(id).toArray(),
      db.functions.where('projectId').equals(id).toArray().catch(() => []),
      db.functionCalls.where('projectId').equals(id).toArray().catch(() => []),
      db.deadCodeFindings.where('projectId').equals(id).toArray().catch(() => []),
      db.ruleViolations.where('projectId').equals(id).toArray().catch(() => []),
      db.duplicateGroups.where('projectId').equals(id).toArray().catch(() => []),
      db.functionComplexities.where('projectId').equals(id).toArray().catch(() => []),
      db.fileComplexities.where('projectId').equals(id).toArray().catch(() => []),
      db.healthSnapshots.where('projectId').equals(id).sortBy('timestamp').catch(() => []),
    ]);

    if (!summary) return null;

    return {
      project,
      files,
      dependencies,
      edges,
      modules,
      summary,
      issues,
      functions,
      functionCalls,
      deadCodeFindings,
      ruleViolations,
      duplicateGroups,
      functionComplexities,
      fileComplexities,
      healthSnapshots,
    };
  },

  async saveAnalysis(data: {
    project: ProjectRecord;
    files: SourceFileRecord[];
    dependencies: ImportReference[];
    edges: DependencyEdge[];
    modules: ModuleRecord[];
    summary: AnalysisSummary;
    issues: AnalysisIssue[];
    fileContents?: StoredFileContent[];
    // Phase 2 data
    functions?: FunctionRecord[];
    functionCalls?: FunctionCallEdge[];
    deadCodeFindings?: DeadCodeFinding[];
    ruleViolations?: RuleViolation[];
    duplicateGroups?: DuplicateGroup[];
    functionComplexities?: FunctionComplexity[];
    fileComplexities?: FileComplexity[];
    healthSnapshot?: ProjectHealthSnapshot;
    healthSnapshots?: ProjectHealthSnapshot[];
  }): Promise<void> {
    await db.transaction(
      'rw',
      [
        db.projects,
        db.files,
        db.dependencies,
        db.edges,
        db.modules,
        db.summaries,
        db.issues,
        db.fileContents,
        db.functions,
        db.functionCalls,
        db.deadCodeFindings,
        db.ruleViolations,
        db.duplicateGroups,
        db.functionComplexities,
        db.fileComplexities,
        db.healthSnapshots,
      ],
      async () => {
        // Clear old analysis records for this project if re-analyzing
        // (Do NOT delete historical health snapshots; they belong to project history!)
        await Promise.all([
          db.files.where('projectId').equals(data.project.id).delete(),
          db.dependencies.where('projectId').equals(data.project.id).delete(),
          db.edges.where('projectId').equals(data.project.id).delete(),
          db.modules.where('projectId').equals(data.project.id).delete(),
          db.issues.where('projectId').equals(data.project.id).delete(),
          db.fileContents.where('projectId').equals(data.project.id).delete(),
          db.functions.where('projectId').equals(data.project.id).delete(),
          db.functionCalls.where('projectId').equals(data.project.id).delete(),
          db.deadCodeFindings.where('projectId').equals(data.project.id).delete(),
          db.ruleViolations.where('projectId').equals(data.project.id).delete(),
          db.duplicateGroups.where('projectId').equals(data.project.id).delete(),
          db.functionComplexities.where('projectId').equals(data.project.id).delete(),
          db.fileComplexities.where('projectId').equals(data.project.id).delete(),
        ]);

        await db.projects.put(data.project);

        // Chunked bulk inserts
        async function chunkedBulkPut<T>(table: any, items: T[], chunkSize = 1000) {
          for (let i = 0; i < items.length; i += chunkSize) {
            await table.bulkPut(items.slice(i, i + chunkSize));
          }
        }

        if (data.files.length) await chunkedBulkPut(db.files, data.files);
        if (data.dependencies.length) await chunkedBulkPut(db.dependencies, data.dependencies);
        if (data.edges.length) await chunkedBulkPut(db.edges, data.edges);
        if (data.modules.length) await chunkedBulkPut(db.modules, data.modules);
        await db.summaries.put(data.summary);
        if (data.issues.length) await chunkedBulkPut(db.issues, data.issues);
        if (data.fileContents && data.fileContents.length) {
          await chunkedBulkPut(db.fileContents, data.fileContents, 500);
        }

        // Phase 2 tables
        if (data.functions && data.functions.length) await chunkedBulkPut(db.functions, data.functions);
        if (data.functionCalls && data.functionCalls.length) await chunkedBulkPut(db.functionCalls, data.functionCalls);
        if (data.deadCodeFindings && data.deadCodeFindings.length) await chunkedBulkPut(db.deadCodeFindings, data.deadCodeFindings);
        if (data.ruleViolations && data.ruleViolations.length) await chunkedBulkPut(db.ruleViolations, data.ruleViolations);
        if (data.duplicateGroups && data.duplicateGroups.length) await chunkedBulkPut(db.duplicateGroups, data.duplicateGroups);
        if (data.functionComplexities && data.functionComplexities.length) await chunkedBulkPut(db.functionComplexities, data.functionComplexities);
        if (data.fileComplexities && data.fileComplexities.length) await chunkedBulkPut(db.fileComplexities, data.fileComplexities);
        if (data.healthSnapshots && data.healthSnapshots.length) {
          await chunkedBulkPut(db.healthSnapshots, data.healthSnapshots);
        } else if (data.healthSnapshot) {
          await db.healthSnapshots.put(data.healthSnapshot);
        }
      }
    );
  },

  async getFileContent(projectId: string, relativePath: string): Promise<string | null> {
    const record = await db.fileContents.get(`${projectId}:${relativePath}`);
    return record ? record.content : null;
  },

  async getAllFileContents(projectId: string): Promise<Record<string, string>> {
    const records = await db.fileContents.where('projectId').equals(projectId).toArray();
    const map: Record<string, string> = {};
    for (const r of records) {
      map[r.relativePath] = r.content;
    }
    return map;
  },

  // Functions queries
  async getFunctions(projectId: string): Promise<FunctionRecord[]> {
    return await db.functions.where('projectId').equals(projectId).toArray();
  },

  async getFunctionCalls(projectId: string): Promise<FunctionCallEdge[]> {
    return await db.functionCalls.where('projectId').equals(projectId).toArray();
  },

  // Dead Code queries
  async getDeadCodeFindings(projectId: string): Promise<DeadCodeFinding[]> {
    return await db.deadCodeFindings.where('projectId').equals(projectId).toArray();
  },

  // Architecture Rules queries
  async getArchitectureRules(projectId?: string): Promise<ArchitectureRule[]> {
    const all = await db.architectureRules.toArray();
    if (!projectId) return all;
    return all.filter(r => !r.projectId || r.projectId === projectId || r.projectId === 'global');
  },

  async saveArchitectureRule(rule: ArchitectureRule): Promise<void> {
    await db.architectureRules.put(rule);
  },

  async deleteArchitectureRule(ruleId: string): Promise<void> {
    await db.architectureRules.delete(ruleId);
  },

  async getRuleViolations(projectId: string): Promise<RuleViolation[]> {
    return await db.ruleViolations.where('projectId').equals(projectId).toArray();
  },

  // Duplicate Code queries
  async getDuplicateGroups(projectId: string): Promise<DuplicateGroup[]> {
    return await db.duplicateGroups.where('projectId').equals(projectId).toArray();
  },

  // Complexity queries
  async getComplexityData(projectId: string): Promise<{
    functions: FunctionComplexity[];
    files: FileComplexity[];
  }> {
    const [functions, files] = await Promise.all([
      db.functionComplexities.where('projectId').equals(projectId).toArray(),
      db.fileComplexities.where('projectId').equals(projectId).toArray(),
    ]);
    return { functions, files };
  },

  // Health History queries
  async getHealthSnapshots(projectId: string): Promise<ProjectHealthSnapshot[]> {
    return await db.healthSnapshots.where('projectId').equals(projectId).sortBy('timestamp');
  },

  async saveHealthSnapshot(snapshot: ProjectHealthSnapshot): Promise<void> {
    await db.healthSnapshots.put(snapshot);
  },

  async deleteHealthSnapshot(snapshotId: string): Promise<void> {
    await db.healthSnapshots.delete(snapshotId);
  },

  async clearHealthHistory(projectId: string): Promise<void> {
    await db.healthSnapshots.where('projectId').equals(projectId).delete();
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await db.transaction(
        'rw',
        [
          db.projects,
          db.files,
          db.dependencies,
          db.edges,
          db.modules,
          db.summaries,
          db.issues,
          db.fileContents,
          db.functions,
          db.functionCalls,
          db.deadCodeFindings,
          db.ruleViolations,
          db.duplicateGroups,
          db.functionComplexities,
          db.fileComplexities,
          db.healthSnapshots,
        ],
        async () => {
          await db.projects.delete(id);
          await db.files.where('projectId').equals(id).delete();
          await db.dependencies.where('projectId').equals(id).delete();
          await db.edges.where('projectId').equals(id).delete();
          await db.modules.where('projectId').equals(id).delete();
          await db.summaries.delete(id);
          await db.issues.where('projectId').equals(id).delete();
          await db.fileContents.where('projectId').equals(id).delete();
          await db.functions.where('projectId').equals(id).delete();
          await db.functionCalls.where('projectId').equals(id).delete();
          await db.deadCodeFindings.where('projectId').equals(id).delete();
          await db.ruleViolations.where('projectId').equals(id).delete();
          await db.duplicateGroups.where('projectId').equals(id).delete();
          await db.functionComplexities.where('projectId').equals(id).delete();
          await db.fileComplexities.where('projectId').equals(id).delete();
          await db.healthSnapshots.where('projectId').equals(id).delete();
        }
      );
    } catch {
      await Promise.allSettled([
        db.projects.delete(id),
        db.summaries.delete(id),
        db.files.where('projectId').equals(id).delete(),
        db.dependencies.where('projectId').equals(id).delete(),
        db.edges.where('projectId').equals(id).delete(),
        db.modules.where('projectId').equals(id).delete(),
        db.issues.where('projectId').equals(id).delete(),
        db.fileContents.where('projectId').equals(id).delete(),
        db.functions.where('projectId').equals(id).delete(),
        db.functionCalls.where('projectId').equals(id).delete(),
        db.deadCodeFindings.where('projectId').equals(id).delete(),
        db.ruleViolations.where('projectId').equals(id).delete(),
        db.duplicateGroups.where('projectId').equals(id).delete(),
        db.functionComplexities.where('projectId').equals(id).delete(),
        db.fileComplexities.where('projectId').equals(id).delete(),
        db.healthSnapshots.where('projectId').equals(id).delete(),
      ]);
    }
  },

  async clearAllData(): Promise<void> {
    await Promise.all([
      db.projects.clear(),
      db.files.clear(),
      db.dependencies.clear(),
      db.edges.clear(),
      db.modules.clear(),
      db.summaries.clear(),
      db.issues.clear(),
      db.fileContents.clear(),
      db.functions.clear(),
      db.functionCalls.clear(),
      db.deadCodeFindings.clear(),
      db.ruleViolations.clear(),
      db.duplicateGroups.clear(),
      db.functionComplexities.clear(),
      db.fileComplexities.clear(),
      db.healthSnapshots.clear(),
    ]);
  },
};

import type {
  SourceFileRecord,
  DependencyEdge,
  FunctionRecord,
  FunctionCallEdge,
  CycleGroup,
  FileComplexity,
  RuleViolation,
  ChangeType,
  ChangeRiskAssessment,
  ChangeRiskFactor,
  FileId,
} from '../../types/domain';

export function calculateChangeRisk(
  targetFileId: FileId,
  changeType: ChangeType,
  sourceFiles: SourceFileRecord[],
  edges: DependencyEdge[],
  functions: FunctionRecord[] = [],
  functionCalls: FunctionCallEdge[] = [],
  circularGroups: CycleGroup[] = [],
  fileComplexities: FileComplexity[] = [],
  ruleViolations: RuleViolation[] = [],
  targetFunctionId?: string
): ChangeRiskAssessment | null {
  const targetFile = sourceFiles.find(f => f.id === targetFileId);
  if (!targetFile) return null;

  const targetFunction = targetFunctionId ? functions.find(f => f.id === targetFunctionId) : undefined;

  // Direct incoming dependents (files that import targetFile)
  const directDependentIds = new Set<string>();
  for (const edge of edges) {
    if (edge.targetFileId === targetFileId) {
      directDependentIds.add(edge.sourceFileId);
    }
  }

  // Transitive dependents using BFS
  const visited = new Set<string>();
  const queue = Array.from(directDependentIds);
  for (const id of queue) visited.add(id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.targetFileId === current && !visited.has(edge.sourceFileId)) {
        visited.add(edge.sourceFileId);
        queue.push(edge.sourceFileId);
      }
    }
  }

  const directCount = directDependentIds.size;
  const transitiveCount = visited.size;

  // Affected functions: functions in target file or specific target function, and functions calling them
  const targetFnIds = new Set(
    targetFunction
      ? [targetFunction.id]
      : functions.filter(fn => fn.fileId === targetFileId).map(fn => fn.id)
  );
  const affectedFnIds = new Set<string>(targetFnIds);

  for (const call of functionCalls) {
    if (targetFnIds.has(call.targetFunctionId)) {
      affectedFnIds.add(call.sourceFunctionId);
    }
  }

  // Check circular loop participation
  const inCycle = circularGroups.some(g => g.fileIds.includes(targetFileId));

  // Complexity of target file
  const fileCplx = fileComplexities.find(c => c.fileId === targetFileId);
  const cyclomatic = fileCplx?.maxCyclomaticComplexity || 1;

  // Violations related to target file
  const violationsOnTarget = ruleViolations.filter(
    v => v.sourceFileId === targetFileId || v.targetFileId === targetFileId
  );

  // Deterministic risk factor scoring
  const factors: ChangeRiskFactor[] = [];

  // 1. Transitive Blast Radius (max 30 pts)
  const totalFiles = Math.max(1, sourceFiles.length);
  const blastRadiusRatio = transitiveCount / totalFiles;
  const blastRadiusScore = Math.min(30, Math.round(blastRadiusRatio * 60) + (transitiveCount > 0 ? 5 : 0));
  factors.push({
    name: 'Transitive Blast Radius',
    score: blastRadiusScore,
    maxScore: 30,
    description: `${transitiveCount} downstream file(s) (${Math.round(blastRadiusRatio * 100)}% of codebase) depend on this file.`,
  });

  // 2. Direct Dependents / Fan-in (max 20 pts)
  const fanInScore = Math.min(20, directCount * 4);
  factors.push({
    name: 'Direct Call Sites (Fan-In)',
    score: fanInScore,
    maxScore: 20,
    description: `${directCount} file(s) directly import this module.`,
  });

  // 3. Planned Change Type Severity (max 20 pts)
  let changeTypeScore = 5;
  let changeTypeDesc = 'Internal implementation change: public API contracts remain unchanged.';
  if (changeType === 'remove') {
    changeTypeScore = 20;
    changeTypeDesc = 'File/Function Removal: immediate breaking change to all callers.';
  } else if (changeType === 'signature') {
    changeTypeScore = 15;
    changeTypeDesc = 'Function Signature change: will require modifying argument call sites.';
  } else if (changeType === 'exported-symbol') {
    changeTypeScore = 12;
    changeTypeDesc = 'Exported Symbol modification: impacts all importing modules.';
  } else if (changeType === 'dependencies') {
    changeTypeScore = 8;
    changeTypeDesc = 'Module dependencies change: risk of introducing cycles or layer violations.';
  }
  factors.push({
    name: 'Change Type Impact',
    score: changeTypeScore,
    maxScore: 20,
    description: changeTypeDesc,
  });

  // 4. Circular Dependency Risk (max 15 pts)
  const cycleScore = inCycle ? 15 : 0;
  factors.push({
    name: 'Circular Dependency Participation',
    score: cycleScore,
    maxScore: 15,
    description: inCycle
      ? 'File is locked in a circular dependency loop (changes can cascade cyclically).'
      : 'File is not part of any circular loops.',
  });

  // 5. Code Complexity (max 10 pts)
  const complexityScore = Math.min(10, Math.floor(cyclomatic / 2));
  factors.push({
    name: 'Underlying Code Complexity',
    score: complexityScore,
    maxScore: 10,
    description: `Cyclomatic complexity is ${cyclomatic} (${fileCplx?.tier || 'low'}).`,
  });

  // 6. Architecture Violations (max 5 pts)
  const violationScore = Math.min(5, violationsOnTarget.length * 2);
  factors.push({
    name: 'Architecture Rule Violations',
    score: violationScore,
    maxScore: 5,
    description: `${violationsOnTarget.length} rule violation(s) currently recorded on this file.`,
  });

  const overallScore = Math.min(
    100,
    blastRadiusScore + fanInScore + changeTypeScore + cycleScore + complexityScore + violationScore
  );

  let riskTier: 'low' | 'medium' | 'high' = 'low';
  if (overallScore >= 60) riskTier = 'high';
  else if (overallScore >= 30) riskTier = 'medium';

  return {
    fileId: targetFileId,
    functionId: targetFunction?.id,
    functionName: targetFunction?.name,
    relativePath: targetFile.relativePath,
    overallScore,
    riskTier,
    changeType,
    directDependentsCount: directCount,
    transitiveDependentsCount: transitiveCount,
    affectedFilesCount: transitiveCount,
    affectedFunctionsCount: affectedFnIds.size,
    circularLoopParticipation: inCycle,
    cyclomaticComplexity: cyclomatic,
    ruleViolationsCount: violationsOnTarget.length,
    factors,
    affectedFileIds: Array.from(visited),
  };
}

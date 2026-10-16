import type {
  ArchitectureRule,
  RuleViolation,
  SourceFileRecord,
  DependencyEdge,
  ImportReference,
  CycleGroup,
  ProjectId,
} from '../../types/domain';

export const DEFAULT_ARCHITECTURE_RULES: ArchitectureRule[] = [
  {
    id: 'rule-ui-no-storage',
    name: 'UI Components Must Not Import Storage Directly',
    description: 'Presentation components should receive data via hooks/services, not direct database access.',
    type: 'forbidden-import',
    category: 'Layer Separation',
    severity: 'warning',
    sourcePattern: 'src/components/**',
    targetPattern: 'src/storage/**',
    enabled: true,
  },
  {
    id: 'rule-storage-no-ui',
    name: 'Storage Must Not Depend On UI Components',
    description: 'Data storage entities and database schemas must remain decoupled from presentation.',
    type: 'forbidden-import',
    category: 'Layer Separation',
    severity: 'error',
    sourcePattern: 'src/storage/**',
    targetPattern: 'src/components/**',
    enabled: true,
  },
  {
    id: 'rule-engine-headless',
    name: 'Core Engine Must Remain Headless',
    description: 'Static analysis and graph engines must not import UI features or pages.',
    type: 'forbidden-import',
    category: 'Architecture Boundary',
    severity: 'error',
    sourcePattern: 'src/engine/**',
    targetPattern: 'src/features/**',
    enabled: true,
  },
  {
    id: 'rule-no-cycles-features',
    name: 'No Circular Dependencies in Feature Modules',
    description: 'Feature modules must maintain a clean acyclic directed graph.',
    type: 'no-cycles-in-layer',
    category: 'Modularity',
    severity: 'error',
    sourcePattern: 'src/features/**',
    enabled: true,
  },
];

// Helper to test if a path matches a wildcard pattern (e.g. "src/components/**", "**/*.tsx", "src/*")
export function matchesPathPattern(path: string, pattern: string): boolean {
  if (!pattern || pattern === '*' || pattern === '**') return true;
  const cleanPath = path.replace(/\\/g, '/');
  const cleanPattern = pattern.replace(/\\/g, '/');

  if (cleanPattern.endsWith('/**')) {
    const prefix = cleanPattern.slice(0, -3);
    return cleanPath === prefix || cleanPath.startsWith(prefix + '/');
  }
  if (cleanPattern.endsWith('/*')) {
    const prefix = cleanPattern.slice(0, -2);
    if (!cleanPath.startsWith(prefix + '/')) return false;
    const rest = cleanPath.slice(prefix.length + 1);
    return !rest.includes('/');
  }
  if (cleanPattern.startsWith('**/')) {
    const suffix = cleanPattern.slice(3);
    return cleanPath.endsWith(suffix) || cleanPath.includes('/' + suffix);
  }
  if (cleanPattern.includes('*')) {
    const regexPattern = cleanPattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/(?<!\.)\*/g, '[^/]*');
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(cleanPath);
  }
  return cleanPath === cleanPattern || cleanPath.startsWith(cleanPattern + '/') || cleanPath.includes(cleanPattern);
}

export function evaluateArchitectureRules(
  projectId: ProjectId,
  rules: ArchitectureRule[],
  sourceFiles: SourceFileRecord[],
  edges: DependencyEdge[],
  dependencies: ImportReference[],
  circularGroups: CycleGroup[]
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const fileById = new Map<string, SourceFileRecord>();
  for (const f of sourceFiles) fileById.set(f.id, f);

  // Group dependencies by sourceFileId & targetFileId
  const depDetails = new Map<string, ImportReference>();
  for (const d of dependencies) {
    if (d.targetFileId) {
      depDetails.set(`${d.sourceFileId}->${d.targetFileId}`, d);
    }
  }

  let violationCount = 1;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // 1. Forbidden Import: source must not import target
    if (rule.type === 'forbidden-import' && rule.targetPattern) {
      for (const edge of edges) {
        const sourceFile = fileById.get(edge.sourceFileId);
        const targetFile = fileById.get(edge.targetFileId);
        if (!sourceFile || !targetFile) continue;

        if (
          matchesPathPattern(sourceFile.relativePath, rule.sourcePattern) &&
          matchesPathPattern(targetFile.relativePath, rule.targetPattern)
        ) {
          const dep = depDetails.get(`${sourceFile.id}->${targetFile.id}`);
          violations.push({
            id: `viol-${projectId}-${violationCount++}`,
            projectId,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            sourceFileId: sourceFile.id,
            sourcePath: sourceFile.relativePath,
            targetFileId: targetFile.id,
            targetPath: targetFile.relativePath,
            importSpecifier: dep?.specifier,
            line: dep?.line,
            explanation: `File '${sourceFile.relativePath}' imports '${targetFile.relativePath}', violating rule "${rule.name}" (${rule.sourcePattern} ➔ ${rule.targetPattern}).`,
          });
        }
      }
    }

    // 2. Allowed Layers Only: source may ONLY import from target pattern
    else if (rule.type === 'allowed-layers-only' && rule.targetPattern) {
      for (const edge of edges) {
        const sourceFile = fileById.get(edge.sourceFileId);
        const targetFile = fileById.get(edge.targetFileId);
        if (!sourceFile || !targetFile) continue;

        if (matchesPathPattern(sourceFile.relativePath, rule.sourcePattern)) {
          // If target does NOT match targetPattern and is not in the same folder
          if (!matchesPathPattern(targetFile.relativePath, rule.targetPattern)) {
            const dep = depDetails.get(`${sourceFile.id}->${targetFile.id}`);
            violations.push({
              id: `viol-${projectId}-${violationCount++}`,
              projectId,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              sourceFileId: sourceFile.id,
              sourcePath: sourceFile.relativePath,
              targetFileId: targetFile.id,
              targetPath: targetFile.relativePath,
              importSpecifier: dep?.specifier,
              line: dep?.line,
              explanation: `File '${sourceFile.relativePath}' imports '${targetFile.relativePath}', but is only permitted to depend on '${rule.targetPattern}'.`,
            });
          }
        }
      }
    }

    // 3. Dependency Direction: target must not depend back on source
    else if (rule.type === 'dependency-direction' && rule.targetPattern) {
      for (const edge of edges) {
        const sourceFile = fileById.get(edge.sourceFileId);
        const targetFile = fileById.get(edge.targetFileId);
        if (!sourceFile || !targetFile) continue;

        // If targetPattern imports sourcePattern, that's an inverse flow violation
        if (
          matchesPathPattern(sourceFile.relativePath, rule.targetPattern) &&
          matchesPathPattern(targetFile.relativePath, rule.sourcePattern)
        ) {
          const dep = depDetails.get(`${sourceFile.id}->${targetFile.id}`);
          violations.push({
            id: `viol-${projectId}-${violationCount++}`,
            projectId,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            sourceFileId: sourceFile.id,
            sourcePath: sourceFile.relativePath,
            targetFileId: targetFile.id,
            targetPath: targetFile.relativePath,
            importSpecifier: dep?.specifier,
            line: dep?.line,
            explanation: `Inverse dependency violation: '${sourceFile.relativePath}' imports '${targetFile.relativePath}', reversing architectural flow (${rule.sourcePattern} ➔ ${rule.targetPattern}).`,
          });
        }
      }
    }

    // 4. No Cycles in Layer: files matching pattern must not participate in circular loops
    else if (rule.type === 'no-cycles-in-layer') {
      for (const group of circularGroups) {
        for (const fileId of group.fileIds) {
          const file = fileById.get(fileId);
          if (file && matchesPathPattern(file.relativePath, rule.sourcePattern)) {
            violations.push({
              id: `viol-${projectId}-${violationCount++}`,
              projectId,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              sourceFileId: file.id,
              sourcePath: file.relativePath,
              explanation: `File '${file.relativePath}' is part of a circular dependency cycle (${group.paths.length} files), violating rule "${rule.name}".`,
            });
            break; // One violation per group for this rule
          }
        }
      }
    }
  }

  return violations;
}

export function validateRulesJson(data: any): { valid: boolean; error?: string; rules?: ArchitectureRule[] } {
  if (!Array.isArray(data)) {
    return { valid: false, error: 'Rules JSON must be an array of rule objects.' };
  }
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r.name || typeof r.name !== 'string') {
      return { valid: false, error: `Rule at index ${i} is missing a valid 'name'.` };
    }
    if (!r.sourcePattern || typeof r.sourcePattern !== 'string') {
      return { valid: false, error: `Rule '${r.name}' is missing 'sourcePattern'.` };
    }
  }
  return { valid: true, rules: data as ArchitectureRule[] };
}

import * as babelParser from '@babel/parser';
import type {
  SourceFileRecord,
  ImportReference,
  DependencyEdge,
  DeadCodeFinding,
  ProjectId,
} from '../../types/domain';

export function detectDeadCode(
  projectId: ProjectId,
  sourceFiles: SourceFileRecord[],
  dependencies: ImportReference[],
  edges: DependencyEdge[],
  fileContentsMap: Map<string, string> // relativePath -> source code
): DeadCodeFinding[] {
  const findings: DeadCodeFinding[] = [];
  let findingCounter = 1;

  // 1. Unreferenced files (fan-in = 0, not entry point)
  const incomingEdgeCounts = new Map<string, number>();
  for (const edge of edges) {
    incomingEdgeCounts.set(edge.targetFileId, (incomingEdgeCounts.get(edge.targetFileId) || 0) + 1);
  }

  for (const file of sourceFiles) {
    const callers = incomingEdgeCounts.get(file.id) || 0;
    if (callers === 0 && !file.isEntryPoint) {
      // Check if it's a known config file or test file
      const isConfigOrTest =
        file.relativePath.includes('.config.') ||
        file.relativePath.includes('.test.') ||
        file.relativePath.includes('.spec.') ||
        file.relativePath.startsWith('tests/') ||
        file.relativePath.includes('vite.config') ||
        file.relativePath.includes('tailwind.config');

      findings.push({
        id: `dead-${projectId}-${findingCounter++}`,
        projectId,
        fileId: file.id,
        relativePath: file.relativePath,
        symbolName: file.filename,
        declarationType: 'file',
        category: 'unreferenced-file',
        confidence: isConfigOrTest ? 'unverified' : 'potential',
        severity: isConfigOrTest ? 'low' : 'medium',
        line: 1,
        reason: isConfigOrTest
          ? 'File has zero incoming imports (may be invoked dynamically or by tooling/framework).'
          : 'File is not imported by any other file in this codebase and is not designated as an entry point.',
      });
    }
  }

  // Set of all imported specifiers across the entire project
  const projectReferencedExports = new Set<string>();
  for (const dep of dependencies) {
    if (dep.resolutionStatus === 'internal') {
      projectReferencedExports.add(dep.specifier);
    }
  }

  // 2. Per-file AST inspection for unused locals, unused imports, unused exports, and unreachable code
  for (const file of sourceFiles) {
    const code = fileContentsMap.get(file.relativePath);
    if (!code) continue;

    const isTs = file.relativePath.endsWith('.ts') || file.relativePath.endsWith('.tsx');
    const isJsx = file.relativePath.endsWith('.tsx') || file.relativePath.endsWith('.jsx');

    const plugins: babelParser.ParserPlugin[] = [
      'decorators-legacy',
      'exportDefaultFrom',
    ];
    if (isTs) plugins.push('typescript');
    else plugins.push('flow');
    if (isJsx) plugins.push('jsx');

    let ast: babelParser.ParseResult<babelParser.File>;
    try {
      ast = babelParser.parse(code, {
        sourceType: 'module',
        plugins,
        errorRecovery: true,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
      });
    } catch {
      continue;
    }

    // Collect all declared identifiers and their usages
    const declaredLocals = new Map<string, { type: string; line: number }>();
    const declaredImports = new Map<string, { line: number; source: string }>();
    const declaredExports = new Map<string, { line: number; kind: string }>();
    const identifierUsages = new Map<string, number>();

    // 1st pass: inspect top-level declarations
    for (const stmt of ast.program.body) {
      // Imports
      if (stmt.type === 'ImportDeclaration') {
        const source = stmt.source.value;
        for (const spec of stmt.specifiers || []) {
          if (spec.type === 'ImportSpecifier' || spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
            declaredImports.set(spec.local.name, {
              line: spec.loc?.start.line || stmt.loc?.start.line || 1,
              source,
            });
          }
        }
      }

      // Exports
      else if (stmt.type === 'ExportNamedDeclaration') {
        if (stmt.declaration) {
          const d = stmt.declaration;
          if (d.type === 'FunctionDeclaration' && d.id) {
            declaredExports.set(d.id.name, { line: d.loc?.start.line || 1, kind: 'function' });
          } else if (d.type === 'VariableDeclaration') {
            for (const v of d.declarations) {
              if (v.id.type === 'Identifier') {
                declaredExports.set(v.id.name, { line: v.loc?.start.line || 1, kind: 'variable' });
              }
            }
          }
        }
      }

      // Local declarations
      else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
        declaredLocals.set(stmt.id.name, { type: 'function', line: stmt.loc?.start.line || 1 });
      } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
        declaredLocals.set(stmt.id.name, { type: 'class', line: stmt.loc?.start.line || 1 });
      } else if (stmt.type === 'VariableDeclaration') {
        for (const v of stmt.declarations) {
          if (v.id.type === 'Identifier') {
            declaredLocals.set(v.id.name, { type: 'variable', line: v.loc?.start.line || 1 });
          }
        }
      }
    }

    // 2nd pass: count all identifier references throughout AST outside import declarations
    function countIdentifiers(node: any, isInsideImport = false) {
      if (!node || typeof node !== 'object') return;

      const insideImport = isInsideImport || node.type === 'ImportDeclaration';

      if (!insideImport) {
        if (node.type === 'Identifier' && typeof node.name === 'string') {
          identifierUsages.set(node.name, (identifierUsages.get(node.name) || 0) + 1);
        } else if (node.type === 'JSXIdentifier' && typeof node.name === 'string') {
          identifierUsages.set(node.name, (identifierUsages.get(node.name) || 0) + 1);
        }
      }

      for (const k of Object.keys(node)) {
        if (k === 'loc' || k === 'comments') continue;
        const child = node[k];
        if (Array.isArray(child)) {
          for (const c of child) countIdentifiers(c, insideImport);
        } else if (child && typeof child === 'object') {
          countIdentifiers(child, insideImport);
        }
      }
    }
    countIdentifiers(ast.program, false);

    // 3. Unused imports: imported identifier has 0 usages outside the import statement
    for (const [importName, meta] of declaredImports.entries()) {
      const count = identifierUsages.get(importName) || 0;
      if (count === 0) {
        findings.push({
          id: `dead-${projectId}-${findingCounter++}`,
          projectId,
          fileId: file.id,
          relativePath: file.relativePath,
          symbolName: importName,
          declarationType: 'import',
          category: 'unused-import',
          confidence: 'confirmed',
          severity: 'low',
          line: meta.line,
          reason: `Imported symbol '${importName}' from '${meta.source}' is never referenced in this file.`,
        });
      }
    }

    // 4. Unused local functions and variables
    for (const [localName, meta] of declaredLocals.entries()) {
      const count = identifierUsages.get(localName) || 0;
      if (count <= 1) {
        findings.push({
          id: `dead-${projectId}-${findingCounter++}`,
          projectId,
          fileId: file.id,
          relativePath: file.relativePath,
          symbolName: localName,
          declarationType: meta.type,
          category: meta.type === 'function' ? 'unused-function' : meta.type === 'class' ? 'unused-class' : 'unused-variable',
          confidence: 'confirmed',
          severity: 'medium',
          line: meta.line,
          reason: `Local ${meta.type} '${localName}' is declared but never called or referenced in this file.`,
        });
      }
    }

    // 5. Unused exports (if file is not an entry point)
    if (!file.isEntryPoint) {
      for (const [exportName, meta] of declaredExports.entries()) {
        const escaped = exportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRegex = new RegExp(`\\b${escaped}\\b`);
        let isReferenced = false;
        for (const [otherPath, otherCode] of fileContentsMap.entries()) {
          if (otherPath === file.relativePath) continue;
          if (wordRegex.test(otherCode)) {
            isReferenced = true;
            break;
          }
        }

        if (!isReferenced) {
          findings.push({
            id: `dead-${projectId}-${findingCounter++}`,
            projectId,
            fileId: file.id,
            relativePath: file.relativePath,
            symbolName: exportName,
            declarationType: meta.kind,
            category: 'unused-export',
            confidence: 'potential',
            severity: 'medium',
            line: meta.line,
            reason: `Exported ${meta.kind} '${exportName}' is never imported or referenced by any other internal file.`,
          });
        }
      }
    }

    // 6. Comprehensive unreachable code detection across all blocks in AST
    function checkUnreachableBlock(bodyList: any[]) {
      let isTerminated = false;
      for (let i = 0; i < bodyList.length; i++) {
        const stmt = bodyList[i];
        if (!stmt) continue;

        if (isTerminated) {
          findings.push({
            id: `dead-${projectId}-${findingCounter++}`,
            projectId,
            fileId: file.id,
            relativePath: file.relativePath,
            symbolName: stmt.type,
            declarationType: 'statement',
            category: 'unreachable-code',
            confidence: 'confirmed',
            severity: 'high',
            line: stmt.loc?.start.line || 1,
            reason: `Unreachable code: statement executes after an unconditional ${isTerminated} statement.`,
          });
          break; // Flag first unreachable statement in this block
        }

        if (
          stmt.type === 'ReturnStatement' ||
          stmt.type === 'ThrowStatement' ||
          stmt.type === 'BreakStatement' ||
          stmt.type === 'ContinueStatement'
        ) {
          isTerminated = stmt.type.replace('Statement', '');
        }
      }
    }

    function walkBlocks(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'BlockStatement' && Array.isArray(node.body)) {
        checkUnreachableBlock(node.body);
      }
      for (const k of Object.keys(node)) {
        if (k === 'loc' || k === 'comments') continue;
        const child = node[k];
        if (Array.isArray(child)) {
          for (const c of child) walkBlocks(c);
        } else if (child && typeof child === 'object') {
          walkBlocks(child);
        }
      }
    }

    if (Array.isArray(ast.program.body)) {
      checkUnreachableBlock(ast.program.body);
    }
    walkBlocks(ast.program);
  }

  return findings;
}

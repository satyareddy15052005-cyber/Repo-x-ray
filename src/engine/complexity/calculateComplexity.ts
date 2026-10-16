import * as babelParser from '@babel/parser';
import type {
  SourceFileRecord,
  DependencyEdge,
  FunctionComplexity,
  FileComplexity,
  ComplexitySummary,
  ComplexityTier,
  ProjectId,
} from '../../types/domain';

export function getComplexityTier(cyclomatic: number): ComplexityTier {
  if (cyclomatic <= 5) return 'low';
  if (cyclomatic <= 10) return 'moderate';
  if (cyclomatic <= 20) return 'high';
  return 'very-high';
}

export function calculateComplexity(
  projectId: ProjectId,
  sourceFiles: SourceFileRecord[],
  edges: DependencyEdge[],
  fileContentsMap: Map<string, string>
): {
  functionComplexities: FunctionComplexity[];
  fileComplexities: FileComplexity[];
  summary: ComplexitySummary;
} {
  const functionComplexities: FunctionComplexity[] = [];
  const fileComplexities: FileComplexity[] = [];

  // Compute fan-in and fan-out maps
  const fanInMap = new Map<string, number>();
  const fanOutMap = new Map<string, number>();
  for (const edge of edges) {
    fanOutMap.set(edge.sourceFileId, (fanOutMap.get(edge.sourceFileId) || 0) + 1);
    fanInMap.set(edge.targetFileId, (fanInMap.get(edge.targetFileId) || 0) + 1);
  }

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

    const fileFunctions: FunctionComplexity[] = [];

    // Analyze individual function node
    function analyzeFunction(
      node: any,
      name: string,
      lineStart: number,
      lineEnd: number,
      paramsCount: number
    ) {
      let cyclomatic = 1;
      let maxNesting = 0;
      let branchesCount = 0;
      let loopsCount = 0;
      let returnsCount = 0;
      let callsCount = 0;

      function walkFn(subNode: any, currentDepth: number) {
        if (!subNode || typeof subNode !== 'object') return;

        let nextDepth = currentDepth;

        // Nesting depth triggers
        if (
          subNode.type === 'BlockStatement' ||
          subNode.type === 'IfStatement' ||
          subNode.type === 'ForStatement' ||
          subNode.type === 'WhileStatement' ||
          subNode.type === 'SwitchStatement'
        ) {
          nextDepth = currentDepth + 1;
          if (nextDepth > maxNesting) maxNesting = nextDepth;
        }

        // Branching & Decisions
        if (subNode.type === 'IfStatement' || subNode.type === 'ConditionalExpression') {
          cyclomatic++;
          branchesCount++;
        } else if (
          subNode.type === 'ForStatement' ||
          subNode.type === 'ForInStatement' ||
          subNode.type === 'ForOfStatement' ||
          subNode.type === 'WhileStatement' ||
          subNode.type === 'DoWhileStatement'
        ) {
          cyclomatic++;
          loopsCount++;
        } else if (subNode.type === 'SwitchCase' && subNode.test) {
          cyclomatic++;
          branchesCount++;
        } else if (subNode.type === 'CatchClause') {
          cyclomatic++;
        } else if (
          subNode.type === 'LogicalExpression' &&
          (subNode.operator === '&&' || subNode.operator === '||' || subNode.operator === '??')
        ) {
          cyclomatic++;
        } else if (subNode.type === 'ReturnStatement') {
          returnsCount++;
        } else if (subNode.type === 'CallExpression') {
          callsCount++;
        }

        // Recurse (do not cross into nested inner functions for this function's scope)
        for (const k of Object.keys(subNode)) {
          if (k === 'loc' || k === 'comments') continue;
          const child = subNode[k];
          if (Array.isArray(child)) {
            for (const c of child) {
              if (
                c &&
                c.type !== 'FunctionDeclaration' &&
                c.type !== 'FunctionExpression' &&
                c.type !== 'ArrowFunctionExpression'
              ) {
                walkFn(c, nextDepth);
              }
            }
          } else if (
            child &&
            typeof child === 'object' &&
            child.type !== 'FunctionDeclaration' &&
            child.type !== 'FunctionExpression' &&
            child.type !== 'ArrowFunctionExpression'
          ) {
            walkFn(child, nextDepth);
          }
        }
      }

      walkFn(node.body || node, 0);

      const fnComplexity: FunctionComplexity = {
        id: `cplx-${file.id}#${name}#${lineStart}`,
        projectId,
        fileId: file.id,
        relativePath: file.relativePath,
        name,
        lineStart,
        lineEnd,
        lineCount: Math.max(1, lineEnd - lineStart + 1),
        cyclomaticComplexity: cyclomatic,
        parametersCount: paramsCount,
        maxNestingDepth: maxNesting,
        branchesCount,
        loopsCount,
        returnsCount,
        callsCount,
        tier: getComplexityTier(cyclomatic),
      };

      fileFunctions.push(fnComplexity);
      functionComplexities.push(fnComplexity);
    }

    // Traverse AST to identify functions
    function findFunctions(node: any) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'FunctionDeclaration' && node.id) {
        analyzeFunction(
          node,
          node.id.name,
          node.loc?.start.line || 1,
          node.loc?.end.line || 1,
          node.params?.length || 0
        );
      } else if (
        node.type === 'VariableDeclarator' &&
        node.id?.type === 'Identifier' &&
        node.init &&
        (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')
      ) {
        analyzeFunction(
          node.init,
          node.id.name,
          node.loc?.start.line || 1,
          node.loc?.end.line || 1,
          node.init.params?.length || 0
        );
      } else if ((node.type === 'ClassMethod' || node.type === 'ObjectMethod') && node.key) {
        const methodName = node.key.type === 'Identifier' ? node.key.name : 'method';
        analyzeFunction(
          node,
          methodName,
          node.loc?.start.line || 1,
          node.loc?.end.line || 1,
          node.params?.length || 0
        );
      }

      for (const k of Object.keys(node)) {
        if (k === 'loc' || k === 'comments') continue;
        const child = node[k];
        if (Array.isArray(child)) {
          for (const c of child) findFunctions(c);
        } else if (child && typeof child === 'object') {
          findFunctions(child);
        }
      }
    }

    findFunctions(ast.program);

    // Compute file-level complexity
    const totalFns = fileFunctions.length;
    const avgCyclomatic =
      totalFns > 0
        ? Math.round(
            (fileFunctions.reduce((acc, f) => acc + f.cyclomaticComplexity, 0) / totalFns) * 10
          ) / 10
        : 1;
    const maxCyclomatic =
      totalFns > 0
        ? Math.max(...fileFunctions.map(f => f.cyclomaticComplexity))
        : 1;

    fileComplexities.push({
      id: `filecplx-${file.id}`,
      projectId,
      fileId: file.id,
      relativePath: file.relativePath,
      lineCount: file.lineCount,
      totalFunctions: totalFns,
      avgCyclomaticComplexity: avgCyclomatic,
      maxCyclomaticComplexity: maxCyclomatic,
      fanIn: fanInMap.get(file.id) || 0,
      fanOut: fanOutMap.get(file.id) || 0,
      tier: getComplexityTier(maxCyclomatic),
    });
  }

  // Summary statistics
  const totalAnalyzed = functionComplexities.length;
  const avgComplexity =
    totalAnalyzed > 0
      ? Math.round(
          (functionComplexities.reduce((acc, f) => acc + f.cyclomaticComplexity, 0) /
            totalAnalyzed) *
            10
        ) / 10
      : 1;
  const maxComplexity =
    totalAnalyzed > 0 ? Math.max(...functionComplexities.map(f => f.cyclomaticComplexity)) : 1;

  const distribution = {
    low: functionComplexities.filter(f => f.tier === 'low').length,
    moderate: functionComplexities.filter(f => f.tier === 'moderate').length,
    high: functionComplexities.filter(f => f.tier === 'high').length,
    veryHigh: functionComplexities.filter(f => f.tier === 'very-high').length,
  };

  return {
    functionComplexities,
    fileComplexities,
    summary: {
      averageFunctionComplexity: avgComplexity,
      maxFunctionComplexity: maxComplexity,
      highComplexityFunctionsCount: distribution.high + distribution.veryHigh,
      totalAnalyzedFunctions: totalAnalyzed,
      distribution,
    },
  };
}

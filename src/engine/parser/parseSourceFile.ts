import * as babelParser from '@babel/parser';
import type { ImportKind, ExtractedExport } from '../../types/domain';

export interface RawImport {
  specifier: string;
  kind: ImportKind;
  line?: number;
  column?: number;
}

export interface ParsedSourceResult {
  imports: RawImport[];
  exports: ExtractedExport[];
  lineCount: number;
  parseStatus: 'success' | 'partial' | 'failed';
  parseError?: {
    message: string;
    line?: number;
    column?: number;
  };
}

export function parseSourceFile(
  code: string,
  relativePath: string
): ParsedSourceResult {
  const lineCount = code.split('\n').length;
  const isTs = relativePath.endsWith('.ts') || relativePath.endsWith('.tsx') || relativePath.endsWith('.mts') || relativePath.endsWith('.cts');
  const isJsx = relativePath.endsWith('.tsx') || relativePath.endsWith('.jsx');

  // Plugins list for Babel parser
  const plugins: babelParser.ParserPlugin[] = [
    'decorators-legacy',
    'exportDefaultFrom',
  ];

  if (isTs) {
    plugins.push('typescript');
  } else {
    plugins.push('flow');
  }

  if (isJsx) {
    plugins.push('jsx');
  }

  let ast: babelParser.ParseResult<babelParser.File>;

  try {
    ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins,
      errorRecovery: true,
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
    });
  } catch (err: unknown) {
    // If strict module parse fails, try script mode with error recovery
    try {
      ast = babelParser.parse(code, {
        sourceType: 'unambiguous',
        plugins,
        errorRecovery: true,
      });
    } catch (fallbackErr: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = (fallbackErr || err) as any;
      return {
        imports: [],
        exports: [],
        lineCount,
        parseStatus: 'failed',
        parseError: {
          message: e?.message || 'Syntax parser failed',
          line: e?.loc?.line,
          column: e?.loc?.column,
        },
      };
    }
  }

  const imports: RawImport[] = [];
  const exports: ExtractedExport[] = [];

  // Traverse the AST body
  for (const node of ast.program.body) {
    // 1. Static ImportDeclaration: import ... from 'specifier'
    if (node.type === 'ImportDeclaration') {
      const specifier = node.source.value;
      const isTypeOnly = node.importKind === 'type' || (node.specifiers && node.specifiers.length > 0 && node.specifiers.every((s: any) => s.importKind === 'type'));
      imports.push({
        specifier,
        kind: isTypeOnly ? 'type-only' : 'static',
        line: node.loc?.start.line,
        column: node.loc?.start.column,
      });
    }

    // 2. ExportNamedDeclaration: export { x } from 'specifier' or export const x = 1;
    else if (node.type === 'ExportNamedDeclaration') {
      if (node.source && typeof node.source.value === 'string') {
        const specifier = node.source.value;
        const isTypeOnly = node.exportKind === 'type';
        imports.push({
          specifier,
          kind: isTypeOnly ? 'type-only' : 're-export',
          line: node.loc?.start.line,
          column: node.loc?.start.column,
        });
      }

      // Check declarations
      if (node.declaration) {
        const decl = node.declaration;
        if (decl.type === 'FunctionDeclaration' && decl.id) {
          exports.push({ name: decl.id.name, kind: 'function', line: decl.loc?.start.line });
        } else if (decl.type === 'ClassDeclaration' && decl.id) {
          exports.push({ name: decl.id.name, kind: 'class', line: decl.loc?.start.line });
        } else if (decl.type === 'TSInterfaceDeclaration' && decl.id) {
          exports.push({ name: decl.id.name, kind: 'interface', line: decl.loc?.start.line });
        } else if (decl.type === 'TSTypeAliasDeclaration' && decl.id) {
          exports.push({ name: decl.id.name, kind: 'type', line: decl.loc?.start.line });
        } else if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id && d.id.type === 'Identifier') {
              exports.push({ name: d.id.name, kind: 'variable', line: d.loc?.start.line });
            }
          }
        }
      }

      // Check specifiers (export { foo, bar })
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.type === 'ExportSpecifier') {
            const exportedName = spec.exported.type === 'Identifier' ? spec.exported.name : (spec.exported as any).value;
            exports.push({
              name: exportedName,
              kind: node.exportKind === 'type' ? 'type' : 'variable',
              line: spec.loc?.start.line,
            });
          }
        }
      }
    }

    // 3. ExportAllDeclaration: export * from 'specifier'
    else if (node.type === 'ExportAllDeclaration') {
      if (node.source && typeof node.source.value === 'string') {
        imports.push({
          specifier: node.source.value,
          kind: node.exportKind === 'type' ? 'type-only' : 're-export',
          line: node.loc?.start.line,
          column: node.loc?.start.column,
        });
      }
      exports.push({ name: '*', kind: 'all', line: node.loc?.start.line });
    }

    // 4. ExportDefaultDeclaration: export default ...
    else if (node.type === 'ExportDefaultDeclaration') {
      let name = 'default';
      const decl = node.declaration;
      if (decl && (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id) {
        name = decl.id.name;
      }
      exports.push({ name, kind: 'default', line: node.loc?.start.line });
    }
  }

  // Scan for dynamic imports and CommonJS require calls via regex & light AST check
  // Dynamic import: import('specifier')
  // CommonJS: require('specifier')
  const dynamicImportRegex = /import\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = dynamicImportRegex.exec(code)) !== null) {
    const specifier = match[2];
    const beforeMatch = code.substring(0, match.index);
    const line = beforeMatch.split('\n').length;
    imports.push({
      specifier,
      kind: 'dynamic-literal',
      line,
    });
  }

  const cjsRequireRegex = /(?:^|[^a-zA-Z0-9_$])require\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  while ((match = cjsRequireRegex.exec(code)) !== null) {
    const specifier = match[2];
    const beforeMatch = code.substring(0, match.index);
    const line = beforeMatch.split('\n').length;
    // Don't duplicate if already extracted
    if (!imports.some(i => i.specifier === specifier && i.line === line)) {
      imports.push({
        specifier,
        kind: 'commonjs',
        line,
      });
    }
  }

  const parseErrors = ast.errors || [];
  return {
    imports,
    exports,
    lineCount,
    parseStatus: parseErrors.length > 0 ? 'partial' : 'success',
    parseError: parseErrors.length > 0
      ? {
          message: parseErrors[0].message,
          line: parseErrors[0].loc?.line,
          column: parseErrors[0].loc?.column,
        }
      : undefined,
  };
}

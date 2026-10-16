import * as babelParser from '@babel/parser';
import type {
  FunctionRecord,
  FunctionDeclarationType,
  FileId,
  ProjectId,
} from '../../types/domain';

export interface RawCallSite {
  sourceFunctionName: string;
  sourceFunctionLine: number;
  calleeName: string;
  calleeObject?: string;
  line: number;
  rawExpression: string;
}

export interface ImportedSymbolBinding {
  localName: string;
  importedName: string;
  specifier: string;
  isNamespace?: boolean;
  isDefault?: boolean;
  line: number;
}

export interface ExtractedFunctionsResult {
  functions: FunctionRecord[];
  calls: RawCallSite[];
  importedSymbols: ImportedSymbolBinding[];
}

export function extractFunctionsFromSource(
  code: string,
  relativePath: string,
  fileId: FileId,
  projectId: ProjectId
): ExtractedFunctionsResult {
  const isTs = relativePath.endsWith('.ts') || relativePath.endsWith('.tsx') || relativePath.endsWith('.mts') || relativePath.endsWith('.cts');
  const isJsx = relativePath.endsWith('.tsx') || relativePath.endsWith('.jsx');

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
    try {
      ast = babelParser.parse(code, {
        sourceType: 'unambiguous',
        plugins,
        errorRecovery: true,
      });
    } catch {
      return { functions: [], calls: [], importedSymbols: [] };
    }
  }

  const functions: FunctionRecord[] = [];
  const calls: RawCallSite[] = [];
  const importedSymbols: ImportedSymbolBinding[] = [];

  // Track exported symbol names to mark isExported correctly
  const exportedNames = new Set<string>();
  let hasDefaultExport = false;
  let defaultExportName = '';

  for (const node of ast.program.body) {
    // 1. Imports
    if (node.type === 'ImportDeclaration') {
      const specifier = node.source.value;
      const line = node.loc?.start.line || 1;
      for (const spec of node.specifiers || []) {
        if (spec.type === 'ImportSpecifier') {
          const importedName =
            spec.imported.type === 'Identifier' ? spec.imported.name : (spec.imported as any).value;
          importedSymbols.push({
            localName: spec.local.name,
            importedName,
            specifier,
            line,
          });
        } else if (spec.type === 'ImportDefaultSpecifier') {
          importedSymbols.push({
            localName: spec.local.name,
            importedName: 'default',
            specifier,
            isDefault: true,
            line,
          });
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          importedSymbols.push({
            localName: spec.local.name,
            importedName: '*',
            specifier,
            isNamespace: true,
            line,
          });
        }
      }
    }

    // 2. Named Exports
    else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
          exportedNames.add(node.declaration.id.name);
        } else if (node.declaration.type === 'VariableDeclaration') {
          for (const d of node.declaration.declarations) {
            if (d.id.type === 'Identifier') exportedNames.add(d.id.name);
          }
        }
      }
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.type === 'ExportSpecifier') {
            const localName = spec.local.type === 'Identifier' ? spec.local.name : (spec.local as any).value;
            exportedNames.add(localName);
          }
        }
      }
    }

    // 3. Default Exports
    else if (node.type === 'ExportDefaultDeclaration') {
      hasDefaultExport = true;
      if (node.declaration) {
        const decl = node.declaration;
        if (decl.type === 'FunctionDeclaration') {
          defaultExportName = decl.id?.name || 'default';
          exportedNames.add(defaultExportName);
        } else if (decl.type === 'Identifier') {
          defaultExportName = decl.name;
          exportedNames.add(defaultExportName);
        } else {
          defaultExportName = 'default';
          exportedNames.add('default');
        }
      }
    }
  }

  // Recursive AST walker to extract functions and their calls
  function walk(node: any, currentFunction: FunctionRecord | null) {
    if (!node || typeof node !== 'object') return;

    let nextFunction = currentFunction;

    // 1. Function Declaration (named or default export anonymous)
    if (node.type === 'FunctionDeclaration') {
      const name = node.id ? node.id.name : 'default';
      const isDefault = hasDefaultExport && (defaultExportName === name || (!node.id && defaultExportName === 'default'));
      const fnRecord: FunctionRecord = {
        id: `${fileId}#${name}#${node.loc?.start.line || 1}`,
        projectId,
        fileId,
        relativePath,
        name,
        declarationType: 'function',
        lineStart: node.loc?.start.line || 1,
        lineEnd: node.loc?.end.line || (node.loc?.start.line || 1),
        columnStart: node.loc?.start.column,
        isExported: exportedNames.has(name) || isDefault,
        isDefaultExport: isDefault,
        parametersCount: node.params?.length || 0,
      };
      functions.push(fnRecord);
      nextFunction = fnRecord;
    }

    // 2. Variable declarator with arrow function or function expression
    else if (
      node.type === 'VariableDeclarator' &&
      node.id &&
      node.id.type === 'Identifier' &&
      node.init &&
      (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')
    ) {
      const name = node.id.name;
      const declType: FunctionDeclarationType =
        node.init.type === 'ArrowFunctionExpression' ? 'arrow' : 'expression';
      const fnRecord: FunctionRecord = {
        id: `${fileId}#${name}#${node.loc?.start.line || 1}`,
        projectId,
        fileId,
        relativePath,
        name,
        declarationType: declType,
        lineStart: node.loc?.start.line || 1,
        lineEnd: node.loc?.end.line || (node.loc?.start.line || 1),
        columnStart: node.loc?.start.column,
        isExported: exportedNames.has(name),
        isDefaultExport: hasDefaultExport && defaultExportName === name,
        parametersCount: node.init.params?.length || 0,
      };
      functions.push(fnRecord);
      nextFunction = fnRecord;
    }

    // 3. Class Method
    else if (node.type === 'ClassMethod' && node.key) {
      const methodName = node.key.type === 'Identifier' ? node.key.name : 'method';
      const fnRecord: FunctionRecord = {
        id: `${fileId}#${methodName}#${node.loc?.start.line || 1}`,
        projectId,
        fileId,
        relativePath,
        name: methodName,
        declarationType: 'class-method',
        lineStart: node.loc?.start.line || 1,
        lineEnd: node.loc?.end.line || (node.loc?.start.line || 1),
        columnStart: node.loc?.start.column,
        isExported: false,
        parametersCount: node.params?.length || 0,
      };
      functions.push(fnRecord);
      nextFunction = fnRecord;
    }

    // 4. Object Method (e.g. { helper() { ... } })
    else if (node.type === 'ObjectMethod' && node.key) {
      const methodName = node.key.type === 'Identifier' ? node.key.name : 'method';
      const fnRecord: FunctionRecord = {
        id: `${fileId}#${methodName}#${node.loc?.start.line || 1}`,
        projectId,
        fileId,
        relativePath,
        name: methodName,
        declarationType: 'method',
        lineStart: node.loc?.start.line || 1,
        lineEnd: node.loc?.end.line || (node.loc?.start.line || 1),
        columnStart: node.loc?.start.column,
        isExported: false,
        parametersCount: node.params?.length || 0,
      };
      functions.push(fnRecord);
      nextFunction = fnRecord;
    }

    // 5. Function Call Expression: call() or obj.method()
    if (node.type === 'CallExpression') {
      let calleeName = '';
      let calleeObject: string | undefined;

      if (node.callee.type === 'Identifier') {
        calleeName = node.callee.name;
      } else if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property &&
        node.callee.property.type === 'Identifier'
      ) {
        calleeName = node.callee.property.name;
        if (node.callee.object.type === 'Identifier') {
          calleeObject = node.callee.object.name;
        }
      }

      if (calleeName) {
        calls.push({
          sourceFunctionName: currentFunction ? currentFunction.name : '(module)',
          sourceFunctionLine: currentFunction ? currentFunction.lineStart : 1,
          calleeName,
          calleeObject,
          line: node.loc?.start.line || 1,
          rawExpression: calleeObject ? `${calleeObject}.${calleeName}` : calleeName,
        });
      }
    }

    // Recurse child nodes
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'comments' || key === 'tokens') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          walk(item, nextFunction);
        }
      } else if (child && typeof child === 'object') {
        walk(child, nextFunction);
      }
    }
  }

  walk(ast.program, null);

  return { functions, calls, importedSymbols };
}

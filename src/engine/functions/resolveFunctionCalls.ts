import type {
  FunctionRecord,
  FunctionCallEdge,
  ImportReference,
  ProjectId,
} from '../../types/domain';
import type { RawCallSite, ImportedSymbolBinding } from './extractFunctions';

export function resolveFunctionCalls(
  projectId: ProjectId,
  allFunctions: FunctionRecord[],
  fileCallsMap: Map<string, RawCallSite[]>, // fileId -> calls
  fileImportsMap: Map<string, ImportReference[]>, // fileId -> imports
  fileImportedSymbolsMap?: Map<string, ImportedSymbolBinding[]> // fileId -> imported symbols
): {
  edges: FunctionCallEdge[];
  updatedFunctions: FunctionRecord[];
} {
  // Index functions by fileId and name
  const functionsByFileAndName = new Map<string, FunctionRecord[]>();
  const functionById = new Map<string, FunctionRecord>();

  for (const fn of allFunctions) {
    functionById.set(fn.id, fn);
    const key = `${fn.fileId}::${fn.name}`;
    let list = functionsByFileAndName.get(key);
    if (!list) {
      list = [];
      functionsByFileAndName.set(key, list);
    }
    list.push(fn);
  }

  // Index exported functions by target fileId
  const exportedFunctionsByFile = new Map<string, Map<string, FunctionRecord>>();
  for (const fn of allFunctions) {
    if (fn.isExported || fn.isDefaultExport) {
      let fileExports = exportedFunctionsByFile.get(fn.fileId);
      if (!fileExports) {
        fileExports = new Map();
        exportedFunctionsByFile.set(fn.fileId, fileExports);
      }
      fileExports.set(fn.name, fn);
      if (fn.isDefaultExport) {
        fileExports.set('default', fn);
      }
    }
  }

  const callerCounts = new Map<string, number>();
  const calleeCounts = new Map<string, number>();
  const edgeMap = new Map<string, FunctionCallEdge>();

  // Process calls per file
  for (const [fileId, calls] of fileCallsMap.entries()) {
    const fileImports = fileImportsMap.get(fileId) || [];
    const importedSymbols = fileImportedSymbolsMap?.get(fileId) || [];

    // Map specifier to targetFileId
    const specifierToTargetFileId = new Map<string, string>();
    for (const imp of fileImports) {
      if (imp.targetFileId && imp.resolutionStatus === 'internal') {
        specifierToTargetFileId.set(imp.specifier, imp.targetFileId);
      }
    }

    // Map local name -> imported info
    const localNameToImport = new Map<string, ImportedSymbolBinding>();
    for (const sym of importedSymbols) {
      localNameToImport.set(sym.localName, sym);
    }

    for (const call of calls) {
      // Find source function
      let sourceFn: FunctionRecord | undefined;
      if (call.sourceFunctionName && call.sourceFunctionName !== '(module)') {
        const localSources = functionsByFileAndName.get(`${fileId}::${call.sourceFunctionName}`);
        if (localSources && localSources.length > 0) {
          // Match by line range if multiple
          sourceFn = localSources.find(
            fn => call.line >= fn.lineStart && call.line <= fn.lineEnd
          ) || localSources[0];
        }
      }

      if (!sourceFn) {
        // If not in a named function (top-level or inline), find enclosing function by line
        const fileFns = allFunctions.filter(f => f.fileId === fileId);
        sourceFn = fileFns.find(f => call.line >= f.lineStart && call.line <= f.lineEnd);
      }

      if (!sourceFn) continue;

      let targetFn: FunctionRecord | undefined;
      let confidence: 'static-direct' | 'imported-resolved' | 'ambiguous' = 'static-direct';
      let isCrossFile = false;

      // 1. Check if calleeObject is an imported namespace or module object: e.g. utils.formatDate()
      if (call.calleeObject) {
        const importedObj = localNameToImport.get(call.calleeObject);
        if (importedObj) {
          const targetFileId = specifierToTargetFileId.get(importedObj.specifier);
          if (targetFileId) {
            const targetExports = exportedFunctionsByFile.get(targetFileId);
            if (targetExports) {
              targetFn = targetExports.get(call.calleeName);
              if (targetFn) {
                confidence = 'imported-resolved';
                isCrossFile = true;
              }
            }
          }
        }
      }

      // 2. Check if calleeName was directly imported or aliased: e.g. import { foo as bar } from './util'; bar()
      if (!targetFn && !call.calleeObject) {
        const importedBinding = localNameToImport.get(call.calleeName);
        if (importedBinding) {
          const targetFileId = specifierToTargetFileId.get(importedBinding.specifier);
          if (targetFileId) {
            const targetExports = exportedFunctionsByFile.get(targetFileId);
            if (targetExports) {
              targetFn =
                targetExports.get(importedBinding.importedName) ||
                (importedBinding.isDefault ? targetExports.get('default') : undefined);
              if (targetFn) {
                confidence = 'imported-resolved';
                isCrossFile = true;
              }
            }
          }
        }
      }

      // 3. Check local functions in same file (only if no object or object is this)
      if (!targetFn && (!call.calleeObject || call.calleeObject === 'this')) {
        const localTargets = functionsByFileAndName.get(`${fileId}::${call.calleeName}`);
        if (localTargets && localTargets.length > 0) {
          targetFn = localTargets[0];
          confidence = 'static-direct';
          isCrossFile = false;
        }
      }

      // 4. Fallback check across all file imports if callee name matches an exported function
      if (!targetFn && !call.calleeObject) {
        for (const imp of fileImports) {
          if (imp.targetFileId && imp.resolutionStatus === 'internal') {
            const targetExports = exportedFunctionsByFile.get(imp.targetFileId);
            if (targetExports) {
              const matchedExport = targetExports.get(call.calleeName);
              if (matchedExport) {
                targetFn = matchedExport;
                confidence = 'imported-resolved';
                isCrossFile = true;
                break;
              }
            }
          }
        }
      }

      if (targetFn && sourceFn.id !== targetFn.id) {
        const edgeKey = `${sourceFn.id}->${targetFn.id}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            id: `fncall-${sourceFn.id}->${targetFn.id}`,
            projectId,
            sourceFunctionId: sourceFn.id,
            targetFunctionId: targetFn.id,
            callLine: call.line,
            isCrossFile,
            confidence,
            callExpression: call.rawExpression,
          });

          calleeCounts.set(sourceFn.id, (calleeCounts.get(sourceFn.id) || 0) + 1);
          callerCounts.set(targetFn.id, (callerCounts.get(targetFn.id) || 0) + 1);
        }
      }
    }
  }

  // Update callerCount and calleeCount on function records
  const updatedFunctions = allFunctions.map(fn => ({
    ...fn,
    callerCount: callerCounts.get(fn.id) || 0,
    calleeCount: calleeCounts.get(fn.id) || 0,
  }));

  return {
    edges: Array.from(edgeMap.values()),
    updatedFunctions,
  };
}

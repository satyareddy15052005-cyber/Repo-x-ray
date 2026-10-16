import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FileCode,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Zap,
} from 'lucide-react';
import type { SourceFileRecord, ImportReference, DependencyEdge } from '../../types/domain';

interface GraphInspectorProps {
  selectedFile: SourceFileRecord | null;
  selectedEdge: DependencyEdge | null;
  dependencies: ImportReference[];
  dependents: SourceFileRecord[];
  allFilesMap: Map<string, SourceFileRecord>;
  projectId: string;
  onClose: () => void;
  onSelectFileById: (fileId: string) => void;
}

export function GraphInspector({
  selectedFile,
  selectedEdge,
  dependencies,
  dependents,
  allFilesMap,
  projectId,
  onClose,
  onSelectFileById,
}: GraphInspectorProps) {
  const navigate = useNavigate();

  if (!selectedFile && !selectedEdge) {
    return (
      <div className="hidden md:flex w-80 bg-white border-l border-slate-200 p-6 flex-col justify-center items-center text-center text-slate-400">
        <FileCode className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
        <div className="text-xs font-medium text-slate-500">No Node Selected</div>
        <div className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
          Click any file node or connection edge to inspect architectural relationships.
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    const src = allFilesMap.get(selectedEdge.sourceFileId);
    const tgt = allFilesMap.get(selectedEdge.targetFileId);

    return (
      <div className="fixed inset-x-0 bottom-14 md:bottom-0 md:static z-40 md:z-auto w-full md:w-80 max-h-[60vh] md:max-h-full bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-auto md:h-full overflow-hidden text-xs shadow-2xl md:shadow-none rounded-t-xl md:rounded-none animate-in slide-in-from-bottom md:animate-none duration-150">
        <div className="md:hidden flex justify-center pt-2 pb-0.5">
          <div className="w-8 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="font-semibold text-slate-800">Dependency Edge</span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Source (Caller)</div>
            <div
              onClick={() => src && onSelectFileById(src.id)}
              className="p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 cursor-pointer hover:border-blue-400"
            >
              {src ? src.relativePath : selectedEdge.sourceFileId}
            </div>
          </div>

          <div className="flex justify-center text-slate-400">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Target (Imported)</div>
            <div
              onClick={() => tgt && onSelectFileById(tgt.id)}
              className="p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 cursor-pointer hover:border-blue-400"
            >
              {tgt ? tgt.relativePath : selectedEdge.targetFileId}
            </div>
          </div>

          {selectedEdge.isCycle && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>This edge participates in a circular dependency group.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Selected file view
  const file = selectedFile!;

  return (
    <div className="fixed inset-x-0 bottom-14 md:bottom-0 md:static z-40 md:z-auto w-full md:w-80 max-h-[60vh] md:max-h-full bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-auto md:h-full overflow-hidden text-xs shadow-2xl md:shadow-none rounded-t-xl md:rounded-none animate-in slide-in-from-bottom md:animate-none duration-150">
      <div className="md:hidden flex justify-center pt-2 pb-0.5">
        <div className="w-8 h-1 bg-slate-300 rounded-full" />
      </div>
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-900 truncate font-mono">{file.filename}</span>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-white shrink-0">
        <button
          onClick={() => navigate(`/projects/${projectId}/files/${encodeURIComponent(file.relativePath)}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm font-medium transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View Code</span>
        </button>
        <button
          onClick={() => navigate(`/projects/${projectId}/impact?fileId=${file.id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-sm font-medium transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Trace Impact</span>
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Metadata */}
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">File Metadata</div>
          <div className="space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[11px]">
            <div className="break-all">{file.relativePath}</div>
            <div className="text-slate-500 pt-1 flex justify-between font-sans text-xs">
              <span>Lines: <strong className="text-slate-800 tabular-nums">{file.lineCount}</strong></span>
              <span>Size: <strong className="text-slate-800 tabular-nums">{(file.byteSize / 1024).toFixed(1)} KB</strong></span>
            </div>
          </div>
        </div>

        {/* Direct Dependencies (Outgoing) */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
            <span>Direct Imports ({dependencies.length})</span>
          </div>
          {dependencies.length === 0 ? (
            <div className="text-slate-400 italic py-1">No imports in this file.</div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {dependencies.map((dep) => {
                const target = dep.targetFileId ? allFilesMap.get(dep.targetFileId) : null;
                return (
                  <div
                    key={dep.id}
                    onClick={() => target && onSelectFileById(target.id)}
                    className={`p-1.5 rounded border text-[11px] font-mono transition-colors ${
                      target
                        ? 'bg-slate-50 border-slate-200 text-blue-700 hover:bg-blue-50 cursor-pointer'
                        : 'bg-white border-slate-100 text-slate-500'
                    }`}
                  >
                    <div className="truncate font-medium">{dep.specifier}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5 font-sans">
                      <span>{dep.kind}</span>
                      <span>{dep.resolutionStatus}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Direct Dependents (Incoming) */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
            <span>Imported By ({dependents.length})</span>
          </div>
          {dependents.length === 0 ? (
            <div className="text-slate-400 italic py-1">No other files import this file.</div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {dependents.map((dep) => (
                <div
                  key={dep.id}
                  onClick={() => onSelectFileById(dep.id)}
                  className="p-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 rounded text-[11px] font-mono text-teal-800 cursor-pointer transition-colors"
                >
                  <div className="truncate font-medium">{dep.filename}</div>
                  <div className="text-[10px] text-slate-400 truncate">{dep.relativePath}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exported Declarations */}
        {file.exports && file.exports.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
              Exported Symbols ({file.exports.length})
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {file.exports.map((exp, i) => (
                <div key={i} className="flex items-center justify-between p-1 bg-slate-50 rounded border border-slate-100 text-[11px]">
                  <span className="font-mono text-slate-800 truncate">{exp.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 capitalize">{exp.kind}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

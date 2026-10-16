import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileCode,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Folder,
  Layers,
  Zap,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { FileTree } from './FileTree';
import { CodeViewer } from './CodeViewer';
import type { SourceFileRecord } from '../../types/domain';

export function FileExplorerPage() {
  const { projectId, '*': wildcardPath } = useParams<{ projectId: string; '*': string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<SourceFileRecord | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectRepository.getFullProject(projectId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [projectId]);

  // Set initial selected file from wildcard or first file
  useEffect(() => {
    if (!data || data.files.length === 0) return;

    if (wildcardPath) {
      const decoded = decodeURIComponent(wildcardPath);
      const match = data.files.find(f => f.relativePath === decoded);
      if (match) {
        setSelectedFile(match);
        return;
      }
    }

    if (!selectedFile) {
      // Pick first source file (prefer App.tsx or index.ts)
      const preferred = data.files.find(
        f => f.filename === 'App.tsx' || f.filename === 'main.tsx' || f.filename === 'index.ts'
      ) || data.files[0];
      setSelectedFile(preferred);
    }
  }, [data, wildcardPath]);

  // Load file content whenever selectedFile changes
  useEffect(() => {
    if (!selectedFile || !projectId) {
      setFileContent(null);
      return;
    }

    setContentLoading(true);
    projectRepository.getFileContent(projectId, selectedFile.relativePath).then(content => {
      setFileContent(content);
      setContentLoading(false);
    });
  }, [selectedFile, projectId]);

  const allFilesMap = useMemo(() => {
    const map = new Map<string, SourceFileRecord>();
    if (data) {
      for (const f of data.files) map.set(f.id, f);
    }
    return map;
  }, [data]);

  // Direct outgoing dependencies
  const dependencies = useMemo(() => {
    if (!selectedFile || !data) return [];
    return data.dependencies.filter(d => d.sourceFileId === selectedFile.id);
  }, [selectedFile, data]);

  // Direct incoming dependents
  const dependents = useMemo(() => {
    if (!selectedFile || !data) return [];
    return data.edges
      .filter(e => e.targetFileId === selectedFile.id)
      .map(e => allFilesMap.get(e.sourceFileId)!)
      .filter(Boolean);
  }, [selectedFile, data, allFilesMap]);

  // Check cycle membership
  const isPartOfCycle = useMemo(() => {
    if (!selectedFile || !data) return false;
    return data.summary.circularGroups.some(g => g.fileIds.includes(selectedFile.id));
  }, [selectedFile, data]);

  const handleSelectFile = (file: SourceFileRecord) => {
    setSelectedFile(file);
    navigate(`/projects/${projectId}/files/${encodeURIComponent(file.relativePath)}`, {
      replace: true,
    });
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading file explorer...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-xs text-slate-400">Project data not found.</div>;
  }

  return (
    <div className="h-full flex overflow-hidden bg-white">
      {/* Left Column: File Tree */}
      <div className="w-68 border-r border-slate-200 h-full shrink-0 flex flex-col">
        <FileTree
          files={data.files}
          selectedFileId={selectedFile?.id}
          onSelectFile={handleSelectFile}
        />
      </div>

      {/* Center Column: Monaco Code Viewer */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {selectedFile ? (
          contentLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-mono">
              Reading file from IndexedDB...
            </div>
          ) : (
            <CodeViewer
              code={fileContent}
              relativePath={selectedFile.relativePath}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            Select a file from the tree to view source code.
          </div>
        )}
      </div>

      {/* Right Column: File Inspector */}
      {selectedFile && (
        <div className="w-80 border-l border-slate-200 h-full shrink-0 flex flex-col overflow-hidden bg-white text-xs">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="font-semibold text-slate-900 truncate font-mono">
              {selectedFile.filename}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded">
              {selectedFile.extension}
            </span>
          </div>

          <div className="p-4 space-y-5 overflow-y-auto flex-1">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate(`/projects/${projectId}/graph`)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Show in Graph</span>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/impact?fileId=${selectedFile.id}`)}
                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>Trace Impact</span>
              </button>
            </div>

            {/* Path & Stats */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Location & Size</div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[11px] text-slate-700 break-all space-y-1">
                <div>{selectedFile.relativePath}</div>
                <div className="text-slate-500 flex justify-between font-sans text-xs pt-1 border-t border-slate-200/60">
                  <span>Lines: <strong>{selectedFile.lineCount}</strong></span>
                  <span>Size: <strong>{(selectedFile.byteSize / 1024).toFixed(1)} KB</strong></span>
                </div>
              </div>
            </div>

            {/* Cycle Warning */}
            {isPartOfCycle && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Circular Dependency Detected</div>
                  <div className="text-[11px] mt-0.5">This file participates in a cyclic dependency loop.</div>
                </div>
              </div>
            )}

            {/* Direct Imports (Outgoing) */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
                <span>Static Imports ({dependencies.length})</span>
              </div>
              {dependencies.length === 0 ? (
                <div className="text-slate-400 italic py-1">No imports declared.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {dependencies.map(dep => {
                    const targetFile = dep.targetFileId ? allFilesMap.get(dep.targetFileId) : null;
                    return (
                      <div
                        key={dep.id}
                        onClick={() => targetFile && handleSelectFile(targetFile)}
                        className={`p-2 rounded border text-[11px] font-mono transition-colors ${
                          targetFile
                            ? 'bg-slate-50 border-slate-200 text-blue-700 hover:bg-blue-50 cursor-pointer'
                            : 'bg-white border-slate-100 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate font-semibold">{dep.specifier}</span>
                          {dep.line && <span className="text-[10px] text-slate-400">L{dep.line}</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1 font-sans">
                          <span className="capitalize">{dep.kind}</span>
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
                <div className="text-slate-400 italic py-1">No other files import this file directly.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {dependents.map(dept => (
                    <div
                      key={dept.id}
                      onClick={() => handleSelectFile(dept)}
                      className="p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 rounded text-[11px] font-mono text-teal-800 cursor-pointer transition-colors"
                    >
                      <div className="font-semibold truncate">{dept.filename}</div>
                      <div className="text-[10px] text-slate-400 truncate">{dept.relativePath}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exported Declarations */}
            {selectedFile.exports && selectedFile.exports.length > 0 && (
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
                  Exported Declarations ({selectedFile.exports.length})
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-[11px]">
                  {selectedFile.exports.map((exp, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-100 rounded">
                      <span className="text-slate-800 truncate">{exp.name}</span>
                      <span className="text-[10px] text-slate-400 font-sans capitalize">{exp.kind}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

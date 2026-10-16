import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderTree,
  Folder,
  FileCode,
  ArrowRight,
  ArrowLeft,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { aggregateModules } from '../../engine/graph/moduleAggregation';
import type { ModuleRecord, SourceFileRecord } from '../../types/domain';

export function ModulesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectRepository.getFullProject(projectId).then(res => {
      setData(res);
      if (res && res.modules.length > 0) {
        setSelectedModuleId(res.modules[0].id);
      }
      setLoading(false);
    });
  }, [projectId]);

  const { modules, moduleEdges, fileToModuleMap } = useMemo(() => {
    if (!data) return { modules: [], moduleEdges: [], fileToModuleMap: new Map() };
    return aggregateModules(data.project.id, data.files, data.edges);
  }, [data]);

  const allFilesMap = useMemo(() => {
    const map = new Map<string, SourceFileRecord>();
    if (data) {
      for (const f of data.files) map.set(f.id, f);
    }
    return map;
  }, [data]);

  const selectedModule = useMemo(() => {
    return modules.find(m => m.id === selectedModuleId) || modules[0] || null;
  }, [modules, selectedModuleId]);

  // Cross-module relationships for selected module
  const crossModuleOutgoing = useMemo(() => {
    if (!selectedModule) return [];
    return moduleEdges.filter(e => e.sourceModuleId === selectedModule.id);
  }, [moduleEdges, selectedModule]);

  const crossModuleIncoming = useMemo(() => {
    if (!selectedModule) return [];
    return moduleEdges.filter(e => e.targetModuleId === selectedModule.id);
  }, [moduleEdges, selectedModule]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading module subsystems...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-xs text-slate-400">Project data not found.</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Module Subsystems</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory-level architecture breakdown and cross-module coupling weights.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>{modules.length} Modules</span>
          <span>·</span>
          <span>{moduleEdges.length} Inter-Module Edges</span>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Module List */}
        <div className="w-80 border-r border-slate-200 bg-white h-full overflow-y-auto divide-y divide-slate-100">
          <div className="p-3 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Detected Modules ({modules.length})
          </div>
          {modules.map(mod => {
            const isSelected = mod.id === selectedModule?.id;
            return (
              <div
                key={mod.id}
                onClick={() => setSelectedModuleId(mod.id)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-l-3 border-blue-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-semibold text-xs text-slate-900">{mod.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {mod.fileIds.length} files
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                  {mod.relativePath}/
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Module Details & Inter-Module Edges */}
        {selectedModule ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {/* Module Overview Card */}
            <div className="p-6 bg-white border border-slate-200 rounded-sm shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">{selectedModule.name}</h2>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedModule.relativePath}/
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/projects/${data.project.id}/graph`)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-sm transition-colors flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>View in Graph</span>
                  </button>
                </div>
              </div>

              {/* Module stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs font-mono">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Indexed Files</div>
                  <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{selectedModule.fileIds.length}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Internal Edges</div>
                  <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{selectedModule.internalEdgeCount || 0}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Outgoing Cross-Calls</div>
                  <div className="text-xl font-bold text-blue-600 mt-1 tabular-nums">{selectedModule.outgoingCrossEdgeCount || 0}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Incoming Cross-Calls</div>
                  <div className="text-xl font-bold text-teal-600 mt-1 tabular-nums">{selectedModule.incomingCrossEdgeCount || 0}</div>
                </div>
              </div>
            </div>

            {/* Inter-Module Dependencies (Outgoing & Incoming) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Outgoing */}
              <div className="p-5 bg-white border border-slate-200 rounded-sm">
                <div className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>Depends on Modules ({crossModuleOutgoing.length})</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </div>
                {crossModuleOutgoing.length === 0 ? (
                  <div className="text-slate-400 text-xs italic py-2">Does not call other modules.</div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {crossModuleOutgoing.map(edge => {
                      const targetMod = modules.find(m => m.id === edge.targetModuleId);
                      return (
                        <div
                          key={edge.id}
                          onClick={() => targetMod && setSelectedModuleId(targetMod.id)}
                          className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="font-semibold text-slate-800">{targetMod?.name || edge.targetModuleId}</div>
                          <span className="font-mono text-blue-600 font-bold tabular-nums">
                            {edge.weight} {edge.weight === 1 ? 'call' : 'calls'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Incoming */}
              <div className="p-5 bg-white border border-slate-200 rounded-sm">
                <div className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>Called by Modules ({crossModuleIncoming.length})</span>
                  <ArrowLeft className="w-4 h-4 text-teal-600" />
                </div>
                {crossModuleIncoming.length === 0 ? (
                  <div className="text-slate-400 text-xs italic py-2">No other modules call into this module.</div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {crossModuleIncoming.map(edge => {
                      const srcMod = modules.find(m => m.id === edge.sourceModuleId);
                      return (
                        <div
                          key={edge.id}
                          onClick={() => srcMod && setSelectedModuleId(srcMod.id)}
                          className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 rounded flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="font-semibold text-slate-800">{srcMod?.name || edge.sourceModuleId}</div>
                          <span className="font-mono text-teal-700 font-bold tabular-nums">
                            {edge.weight} {edge.weight === 1 ? 'call' : 'calls'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Files inside this module */}
            <div className="p-5 bg-white border border-slate-200 rounded-sm">
              <div className="text-xs font-bold text-slate-900 mb-3">
                Files in {selectedModule.name} ({selectedModule.fileIds.length})
              </div>
              <div className="divide-y divide-slate-100 font-mono text-xs">
                {selectedModule.fileIds.map(fId => {
                  const file = allFilesMap.get(fId);
                  if (!file) return null;
                  return (
                    <div
                      key={file.id}
                      onClick={() => navigate(`/projects/${data.project.id}/files/${encodeURIComponent(file.relativePath)}`)}
                      className="py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate text-slate-800">{file.filename}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans tabular-nums shrink-0 ml-3">
                        {file.lineCount} lines · {(file.byteSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

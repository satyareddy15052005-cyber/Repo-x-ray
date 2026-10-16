import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  FileCode,
  Layers,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { buildAdjacencyMaps } from '../../engine/graph/adjacency';
import { traverseGraph } from '../../engine/graph/graphTraversal';
import { findShortestPath } from '../../engine/graph/shortestPath';
import type { SourceFileRecord } from '../../types/domain';

export function ImpactPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected seed files to compute blast radius
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [maxDepth, setMaxDepth] = useState<number>(Infinity);
  const [fileSearch, setFileSearch] = useState('');
  const [inspectTargetId, setInspectTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectRepository.getFullProject(projectId).then(res => {
      setData(res);
      // Pre-select file from query param if available
      const urlFileId = searchParams.get('fileId');
      if (urlFileId && res) {
        setSelectedFileIds(new Set([urlFileId]));
      } else if (res && res.files.length > 0) {
        // Default to a highly-depended file if present
        const top = res.summary.topFanIn[0];
        setSelectedFileIds(new Set([top ? top.fileId : res.files[0].id]));
      }
      setLoading(false);
    });
  }, [projectId, searchParams]);

  const allFilesMap = useMemo(() => {
    const map = new Map<string, SourceFileRecord>();
    if (data) {
      for (const f of data.files) map.set(f.id, f);
    }
    return map;
  }, [data]);

  // Precomputed reverse adjacency map (incoming edges)
  const { incoming, outgoing } = useMemo(() => {
    if (!data) return { incoming: new Map(), outgoing: new Map() };
    const allNodeIds = data.files.map(f => f.id);
    return buildAdjacencyMaps(allNodeIds, data.edges);
  }, [data]);

  // Traversal: Reverse dependents
  const impactResult = useMemo(() => {
    if (selectedFileIds.size === 0) {
      return { direct: [], transitive: [], all: [], depthMap: new Map() };
    }
    return traverseGraph(Array.from(selectedFileIds), incoming, maxDepth);
  }, [selectedFileIds, incoming, maxDepth]);

  // Shortest path to inspected target
  const shortestPath = useMemo(() => {
    if (!inspectTargetId || selectedFileIds.size === 0) return null;
    // Find path from any selected seed file to inspectTargetId
    // In our dependency graph, if file T depends on file S, edge is T -> S.
    // So to trace how S affects T, we traverse edges from T to S.
    for (const seed of selectedFileIds) {
      const path = findShortestPath(inspectTargetId, seed, outgoing);
      if (path) return path.reverse(); // Seed -> ... -> Target
    }
    return null;
  }, [inspectTargetId, selectedFileIds, outgoing]);

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFileList = useMemo(() => {
    if (!data) return [];
    if (!fileSearch.trim()) return data.files;
    const q = fileSearch.toLowerCase();
    return data.files.filter(f => f.filename.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q));
  }, [data, fileSearch]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading change impact explorer...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-xs text-slate-400">Project data not found.</div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span>Change Impact Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace downstream reverse dependencies to understand blast radius before refactoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Traversal Depth:</span>
          <select
            value={maxDepth === Infinity ? 'all' : String(maxDepth)}
            onChange={e => setMaxDepth(e.target.value === 'all' ? Infinity : Number(e.target.value))}
            aria-label="Traversal depth"
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-sm font-medium"
          >
            <option value="1">Direct Only (1-Level)</option>
            <option value="2">2-Levels Deep</option>
            <option value="3">3-Levels Deep</option>
            <option value="all">Full Transitive (All)</option>
          </select>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Source File Selector */}
        <div className="w-72 border-r border-slate-200 bg-white h-full flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fileSearch}
                onChange={e => setFileSearch(e.target.value)}
                placeholder="Search file to test..."
                className="w-full pl-7 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-sm"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{selectedFileIds.size} files selected</span>
              {selectedFileIds.size > 0 && (
                <button
                  onClick={() => setSelectedFileIds(new Set())}
                  className="text-blue-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 font-mono text-xs">
            {filteredFileList.map(f => {
              const isChecked = selectedFileIds.has(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() => toggleSelectFile(f.id)}
                  className={`p-2.5 flex items-center gap-2 cursor-pointer transition-colors ${
                    isChecked ? 'bg-blue-50/70 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{f.filename}</div>
                    <div className="text-[10px] text-slate-400 truncate">{f.relativePath}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Blast Radius Results */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Summary Box */}
          <div className="p-5 bg-white border border-slate-200 rounded-sm shadow-2xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Estimated Downstream Blast Radius
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
                {impactResult.all.length}
              </span>
              <span className="text-xs text-slate-500 font-sans">
                analyzed files potentially impacted by changes to selected source files
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-600">
              <div>
                Direct Dependents: <strong className="text-slate-900 font-mono">{impactResult.direct.length}</strong>
              </div>
              <div>
                Transitive Dependents: <strong className="text-blue-600 font-mono">{impactResult.transitive.length}</strong>
              </div>
            </div>
          </div>

          {/* Impact Chain Visualization / List */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Affected Downstream Files</h2>
              <span className="text-xs text-slate-400">Click any file to trace dependency path</span>
            </div>

            {impactResult.all.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                No downstream dependents found for the selected files.
              </div>
            ) : (
              <div className="space-y-2">
                {impactResult.all.map(fId => {
                  const file = allFilesMap.get(fId);
                  if (!file) return null;
                  const depth = impactResult.depthMap.get(fId) || 1;
                  const isInspected = inspectTargetId === fId;

                  return (
                    <div
                      key={fId}
                      onClick={() => setInspectTargetId(fId)}
                      className={`p-3 rounded-sm border cursor-pointer transition-colors flex items-center justify-between ${
                        isInspected
                          ? 'bg-blue-50 border-blue-500 text-blue-900'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCode className={`w-4 h-4 shrink-0 ${depth === 1 ? 'text-teal-600' : 'text-blue-600'}`} />
                        <div className="min-w-0 font-mono text-xs">
                          <span className="font-bold truncate">{file.filename}</span>
                          <span className="text-[11px] text-slate-400 ml-2 truncate hidden sm:inline">
                            {file.relativePath}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-sans px-2 py-0.5 rounded font-medium ${
                          depth === 1 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {depth === 1 ? 'Direct' : `Level ${depth}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Path Inspector */}
        <div className="w-80 border-l border-slate-200 bg-white h-full p-4 overflow-y-auto shrink-0 text-xs">
          <div className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
            Impact Path Inspection
          </div>

          {inspectTargetId ? (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Target File</div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-semibold text-slate-900">
                  {allFilesMap.get(inspectTargetId)?.relativePath || inspectTargetId}
                </div>
              </div>

              {shortestPath && (
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                    Shortest Dependency Path ({shortestPath.length - 1} hops)
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {shortestPath.map((pId, idx) => {
                      const f = allFilesMap.get(pId);
                      const isSeed = idx === 0;
                      const isTarget = idx === shortestPath.length - 1;

                      return (
                        <div key={pId}>
                          <div className={`p-2 rounded border ${
                            isSeed ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' :
                            isTarget ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold' :
                            'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="truncate">{f?.filename || pId}</span>
                              <span className="text-[10px] text-slate-400 font-sans">
                                {isSeed ? 'Origin' : isTarget ? 'Impacted' : `Hop ${idx}`}
                              </span>
                            </div>
                          </div>
                          {idx < shortestPath.length - 1 && (
                            <div className="flex justify-center text-slate-300 my-0.5">
                              <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    const f = allFilesMap.get(inspectTargetId);
                    if (f) navigate(`/projects/${projectId}/files/${encodeURIComponent(f.relativePath)}`);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Code</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12">
              Click any affected file from the list to display its exact propagation chain.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

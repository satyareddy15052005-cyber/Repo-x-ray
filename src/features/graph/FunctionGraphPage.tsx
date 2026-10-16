import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Code,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  Layers,
  FileCode,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import type { FunctionRecord, FunctionCallEdge, ProjectRecord } from '../../types/domain';
import { FunctionNode } from './nodes/FunctionNode';

const nodeTypes = {
  functionNode: FunctionNode as any,
};

export function FunctionGraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [functions, setFunctions] = useState<FunctionRecord[]>([]);
  const [callEdges, setCallEdges] = useState<FunctionCallEdge[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<string>('all');
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && !isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, handleToggleFullscreen]);

  useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId]);

  async function loadData() {
    if (!projectId) return;
    setLoading(true);
    try {
      const p = await projectRepository.getProject(projectId);
      setProject(p || null);
      const fns = await projectRepository.getFunctions(projectId);
      const calls = await projectRepository.getFunctionCalls(projectId);
      setFunctions(fns);
      setCallEdges(calls);
    } finally {
      setLoading(false);
    }
  }

  // Unique files for dropdown filter
  const uniqueFiles = useMemo(() => {
    const set = new Set<string>();
    for (const f of functions) set.add(f.relativePath);
    return Array.from(set).sort();
  }, [functions]);

  // Filter functions
  const filteredFunctions = useMemo(() => {
    return functions.filter(fn => {
      if (selectedType !== 'all' && fn.declarationType !== selectedType) return false;
      if (selectedFile !== 'all' && fn.relativePath !== selectedFile) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          fn.name.toLowerCase().includes(q) ||
          fn.relativePath.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [functions, selectedType, selectedFile, searchQuery]);

  const filteredFunctionIds = useMemo(() => {
    return new Set(filteredFunctions.map(f => f.id));
  }, [filteredFunctions]);

  // Build React Flow Nodes & Edges with grid/hierarchical placement
  useEffect(() => {
    if (filteredFunctions.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Grid layout for function nodes grouped by file
    const fileGroups = new Map<string, FunctionRecord[]>();
    for (const fn of filteredFunctions) {
      let list = fileGroups.get(fn.relativePath);
      if (!list) {
        list = [];
        fileGroups.set(fn.relativePath, list);
      }
      list.push(fn);
    }

    const flowNodes: Node[] = [];
    let col = 0;
    const colWidth = 300;
    const rowHeight = 130;

    for (const [_, fnsInFile] of fileGroups.entries()) {
      fnsInFile.forEach((fn, row) => {
        flowNodes.push({
          id: fn.id,
          type: 'functionNode',
          position: { x: col * colWidth, y: row * rowHeight },
          data: {
            fn,
            isSelected: fn.id === selectedFunctionId,
          },
        });
      });
      col++;
    }

    // Filter edges: only connect if both endpoints exist in current filtered functions
    const flowEdges: Edge[] = callEdges
      .filter(
        e =>
          filteredFunctionIds.has(e.sourceFunctionId) &&
          filteredFunctionIds.has(e.targetFunctionId)
      )
      .map(e => {
        const isHighlight =
          selectedFunctionId &&
          (e.sourceFunctionId === selectedFunctionId ||
            e.targetFunctionId === selectedFunctionId);

        return {
          id: e.id,
          source: e.sourceFunctionId,
          target: e.targetFunctionId,
          type: 'smoothstep',
          animated: isHighlight || false,
          style: {
            stroke: isHighlight ? '#2563eb' : '#94a3b8',
            strokeWidth: isHighlight ? 2.5 : 1.2,
            strokeDasharray: e.confidence === 'imported-resolved' ? '4 2' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isHighlight ? '#2563eb' : '#94a3b8',
            width: 14,
            height: 14,
          },
        };
      });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [filteredFunctions, callEdges, selectedFunctionId, filteredFunctionIds]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedFunctionId(node.id === selectedFunctionId ? null : node.id);
  }, [selectedFunctionId]);

  const selectedFunction = useMemo(() => {
    return functions.find(f => f.id === selectedFunctionId) || null;
  }, [functions, selectedFunctionId]);

  // Callers (incoming) & Callees (outgoing) for inspector
  const { callers, callees } = useMemo(() => {
    if (!selectedFunctionId) return { callers: [], callees: [] };

    const callersList: FunctionRecord[] = [];
    const calleesList: FunctionRecord[] = [];

    for (const e of callEdges) {
      if (e.targetFunctionId === selectedFunctionId) {
        const src = functions.find(f => f.id === e.sourceFunctionId);
        if (src) callersList.push(src);
      }
      if (e.sourceFunctionId === selectedFunctionId) {
        const tgt = functions.find(f => f.id === e.targetFunctionId);
        if (tgt) calleesList.push(tgt);
      }
    }

    return { callers: callersList, callees: calleesList };
  }, [selectedFunctionId, callEdges, functions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Loading function call graph...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-slate-50 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen bg-[#F8FAFC]' : 'relative'
      }`}
    >
      {/* Top Toolbar */}
      <div className="p-2 sm:p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to={`/projects/${projectId}/graph`}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">File Graph</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Code className="w-4 h-4 text-blue-600" />
            <h1 className="text-xs sm:text-sm font-bold text-slate-900">
              Function Graph
            </h1>
            <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-medium">
              {filteredFunctions.length} / {functions.length}
            </span>
          </div>
        </div>

        {/* Filter Controls & Fullscreen */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search functions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 w-32 sm:w-44"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="hidden sm:block px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="function">Function Declarations</option>
            <option value="arrow">Arrow Functions</option>
            <option value="class-method">Class Methods</option>
            <option value="method">Object Methods</option>
          </select>

          {/* File Filter */}
          <select
            value={selectedFile}
            onChange={e => setSelectedFile(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500 max-w-[120px] sm:max-w-[160px] truncate"
          >
            <option value="all">All Files ({uniqueFiles.length})</option>
            {uniqueFiles.map(file => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen View"}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
              isFullscreen
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-600" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          {(searchQuery || selectedType !== 'all' || selectedFile !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedFile('all');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-1.5 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas & Inspector Split */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 h-full relative">
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen View"}
            className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white/95 hover:bg-white text-slate-800 hover:text-blue-600 rounded-sm border border-slate-200 shadow-md text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          {filteredFunctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Code className="w-8 h-8 text-slate-300" />
              <div className="text-sm font-medium">No functions match the active filters</div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedFile('all');
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              minZoom={0.15}
              maxZoom={2}
            >
              <Background color="#cbd5e1" gap={20} size={1} />
              <Controls showInteractive={false} position="bottom-left" />
              <MiniMap
                position="bottom-right"
                nodeStrokeColor="#94a3b8"
                nodeColor="#e2e8f0"
                className="hidden! sm:block! border border-slate-200 rounded shadow-xs"
              />
            </ReactFlow>
          )}
        </div>

        {/* Selected Function Inspector Sidebar */}
        {selectedFunction && (
          <div className="fixed inset-x-0 bottom-14 md:bottom-0 md:static z-40 md:z-auto w-full md:w-80 max-h-[60vh] md:max-h-full bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-auto md:h-full shadow-2xl md:shadow-none rounded-t-xl md:rounded-none animate-in slide-in-from-bottom md:animate-none">
            <div className="md:hidden flex justify-center pt-2 pb-0.5">
              <div className="w-8 h-1 bg-slate-300 rounded-full" />
            </div>
            <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                  Function Details
                </span>
                <h3 className="font-mono text-sm font-bold text-slate-900 truncate max-w-[220px]">
                  {selectedFunction.name}()
                </h3>
              </div>
              <button
                onClick={() => setSelectedFunctionId(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Properties */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">File:</span>
                  <span className="font-mono text-slate-900 truncate max-w-[160px]" title={selectedFunction.relativePath}>
                    {selectedFunction.relativePath}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lines:</span>
                  <span className="font-mono text-slate-900">
                    L{selectedFunction.lineStart} - L{selectedFunction.lineEnd}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Declaration:</span>
                  <span className="font-medium text-slate-900 uppercase text-[10px]">
                    {selectedFunction.declarationType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Parameters:</span>
                  <span className="font-mono text-slate-900">{selectedFunction.parametersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exported:</span>
                  <span className="font-medium text-slate-900">
                    {selectedFunction.isExported ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Jump to Code Button */}
              <button
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/files?file=${encodeURIComponent(
                      selectedFunction.relativePath
                    )}&line=${selectedFunction.lineStart}`
                  )
                }
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                Open in Monaco Viewer
              </button>

              {/* Callers (Functions calling this function) */}
              <div>
                <div className="font-semibold text-slate-900 mb-1.5 flex items-center justify-between">
                  <span>Called By ({callers.length})</span>
                </div>
                {callers.length === 0 ? (
                  <div className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded">
                    No detected internal callers in this project.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {callers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedFunctionId(c.id)}
                        className="w-full text-left p-2 rounded border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                      >
                        <div className="font-mono font-bold text-slate-900 truncate">
                          {c.name}()
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {c.relativePath} (L{c.lineStart})
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Callees (Functions called by this function) */}
              <div>
                <div className="font-semibold text-slate-900 mb-1.5 flex items-center justify-between">
                  <span>Calls ({callees.length})</span>
                </div>
                {callees.length === 0 ? (
                  <div className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded">
                    No internal function calls detected in this function body.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {callees.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedFunctionId(c.id)}
                        className="w-full text-left p-2 rounded border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                      >
                        <div className="font-mono font-bold text-slate-900 truncate">
                          {c.name}()
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {c.relativePath} (L{c.lineStart})
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

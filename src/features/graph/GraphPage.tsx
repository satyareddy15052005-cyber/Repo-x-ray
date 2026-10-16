import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  FileCode,
  Download,
  AlertCircle,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { computeHierarchicalLayout, type LayoutDirection } from '../../engine/graph/graphLayout';
import { buildAdjacencyMaps } from '../../engine/graph/adjacency';
import { findShortestPath } from '../../engine/graph/shortestPath';
import { graphPositionsStorage } from '../../services/graphPositionsStorage';
import { useReanalyzeStore } from '../../stores/useReanalyzeStore';
import { DependencyCanvas } from './DependencyCanvas';
import { GraphToolbar, type AdvancedFilterState } from './GraphToolbar';
import { GraphInspector } from './GraphInspector';
import { FileTree } from '../explorer/FileTree';
import type { SourceFileRecord, DependencyEdge } from '../../types/domain';
import { Zap, X, Route } from 'lucide-react';

export function GraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const openReanalyze = useReanalyzeStore((s) => s.openReanalyze);

  // Persistent stored positions state
  const [storedPositions, setStoredPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Layout & filter state
  const [direction, setDirection] = useState<LayoutDirection>('LR');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightCycles, setHighlightCycles] = useState(false);

  const INITIAL_ADVANCED_FILTERS: AdvancedFilterState = {
    extension: '',
    folder: '',
    moduleId: '',
    findingType: 'all',
    importType: 'all',
    minFanIn: 0,
    minFanOut: 0,
    onlyCycles: false,
    isolateMode: 'none',
  };

  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(INITIAL_ADVANCED_FILTERS);

  // Shortest Path Finder state
  const [isPathFinderOpen, setIsPathFinderOpen] = useState(false);
  const [pathStartId, setPathStartId] = useState('');
  const [pathTargetId, setPathTargetId] = useState('');
  const [highlightedPathNodeIds, setHighlightedPathNodeIds] = useState<Set<string> | null>(null);
  const [pathEdgeIds, setPathEdgeIds] = useState<Set<string> | null>(null);
  const [pathResultSummary, setPathResultSummary] = useState<string | null>(null);

  // Collapsible panels
  const [showFileTree, setShowFileTree] = useState(true);
  const [showInspector, setShowInspector] = useState(true);

  // Selection
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // React Flow instance reference
  const reactFlowInstance = useRef<any>(null);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.2, duration: 400 });
    }
  }, []);

  const loadProjectData = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    projectRepository.getFullProject(projectId).then(res => {
      if (res) {
        setData(res);
        let positions = graphPositionsStorage.getStoredPositions(projectId);
        if (!positions || Object.keys(positions).length === 0) {
          // Calculate initial layout for ALL source files in the project
          const allNodeIds = res.files.map(f => f.id);
          const computedLayout = computeHierarchicalLayout(allNodeIds, res.edges, direction);
          positions = {};
          computedLayout.forEach((pos, id) => {
            positions![id] = pos;
          });
          graphPositionsStorage.saveStoredPositions(projectId, positions);
        }
        setStoredPositions(positions);
      }
      setLoading(false);
    });
  }, [projectId, direction]);

  useEffect(() => {
    loadProjectData();

    const handleReanalyzed = (e: Event) => {
      const custom = e as CustomEvent<{ projectId: string }>;
      if (custom.detail?.projectId === projectId) {
        loadProjectData();
      }
    };

    window.addEventListener('project-reanalyzed', handleReanalyzed);
    return () => window.removeEventListener('project-reanalyzed', handleReanalyzed);
  }, [loadProjectData, projectId]);

  const handleResetLayout = useCallback(() => {
    if (!data || !projectId) return;
    const allNodeIds = data.files.map(f => f.id);
    const computedLayout = computeHierarchicalLayout(allNodeIds, data.edges, direction);
    const newPositions: Record<string, { x: number; y: number }> = {};
    computedLayout.forEach((pos, id) => {
      newPositions[id] = pos;
    });
    graphPositionsStorage.saveStoredPositions(projectId, newPositions);
    setStoredPositions(newPositions);
    setSelectedFileId(null);
    setSearchQuery('');
    setAdvancedFilters(INITIAL_ADVANCED_FILTERS);
    setTimeout(() => {
      handleFitView();
    }, 60);
  }, [data, projectId, direction, handleFitView]);

  const handleDirectionChange = useCallback((newDir: LayoutDirection) => {
    setDirection(newDir);
    if (!data || !projectId) return;
    const allNodeIds = data.files.map(f => f.id);
    const computedLayout = computeHierarchicalLayout(allNodeIds, data.edges, newDir);
    const newPositions: Record<string, { x: number; y: number }> = {};
    computedLayout.forEach((pos, id) => {
      newPositions[id] = pos;
    });
    graphPositionsStorage.saveStoredPositions(projectId, newPositions);
    setStoredPositions(newPositions);
    setTimeout(() => {
      handleFitView();
    }, 60);
  }, [data, projectId, handleFitView]);

  const handleNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    if (!projectId) return;
    graphPositionsStorage.updateNodePosition(projectId, node.id, node.position);
    setStoredPositions(prev => ({
      ...prev,
      [node.id]: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
    }));
  }, [projectId]);

  // Maps for quick lookup
  const allFilesMap = useMemo(() => {
    const map = new Map<string, SourceFileRecord>();
    if (data) {
      for (const f of data.files) map.set(f.id, f);
    }
    return map;
  }, [data]);

  const cycleNodeSet = useMemo(() => {
    const set = new Set<string>();
    if (data) {
      for (const group of data.summary.circularGroups) {
        for (const fId of group.fileIds) set.add(fId);
      }
    }
    return set;
  }, [data]);

  // Extensions list
  const availableExtensions = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const f of data.files) {
      if (f.extension) set.add(f.extension);
    }
    return Array.from(set).sort();
  }, [data]);

  // Available Folders list
  const availableFolders = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const f of data.files) {
      const parts = f.relativePath.split('/');
      if (parts.length > 1) {
        set.add(parts.slice(0, -1).join('/'));
      }
    }
    return Array.from(set).sort();
  }, [data]);

  // Available Modules
  const availableModules = useMemo(() => {
    if (!data) return [];
    return data.modules.map(m => ({ id: m.id, name: m.name }));
  }, [data]);

  // Fan-in count map
  const fanInMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data) {
      for (const e of data.edges) {
        map.set(e.targetFileId, (map.get(e.targetFileId) || 0) + 1);
      }
    }
    return map;
  }, [data]);

  // Finding files sets (Dead code, Violations, High risk)
  const deadCodeFileIds = useMemo(() => {
    const set = new Set<string>();
    if (data && data.deadCodeFindings) {
      for (const d of data.deadCodeFindings) set.add(d.fileId);
    }
    return set;
  }, [data]);

  const violationFileIds = useMemo(() => {
    const set = new Set<string>();
    if (data && data.ruleViolations) {
      for (const v of data.ruleViolations) {
        set.add(v.sourceFileId);
        if (v.targetFileId) set.add(v.targetFileId);
      }
    }
    return set;
  }, [data]);

  const highRiskFileIds = useMemo(() => {
    const set = new Set<string>();
    if (data) {
      // High fan-in or cycle files
      for (const item of data.summary.topFanIn.slice(0, 5)) {
        set.add(item.fileId);
      }
      for (const g of data.summary.circularGroups) {
        for (const id of g.fileIds) set.add(id);
      }
    }
    return set;
  }, [data]);

  // Outgoing and incoming neighbors of selected node
  const activeRelationships = useMemo(() => {
    if (!selectedFileId || !data) {
      return { dependencies: new Set<string>(), dependents: new Set<string>() };
    }
    const dependencies = new Set<string>();
    const dependents = new Set<string>();

    for (const e of data.edges) {
      if (e.sourceFileId === selectedFileId) {
        dependencies.add(e.targetFileId);
      }
      if (e.targetFileId === selectedFileId) {
        dependents.add(e.sourceFileId);
      }
    }

    return { dependencies, dependents };
  }, [selectedFileId, data]);

  // Isolation sets when isolateMode is active
  const isolatedNodeIds = useMemo(() => {
    if (!data || !selectedFileId || advancedFilters.isolateMode === 'none') {
      return null;
    }
    const result = new Set<string>([selectedFileId]);

    if (advancedFilters.isolateMode === 'neighbors') {
      for (const id of activeRelationships.dependencies) result.add(id);
      for (const id of activeRelationships.dependents) result.add(id);
    } else if (advancedFilters.isolateMode === 'upstream') {
      // BFS upstream: files that selectedFileId depends on
      const q = [selectedFileId];
      while (q.length > 0) {
        const curr = q.shift()!;
        for (const e of data.edges) {
          if (e.sourceFileId === curr && !result.has(e.targetFileId)) {
            result.add(e.targetFileId);
            q.push(e.targetFileId);
          }
        }
      }
    } else if (advancedFilters.isolateMode === 'downstream') {
      // BFS downstream: files that depend on selectedFileId
      const q = [selectedFileId];
      while (q.length > 0) {
        const curr = q.shift()!;
        for (const e of data.edges) {
          if (e.targetFileId === curr && !result.has(e.sourceFileId)) {
            result.add(e.sourceFileId);
            q.push(e.sourceFileId);
          }
        }
      }
    }

    return result;
  }, [data, selectedFileId, advancedFilters.isolateMode, activeRelationships]);

  // Filtered files (comprehensive multi-filter)
  const filteredFiles = useMemo(() => {
    if (!data) return [];
    return data.files.filter(f => {
      // Isolation filter
      if (isolatedNodeIds && !isolatedNodeIds.has(f.id)) return false;

      // Extension filter
      if (advancedFilters.extension && f.extension !== advancedFilters.extension) return false;

      // Folder filter
      if (advancedFilters.folder && !f.relativePath.startsWith(advancedFilters.folder)) return false;

      // Module filter
      if (advancedFilters.moduleId && f.moduleId !== advancedFilters.moduleId) return false;

      // Only Cycles filter
      if (advancedFilters.onlyCycles && !cycleNodeSet.has(f.id)) return false;

      // Min Fan-In filter
      if (advancedFilters.minFanIn > 0 && (fanInMap.get(f.id) || 0) < advancedFilters.minFanIn) {
        return false;
      }

      // Finding Type filter
      if (advancedFilters.findingType === 'dead-code' && !deadCodeFileIds.has(f.id)) return false;
      if (advancedFilters.findingType === 'violations' && !violationFileIds.has(f.id)) return false;
      if (advancedFilters.findingType === 'high-risk' && !highRiskFileIds.has(f.id)) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return f.filename.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q);
      }

      return true;
    });
  }, [
    data,
    isolatedNodeIds,
    advancedFilters,
    cycleNodeSet,
    fanInMap,
    deadCodeFileIds,
    violationFileIds,
    highRiskFileIds,
    searchQuery,
  ]);

  // Build React Flow nodes and edges using stable stored positions
  useEffect(() => {
    if (!data) return;

    const visibleNodeIds = new Set(filteredFiles.map(f => f.id));
    const isNodeSelected = !!selectedFileId;

    const rfNodes: Node[] = filteredFiles.map(file => {
      // Use locked/stored position so the node NEVER shifts or jumps once generated
      const pos = storedPositions[file.id] || { x: 0, y: 0 };
      const isSelected = file.id === selectedFileId;
      const isDep = activeRelationships.dependencies.has(file.id);
      const isDept = activeRelationships.dependents.has(file.id);
      const isCycle = cycleNodeSet.has(file.id);

      const isPathNode = highlightedPathNodeIds ? highlightedPathNodeIds.has(file.id) : false;
      const isDimmed = highlightedPathNodeIds
        ? !isPathNode
        : isNodeSelected && !isSelected && !isDep && !isDept;

      return {
        id: file.id,
        type: 'fileNode',
        position: pos,
        data: {
          id: file.id,
          filename: file.filename,
          relativePath: file.relativePath,
          extension: file.extension,
          importsCount: data.dependencies.filter(d => d.sourceFileId === file.id).length,
          dependentsCount: data.edges.filter(e => e.targetFileId === file.id).length,
          isCycle: highlightCycles ? isCycle : isCycle,
          isSelected,
          isDependency: isDep,
          isDependent: isDept,
          isDimmed,
          isPathNode,
        },
      };
    });

    const rfEdges: Edge[] = [];
    for (const edge of data.edges) {
      if (!visibleNodeIds.has(edge.sourceFileId) || !visibleNodeIds.has(edge.targetFileId)) {
        continue;
      }

      const isSelectedEdge = edge.id === selectedEdgeId;
      const isOutgoingFromSelected = edge.sourceFileId === selectedFileId;
      const isIncomingToSelected = edge.targetFileId === selectedFileId;
      const isPathEdge = pathEdgeIds ? pathEdgeIds.has(edge.id) : false;

      let strokeColor = '#94a3b8';
      let strokeWidth = 1.5;

      if (isPathEdge) {
        strokeColor = '#9333ea';
        strokeWidth = 3;
      } else if (highlightedPathNodeIds) {
        strokeColor = '#e2e8f0';
        strokeWidth = 1;
      } else if (isSelectedEdge) {
        strokeColor = '#2563eb';
        strokeWidth = 2.5;
      } else if (isOutgoingFromSelected) {
        strokeColor = '#3b82f6';
        strokeWidth = 2;
      } else if (isIncomingToSelected) {
        strokeColor = '#0d9488';
        strokeWidth = 2;
      } else if (edge.isCycle && highlightCycles) {
        strokeColor = '#d97706';
        strokeWidth = 2;
      } else if (isNodeSelected) {
        strokeColor = '#e2e8f0';
        strokeWidth = 1;
      }

      rfEdges.push({
        id: edge.id,
        source: edge.sourceFileId,
        target: edge.targetFileId,
        style: { stroke: strokeColor, strokeWidth },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
      });
    }

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [
    data,
    filteredFiles,
    storedPositions,
    selectedFileId,
    selectedEdgeId,
    activeRelationships,
    cycleNodeSet,
    highlightCycles,
    highlightedPathNodeIds,
    pathEdgeIds,
    setNodes,
    setEdges,
  ]);

  // Click handlers
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedFileId(node.id);
    setSelectedEdgeId(null);
    setShowInspector(true);
  }, []);

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!data) return;
    const file = allFilesMap.get(node.id);
    if (file) {
      navigate(`/projects/${data.project.id}/files/${encodeURIComponent(file.relativePath)}`);
    }
  }, [data, allFilesMap, navigate]);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedFileId(null);
    setShowInspector(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedFileId(null);
    setSelectedEdgeId(null);
  }, []);

  // Export SVG of graph
  const handleExportSvg = useCallback(() => {
    const svgElem = document.querySelector('.react-flow__viewport');
    if (!svgElem) return;

    // Create standalone SVG wrapper
    const bbox = (svgElem as HTMLElement).getBoundingClientRect();
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(bbox.width * 2)}" height="${Math.round(bbox.height * 2)}">
      <style>
        text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      </style>
      <rect width="100%" height="100%" fill="#F8FAFC" />
      ${svgElem.innerHTML}
    </svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data?.project.name || 'codebase'}-architecture-graph.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  // Shortest Path calculations
  const handleCalculateShortestPath = useCallback(() => {
    if (!data || !pathStartId || !pathTargetId) return;
    const path = findShortestPath(pathStartId, pathTargetId, data.edges);
    if (!path || path.length === 0) {
      setHighlightedPathNodeIds(null);
      setPathEdgeIds(null);
      setPathResultSummary('No dependency path exists between the selected files.');
      return;
    }

    const nodeSet = new Set(path);
    setHighlightedPathNodeIds(nodeSet);

    const edgeSet = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const matchingEdge = data.edges.find(e => e.sourceFileId === u && e.targetFileId === v);
      if (matchingEdge) edgeSet.add(matchingEdge.id);
    }
    setPathEdgeIds(edgeSet);

    const startFile = allFilesMap.get(pathStartId)?.filename || pathStartId;
    const targetFile = allFilesMap.get(pathTargetId)?.filename || pathTargetId;
    setPathResultSummary(`Found path (${path.length} hops): ${startFile} ➔ ${targetFile}`);
  }, [data, pathStartId, pathTargetId, allFilesMap]);

  const handleClearPath = useCallback(() => {
    setHighlightedPathNodeIds(null);
    setPathEdgeIds(null);
    setPathResultSummary(null);
    setPathStartId('');
    setPathTargetId('');
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading interactive graph canvas...</div>;
  }

  if (!data) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto stroke-1" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <button onClick={() => navigate('/projects')} className="px-4 py-2 bg-blue-600 text-white rounded-sm text-xs font-semibold">
          Return to My Projects
        </button>
      </div>
    );
  }

  const selectedFile = selectedFileId ? allFilesMap.get(selectedFileId) || null : null;
  const selectedEdge = selectedEdgeId ? data.edges.find(e => e.id === selectedEdgeId) || null : null;

  // Selected file dependencies
  const fileDeps = selectedFileId
    ? data.dependencies.filter(d => d.sourceFileId === selectedFileId)
    : [];

  const fileDependents = selectedFileId
    ? data.edges
        .filter(e => e.targetFileId === selectedFileId)
        .map(e => allFilesMap.get(e.sourceFileId)!)
        .filter(Boolean)
    : [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Top Graph Toolbar */}
      <GraphToolbar
        onFitView={handleFitView}
        onResetLayout={handleResetLayout}
        direction={direction}
        onDirectionChange={handleDirectionChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        onResetFilters={() => setAdvancedFilters(INITIAL_ADVANCED_FILTERS)}
        availableExtensions={availableExtensions}
        availableFolders={availableFolders}
        availableModules={availableModules}
        highlightCycles={highlightCycles}
        onToggleHighlightCycles={() => setHighlightCycles(prev => !prev)}
        onExportSvg={handleExportSvg}
        onReanalyze={() => openReanalyze(data.project.id, data.project.name, data.project.sourceType)}
        onOpenFunctionGraph={() => navigate(`/projects/${projectId}/functions`)}
        onOpenShortestPath={() => setIsPathFinderOpen(true)}
        totalNodes={data.files.length}
        visibleNodes={filteredFiles.length}
      />

      {/* 3-Column Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: File Tree */}
        {showFileTree && (
          <div className="w-64 border-r border-slate-200 h-full shrink-0 hidden md:block">
            <FileTree
              files={data.files}
              selectedFileId={selectedFileId}
              onSelectFile={f => {
                setSelectedFileId(f.id);
                setSelectedEdgeId(null);
                setShowInspector(true);
              }}
            />
          </div>
        )}

        {/* Center Column: React Flow Canvas */}
        <div className="flex-1 h-full relative overflow-hidden">
          {/* Floating Path Banner */}
          {pathResultSummary && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-xs border border-purple-300 shadow-md rounded-full px-4 py-1.5 flex items-center gap-2 text-xs">
              <Route className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="font-medium text-slate-800">{pathResultSummary}</span>
              <button
                onClick={() => setIsPathFinderOpen(true)}
                className="ml-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 underline"
              >
                Change
              </button>
              <button
                onClick={handleClearPath}
                className="ml-1 text-slate-400 hover:text-slate-600"
                title="Clear path highlight"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <DependencyCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            onNodeDragStop={handleNodeDragStop}
            selectedNodeId={selectedFileId}
            onInit={(instance) => {
              reactFlowInstance.current = instance;
              // Initial fit on load
              instance.fitView({ padding: 0.2, duration: 400 });
            }}
          />
        </div>

        {/* Right Column: Inspector Panel */}
        {showInspector && (
          <GraphInspector
            selectedFile={selectedFile}
            selectedEdge={selectedEdge}
            dependencies={fileDeps}
            dependents={fileDependents}
            allFilesMap={allFilesMap}
            projectId={data.project.id}
            onClose={() => {
              setSelectedFileId(null);
              setSelectedEdgeId(null);
            }}
            onSelectFileById={id => setSelectedFileId(id)}
          />
        )}
      </div>

      {/* Shortest Path Finder Modal */}
      {isPathFinderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-600">
                <Route className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Find Shortest Dependency Path</h3>
              </div>
              <button
                onClick={() => setIsPathFinderOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Determine the shortest directed import chain between any two files in your codebase using breadth-first traversal.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Source File (Origin / Importer)
                  </label>
                  <select
                    value={pathStartId}
                    onChange={e => setPathStartId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select origin source file...</option>
                    {data.files.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.relativePath}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Destination File (Target / Dependency)
                  </label>
                  <select
                    value={pathTargetId}
                    onChange={e => setPathTargetId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select destination target file...</option>
                    {data.files.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.relativePath}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {pathResultSummary && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-sm text-purple-900 text-[11px] flex items-center justify-between">
                  <span>{pathResultSummary}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {highlightedPathNodeIds ? (
                <button
                  type="button"
                  onClick={handleClearPath}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Clear Path
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPathFinderOpen(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm text-xs font-semibold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!pathStartId || !pathTargetId}
                  onClick={() => {
                    handleCalculateShortestPath();
                    setIsPathFinderOpen(false);
                  }}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>Trace Shortest Path</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

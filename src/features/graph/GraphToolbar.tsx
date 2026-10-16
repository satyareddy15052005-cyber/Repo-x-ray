import React, { useState } from 'react';
import {
  Maximize2,
  RotateCw,
  Search,
  Filter,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  SlidersHorizontal,
  Code,
  X,
  Layers,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import type { LayoutDirection } from '../../engine/graph/graphLayout';

export type IsolateMode = 'none' | 'neighbors' | 'upstream' | 'downstream';

export interface AdvancedFilterState {
  extension: string;
  folder: string;
  moduleId: string;
  findingType: 'all' | 'dead-code' | 'violations' | 'high-risk';
  importType: 'all' | 'runtime-only' | 'type-only';
  minFanIn: number;
  minFanOut: number;
  onlyCycles: boolean;
  isolateMode: IsolateMode;
}

interface GraphToolbarProps {
  onFitView: () => void;
  onResetLayout: () => void;
  direction: LayoutDirection;
  onDirectionChange: (dir: LayoutDirection) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters: AdvancedFilterState;
  onFiltersChange: (f: AdvancedFilterState) => void;
  onResetFilters: () => void;
  availableExtensions: string[];
  availableFolders: string[];
  availableModules: Array<{ id: string; name: string }>;
  highlightCycles: boolean;
  onToggleHighlightCycles: () => void;
  onExportSvg: () => void;
  onReanalyze?: () => void;
  onOpenFunctionGraph?: () => void;
  onOpenShortestPath?: () => void;
  totalNodes: number;
  visibleNodes: number;
}

export function GraphToolbar({
  onFitView,
  onResetLayout,
  direction,
  onDirectionChange,
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onResetFilters,
  availableExtensions,
  availableFolders,
  availableModules,
  highlightCycles,
  onToggleHighlightCycles,
  onExportSvg,
  onReanalyze,
  onOpenFunctionGraph,
  onOpenShortestPath,
  totalNodes,
  visibleNodes,
}: GraphToolbarProps) {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Count active non-default filters
  const activeFilterCount =
    (filters.extension ? 1 : 0) +
    (filters.folder ? 1 : 0) +
    (filters.moduleId ? 1 : 0) +
    (filters.findingType !== 'all' ? 1 : 0) +
    (filters.importType !== 'all' ? 1 : 0) +
    (filters.minFanIn > 0 ? 1 : 0) +
    (filters.minFanOut > 0 ? 1 : 0) +
    (filters.onlyCycles ? 1 : 0) +
    (filters.isolateMode !== 'none' ? 1 : 0);

  return (
    <div className="flex flex-col bg-white border-b border-slate-200 text-sm z-20 shrink-0">
      {/* Primary Toolbar Row */}
      <div className="h-13 px-4 flex items-center justify-between gap-3">
        {/* Left: Search & Filter toggle */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search nodes by filename or path..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-sm focus:outline-hidden focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-sm transition-colors cursor-pointer ${
              isFilterPanelOpen || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="text-xs text-slate-400 hover:text-slate-600 p-1"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Node Counter */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 tabular-nums">
          <span>
            Showing <strong className="text-slate-900 font-semibold">{visibleNodes}</strong> of {totalNodes} nodes
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Function Graph View Trigger */}
          {onOpenFunctionGraph && (
            <button
              onClick={onOpenFunctionGraph}
              title="Open Function-Level Call Graph"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 rounded-sm hover:bg-slate-100 transition-colors"
            >
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Functions</span>
            </button>
          )}

          {/* Shortest Path Finder Trigger */}
          {onOpenShortestPath && (
            <button
              onClick={onOpenShortestPath}
              title="Find Shortest Path between two files"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 rounded-sm hover:bg-slate-100 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Path Finder</span>
            </button>
          )}

          {/* Direction Controls */}
          <div className="flex items-center border border-slate-200 rounded-sm p-0.5 bg-slate-50">
            <button
              onClick={() => onDirectionChange('LR')}
              title="Layout Left-to-Right"
              className={`p-1 rounded-xs transition-colors ${
                direction === 'LR' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDirectionChange('TB')}
              title="Layout Top-to-Bottom"
              className={`p-1 rounded-xs transition-colors ${
                direction === 'TB' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDirectionChange('RL')}
              title="Layout Right-to-Left"
              className={`p-1 rounded-xs transition-colors ${
                direction === 'RL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDirectionChange('BT')}
              title="Layout Bottom-to-Top"
              className={`p-1 rounded-xs transition-colors ${
                direction === 'BT' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onToggleHighlightCycles}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-sm transition-colors ${
              highlightCycles
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Cycles</span>
          </button>

          <button
            onClick={onFitView}
            title="Fit graph to viewport"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-sm hover:bg-slate-50 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Fit</span>
          </button>

          {onReanalyze && (
            <button
              onClick={onReanalyze}
              title="Re-analyze this codebase (upload updated folder or zip)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Re-analyze</span>
            </button>
          )}

          <button
            onClick={onExportSvg}
            title="Export Standalone Graph"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Expandable Drawer */}
      {isFilterPanelOpen && (
        <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          {/* Extension Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Extension:</span>
            <select
              value={filters.extension}
              onChange={e => onFiltersChange({ ...filters, extension: e.target.value })}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Extensions</option>
              {availableExtensions.map(ext => (
                <option key={ext} value={ext}>
                  {ext}
                </option>
              ))}
            </select>
          </div>

          {/* Folder Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Folder:</span>
            <select
              value={filters.folder}
              onChange={e => onFiltersChange({ ...filters, folder: e.target.value })}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500 max-w-[140px] truncate"
            >
              <option value="">All Folders</option>
              {availableFolders.map(folder => (
                <option key={folder} value={folder}>
                  {folder}/
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          {availableModules.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Module:</span>
              <select
                value={filters.moduleId}
                onChange={e => onFiltersChange({ ...filters, moduleId: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500 max-w-[130px] truncate"
              >
                <option value="">All Modules</option>
                {availableModules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Analysis Findings Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Findings:</span>
            <select
              value={filters.findingType}
              onChange={e => onFiltersChange({ ...filters, findingType: e.target.value as any })}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Files</option>
              <option value="dead-code">Dead Code Candidates</option>
              <option value="violations">Rule Violations</option>
              <option value="high-risk">High Risk Files</option>
            </select>
          </div>

          {/* Import Type Filter (runtime vs type-only) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Import Type:</span>
            <select
              value={filters.importType}
              onChange={e => onFiltersChange({ ...filters, importType: e.target.value as any })}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Imports</option>
              <option value="runtime-only">Runtime Imports Only</option>
              <option value="type-only">Type-Only Imports</option>
            </select>
          </div>

          {/* Isolation Mode */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Isolate:</span>
            <select
              value={filters.isolateMode}
              onChange={e => onFiltersChange({ ...filters, isolateMode: e.target.value as any })}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="none">Normal (All Nodes)</option>
              <option value="neighbors">Selected Neighbors</option>
              <option value="upstream">Upstream Dependencies</option>
              <option value="downstream">Downstream Dependents</option>
            </select>
          </div>

          {/* Minimum Fan-in */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Min Fan-In:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={filters.minFanIn}
              onChange={e => onFiltersChange({ ...filters, minFanIn: Number(e.target.value) || 0 })}
              className="w-14 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Minimum Fan-out */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Min Fan-Out:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={filters.minFanOut}
              onChange={e => onFiltersChange({ ...filters, minFanOut: Number(e.target.value) || 0 })}
              className="w-14 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Only Cycles Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
            <input
              type="checkbox"
              checked={filters.onlyCycles}
              onChange={e => onFiltersChange({ ...filters, onlyCycles: e.target.checked })}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Cycles Only</span>
          </label>
        </div>
      )}

      {/* Active Filter Chips / Dismissible tags */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-1.5 bg-blue-50/50 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-medium mr-1">Active Filters:</span>
          {filters.extension && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-full font-mono">
              ext: {filters.extension}
              <button onClick={() => onFiltersChange({ ...filters, extension: '' })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.folder && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-full font-mono">
              folder: {filters.folder}
              <button onClick={() => onFiltersChange({ ...filters, folder: '' })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.moduleId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-full font-mono">
              module: {filters.moduleId}
              <button onClick={() => onFiltersChange({ ...filters, moduleId: '' })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.findingType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-200 text-amber-700 rounded-full">
              finding: {filters.findingType}
              <button onClick={() => onFiltersChange({ ...filters, findingType: 'all' })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.importType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-full">
              import: {filters.importType}
              <button onClick={() => onFiltersChange({ ...filters, importType: 'all' })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.minFanIn > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-full">
              min fan-in: {filters.minFanIn}
              <button onClick={() => onFiltersChange({ ...filters, minFanIn: 0 })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.minFanOut > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-full">
              min fan-out: {filters.minFanOut}
              <button onClick={() => onFiltersChange({ ...filters, minFanOut: 0 })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.onlyCycles && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-200 text-amber-700 rounded-full">
              cycles only
              <button onClick={() => onFiltersChange({ ...filters, onlyCycles: false })} className="hover:text-red-600">×</button>
            </span>
          )}
          {filters.isolateMode !== 'none' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-purple-200 text-purple-700 rounded-full">
              isolate: {filters.isolateMode}
              <button onClick={() => onFiltersChange({ ...filters, isolateMode: 'none' })} className="hover:text-red-600">×</button>
            </span>
          )}
          <button
            onClick={onResetFilters}
            className="text-slate-500 hover:text-red-600 underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

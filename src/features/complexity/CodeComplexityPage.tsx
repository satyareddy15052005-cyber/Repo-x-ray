import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Gauge,
  Search,
  Filter,
  FileCode,
  Download,
  ArrowUpDown,
  Code,
  TrendingUp,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import type {
  FunctionComplexity,
  FileComplexity,
  ComplexityTier,
  ProjectRecord,
} from '../../types/domain';
import { downloadFile } from '../../services/downloadFile';

export function CodeComplexityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [functions, setFunctions] = useState<FunctionComplexity[]>([]);
  const [files, setFiles] = useState<FileComplexity[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'functions' | 'files'>('functions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('cyclomaticComplexity');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    if (!projectId) return;
    loadComplexity();
  }, [projectId]);

  async function loadComplexity() {
    if (!projectId) return;
    setLoading(true);
    try {
      const p = await projectRepository.getProject(projectId);
      setProject(p || null);
      const data = await projectRepository.getComplexityData(projectId);
      setFunctions(data.functions);
      setFiles(data.files);
    } finally {
      setLoading(false);
    }
  }

  // Summary Metrics
  const summary = useMemo(() => {
    const totalFns = functions.length;
    const avgCyclomatic =
      totalFns > 0
        ? Math.round(
            (functions.reduce((acc, f) => acc + f.cyclomaticComplexity, 0) / totalFns) * 10
          ) / 10
        : 1;
    const maxCyclomatic =
      totalFns > 0 ? Math.max(...functions.map(f => f.cyclomaticComplexity)) : 1;

    const distribution = {
      low: functions.filter(f => f.tier === 'low').length,
      moderate: functions.filter(f => f.tier === 'moderate').length,
      high: functions.filter(f => f.tier === 'high').length,
      veryHigh: functions.filter(f => f.tier === 'very-high').length,
    };

    return {
      totalFns,
      avgCyclomatic,
      maxCyclomatic,
      distribution,
      highComplexityCount: distribution.high + distribution.veryHigh,
    };
  }, [functions]);

  // Filtered & Sorted Functions
  const sortedFunctions = useMemo(() => {
    let list = functions.filter(f => {
      if (selectedTier !== 'all' && f.tier !== selectedTier) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q);
      }
      return true;
    });

    list.sort((a: any, b: any) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [functions, selectedTier, searchQuery, sortField, sortAsc]);

  // Filtered & Sorted Files
  const sortedFiles = useMemo(() => {
    let list = files.filter(f => {
      if (selectedTier !== 'all' && f.tier !== selectedTier) return false;
      if (searchQuery.trim()) {
        return f.relativePath.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    list.sort((a: any, b: any) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [files, selectedTier, searchQuery, sortField, sortAsc]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  // Export to CSV
  function exportCsv() {
    if (activeTab === 'functions') {
      const headers = [
        'Function Name',
        'File',
        'Start Line',
        'End Line',
        'LOC',
        'Cyclomatic Complexity',
        'Parameters',
        'Max Nesting',
        'Returns',
        'Calls',
        'Tier',
      ];
      const rows = sortedFunctions.map(f => [
        `"${f.name}"`,
        `"${f.relativePath}"`,
        f.lineStart,
        f.lineEnd,
        f.lineCount,
        f.cyclomaticComplexity,
        f.parametersCount,
        f.maxNestingDepth,
        f.returnsCount,
        f.callsCount,
        f.tier,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csv, `function-complexity-${project?.name || 'repo'}.csv`, 'text/csv');
    } else {
      const headers = [
        'File Path',
        'LOC',
        'Total Functions',
        'Avg Cyclomatic',
        'Max Cyclomatic',
        'Fan In',
        'Fan Out',
        'Tier',
      ];
      const rows = sortedFiles.map(f => [
        `"${f.relativePath}"`,
        f.lineCount,
        f.totalFunctions,
        f.avgCyclomaticComplexity,
        f.maxCyclomaticComplexity,
        f.fanIn,
        f.fanOut,
        f.tier,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csv, `file-complexity-${project?.name || 'repo'}.csv`, 'text/csv');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Measuring code complexity metrics...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Code Complexity Analysis
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Deterministic AST metrics: Cyclomatic complexity, nesting depth, branches, loops, and parameter counts.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            Avg Cyclomatic Complexity
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {summary.avgCyclomatic}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            Max Function Complexity
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {summary.maxCyclomatic}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            High Complexity Functions
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {summary.highComplexityCount}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            Analyzed Functions
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {summary.totalFns}
          </div>
        </div>
      </div>

      {/* Distribution Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">Complexity Distribution</span>
          <span className="text-slate-500">
            Low (1-5), Moderate (6-10), High (11-20), Very High (&gt;20)
          </span>
        </div>

        <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100">
          <div
            title={`Low: ${summary.distribution.low}`}
            style={{ width: `${(summary.distribution.low / Math.max(1, summary.totalFns)) * 100}%` }}
            className="bg-emerald-500 h-full"
          />
          <div
            title={`Moderate: ${summary.distribution.moderate}`}
            style={{ width: `${(summary.distribution.moderate / Math.max(1, summary.totalFns)) * 100}%` }}
            className="bg-blue-500 h-full"
          />
          <div
            title={`High: ${summary.distribution.high}`}
            style={{ width: `${(summary.distribution.high / Math.max(1, summary.totalFns)) * 100}%` }}
            className="bg-amber-500 h-full"
          />
          <div
            title={`Very High: ${summary.distribution.veryHigh}`}
            style={{ width: `${(summary.distribution.veryHigh / Math.max(1, summary.totalFns)) * 100}%` }}
            className="bg-red-500 h-full"
          />
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Low ({summary.distribution.low})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Moderate ({summary.distribution.moderate})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>High ({summary.distribution.high})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Very High ({summary.distribution.veryHigh})</span>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
          <button
            onClick={() => {
              setActiveTab('functions');
              setSortField('cyclomaticComplexity');
            }}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'functions'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Functions ({functions.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('files');
              setSortField('maxCyclomaticComplexity');
            }}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Files ({files.length})
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500 w-52"
            />
          </div>

          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Tiers</option>
            <option value="low">Low (1-5)</option>
            <option value="moderate">Moderate (6-10)</option>
            <option value="high">High (11-20)</option>
            <option value="very-high">Very High (&gt;20)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
        {activeTab === 'functions' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Function Name
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('relativePath')}
                  >
                    <div className="flex items-center gap-1">
                      File Path
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('cyclomaticComplexity')}
                  >
                    <div className="flex items-center gap-1">
                      Cyclomatic
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('lineCount')}
                  >
                    <div className="flex items-center gap-1">
                      LOC
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('parametersCount')}
                  >
                    <div className="flex items-center gap-1">
                      Params
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('maxNestingDepth')}
                  >
                    <div className="flex items-center gap-1">
                      Nesting
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 font-semibold">Tier</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedFunctions.map(fn => {
                  const tierBadge =
                    fn.tier === 'very-high'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : fn.tier === 'high'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : fn.tier === 'moderate'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <tr key={fn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {fn.name}()
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        <span className="truncate max-w-xs inline-block align-middle" title={fn.relativePath}>
                          {fn.relativePath}
                        </span>
                        <span className="text-slate-400 ml-1">L{fn.lineStart}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {fn.cyclomaticComplexity}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {fn.lineCount}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {fn.parametersCount}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {fn.maxNestingDepth}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border ${tierBadge}`}
                        >
                          {fn.tier}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() =>
                            navigate(
                              `/projects/${projectId}/files?file=${encodeURIComponent(
                                fn.relativePath
                              )}&line=${fn.lineStart}`
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('relativePath')}
                  >
                    <div className="flex items-center gap-1">
                      File Path
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('lineCount')}
                  >
                    <div className="flex items-center gap-1">
                      LOC
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('totalFunctions')}
                  >
                    <div className="flex items-center gap-1">
                      Functions
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('maxCyclomaticComplexity')}
                  >
                    <div className="flex items-center gap-1">
                      Max Cyclomatic
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('avgCyclomaticComplexity')}
                  >
                    <div className="flex items-center gap-1">
                      Avg Cyclomatic
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('fanIn')}
                  >
                    <div className="flex items-center gap-1">
                      Fan In
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 font-semibold">Tier</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedFiles.map(file => {
                  const tierBadge =
                    file.tier === 'very-high'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : file.tier === 'high'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : file.tier === 'moderate'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900 truncate max-w-sm">
                        {file.relativePath}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {file.lineCount}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {file.totalFunctions}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {file.maxCyclomaticComplexity}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {file.avgCyclomaticComplexity}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {file.fanIn}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border ${tierBadge}`}
                        >
                          {file.tier}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() =>
                            navigate(
                              `/projects/${projectId}/files?file=${encodeURIComponent(
                                file.relativePath
                              )}`
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

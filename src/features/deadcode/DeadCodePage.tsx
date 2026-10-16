import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  FileCode,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import type { DeadCodeFinding, ProjectRecord, DeadCodeCategory, DeadCodeConfidence } from '../../types/domain';

export function DeadCodePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [findings, setFindings] = useState<DeadCodeFinding[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  useEffect(() => {
    if (!projectId) return;
    loadFindings();
  }, [projectId]);

  async function loadFindings() {
    if (!projectId) return;
    setLoading(true);
    try {
      const p = await projectRepository.getProject(projectId);
      setProject(p || null);
      const data = await projectRepository.getDeadCodeFindings(projectId);
      setFindings(data);
    } finally {
      setLoading(false);
    }
  }

  // Category counts
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {
      'unused-export': 0,
      'unused-function': 0,
      'unused-import': 0,
      'unused-variable': 0,
      'unreferenced-file': 0,
      'unreachable-code': 0,
    };
    for (const f of findings) {
      if (counts[f.category] !== undefined) counts[f.category]++;
    }
    return counts;
  }, [findings]);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
      if (selectedConfidence !== 'all' && f.confidence !== selectedConfidence) return false;
      if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          f.symbolName.toLowerCase().includes(q) ||
          f.relativePath.toLowerCase().includes(q) ||
          f.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [findings, selectedCategory, selectedConfidence, selectedSeverity, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Analyzing dead-code findings...
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
            <Trash2 className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Dead Code & Unused Declarations
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            AST-level analysis of unreferenced files, unused functions, dead exports, and unreachable statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
            {findings.length} total potential dead items
          </span>
        </div>
      </div>

      {/* Category Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedCategory('unused-export')}
          className={`p-3 rounded border text-left transition-all ${
            selectedCategory === 'unused-export'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500">Unused Exports</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{categoryStats['unused-export']}</div>
        </button>

        <button
          onClick={() => setSelectedCategory('unused-function')}
          className={`p-3 rounded border text-left transition-all ${
            selectedCategory === 'unused-function'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500">Unused Functions</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{categoryStats['unused-function']}</div>
        </button>

        <button
          onClick={() => setSelectedCategory('unused-import')}
          className={`p-3 rounded border text-left transition-all ${
            selectedCategory === 'unused-import'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500">Unused Imports</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{categoryStats['unused-import']}</div>
        </button>

        <button
          onClick={() => setSelectedCategory('unused-variable')}
          className={`p-3 rounded border text-left transition-all ${
            selectedCategory === 'unused-variable'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500">Unused Variables</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{categoryStats['unused-variable']}</div>
        </button>

        <button
          onClick={() => setSelectedCategory('unreferenced-file')}
          className={`p-3 rounded border text-left transition-all ${
            selectedCategory === 'unreferenced-file'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500">Unreferenced Files</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{categoryStats['unreferenced-file']}</div>
        </button>

        <button
          onClick={() => setSelectedCategory('unreachable-code')}
          className={`p-3 rounded border text-left transition-all ${
            selectedCategory === 'unreachable-code'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold text-slate-500">Unreachable Code</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{categoryStats['unreachable-code']}</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol, file or reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 w-60"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="unused-export">Unused Exports</option>
            <option value="unused-function">Unused Functions</option>
            <option value="unused-import">Unused Imports</option>
            <option value="unused-variable">Unused Variables</option>
            <option value="unreferenced-file">Unreferenced Files</option>
            <option value="unreachable-code">Unreachable Code</option>
          </select>

          {/* Confidence Dropdown */}
          <select
            value={selectedConfidence}
            onChange={e => setSelectedConfidence(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Confidences</option>
            <option value="confirmed">Confirmed</option>
            <option value="potential">Potential</option>
            <option value="unverified">Unverified</option>
          </select>

          {/* Severity Dropdown */}
          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {(selectedCategory !== 'all' ||
            selectedConfidence !== 'all' ||
            selectedSeverity !== 'all' ||
            searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedConfidence('all');
                setSelectedSeverity('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
          <span className="text-slate-500 font-mono">
            Showing {filteredFindings.length} of {findings.length} findings
          </span>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
        {filteredFindings.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-700">No dead-code findings match the current filter</div>
            <div className="text-xs text-slate-500 mt-1">Try broadening your search or resetting category filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 font-semibold">Symbol & Type</th>
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold">Confidence</th>
                  <th className="py-2.5 px-4 font-semibold">Location</th>
                  <th className="py-2.5 px-4 font-semibold">Explanation</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredFindings.map(finding => {
                  const confBadge =
                    finding.confidence === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : finding.confidence === 'potential'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                  const sevBadge =
                    finding.severity === 'high'
                      ? 'text-red-700 font-bold'
                      : finding.severity === 'medium'
                      ? 'text-amber-700'
                      : 'text-slate-500';

                  return (
                    <tr key={finding.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{finding.symbolName}</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {finding.declarationType}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 capitalize">
                          {finding.category.replace('-', ' ')}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${confBadge}`}
                        >
                          {finding.confidence}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        <span className="truncate max-w-[200px] inline-block align-middle" title={finding.relativePath}>
                          {finding.relativePath}
                        </span>
                        <span className="text-slate-400 ml-1">L{finding.line}</span>
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 max-w-sm">
                        {finding.reason}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() =>
                            navigate(
                              `/projects/${projectId}/files?file=${encodeURIComponent(
                                finding.relativePath
                              )}&line=${finding.line}`
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          View Code
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

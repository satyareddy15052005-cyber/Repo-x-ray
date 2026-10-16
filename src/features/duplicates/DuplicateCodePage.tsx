import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Copy,
  Search,
  Filter,
  FileCode,
  ArrowRight,
  Split,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import { detectDuplicates } from '../../engine/duplicates/detectDuplicates';
import type { DuplicateGroup, ProjectRecord, SourceFileRecord } from '../../types/domain';

export function DuplicateCodePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [minLines, setMinLines] = useState<number>(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    loadDuplicates();
  }, [projectId]);

  async function loadDuplicates() {
    if (!projectId) return;
    setLoading(true);
    try {
      const p = await projectRepository.getProject(projectId);
      setProject(p || null);
      const groups = await projectRepository.getDuplicateGroups(projectId);
      setDuplicateGroups(groups);
    } finally {
      setLoading(false);
    }
  }

  // Recalculate with custom minimum lines
  async function handleRecalculate(newMin: number) {
    if (!projectId) return;
    setMinLines(newMin);
    setRecalculating(true);
    try {
      const full = await projectRepository.getFullProject(projectId);
      if (full) {
        const fileContentsMap = new Map<string, string>();
        for (const file of full.files) {
          const content = await projectRepository.getFileContent(projectId, file.relativePath);
          if (content) fileContentsMap.set(file.relativePath, content);
        }
        const updatedGroups = detectDuplicates(projectId, full.files, fileContentsMap, {
          minLines: newMin,
        });
        setDuplicateGroups(updatedGroups);
      }
    } finally {
      setRecalculating(false);
    }
  }

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return duplicateGroups;
    const q = searchQuery.toLowerCase();
    return duplicateGroups.filter(g =>
      g.occurrences.some(
        occ =>
          occ.relativePath.toLowerCase().includes(q) ||
          occ.codeSnippet.toLowerCase().includes(q)
      )
    );
  }, [duplicateGroups, searchQuery]);

  const totalOccurrences = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + g.occurrences.length, 0);
  }, [duplicateGroups]);

  const totalDuplicatedLines = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + g.lineCount * g.occurrences.length, 0);
  }, [duplicateGroups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Detecting structural code duplicates...
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
            <Copy className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Duplicate Code Detector
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            AST-based structural fingerprinting identifies repeated statement sequences and identical code blocks across modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Min Lines:</span>
            {[4, 6, 8, 12].map(n => (
              <button
                key={n}
                onClick={() => handleRecalculate(n)}
                disabled={recalculating}
                className={`px-2 py-1 rounded font-mono text-xs transition-colors ${
                  minLines === n
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            Duplicate Groups
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {duplicateGroups.length}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            Total Occurrences
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {totalOccurrences}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            Duplicated Lines
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            ~{totalDuplicatedLines}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="text-[10px] uppercase font-semibold text-slate-500">
            Detection Method
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2 truncate">
            AST Structural Tokens
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-white border border-slate-200 rounded flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search duplicated files or code snippets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <span className="text-slate-500 font-mono">
          Showing {filteredGroups.length} duplicate groups
        </span>
      </div>

      {/* Duplicate Groups List */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="p-10 bg-white border border-slate-200 rounded text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-800">
              No duplicate code blocks found at {minLines}+ lines!
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Your codebase shows clean structural factoring without repeated boilerplate.
            </div>
          </div>
        ) : (
          filteredGroups.map((group, gIdx) => {
            const occA = group.occurrences[0];
            const occB = group.occurrences[1] || group.occurrences[0];

            return (
              <div
                key={group.id}
                className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden"
              >
                {/* Group Header */}
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Duplicate Group #{gIdx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                      {group.lineCount} Lines Repeated
                    </span>
                    <span className="text-slate-500">
                      {group.occurrences.length} occurrences
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Token Complexity: {group.tokenCount}
                  </span>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  {/* Occurrence A */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-slate-900 truncate max-w-xs font-semibold">
                        <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate" title={occA.relativePath}>
                          {occA.relativePath}
                        </span>
                        <span className="text-slate-400">
                          (L{occA.startLine}-{occA.endLine})
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          navigate(
                            `/projects/${projectId}/files?file=${encodeURIComponent(
                              occA.relativePath
                            )}&line=${occA.startLine}`
                          )
                        }
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 shrink-0 font-medium"
                      >
                        Inspect
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <pre className="p-2.5 bg-slate-900 text-slate-200 rounded text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed">
                      <code>{occA.codeSnippet}</code>
                    </pre>
                  </div>

                  {/* Occurrence B */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-slate-900 truncate max-w-xs font-semibold">
                        <FileCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="truncate" title={occB.relativePath}>
                          {occB.relativePath}
                        </span>
                        <span className="text-slate-400">
                          (L{occB.startLine}-{occB.endLine})
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          navigate(
                            `/projects/${projectId}/files?file=${encodeURIComponent(
                              occB.relativePath
                            )}&line=${occB.startLine}`
                          )
                        }
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 shrink-0 font-medium"
                      >
                        Inspect
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <pre className="p-2.5 bg-slate-900 text-slate-200 rounded text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed">
                      <code>{occB.codeSnippet}</code>
                    </pre>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

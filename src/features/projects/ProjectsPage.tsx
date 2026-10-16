import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Layers,
  FileCode,
  AlertTriangle,
  Trash2,
  ExternalLink,
  RotateCw,
  Download,
  Play,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import { runAnalysisPipeline } from '../../engine/analysis/analysisPipeline';
import { SAMPLE_PROJECT_NAME, SAMPLE_PROJECT_FILES } from '../../data/sampleProject';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useReanalyzeStore } from '../../stores/useReanalyzeStore';
import type { ProjectRecord, AnalysisSummary } from '../../types/domain';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [summaries, setSummaries] = useState<Record<string, AnalysisSummary>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'files' | 'cycles'>('date');
  const [isAnalyzingSample, setIsAnalyzingSample] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const openReanalyze = useReanalyzeStore((s) => s.openReanalyze);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const all = await projectRepository.getAllProjects();
      setProjects(all);

      // Load summaries for stats
      const summaryMap: Record<string, AnalysisSummary> = {};
      for (const p of all) {
        const full = await projectRepository.getFullProject(p.id);
        if (full) {
          summaryMap[p.id] = full.summary;
        }
      }
      setSummaries(summaryMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();

    const handleReanalyzed = () => {
      loadProjects();
    };
    window.addEventListener('project-reanalyzed', handleReanalyzed);
    return () => window.removeEventListener('project-reanalyzed', handleReanalyzed);
  }, []);

  const handleDelete = (id: string, name: string) => {
    setProjectToDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    await projectRepository.deleteProject(projectToDelete.id);
    setProjectToDelete(null);
    await loadProjects();
  };

  const handleRunSample = async () => {
    try {
      setIsAnalyzingSample(true);
      const projectId = await runAnalysisPipeline({
        projectName: SAMPLE_PROJECT_NAME,
        sourceType: 'sample',
        files: SAMPLE_PROJECT_FILES,
        persistSourceCode: true,
      });
      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      console.error(err);
      setIsAnalyzingSample(false);
    }
  };

  // Compute 4 global stats
  const stats = useMemo(() => {
    let totalFiles = 0;
    let totalEdges = 0;
    let totalCycles = 0;

    for (const s of Object.values(summaries)) {
      totalFiles += s.indexedFiles || 0;
      totalEdges += s.internalEdges || 0;
      totalCycles += s.circularGroups?.length || 0;
    }

    return {
      totalProjects: projects.length,
      totalFiles,
      totalEdges,
      totalCycles,
    };
  }, [projects, summaries]);

  // Filter & sort
  const filteredProjects = useMemo(() => {
    let result = projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.projectType && p.projectType.toLowerCase().includes(search.toLowerCase()))
    );

    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'files') {
        return b.fileCount - a.fileCount;
      }
      if (sortBy === 'cycles') {
        const cA = summaries[a.id]?.circularGroups?.length || 0;
        const cB = summaries[b.id]?.circularGroups?.length || 0;
        return cB - cA;
      }
      return 0;
    });

    return result;
  }, [projects, search, sortBy, summaries]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your analyzed codebases and dependencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunSample}
            disabled={isAnalyzingSample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            <span>{isAnalyzingSample ? 'Loading...' : 'Sample Project'}</span>
          </button>

          <button
            onClick={() => navigate('/projects/new')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-sm hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Projects</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{stats.totalProjects}</div>
          <div className="text-[11px] text-slate-400 mt-1">Saved locally</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Files</div>
          <div className="text-2xl font-bold text-blue-600 mt-1 font-mono tabular-nums">{stats.totalFiles}</div>
          <div className="text-[11px] text-slate-400 mt-1">Source files scanned</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Connections</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{stats.totalEdges}</div>
          <div className="text-[11px] text-slate-400 mt-1">Import links</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Circular Loops</div>
          <div className={`text-2xl font-bold mt-1 font-mono tabular-nums ${stats.totalCycles > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {stats.totalCycles}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Detected cycles</div>
        </div>
      </div>

      {/* Filter and View toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter projects by name or type..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-sm focus:outline-hidden focus:border-blue-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              aria-label="Sort projects"
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="date">Recently Analyzed</option>
              <option value="name">Alphabetical</option>
              <option value="files">File Count</option>
              <option value="cycles">Circular Groups</option>
            </select>
          </div>

          <div className="flex items-center border border-slate-200 rounded-sm p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`p-1 rounded-xs transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table view"
              className={`p-1 rounded-xs transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading saved projects...</div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white border border-slate-200 rounded-sm space-y-4">
          <div className="w-12 h-12 rounded-sm bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <FolderGit2 className="w-6 h-6 stroke-1.5" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-base text-slate-900">Every great architecture starts with a first file.</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Import a local codebase to build your first dependency map. All analysis executes securely inside your browser.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/projects/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors"
            >
              + Import Local Codebase
            </button>
            <button
              onClick={handleRunSample}
              disabled={isAnalyzingSample}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-300 rounded-sm transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              <span>Explore Example Project</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map(p => {
            const sum = summaries[p.id];
            const cycleCount = sum?.circularGroups?.length || 0;

            return (
              <div
                key={p.id}
                className="p-5 bg-white border border-slate-200 rounded-sm shadow-2xs hover:border-blue-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="font-bold text-sm text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-[220px]"
                        title={p.name}
                      >
                        {p.name}
                      </h3>
                      <div className="text-[11px] text-slate-500 mt-0.5">{p.projectType || 'Project'}</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {p.sourceType}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="font-bold text-slate-800 font-mono tabular-nums">{p.fileCount}</div>
                      <div className="text-[10px] text-slate-400">Files</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="font-bold text-blue-600 font-mono tabular-nums">{sum?.internalEdges || 0}</div>
                      <div className="text-[10px] text-slate-400">Edges</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className={`font-bold font-mono tabular-nums ${cycleCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {cycleCount}
                      </div>
                      <div className="text-[10px] text-slate-400">Cycles</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Analyzed {new Date(p.analyzedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-semibold transition-colors"
                  >
                    Open Project
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openReanalyze(p.id, p.name, p.sourceType)}
                      title="Re-analyze codebase (upload folder or zip)"
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/projects/${p.id}/export`)}
                      title="Export analysis"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      title="Delete project"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode */
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Project Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">Files</th>
                <th className="py-2.5 px-4 text-right">Dependencies</th>
                <th className="py-2.5 px-4 text-right">Cycles</th>
                <th className="py-2.5 px-4">Analyzed</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredProjects.map(p => {
                const sum = summaries[p.id];
                const cycleCount = sum?.circularGroups?.length || 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 font-sans">
                      <span
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="hover:text-blue-600 cursor-pointer"
                      >
                        {p.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-sans">{p.projectType || 'Project'}</td>
                    <td className="py-2.5 px-4 text-right text-slate-800 tabular-nums">{p.fileCount}</td>
                    <td className="py-2.5 px-4 text-right text-blue-600 tabular-nums">{sum?.internalEdges || 0}</td>
                    <td className={`py-2.5 px-4 text-right tabular-nums ${cycleCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                      {cycleCount}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-sans">
                      {new Date(p.analyzedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openReanalyze(p.id, p.name, p.sourceType)}
                          title="Re-analyze codebase"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!projectToDelete}
        title="Delete Project Analysis"
        message={`Are you sure you want to permanently delete "${projectToDelete?.name}"? All parsed source records, dependency edges, and IndexedDB metadata for this codebase will be removed.`}
        confirmLabel="Delete Project"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  FileCode,
  FolderTree,
  AlertTriangle,
  Zap,
  Download,
  RotateCw,
  ExternalLink,
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Code,
  Trash2,
  ShieldCheck,
  AlertOctagon,
  Gauge,
  Copy,
  History,
  FileText,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { useReanalyzeStore } from '../../stores/useReanalyzeStore';

export function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const openReanalyze = useReanalyzeStore((s) => s.openReanalyze);

  const loadData = React.useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    projectRepository.getFullProject(projectId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [projectId]);

  useEffect(() => {
    loadData();

    const handleReanalyzed = (e: Event) => {
      const custom = e as CustomEvent<{ projectId: string }>;
      if (custom.detail?.projectId === projectId) {
        loadData();
      }
    };

    window.addEventListener('project-reanalyzed', handleReanalyzed);
    return () => window.removeEventListener('project-reanalyzed', handleReanalyzed);
  }, [loadData, projectId]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading project overview...</div>;
  }

  if (!data) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto stroke-1" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">
          This project could not be found in local browser storage. It may have been deleted or storage cleared.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-blue-600 text-white rounded-sm text-xs font-semibold"
        >
          Return to My Projects
        </button>
      </div>
    );
  }

  const { project, summary, files, modules, issues } = data;
  const cycleCount = summary.circularGroups.length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
            <span className="px-2 py-0.5 text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded">
              {project.projectType || 'Project'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Imported via {project.sourceType}</span>
            <span>·</span>
            <span>Analyzed {new Date(project.analyzedAt).toLocaleString()}</span>
            <span>·</span>
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Complete</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openReanalyze(project.id, project.name, project.sourceType)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 font-semibold text-xs border border-slate-200 hover:border-blue-400 rounded-sm transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Re-analyze</span>
          </button>
          <button
            onClick={() => navigate(`/projects/${project.id}/graph`)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Graph Canvas</span>
          </button>
          <button
            onClick={() => navigate(`/projects/${project.id}/export`)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 rounded-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Files</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{summary.indexedFiles}</div>
          <div className="text-[11px] text-slate-400 mt-1">Source files</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Connections</div>
          <div className="text-2xl font-bold text-blue-600 mt-1 font-mono tabular-nums">{summary.internalEdges}</div>
          <div className="text-[11px] text-slate-400 mt-1">Import links</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Packages</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{summary.externalPackages.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">External libraries</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cycles</div>
          <div className={`text-2xl font-bold mt-1 font-mono tabular-nums ${cycleCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {cycleCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Circular loops</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unreferenced</div>
          <div className="text-2xl font-bold text-slate-800 mt-1 font-mono tabular-nums">
            {summary.potentiallyUnreferencedFileIds.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Zero callers</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Folders</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">{modules.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Directories</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Warnings</div>
          <div className={`text-2xl font-bold mt-1 font-mono tabular-nums ${issues.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {issues.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Parser notices</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Speed</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {summary.analysisDurationMs} ms
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Analysis time</div>
        </div>
      </div>

      {/* Phase 2: Architecture & Code Intelligence Suites */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Architecture & Code Intelligence Suites
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <button
            onClick={() => navigate(`/projects/${project.id}/functions`)}
            className="p-3 bg-white border border-slate-200 hover:border-blue-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <Code className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Functions</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {summary.totalFunctionsCount || 0}
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">Call Graph →</div>
          </button>

          <button
            onClick={() => navigate(`/projects/${project.id}/dead-code`)}
            className="p-3 bg-white border border-slate-200 hover:border-amber-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <Trash2 className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Dead Code</div>
            <div className="text-lg font-bold text-amber-700 font-mono">
              {summary.deadCodeFindingsCount || 0}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Audit →</div>
          </button>

          <button
            onClick={() => navigate(`/projects/${project.id}/rules`)}
            className="p-3 bg-white border border-slate-200 hover:border-red-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <ShieldCheck className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Rule Checks</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {summary.ruleViolationsCount || 0}
            </div>
            <div className="text-[10px] text-red-600 mt-0.5">Violations →</div>
          </button>

          <button
            onClick={() => navigate(`/projects/${project.id}/risk`)}
            className="p-3 bg-white border border-slate-200 hover:border-red-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <AlertOctagon className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Change Risk</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {summary.highRiskFilesCount || 0}
            </div>
            <div className="text-[10px] text-red-600 mt-0.5">Simulator →</div>
          </button>

          <button
            onClick={() => navigate(`/projects/${project.id}/complexity`)}
            className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <Gauge className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Complexity</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {summary.avgCyclomaticComplexity || 1}
            </div>
            <div className="text-[10px] text-indigo-600 mt-0.5">Metrics →</div>
          </button>

          <button
            onClick={() => navigate(`/projects/${project.id}/duplicates`)}
            className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <Copy className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Duplicates</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {summary.duplicateGroupsCount || 0}
            </div>
            <div className="text-[10px] text-indigo-600 mt-0.5">Diff View →</div>
          </button>

          <button
            onClick={() => navigate(`/projects/${project.id}/history`)}
            className="p-3 bg-white border border-slate-200 hover:border-blue-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <History className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Timeline</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              v{project.analysisVersion || 1}
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">Health →</div>
          </button>

          <button
            onClick={() => navigate(`/projects/${project.id}/docs`)}
            className="p-3 bg-white border border-slate-200 hover:border-emerald-400 rounded-sm text-left shadow-2xs transition-all group"
          >
            <FileText className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] uppercase font-semibold text-slate-500 mt-2">Architecture</div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              17 Sec
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Docs & HTML →</div>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Depended-on files & Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Depended-On Files (Highest Fan-In) */}
        <div className="p-5 bg-white border border-slate-200 rounded-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Highly Depended-On Files</h2>
              <p className="text-[11px] text-slate-500">Source files with the highest incoming reference count (high fan-in)</p>
            </div>
            <button
              onClick={() => navigate(`/projects/${project.id}/insights`)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              All Insights →
            </button>
          </div>

          {summary.topFanIn.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">No incoming internal dependencies.</div>
          ) : (
            <div className="divide-y divide-slate-100 font-mono text-xs">
              {summary.topFanIn.slice(0, 6).map((item, idx) => (
                <div
                  key={item.fileId}
                  onClick={() => navigate(`/projects/${project.id}/files/${encodeURIComponent(item.path)}`)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 w-4 font-sans text-xs">{idx + 1}.</span>
                    <span className="truncate text-slate-800 font-medium">{item.path}</span>
                  </div>
                  <span className="font-bold text-blue-600 tabular-nums shrink-0 ml-3">
                    {item.count} callers
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modules Breakdown */}
        <div className="p-5 bg-white border border-slate-200 rounded-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Top Subsystems / Folders</h2>
              <p className="text-[11px] text-slate-500">Modules categorized by directory structure</p>
            </div>
            <button
              onClick={() => navigate(`/projects/${project.id}/modules`)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Module Explorer →
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-mono">
            {modules.slice(0, 6).map(m => (
              <div
                key={m.id}
                onClick={() => navigate(`/projects/${project.id}/modules`)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-800 font-sans">{m.name}</div>
                  <div className="text-[11px] text-slate-400">{m.relativePath}/</div>
                </div>
                <div className="text-right tabular-nums text-slate-600">
                  <div>{m.fileIds.length} files</div>
                  <div className="text-[10px] text-slate-400">{m.internalEdgeCount || 0} internal edges</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Circular dependencies warning strip if any */}
      {cycleCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-amber-900">
                {cycleCount} Circular Dependency {cycleCount === 1 ? 'Cycle' : 'Cycles'} Detected
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Mutually dependent files form import loops that make refactoring difficult.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/projects/${project.id}/insights`)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-sm font-semibold text-xs shrink-0 transition-colors cursor-pointer"
          >
            View Cycles
          </button>
        </div>
      )}

      {/* External packages list */}
      <div className="p-5 bg-white border border-slate-200 rounded-sm">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <Package className="w-4 h-4 text-slate-600" />
          <h2 className="font-bold text-sm text-slate-900">External Packages ({summary.externalPackages.length})</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.externalPackages.map(pkg => (
            <span
              key={pkg}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-mono"
            >
              {pkg}
            </span>
          ))}
          {summary.externalPackages.length === 0 && (
            <span className="text-xs text-slate-400 italic">No external package dependencies imported.</span>
          )}
        </div>
      </div>
    </div>
  );
}

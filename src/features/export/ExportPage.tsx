import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  FileText,
  Table,
  FileCode,
  Archive,
  CheckCircle2,
  Code,
  Gauge,
  Trash2,
  History,
  BookOpen,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import {
  exportProjectToJson,
  exportDependenciesToCsv,
  exportStandaloneHtmlReport,
  exportProjectToPortableArchive,
  exportFunctionsToCsv,
  exportComplexityToCsv,
  exportDeadCodeToCsv,
  exportHealthHistoryToCsv,
} from '../../services/exports/exportServices';

export function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectRepository.getFullProject(projectId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [projectId]);

  const triggerExport = (
    type:
      | 'json'
      | 'csv'
      | 'html'
      | 'rxray'
      | 'functions-csv'
      | 'complexity-csv'
      | 'deadcode-csv'
      | 'history-csv'
  ) => {
    if (!data) return;

    if (type === 'json') {
      exportProjectToJson(data);
      setDownloadSuccess('Exported complete project analysis to JSON.');
    } else if (type === 'csv') {
      exportDependenciesToCsv(data);
      setDownloadSuccess('Exported dependency edges to CSV.');
    } else if (type === 'html') {
      exportStandaloneHtmlReport(data);
      setDownloadSuccess('Generated offline standalone HTML intelligence report.');
    } else if (type === 'rxray') {
      exportProjectToPortableArchive(data);
      setDownloadSuccess('Exported portable .rxray archive container.');
    } else if (type === 'functions-csv') {
      exportFunctionsToCsv(data);
      setDownloadSuccess('Exported functions and calls to CSV.');
    } else if (type === 'complexity-csv') {
      exportComplexityToCsv(data);
      setDownloadSuccess('Exported cyclomatic complexity metrics to CSV.');
    } else if (type === 'deadcode-csv') {
      exportDeadCodeToCsv(data);
      setDownloadSuccess('Exported dead code findings to CSV.');
    } else if (type === 'history-csv') {
      exportHealthHistoryToCsv(data.healthSnapshots || [], data.project.name);
      setDownloadSuccess('Exported health snapshots timeline to CSV.');
    }

    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading export options...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-xs text-slate-400">Project data not found.</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Download className="w-6 h-6 text-blue-600" />
          <span>Export Architecture Intelligence</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Generate portable reports, tabular spreadsheets, and standalone offline documentation for <strong>{data.project.name}</strong>.
        </p>
      </div>

      {/* Success notification */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Section 1: Core Reports & Portability Containers */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Reports & Portable Archives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Standalone HTML Report */}
          <div className="p-5 bg-white border border-slate-200 rounded-sm shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Standalone Offline HTML Report</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Self-contained, styled HTML document containing executive metrics, circular dependency groups, highest fan-in files, module breakdowns, and package references. Works 100% offline without network requests.
              </p>
              <div className="mt-3 text-[11px] font-mono text-slate-400">
                Format: .html · Standalone styling · Embedded tables
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('html')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors flex items-center gap-2 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download HTML Report</span>
              </button>
            </div>
          </div>

          {/* Option 2: Full JSON Analysis */}
          <div className="p-5 bg-white border border-slate-200 rounded-sm shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <FileCode className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Structured Analysis JSON</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete, strongly typed JSON dump of the AST parsing and graph analysis. Includes project metadata, file entries, graph edges, cycles, functions, dead code, rules, complexity, and health history.
              </p>
              <div className="mt-3 text-[11px] font-mono text-slate-400">
                Format: .json (v2.0) · {data.files.length} files · {data.edges.length} edges
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('json')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 rounded-sm transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download JSON Analysis</span>
              </button>
            </div>
          </div>

          {/* Option 3: Portable .rxray Archive */}
          <div className="p-5 bg-white border border-slate-200 rounded-sm shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Archive className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Portable Archive Container (.rxray)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Portable project format that can be transferred to another computer or browser and restored directly using the &quot;Restore .rxray&quot; tab on the Import page without re-running AST parsing.
              </p>
              <div className="mt-3 text-[11px] font-mono text-slate-400">
                Format: .rxray · Portable schema v2
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('rxray')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 rounded-sm transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download .rxray File</span>
              </button>
            </div>
          </div>

          {/* Option 4: Full Architecture Specification (Markdown / HTML) */}
          <div className="p-5 bg-white border border-slate-200 rounded-sm shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Architecture Specification Hub</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate a comprehensive 17-section software architecture specification document in Markdown or styled HTML, with customizable section toggles and clipboard support.
              </p>
              <div className="mt-3 text-[11px] font-mono text-slate-400">
                Format: .md / .html · 17 grounded architectural sections
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => navigate(`/projects/${projectId}/docs`)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 rounded-sm transition-colors flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Open Documentation Hub</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Tabular CSV Datasets */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Tabular Datasets (CSV)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CSV 1: Dependency Edges */}
          <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <Table className="w-4 h-4 text-blue-600" />
                <span>Dependency Edges</span>
              </div>
              <p className="text-[11px] text-slate-500">
                All source-to-target imports, specifiers, resolution status, and line numbers.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                {data.dependencies.length} import declarations
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('csv')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-300 rounded-sm flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* CSV 2: Functions & Call Hierarchy */}
          <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <Code className="w-4 h-4 text-emerald-600" />
                <span>Functions & Call Sites</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Extracted functions, parameters, declaration types, export status, and caller counts.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                {(data.functions || []).length} indexed functions
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('functions-csv')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-300 rounded-sm flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* CSV 3: Code Complexity */}
          <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <Gauge className="w-4 h-4 text-purple-600" />
                <span>Cyclomatic Complexity</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Per-function cyclomatic complexity, nesting depth, branches, loops, and risk tiers.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                {(data.functionComplexities || []).length} evaluated functions
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('complexity-csv')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-300 rounded-sm flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* CSV 4: Dead Code Findings */}
          <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <Trash2 className="w-4 h-4 text-amber-600" />
                <span>Dead Code Findings</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Unused exports, unreferenced files, unused locals, and unreachable statements.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                {(data.deadCodeFindings || []).length} identified findings
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('deadcode-csv')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-300 rounded-sm flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* CSV 5: Project Health History */}
          <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <History className="w-4 h-4 text-cyan-600" />
                <span>Health History Timeline</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Historical snapshot timestamps, file counts, cycles, dead code, and complexity trends.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                {(data.healthSnapshots || []).length} recorded snapshots
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => triggerExport('history-csv')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-300 rounded-sm flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

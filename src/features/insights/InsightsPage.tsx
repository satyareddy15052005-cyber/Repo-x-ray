import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  FileCode,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Folder,
  ExternalLink,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import type { SourceFileRecord } from '../../types/domain';

export function InsightsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cycles' | 'fanIn' | 'fanOut' | 'unreferenced' | 'unresolved' | 'coverage'>('cycles');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectRepository.getFullProject(projectId).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [projectId]);

  const allFilesMap = useMemo(() => {
    const map = new Map<string, SourceFileRecord>();
    if (data) {
      for (const f of data.files) map.set(f.id, f);
    }
    return map;
  }, [data]);

  const unresolvedImports = useMemo(() => {
    if (!data) return [];
    return data.dependencies.filter(d => d.resolutionStatus === 'unresolved' && d.specifier.startsWith('.'));
  }, [data]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Computing structural insights...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-xs text-slate-400">Project data not found.</div>;
  }

  const { summary, files, issues, project } = data;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Architecture Insights</h1>
        <p className="text-xs text-slate-500 mt-1">
          Objective structural analysis calculated directly from AST syntax trees and graph connectivity.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab('cycles')}
          className={`py-2.5 px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'cycles'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Circular Dependencies ({summary.circularGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fanIn')}
          className={`py-2.5 px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'fanIn'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-blue-600" />
          <span>High Fan-In Files ({summary.topFanIn.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fanOut')}
          className={`py-2.5 px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'fanOut'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
          <span>High Fan-Out Files ({summary.topFanOut.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('unreferenced')}
          className={`py-2.5 px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'unreferenced'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Potentially Unreferenced ({summary.potentiallyUnreferencedFileIds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('unresolved')}
          className={`py-2.5 px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'unresolved'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Unresolved Imports ({unresolvedImports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coverage')}
          className={`py-2.5 px-4 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'coverage'
              ? 'border-blue-600 text-blue-700 bg-white font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Parsing Coverage</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs">
        {/* TAB 1: CIRCLES */}
        {activeTab === 'cycles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Circular Dependency Groups</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Evaluated with Tarjan&apos;s strongly connected components algorithm. Strongly connected groups indicate loops where files mutually require one another, preventing clean architectural layering.
              </p>
            </div>

            {summary.circularGroups.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="font-semibold text-sm text-emerald-900">No Circular Dependencies Found</div>
                <div className="text-xs text-emerald-700 mt-1">
                  The dependency graph of this codebase is a directed acyclic graph (DAG).
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {summary.circularGroups.map((group, gIdx) => (
                  <div key={group.id} className="p-4 bg-amber-50/60 border border-amber-200 rounded-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-xs text-amber-900">
                          Circular Group #{gIdx + 1} ({group.fileIds.length} files)
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/projects/${project.id}/graph`)}
                        className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Inspect in Graph</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      {group.paths.map((p, pIdx) => (
                        <div
                          key={p}
                          onClick={() => navigate(`/projects/${project.id}/files/${encodeURIComponent(p)}`)}
                          className="flex items-center gap-2 p-1.5 bg-white/80 hover:bg-white rounded border border-amber-100 cursor-pointer transition-colors text-slate-800"
                        >
                          <span className="text-slate-400 font-sans text-xs w-5">{pIdx + 1}.</span>
                          <span className="truncate">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HIGH FAN-IN */}
        {activeTab === 'fanIn' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Highest Fan-In Source Files</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Files with the largest number of incoming callers. These files are the core shared infrastructure of your project; changes here carry high ripple effects.
              </p>
            </div>

            <div className="border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Rank</th>
                    <th className="py-2.5 px-4">File Path</th>
                    <th className="py-2.5 px-4 text-right">Incoming Callers (Fan-In)</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {summary.topFanIn.map((item, idx) => (
                    <tr key={item.fileId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.path}</td>
                      <td className="py-2.5 px-4 text-right text-blue-600 font-bold tabular-nums">
                        {item.count}
                      </td>
                      <td className="py-2.5 px-4 text-right font-sans">
                        <button
                          onClick={() => navigate(`/projects/${project.id}/impact?fileId=${item.fileId}`)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium"
                        >
                          Trace Blast Radius
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: HIGH FAN-OUT */}
        {activeTab === 'fanOut' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Highest Fan-Out Source Files</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Files that import many other modules directly. Often coordinators, page controllers, or service orchestrators.
              </p>
            </div>

            <div className="border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Rank</th>
                    <th className="py-2.5 px-4">File Path</th>
                    <th className="py-2.5 px-4 text-right">Outgoing Imports (Fan-Out)</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {summary.topFanOut.map((item, idx) => (
                    <tr key={item.fileId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 font-sans">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.path}</td>
                      <td className="py-2.5 px-4 text-right text-blue-600 font-bold tabular-nums">
                        {item.count}
                      </td>
                      <td className="py-2.5 px-4 text-right font-sans">
                        <button
                          onClick={() => navigate(`/projects/${project.id}/files/${encodeURIComponent(item.path)}`)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-medium"
                        >
                          View Code
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: UNREFERENCED */}
        {activeTab === 'unreferenced' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Potentially Unreferenced Files</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Files with zero incoming references in this analyzed graph (excluding detected entry points such as main.tsx, index.tsx, App.tsx).
                <br />
                <span className="text-slate-400 italic">
                  Note: These files may still be referenced by dynamic routing, framework conventions, tests, or external packages.
                </span>
              </p>
            </div>

            {summary.potentiallyUnreferencedFileIds.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-500">
                Every analyzed file has at least one incoming reference or is a recognized entry point.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">File Path</th>
                      <th className="py-2.5 px-4">Lines</th>
                      <th className="py-2.5 px-4">Size</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {summary.potentiallyUnreferencedFileIds.map(fId => {
                      const file = allFilesMap.get(fId);
                      if (!file) return null;
                      return (
                        <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{file.relativePath}</td>
                          <td className="py-2.5 px-4 text-slate-500 tabular-nums">{file.lineCount}</td>
                          <td className="py-2.5 px-4 text-slate-500 tabular-nums">{(file.byteSize / 1024).toFixed(1)} KB</td>
                          <td className="py-2.5 px-4 text-right font-sans">
                            <button
                              onClick={() => navigate(`/projects/${project.id}/files/${encodeURIComponent(file.relativePath)}`)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                            >
                              Inspect Source
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
        )}

        {/* TAB 5: UNRESOLVED IMPORTS */}
        {activeTab === 'unresolved' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Unresolved Relative Imports</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Relative imports that could not be matched against any indexed file or standard extensions.
              </p>
            </div>

            {unresolvedImports.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="font-semibold text-sm text-emerald-900">All Relative Imports Resolved</div>
                <div className="text-xs text-emerald-700 mt-1">
                  100% of internal import specifiers correspond to verified source files in the project.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {unresolvedImports.map((dep, i) => {
                  const src = allFilesMap.get(dep.sourceFileId);
                  return (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{dep.specifier}</span>
                        <span className="text-[10px] text-slate-400">Line {dep.line || '?'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Referenced in: <strong>{src ? src.relativePath : dep.sourceFileId}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PARSING COVERAGE */}
        {activeTab === 'coverage' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Parser Syntax Coverage</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Summary of Babel AST parsing success across all discovered source files.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-500 text-[11px] font-sans">Indexed Source Files</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{summary.indexedFiles}</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-500 text-[11px] font-sans">Resolved Internal Edges</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">{summary.internalEdges}</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-500 text-[11px] font-sans">Parse Warnings / Errors</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{issues.length}</div>
              </div>
            </div>

            {issues.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800">Syntax Issues Log:</div>
                {issues.map(iss => (
                  <div key={iss.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-800">
                      <span>{iss.relativePath}</span>
                      {iss.line && <span className="text-slate-400">Line {iss.line}</span>}
                    </div>
                    <div className="text-[11px] text-amber-700 mt-0.5">{iss.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

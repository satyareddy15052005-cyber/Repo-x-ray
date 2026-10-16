import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Trash2,
  GitCompare,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import {
  compareSnapshots,
  exportHistoryCsv,
  exportHistoryJson,
  type SnapshotComparison,
} from '../../engine/history/healthHistoryService';
import type { ProjectHealthSnapshot, ProjectRecord } from '../../types/domain';
import { downloadFile } from '../../services/downloadFile';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export function HealthHistoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [snapshots, setSnapshots] = useState<ProjectHealthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Comparison selection
  const [selectedPrevId, setSelectedPrevId] = useState<string>('');
  const [selectedCurrId, setSelectedCurrId] = useState<string>('');
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    loadHistory();
  }, [projectId]);

  async function loadHistory() {
    if (!projectId) return;
    setLoading(true);
    try {
      const p = await projectRepository.getProject(projectId);
      setProject(p || null);
      const list = await projectRepository.getHealthSnapshots(projectId);
      setSnapshots(list);

      if (list.length >= 2) {
        setSelectedPrevId(list[list.length - 2].id);
        setSelectedCurrId(list[list.length - 1].id);
      } else if (list.length === 1) {
        setSelectedCurrId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  // Active Comparison
  const comparison: SnapshotComparison | null = useMemo(() => {
    if (!selectedPrevId || !selectedCurrId || selectedPrevId === selectedCurrId) {
      return null;
    }
    const prev = snapshots.find(s => s.id === selectedPrevId);
    const curr = snapshots.find(s => s.id === selectedCurrId);
    if (!prev || !curr) return null;
    return compareSnapshots(prev, curr);
  }, [snapshots, selectedPrevId, selectedCurrId]);

  // Latest snapshot metrics
  const latestSnapshot = snapshots[snapshots.length - 1] || null;

  async function handleDeleteSnapshot(id: string) {
    await projectRepository.deleteHealthSnapshot(id);
    await loadHistory();
  }

  async function handleClearHistory() {
    if (!projectId) return;
    await projectRepository.clearHealthHistory(projectId);
    await loadHistory();
    setIsClearDialogOpen(false);
  }

  function handleExportCsv() {
    const csv = exportHistoryCsv(snapshots);
    downloadFile(csv, `health-history-${project?.name || 'repo'}.csv`, 'text/csv');
  }

  function handleExportJson() {
    const json = exportHistoryJson(snapshots);
    downloadFile(json, `health-history-${project?.name || 'repo'}.json`, 'application/json');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Loading project health timeline...
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
            <History className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Project Health History
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Track codebase evolution, architecture compliance, dead code trends, and complexity deltas across analyses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {snapshots.length > 0 && (
            <>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Export CSV
              </button>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Export JSON
              </button>
              <button
                onClick={() => setIsClearDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            </>
          )}
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded text-center">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-800">No health history snapshots yet</div>
          <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            A historical snapshot is automatically captured each time you analyze or re-analyze this project.
          </div>
        </div>
      ) : (
        <>
          {/* Latest Health Summary Bar */}
          {latestSnapshot && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">Files</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.fileCount}</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">Edges</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.internalEdgeCount}</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">Cycles</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.circularGroupCount}</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">Dead Code</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.deadCodeCount}</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">Violations</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.ruleViolationsCount}</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">Duplicates</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.duplicateGroupCount}</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">Avg Complexity</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.avgComplexity}</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <div className="text-[9px] uppercase font-semibold text-slate-500">High Risk</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{latestSnapshot.highRiskFileCount}</div>
              </div>
            </div>
          )}

          {/* Snapshot Comparison Tool */}
          {snapshots.length >= 2 && (
            <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <GitCompare className="w-4 h-4 text-blue-600" />
                  Snapshot Comparison Tool
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Base:</span>
                    <select
                      value={selectedPrevId}
                      onChange={e => setSelectedPrevId(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                    >
                      {snapshots.map(s => (
                        <option key={s.id} value={s.id}>
                          v{s.analysisVersion} ({new Date(s.timestamp).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-400">➔</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Target:</span>
                    <select
                      value={selectedCurrId}
                      onChange={e => setSelectedCurrId(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                    >
                      {snapshots.map(s => (
                        <option key={s.id} value={s.id}>
                          v{s.analysisVersion} ({new Date(s.timestamp).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {comparison && (
                <>
                  {/* Status Banner */}
                  <div
                    className={`p-3 rounded border text-xs font-medium flex items-center gap-2 ${
                      comparison.overallStatus === 'improved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : comparison.overallStatus === 'degraded'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    {comparison.overallStatus === 'improved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : comparison.overallStatus === 'degraded' ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span>
                      Architecture Trend: <strong className="uppercase">{comparison.overallStatus}</strong> between Version {comparison.previous.analysisVersion} and Version {comparison.current.analysisVersion}.
                    </span>
                  </div>

                  {/* Comparison Deltas Table */}
                  <div className="overflow-x-auto border border-slate-100 rounded">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-4 font-semibold">Quality Metric</th>
                          <th className="py-2.5 px-4 font-semibold">Version {comparison.previous.analysisVersion}</th>
                          <th className="py-2.5 px-4 font-semibold">Version {comparison.current.analysisVersion}</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {comparison.deltas.map(d => {
                          const isBetter = d.trend === 'better';
                          const isWorse = d.trend === 'worse';
                          const deltaText = d.delta > 0 ? `+${d.delta}` : `${d.delta}`;

                          return (
                            <tr key={d.metric} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-4 font-medium text-slate-900">{d.metric}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">{d.previousValue}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-900 font-bold">{d.currentValue}</td>
                              <td className="py-2.5 px-4 text-right">
                                {d.delta === 0 ? (
                                  <span className="text-slate-400 font-mono text-xs">0 (no change)</span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                      isBetter
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : isWorse
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {isBetter ? (
                                      <TrendingDown className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <TrendingUp className="w-3 h-3 text-red-600" />
                                    )}
                                    {deltaText}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Historical Timeline List */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-600" />
              Analysis Timeline ({snapshots.length} snapshots)
            </h2>

            <div className="space-y-2">
              {snapshots.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-white border border-slate-200 rounded shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      v{s.analysisVersion}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        {new Date(s.timestamp).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.summaryNote || `${s.fileCount} files, ${s.internalEdgeCount} edges`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-600 font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Files</span>
                      <span className="font-bold text-slate-900">{s.fileCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Cycles</span>
                      <span className={s.circularGroupCount > 0 ? 'font-bold text-red-600' : 'text-slate-900'}>
                        {s.circularGroupCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Dead Code</span>
                      <span className="text-slate-900 font-bold">{s.deadCodeCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Violations</span>
                      <span className={s.ruleViolationsCount > 0 ? 'font-bold text-amber-600' : 'text-slate-900'}>
                        {s.ruleViolationsCount}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteSnapshot(s.id)}
                      className="p-1 text-slate-300 hover:text-red-600 transition-colors ml-2"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog for Clearing History */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        title="Clear Health History?"
        message="This will delete all saved historical snapshots for this project. Current project analysis data will remain intact."
        confirmLabel="Clear History"
        variant="danger"
        onConfirm={handleClearHistory}
        onCancel={() => setIsClearDialogOpen(false)}
      />
    </div>
  );
}

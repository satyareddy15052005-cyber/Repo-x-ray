import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GitCompare,
  Plus,
  Minus,
  RefreshCw,
  FileCode,
  AlertTriangle,
  ArrowRight,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { compareProjects, type ComparisonDiff } from '../../engine/compare/compareProjects';
import type { ProjectRecord } from '../../types/domain';

export function ComparePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [allProjects, setAllProjects] = useState<ProjectRecord[]>([]);
  const [projectAId, setProjectAId] = useState<string>(projectId || '');
  const [projectBId, setProjectBId] = useState<string>('');
  const [dataA, setDataA] = useState<FullProjectData | null>(null);
  const [dataB, setDataB] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectRepository.getAllProjects().then(list => {
      setAllProjects(list);
      if (projectId) {
        setProjectAId(projectId);
        // Find another project to compare with if available
        const other = list.find(p => p.id !== projectId);
        if (other) {
          setProjectBId(other.id);
        }
      } else if (list.length >= 2) {
        setProjectAId(list[0].id);
        setProjectBId(list[1].id);
      }
      setLoading(false);
    });
  }, [projectId]);

  // Load both projects whenever IDs change
  useEffect(() => {
    if (projectAId) {
      projectRepository.getFullProject(projectAId).then(setDataA);
    } else {
      setDataA(null);
    }
  }, [projectAId]);

  useEffect(() => {
    if (projectBId) {
      projectRepository.getFullProject(projectBId).then(setDataB);
    } else {
      setDataB(null);
    }
  }, [projectBId]);

  const diff: ComparisonDiff | null = useMemo(() => {
    if (!dataA || !dataB) return null;
    return compareProjects(dataA, dataB);
  }, [dataA, dataB]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading codebase comparison...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-blue-600" />
          <span>Compare Codebase Snapshots</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Detect structural changes between two project versions: added/removed files, modified edges, and circular groups.
        </p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 border border-slate-200 rounded-sm shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Base Analysis (Snapshot A)
          </label>
          <select
            value={projectAId}
            onChange={e => setProjectAId(e.target.value)}
            aria-label="Base analysis snapshot A"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-sm text-slate-800 font-medium"
          >
            {allProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({new Date(p.analyzedAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Compared Analysis (Snapshot B)
          </label>
          <select
            value={projectBId}
            onChange={e => setProjectBId(e.target.value)}
            aria-label="Compared analysis snapshot B"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-sm text-slate-800 font-medium"
          >
            <option value="">Select a comparison project...</option>
            {allProjects.map(p => (
              <option key={p.id} value={p.id} disabled={p.id === projectAId}>
                {p.name} ({new Date(p.analyzedAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!diff ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-sm space-y-3">
          <GitCompare className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-semibold text-sm text-slate-800">Select Two Analyses to Compare</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose two saved project snapshots to evaluate diffs in files, internal dependency edges, and circular loops.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/projects/new')}
              className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-sm hover:bg-blue-700 transition-colors"
            >
              + Import Another Codebase Version
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comparison Delta Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Added Files</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono tabular-nums">
                +{diff.addedFiles.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Present in B, not in A</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Removed Files</div>
              <div className="text-2xl font-bold text-rose-600 mt-1 font-mono tabular-nums">
                -{diff.removedFiles.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Present in A, absent in B</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Modified Files</div>
              <div className="text-2xl font-bold text-blue-600 mt-1 font-mono tabular-nums">
                {diff.modifiedFiles.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Changed size or lines</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Edge Changes</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                +{diff.addedEdges.length} / -{diff.removedEdges.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Dependency graph delta</div>
            </div>
          </div>

          {/* Detailed File Changes Table */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">File Structural Differences</h2>
              <span className="text-xs text-slate-400 font-mono">
                {diff.unchangedFilesCount} identical files
              </span>
            </div>

            <div className="border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Relative Path</th>
                    <th className="py-2.5 px-4 text-right">Line Delta</th>
                    <th className="py-2.5 px-4 text-right">Byte Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {/* Added Files */}
                  {diff.addedFiles.map(f => (
                    <tr key={f.id} className="bg-emerald-50/40 hover:bg-emerald-50">
                      <td className="py-2.5 px-4 font-sans font-semibold text-emerald-700">Added</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{f.relativePath}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-600 font-bold tabular-nums">+{f.lineCount}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-600 tabular-nums">+{f.byteSize} B</td>
                    </tr>
                  ))}

                  {/* Removed Files */}
                  {diff.removedFiles.map(f => (
                    <tr key={f.id} className="bg-rose-50/40 hover:bg-rose-50">
                      <td className="py-2.5 px-4 font-sans font-semibold text-rose-700">Removed</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 line-through">{f.relativePath}</td>
                      <td className="py-2.5 px-4 text-right text-rose-600 font-bold tabular-nums">-{f.lineCount}</td>
                      <td className="py-2.5 px-4 text-right text-rose-600 tabular-nums">-{f.byteSize} B</td>
                    </tr>
                  ))}

                  {/* Modified Files */}
                  {diff.modifiedFiles.map(m => (
                    <tr key={m.relativePath} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-sans font-semibold text-blue-700">Modified</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{m.relativePath}</td>
                      <td className="py-2.5 px-4 text-right text-slate-800 tabular-nums">
                        {m.lineDelta >= 0 ? `+${m.lineDelta}` : m.lineDelta}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-800 tabular-nums">
                        {m.byteDelta >= 0 ? `+${m.byteDelta}` : m.byteDelta} B
                      </td>
                    </tr>
                  ))}

                  {diff.addedFiles.length === 0 && diff.removedFiles.length === 0 && diff.modifiedFiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-sans italic">
                        Both snapshots have identical files and line counts.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

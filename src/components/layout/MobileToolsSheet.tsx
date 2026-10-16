import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  X,
  Layers,
  Code,
  FolderTree,
  BarChart3,
  Zap,
  AlertTriangle,
  ShieldCheck,
  AlertOctagon,
  Gauge,
  Copy,
  History,
  FileText,
  GitCompare,
  Download,
  Settings,
  RotateCw,
  FolderGit2,
} from 'lucide-react';
import { useReanalyzeStore } from '../../stores/useReanalyzeStore';

interface MobileToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  sourceType?: string;
}

export function MobileToolsSheet({
  isOpen,
  onClose,
  projectId,
  projectName,
  sourceType,
}: MobileToolsSheetProps) {
  const openReanalyze = useReanalyzeStore((s) => s.openReanalyze);

  if (!isOpen) return null;

  const tools = projectId
    ? [
        {
          name: 'Dependency Graph',
          desc: 'Interactive file connection canvas',
          path: `/projects/${projectId}/graph`,
          icon: Layers,
          color: 'text-blue-600 bg-blue-50',
        },
        {
          name: 'Function Graph',
          desc: 'Function-level call hierarchy',
          path: `/projects/${projectId}/functions`,
          icon: Code,
          color: 'text-indigo-600 bg-indigo-50',
        },
        {
          name: 'File Explorer',
          desc: 'Browse source code & ASTs',
          path: `/projects/${projectId}/files`,
          icon: FolderTree,
          color: 'text-slate-700 bg-slate-100',
        },
        {
          name: 'Architecture Insights',
          desc: 'Instability & circular loops',
          path: `/projects/${projectId}/insights`,
          icon: BarChart3,
          color: 'text-cyan-600 bg-cyan-50',
        },
        {
          name: 'Impact Blast Radius',
          desc: 'Trace ripple effects of edits',
          path: `/projects/${projectId}/impact`,
          icon: Zap,
          color: 'text-amber-600 bg-amber-50',
        },
        {
          name: 'Change Risk Scorer',
          desc: 'Risk evaluation before pull requests',
          path: `/projects/${projectId}/risk`,
          icon: AlertOctagon,
          color: 'text-rose-600 bg-rose-50',
        },
        {
          name: 'Dead Code Detector',
          desc: 'Unreachable files & zero callers',
          path: `/projects/${projectId}/dead-code`,
          icon: AlertTriangle,
          color: 'text-orange-600 bg-orange-50',
        },
        {
          name: 'Architecture Rules',
          desc: 'Forbidden imports & layering',
          path: `/projects/${projectId}/rules`,
          icon: ShieldCheck,
          color: 'text-emerald-600 bg-emerald-50',
        },
        {
          name: 'Duplicate Code',
          desc: 'Structural clones & boilerplate',
          path: `/projects/${projectId}/duplicates`,
          icon: Copy,
          color: 'text-purple-600 bg-purple-50',
        },
        {
          name: 'Code Complexity',
          desc: 'Cyclomatic scoring & hotspots',
          path: `/projects/${projectId}/complexity`,
          icon: Gauge,
          color: 'text-red-600 bg-red-50',
        },
        {
          name: 'Health History',
          desc: 'Trendlines across revisions',
          path: `/projects/${projectId}/history`,
          icon: History,
          color: 'text-teal-600 bg-teal-50',
        },
        {
          name: 'Architecture Docs',
          desc: 'Auto-generated living docs',
          path: `/projects/${projectId}/docs`,
          icon: FileText,
          color: 'text-blue-600 bg-blue-50',
        },
        {
          name: 'Compare Revisions',
          desc: 'Side-by-side diff against snapshots',
          path: `/projects/${projectId}/compare`,
          icon: GitCompare,
          color: 'text-violet-600 bg-violet-50',
        },
        {
          name: 'Export Report',
          desc: 'Download JSON, CSV, SVG bundles',
          path: `/projects/${projectId}/export`,
          icon: Download,
          color: 'text-slate-700 bg-slate-100',
        },
      ]
    : [
        {
          name: 'All Projects',
          desc: 'View analyzed codebases',
          path: '/projects',
          icon: FolderGit2,
          color: 'text-blue-600 bg-blue-50',
        },
        {
          name: 'Settings',
          desc: 'Preferences & browser persistence',
          path: '/settings',
          icon: Settings,
          color: 'text-slate-700 bg-slate-100',
        },
      ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-up sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[82vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {projectId ? 'Intelligence Tools' : 'Navigation Menu'}
            </h3>
            {projectName && (
              <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                {projectName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick re-analyze bar if in project */}
        {projectId && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Update codebase</span>
            <button
              onClick={() => {
                onClose();
                openReanalyze(projectId, projectName, sourceType);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Re-analyze</span>
            </button>
          </div>
        )}

        {/* Tools grid */}
        <div className="p-3 overflow-y-auto flex-1 grid grid-cols-2 gap-2 text-xs">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.path}
                to={t.path}
                onClick={onClose}
                className="p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 hover:border-blue-300 transition-all flex flex-col gap-1.5 shadow-2xs active:scale-98"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${t.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800 text-[11px] leading-tight">
                    {t.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 line-clamp-1">
                  {t.desc}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom padding for safety */}
        <div className="h-4 pb-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

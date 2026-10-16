import React from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import {
  FolderGit2,
  PlusCircle,
  Home,
  Layers,
  FileCode,
  FolderTree,
  BarChart3,
  Zap,
  GitCompare,
  Download,
  Settings,
  ShieldCheck,
  Command,
  Code,
  Trash2,
  AlertOctagon,
  Gauge,
  Copy,
  History,
  FileText,
  X,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  onOpenShortcuts: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ onOpenShortcuts, isOpenMobile, onCloseMobile }: SidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

  // Determine current active project id from path if not in params directly
  const activeProjectId = projectId || (location.pathname.startsWith('/projects/') ? location.pathname.split('/')[2] : undefined);
  const isViewingProject = activeProjectId && activeProjectId !== 'new';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xs text-xs font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <aside
      className={`w-61 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none z-30 transition-transform ${
        isOpenMobile ? 'fixed inset-y-0 left-0 shadow-lg' : 'relative hidden md:flex'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 md:px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5 group" onClick={onCloseMobile}>
          <BrandLogo className="w-6 h-6 transition-transform group-hover:scale-105" />
          <div>
            <div className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
              REPO X-RAY
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Codebase Intelligence
            </div>
          </div>
        </NavLink>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Workspace section */}
        <div>
          <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Workspace
          </div>
          <div className="space-y-0.5">
            <NavLink to="/" end className={linkClass} onClick={onCloseMobile}>
              <Home className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </NavLink>
            <NavLink to="/projects" end className={linkClass} onClick={onCloseMobile}>
              <FolderGit2 className="w-4 h-4 text-slate-400" />
              <span>My Projects</span>
            </NavLink>
            <NavLink to="/projects/new" className={linkClass} onClick={onCloseMobile}>
              <PlusCircle className="w-4 h-4 text-slate-400" />
              <span>New Analysis</span>
            </NavLink>
          </div>
        </div>

        {/* Project Explorer section (visible when exploring a project) */}
        {isViewingProject && (
          <div>
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2 flex items-center justify-between">
              <span>Project Explorer</span>
            </div>
            <div className="space-y-0.5">
              <NavLink
                to={`/projects/${activeProjectId}`}
                end
                className={linkClass}
                onClick={onCloseMobile}
              >
                <FolderGit2 className="w-4 h-4 text-slate-400" />
                <span>Overview</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/graph`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Dependency Graph</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/functions`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <Code className="w-4 h-4 text-slate-400" />
                <span>Function Graph</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/files`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <FileCode className="w-4 h-4 text-slate-400" />
                <span>File Explorer</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/modules`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <FolderTree className="w-4 h-4 text-slate-400" />
                <span>Modules</span>
              </NavLink>

              <div className="pt-2 pb-1 px-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Quality & Architecture
              </div>

              <NavLink
                to={`/projects/${activeProjectId}/dead-code`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>Dead Code</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/rules`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Architecture Rules</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/risk`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <AlertOctagon className="w-4 h-4 text-slate-400" />
                <span>Change Risk</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/complexity`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <Gauge className="w-4 h-4 text-slate-400" />
                <span>Code Complexity</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/duplicates`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Duplicate Code</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/history`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>Health History</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/docs`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Architecture Docs</span>
              </NavLink>

              <div className="pt-2 pb-1 px-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Analysis Tools
              </div>

              <NavLink
                to={`/projects/${activeProjectId}/insights`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <span>Insights & Cycles</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/impact`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <Zap className="w-4 h-4 text-slate-400" />
                <span>Impact Explorer</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/compare`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <GitCompare className="w-4 h-4 text-slate-400" />
                <span>Compare Versions</span>
              </NavLink>

              <NavLink
                to={`/projects/${activeProjectId}/export`}
                className={linkClass}
                onClick={onCloseMobile}
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Export Report</span>
              </NavLink>
            </div>
          </div>
        )}
      </div>

      {/* Footer Area */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0 space-y-1.5 text-xs">
        <NavLink
          to="/settings"
          className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-sm hover:bg-slate-200/50 transition-colors"
          onClick={onCloseMobile}
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Settings</span>
        </NavLink>

        <button
          onClick={onOpenShortcuts}
          className="w-full flex items-center justify-between px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-sm hover:bg-slate-200/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-slate-400" />
            <span>Shortcuts</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded font-mono text-slate-500 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </aside>
  );
}

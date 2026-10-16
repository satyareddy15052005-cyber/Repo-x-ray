import React from 'react';
import { NavLink, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  RotateCw,
  Settings,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import { useReanalyzeStore } from '../../stores/useReanalyzeStore';
import type { ProjectRecord } from '../../types/domain';

interface TopbarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ onToggleSidebar, onOpenSearch }: TopbarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = React.useState<ProjectRecord | null>(null);
  const openReanalyze = useReanalyzeStore((s) => s.openReanalyze);

  const activeProjectId = projectId || (location.pathname.startsWith('/projects/') ? location.pathname.split('/')[2] : undefined);
  const isViewingProject = activeProjectId && activeProjectId !== 'new';

  const loadCurrentProject = React.useCallback(() => {
    if (isViewingProject) {
      projectRepository.getProject(activeProjectId!).then(p => {
        if (p) setProject(p);
      });
    } else {
      setProject(null);
    }
  }, [isViewingProject, activeProjectId]);

  React.useEffect(() => {
    loadCurrentProject();

    const handleReanalyzed = (e: Event) => {
      const custom = e as CustomEvent<{ projectId: string }>;
      if (custom.detail?.projectId === activeProjectId) {
        loadCurrentProject();
      }
    };

    window.addEventListener('project-reanalyzed', handleReanalyzed);
    return () => window.removeEventListener('project-reanalyzed', handleReanalyzed);
  }, [loadCurrentProject, activeProjectId]);

  // Generate breadcrumbs from pathname
  const breadcrumbs = React.useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: 'Overview', path: '/' }];

    const crumbs: Array<{ label: string; path: string }> = [];
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;

      if (seg === 'projects' && i === 0) {
        crumbs.push({ label: 'Projects', path: '/projects' });
      } else if (i === 1 && segments[0] === 'projects' && seg !== 'new') {
        crumbs.push({ label: project ? project.name : 'Project', path: currentPath });
      } else if (seg === 'new') {
        crumbs.push({ label: 'New Analysis', path: currentPath });
      } else if (seg === 'graph') {
        crumbs.push({ label: 'Dependency Graph', path: currentPath });
      } else if (seg === 'files') {
        crumbs.push({ label: 'File Explorer', path: currentPath });
      } else if (seg === 'modules') {
        crumbs.push({ label: 'Modules', path: currentPath });
      } else if (seg === 'insights') {
        crumbs.push({ label: 'Architecture Insights', path: currentPath });
      } else if (seg === 'impact') {
        crumbs.push({ label: 'Impact Explorer', path: currentPath });
      } else if (seg === 'compare') {
        crumbs.push({ label: 'Compare', path: currentPath });
      } else if (seg === 'export') {
        crumbs.push({ label: 'Export Reports', path: currentPath });
      } else if (seg === 'settings') {
        crumbs.push({ label: 'Settings', path: '/settings' });
      }
    }

    return crumbs;
  }, [location.pathname, project]);

  return (
    <header className="h-13 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-20 shrink-0 select-none">
      {/* Left zone: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-sm md:hidden transition-colors"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 truncate">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.path}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                {isLast ? (
                  <span className="font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-xs">{crumb.label}</span>
                ) : (
                  <NavLink to={crumb.path} className="hidden sm:inline hover:text-slate-900 hover:underline transition-colors truncate">
                    {crumb.label}
                  </NavLink>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Center zone: Search command trigger */}
      <div className="flex-1 max-w-md hidden sm:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-sm text-xs text-slate-400 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Search files, symbols...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right zone: Mobile search, Re-analyze, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenSearch}
          title="Search (Ctrl+K)"
          className="sm:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-sm transition-colors"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {isViewingProject && (
          <button
            onClick={() => openReanalyze(activeProjectId!, project?.name, project?.sourceType)}
            title="Re-analyze this codebase"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-blue-400 rounded-sm transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Re-analyze</span>
          </button>
        )}

        <NavLink
          to="/settings"
          title="App Settings"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-sm transition-colors"
        >
          <Settings className="w-4 h-4" />
        </NavLink>
      </div>
    </header>
  );
}

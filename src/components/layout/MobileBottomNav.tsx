import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Layers,
  FolderGit2,
  FileCode,
  BarChart3,
  PlusCircle,
  Settings,
  Grid,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeProjectId?: string;
  onOpenTools: () => void;
  onToggleSidebar: () => void;
}

export function MobileBottomNav({
  activeProjectId,
  onOpenTools,
  onToggleSidebar,
}: MobileBottomNavProps) {
  const location = useLocation();

  const isTabActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 md:hidden h-14 flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] select-none">
      {activeProjectId ? (
        <>
          {/* Project Overview */}
          <NavLink
            to={`/projects/${activeProjectId}`}
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Overview</span>
          </NavLink>

          {/* Dependency Graph */}
          <NavLink
            to={`/projects/${activeProjectId}/graph`}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Layers className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Graph</span>
          </NavLink>

          {/* File Explorer */}
          <NavLink
            to={`/projects/${activeProjectId}/files`}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <FileCode className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Files</span>
          </NavLink>

          {/* Insights */}
          <NavLink
            to={`/projects/${activeProjectId}/insights`}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Insights</span>
          </NavLink>

          {/* All Tools Sheet Trigger */}
          <button
            onClick={onOpenTools}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              // If currently on an inner tool route that isn't one of the 4 main tabs
              !isTabActive(`/projects/${activeProjectId}`, true) &&
              !isTabActive(`/projects/${activeProjectId}/graph`) &&
              !isTabActive(`/projects/${activeProjectId}/files`) &&
              !isTabActive(`/projects/${activeProjectId}/insights`)
                ? 'text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Tools</span>
          </button>
        </>
      ) : (
        <>
          {/* Home */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Home</span>
          </NavLink>

          {/* Projects */}
          <NavLink
            to="/projects"
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <FolderGit2 className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Projects</span>
          </NavLink>

          {/* New Analysis */}
          <NavLink
            to="/projects/new"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <PlusCircle className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Analyze</span>
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Settings</span>
          </NavLink>

          {/* Menu Drawer */}
          <button
            onClick={onToggleSidebar}
            className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Menu</span>
          </button>
        </>
      )}
    </nav>
  );
}

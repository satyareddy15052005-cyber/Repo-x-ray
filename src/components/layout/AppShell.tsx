import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileToolsSheet } from './MobileToolsSheet';
import { CommandPalette } from '../common/CommandPalette';
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal';
import { ReanalyzeModal } from '../common/ReanalyzeModal';
import { projectRepository } from '../../storage/projectRepository';
import type { ProjectRecord } from '../../types/domain';

export function AppShell() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const location = useLocation();

  // Extract active project ID from URL if present
  const pathParts = location.pathname.split('/');
  const activeProjectId = pathParts[1] === 'projects' && pathParts[2] && pathParts[2] !== 'new' ? pathParts[2] : undefined;

  useEffect(() => {
    if (activeProjectId) {
      projectRepository.getProject(activeProjectId).then(p => setProject(p || null));
    } else {
      setProject(null);
    }
  }, [activeProjectId]);

  // Windows controls & hotkeys: Ctrl+K for search, F1 or Ctrl+/ for shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (
        (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === '/') || e.key === '?') &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
      {/* Sidebar for desktop and mobile drawer */}
      <Sidebar
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-35 md:hidden"
          onClick={() => setIsSidebarOpenMobile(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <Topbar
          onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 overflow-y-auto relative pb-14 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Native-Style Bottom Navigation Bar */}
        <MobileBottomNav
          activeProjectId={activeProjectId}
          onOpenTools={() => setIsMobileToolsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
        />
      </div>

      {/* Mobile Tools Sheet */}
      <MobileToolsSheet
        isOpen={isMobileToolsOpen}
        onClose={() => setIsMobileToolsOpen(false)}
        projectId={activeProjectId}
        projectName={project?.name}
        sourceType={project?.sourceType}
      />

      {/* Modals */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentProjectId={activeProjectId}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <ReanalyzeModal />
    </div>
  );
}

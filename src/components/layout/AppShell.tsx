import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../common/CommandPalette';
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal';
import { ReanalyzeModal } from '../common/ReanalyzeModal';

export function AppShell() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const location = useLocation();

  // Extract active project ID from URL if present
  const pathParts = location.pathname.split('/');
  const activeProjectId = pathParts[1] === 'projects' && pathParts[2] && pathParts[2] !== 'new' ? pathParts[2] : undefined;

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

      {/* Backdrop for mobile */}
      {isSidebarOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-25 md:hidden"
          onClick={() => setIsSidebarOpenMobile(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Topbar
          onToggleSidebar={() => setIsSidebarOpenMobile(prev => !prev)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>

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

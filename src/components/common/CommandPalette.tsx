import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  FileCode,
  Folder,
  Layers,
  Zap,
  ArrowRight,
  Settings,
  PlusCircle,
  FolderGit2,
  BarChart3,
  Download,
  Code,
  Trash2,
  ShieldCheck,
  AlertOctagon,
  Gauge,
  Copy,
  History,
  FileText,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import type { ProjectRecord, SourceFileRecord } from '../../types/domain';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
}

interface SearchItem {
  id: string;
  category: 'Commands' | 'Projects' | 'Files' | 'Modules';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette({ isOpen, onClose, currentProjectId }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [files, setFiles] = useState<SourceFileRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Fetch projects
      projectRepository.getAllProjects().then(setProjects);

      // If project active, fetch files
      if (currentProjectId) {
        projectRepository.getFullProject(currentProjectId).then(data => {
          if (data) setFiles(data.files);
        });
      }
    }
  }, [isOpen, currentProjectId]);

  const items: SearchItem[] = React.useMemo(() => {
    const list: SearchItem[] = [];

    // General commands
    list.push({
      id: 'cmd-new',
      category: 'Commands',
      title: 'Analyze New Codebase',
      subtitle: 'Import directory or ZIP archive',
      icon: PlusCircle,
      onSelect: () => {
        navigate('/projects/new');
        onClose();
      },
    });

    list.push({
      id: 'cmd-projects',
      category: 'Commands',
      title: 'View All Projects',
      subtitle: 'Browse saved codebases',
      icon: FolderGit2,
      onSelect: () => {
        navigate('/projects');
        onClose();
      },
    });

    if (currentProjectId) {
      list.push({
        id: 'cmd-graph',
        category: 'Commands',
        title: 'Open Dependency Graph',
        subtitle: 'Explore architecture canvas',
        icon: Layers,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/graph`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-files',
        category: 'Commands',
        title: 'Open File Explorer',
        subtitle: 'Source code syntax browser',
        icon: FileCode,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/files`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-insights',
        category: 'Commands',
        title: 'Architecture Insights',
        subtitle: 'Cycles, fan-in, and structural metrics',
        icon: BarChart3,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/insights`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-functions',
        category: 'Commands',
        title: 'Function Call Graph',
        subtitle: 'Inspect function and method callers/callees',
        icon: Code,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/functions`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-deadcode',
        category: 'Commands',
        title: 'Dead Code & Unused Declarations',
        subtitle: 'Unreferenced files, dead functions, unused imports',
        icon: Trash2,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/dead-code`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-rules',
        category: 'Commands',
        title: 'Architecture Rule Checker',
        subtitle: 'Evaluate layer boundaries and custom rules',
        icon: ShieldCheck,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/rules`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-risk',
        category: 'Commands',
        title: 'Change Risk Analyzer',
        subtitle: 'Simulate blast radius before modifying code',
        icon: AlertOctagon,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/risk`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-complexity',
        category: 'Commands',
        title: 'Code Complexity Analysis',
        subtitle: 'Cyclomatic complexity, nesting depth & lines',
        icon: Gauge,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/complexity`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-duplicates',
        category: 'Commands',
        title: 'Duplicate Code Detector',
        subtitle: 'Find repeated statement sequences across files',
        icon: Copy,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/duplicates`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-history',
        category: 'Commands',
        title: 'Project Health History',
        subtitle: 'Compare snapshots and track architecture trends',
        icon: History,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/history`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-docs',
        category: 'Commands',
        title: 'Architecture Documentation',
        subtitle: '17-section Markdown and offline HTML docs',
        icon: FileText,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/docs`);
          onClose();
        },
      });

      list.push({
        id: 'cmd-export',
        category: 'Commands',
        title: 'Export Intelligence Report',
        subtitle: 'JSON, CSV, SVG, or HTML report',
        icon: Download,
        onSelect: () => {
          navigate(`/projects/${currentProjectId}/export`);
          onClose();
        },
      });
    }

    list.push({
      id: 'cmd-settings',
      category: 'Commands',
      title: 'Open Settings',
      subtitle: 'Storage and preferences',
      icon: Settings,
      onSelect: () => {
        navigate('/settings');
        onClose();
      },
    });

    // Projects list
    for (const p of projects) {
      list.push({
        id: `proj-${p.id}`,
        category: 'Projects',
        title: p.name,
        subtitle: `${p.fileCount} files · ${p.projectType || 'Project'}`,
        icon: FolderGit2,
        onSelect: () => {
          navigate(`/projects/${p.id}`);
          onClose();
        },
      });
    }

    // Files list
    if (currentProjectId) {
      for (const f of files.slice(0, 50)) {
        list.push({
          id: `file-${f.id}`,
          category: 'Files',
          title: f.filename,
          subtitle: f.relativePath,
          icon: FileCode,
          onSelect: () => {
            navigate(`/projects/${currentProjectId}/files/${encodeURIComponent(f.relativePath)}`);
            onClose();
          },
        });
      }
    }

    if (!query.trim()) return list;

    const lower = query.toLowerCase();
    return list.filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(lower))
    );
  }, [query, projects, files, currentProjectId, navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % Math.max(1, items.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/30 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-xl bg-white rounded-md border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[480px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-2.5 bg-slate-50">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, file name, or project..."
            className="w-full bg-transparent text-sm text-slate-900 focus:outline-hidden placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching commands or files found.
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-sm cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 uppercase tracking-wider font-semibold ml-2">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 px-3">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-slate-400">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}

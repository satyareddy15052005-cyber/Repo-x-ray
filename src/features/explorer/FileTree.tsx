import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  File,
  Search,
} from 'lucide-react';
import type { SourceFileRecord } from '../../types/domain';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: Map<string, TreeNode>;
  file?: SourceFileRecord;
}

interface FileTreeProps {
  files: SourceFileRecord[];
  selectedFileId?: string | null;
  onSelectFile: (file: SourceFileRecord) => void;
  className?: string;
}

export function FileTree({
  files,
  selectedFileId,
  onSelectFile,
  className = '',
}: FileTreeProps) {
  const [search, setSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(['src', 'components', 'services', 'hooks'])
  );

  // Build tree hierarchy
  const rootNode = useMemo(() => {
    const root: TreeNode = {
      name: 'root',
      path: '',
      isFolder: true,
      children: new Map(),
    };

    const filtered = search.trim()
      ? files.filter(f => f.relativePath.toLowerCase().includes(search.toLowerCase()))
      : files;

    for (const file of filtered) {
      const parts = file.relativePath.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (isLast) {
          current.children.set(part, {
            name: part,
            path: currentPath,
            isFolder: false,
            children: new Map(),
            file,
          });
        } else {
          let folderNode = current.children.get(part);
          if (!folderNode) {
            folderNode = {
              name: part,
              path: currentPath,
              isFolder: true,
              children: new Map(),
            };
            current.children.set(part, folderNode);
          }
          current = folderNode;
        }
      }
    }

    return root;
  }, [files, search]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(node.path) || search.trim() !== '';
      const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
        if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
        return a.isFolder ? -1 : 1;
      });

      return (
        <div key={node.path || 'root'} className="select-none">
          {node.path && (
            <div
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-100 cursor-pointer text-slate-700 text-xs font-mono transition-colors"
            >
              <span className="text-slate-400">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
              <span className="text-blue-500">
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5" />
                ) : (
                  <Folder className="w-3.5 h-3.5" />
                )}
              </span>
              <span className="font-medium text-slate-800">{node.name}</span>
            </div>
          )}

          {(isExpanded || !node.path) && (
            <div>
              {sortedChildren.map(child => renderNode(child, node.path ? depth + 1 : 0))}
            </div>
          )}
        </div>
      );
    }

    // File item
    const isSelected = node.file?.id === selectedFileId;
    return (
      <div
        key={node.path}
        onClick={() => node.file && onSelectFile(node.file)}
        style={{ paddingLeft: `${depth * 14 + 14}px` }}
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer text-xs font-mono transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white border-r border-slate-200 text-xs ${className}`}>
      {/* Header and Search */}
      <div className="p-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter files..."
            className="w-full pl-7 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-sm focus:outline-hidden focus:border-blue-600"
          />
        </div>
      </div>

      {/* Tree scrollable container */}
      <div className="flex-1 overflow-y-auto py-1">
        {renderNode(rootNode)}
      </div>

      <div className="p-2 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50 flex justify-between">
        <span>{files.length} indexed files</span>
      </div>
    </div>
  );
}

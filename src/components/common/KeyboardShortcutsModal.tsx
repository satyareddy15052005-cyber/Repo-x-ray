import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K', description: 'Search files and run commands' },
    { key: 'F1 / Ctrl + /', description: 'Open keyboard shortcuts' },
    { key: 'Esc', description: 'Close dialogs or clear selection' },
    { key: 'Left Click', description: 'Select file and show dependencies' },
    { key: 'Double Click', description: 'View source code in file explorer' },
    { key: 'Drag Node', description: 'Reposition file node on canvas' },
    { key: 'Click Edge', description: 'Inspect import connection details' },
    { key: 'Mouse Wheel', description: 'Zoom canvas in / out' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-md bg-white rounded-sm border border-slate-200 shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-900">Windows Keyboard Controls</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 divide-y divide-slate-100 text-xs">
          {shortcuts.map((s, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">{s.description}</span>
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-800 font-semibold shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-sm text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

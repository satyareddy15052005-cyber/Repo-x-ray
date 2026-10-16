import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { getSettings, updateSettings, DEFAULT_SETTINGS } from '../../storage/database';
import { projectRepository } from '../../storage/projectRepository';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { AppSettings } from '../../types/domain';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [projectCount, setProjectCount] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<string>('Estimating...');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const s = await getSettings();
    setSettings(s);

    const projects = await projectRepository.getAllProjects();
    setProjectCount(projects.length);

    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const usageMb = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
      const quotaMb = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
      setStorageEstimate(`${usageMb} MB used of ${quotaMb} MB available quota`);
    } else {
      setStorageEstimate('Supported via IndexedDB');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async () => {
    await updateSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'danger',
    onConfirm: async () => {},
  });

  const handleReset = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Preferences',
      message: 'Are you sure you want to restore all analysis, layout, and storage settings to their factory default values?',
      confirmLabel: 'Reset Settings',
      variant: 'warning',
      onConfirm: async () => {
        const reset = await updateSettings(DEFAULT_SETTINGS);
        setSettings(reset);
        setSavedSuccess(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setTimeout(() => setSavedSuccess(false), 2500);
      },
    });
  };

  const handleClearAllStorage = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Purge All Local Data',
      message: 'Are you sure you want to delete ALL saved project analyses, parsed syntax trees, and IndexedDB data? This action is permanent and cannot be undone.',
      confirmLabel: 'Purge All Data',
      variant: 'danger',
      onConfirm: async () => {
        await projectRepository.clearAllData();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await loadAll();
      },
    });
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading application settings...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            <span>Application Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure analysis behavior, visualization defaults, and local browser persistence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-sm transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-sm transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Preferences updated and persisted to IndexedDB.</span>
        </div>
      )}

      {/* Section 1: Graph & Visualization */}
      <div className="p-6 bg-white border border-slate-200 rounded-sm shadow-xs space-y-4">
        <h2 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Graph & Visual Layout
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Default Auto-Layout Orientation
            </label>
            <select
              value={settings.defaultLayout}
              onChange={e => setSettings({ ...settings, defaultLayout: e.target.value as any })}
              aria-label="Default auto-layout orientation"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm font-medium text-slate-800"
            >
              <option value="LR">Left to Right (LR)</option>
              <option value="TB">Top to Bottom (TB)</option>
              <option value="RL">Right to Left (RL)</option>
              <option value="BT">Bottom to Top (BT)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Controls the starting orientation of nodes on the architecture canvas.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Initial Graph Node Limit
            </label>
            <input
              type="number"
              value={settings.maxInitialRenderNodes}
              onChange={e => setSettings({ ...settings, maxInitialRenderNodes: Number(e.target.value) })}
              min={50}
              max={1000}
              step={50}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm font-mono text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Maximum nodes rendered on canvas simultaneously before clustering into folders.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Analysis & Parsing Preferences */}
      <div className="p-6 bg-white border border-slate-200 rounded-sm shadow-xs space-y-4">
        <h2 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Parser & Analysis Rules
        </h2>

        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="persistSource"
              checked={settings.persistSourceCode}
              onChange={e => setSettings({ ...settings, persistSourceCode: e.target.checked })}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="persistSource" className="font-semibold text-slate-800 cursor-pointer">
                Persist Raw Source Code in Local IndexedDB
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                When enabled, raw file text is cached locally in your browser storage so you can inspect code lines in Monaco Editor across sessions without re-selecting your local folder.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Maximum Single File Size (KB)
            </label>
            <input
              type="number"
              value={settings.maxFileSizeKb}
              onChange={e => setSettings({ ...settings, maxFileSizeKb: Number(e.target.value) })}
              min={100}
              max={10240}
              step={100}
              className="w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm font-mono text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Files exceeding this threshold will be skipped to protect browser memory.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Browser Storage Management */}
      <div className="p-6 bg-white border border-slate-200 rounded-sm shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Database className="w-4 h-4 text-slate-700" />
          <h2 className="font-bold text-sm text-slate-900">Browser IndexedDB Storage</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-slate-400 font-sans text-[11px] font-semibold">Saved Codebases</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{projectCount} projects</div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-slate-400 font-sans text-[11px] font-semibold">Storage Quota Estimate</div>
            <div className="text-xs font-bold text-slate-800 mt-2 truncate">{storageEstimate}</div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Clear all local repositories, files, and dependency records from your browser.
          </div>
          <button
            onClick={handleClearAllStorage}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-sm text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Purge All Local Data</span>
          </button>
        </div>
      </div>

      {/* Section 4: Privacy & About */}
      <div className="p-6 bg-slate-100 border border-slate-200 rounded-sm space-y-3 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Local Privacy &amp; Data Sovereignity</span>
        </div>
        <p className="leading-relaxed">
          REPO X-RAY processes all codebases using client-side JavaScript Web Workers and Babel parser ASTs directly within your browser window. Zero data packets are sent over the network.
        </p>
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500 font-mono text-[11px]">
          <span>REPO X-RAY Core Engine v1.0.0</span>
          <span>Light Theme Enterprise System</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

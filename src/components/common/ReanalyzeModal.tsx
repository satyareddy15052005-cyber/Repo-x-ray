import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  Folder,
  FileArchive,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Play,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useReanalyzeStore } from '../../stores/useReanalyzeStore';
import { extractZipArchive } from '../../engine/import/readZip';
import { readFileInputFileList, readFileSystemDirectoryHandle } from '../../engine/import/readDirectory';
import { runAnalysisPipeline, type PipelineStage } from '../../engine/analysis/analysisPipeline';
import { projectRepository } from '../../storage/projectRepository';
import { SAMPLE_PROJECT_FILES } from '../../data/sampleProject';

export function ReanalyzeModal() {
  const { isOpen, projectId, projectName, closeReanalyze } = useReanalyzeStore();

  const [activeTab, setActiveTab] = useState<'folder' | 'zip' | 'sample'>('folder');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ files: number; edges: number } | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsAnalyzing(false);
      setStage(null);
      setProgressMsg('');
      setProgressPercent(0);
      setErrorMsg(null);
      setSuccessInfo(null);
      cancelRef.current = false;
    }
  }, [isOpen, projectId]);

  if (!isOpen || !projectId) return null;

  const handleCancel = () => {
    cancelRef.current = true;
    setIsAnalyzing(false);
    setProgressMsg('Analysis cancelled.');
  };

  const processAndRun = async (
    files: Array<{ relativePath: string; content: string; byteSize: number }>,
    sourceType: 'directory' | 'zip' | 'sample'
  ) => {
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setSuccessInfo(null);
      cancelRef.current = false;
      setProgressMsg('Initializing analysis pipeline...');
      setProgressPercent(15);

      const targetId = projectId;
      const updatedProjectId = await runAnalysisPipeline({
        projectName: projectName || 'Updated Project',
        sourceType,
        files,
        persistSourceCode: true,
        targetProjectId: targetId,
        checkCancelled: () => cancelRef.current,
        onProgress: (pStage, cur, tot, msg) => {
          setStage(pStage);
          setProgressMsg(msg);
          let basePercent = 30;
          if (pStage === 'parsing') basePercent = 45;
          if (pStage === 'resolving') basePercent = 70;
          if (pStage === 'graph') basePercent = 85;
          if (pStage === 'metrics') basePercent = 92;
          if (pStage === 'persisting') basePercent = 97;
          if (pStage === 'complete') basePercent = 100;
          setProgressPercent(basePercent);
        },
      });

      // Get updated stats for feedback
      const full = await projectRepository.getFullProject(updatedProjectId);
      setSuccessInfo({
        files: full?.summary.indexedFiles || files.length,
        edges: full?.summary.internalEdges || 0,
      });

      // Close modal after brief success presentation
      setTimeout(() => {
        closeReanalyze();
      }, 1400);
    } catch (err: unknown) {
      if (!cancelRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      }
      setIsAnalyzing(false);
    }
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      cancelRef.current = false;
      setProgressMsg('Reading local directory files...');
      setProgressPercent(10);

      const { files } = await readFileInputFileList(fileList, (read, total) => {
        setProgressMsg(`Reading local source files (${read}/${total})...`);
        setProgressPercent(10 + Math.round((read / total) * 20));
      });

      if (files.length === 0) {
        throw new Error('No valid JavaScript/TypeScript source files found in selected directory.');
      }

      await processAndRun(files, 'directory');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setIsAnalyzing(false);
    } finally {
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      cancelRef.current = false;
      setProgressMsg(`Extracting ${file.name}...`);
      setProgressPercent(10);

      const buffer = await file.arrayBuffer();
      const { files } = extractZipArchive(buffer);

      if (files.length === 0) {
        throw new Error('No valid source files found inside the ZIP archive.');
      }

      await processAndRun(files, 'zip');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setIsAnalyzing(false);
    } finally {
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleReRunSample = async () => {
    await processAndRun(SAMPLE_PROJECT_FILES, 'sample');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reanalyze-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <RotateCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="reanalyze-modal-title" className="text-sm font-bold text-slate-900">
                  Re-analyze Codebase
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  In-Place Update
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Updating: <span className="font-semibold text-slate-700">{projectName || projectId}</span>
              </p>
            </div>
          </div>

          {!isAnalyzing && (
            <button
              onClick={closeReanalyze}
              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/50 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Informative notification */}
        <div className="px-6 py-2.5 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Upload an updated folder or ZIP archive to refresh this project in-place.</span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Analysis Failed</div>
                <div className="mt-0.5 text-red-600">{errorMsg}</div>
              </div>
            </div>
          )}

          {successInfo && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-sm text-xs text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-900">Project Updated: </span>
                <span>{successInfo.files} files, {successInfo.edges} dependency connections.</span>
              </div>
            </div>
          )}

          {isAnalyzing ? (
            /* Progress State */
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 capitalize flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>{stage ? `${stage}...` : 'Analyzing codebase...'}</span>
                </span>
                <span className="font-mono text-blue-600 font-bold">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="text-xs text-slate-500 font-mono truncate bg-slate-50 p-2.5 border border-slate-200 rounded-sm">
                {progressMsg || 'Processing source files...'}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Upload Selector Tabs & Buttons */
            <div>
              {/* Tab Header */}
              <div className="flex border-b border-slate-200 mb-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('folder')}
                  className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'folder'
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Upload Folder</span>
                </button>

                <button
                  onClick={() => setActiveTab('zip')}
                  className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'zip'
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>Upload ZIP</span>
                </button>

                <button
                  onClick={() => setActiveTab('sample')}
                  className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'sample'
                      ? 'border-blue-600 text-blue-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sample Project</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'folder' && (
                <div className="space-y-4">
                  <div
                    onClick={() => folderInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-sm text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform">
                      <Folder className="w-5 h-5 stroke-1.5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      Select Folder to Re-analyze
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose your local project folder to update this codebase.
                    </p>
                    <button
                      type="button"
                      className="mt-3.5 px-4 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white rounded-sm text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Folder</span>
                    </button>
                  </div>

                  <input
                    ref={folderInputRef}
                    type="file"
                    className="hidden"
                    // @ts-expect-error webkitdirectory is standard in browsers but omitted in standard React types
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderChange}
                  />
                </div>
              )}

              {activeTab === 'zip' && (
                <div className="space-y-4">
                  <div
                    onClick={() => zipInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-sm text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform">
                      <FileArchive className="w-5 h-5 stroke-1.5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      Choose .zip Archive to Re-analyze
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload an exported zip archive of your codebase.
                    </p>
                    <button
                      type="button"
                      className="mt-3.5 px-4 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white rounded-sm text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select .zip File</span>
                    </button>
                  </div>

                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    onChange={handleZipChange}
                  />
                </div>
              )}

              {activeTab === 'sample' && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-sm space-y-3">
                  <div className="font-bold text-sm text-slate-900">Re-run Sample Architecture</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Reload the multi-tier sample codebase into this project. This updates your files, circular dependencies,
                    and dependency graph using the verified reference set.
                  </p>
                  <button
                    onClick={handleReRunSample}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Re-analyze with Sample Codebase</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Project ID: <span className="font-mono text-slate-700">{projectId}</span></span>
          {!isAnalyzing && (
            <button
              onClick={closeReanalyze}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200/50 font-medium transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

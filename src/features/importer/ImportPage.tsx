import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Folder,
  FileArchive,
  Upload,
  Play,
  FileCheck,
  AlertCircle,
  ShieldCheck,
  X,
  FileText,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { extractZipArchive } from '../../engine/import/readZip';
import { readFileInputFileList, readFileSystemDirectoryHandle } from '../../engine/import/readDirectory';
import { runAnalysisPipeline, type PipelineStage } from '../../engine/analysis/analysisPipeline';
import { projectRepository } from '../../storage/projectRepository';
import { SAMPLE_PROJECT_NAME, SAMPLE_PROJECT_FILES } from '../../data/sampleProject';

export function ImportPage() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const targetProjectId = routeProjectId || searchParams.get('reanalyze') || searchParams.get('updateProjectId') || null;
  const [existingProject, setExistingProject] = useState<{ id: string; name: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'folder' | 'zip' | 'sample' | 'portable'>('folder');
  const [projectName, setProjectName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (targetProjectId) {
      projectRepository.getProject(targetProjectId).then(p => {
        if (p) {
          setExistingProject({ id: p.id, name: p.name });
          setProjectName(p.name);
        }
      });
    } else {
      setExistingProject(null);
    }
  }, [targetProjectId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const portableInputRef = useRef<HTMLInputElement>(null);

  const handleCancel = () => {
    cancelRef.current = true;
    setCancelled(true);
    setIsAnalyzing(false);
    setProgressMsg('Analysis cancelled by user.');
  };

  const readAndAnalyzeFileList = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      cancelRef.current = false;
      setCancelled(false);
      setProgressMsg('Reading files from selected directory...');
      setProgressPercent(10);

      // Infer project name from directory
      const firstPath = fileList[0].webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'Imported Project';
      const name = projectName.trim() || folderName;

      const { files, errors } = await readFileInputFileList(fileList, (read, total) => {
        setProgressMsg(`Reading local source files (${read}/${total})...`);
        setProgressPercent(10 + Math.round((read / total) * 20));
      });

      if (files.length === 0) {
        throw new Error('No valid source files found after applying ignore exclusions.');
      }

      const projectId = await runAnalysisPipeline({
        projectName: name,
        sourceType: 'directory',
        files,
        persistSourceCode: true,
        targetProjectId: targetProjectId || undefined,
        checkCancelled: () => cancelRef.current,
        onProgress: (pStage, cur, tot, msg) => {
          setStage(pStage);
          setProgressMsg(msg);
          let basePercent = 30;
          if (pStage === 'parsing') basePercent = 40;
          if (pStage === 'resolving') basePercent = 65;
          if (pStage === 'graph') basePercent = 80;
          if (pStage === 'metrics') basePercent = 90;
          if (pStage === 'persisting') basePercent = 95;
          if (pStage === 'complete') basePercent = 100;
          setProgressPercent(basePercent);
        },
      });

      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      if (!cancelRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      }
      setIsAnalyzing(false);
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      await readAndAnalyzeFileList(fileList);
    }
  };

  const handleDirectoryPicker = async () => {
    // Check if running in an iframe / cross-origin subframe (e.g. AI Studio preview)
    let isSubframe = false;
    try {
      isSubframe = window.self !== window.top;
    } catch {
      isSubframe = true;
    }

    // Browsers strictly disallow showDirectoryPicker inside cross-origin iframes.
    // The standard HTML directory file input works 100% reliably in all iframe and browser contexts!
    if (isSubframe || !('showDirectoryPicker' in window)) {
      fileInputRef.current?.click();
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
      setIsAnalyzing(true);
      setErrorMsg(null);
      cancelRef.current = false;
      setCancelled(false);
      setProgressMsg('Scanning directory structure...');
      setProgressPercent(10);

      const name = projectName.trim() || dirHandle.name || 'Imported Project';
      const { files } = await readFileSystemDirectoryHandle(dirHandle, '', count => {
        setProgressMsg(`Discovered ${count} files...`);
      });

      if (files.length === 0) {
        throw new Error('No valid source files found in selected directory.');
      }

      const projectId = await runAnalysisPipeline({
        projectName: name,
        sourceType: 'directory',
        files,
        persistSourceCode: true,
        targetProjectId: targetProjectId || undefined,
        checkCancelled: () => cancelRef.current,
        onProgress: (pStage, cur, tot, msg) => {
          setStage(pStage);
          setProgressMsg(msg);
          let basePercent = 30;
          if (pStage === 'parsing') basePercent = 40;
          if (pStage === 'resolving') basePercent = 65;
          if (pStage === 'graph') basePercent = 80;
          if (pStage === 'metrics') basePercent = 90;
          if (pStage === 'persisting') basePercent = 95;
          if (pStage === 'complete') basePercent = 100;
          setProgressPercent(basePercent);
        },
      });

      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // User cancelled picker dialog
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);

      // If browser rejected showDirectoryPicker due to cross-origin or security, fall back silently to file input!
      if (
        msg.includes('Cross origin') ||
        msg.includes('sub frame') ||
        msg.includes('SecurityError') ||
        msg.includes('not allowed') ||
        msg.includes('permission')
      ) {
        fileInputRef.current?.click();
        return;
      }

      setErrorMsg(msg);
      setIsAnalyzing(false);
    }
  };

  const processZipFile = async (file: File) => {
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      cancelRef.current = false;
      setCancelled(false);
      setProgressMsg('Extracting ZIP archive in browser memory...');
      setProgressPercent(15);

      const buffer = await file.arrayBuffer();
      const { files } = extractZipArchive(buffer);

      if (files.length === 0) {
        throw new Error('No analyzable source files found in ZIP archive.');
      }

      const baseZipName = file.name.replace(/\.zip$/i, '');
      const name = projectName.trim() || baseZipName;

      const projectId = await runAnalysisPipeline({
        projectName: name,
        sourceType: 'zip',
        files,
        persistSourceCode: true,
        targetProjectId: targetProjectId || undefined,
        checkCancelled: () => cancelRef.current,
        onProgress: (pStage, cur, tot, msg) => {
          setStage(pStage);
          setProgressMsg(msg);
          let basePercent = 30;
          if (pStage === 'parsing') basePercent = 40;
          if (pStage === 'resolving') basePercent = 65;
          if (pStage === 'graph') basePercent = 80;
          if (pStage === 'metrics') basePercent = 90;
          if (pStage === 'persisting') basePercent = 95;
          if (pStage === 'complete') basePercent = 100;
          setProgressPercent(basePercent);
        },
      });

      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setIsAnalyzing(false);
    }
  };

  const handleZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processZipFile(file);
  };

  const handleSampleImport = async () => {
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      cancelRef.current = false;
      setCancelled(false);
      setProgressMsg('Initializing bundled source files...');
      setProgressPercent(10);

      const projectId = await runAnalysisPipeline({
        projectName: projectName.trim() || SAMPLE_PROJECT_NAME,
        sourceType: 'sample',
        files: SAMPLE_PROJECT_FILES,
        persistSourceCode: true,
        targetProjectId: targetProjectId || undefined,
        checkCancelled: () => cancelRef.current,
        onProgress: (pStage, cur, tot, msg) => {
          setStage(pStage);
          setProgressMsg(msg);
          let basePercent = 30;
          if (pStage === 'parsing') basePercent = 40;
          if (pStage === 'resolving') basePercent = 65;
          if (pStage === 'graph') basePercent = 80;
          if (pStage === 'metrics') basePercent = 90;
          if (pStage === 'persisting') basePercent = 95;
          if (pStage === 'complete') basePercent = 100;
          setProgressPercent(basePercent);
        },
      });

      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setIsAnalyzing(false);
    }
  };

  const handlePortableArchive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setProgressMsg('Reading portable .rxray archive...');
      setProgressPercent(30);

      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.format !== 'repo-xray-archive' || !parsed.data) {
        throw new Error('Invalid REPO X-RAY archive file.');
      }

      await projectRepository.saveAnalysis(parsed.data);
      setProgressPercent(100);
      navigate(`/projects/${parsed.data.project.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-6">
      {/* Re-analysis Notice if updating an existing project */}
      {existingProject && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-sm bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
              <RotateCw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Re-analyzing Existing Project</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                  In-Place Update
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Updating <span className="font-semibold text-slate-800">{existingProject.name}</span> (<code className="text-[11px] font-mono text-slate-700">{existingProject.id}</code>).
                Uploaded folder or ZIP will update this codebase in-place without creating a duplicate project.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/projects/${existingProject.id}`)}
            className="text-xs text-blue-700 hover:underline font-semibold shrink-0 pt-1"
          >
            Cancel & Return
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {existingProject ? `Re-analyze: ${existingProject.name}` : 'Analyze a New Codebase'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {existingProject
            ? 'Select an updated directory or ZIP archive to refresh dependency graphs and architecture insights.'
            : 'Choose a real source-code project. REPO X-RAY will construct its architecture map locally.'}
        </p>
      </div>

      {/* Main card */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-xs overflow-hidden">
        {/* Method tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('folder')}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'folder'
                ? 'border-blue-600 text-blue-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Folder className="w-4 h-4 text-blue-600" />
            <span>Project Folder</span>
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'zip'
                ? 'border-blue-600 text-blue-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileArchive className="w-4 h-4 text-blue-600" />
            <span>Upload ZIP</span>
          </button>

          <button
            onClick={() => setActiveTab('sample')}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'sample'
                ? 'border-blue-600 text-blue-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Play className="w-4 h-4 text-blue-600 fill-blue-600" />
            <span>Sample Codebase</span>
          </button>

          <button
            onClick={() => setActiveTab('portable')}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'portable'
                ? 'border-blue-600 text-blue-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Restore .rxray</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Optional project name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Project Name (Optional)
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. My Awesome Web App (defaults to folder / package.json name)"
              disabled={isAnalyzing}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-sm focus:outline-hidden focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Active method interactive panel */}
          {!isAnalyzing && (
            <div>
              {activeTab === 'folder' && (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const first = e.dataTransfer.files[0];
                      if (first.name.endsWith('.zip')) {
                        await processZipFile(first);
                        return;
                      }
                      await readAndAnalyzeFileList(e.dataTransfer.files);
                    }
                  }}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-sm p-8 text-center transition-colors bg-slate-50/50"
                >
                  <Folder className="w-10 h-10 text-blue-600 mx-auto mb-3 stroke-1" />
                  <h3 className="font-semibold text-sm text-slate-900">Select or Drop Project Folder</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Choose a project folder from your computer or drag it here.
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      onClick={handleDirectoryPicker}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Choose Folder</span>
                    </button>
                  </div>

                  {/* Fallback hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFolderSelect}
                    // @ts-expect-error webkitdirectory is standard browser extension
                    webkitdirectory=""
                    directory=""
                    multiple
                    className="hidden"
                  />
                </div>
              )}

              {activeTab === 'zip' && (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.name.endsWith('.zip')) {
                      await processZipFile(file);
                    }
                  }}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-sm p-8 text-center transition-colors bg-slate-50/50"
                >
                  <FileArchive className="w-10 h-10 text-blue-600 mx-auto mb-3 stroke-1" />
                  <h3 className="font-semibold text-sm text-slate-900">Upload Project .zip Archive</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Select a .zip archive of your source code repository.
                  </p>

                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => zipInputRef.current?.click()}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Select .zip File</span>
                    </button>
                    <input
                      type="file"
                      ref={zipInputRef}
                      accept=".zip"
                      onChange={handleZipFile}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'sample' && (
                <div className="border border-slate-200 rounded-sm p-6 bg-slate-50/50">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded">
                      <Play className="w-6 h-6 fill-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-900">Sample Codebase (22 Files)</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Pre-bundled React and TypeScript project with components, hooks, services, and a circular cycle for testing.
                      </p>
                      <div className="mt-4">
                        <button
                          onClick={handleSampleImport}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Analyze Sample</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'portable' && (
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-sm p-8 text-center transition-colors bg-slate-50/50">
                  <FileText className="w-10 h-10 text-blue-600 mx-auto mb-3 stroke-1" />
                  <h3 className="font-semibold text-sm text-slate-900">Import .rxray Archive</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    Restore previously exported architecture analysis without re-parsing raw source files.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => portableInputRef.current?.click()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Select .rxray File</span>
                    </button>
                    <input
                      type="file"
                      ref={portableInputRef}
                      accept=".rxray,.json"
                      onChange={handlePortableArchive}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis in Progress */}
          {isAnalyzing && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-sm space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin inline-block shrink-0" />
                  <span>{progressMsg || 'Processing source files...'}</span>
                </span>
                <span className="font-mono text-blue-600 tabular-nums">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Pipeline Stages Checklist */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-500 pt-2 font-mono">
                <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 20 ? 'text-blue-700 bg-blue-50 font-medium' : ''}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Files</span>
                </div>
                <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 40 ? 'text-blue-700 bg-blue-50 font-medium' : ''}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>2. AST Parse</span>
                </div>
                <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 65 ? 'text-blue-700 bg-blue-50 font-medium' : ''}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>3. Resolution</span>
                </div>
                <div className={`p-1.5 rounded flex items-center gap-1.5 ${progressPercent >= 90 ? 'text-blue-700 bg-blue-50 font-medium' : ''}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>4. Graph & SCC</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-sm text-xs font-medium text-slate-700 transition-colors"
                >
                  Cancel Analysis
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Import Failed</div>
                <div className="mt-0.5">{errorMsg}</div>
              </div>
            </div>
          )}

          {/* Ignore and Privacy Notes */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500">
            <div>
              <div className="font-semibold text-slate-700 mb-1">Excluded by Default:</div>
              <ul className="list-disc pl-4 space-y-0.5 font-mono text-[11px] text-slate-500">
                <li>.git/, node_modules/, dist/, build/</li>
                <li>Sensitive keys (.env, *.pem, id_rsa)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-700 mb-1">Security Guarantee:</div>
              <div className="text-[11px] leading-relaxed">
                Code is analyzed completely in browser memory. No code is transmitted to any external server or API.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  FileCode,
  AlertTriangle,
  BarChart3,
  Zap,
  ShieldCheck,
  ArrowRight,
  FolderTree,
  Upload,
  Play,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { runAnalysisPipeline } from '../../engine/analysis/analysisPipeline';
import { SAMPLE_PROJECT_NAME, SAMPLE_PROJECT_FILES } from '../../data/sampleProject';

export function LandingPage() {
  const navigate = useNavigate();
  const [isAnalyzingSample, setIsAnalyzingSample] = useState(false);
  const [sampleProgress, setSampleProgress] = useState('');

  const handleRunSampleProject = async () => {
    try {
      setIsAnalyzingSample(true);
      const projectId = await runAnalysisPipeline({
        projectName: SAMPLE_PROJECT_NAME,
        sourceType: 'sample',
        files: SAMPLE_PROJECT_FILES,
        persistSourceCode: true,
        onProgress: (_stage, _cur, _tot, msg) => {
          setSampleProgress(msg);
        },
      });
      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      console.error(err);
      setIsAnalyzingSample(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-slate-200 bg-white px-6 md:px-12 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <BrandLogo className="w-6 h-6" />
          <span className="font-bold text-base tracking-tight text-slate-900">REPO X-RAY</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
          <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-sm hover:bg-slate-50 transition-colors"
          >
            My Projects
          </button>
          <button
            onClick={() => navigate('/projects/new')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-sm hover:bg-blue-700 transition-colors"
          >
            Open Workspace
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 md:py-20 px-6 md:px-12 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight max-w-3xl mx-auto">
          Map Every Connection in Your Codebase
        </h1>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/projects/new')}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Analyze Codebase</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunSampleProject}
            disabled={isAnalyzingSample}
            className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-sm border border-slate-300 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
            <span>{isAnalyzingSample ? 'Analyzing Sample...' : 'Try Sample Project'}</span>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="w-full sm:w-auto px-5 py-2.5 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
          >
            My Projects
          </button>
        </div>

        {isAnalyzingSample && (
          <div className="mt-4 text-xs text-blue-700 font-mono flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin inline-block" />
            <span>{sampleProgress || 'Analyzing sample codebase...'}</span>
          </div>
        )}

        {/* Hero Visual UI Mockup */}
        <div className="mt-12 relative rounded-sm border border-slate-200 bg-white shadow-xl overflow-hidden text-left">
          {/* Mock Window Title Bar */}
          <div className="h-9 bg-slate-100 border-b border-slate-200 px-4 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              <span className="ml-2 font-medium text-slate-700">Dependency Graph</span>
            </div>
            <div className="text-[11px] text-slate-400">22 files · 24 edges · 1 cycle</div>
          </div>

          {/* Interactive preview diagram inside hero */}
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-[#F8FAFC]">
            {/* Column 1: Tree */}
            <div className="p-4 bg-white font-mono text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Files</div>
              <div className="text-slate-800 font-medium">src/</div>
              <div className="pl-3 text-blue-600 font-semibold bg-blue-50 py-0.5 px-1 rounded-xs">├ App.tsx</div>
              <div className="pl-3 text-slate-600">├ components/</div>
              <div className="pl-6 text-slate-600">├ Header.tsx</div>
              <div className="pl-6 text-slate-600">└ Sidebar.tsx</div>
              <div className="pl-3 text-slate-600">├ services/</div>
              <div className="pl-6 text-slate-600">├ authService.ts</div>
              <div className="pl-6 text-slate-600">└ apiClient.ts</div>
            </div>

            {/* Column 2 & 3: Interactive Node Map */}
            <div className="col-span-2 p-6 flex flex-col justify-center items-center gap-4 bg-[#F8FAFC] relative">
              <div className="flex items-center gap-6">
                <div className="px-4 py-2.5 bg-white border border-blue-600 rounded-sm shadow-xs min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span className="font-mono text-xs font-bold text-slate-900">App.tsx</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 font-mono">5 imports · 1 caller</div>
                </div>

                <div className="text-blue-500 font-bold">➔</div>

                <div className="px-4 py-2.5 bg-white border border-slate-300 rounded-sm shadow-xs min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-slate-600" />
                    <span className="font-mono text-xs font-bold text-slate-900">authService.ts</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 font-mono">3 imports · 3 callers</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="px-4 py-2.5 bg-amber-50/80 border border-amber-300 rounded-sm min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-mono text-xs font-bold text-amber-900">syncManager.ts</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-amber-700">Circular Dependency</div>
                </div>

                <div className="text-amber-500 font-bold">⇄</div>

                <div className="px-4 py-2.5 bg-amber-50/80 border border-amber-300 rounded-sm min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-mono text-xs font-bold text-amber-900">conflictResolver.ts</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-amber-700">Circular Dependency</div>
                </div>
              </div>
            </div>

            {/* Column 4: Inspector */}
            <div className="p-4 bg-white font-mono text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Inspector</div>
              <div className="font-bold text-slate-900 text-sm">App.tsx</div>
              <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                <div className="text-slate-600 font-sans font-semibold">Dependencies:</div>
                <div className="text-blue-600 font-mono">Header.tsx</div>
                <div className="text-blue-600 font-mono">Sidebar.tsx</div>
                <div className="text-blue-600 font-mono">authService.ts</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Panels */}
      <section id="features" className="py-14 bg-white border-t border-b border-slate-200 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Key Features
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Pure AST analysis and graph metrics calculated on your device.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-sm">
              <Layers className="w-5 h-5 text-blue-600 mb-2.5" />
              <h3 className="font-semibold text-sm text-slate-900">Dependency Graph</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Visual directed graph with 4 layout orientations, zoom, node drag, and stable coordinates.
              </p>
            </div>

            <div className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-sm">
              <FileCode className="w-5 h-5 text-blue-600 mb-2.5" />
              <h3 className="font-semibold text-sm text-slate-900">Code Explorer</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Integrated Monaco code viewer with syntax highlighting and jump-to-import navigation.
              </p>
            </div>

            <div className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 mb-2.5" />
              <h3 className="font-semibold text-sm text-slate-900">Circular Cycles</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Detect cyclic dependencies and circular groups using Tarjan SCC analysis.
              </p>
            </div>

            <div className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-sm">
              <BarChart3 className="w-5 h-5 text-blue-600 mb-2.5" />
              <h3 className="font-semibold text-sm text-slate-900">Architecture Insights</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Track caller counts (fan-in), outgoing calls (fan-out), and unreferenced files.
              </p>
            </div>

            <div className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-sm">
              <Zap className="w-5 h-5 text-blue-600 mb-2.5" />
              <h3 className="font-semibold text-sm text-slate-900">Impact Analysis</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Select any file to see downstream dependents before refactoring or deleting.
              </p>
            </div>

            <div className="p-5 bg-[#F8FAFC] border border-slate-200 rounded-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2.5" />
              <h3 className="font-semibold text-sm text-slate-900">Private & Local</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                No code ever leaves your browser. Parsing and database storage stay local.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-14 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="text-center max-w-md mx-auto mb-10">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-5 bg-white border border-slate-200 rounded-sm">
            <div className="text-blue-600 font-mono font-bold text-xs mb-1">STEP 1</div>
            <h3 className="font-semibold text-sm text-slate-900">Upload Folder or ZIP</h3>
            <p className="mt-1 text-xs text-slate-500">
              Select your local repository. Excludes node_modules automatically.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-sm">
            <div className="text-blue-600 font-mono font-bold text-xs mb-1">STEP 2</div>
            <h3 className="font-semibold text-sm text-slate-900">Parse Syntax Trees</h3>
            <p className="mt-1 text-xs text-slate-500">
              Extracts ES and CommonJS imports and builds dependency edges.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-sm">
            <div className="text-blue-600 font-mono font-bold text-xs mb-1">STEP 3</div>
            <h3 className="font-semibold text-sm text-slate-900">Explore & Export</h3>
            <p className="mt-1 text-xs text-slate-500">
              Navigate the graph, trace cycles, and export SVG or reports.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="py-12 bg-slate-100 border-t border-slate-200 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <Lock className="w-6 h-6 text-slate-700 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-slate-900">Your Code Stays on Your Device</h2>
          <p className="mt-2 text-xs text-slate-600 max-w-lg mx-auto">
            All analysis executes in your local browser IndexedDB. No files are uploaded to any external server.
          </p>
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => navigate('/projects/new')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-sm transition-colors cursor-pointer"
            >
              Start Analysis
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-200 px-6 md:px-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-5 h-5" />
            <span className="font-bold text-slate-800">REPO X-RAY</span>
            <span>· Codebase Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

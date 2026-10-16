import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Copy,
  Check,
  WrapText,
  ZoomIn,
  ZoomOut,
  FileCode,
  Search,
  ExternalLink,
} from 'lucide-react';

interface CodeViewerProps {
  code: string | null;
  relativePath: string;
  language?: string;
  onNavigateImport?: (specifier: string) => void;
}

export function CodeViewer({
  code,
  relativePath,
  language,
}: CodeViewerProps) {
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('off');
  const [fontSize, setFontSize] = useState<number>(13);
  const [copied, setCopied] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(relativePath);
    setPathCopied(true);
    setTimeout(() => setPathCopied(false), 2000);
  };

  const detectedLanguage = React.useMemo(() => {
    if (language) return language;
    if (relativePath.endsWith('.ts') || relativePath.endsWith('.mts')) return 'typescript';
    if (relativePath.endsWith('.tsx')) return 'typescript';
    if (relativePath.endsWith('.js') || relativePath.endsWith('.mjs') || relativePath.endsWith('.cjs')) return 'javascript';
    if (relativePath.endsWith('.jsx')) return 'javascript';
    if (relativePath.endsWith('.json')) return 'json';
    if (relativePath.endsWith('.css')) return 'css';
    if (relativePath.endsWith('.html')) return 'html';
    return 'plaintext';
  }, [relativePath, language]);

  if (code === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
        <FileCode className="w-12 h-12 text-slate-300 mb-3 stroke-1" />
        <div className="font-semibold text-sm text-slate-800">Source Code Unavailable</div>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Raw source content for this file was not stored in browser persistence or requires re-importing the project directory.
        </p>
      </div>
    );
  }

  const lineCount = code.split('\n').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Top action bar */}
      <div className="h-10 border-b border-slate-200 px-4 flex items-center justify-between text-xs bg-slate-50 shrink-0">
        <div className="flex items-center gap-2 font-mono text-slate-700 min-w-0">
          <span className="truncate" title={relativePath}>{relativePath}</span>
          <button
            onClick={handleCopyPath}
            title="Copy file path"
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors shrink-0"
          >
            {pathCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400 mr-2 tabular-nums">
            {lineCount} lines · {(new Blob([code]).size / 1024).toFixed(1)} KB
          </span>

          <button
            onClick={() => setFontSize(s => Math.max(10, s - 1))}
            title="Decrease font size"
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/50"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] text-slate-500 font-mono w-5 text-center">
            {fontSize}
          </span>

          <button
            onClick={() => setFontSize(s => Math.min(22, s + 1))}
            title="Increase font size"
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/50"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />

          <button
            onClick={() => setWordWrap(w => (w === 'on' ? 'off' : 'on'))}
            title={`Word wrap: ${wordWrap}`}
            className={`p-1 rounded transition-colors ${wordWrap === 'on' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyCode}
            title="Copy full source code"
            className="flex items-center gap-1 px-2 py-1 text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 text-[11px] font-medium transition-colors ml-1"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor viewport */}
      <div className="flex-1 w-full h-full relative">
        <Editor
          height="100%"
          language={detectedLanguage}
          value={code}
          theme="light"
          options={{
            readOnly: true,
            domReadOnly: true,
            fontSize,
            lineNumbers: 'on',
            minimap: { enabled: lineCount > 60 },
            wordWrap,
            scrollBeyondLastLine: false,
            renderWhitespace: 'none',
            folding: true,
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            contextmenu: true,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          loading={
            <div className="p-6 font-mono text-xs text-slate-400">
              Loading syntax inspector...
            </div>
          }
        />
      </div>
    </div>
  );
}

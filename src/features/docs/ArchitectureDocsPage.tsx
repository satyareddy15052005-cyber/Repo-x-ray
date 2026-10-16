import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Printer,
  Code,
  FileCode,
  Layers,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { downloadFile } from '../../services/downloadFile';

interface SectionConfig {
  id: string;
  title: string;
  enabled: boolean;
}

export function ArchitectureDocsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [projectData, setProjectData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [sections, setSections] = useState<SectionConfig[]>([
    { id: 'overview', title: '1. Project Overview & Architecture Type', enabled: true },
    { id: 'structure', title: '2. Repository Directory Structure', enabled: true },
    { id: 'entrypoints', title: '3. Detected Entry Points & Configuration', enabled: true },
    { id: 'modules', title: '4. Main Architectural Modules & Subsystems', enabled: true },
    { id: 'responsibilities', title: '5. Inferred Module Responsibilities', enabled: true },
    { id: 'moduleDeps', title: '6. Module-to-Module Dependency Matrix', enabled: true },
    { id: 'fileDeps', title: '7. Core File Dependency Graph', enabled: true },
    { id: 'functions', title: '8. Function Call Relationships', enabled: true },
    { id: 'cycles', title: '9. Circular Dependency Loops (SCC)', enabled: true },
    { id: 'hotspots', title: '10. Architectural Hotspots (High Fan-In/Fan-Out)', enabled: true },
    { id: 'limitations', title: '11. Analysis Limitations & Unresolved Imports', enabled: true },
    { id: 'deadcode', title: '12. Dead Code & Unused Declarations Summary', enabled: true },
    { id: 'rules', title: '13. Architecture Rule Compliance & Violations', enabled: true },
    { id: 'complexity', title: '14. Code Complexity & Nesting Metrics', enabled: true },
    { id: 'risk', title: '15. Change Risk Assessment & Blast Radius', enabled: true },
    { id: 'duplicates', title: '16. Code Duplication Findings', enabled: true },
    { id: 'scope', title: '17. Analysis Date & Engine Scope', enabled: true },
  ]);

  useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId]);

  async function loadData() {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await projectRepository.getFullProject(projectId);
      setProjectData(data);
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(id: string) {
    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }

  // Generate grounded Markdown documentation
  const generatedMarkdown = useMemo(() => {
    if (!projectData) return '';

    const p = projectData.project;
    const s = projectData.summary;
    const activeIds = new Set(sections.filter(sec => sec.enabled).map(sec => sec.id));

    let md = `# Architecture Documentation: ${p.name}\n\n`;
    md += `*Generated automatically by **REPO X-RAY** static analysis engine from verified client-side AST inspection.*\n\n---\n\n`;

    // 1. Overview
    if (activeIds.has('overview')) {
      md += `## 1. Project Overview & Architecture Type\n\n`;
      md += `- **Project Name:** ${p.name}\n`;
      md += `- **Detected Project Type:** ${p.projectType || 'Standard JavaScript/TypeScript'}\n`;
      md += `- **Source Ingestion Type:** ${p.sourceType}\n`;
      md += `- **Total Analyzed Files:** ${p.fileCount}\n`;
      md += `- **Analysis Timestamp:** ${p.analyzedAt}\n`;
      md += `- **Analysis Duration:** ${s.analysisDurationMs} ms\n\n`;
    }

    // 2. Structure
    if (activeIds.has('structure')) {
      md += `## 2. Repository Directory Structure\n\n`;
      const folders = Array.from(
        new Set(projectData.files.map(f => f.relativePath.split('/')[0]))
      ).sort();
      md += `Top-level directories detected in this codebase:\n`;
      for (const folder of folders) {
        const fileCount = projectData.files.filter(f => f.relativePath.startsWith(folder + '/')).length;
        md += `- \`${folder}/\` (${fileCount} source files)\n`;
      }
      md += `\n`;
    }

    // 3. Entry Points & Config
    if (activeIds.has('entrypoints')) {
      md += `## 3. Detected Entry Points & Configuration\n\n`;
      const entryPoints = projectData.files.filter(f => f.isEntryPoint);
      if (entryPoints.length > 0) {
        md += `Primary codebase entry points:\n`;
        for (const ep of entryPoints) {
          md += `- \`${ep.relativePath}\` (${ep.lineCount} lines)\n`;
        }
      } else {
        md += `No standalone top-level entry point strictly designated.\n`;
      }
      md += `\n`;
    }

    // 4. Modules
    if (activeIds.has('modules')) {
      md += `## 4. Main Architectural Modules & Subsystems\n\n`;
      md += `Identified ${projectData.modules.length} subsystem modules:\n\n`;
      md += `| Module Name | Path | Files Count | Internal Edges | Cross-Module Edges |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- |\n`;
      for (const m of projectData.modules) {
        md += `| **${m.name}** | \`${m.relativePath}\` | ${m.fileIds.length} | ${m.internalEdgeCount || 0} | ${(m.incomingCrossEdgeCount || 0) + (m.outgoingCrossEdgeCount || 0)} |\n`;
      }
      md += `\n`;
    }

    // 5. Inferred Responsibilities
    if (activeIds.has('responsibilities')) {
      md += `## 5. Inferred Module Responsibilities\n\n`;
      md += `*(Note: The following responsibilities are strictly inferred from structural heuristics, folder conventions, and imported symbols)*\n\n`;
      for (const m of projectData.modules) {
        let role = 'General application logic';
        const lower = m.relativePath.toLowerCase();
        if (lower.includes('component')) role = 'Presentation UI components';
        else if (lower.includes('feature') || lower.includes('page')) role = 'Feature domain views and application routing';
        else if (lower.includes('engine') || lower.includes('parser') || lower.includes('resolver')) role = 'Core computation, parsing, and analysis logic';
        else if (lower.includes('service') || lower.includes('api')) role = 'Data communication, network, or business services';
        else if (lower.includes('store') || lower.includes('state')) role = 'Client-side state management';
        else if (lower.includes('storage') || lower.includes('db')) role = 'Persistent database storage and schemas';
        else if (lower.includes('util') || lower.includes('helper')) role = 'Shared utility and helper routines';
        else if (lower.includes('type')) role = 'Domain contracts and TypeScript interfaces';

        md += `- **${m.name}** (\`${m.relativePath}\`): Inferred as **${role}**.\n`;
      }
      md += `\n`;
    }

    // 6. Module Dependencies Matrix
    if (activeIds.has('moduleDeps')) {
      md += `## 6. Module-to-Module Dependency Matrix\n\n`;
      md += `The codebase contains **${projectData.edges.length}** internal directed dependency edges across modules.\n\n`;
    }

    // 7. Core File Dependencies
    if (activeIds.has('fileDeps')) {
      md += `## 7. Core File Dependency Graph\n\n`;
      md += `- Total Indexed Files: **${s.indexedFiles}**\n`;
      md += `- Internal Dependency Edges: **${s.internalEdges}**\n`;
      md += `- Total Import Statements: **${s.totalImports}**\n`;
      md += `- External NPM Packages Referenced: ${s.externalPackages.join(', ') || 'None'}\n\n`;
    }

    // 8. Functions
    if (activeIds.has('functions')) {
      md += `## 8. Function Call Relationships\n\n`;
      const fnCount = projectData.functions?.length || s.totalFunctionsCount || 0;
      const callCount = projectData.functionCalls?.length || s.totalFunctionCallsCount || 0;
      md += `- Extracted Functions & Methods: **${fnCount}**\n`;
      md += `- Resolved Internal Function Call Edges: **${callCount}**\n\n`;
    }

    // 9. Cycles
    if (activeIds.has('cycles')) {
      md += `## 9. Circular Dependency Loops (Tarjan SCC)\n\n`;
      if (s.circularGroups.length === 0) {
        md += `✓ **Zero circular dependency cycles detected!** Clean directed acyclic architecture.\n\n`;
      } else {
        md += `⚠ **${s.circularGroups.length} circular dependency cycle(s) identified:**\n\n`;
        s.circularGroups.forEach((group, idx) => {
          md += `### Cycle Group #${idx + 1} (${group.paths.length} files)\n`;
          for (const path of group.paths) {
            md += `  - \`${path}\`\n`;
          }
          md += `\n`;
        });
      }
    }

    // 10. Hotspots
    if (activeIds.has('hotspots')) {
      md += `## 10. Architectural Hotspots (High Fan-In/Fan-Out)\n\n`;
      md += `### Top Depended-On Files (Highest Fan-In):\n`;
      for (const item of s.topFanIn.slice(0, 5)) {
        md += `- \`${item.path}\` — imported by **${item.count}** files\n`;
      }
      md += `\n### Top Consumer Files (Highest Fan-Out):\n`;
      for (const item of s.topFanOut.slice(0, 5)) {
        md += `- \`${item.path}\` — imports **${item.count}** files\n`;
      }
      md += `\n`;
    }

    // 11. Limitations
    if (activeIds.has('limitations')) {
      md += `## 11. Analysis Limitations & Unresolved Imports\n\n`;
      const unresolved = projectData.dependencies.filter(d => d.resolutionStatus === 'unresolved');
      md += `- Unresolved internal specifiers: **${unresolved.length}**\n`;
      md += `- Dynamic import expressions requiring runtime eval: **${projectData.dependencies.filter(d => d.kind === 'dynamic-literal').length}**\n\n`;
    }

    // 12. Dead Code
    if (activeIds.has('deadcode')) {
      md += `## 12. Dead Code & Unused Declarations Summary\n\n`;
      const deadCount = projectData.deadCodeFindings?.length || s.deadCodeFindingsCount || 0;
      md += `Identified **${deadCount}** potential dead-code findings across the repository.\n\n`;
    }

    // 13. Rules
    if (activeIds.has('rules')) {
      md += `## 13. Architecture Rule Compliance & Violations\n\n`;
      const violCount = projectData.ruleViolations?.length || s.ruleViolationsCount || 0;
      if (violCount === 0) {
        md += `✓ **Zero architectural violations recorded against active layer rules.**\n\n`;
      } else {
        md += `⚠ **${violCount} architectural boundary violations detected.** Review Architecture Rules page for details.\n\n`;
      }
    }

    // 14. Complexity
    if (activeIds.has('complexity')) {
      md += `## 14. Code Complexity & Nesting Metrics\n\n`;
      const avg = s.avgCyclomaticComplexity || 1;
      md += `- Average Cyclomatic Complexity: **${avg}**\n\n`;
    }

    // 15. Risk
    if (activeIds.has('risk')) {
      md += `## 15. Change Risk Assessment & Blast Radius\n\n`;
      const highRisk = s.highRiskFilesCount || 0;
      md += `- High-Risk / High-Centrality Files: **${highRisk}**\n\n`;
    }

    // 16. Duplicates
    if (activeIds.has('duplicates')) {
      md += `## 16. Code Duplication Findings\n\n`;
      const dupCount = projectData.duplicateGroups?.length || s.duplicateGroupsCount || 0;
      md += `- Detected Structural Duplicate Groups: **${dupCount}**\n\n`;
    }

    // 17. Scope
    if (activeIds.has('scope')) {
      md += `## 17. Analysis Date & Engine Scope\n\n`;
      md += `Analysis completed client-side on **${p.analyzedAt}** using Babel AST syntax walker and Tarjan SCC algorithms. Zero code egressed to remote clouds.\n`;
    }

    return md;
  }, [projectData, sections]);

  // Download Markdown file
  function handleDownloadMarkdown() {
    downloadFile(
      generatedMarkdown,
      `architecture-docs-${projectData?.project.name || 'codebase'}.md`,
      'text/markdown'
    );
  }

  // Download Standalone Offline HTML file
  function handleDownloadHtml() {
    if (!projectData) return;

    // Convert markdown to clean, self-contained HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Architecture Documentation - ${projectData.project.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; color: #0f172a; }
    h2 { font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 36px; color: #1e293b; }
    h3 { font-size: 16px; margin-top: 24px; color: #334155; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; font-family: ui-monospace, monospace; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    ul { padding-left: 24px; }
    li { margin-bottom: 6px; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #166534; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="content">
    <pre style="display:none;"></pre>
    ${generatedMarkdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\n\n/gim, '<p></p>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')}
  </div>
  <div class="footer">
    Generated by REPO X-RAY &bull; 100% Client-Side Static Analysis &bull; Offline Architecture Document
  </div>
</body>
</html>`;

    downloadFile(
      htmlContent,
      `architecture-docs-${projectData.project.name}.html`,
      'text/html'
    );
  }

  // Copy to clipboard
  function handleCopy() {
    navigator.clipboard.writeText(generatedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !projectData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Compiling architecture documentation...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Automatic Architecture Documentation
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Source-grounded architectural specification generated directly from AST syntax trees, dependency graphs, and code metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Markdown (.md)
          </button>
          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Offline HTML (.html)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Section Toggles */}
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                Include Sections ({sections.filter(s => s.enabled).length}/17)
              </h2>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {sections.map(section => (
                <label
                  key={section.id}
                  className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-50 select-none"
                >
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => toggleSection(section.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="truncate">{section.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Preview */}
        <div className="lg:col-span-3">
          <div className="p-6 bg-white border border-slate-200 rounded shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">
                Live Document Preview
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {generatedMarkdown.length} characters &bull; Markdown
              </span>
            </div>

            <pre className="p-4 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {generatedMarkdown}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

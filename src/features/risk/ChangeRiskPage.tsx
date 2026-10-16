import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  Search,
  ArrowRight,
  FileCode,
  Download,
  ShieldAlert,
  Zap,
  Layers,
  Repeat,
  Code2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { projectRepository, type FullProjectData } from '../../storage/projectRepository';
import { calculateChangeRisk } from '../../engine/risk/calculateChangeRisk';
import type {
  SourceFileRecord,
  ChangeType,
  ChangeRiskAssessment,
  ProjectRecord,
} from '../../types/domain';
import { downloadFile } from '../../services/downloadFile';

const CHANGE_TYPES: Array<{ type: ChangeType; label: string; desc: string }> = [
  {
    type: 'implementation',
    label: 'Modify Implementation',
    desc: 'Changing internal logic; export signatures and interfaces remain untouched.',
  },
  {
    type: 'signature',
    label: 'Change Function Signature',
    desc: 'Modifying arguments, return types, or method contracts.',
  },
  {
    type: 'exported-symbol',
    label: 'Change Exported Symbol',
    desc: 'Renaming, adding, or modifying exported functions, classes, or interfaces.',
  },
  {
    type: 'remove',
    label: 'Remove Function or File',
    desc: 'Critical breaking change: completely deleting or unexporting code.',
  },
  {
    type: 'dependencies',
    label: 'Change Module Dependencies',
    desc: 'Adding or replacing upstream import dependencies.',
  },
];

export function ChangeRiskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState<FullProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('');
  const [selectedChangeType, setSelectedChangeType] = useState<ChangeType>('implementation');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!projectId) return;
    loadProject();
  }, [projectId]);

  async function loadProject() {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await projectRepository.getFullProject(projectId);
      setProjectData(data);
      if (data && data.files.length > 0) {
        // Pick top fan-in file by default or first file
        const topFile = data.files.find(f => f.id === data.summary.topFanIn[0]?.fileId) || data.files[0];
        setSelectedFileId(topFile.id);
      }
    } finally {
      setLoading(false);
    }
  }

  // Available functions within selected file
  const availableFunctions = useMemo(() => {
    if (!projectData || !selectedFileId) return [];
    return (projectData.functions || []).filter(fn => fn.fileId === selectedFileId);
  }, [projectData, selectedFileId]);

  // Reset selected function when file changes
  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    setSelectedFunctionId('');
  };

  // Filtered files list for selection
  const filteredFiles = useMemo(() => {
    if (!projectData) return [];
    if (!searchQuery.trim()) return projectData.files;
    const q = searchQuery.toLowerCase();
    return projectData.files.filter(f => f.relativePath.toLowerCase().includes(q));
  }, [projectData, searchQuery]);

  // Compute Risk Assessment
  const riskAssessment: ChangeRiskAssessment | null = useMemo(() => {
    if (!projectData || !selectedFileId) return null;

    return calculateChangeRisk(
      selectedFileId,
      selectedChangeType,
      projectData.files,
      projectData.edges,
      projectData.functions || [],
      projectData.functionCalls || [],
      projectData.summary.circularGroups,
      projectData.fileComplexities || [],
      projectData.ruleViolations || [],
      selectedFunctionId || undefined
    );
  }, [projectData, selectedFileId, selectedChangeType, selectedFunctionId]);

  const selectedFile = useMemo(() => {
    return projectData?.files.find(f => f.id === selectedFileId) || null;
  }, [projectData, selectedFileId]);

  const selectedFunction = useMemo(() => {
    return (projectData?.functions || []).find(fn => fn.id === selectedFunctionId) || null;
  }, [projectData, selectedFunctionId]);

  // Export assessment as Markdown report
  function exportReport() {
    if (!riskAssessment || !selectedFile || !projectData) return;

    const reportContent = `# Pre-Change Risk Assessment Report
**Project:** ${projectData.project.name}
**Analyzed File:** \`${selectedFile.relativePath}\`
**Planned Change Type:** ${selectedChangeType}
**Risk Tier:** ${riskAssessment.riskTier.toUpperCase()} (${riskAssessment.overallScore} / 100)
**Generated:** ${new Date().toISOString()}

---

## 1. Risk Summary
- **Overall Risk Score:** ${riskAssessment.overallScore} / 100
- **Direct Dependents (Fan-In):** ${riskAssessment.directDependentsCount} files
- **Transitive Affected Files:** ${riskAssessment.transitiveDependentsCount} files
- **Potentially Affected Functions:** ${riskAssessment.affectedFunctionsCount}
- **Circular Dependency Locked:** ${riskAssessment.circularLoopParticipation ? 'YES' : 'NO'}
- **Cyclomatic Complexity:** ${riskAssessment.cyclomaticComplexity}
- **Active Rule Violations:** ${riskAssessment.ruleViolationsCount}

---

## 2. Risk Factors Breakdown
${riskAssessment.factors
  .map(f => `- **${f.name}**: ${f.score} / ${f.maxScore} pts\n  *${f.description}*`)
  .join('\n\n')}

---

## 3. Downstream Affected Files
${riskAssessment.affectedFileIds
  .map(fId => {
    const f = projectData.files.find(x => x.id === fId);
    return f ? `- \`${f.relativePath}\`` : `- ID: ${fId}`;
  })
  .join('\n')}
`;

    downloadFile(
      reportContent,
      `risk-assessment-${selectedFile.filename}-${selectedChangeType}.md`,
      'text/markdown'
    );
  }

  if (loading || !projectData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Calculating change risk models...
        </div>
      </div>
    );
  }

  const scoreColor =
    riskAssessment?.riskTier === 'high'
      ? 'text-red-600'
      : riskAssessment?.riskTier === 'medium'
      ? 'text-amber-600'
      : 'text-emerald-600';

  const badgeBg =
    riskAssessment?.riskTier === 'high'
      ? 'bg-red-50 text-red-700 border-red-200'
      : riskAssessment?.riskTier === 'medium'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Change Risk Analyzer
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Estimate downstream blast radius, affected call sites, and complexity risks before modifying code.
          </p>
        </div>

        {riskAssessment && (
          <button
            onClick={exportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Risk Report (.md)
          </button>
        )}
      </div>

      {/* Main Grid: File Picker & Change Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Selector & Change Type */}
        <div className="space-y-4">
          {/* File Picker */}
          <div className="p-4 bg-white border border-slate-200 rounded shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                1. Select File to Modify
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {projectData.files.length} files
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 border border-slate-100 rounded p-1">
              {filteredFiles.map(file => {
                const isSelected = file.id === selectedFileId;
                return (
                  <button
                    key={file.id}
                    onClick={() => handleSelectFile(file.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs truncate transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate font-mono">{file.relativePath}</div>
                  </button>
                );
              })}
            </div>

            {availableFunctions.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Scope: Specific Function or Entire File
                </label>
                <select
                  value={selectedFunctionId}
                  onChange={e => setSelectedFunctionId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Entire File (All Functions)</option>
                  {availableFunctions.map(fn => (
                    <option key={fn.id} value={fn.id}>
                      {fn.name}() (L{fn.lineStart})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Planned Change Type Selector */}
          <div className="p-4 bg-white border border-slate-200 rounded shadow-2xs space-y-3">
            <label className="text-xs font-bold text-slate-900 block">
              2. Select Planned Change Type
            </label>

            <div className="space-y-1.5">
              {CHANGE_TYPES.map(ct => {
                const isSelected = selectedChangeType === ct.type;
                return (
                  <button
                    key={ct.type}
                    onClick={() => setSelectedChangeType(ct.type)}
                    className={`w-full text-left p-2.5 rounded border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{ct.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{ct.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Risk Gauge & Factor Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {riskAssessment && selectedFile ? (
            <>
              {/* Risk Summary Hero Card */}
              <div className="p-5 bg-white border border-slate-200 rounded shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${badgeBg}`}
                    >
                      {riskAssessment.riskTier} Risk
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Score: {riskAssessment.overallScore}/100
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 font-mono mt-2 truncate max-w-md">
                    {selectedFile.relativePath}
                  </h2>

                  <p className="text-xs text-slate-600 mt-1">
                    Planned change: <strong className="text-slate-900">{selectedChangeType}</strong>. Modifying this file potentially impacts <strong>{riskAssessment.transitiveDependentsCount}</strong> downstream file(s).
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded min-w-[90px]">
                    <div className={`text-3xl font-extrabold ${scoreColor}`}>
                      {riskAssessment.overallScore}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">
                      Risk Index
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigate(
                        `/projects/${projectId}/files?file=${encodeURIComponent(
                          selectedFile.relativePath
                        )}`
                      )
                    }
                    className="p-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1.5 transition-colors"
                  >
                    <FileCode className="w-4 h-4 text-blue-600" />
                    Open File
                  </button>
                </div>
              </div>

              {/* Factors Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Contributing Deterministic Risk Factors
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {riskAssessment.factors.map(factor => (
                    <div
                      key={factor.name}
                      className="p-3.5 bg-white border border-slate-200 rounded shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{factor.name}</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {factor.score} / {factor.maxScore} pts
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (factor.score / factor.maxScore) * 100)}%`,
                          }}
                        />
                      </div>

                      <div className="text-[11px] text-slate-500">{factor.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Downstream Affected Files List */}
              <div className="p-4 bg-white border border-slate-200 rounded shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Potentially Affected Downstream Files ({riskAssessment.affectedFileIds.length})
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Transitive dependency closure
                  </span>
                </div>

                {riskAssessment.affectedFileIds.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">
                    Zero downstream dependents. Modifying this leaf file has isolated local impact.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-slate-100">
                    {riskAssessment.affectedFileIds.map(fId => {
                      const file = projectData.files.find(f => f.id === fId);
                      if (!file) return null;
                      return (
                        <div
                          key={fId}
                          className="pt-1.5 pb-1 flex items-center justify-between text-xs font-mono"
                        >
                          <span className="text-slate-800 truncate max-w-md">
                            {file.relativePath}
                          </span>
                          <button
                            onClick={() =>
                              navigate(
                                `/projects/${projectId}/files?file=${encodeURIComponent(
                                  file.relativePath
                                )}`
                              )
                            }
                            className="text-blue-600 hover:underline text-[11px] font-sans"
                          >
                            Inspect
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 bg-white border border-slate-200 rounded text-center text-slate-400">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-medium text-slate-700">
                Select a file on the left to calculate risk analysis
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

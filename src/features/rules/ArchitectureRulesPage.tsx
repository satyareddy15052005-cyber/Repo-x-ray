import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Plus,
  Download,
  Upload,
  RefreshCw,
  FileCode,
  Trash2,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { projectRepository } from '../../storage/projectRepository';
import {
  DEFAULT_ARCHITECTURE_RULES,
  evaluateArchitectureRules,
  validateRulesJson,
} from '../../engine/rules/ruleEngine';
import type {
  ArchitectureRule,
  RuleViolation,
  ProjectRecord,
  RuleType,
  RuleSeverity,
} from '../../types/domain';
import { downloadFile } from '../../services/downloadFile';

export function ArchitectureRulesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [rules, setRules] = useState<ArchitectureRule[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [loading, setLoading] = useState(true);

  // New Rule Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<ArchitectureRule>>({
    name: '',
    description: '',
    type: 'forbidden-import',
    category: 'Architecture',
    severity: 'error',
    sourcePattern: 'src/**',
    targetPattern: '',
    enabled: true,
  });

  useEffect(() => {
    if (!projectId) return;
    loadRulesAndViolations();
  }, [projectId]);

  async function loadRulesAndViolations() {
    if (!projectId) return;
    setLoading(true);
    try {
      const p = await projectRepository.getProject(projectId);
      setProject(p || null);

      let loadedRules = await projectRepository.getArchitectureRules(projectId);
      if (loadedRules.length === 0) {
        loadedRules = DEFAULT_ARCHITECTURE_RULES.map(r => ({ ...r, projectId }));
        for (const r of loadedRules) {
          await projectRepository.saveArchitectureRule(r);
        }
      }
      setRules(loadedRules);

      const loadedViolations = await projectRepository.getRuleViolations(projectId);
      setViolations(loadedViolations);
    } finally {
      setLoading(false);
    }
  }

  // Re-evaluate rules against project in IndexedDB
  async function reEvaluate() {
    if (!projectId) return;
    setLoading(true);
    try {
      const full = await projectRepository.getFullProject(projectId);
      if (full) {
        const newViolations = evaluateArchitectureRules(
          projectId,
          rules,
          full.files,
          full.edges,
          full.dependencies,
          full.summary.circularGroups
        );
        setViolations(newViolations);
        // Save in DB
        await projectRepository.saveAnalysis({
          ...full,
          ruleViolations: newViolations,
          summary: {
            ...full.summary,
            ruleViolationsCount: newViolations.length,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // Toggle rule enabled/disabled
  async function toggleRule(rule: ArchitectureRule) {
    const updated = { ...rule, enabled: !rule.enabled };
    await projectRepository.saveArchitectureRule(updated);
    const newRules = rules.map(r => (r.id === rule.id ? updated : r));
    setRules(newRules);
    // Re-evaluate
    if (projectId) {
      const full = await projectRepository.getFullProject(projectId);
      if (full) {
        const newViolations = evaluateArchitectureRules(
          projectId,
          newRules,
          full.files,
          full.edges,
          full.dependencies,
          full.summary.circularGroups
        );
        setViolations(newViolations);
      }
    }
  }

  // Delete rule
  async function deleteRule(ruleId: string) {
    await projectRepository.deleteArchitectureRule(ruleId);
    const newRules = rules.filter(r => r.id !== ruleId);
    setRules(newRules);
    if (projectId) {
      const full = await projectRepository.getFullProject(projectId);
      if (full) {
        const newViolations = evaluateArchitectureRules(
          projectId,
          newRules,
          full.files,
          full.edges,
          full.dependencies,
          full.summary.circularGroups
        );
        setViolations(newViolations);
      }
    }
  }

  // Add rule
  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newRule.name || !newRule.sourcePattern) return;

    const rule: ArchitectureRule = {
      id: `rule-custom-${Date.now()}`,
      projectId,
      name: newRule.name,
      description: newRule.description || '',
      type: newRule.type as RuleType,
      category: newRule.category || 'Custom Rule',
      severity: newRule.severity as RuleSeverity,
      sourcePattern: newRule.sourcePattern,
      targetPattern: newRule.targetPattern,
      enabled: true,
      isCustom: true,
    };

    await projectRepository.saveArchitectureRule(rule);
    const newRules = [...rules, rule];
    setRules(newRules);
    setIsModalOpen(false);
    setNewRule({
      name: '',
      description: '',
      type: 'forbidden-import',
      category: 'Architecture',
      severity: 'error',
      sourcePattern: 'src/**',
      targetPattern: '',
      enabled: true,
    });

    if (projectId) {
      const full = await projectRepository.getFullProject(projectId);
      if (full) {
        const newViolations = evaluateArchitectureRules(
          projectId,
          newRules,
          full.files,
          full.edges,
          full.dependencies,
          full.summary.circularGroups
        );
        setViolations(newViolations);
      }
    }
  }

  // Export Rules JSON
  function exportRules() {
    const jsonStr = JSON.stringify(rules, null, 2);
    downloadFile(jsonStr, `architecture-rules-${project?.name || 'repo'}.json`, 'application/json');
  }

  // Import Rules JSON
  function importRules(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const validated = validateRulesJson(parsed);
        if (validated.valid && validated.rules) {
          for (const r of validated.rules) {
            await projectRepository.saveArchitectureRule({ ...r, projectId });
          }
          await loadRulesAndViolations();
        } else {
          alert(`Invalid rules JSON: ${validated.error}`);
        }
      } catch (err: any) {
        alert(`Failed to parse JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // Stats calculation
  const totalRules = rules.length;
  const violatedRuleIds = new Set(violations.map(v => v.ruleId));
  const violatedCount = violatedRuleIds.size;
  const passedCount = totalRules - violatedCount;
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Evaluating architecture rules...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Architecture Rule Checker
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Define boundaries between UI, services, storage, and feature layers to prevent architectural drift.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
          <button
            onClick={exportRules}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export JSON
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            Import JSON
            <input type="file" accept=".json" onChange={importRules} className="hidden" />
          </label>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded">
          <div className="text-[10px] uppercase font-semibold text-slate-500">Total Rules</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalRules}</div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded">
          <div className="text-[10px] uppercase font-semibold text-emerald-600">Passed Rules</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{passedCount}</div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded">
          <div className="text-[10px] uppercase font-semibold text-red-600">Violated Rules</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{violatedCount}</div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded">
          <div className="text-[10px] uppercase font-semibold text-red-700">Error Violations</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{errorCount}</div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded">
          <div className="text-[10px] uppercase font-semibold text-amber-600">Warning Violations</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{warningCount}</div>
        </div>
      </div>

      {/* Violations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            Detected Architecture Violations ({violations.length})
          </h2>
          <button
            onClick={reEvaluate}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Re-evaluate rules
          </button>
        </div>

        {violations.length === 0 ? (
          <div className="p-6 bg-white border border-emerald-200 rounded text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-emerald-800">
              Zero Architecture Rule Violations!
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">
              All imports and dependencies adhere to configured architectural layer boundaries.
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4 font-semibold">Severity</th>
                    <th className="py-2.5 px-4 font-semibold">Rule Violated</th>
                    <th className="py-2.5 px-4 font-semibold">Source File</th>
                    <th className="py-2.5 px-4 font-semibold">Forbidden Target</th>
                    <th className="py-2.5 px-4 font-semibold">Explanation</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violations.map(violation => {
                    const isError = violation.severity === 'error';
                    return (
                      <tr key={violation.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isError
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {violation.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                          {violation.ruleName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {violation.sourcePath}
                          {violation.line && <span className="text-slate-400"> :L{violation.line}</span>}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {violation.targetPath || 'Circular Cycle'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 max-w-sm">
                          {violation.explanation}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() =>
                              navigate(
                                `/projects/${projectId}/files?file=${encodeURIComponent(
                                  violation.sourcePath
                                )}${violation.line ? `&line=${violation.line}` : ''}`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Rules Management Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-slate-600" />
          Configured Architecture Rules ({rules.length})
        </h2>

        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4 font-semibold w-16">Active</th>
                <th className="py-2.5 px-4 font-semibold">Rule Name & Details</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Source Pattern</th>
                <th className="py-2.5 px-4 font-semibold">Target Pattern</th>
                <th className="py-2.5 px-4 font-semibold">Severity</th>
                <th className="py-2.5 px-4 font-semibold text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleRule(rule)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-bold text-slate-900">{rule.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{rule.description}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                      {rule.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {rule.sourcePattern}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {rule.targetPattern || '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                        rule.severity === 'error'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                Create Architecture Rule
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRule} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., UI must not import storage"
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Why is this boundary enforced?"
                  value={newRule.description}
                  onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rule Type</label>
                  <select
                    value={newRule.type}
                    onChange={e => setNewRule({ ...newRule, type: e.target.value as RuleType })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="forbidden-import">Forbidden Import</option>
                    <option value="allowed-layers-only">Allowed Layers Only</option>
                    <option value="no-cycles-in-layer">No Cycles In Layer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={newRule.severity}
                    onChange={e => setNewRule({ ...newRule, severity: e.target.value as RuleSeverity })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="error">Error (Breaks Architecture)</option>
                    <option value="warning">Warning (Review Recommended)</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source Pattern (Glob / Path)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. src/components/**"
                  value={newRule.sourcePattern}
                  onChange={e => setNewRule({ ...newRule, sourcePattern: e.target.value })}
                  className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {newRule.type !== 'no-cycles-in-layer' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Pattern (Forbidden or Allowed Target)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. src/storage/**"
                    value={newRule.targetPattern}
                    onChange={e => setNewRule({ ...newRule, targetPattern: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

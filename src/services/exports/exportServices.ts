import type { FullProjectData } from '../../storage/projectRepository';
import type { ProjectHealthSnapshot } from '../../types/domain';
import { downloadFile } from '../downloadFile';

export function exportProjectToJson(data: FullProjectData): void {
  const exportPayload = {
    app: 'REPO X-RAY',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    project: data.project,
    summary: data.summary,
    files: data.files.map(f => ({
      id: f.id,
      relativePath: f.relativePath,
      filename: f.filename,
      extension: f.extension,
      byteSize: f.byteSize,
      lineCount: f.lineCount,
      parseStatus: f.parseStatus,
      exports: f.exports,
    })),
    dependencies: data.dependencies.map(d => ({
      id: d.id,
      sourceFileId: d.sourceFileId,
      targetFileId: d.targetFileId,
      specifier: d.specifier,
      kind: d.kind,
      resolutionStatus: d.resolutionStatus,
      externalPackage: d.externalPackage,
      line: d.line,
    })),
    edges: data.edges,
    modules: data.modules,
    issues: data.issues,
    functions: data.functions || [],
    functionCalls: data.functionCalls || [],
    deadCodeFindings: data.deadCodeFindings || [],
    ruleViolations: data.ruleViolations || [],
    duplicateGroups: data.duplicateGroups || [],
    functionComplexities: data.functionComplexities || [],
    fileComplexities: data.fileComplexities || [],
    healthSnapshots: data.healthSnapshots || [],
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const safeName = data.project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadFile(jsonString, `${safeName}-architecture-analysis.json`, 'application/json');
}

export function exportDependenciesToCsv(data: FullProjectData): void {
  const idToPath = new Map<string, string>();
  for (const f of data.files) {
    idToPath.set(f.id, f.relativePath);
  }

  const rows: string[] = [
    'source_path,target_path,import_specifier,kind,resolution_status,external_package,line',
  ];

  for (const dep of data.dependencies) {
    const sourcePath = idToPath.get(dep.sourceFileId) || dep.sourceFileId;
    const targetPath = dep.targetFileId ? (idToPath.get(dep.targetFileId) || dep.targetFileId) : '';
    const cleanSpec = `"${dep.specifier.replace(/"/g, '""')}"`;
    const extPkg = dep.externalPackage ? `"${dep.externalPackage.replace(/"/g, '""')}"` : '';

    rows.push(
      `"${sourcePath}","${targetPath}",${cleanSpec},"${dep.kind}","${dep.resolutionStatus}",${extPkg},${dep.line || ''}`
    );
  }

  const csvContent = rows.join('\n');
  const safeName = data.project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadFile(csvContent, `${safeName}-dependencies.csv`, 'text/csv');
}

export function exportFunctionsToCsv(data: FullProjectData): void {
  const rows: string[] = [
    'file_path,function_name,declaration_type,line_start,line_end,param_count,is_exported,is_default_export,caller_count,callee_count',
  ];

  const functions = data.functions || [];
  for (const fn of functions) {
    const cleanName = `"${fn.name.replace(/"/g, '""')}"`;
    const cleanPath = `"${fn.relativePath.replace(/"/g, '""')}"`;
    rows.push(
      `${cleanPath},${cleanName},"${fn.declarationType}",${fn.lineStart},${fn.lineEnd},${fn.parametersCount},${Boolean(fn.isExported)},${Boolean(fn.isDefaultExport)},${fn.callerCount || 0},${fn.calleeCount || 0}`
    );
  }

  const csvContent = rows.join('\n');
  const safeName = data.project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadFile(csvContent, `${safeName}-functions.csv`, 'text/csv');
}

export function exportComplexityToCsv(data: FullProjectData): void {
  const rows: string[] = [
    'file_path,function_name,cyclomatic_complexity,loc,parameter_count,max_nesting,branches,loops,returns,calls,tier',
  ];

  const complexities = data.functionComplexities || [];
  for (const c of complexities) {
    const cleanName = `"${c.name.replace(/"/g, '""')}"`;
    const cleanPath = `"${c.relativePath.replace(/"/g, '""')}"`;
    rows.push(
      `${cleanPath},${cleanName},${c.cyclomaticComplexity},${c.lineCount},${c.parametersCount},${c.maxNestingDepth},${c.branchesCount},${c.loopsCount},${c.returnsCount},${c.callsCount},"${c.tier}"`
    );
  }

  const csvContent = rows.join('\n');
  const safeName = data.project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadFile(csvContent, `${safeName}-complexity.csv`, 'text/csv');
}

export function exportDeadCodeToCsv(data: FullProjectData): void {
  const rows: string[] = [
    'file_path,symbol_name,category,confidence,severity,line,reason',
  ];

  const findings = data.deadCodeFindings || [];
  for (const f of findings) {
    const cleanName = `"${(f.symbolName || '').replace(/"/g, '""')}"`;
    const cleanPath = `"${f.relativePath.replace(/"/g, '""')}"`;
    const cleanReason = `"${(f.reason || '').replace(/"/g, '""')}"`;
    rows.push(
      `${cleanPath},${cleanName},"${f.category}","${f.confidence}","${f.severity}",${f.line || ''},${cleanReason}`
    );
  }

  const csvContent = rows.join('\n');
  const safeName = data.project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadFile(csvContent, `${safeName}-dead-code.csv`, 'text/csv');
}

export function exportHealthHistoryToCsv(snapshots: ProjectHealthSnapshot[], projectName: string): void {
  const rows: string[] = [
    'snapshot_id,timestamp,version,file_count,internal_edge_count,circular_group_count,dead_code_count,rule_violations_count,duplicate_group_count,avg_complexity,high_risk_files',
  ];

  for (const s of snapshots) {
    rows.push(
      `"${s.id}","${s.timestamp}",${s.analysisVersion},${s.fileCount},${s.internalEdgeCount},${s.circularGroupCount},${s.deadCodeCount},${s.ruleViolationsCount},${s.duplicateGroupCount},${s.avgComplexity},${s.highRiskFileCount}`
    );
  }

  const csvContent = rows.join('\n');
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadFile(csvContent, `${safeName}-health-history.csv`, 'text/csv');
}

export function exportProjectToPortableArchive(data: FullProjectData): void {
  const payload = {
    format: 'repo-xray-archive',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      project: data.project,
      files: data.files,
      dependencies: data.dependencies,
      edges: data.edges,
      modules: data.modules,
      summary: data.summary,
      issues: data.issues,
      functions: data.functions || [],
      functionCalls: data.functionCalls || [],
      deadCodeFindings: data.deadCodeFindings || [],
      ruleViolations: data.ruleViolations || [],
      duplicateGroups: data.duplicateGroups || [],
      functionComplexities: data.functionComplexities || [],
      fileComplexities: data.fileComplexities || [],
      healthSnapshots: data.healthSnapshots || [],
    },
  };

  const jsonString = JSON.stringify(payload);
  const safeName = data.project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadFile(jsonString, `${safeName}.rxray`, 'application/json');
}

export function exportStandaloneHtmlReport(data: FullProjectData): void {
  const { project, summary, files, modules, issues } = data;
  const safeName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  const topFanInRows = summary.topFanIn
    .slice(0, 10)
    .map(
      item =>
        `<tr>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.path)}</td>
          <td style="padding: 8px 12px; font-weight: 600; text-align: right; border-bottom: 1px solid #e2e8f0;">${item.count}</td>
        </tr>`
    )
    .join('');

  const cyclesRows = summary.circularGroups
    .map(
      (c, idx) =>
        `<div style="margin-bottom: 12px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px;">
          <div style="font-weight: 600; color: #b45309; font-size: 13px; margin-bottom: 4px;">Circular Group #${idx + 1} (${c.fileIds.length} files)</div>
          <ul style="margin: 0; padding-left: 20px; font-family: monospace; font-size: 12px; color: #78350f;">
            ${c.paths.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>`
    )
    .join('');

  const modulesRows = modules
    .map(
      m =>
        `<tr>
          <td style="padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${escapeHtml(m.name)}</td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(m.relativePath)}</td>
          <td style="padding: 8px 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${m.fileIds.length}</td>
          <td style="padding: 8px 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${m.internalEdgeCount || 0}</td>
          <td style="padding: 8px 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${m.outgoingCrossEdgeCount || 0}</td>
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Architecture Report — ${escapeHtml(project.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; }
    .container { max-width: 960px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { margin-top: 0; font-size: 26px; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 16px; }
    .card-val { font-size: 22px; font-weight: 700; color: #2563eb; }
    .card-lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
    h2 { font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; margin-top: 12px; }
    th { background: #f1f5f9; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #475569; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>REPO X-RAY Architecture Intelligence Report</h1>
    <div class="subtitle">
      Project: <strong>${escapeHtml(project.name)}</strong> ·
      Analyzed at: ${new Date(project.analyzedAt).toLocaleString()} ·
      Source: ${escapeHtml(project.sourceType)} ·
      Type: ${escapeHtml(project.projectType || 'Standard')}
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-val">${summary.indexedFiles}</div>
        <div class="card-lbl">Indexed Source Files</div>
      </div>
      <div class="card">
        <div class="card-val">${summary.internalEdges}</div>
        <div class="card-lbl">Resolved Internal Edges</div>
      </div>
      <div class="card">
        <div class="card-val">${summary.externalPackages.length}</div>
        <div class="card-lbl">External Packages</div>
      </div>
      <div class="card">
        <div class="card-val" style="color: ${summary.circularGroups.length > 0 ? '#d97706' : '#16a34a'};">
          ${summary.circularGroups.length}
        </div>
        <div class="card-lbl">Circular Groups</div>
      </div>
    </div>

    <h2>Circular Dependencies</h2>
    ${summary.circularGroups.length === 0 ? '<p style="color: #16a34a; font-size: 14px;">No circular dependencies detected. Architecture graph is acyclic.</p>' : cyclesRows}

    <h2>Most Depended-On Files (Highest Fan-In)</h2>
    <table>
      <thead>
        <tr><th>File Path</th><th style="text-align: right;">Incoming Dependencies</th></tr>
      </thead>
      <tbody>
        ${topFanInRows || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #64748b;">No internal dependencies.</td></tr>'}
      </tbody>
    </table>

    <h2>Modules & Subsystems</h2>
    <table>
      <thead>
        <tr>
          <th>Module</th>
          <th>Path</th>
          <th style="text-align: right;">Files</th>
          <th style="text-align: right;">Internal Edges</th>
          <th style="text-align: right;">Cross-Module Outgoing</th>
        </tr>
      </thead>
      <tbody>
        ${modulesRows}
      </tbody>
    </table>

    <h2>External Package References (${summary.externalPackages.length})</h2>
    <div style="font-family: monospace; font-size: 12px; color: #334155; line-height: 1.8;">
      ${summary.externalPackages.join(', ') || 'None'}
    </div>

    <div class="footer">
      Generated automatically by REPO X-RAY · Offline Local Source Code Analysis
    </div>
  </div>
</body>
</html>`;

  downloadFile(html, `${safeName}-report.html`, 'text/html');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

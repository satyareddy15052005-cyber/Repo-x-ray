import type {
  ProjectHealthSnapshot,
  ProjectId,
} from '../../types/domain';

export interface SnapshotDelta {
  metric: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  trend: 'better' | 'worse' | 'neutral';
}

export interface SnapshotComparison {
  previous: ProjectHealthSnapshot;
  current: ProjectHealthSnapshot;
  deltas: SnapshotDelta[];
  overallStatus: 'improved' | 'degraded' | 'stable';
}

export function compareSnapshots(
  prev: ProjectHealthSnapshot,
  curr: ProjectHealthSnapshot
): SnapshotComparison {
  const deltas: SnapshotDelta[] = [];

  function addMetric(
    metric: string,
    p: number,
    c: number,
    lowerIsBetter = true
  ) {
    const diff = c - p;
    let trend: 'better' | 'worse' | 'neutral' = 'neutral';
    if (diff !== 0) {
      if (lowerIsBetter) {
        trend = diff < 0 ? 'better' : 'worse';
      } else {
        trend = diff > 0 ? 'better' : 'worse';
      }
    }
    deltas.push({
      metric,
      previousValue: p,
      currentValue: c,
      delta: diff,
      trend,
    });
  }

  addMetric('Total Files', prev.fileCount, curr.fileCount, false);
  addMetric('Dependency Edges', prev.internalEdgeCount, curr.internalEdgeCount, false);
  addMetric('Circular Dependency Groups', prev.circularGroupCount, curr.circularGroupCount, true);
  addMetric('Potential Dead Code Findings', prev.deadCodeCount, curr.deadCodeCount, true);
  addMetric('Architecture Rule Violations', prev.ruleViolationsCount, curr.ruleViolationsCount, true);
  addMetric('Duplicate Code Blocks', prev.duplicateGroupCount, curr.duplicateGroupCount, true);
  addMetric('Avg Cyclomatic Complexity', prev.avgComplexity, curr.avgComplexity, true);
  addMetric('High-Risk Files', prev.highRiskFileCount, curr.highRiskFileCount, true);

  const worseCount = deltas.filter(d => d.trend === 'worse').length;
  const betterCount = deltas.filter(d => d.trend === 'better').length;

  let overallStatus: 'improved' | 'degraded' | 'stable' = 'stable';
  if (betterCount > worseCount) overallStatus = 'improved';
  else if (worseCount > betterCount) overallStatus = 'degraded';

  return {
    previous: prev,
    current: curr,
    deltas,
    overallStatus,
  };
}

export function exportHistoryCsv(snapshots: ProjectHealthSnapshot[]): string {
  const headers = [
    'Timestamp',
    'Version',
    'Files',
    'Edges',
    'Cycles',
    'DeadCode',
    'RuleViolations',
    'DuplicateGroups',
    'AvgComplexity',
    'HighRiskFiles',
  ];
  const rows = snapshots.map(s => [
    s.timestamp,
    s.analysisVersion,
    s.fileCount,
    s.internalEdgeCount,
    s.circularGroupCount,
    s.deadCodeCount,
    s.ruleViolationsCount,
    s.duplicateGroupCount,
    s.avgComplexity,
    s.highRiskFileCount,
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportHistoryJson(snapshots: ProjectHealthSnapshot[]): string {
  return JSON.stringify(snapshots, null, 2);
}

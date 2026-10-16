import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileCode, AlertTriangle, Layers } from 'lucide-react';

export interface FileNodeData {
  id: string;
  filename: string;
  relativePath: string;
  extension: string;
  importsCount: number;
  dependentsCount: number;
  isCycle?: boolean;
  isSelected?: boolean;
  isDependency?: boolean; // outgoing from selected
  isDependent?: boolean;  // incoming to selected
  isDimmed?: boolean;
  isPathNode?: boolean;
  moduleName?: string;
}

export const FileNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as FileNodeData;
  const {
    filename,
    relativePath,
    importsCount,
    dependentsCount,
    isCycle,
    isSelected,
    isDependency,
    isDependent,
    isDimmed,
    isPathNode,
  } = nodeData;

  // Compute directory path
  const lastSlash = relativePath.lastIndexOf('/');
  const dirPath = lastSlash !== -1 ? relativePath.substring(0, lastSlash) : '';

  let borderStyle = 'border-slate-200';
  let bgStyle = 'bg-white';

  if (isPathNode) {
    borderStyle = 'border-purple-600 ring-2 ring-purple-500/30';
    bgStyle = 'bg-purple-50/80';
  } else if (isSelected) {
    borderStyle = 'border-blue-600 ring-2 ring-blue-500/20';
    bgStyle = 'bg-blue-50/60';
  } else if (isDependency) {
    borderStyle = 'border-blue-500';
    bgStyle = 'bg-blue-50/30';
  } else if (isDependent) {
    borderStyle = 'border-teal-500';
    bgStyle = 'bg-teal-50/30';
  } else if (isCycle) {
    borderStyle = 'border-amber-400';
  }

  const opacityStyle = isDimmed ? 'opacity-30' : 'opacity-100';

  return (
    <div
      className={`relative px-3.5 py-2.5 rounded-sm border shadow-xs transition-all duration-150 cursor-pointer min-w-[210px] max-w-[260px] ${borderStyle} ${bgStyle} ${opacityStyle}`}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-400 border border-white" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-slate-400 border border-white" />

      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 text-slate-500">
          {isCycle ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : (
            <FileCode className="w-4 h-4 text-blue-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold text-xs text-slate-900 truncate font-mono" title={filename}>
              {filename}
            </span>
            {isCycle && (
              <span className="text-[10px] text-amber-700 font-medium shrink-0">
                Cycle
              </span>
            )}
          </div>

          {dirPath && (
            <div className="text-[11px] text-slate-500 truncate font-mono" title={dirPath}>
              {dirPath}/
            </div>
          )}

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span>{importsCount} imports</span>
            <span>·</span>
            <span>{dependentsCount} used by</span>
          </div>
        </div>
      </div>
    </div>
  );
});

FileNode.displayName = 'FileNode';

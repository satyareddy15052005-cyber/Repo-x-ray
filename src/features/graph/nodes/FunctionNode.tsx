import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Code, ArrowRight, CornerDownRight, Zap } from 'lucide-react';
import type { FunctionRecord } from '../../../types/domain';

export interface FunctionNodeData {
  fn: FunctionRecord;
  isSelected?: boolean;
}

export const FunctionNode = memo(({ data }: NodeProps<any>) => {
  const { fn, isSelected } = data as FunctionNodeData;

  const typeColor =
    fn.declarationType === 'function'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : fn.declarationType === 'arrow'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : fn.declarationType === 'class-method'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div
      className={`px-3 py-2 rounded-md border shadow-2xs transition-all w-60 bg-white ${
        isSelected
          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-slate-400 border border-white"
      />

      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded border ${typeColor}`}
          >
            {fn.declarationType}
          </span>
          {fn.isExported && (
            <span className="px-1 py-0.2 text-[8px] font-medium bg-slate-100 text-slate-600 rounded">
              export
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          L{fn.lineStart}-{fn.lineEnd}
        </span>
      </div>

      <div className="font-mono text-xs font-bold text-slate-900 truncate">
        {fn.name}
        <span className="text-slate-400 font-normal">()</span>
      </div>

      <div className="text-[10px] text-slate-500 truncate mt-0.5">
        {fn.relativePath}
      </div>

      <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
        <div className="flex items-center gap-1" title="Functions calling this">
          <ArrowRight className="w-3 h-3 text-slate-400 rotate-180" />
          <span>{fn.callerCount || 0} callers</span>
        </div>
        <div className="flex items-center gap-1" title="Functions called by this">
          <CornerDownRight className="w-3 h-3 text-slate-400" />
          <span>{fn.calleeCount || 0} calls</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
    </div>
  );
});

FunctionNode.displayName = 'FunctionNode';

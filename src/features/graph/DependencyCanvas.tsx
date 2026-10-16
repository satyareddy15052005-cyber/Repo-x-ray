import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import { FileNode } from './nodes/FileNode';
import type { LayoutDirection } from '../../engine/graph/graphLayout';

const nodeTypes = {
  fileNode: FileNode,
};

interface DependencyCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick?: () => void;
  selectedNodeId?: string | null;
  onInit?: (instance: any) => void;
  onNodeDragStop?: (event: any, node: Node) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function DependencyCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onPaneClick,
  selectedNodeId,
  onInit,
  onNodeDragStop,
  isFullscreen,
  onToggleFullscreen,
}: DependencyCanvasProps) {
  return (
    <div className="w-full h-full relative bg-[#F8FAFC]">
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen View"}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white/95 hover:bg-white text-slate-800 hover:text-blue-600 rounded-sm border border-slate-200 shadow-md text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Fullscreen</span>
            </>
          )}
        </button>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} className="bg-white! border! border-slate-200! rounded-sm! shadow-xs!" />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(n) => {
            const data = n.data as any;
            if (data?.isSelected) return '#2563eb';
            if (data?.isCycle) return '#d97706';
            if (data?.isDependency) return '#3b82f6';
            if (data?.isDependent) return '#0d9488';
            return '#cbd5e1';
          }}
          className="hidden! sm:block! border! border-slate-200! rounded-sm! shadow-xs! bg-white!"
        />
      </ReactFlow>
    </div>
  );
}

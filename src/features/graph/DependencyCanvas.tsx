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
}: DependencyCanvasProps) {
  return (
    <div className="w-full h-full relative bg-[#F8FAFC]">
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
          className="border! border-slate-200! rounded-sm! shadow-xs! bg-white!"
        />
      </ReactFlow>
    </div>
  );
}

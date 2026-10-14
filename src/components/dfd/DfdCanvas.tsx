"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Server, Database, Users, Shield } from "lucide-react";
import type { ExtractionResult } from "@/lib/llm/schemas/extraction";

interface DfdCanvasProps {
  model: ExtractionResult;
  onSelectNode?: (elementId: string) => void;
}

// Custom Process Node
function ProcessNode({ data }: { data: any }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        minWidth: "160px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "var(--accent-base)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <Server size={14} color="var(--accent-text)" />
        <span className="mono" style={{ fontSize: "10px", color: "var(--accent-text)", fontWeight: 600 }}>
          {data.id}
        </span>
      </div>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
        {data.label}
      </div>
      {data.tech && (
        <span className="badge badge-neutral mono" style={{ fontSize: "10px" }}>
          {data.tech}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--accent-base)" }} />
    </div>
  );
}

// Custom Data Store Node
function StoreNode({ data }: { data: any }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "2px solid #5b6577",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        minWidth: "160px",
        borderTop: "3px double #8b949e",
        borderBottom: "3px double #8b949e",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#8b949e" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <Database size={14} color="var(--severity-medium-text)" />
        <span className="mono" style={{ fontSize: "10px", color: "var(--severity-medium-text)", fontWeight: 600 }}>
          {data.id}
        </span>
      </div>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
        {data.label}
      </div>
      {data.tech && (
        <span className="badge badge-neutral mono" style={{ fontSize: "10px" }}>
          {data.tech}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: "#8b949e" }} />
    </div>
  );
}

// Custom External Entity Node
function EntityNode({ data }: { data: any }) {
  return (
    <div
      style={{
        background: "var(--bg-surface-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-xs)",
        padding: "10px 14px",
        minWidth: "140px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "var(--accent-text)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <Users size={14} color="var(--text-secondary)" />
        <span className="mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          {data.id}
        </span>
      </div>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
        {data.label}
      </div>
      <span className="badge badge-neutral" style={{ fontSize: "10px", marginTop: "4px" }}>
        {data.type}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--accent-text)" }} />
    </div>
  );
}

const nodeTypes = {
  processNode: ProcessNode,
  storeNode: StoreNode,
  entityNode: EntityNode,
};

export function DfdCanvas({ model, onSelectNode }: DfdCanvasProps) {
  const { nodes, edges } = useMemo(() => {
    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];

    let currentY = 60;
    const spacingX = 220;
    const spacingY = 130;

    // Place external entities top row
    model.entities.forEach((ent, idx) => {
      generatedNodes.push({
        id: ent.id,
        type: "entityNode",
        position: { x: 100 + idx * spacingX, y: currentY },
        data: { id: ent.id, label: ent.name, type: ent.type },
      });
    });

    currentY += spacingY;

    // Place processes middle rows
    model.processes.forEach((proc, idx) => {
      generatedNodes.push({
        id: proc.id,
        type: "processNode",
        position: { x: 100 + (idx % 3) * spacingX, y: currentY + Math.floor(idx / 3) * spacingY },
        data: { id: proc.id, label: proc.name, tech: proc.tech },
      });
    });

    currentY += Math.ceil(model.processes.length / 3) * spacingY;

    // Place data stores bottom row
    model.dataStores.forEach((store, idx) => {
      generatedNodes.push({
        id: store.id,
        type: "storeNode",
        position: { x: 100 + idx * spacingX, y: currentY },
        data: { id: store.id, label: store.name, tech: store.tech },
      });
    });

    // Create Edges
    model.dataFlows.forEach((flow) => {
      const isBoundaryCrossing = !!flow.crossesBoundaryId;
      generatedEdges.push({
        id: flow.id,
        source: flow.sourceId,
        target: flow.targetId,
        label: flow.protocol ? `${flow.protocol}: ${flow.dataTransferred}` : flow.dataTransferred,
        animated: isBoundaryCrossing,
        style: {
          stroke: isBoundaryCrossing ? "var(--severity-high-text)" : "var(--accent-base)",
          strokeWidth: isBoundaryCrossing ? 2 : 1.5,
          strokeDasharray: isBoundaryCrossing ? "5,5" : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isBoundaryCrossing ? "var(--severity-high-text)" : "var(--accent-base)",
          width: 14,
          height: 14,
        },
        labelStyle: {
          fontSize: 10,
          fill: "var(--text-secondary)",
          fontFamily: "var(--font-mono)",
        },
        labelBgStyle: {
          fill: "var(--bg-app)",
          stroke: "var(--border-subtle)",
          strokeWidth: 1,
        },
      });
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [model]);

  return (
    <div
      style={{
        width: "100%",
        height: "560px",
        background: "var(--bg-app)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "14px",
          zIndex: 10,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          padding: "6px 12px",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
        }}
      >
        <Shield size={14} color="var(--accent-text)" />
        <span style={{ fontWeight: 600 }}>Data Flow Diagram</span>
        <span style={{ color: "var(--text-muted)" }}>|</span>
        <span style={{ color: "var(--severity-high-text)" }}>● Dashed Edges cross Trust Boundaries</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode && onSelectNode(node.id)}
        fitView
      >
        <Background color="var(--border-subtle)" gap={16} size={1} />
        <Controls style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }} />
        <MiniMap
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
          nodeColor={() => "var(--accent-base)"}
        />
      </ReactFlow>
    </div>
  );
}

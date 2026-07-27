// components/AppEditor/AppEditor.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Handle,
  Position,
} from "reactflow";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  GitBranch,
  Inbox,
  MapPin,
  Megaphone,
  MessageCircleWarning,
  Package,
  Plus,
  Repeat,
  Save,
  Star,
  Truck,
  UserCog,
  type LucideIcon,
} from "lucide-react";

const nodeTypes = {
  action: ActionNode,
  decision: DecisionNode,
  while: WhileNode,
};

// Ícono por tipo de acción, resuelto por nodeType en vez de guardar el
// componente dentro de "data": data.nodeType ya se guarda tal cual en el
// backend (JSON.stringify no puede serializar un componente de React).
const NODE_ICONS: Record<string, LucideIcon> = {
  ORDER: Inbox,
  PAYMENT: CreditCard,
  NOTIFICATION: Bell,
  UPDATE_STOCK: Package,
  MARKETING: Megaphone,
  ASSIGN_DRIVER: UserCog,
  DELIVER: Truck,
  TRACK_ORDER: MapPin,
  VERIFY_PAYMENT: CheckCircle2,
  SEND_REVIEW: Star,
  HANDLE_COMPLAINT: MessageCircleWarning,
};

function NodeIcon({ nodeType }: { nodeType?: string }) {
  const Icon = (nodeType && NODE_ICONS[nodeType]) || Package;
  return <Icon size={16} style={{ flexShrink: 0 }} />;
}

function ActionNode({ data }: { data: any }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        background: data.color,
        color: "white",
        borderRadius: "10px",
        border: "3px solid #fff",
        minWidth: "190px",
        textAlign: "center",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <NodeIcon nodeType={data.nodeType} />
        <span>{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function DecisionNode({ data }: { data: any }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "#9b59b6",
        color: "white",
        borderRadius: "14px",
        border: "3px solid #fff",
        minWidth: "210px",
        textAlign: "center",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <GitBranch size={16} />
        <span>{data.label}</span>
      </div>
      <div style={{ fontSize: "13px", marginTop: "8px" }}>
        {data.condition || "¿Condición?"}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: "25%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "75%" }}
      />
    </div>
  );
}

function WhileNode({ data }: { data: any }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "#f39c12",
        color: "white",
        borderRadius: "14px",
        border: "3px solid #fff",
        minWidth: "200px",
        textAlign: "center",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <Repeat size={16} />
        <span>WHILE</span>
      </div>
      <div style={{ fontSize: "13px", marginTop: "6px" }}>
        {data.condition || "Mientras..."}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// ==================== LISTA DE NODOS (10+ nodos) ====================
const availableNodes = [
  // Comunes a todas las apps
  {
    type: "action",
    nodeType: "ORDER",
    label: "Recibir Pedido",
    color: "#4a90e2",
  },
  {
    type: "action",
    nodeType: "PAYMENT",
    label: "Procesar Pago",
    color: "#27ae60",
  },
  {
    type: "action",
    nodeType: "NOTIFICATION",
    label: "Enviar Notificación",
    color: "#e74c3c",
  },
  {
    type: "action",
    nodeType: "UPDATE_STOCK",
    label: "Actualizar Stock",
    color: "#3498db",
  },
  {
    type: "action",
    nodeType: "MARKETING",
    label: "Campaña Marketing",
    color: "#1abc9c",
  },

  // Delivery específicos
  {
    type: "action",
    nodeType: "ASSIGN_DRIVER",
    label: "Asignar Repartidor",
    color: "#f39c12",
  },
  {
    type: "action",
    nodeType: "DELIVER",
    label: "Entregar Pedido",
    color: "#27ae60",
  },
  {
    type: "action",
    nodeType: "TRACK_ORDER",
    label: "Rastrear Pedido",
    color: "#9b59b6",
  },

  // Ecommerce / Social
  {
    type: "action",
    nodeType: "VERIFY_PAYMENT",
    label: "Verificar Pago",
    color: "#2ecc71",
  },
  {
    type: "action",
    nodeType: "SEND_REVIEW",
    label: "Pedir Review",
    color: "#f1c40f",
  },
  {
    type: "action",
    nodeType: "HANDLE_COMPLAINT",
    label: "Gestionar Queja",
    color: "#e67e22",
  },

  // Decisiones y bucles
  {
    type: "decision",
    nodeType: "CONDITION",
    label: "Decisión (If)",
    color: "#9b59b6",
  },
  {
    type: "while",
    nodeType: "WHILE",
    label: "Bucle While",
    color: "#f39c12",
  },
];

export default function AppEditor({
  initialLogic,
  onSave,
}: {
  initialLogic: any;
  onSave: (logic: any) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedConfig, setSelectedConfig] = useState(availableNodes[0]);

  useEffect(() => {
    setNodes(initialLogic?.nodes || []);
    setEdges(initialLogic?.edges || []);
  }, [initialLogic]);

  const addNode = () => {
    const newNode: Node = {
      id: `${selectedConfig.nodeType}_${Date.now()}`,
      type: selectedConfig.type,
      position: { x: 350 + Math.random() * 150, y: 180 + Math.random() * 120 },
      data: {
        label: selectedConfig.label,
        nodeType: selectedConfig.nodeType,
        color: selectedConfig.color,
        condition:
          selectedConfig.type === "decision" || selectedConfig.type === "while"
            ? "successRate > 0.6"
            : undefined,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onConnect = (params: Connection) =>
    setEdges((eds) => addEdge(params, eds));

  const handleSave = () => onSave({ nodes, edges });

  return (
    <div
      style={{
        height: "570px",
        border: "1px solid #555",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          background: "#1f1f1f",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          borderBottom: "1px solid #444",
        }}
      >
        <select
          value={selectedConfig.nodeType}
          onChange={(e) => {
            const found = availableNodes.find(
              (n) => n.nodeType === e.target.value,
            );
            if (found) setSelectedConfig(found);
          }}
          style={{
            padding: "10px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: "6px",
          }}
        >
          {availableNodes.map((n) => (
            <option key={n.nodeType} value={n.nodeType}>
              {n.label}
            </option>
          ))}
        </select>

        <button
          onClick={addNode}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={16} /> Agregar Nodo
        </button>
        <button
          onClick={handleSave}
          className="btn btn-success"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Save size={16} /> Guardar Lógica
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background color="#2a2a2a" gap={20} />
      </ReactFlow>
    </div>
  );
}

"use client";

import React, { useCallback } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
    { id: '1', position: { x: 100, y: 50 }, data: { label: 'Початок: Дзвінок' }, type: 'input', style: { border: '1px solid #6366f1', background: '#1e293b', color: '#fff' } },
    { id: '2', position: { x: 100, y: 150 }, data: { label: 'Інцидент' }, style: { border: '1px solid #6366f1', background: '#1e293b', color: '#fff' } },
    { id: '3', position: { x: 100, y: 250 }, data: { label: 'Кульмінація' }, style: { border: '1px solid #ef4444', background: '#1e293b', color: '#fff' } },
];

const initialEdges = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#6366f1' } },
    { id: 'e2-3', source: '2', target: '3', style: { stroke: '#94a3b8' } }
];

export default function PlotGraph() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    return (
        <div style={{ width: '100%', height: '100%' }} className="bg-slate-900">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Controls className="bg-slate-800 border-slate-700 fill-white" />
                <MiniMap nodeColor="#6366f1" maskColor="rgba(30, 41, 59, 0.8)" className="bg-slate-800" />
                <Background color="#334155" gap={16} />
            </ReactFlow>
        </div>
    );
}

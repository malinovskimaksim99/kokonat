"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType,
    NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { Sparkles, Save, RefreshCw, Network, XCircle, Check, Eye, EyeOff, Info } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface PlotGraphProps {
    projectId?: string | null;
    chapterContent?: string;
}

// 🎨 Thread Utils
const generateThreadColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`; // Consistent HSL color
};

// 🧩 Custom Node Component
const CustomNode = ({ data }: any) => {
    return (
        <div className="h-full w-full">
            <div className="flex flex-col gap-1">
                {data.timeframe && (
                    <div className="text-[10px] text-amber-500 font-mono tracking-wider uppercase opacity-80 mb-0.5">
                        ⏳ {data.timeframe}
                    </div>
                )}
                <div className="font-bold text-sm text-slate-200">
                    {data.label}
                </div>
                {data.details && (
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug line-clamp-3">
                        {data.details}
                    </div>
                )}
                {data.thread && (
                    <div className="text-[9px] text-slate-500 mt-2 font-mono uppercase bg-black/20 p-1 rounded w-fit">
                        # {data.thread}
                    </div>
                )}
            </div>
        </div>
    );
};

const nodeTypes = {
    default: CustomNode, // Override default type
};

export default function PlotGraph({ projectId, chapterContent = "" }: PlotGraphProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [previewData, setPreviewData] = useState<{ newNodes: any[] } | null>(null);

    // 🕵️ Filters State
    const [hiddenThreads, setHiddenThreads] = useState<Set<string>>(new Set());
    const [minImportance, setMinImportance] = useState<number>(1);
    const [zoomLevel, setZoomLevel] = useState<number>(1);

    // 🧠 Dynamic Thread List & Config
    const threadList = useMemo(() => {
        const threads = new Set<string>();
        // Add defaults if empty
        if (nodes.length === 0) {
            // Basic seeds if needed, or empty
        }
        nodes.forEach(n => {
            if (n.data?.thread) {
                // Normalize to Title Case to avoid duplicates like "war" vs "War"
                const normalized = n.data.thread.charAt(0).toUpperCase() + n.data.thread.slice(1).toLowerCase();
                threads.add(normalized);
                // Also update the node data in memory so filtering works? 
                // Ideally we shouldn't mutate props/state directly but for display consistency we treat them as normalized.
            }
        });
        return Array.from(threads).sort();
    }, [nodes]);

    const getThreadConfig = useCallback((threadName: string) => {
        const normalized = threadName || "Other";

        // Find index for Y-offset (Subway lanes)
        let index = threadList.indexOf(normalized);
        if (index === -1) {
            // If it's a new thread from preview, pretend it's at the end
            index = threadList.length;
            // If multiple new threads, we might have collisions in preview, but that's acceptable for now
        }

        // Color
        const color = generateThreadColor(normalized);

        // Lane Spacing: Alternating Up/Down to keep center clean? 
        // Or just straightforward: 0, 200, -200, 400, -400...
        // 0 -> 0
        // 1 -> 200
        // 2 -> -200
        // 3 -> 400
        // 4 -> -400
        const polarity = index % 2 === 0 ? 1 : -1;
        const magnitude = Math.ceil(index / 2) * 200;
        const yOffset = (index === 0) ? 0 : (magnitude * polarity);

        return { color, yOffset, label: normalized };
    }, [threadList]);

    // Load Graph
    useEffect(() => {
        if (!projectId) return;
        fetch(`/api/projects/${projectId}/graph`)
            .then(res => res.json())
            .then(data => {
                if (data.nodes) {
                    // We need to re-process nodes because getThreadConfig might change based on the FULL set
                    // But here we just load raw data. 
                    // The ACTUAL rendering uses styling from 'createNodeObject' which is called ONCE.
                    // Issue: If we load nodes, we need to know the 'threadList' to assign lanes correct?
                    // Actually, 'data.nodes' ALREADY has positions saved from previous sessions!
                    // So we only really need dynamic config for NEW nodes or re-layouts.
                    const parsedNodes = data.nodes.map((n: any) => ({
                        id: n.id,
                        type: 'default',
                        position: { x: n.positionX, y: n.positionY },
                        data: JSON.parse(n.data),
                        // We will apply style in a separate effect or just render? 
                        // ReactFlow stores style in the node object.
                        style: {
                            background: '#1e293b',
                            color: '#e2e8f0',
                            border: `2px solid #555`, // Default, will update effect
                            borderRadius: '12px',
                            padding: '12px',
                            minWidth: '200px',
                            fontSize: '13px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                            textAlign: 'left' as any
                        }
                    }));
                    setNodes(parsedNodes);
                }
                if (data.edges) setEdges(data.edges.map((e: any) => ({
                    ...e,
                    animated: true,
                    type: 'smoothstep',
                    style: { stroke: '#475569', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
                })));
            });
    }, [projectId, setNodes, setEdges]);

    // Apply Styles Dynamically based on Thread Config
    useEffect(() => {
        setNodes(nds => nds.map(n => {
            const config = getThreadConfig(n.data.thread);
            const isRefreshed = n.style?.borderColor === config.color;
            if (isRefreshed) return n;

            return {
                ...n,
                style: {
                    ...n.style,
                    border: `2px solid ${config.color}`,
                    boxShadow: `0 4px 20px ${config.color}20`
                }
            };
        }));
    }, [getThreadConfig, setNodes, threadList.length]); // Re-run when thread list changes (new thread added)

    // Helper to create consistent node objects (for NEW nodes)
    const createNodeObject = (id: string, x: number, y: number, data: any) => {
        const config = getThreadConfig(data.thread);

        return {
            id,
            type: 'default',
            position: { x, y },
            data: data,
            style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: `2px solid ${config.color}`,
                borderRadius: '12px',
                padding: '12px',
                minWidth: '200px',
                fontSize: '13px',
                boxShadow: `0 4px 20px ${config.color}20`,
                textAlign: 'left' as any
            }
        };
    };

    // Filtered Nodes & Edges
    const visibleNodes = useMemo(() => {
        return nodes.filter(n => {
            const rawThread = n.data.thread || "Other";
            const normalizedThread = rawThread.charAt(0).toUpperCase() + rawThread.slice(1).toLowerCase();
            const importance = n.data.importance || 1;

            // Thread Filter
            if (hiddenThreads.has(normalizedThread)) return false;

            // Importance Filter (Semantic Zoom)
            if (importance < minImportance) return false;

            return true;
        });
    }, [nodes, hiddenThreads, minImportance]);

    const visibleEdges = useMemo(() => {
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    }, [edges, visibleNodes]);

    const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge({
        ...params,
        animated: true,
        type: 'smoothstep',
        style: { stroke: '#475569', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
    }, eds)), [setEdges]);

    const handleSave = async () => {
        if (!projectId) return;
        setIsSaving(true);
        try {
            await fetch(`/api/projects/${projectId}/graph`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodes, edges })
            });
        } catch (e) {
            console.error(e);
            alert("Failed to save graph");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        if (!chapterContent.trim()) {
            alert("Chapter is empty!");
            return;
        }
        setIsAnalyzing(true);
        try {
            const summary = nodes.slice(-5).map(n => n.data.label).join(", ");
            const res = await fetch('/api/analyze/graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapter_text: chapterContent,
                    existing_nodes_summary: summary,
                    existing_threads: threadList
                })
            });
            const data = await res.json();
            if (data.newNodes && data.newNodes.length > 0) {
                setPreviewData({ newNodes: data.newNodes });
                setSelectedIndices(new Set(data.newNodes.map((_: any, i: number) => i)));
            } else {
                setPreviewData({ newNodes: [] });
            }
        } catch (e) {
            console.error(e);
            alert("Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleSelection = (index: number) => {
        const next = new Set(selectedIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setSelectedIndices(next);
    };

    const toggleThreadVisibility = (threadKey: string) => {
        const next = new Set(hiddenThreads);
        if (next.has(threadKey)) next.delete(threadKey);
        else next.add(threadKey);
        setHiddenThreads(next);
    };

    const handleConfirmUpdate = () => {
        if (!previewData) return;

        // 🧠 Smart Layout: Tree / Fork
        // All new nodes from THIS batch start at the SAME X coordinate (representing this "Chapter" or "Moment")
        // They are spread out by Y based on their Thread.

        let baseX = 100;
        let lastNodeId: string | null = null;

        if (nodes.length > 0) {
            // Find the right-most node
            baseX = Math.max(...nodes.map(n => n.position.x)) + 350; // Add gap
            lastNodeId = nodes[nodes.length - 1].id;
        }

        const createdNodes: Node[] = [];
        const createdEdges: Edge[] = [];

        previewData.newNodes.forEach((n: any, idx: number) => {
            if (!selectedIndices.has(idx)) return;

            const config = getThreadConfig(n.thread);

            // X is constant for the batch (Column Layout)
            // Y is determined by Thread/Lane
            // Note: If we have multiple new nodes for same thread, we need to stack them?
            // For now, assume AI usually gives 1 event per thread per chapter, or we just stack by idx
            // But getThreadConfig gives fixed Y for thread. 
            // So if multiple events in SAME thread, they overlap!
            // Fix: Add slight offset if duplicate thread in batch

            let yPos = config.yOffset;

            // Basic collision avoidance in batch
            const siblingInHash = createdNodes.filter(cn => cn.data.thread === n.thread).length;
            if (siblingInHash > 0) {
                yPos += (siblingInHash * 150); // Stack vertically inside the lane if needed
            }

            const newNodeId = `node-${Date.now()}-${idx}`;

            createdNodes.push(createNodeObject(newNodeId, baseX, yPos, {
                label: n.label,
                details: n.details,
                thread: n.thread,
                importance: n.importance
            }));

            // Connect to previous
            if (lastNodeId) {
                // If we have multiple previous nodes (fork), we connect all? 
                // Currently just linear chain to the last one. 
                // Ideally AI would say "Parent: Event 1". For now, user can manually relink if needed.
                createdEdges.push({
                    id: `edge-${Date.now()}-${idx}`,
                    source: lastNodeId,
                    target: newNodeId,
                    animated: true,
                    type: 'smoothstep', // Orthogonal lines
                    style: { stroke: '#475569', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
                });
            }

            // NOTE: We do NOT update lastNodeId here if we want a "Fork" from the SAME parent.
            // But if we want them to chain sequentially within the batch?
            // "Parallel" implies they all branch from proper *previous* node.
            // Let's assume they branch from the LAST existing node on the graph (Context).
            // So we keep 'lastNodeId' constant for this loop? 
            // NO, typically A -> B, A -> C.
            // So yes, we use the graph's `lastNodeId` as the source for ALL these new nodes.
        });

        // However, if we don't update lastNodeId, next time we add, we need a new tail.
        // Actually, ReactFlow is flexible.
        // Let's assume for this "Batch", they are parallel siblings.

        setNodes(prev => [...prev, ...createdNodes]);
        setEdges(prev => [...prev, ...createdEdges]);
        setPreviewData(null);
    };

    return (
        <div style={{ width: '100%', height: '100%' }} className="bg-slate-950 relative flex">
            {/* 🛠 Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 shadow-lg shadow-indigo-500/20"
                >
                    {isAnalyzing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {isAnalyzing ? "Аналіз" : "Додати"}
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-black/50 border-white/10 text-slate-300 hover:text-white hover:bg-black/70"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                </Button>
            </div>

            {/* 🏷 Legend / Filters Panel */}
            <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 border border-slate-700/50 p-3 rounded-lg shadow-xl backdrop-blur-md max-w-[200px]">
                <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Сюжетні Лінії</h4>
                <div className="space-y-1 mb-4">
                    {threadList.map((key) => {
                        const config = getThreadConfig(key);
                        return (
                            <div
                                key={key}
                                onClick={() => toggleThreadVisibility(key)}
                                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all ${hiddenThreads.has(key) ? 'opacity-40 hover:opacity-60 grayscale' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: config.color }} />
                                <span className="text-[11px] text-slate-300 flex-1">{config.label}</span>
                                {hiddenThreads.has(key) ? <EyeOff className="w-3 h-3 text-slate-600" /> : <Eye className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100" />}
                            </div>
                        )
                    })}
                </div>

                <div className="border-t border-white/10 pt-2">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Важливість</h4>
                        <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-300">{minImportance}+</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={minImportance}
                        onChange={(e) => setMinImportance(Number(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                        <span>Деталі</span>
                        <span>Кульмінація</span>
                    </div>
                </div>
            </div>

            <ReactFlow
                nodes={visibleNodes}
                edges={visibleEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onMoveEnd={(_, viewport) => {
                    setZoomLevel(viewport.zoom);
                    // Semantic Zoom Logic:
                    // If zoom < 0.5, show only importance >= 3
                    // If zoom < 0.3, show only importance >= 4
                    // Note: This overrides manual slider if we want automatic behavior.
                    // For now, let's keep it manual via slider to not annoy user, 
                    // or maybe just update slider visual?
                    // Let's implement SOFT semantic zoom hint or leave it manual for full control.
                    // User requested "Zoom Levels: Global (Strategic) vs Local".
                    // Let's stick to manual filter for now as it gives more control.
                }}
                fitView
                minZoom={0.1}
            >
                <Controls className="bg-slate-900 border-slate-700 fill-slate-300" />
                <MiniMap
                    nodeColor={(n) => {
                        const match = n.style?.border?.toString().match(/#\w+/);
                        return match ? match[0] : '#6366f1';
                    }}
                    maskColor="rgba(2, 6, 23, 0.7)"
                    className="bg-slate-900 border border-white/5"
                />
                <Background color="#020617" gap={24} size={1} />
            </ReactFlow>

            {/* Confirmation Dialog */}
            <Dialog open={!!previewData} onOpenChange={(open) => !open && setPreviewData(null)}>
                <DialogContent className="bg-[#020617] border border-indigo-500/20 text-slate-50 max-w-md z-[200]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-400">
                            <Network className="w-5 h-5" />
                            Пропозиція Графа
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-2">
                        {previewData?.newNodes.length ? (
                            <div className="space-y-4">
                                <p className="text-slate-400 text-sm">Знайдено нові події. Вони будуть додані паралельно.</p>
                                <ul className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar bg-black/20 p-3 rounded-lg border border-white/5">
                                    {previewData.newNodes.map((n: any, i: number) => {
                                        const config = getThreadConfig(n.thread);
                                        return (
                                            <li
                                                key={i}
                                                className={`text-sm pb-2 border-b border-white/5 last:border-0 last:pb-0 transition-colors cursor-pointer ${selectedIndices.has(i) ? 'opacity-100' : 'opacity-50'}`}
                                                onClick={() => toggleSelection(i)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors`}
                                                        style={{
                                                            borderColor: selectedIndices.has(i) ? config.color : '#475569',
                                                            backgroundColor: selectedIndices.has(i) ? config.color : 'transparent'
                                                        }}
                                                    >
                                                        {selectedIndices.has(i) && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <strong className="text-slate-200 block">{n.label}</strong>
                                                            {n.thread && (
                                                                <span
                                                                    className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ml-2"
                                                                    style={{ backgroundColor: `${config.color}30`, color: config.color }}
                                                                >
                                                                    {n.thread}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-slate-500 leading-snug block mt-1">{n.details}</span>
                                                    </div>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-500 space-y-2">
                                <XCircle className="w-10 h-10 opacity-20" />
                                <p className="text-sm">Подій не знайдено.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setPreviewData(null)} className="text-slate-400">Скасувати</Button>
                        {previewData?.newNodes?.length && previewData.newNodes.length > 0 && (
                            <Button onClick={handleConfirmUpdate} disabled={selectedIndices.size === 0} className="bg-indigo-600 text-white">
                                Додати ({selectedIndices.size})
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

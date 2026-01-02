"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Loader2, Plus, X, Sparkles } from "lucide-react";

interface SuggestedEntry {
    name: string;
    type: 'CHARACTER' | 'LOCATION';
    description: string;
}

interface AutoLoreDialogProps {
    open: boolean;
    onClose: () => void;
    textToAnalyze: string;
    onAddEntry: (entry: { name: string; type: string; description: string }) => void;
}

export function AutoLoreDialog({ open, onClose, textToAnalyze, onAddEntry }: AutoLoreDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<SuggestedEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && textToAnalyze) {
            analyzeText();
        } else {
            setSuggestions([]); // Reset on close or empty
            setError(null);
        }
    }, [open, textToAnalyze]);

    const analyzeText = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:8000/analyze-entities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: textToAnalyze }),
            });

            if (!res.ok) throw new Error("Failed to analyze text");

            const data = await res.json();

            // Parse the JSON string properly
            let parsed = [];
            try {
                parsed = JSON.parse(data.json_str);
            } catch (e) {
                console.error("Failed to parse JSON", data.json_str);
                throw new Error("AI returned invalid JSON format.");
            }

            if (Array.isArray(parsed)) {
                setSuggestions(parsed);
            } else {
                setSuggestions([]);
            }

        } catch (err) {
            console.error(err);
            setError("Failed to analyze text. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = (entry: SuggestedEntry) => {
        onAddEntry({
            name: entry.name,
            type: entry.type,
            description: entry.description
        });
        // Remove from list
        setSuggestions(prev => prev.filter(e => e.name !== entry.name));
    };

    const handleDismiss = (name: string) => {
        setSuggestions(prev => prev.filter(e => e.name !== name));
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-[#020617] border border-slate-800 text-slate-50 sm:max-w-md shadow-2xl z-[100]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-1.5 bg-indigo-900/50 rounded-lg border border-indigo-500/30">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-white">
                            ШІ Авто-Аналіз
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <p className="text-sm text-slate-400 animate-pulse">Аналізую текст на наявність сутностей...</p>
                        </div>
                    ) : error ? (
                        <div className="text-red-400 text-sm py-4 text-center">{error}</div>
                    ) : suggestions.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-800 m-2">
                            Сутностей не знайдено, або ви вже все додали.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {suggestions.map((entry, idx) => (
                                <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 shadow-sm hover:border-indigo-500/50 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-white group-hover:text-indigo-300 transition-colors text-base">{entry.name}</div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">
                                                {(() => {
                                                    switch (entry.type) {
                                                        case 'CHARACTER': return 'ПЕРСОНАЖ';
                                                        case 'LOCATION': return 'ЛОКАЦІЯ';
                                                        case 'GOD': return 'БОЖЕСТВО';
                                                        case 'FACTION': return 'ФРАКЦІЯ';
                                                        case 'EVENT': return 'ПОДІЯ';
                                                        case 'ITEM': return 'ПРЕДМЕТ';
                                                        default: return entry.type;
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleDismiss(entry.name)}
                                                className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                                title="Пропустити"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleAdd(entry)}
                                                className="p-1.5 text-emerald-500 hover:text-emerald-300 rounded-lg hover:bg-emerald-900/20 transition-colors"
                                                title="Додати"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-indigo-500/30 pl-3">
                                        {entry.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, User, MapPin, Box, Sparkles, Crown, Sword } from "lucide-react";
import { EditLorebookEntry } from "./EditLorebookEntry";

type Entry = {
    id: string;
    name: string;
    type: string;
    description: string;
    status: string;
};

export function LorebookList({ projectId, onAddClick, onAutoDiscoverClick }: { projectId: string, onAddClick: () => void, onAutoDiscoverClick: () => void }) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

    const fetchLore = () => {
        if (!projectId) return;
        setLoading(true);
        fetch(`/api/lorebook?projectId=${projectId}`)
            .then((res) => res.json())
            .then((data) => {
                setEntries(data);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchLore();
    }, [projectId]);

    const getIcon = (type: string) => {
        switch (type) {
            case "CHARACTER": return <User className="w-4 h-4 text-emerald-400" />;
            case "LOCATION": return <MapPin className="w-4 h-4 text-amber-400" />;
            case "GOD": return <Sparkles className="w-4 h-4 text-purple-400" />;
            case "FACTION": return <Crown className="w-4 h-4 text-red-400" />;
            default: return <Sword className="w-4 h-4 text-slate-400" />;
        }
    };

    if (loading && entries.length === 0) return <div className="text-sm text-neutral-500">Завантаження світу...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    База Знань
                </h3>
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-indigo-300 hover:text-indigo-100 h-8 px-2" onClick={onAutoDiscoverClick} title="Авто-аналіз">
                        <Sparkles className="w-4 h-4 mr-1" /> Авто
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={onAddClick}>
                        <Plus className="w-4 h-4 mr-1" /> Додати
                    </Button>
                </div>
            </div>

            <div className="grid gap-3">
                {entries.length === 0 && !loading && (
                    <div className="p-4 border border-dashed rounded-lg text-center text-neutral-500 text-sm">
                        Поки що порожньо. Додайте першого персонажа!
                    </div>
                )}
                {entries.map((entry) => (
                    <Card
                        key={entry.id}
                        className="bg-neutral-900 border-neutral-800 cursor-pointer hover:border-indigo-500 transition-colors"
                        onClick={() => setEditingEntry(entry)}
                    >
                        <CardHeader className="p-3 pb-1 flex flex-row items-center space-y-0 gap-2">
                            <div className="p-1.5 bg-neutral-800 rounded-full text-neutral-400">
                                {getIcon(entry.type)}
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-medium leading-none">{entry.name}</CardTitle>
                                <p className="text-xs text-neutral-500 mt-1">
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
                                    })()} • {entry.status === 'active' || entry.status === 'Active' ? 'Активний' : entry.status}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-2 text-xs text-neutral-400 line-clamp-2">
                            {entry.description}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {editingEntry && (
                <EditLorebookEntry
                    open={!!editingEntry}
                    onClose={() => setEditingEntry(null)}
                    entry={editingEntry}
                    onSuccess={() => {
                        fetchLore(); // Reload list
                    }}
                    onDelete={() => {
                        fetchLore(); // Reload list
                    }}
                />
            )}
        </div>
    );
}

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chapter {
    id: string;
    title: string;
}

interface ChapterTabsProps {
    chapters: Chapter[];
    activeChapterId: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onRename: (id: string, newTitle: string) => void;
    onDelete: (id: string) => void;
}

export function ChapterTabs({
    chapters,
    activeChapterId,
    onSelect,
    onAdd,
    onRename,
    onDelete
}: ChapterTabsProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const startEditing = (chapter: Chapter) => {
        setEditingId(chapter.id);
        setEditValue(chapter.title);
    };

    const saveEdit = () => {
        if (editingId && editValue.trim()) {
            onRename(editingId, editValue.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="flex items-center w-full h-10 bg-black/40 border-b border-white/5 overflow-hidden">
            <div className="flex-1 flex items-center overflow-x-auto custom-scrollbar-hide px-2 gap-1 h-full">

                {/* 📜 PLOT / WORLD BIBLE TAB */}
                <div
                    onClick={() => onSelect('PLOT_BIBLE')}
                    className={cn(
                        "group relative flex items-center px-4 h-8 rounded-t-lg text-xs font-bold cursor-pointer transition-all min-w-[100px] select-none border-t border-x border-transparent",
                        activeChapterId === 'PLOT_BIBLE'
                            ? "bg-[#020617] text-amber-400 border-amber-500/20 border-b-[#020617] translate-y-[1px] z-10 shadow-[0_-2px_10px_rgba(251,191,36,0.1)]"
                            : "text-amber-600/70 hover:text-amber-400 hover:bg-amber-900/10 border-b-white/5"
                    )}
                >
                    <span className="flex items-center gap-2">
                        ✨ Сюжет
                    </span>
                </div>

                {chapters.map((chapter) => (
                    <div
                        key={chapter.id}
                        onClick={() => onSelect(chapter.id)}
                        onDoubleClick={() => startEditing(chapter)}
                        className={cn(
                            "group relative flex items-center px-4 h-8 rounded-t-lg text-xs font-medium cursor-pointer transition-all min-w-[100px] max-w-[200px] select-none border-t border-x border-transparent",
                            activeChapterId === chapter.id
                                ? "bg-[#020617] text-indigo-300 border-white/10 border-b-[#020617] translate-y-[1px] z-10"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border-b-white/5"
                        )}
                    >
                        {editingId === chapter.id ? (
                            <input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                className="bg-transparent border-none outline-none w-full text-indigo-300"
                            />
                        ) : (
                            <span className="truncate w-full text-center">{chapter.title}</span>
                        )}

                        {activeChapterId === chapter.id && !editingId && (
                            <div className="absolute right-1 opacity-100 transition-opacity flex items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(chapter.id);
                                    }}
                                    className="p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"
                                    title="Видалити розділ"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                <button
                    onClick={onAdd}
                    className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-md transition-colors ml-1"
                    title="Додати розділ"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

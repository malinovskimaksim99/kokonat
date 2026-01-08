import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chapter {
    id: string;
    title: string;
    pov?: string;
}

interface ChapterTabsProps {
    chapters: Chapter[];
    activeChapterId: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onRename: (id: string, newTitle: string) => void;
    onUpdatePOV: (id: string, newPOV: string) => void;
    onDelete: (id: string) => void;
}

export function ChapterTabs({
    chapters,
    activeChapterId,
    onSelect,
    onAdd,
    onRename,
    onUpdatePOV,
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
                            "group relative flex flex-col justify-center px-4 h-full rounded-t-lg transition-all min-w-[120px] max-w-[200px] select-none border-t border-x border-transparent pb-1",
                            activeChapterId === chapter.id
                                ? "bg-[#020617] text-indigo-300 border-white/10 border-b-[#020617] translate-y-[1px] z-10"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border-b-white/5"
                        )}
                    >
                        {editingId === chapter.id ? (
                            <div className="flex flex-col gap-1 w-full bg-slate-900/50 p-1 rounded">
                                <input
                                    autoFocus
                                    value={editValue}
                                    placeholder="Назва розділу"
                                    onChange={(e) => setEditValue(e.target.value)}
                                    // Save title on blur? No, rely on Enter or saving both?
                                    // Let's rely on Enter or Explicit Action. 
                                    // Removing onBlur to prevent closing when clicking second input.
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                    className="bg-transparent border-none outline-none w-full text-indigo-300 text-xs font-bold text-center placeholder:text-indigo-700/50"
                                />
                                <input
                                    value={chapter.pov || ""}
                                    placeholder="POV (Хто?)"
                                    onChange={(e) => onUpdatePOV(chapter.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent border-t border-indigo-900/30 outline-none w-full text-[10px] text-slate-400 text-center uppercase font-mono tracking-widest placeholder:text-slate-700"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center w-full">
                                <span className="truncate w-full text-center text-xs font-bold leading-tight">{chapter.title}</span>
                                {chapter.pov && (
                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">
                                        👁 {chapter.pov}
                                    </span>
                                )}
                            </div>
                        )}

                        {activeChapterId === chapter.id && !editingId && (
                            <div className="absolute right-0 top-0 h-full flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(chapter.id);
                                    }}
                                    className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"
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

import { useState } from "react";
import { X } from "lucide-react";

interface CreateProjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (project: any) => void;
}

export function CreateProjectDialog({ open, onClose, onSuccess }: CreateProjectDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState(""); // Currently UI only, API might arguably ignore it or we need to update schema
    const [isLoading, setIsLoading] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            });

            if (!res.ok) throw new Error("Failed to create project");

            const newProject = await res.json();
            onSuccess(newProject);
            onClose();
            setTitle("");
            setDescription("");
        } catch (err) {
            console.error(err);
            alert("Не вдалося створити проект");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="font-bold text-slate-100">Новий Проект</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Назва</label>
                        <input
                            autoFocus
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="Наприклад: Хроніки Акаши"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Короткий опис (опціонально)</label>
                        <textarea
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                            placeholder="Про що буде ця історія?"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Скасувати
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !title.trim()}
                            className="px-4 py-2 rounded text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            {isLoading ? "Створення..." : "Створити Проект"}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}

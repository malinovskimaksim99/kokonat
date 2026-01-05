import React, { useState } from 'react';
import { AlertTriangle, FileText, Check, Edit2, X, Plus } from 'lucide-react';

interface ParsedMessageProps {
    content: string;
    role: 'user' | 'ai';
    onAddText?: (text: string) => void;
    onEdit?: (text: string) => void;
}

const ParsedMessage: React.FC<ParsedMessageProps> = ({ content, role, onAddText, onEdit }) => {
    if (role === 'user') return <div className="whitespace-pre-wrap">{content}</div>;

    // Split by specific markers to render components
    const lines = content.split('\n');
    const renderedContent: React.ReactNode[] = [];

    let listBuffer: string[] = [];
    let inList = false;

    const flushList = () => {
        if (listBuffer.length > 0) {
            renderedContent.push(
                <div key={`list-${Math.random()}`} className="my-3 space-y-2">
                    {listBuffer.map((item, idx) => (
                        <div key={idx} className="flex gap-2 text-indigo-100/90 bg-indigo-950/30 p-2 rounded-lg border border-indigo-500/10">
                            <span className="font-bold text-pink-400 select-none">{idx + 1}.</span>
                            <span>{item.replace(/^\d+\.\s*/, '')}</span>
                        </div>
                    ))}
                </div>
            );
            listBuffer = [];
            inList = false;
        }
    };

    lines.forEach((line, index) => {
        // 1. Alert / Warning
        if (line.includes('[УВАГА:') || line.includes('[УВАГА]')) {
            flushList();
            const text = line.replace(/\[УВАГА:?\]?/, '').trim();
            renderedContent.push(
                <div key={index} className="my-2 p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex gap-3 text-red-200 text-sm shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <div>{text}</div>
                </div>
            );
        }
        // 2. Blockquote (Book Text) with INLINE EDITING
        else if (line.trim().startsWith('>')) {
            flushList();
            const originalText = line.replace(/^>\s*/, '').trim();

            // We use a functional component wrapper for state isolation per block would be best, 
            // but for simplicity in this file structure we'll use a local component or just render it.
            // Since we are mapping lines, we can't easily use hooks *inside* the map callback directly if we were to retain state *per line*.
            // Ideally, ParsedMessage should be composed of smaller components. 
            // Let's refactor this part to use a helper component for the QuoteBlock.
            renderedContent.push(
                <QuoteBlock
                    key={`quote-${index}`}
                    text={originalText}
                    onAddText={onAddText}
                />
            );
        }
        // 3. Lists
        else if (/^\d+\.\s/.test(line)) {
            inList = true;
            listBuffer.push(line);
        }
        // 4. Normal Text
        else {
            if (inList && line.trim() === '') {
                // Empty line breaks list
                flushList();
            } else if (inList) {
                // Continuation of list item? Or new paragraph? 
                // Simple heuristic: if it doesn't start with number, assumes it's regular text breaking the list
                flushList();
                if (line.trim() !== '') renderedContent.push(<p key={index} className="mb-2 min-h-[1em]">{line}</p>);
            } else {
                if (line.trim() !== '') renderedContent.push(<p key={index} className="mb-2 min-h-[1em]">{line}</p>);
            }
        }
    });

    flushList(); // Final flush

    return <div className="text-sm leading-relaxed">{renderedContent}</div>;
};

// Helper component for interactive blocks
const QuoteBlock = ({ text, onAddText, onEdit }: { text: string, onAddText?: (t: string) => void, onEdit?: (t: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentText, setCurrentText] = useState(text);
    // Track saved state to revert on cancel
    const [savedText, setSavedText] = useState(text);

    const handleCancel = () => {
        setCurrentText(savedText);
        setIsEditing(false);
    };

    const handleSave = () => {
        setSavedText(currentText);
        setIsEditing(false);
        if (onEdit) onEdit(currentText);
    };

    return (
        <div className="group relative my-4 pl-6 border-l-[3px] border-pink-500/40 bg-gradient-to-r from-pink-500/5 via-pink-500/5 to-transparent py-4 pr-4 rounded-r-xl transition-all hover:bg-pink-500/10 shadow-[inset_0_0_20px_rgba(236,72,153,0.02)]">
            {isEditing ? (
                <div className="flex flex-col gap-2">
                    <textarea
                        className="w-full bg-slate-900/90 text-indigo-100 p-3 rounded-lg border border-pink-500/30 text-base font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-pink-500 shadow-inner"
                        value={currentText}
                        onChange={(e) => setCurrentText(e.target.value)}
                        rows={Math.max(3, currentText.split('\n').length)}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleCancel}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 hover:bg-white/5 rounded"
                        >
                            <X className="w-3 h-3" /> Скасувати
                        </button>
                        <button
                            onClick={handleSave}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                        >
                            <Check className="w-3.5 h-3.5" /> Зберегти
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="font-serif italic text-base md:text-lg text-indigo-100/90 leading-[1.8] whitespace-pre-wrap tracking-wide drop-shadow-sm selection:bg-pink-500/30">
                        {currentText}
                    </div>
                    {onAddText && (
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 translate-x-2 group-hover:translate-x-0">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 bg-slate-800/80 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg shadow-lg backdrop-blur-sm border border-white/5 transition-all hover:scale-105"
                                title="Редагувати"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onAddText(currentText)}
                                className="p-2 bg-slate-800/80 hover:bg-pink-600 text-slate-400 hover:text-white rounded-lg shadow-lg backdrop-blur-sm border border-white/5 transition-all hover:scale-105"
                                title="Додати в розділ"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ParsedMessage;

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { Bold, Italic, List, Heading1, Heading2 } from 'lucide-react';

interface EditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

export default function Editor({ content, onChange, editable = true }: EditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Почніть писати свою історію...',
            }),
        ],
        content: content || '',
        editable,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] text-lg leading-relaxed text-slate-100 selection:bg-indigo-500/30 font-serif',
            },
        },
        onUpdate: ({ editor }) => {
            // We use HTML for now to persist formatting
            // Or getMarkdown() if using markdown extension, but HTML is safer for now
            onChange(editor.getHTML());
        },
    });

    // Sync content from outside (e.g. initial load or chapter switch)
    useEffect(() => {
        if (editor && content !== undefined) {
            // We need to compare to avoid loops, but if the ID changed upstream, content changed.
            // A simple comparison of HTML is risky if Tiptap changes formatting.
            // But for this use case (Switching chapters), we trust the prop.
            const currentHTML = editor.getHTML();
            if (content !== currentHTML) {
                // Force update
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 focus-within:border-indigo-500/50 transition-colors">

            {/* Toolbar */}
            {editable && (
                <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-800">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${editor.isActive('bold') ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
                        title="Жирний"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${editor.isActive('italic') ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
                        title="Курсив"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
                        title="Заголовок 1"
                    >
                        <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
                        title="Заголовок 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
                        title="Список"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto cursor-text p-4" onClick={() => editor.chain().focus().run()}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useState, useRef, useEffect } from "react";
import { Bot, Network, FileText, Send, BookOpen, Layers, Trash2 } from "lucide-react";
import PlotGraph from "@/components/PlotGraph";
import Editor from "@/components/Editor";
import { LorebookList } from "@/components/lorebook/LorebookList";
import { AddLorebookEntry } from "@/components/lorebook/AddLorebookEntry";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { AutoLoreDialog } from "@/components/lorebook/AutoLoreDialog";
import { RaspberryIcon } from "@/components/icons/RaspberryIcon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export default function Home() {
  const [rightPanel, setRightPanel] = useState<'none' | 'graph' | 'lore'>('none');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
  const [isAddLoreOpen, setIsAddLoreOpen] = useState(false);
  const [reloadLoreTrigger, setReloadLoreTrigger] = useState(0);

  // Auto-Lore
  const [isAutoLoreOpen, setIsAutoLoreOpen] = useState(false);

  // New State for Dialogs & Editor
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Привіт! Я готовий допомогти з сюжетом. Що станеться далі?' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for projects list
  const [projects, setProjects] = useState<any[]>([]);

  // Fetch Default Project on Load
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data || []);
        if (data && data.length > 0 && !projectId) {
          setProjectId(data[0].id);
        }
      });
  };

  // Fetch Project Content when Project ID changes
  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      fetch(`/api/projects/${projectId}`)
        .then(res => res.json())
        .then(data => {
          setEditorContent(data.content || "");
        })
        .catch(err => console.error("Failed to load project content", err))
        .finally(() => setIsLoading(false));
    } else {
      setEditorContent("");
    }
  }, [projectId]);

  // Auto-Save Effect
  useEffect(() => {
    if (!projectId) return;

    // Debounce save (2 seconds after last type)
    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editorContent })
        });
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [editorContent, projectId]);

  const deleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(prev => prev.filter(proj => proj.id !== id));
        if (projectId === id) setProjectId(null);
      }
    } catch (err) { console.error(err); }
    setProjectToDelete(null);
  };

  const handleProjectCreated = (newProject: any) => {
    setProjects(prev => [newProject, ...prev]);
    setProjectId(newProject.id);
  };

  const handleAutoLoreAdd = async (entry: { name: string; type: string; description: string }) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/lorebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: entry.name,
          type: entry.type,
          description: entry.description,
          status: 'Active'
        })
      });

      if (res.ok) {
        setReloadLoreTrigger(prev => prev + 1);
      } else {
        console.error("Failed to add auto lore entry");
      }
    } catch (e) {
      console.error(e);
    }
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. Fetch Context (Lorebook)
      let contextPayload = "Розділ 1: Незнайомець у Києві"; // Default fallback

      if (projectId) {
        try {
          const loreRes = await fetch(`/api/lorebook?projectId=${projectId}`);
          const loreData = await loreRes.json();

          if (loreData && loreData.length > 0) {
            const loreText = loreData
              .map((e: any) => `[${e.type}] ${e.name} (${e.status}): ${e.description}`)
              .join("\n");
            contextPayload += "\n\nДОВІДНИК СВІТУ:\n" + loreText;
          }
        } catch (err) {
          console.error("Failed to fetch lore for context", err);
        }
      }

      // 2. Send to AI
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: contextPayload,
          temperature: temperature
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: "⚠️ Помилка з'єднання з мозком." }]);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Mesh Gradient Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background pointer-events-none z-0" />

      {/* Header / Toolbar */}
      <header className="h-14 border-b border-white/5 flex items-center px-6 justify-between glass z-10 relative">
        <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
          <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
            <RaspberryIcon className="w-6 h-6 text-pink-500" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">
            AI Malyna Writer
          </span>
        </div>

        <div className="flex items-center gap-1 bg-card/50 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setRightPanel(rightPanel === 'lore' ? 'none' : 'lore')}
            className={`p-2 rounded-md transition-all ${rightPanel === 'lore' ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            title="Довідник Світу"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'graph' ? 'none' : 'graph')}
            className={`p-2 rounded-md transition-all ${rightPanel === 'graph' ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            title="Граф Сюжету"
          >
            <Network className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-primary transition-colors"
          title="Налаштування"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-hidden relative z-10">
        <ResizablePanelGroup direction="horizontal">

          {/* Left Sidebar: Projects */}
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25} className="bg-card/30 backdrop-blur-sm border-r border-white/5">
            <div className="flex flex-col h-full">
              <div className="p-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Проекти</h2>
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md shadow-lg shadow-primary/20 transition-all hover:scale-105"
                >
                  + Новий
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                {projects.map(p => (
                  <div
                    key={p.id}
                    className={`group px-3 py-2.5 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-all border-l-2
                      ${projectId === p.id
                        ? 'border-primary bg-primary/10 text-primary-foreground font-medium shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                    onClick={() => setProjectId(p.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${projectId === p.id ? 'text-primary' : 'opacity-50'}`} />
                      <span className="truncate">{p.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(p);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-white/5 w-[1px] hover:bg-primary/50 transition-colors" />

          {/* Center: Editor & Chat */}
          <ResizablePanel defaultSize={rightPanel !== 'none' ? 55 : 82}>
            <ResizablePanelGroup direction="vertical">

              {/* Top: Editor */}
              <ResizablePanel defaultSize={75} className="bg-transparent flex flex-col relative">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-transparent opacity-50 pointer-events-none" />
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                  <div className="max-w-3xl mx-auto min-h-full bg-card/20 backdrop-blur-sm border border-white/5 rounded-xl shadow-2xl p-8 md:p-12">
                    <Editor
                      content={editorContent}
                      onChange={setEditorContent}
                      editable={!!projectId}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle className="bg-white/5 h-[1px] hover:bg-primary/50 transition-colors" />

              {/* Bottom: Chat */}
              <ResizablePanel defaultSize={25} minSize={10} className="bg-card/40 backdrop-blur-md border-t border-white/5 flex flex-col">
                <div className="h-9 px-4 flex items-center justify-between border-b border-white/5 bg-white/2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    ШІ Помічник
                  </span>
                  {projectId && <span className="text-[10px] font-mono text-xs text-muted-foreground opacity-50">КОНТЕКСТ: {projectId.substring(0, 6)}</span>}
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg
                          ${msg.role === 'user'
                          ? 'bg-primary text-white rounded-br-none'
                          : 'bg-card border border-white/10 text-slate-200 rounded-bl-none'}`}>
                        {msg.content}
                      </div>
                      {msg.role === 'ai' && projectId && (
                        <button
                          onClick={() => setEditorContent(prev => prev + "<p>" + msg.content.replace(/\n/g, "<br/>") + "</p>")}
                          className="mt-2 text-xs text-primary hover:text-accent flex items-center gap-1.5 ml-1 opacity-60 hover:opacity-100 transition-all"
                        >
                          <FileText className="w-3 h-3" /> Вставити в текст
                        </button>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-primary text-xs ml-4 animate-pulse">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 bg-white/2 border-t border-white/5">
                  <div className="relative">
                    <input
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                      placeholder="Запитайте про сюжет або попросіть продовжити..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={isLoading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading}
                      className="absolute right-1.5 top-1.5 p-1.5 bg-primary hover:bg-primary/90 rounded-lg text-white disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Right Panel: Lore/Graph */}
          {rightPanel !== 'none' && (
            <>
              <ResizableHandle className="bg-white/5 w-[1px] hover:bg-primary/50 transition-colors" />
              <ResizablePanel defaultSize={22} minSize={20} className="bg-card/30 backdrop-blur-sm border-l border-white/5">
                {rightPanel === 'graph' ? (
                  <PlotGraph />
                ) : (
                  <div className="h-full flex flex-col">
                    <LorebookList
                      key={reloadLoreTrigger}
                      projectId={projectId || ""}
                      onAddClick={() => setIsAddLoreOpen(true)}
                      onAutoDiscoverClick={() => setIsAutoLoreOpen(true)}
                    />
                  </div>
                )}
              </ResizablePanel>
            </>
          )}

        </ResizablePanelGroup>
      </main>

      {/* Modals */}
      {projectId && (
        <AddLorebookEntry
          open={isAddLoreOpen}
          onClose={() => setIsAddLoreOpen(false)}
          projectId={projectId}
          onSuccess={() => setReloadLoreTrigger(prev => prev + 1)}
        />
      )}
      <CreateProjectDialog
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
      />

      <AutoLoreDialog
        open={isAutoLoreOpen}
        onClose={() => setIsAutoLoreOpen(false)}
        textToAnalyze={editorContent}
        onAddEntry={handleAutoLoreAdd}
      />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-[#020617] border border-slate-800 text-slate-50 sm:rounded-xl shadow-2xl z-[100]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Налаштування ШІ</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <Label className="text-slate-200 text-base">Креативність (Температура)</Label>
                <span className="px-3 py-1 rounded bg-indigo-900/50 text-indigo-300 font-mono text-sm border border-indigo-500/30">{temperature}</span>
              </div>
              <Slider
                value={[temperature]}
                min={0.1}
                max={1.5}
                step={0.1}
                onValueChange={(vals) => setTemperature(vals[0])}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-slate-400 px-1">
                <span>Точна</span>
                <span>Збалансована</span>
                <span>Творча</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-4 mt-2">
                <span className="text-indigo-400 font-semibold block mb-1">Що це змінює?</span>
                Низькі значення (0.1–0.5) роблять відповіді ШІ більш логічними та послідовними. Високі значення (1.0–1.5) додають непередбачуваності та креативу, але можуть викликати галюцинації.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent className="bg-[#020617] border-red-900/50 text-slate-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити проект: {projectToDelete?.title}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Ця дія незворотна. Весь вміст проекту та історія буде втрачено назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-800 hover:bg-slate-800 hover:text-white">Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-900 hover:bg-red-800 text-white border border-red-800"
              onClick={() => projectToDelete && deleteProject(projectToDelete.id)}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

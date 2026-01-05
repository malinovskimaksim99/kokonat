"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useState, useRef, useEffect } from "react";
import { Bot, Network, FileText, Send, Layers, Trash2, Square, Sparkles, Lightbulb, CheckCircle2, Circle, Pencil, Check, X, Settings, Plus, Search, Book } from "lucide-react";
import ParsedMessage from '../components/ParsedMessage';
import PlotGraph from "@/components/PlotGraph";
import Editor from "@/components/Editor";
import { ChapterTabs } from "@/components/ChapterTabs";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
// import { Settings } from "lucide-react"; // Removed duplicate
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
  id?: string;
  role: 'user' | 'ai';
  content: string;
}

export default function Home() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [rightPanel, setRightPanel] = useState<'none' | 'graph' | 'ideas'>('none');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'chapter' | 'idea', id: string, name?: string } | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [worldBibleContent, setWorldBibleContent] = useState("");
  const [isAddLoreOpen, setIsAddLoreOpen] = useState(false);
  const [reloadLoreTrigger, setReloadLoreTrigger] = useState(0);

  // Auto-Lore
  const [isAutoLoreOpen, setIsAutoLoreOpen] = useState(false);

  // New State for Dialogs & Editor
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Ideas State
  const [ideas, setIdeas] = useState<any[]>([]);
  const [newIdeaContent, setNewIdeaContent] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ summary: string; events: string[]; mood: string } | null>(null);

  // World Update State
  const [isUpdatingWorld, setIsUpdatingWorld] = useState(false);
  const [worldUpdates, setWorldUpdates] = useState<any[]>([]);
  const [appliedUpdates, setAppliedUpdates] = useState<Set<string>>(new Set());

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Привіт! Я готовий допомогти з сюжетом. Що станеться далі?' }
  ]);

  // State for projects list
  // Removed duplicate projects declaration

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

  const handleAnalyzeChapter = async () => {
    if (!editorContent.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/analyze/chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editorContent })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysisResult(data);
    } catch (e) {
      console.error(e);
      alert("Не вдалося провести аналіз: " + String(e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeWorld = async () => {
    if (!editorContent.trim()) return;
    setIsUpdatingWorld(true);
    setWorldUpdates([]);
    try {
      const res = await fetch('/api/analyze/world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_text: editorContent,
          bible_text: worldBibleContent
        })
      });
      const data = await res.json();
      if (data.updates) setWorldUpdates(data.updates);
    } catch (e) {
      console.error(e);
      alert("Помилка аналізу світу: " + String(e));
    } finally {
      setIsUpdatingWorld(false);
    }
  };

  const handleApplyWorldUpdate = (sectionName: string, fact: string) => {
    // 1. Find section or Create it
    let newBible = worldBibleContent;

    // Normalize header search
    const sectionHeader = sectionName.startsWith('#') ? sectionName : `## ${sectionName}`;

    if (!newBible.includes(sectionHeader)) {
      // Append new section
      newBible += `\n\n${sectionHeader}\n`;
    }

    // 2. Insert Fact
    // Look for the next section header to insert before it, or EOF
    const sectionIndex = newBible.indexOf(sectionHeader);
    const nextSectionMatch = newBible.slice(sectionIndex + sectionHeader.length).match(/\n## /);

    const insertPosition = nextSectionMatch
      ? sectionIndex + sectionHeader.length + nextSectionMatch.index!
      : newBible.length;

    const factLine = `\n- ${fact}`;

    newBible =
      newBible.slice(0, insertPosition) +
      factLine +
      newBible.slice(insertPosition);

    setWorldBibleContent(newBible);

    // Trigger save (updates project)
    if (projectId) {
      fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldBible: newBible })
      });
    }

    // Mark as applied
    setAppliedUpdates(prev => new Set(prev).add(fact));
  };

  // Fetch Project Content & Chat when Project ID changes
  useEffect(() => {
    if (projectId) {
      setIsLoading(true);

      // 1. Fetch Project & Chapters
      fetch(`/api/projects/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.chapters && data.chapters.length > 0) {
            // Sort by order
            const sorted = data.chapters.sort((a: any, b: any) => a.order - b.order);
            setChapters(sorted);
            // Default to first chapter
            setActiveChapterId(sorted[0].id);
            setEditorContent(sorted[0].content || "");
          } else {
            setChapters([]);
            setActiveChapterId(null);
            setEditorContent("");
          }
          // Load World Bible
          setWorldBibleContent(data.worldBible || "");
        })
        .catch(err => console.error("Failed to load project content", err))
        .finally(() => setIsLoading(false));

      // 2. Fetch Chat History
      fetch(`/api/projects/${projectId}/chat`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMessages(data);
          } else {
            setMessages([]);
          }
        })
        .catch(e => console.error("Failed to load chat", e));

    } else {
      setEditorContent("");
      setChapters([]);
      setActiveChapterId(null);
      setMessages([{ role: 'ai', content: 'Привіт! Я готовий допомогти з сюжетом. Оберіть проект.' }]);
    }
  }, [projectId]);

  // Fetch Ideas
  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}/ideas`)
        .then(res => res.json())
        .then(data => setIdeas(Array.isArray(data) ? data : []))
        .catch(err => console.error("Failed to load ideas", err));
    } else {
      setIdeas([]);
    }
  }, [projectId]);

  const handleAddIdea = async () => {
    if (!projectId || !newIdeaContent.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newIdeaContent })
      });
      const idea = await res.json();
      setIdeas(prev => [idea, ...prev]);
      setNewIdeaContent("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleIdea = async (id: string, currentStatus: boolean) => {
    // Optimistic
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, isCompleted: !currentStatus } : i));
    try {
      await fetch(`/api/projects/${projectId}/ideas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteIdea = (id: string) => {
    setDeleteTarget({ type: 'idea', id });
  };

  const executeDeleteIdea = async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/projects/${projectId}/ideas/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartEdit = (idea: any) => {
    setEditingIdeaId(idea.id);
    setEditingContent(idea.content);
  };

  const handleCancelEdit = () => {
    setEditingIdeaId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingContent.trim()) return;

    // Optimistic Update
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, content: editingContent } : i));
    setEditingIdeaId(null);

    try {
      await fetch(`/api/projects/${projectId}/ideas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handler for Chapter Select
  const handleChapterSelect = (id: string) => {
    // 1. Save current content to old location in state
    if (activeChapterId === 'PLOT_BIBLE') {
      setWorldBibleContent(editorContent);
    } else if (activeChapterId) {
      setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, content: editorContent } : c));
    }

    // 2. Switch
    if (id === 'PLOT_BIBLE') {
      setActiveChapterId('PLOT_BIBLE');
      setEditorContent(worldBibleContent);
    } else {
      const target = chapters.find(c => c.id === id);
      if (target) {
        setActiveChapterId(id);
        setEditorContent(target.content || "");
      }
    }
  };

  // Handler for Add Chapter
  const handleChapterAdd = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }) // Title will be auto-gen on server
      });
      const newChapter = await res.json();
      setChapters(prev => [...prev, newChapter]);
      // Switch to new
      setActiveChapterId(newChapter.id);
      setEditorContent("");
    } catch (e) {
      console.error(e);
    }
  };

  // Handler for Rename
  const handleChapterRename = async (id: string, newTitle: string) => {
    if (!projectId) return;
    // Optimistic update
    setChapters(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));

    try {
      await fetch(`/api/projects/${projectId}/chapters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handler for Delete Chapter (Trigger)
  const handleChapterDelete = (id: string) => {
    setDeleteTarget({ type: 'chapter', id });
  };

  // Handler for Delete Chapter (Execute)
  const executeDeleteChapter = async (id: string) => {
    if (!projectId) return;

    try {
      await fetch(`/api/projects/${projectId}/chapters/${id}`, { method: 'DELETE' });

      setChapters(prev => {
        const newChapters = prev.filter(c => c.id !== id);
        // Switch to another chapter if we deleted the active one
        if (activeChapterId === id) {
          if (newChapters.length > 0) {
            setActiveChapterId(newChapters[0].id);
            setEditorContent(newChapters[0].content || "");
          } else {
            setActiveChapterId(null);
            setEditorContent("");
          }
        }
        return newChapters;
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-Save Effect
  // Auto-Save Effect (Now targeting CHAPTERS or WORLD BIBLE)
  useEffect(() => {
    if (!projectId || !activeChapterId) return;

    // Debounce save (2 seconds after last type)
    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try {
        if (activeChapterId === 'PLOT_BIBLE') {
          // Save to Project.worldBible
          await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worldBible: editorContent })
          });
        } else {
          // Save to Chapter
          await fetch(`/api/projects/${projectId}/chapters/${activeChapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editorContent })
          });
        }
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [editorContent, projectId, activeChapterId]);

  const deleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(prev => prev.filter(proj => proj.id !== id));
        if (projectId === id) setProjectId(null);
      }
    } catch (err) { console.error(err); }
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

  // Stop Generation Handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  // Handler for Updating Message (Persist Edit)
  const handleMessageUpdate = async (index: number, newContent: string) => {
    const msg = messages[index];
    console.log(`Updating message [${index}] ID: ${msg.id}, Project: ${projectId}`);

    if (!msg.id || !projectId) {
      console.error("Cannot update message: Missing ID or ProjectID");
      return;
    }

    // Optimistic update
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, content: newContent } : m));

    try {
      await fetch(`/api/projects/${projectId}/chat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msg.id, content: newContent })
      });
    } catch (e) {
      console.error("Failed to update message", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput("");

    // Create AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);

    try {
      // 1. Fetch Context (Lorebook)
      // 0. Fetch Graph Context (The "Memory")
      let graphContextPayload = "";
      try {
        const graphRes = await fetch(`/api/projects/${projectId}/graph`);
        if (graphRes.ok) {
          const graphJson = await graphRes.json();
          if (graphJson.nodes && Array.isArray(graphJson.nodes) && graphJson.nodes.length > 0) {
            // Sort by X position (chronological)
            const sortedNodes = graphJson.nodes.sort((a: any, b: any) => a.positionX - b.positionX);

            // Format text summary (Limit to last 50 events to prevent context overflow)
            const recentNodes = sortedNodes.slice(-50);

            graphContextPayload = recentNodes.map((n: any) => {
              try {
                const d = JSON.parse(n.data);
                return `- [${d.thread || "General"}] ${d.label}: ${d.details}`;
              } catch { return ""; }
            }).filter((s: string) => s).join("\n");

            if (sortedNodes.length > 50) {
              graphContextPayload = `... (Previous ${sortedNodes.length - 50} events omitted)...\n` + graphContextPayload;
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch graph memory", e);
      }

      // 1. Context (World Bible)
      let contextPayload = "";
      // Legacy Lorebook logic removed. World Bible is now sent separately.

      // 2. Send to AI (Streaming)
      const historyPayload = messages
        .slice(-70)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          world_bible: worldBibleContent,
          graph_context: graphContextPayload, // Pass Graph Memory
          project_id: projectId,
          temperature: temperature
        }),
        signal: abortController.signal
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiReply = "";

      // Initial empty message for AI
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiReply += chunk;

        // Update the last message (AI's) with new chunk
        setMessages(prev => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];
          if (lastMsg.role === 'ai') {
            lastMsg.content = aiReply;
          }
          return newHistory;
        });
      }

      // Save to DB (Full Message)
      // Save to DB and Capture IDs
      if (projectId) {
        // Save User Message
        const userRes = await fetch(`/api/projects/${projectId}/chat`, {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: userMsg })
        });
        const savedUserMsg = await userRes.json();

        // Save AI Message
        const aiRes = await fetch(`/api/projects/${projectId}/chat`, {
        });
        const savedAiMsg = await aiRes.json();

        // Update local state with IDs
        setMessages(prev => {
          const newHistory = [...prev];
          const lastAiIndex = newHistory.length - 1;
          const lastUserIndex = newHistory.length - 2;

          console.log("Saving Chat - AI ID:", savedAiMsg.id, "User ID:", savedUserMsg.id);

          if (newHistory[lastAiIndex]) {
            newHistory[lastAiIndex] = { ...newHistory[lastAiIndex], id: savedAiMsg.id };
          }
          if (newHistory[lastUserIndex]) {
            newHistory[lastUserIndex] = { ...newHistory[lastUserIndex], id: savedUserMsg.id };
          }

          return newHistory;
        });
      }

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: "⚠️ Помилка з'єднання." }]);
        console.error(e);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col font-sans overflow-hidden bg-mesh relative">
      {/* Dynamic Background Overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none z-[1]" />

      {/* Header / Toolbar */}
      <header className="h-16 flex items-center px-6 justify-between glass-header z-50 relative shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-pink-500/20 to-purple-600/20 p-2.5 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
            <RaspberryIcon className="w-6 h-6 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 text-glow">
            ШІ Малина Автор
          </span>
        </div>

        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-full border border-white/5 backdrop-blur-sm">
          <button
            onClick={() => setRightPanel(rightPanel === 'ideas' ? 'none' : 'ideas')}
            className={`p-2.5 rounded-full transition-all duration-300 ${rightPanel === 'ideas' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25 scale-105' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
            title="Банк Ідей"
          >
            <Lightbulb className="w-5 h-5" />
          </button>


          <button

            onClick={() => setRightPanel(rightPanel === 'graph' ? 'none' : 'graph')}
            className={`p-2.5 rounded-full transition-all duration-300 ${rightPanel === 'graph' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-105' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
            title="Граф Сюжету"
          >
            <Network className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 rounded-full hover:bg-white/5 text-slate-400 hover:text-pink-300 transition-colors duration-300"
          title="Налаштування"
        >
          <Settings className="w-6 h-6" />
        </button>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="p-3 rounded-full hover:bg-white/5 text-slate-400 hover:text-indigo-300 transition-colors duration-300"
          title="Довідка"
        >
          <span className="text-xl font-bold font-serif leading-none">?</span>
        </button>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-hidden relative z-10 flex">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">

          {/* Left Sidebar: Projects */}
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25} className="glass-panel border-r-0 mr-1 rounded-r-2xl my-2 ml-2 flex flex-col overflow-hidden transition-all">
            <div className="flex flex-col h-full">
              <div className="p-5 flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Проекти</h2>
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="text-xs bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md shadow-lg shadow-primary/20 transition-all hover:scale-105 font-medium"
                >
                  + Новий
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                {projects.map(p => (
                  <div
                    key={p.id}
                    className={`group px - 4 py - 3 rounded - xl text - sm flex items - center justify - between cursor - pointer transition - all duration - 200 border border - transparent
                      ${projectId === p.id
                        ? 'bg-primary/10 border-primary/20 text-primary-foreground shadow-[0_0_20px_rgba(236,72,153,0.1)]'
                        : 'hover:bg-white/5 hover:border-white/5 text-slate-400 hover:text-slate-200'
                      } `}
                    onClick={() => setProjectId(p.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className={`w - 4 h - 4 flex - shrink - 0 ${projectId === p.id ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]' : 'opacity-50'} `} />
                      <span className="truncate font-medium">{p.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: 'project', id: p.id, name: p.title });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-transparent w-2 hover:bg-pink-500/20 transition-colors" />

          {/* Center: Editor & Chat */}
          <ResizablePanel defaultSize={rightPanel !== 'none' ? 55 : 82}>
            <ResizablePanelGroup direction="vertical">

              {/* Top: Editor */}
              <ResizablePanel defaultSize={70} className="bg-transparent flex flex-col relative z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-transparent opacity-50 pointer-events-none" />

                {/* Chapter Tabs */}
                {projectId && (
                  <div className="z-20 relative">
                    <ChapterTabs
                      chapters={chapters}
                      activeChapterId={activeChapterId}
                      onSelect={handleChapterSelect}
                      onAdd={() => handleChapterAdd()}
                      onRename={handleChapterRename}
                      onDelete={handleChapterDelete}
                    />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 custom-scrollbar">
                  {/* Analysis Button Bar */}
                  {activeChapterId && (
                    <div className="max-w-4xl mx-auto mb-4 flex justify-end">
                      <button
                        onClick={handleAnalyzeChapter}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold border border-indigo-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {isAnalyzing ? "АНАЛІЗУЮ..." : "АНАЛІЗ РОЗДІЛУ"}
                      </button >
                    </div >
                  )}

                  <div className="max-w-4xl mx-auto min-h-full bg-card/10 backdrop-blur-sm border border-white/5 rounded-2xl shadow-xl p-8 md:p-12 relative">
                    {/* Editor Background Glow */}
                    <div className="absolute top-10 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

                    <Editor
                      key={activeChapterId || 'empty'}
                      content={editorContent}
                      editable={!!activeChapterId}
                      onChange={(newContent) => {
                        setEditorContent(newContent);
                        if (activeChapterId === 'PLOT_BIBLE') {
                          setWorldBibleContent(newContent);
                        } else if (activeChapterId) {
                          setChapters(prev => prev.map(c => c.id === activeChapterId ? { ...c, content: newContent } : c));
                        }
                      }}
                    />
                  </div>
                </div >
              </ResizablePanel >

              <ResizableHandle className="bg-white/5 h-[1px] hover:bg-pink-500/50 transition-colors" />

              {/* Bottom: Chat */}
              <ResizablePanel defaultSize={30} minSize={15} className="glass-panel border-t border-white/10 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10 m-2 rounded-2xl mt-0 overflow-hidden">
                <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-white/5">
                  <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-widest flex items-center gap-2">
                    <RaspberryIcon className="w-3 h-3 text-pink-400" />
                    ШІ Помічник
                  </span>
                  {projectId && <span className="text-[10px] font-mono text-xs text-slate-500">КОНТЕКСТ АКТИВНИЙ</span>}
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                      <div className={`max-w-[90%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-md
                          ${msg.role === 'user'
                          ? 'bg-slate-700/80 text-white rounded-br-sm border border-slate-600/50'
                          : 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 text-indigo-100 rounded-bl-sm shadow-[0_0_15px_rgba(168,85,247,0.1)] w-full'}`}>
                        <ParsedMessage
                          content={msg.content}
                          role={msg.role}
                          onAddText={(text) => setEditorContent(prev => prev + "<p>" + text + "</p>")}
                          onEdit={(text) => handleMessageUpdate(i, text)}
                        />
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-pink-500 text-xs ml-4 animate-pulse">
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="font-mono opacity-80">Думає...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 bg-black/20 border-t border-white/5 backdrop-blur-xl">
                  <div className="relative group">
                    <textarea
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all shadow-inner group-hover:bg-slate-900/70 resize-none overflow-hidden min-h-[44px]"
                      placeholder="Запитайте про сюжет або попросіть продовжити..."
                      value={input}
                      rows={1}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={isLoading}
                    />
                    {isLoading ? (
                      <button
                        onClick={handleStopGeneration}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg text-white transition-all hover:scale-105 shadow-lg shadow-red-900/20 animate-pulse"
                        title="Зупинити генерацію"
                      >
                        <Square className="w-4 h-4 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-gradient-to-br from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-lg text-white disabled:opacity-50 transition-all hover:scale-105 shadow-lg shadow-pink-900/20"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </ResizablePanel>

            </ResizablePanelGroup >
          </ResizablePanel >

          {/* Right Panel: Lore/Graph */}
          {
            rightPanel !== 'none' && (
              <>
                <ResizableHandle className="bg-transparent w-2 hover:bg-pink-500/20 transition-colors" />
                <ResizablePanel defaultSize={22} minSize={20} className="glass-panel border-l-0 ml-1 rounded-l-2xl my-2 mr-2 flex flex-col overflow-hidden">
                  {rightPanel === 'graph' && (
                    <PlotGraph projectId={projectId} chapterContent={editorContent} />
                  )}
                  {rightPanel === 'ideas' && (
                    <div className="h-full flex flex-col">
                      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Банк Ідей</h3>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors text-slate-200 placeholder-slate-500"
                            placeholder="Нова ідея..."
                            value={newIdeaContent}
                            onChange={(e) => setNewIdeaContent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
                          />
                          <button
                            onClick={handleAddIdea}
                            className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors border border-yellow-500/20"
                          >
                            <span className="text-xl leading-none">+</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {ideas.length === 0 && (
                          <div className="text-center py-10 text-slate-500 italic text-sm">
                            Поки що пусто. Додайте першу геніальну ідею! 💡
                          </div>
                        )}
                        {ideas.map((idea) => (
                          <div key={idea.id} className="group flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10 relative">

                            {editingIdeaId === idea.id ? (
                              /* Edit Mode */
                              <div className="flex-1 flex gap-2 items-start">
                                <textarea
                                  className="flex-1 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-sm focus:outline-none focus:border-yellow-500/50 text-slate-200 resize-none min-h-[60px]"
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  autoFocus
                                />
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => handleSaveEdit(idea.id)}
                                    className="p-1 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded"
                                    title="Зберегти"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1 text-slate-400 hover:text-slate-300 hover:bg-white/10 rounded"
                                    title="Скасувати"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Display Mode */
                              <>
                                <button
                                  onClick={() => handleToggleIdea(idea.id, idea.isCompleted)}
                                  className={`mt-1 shrink-0 ${idea.isCompleted ? 'text-green-400' : 'text-slate-500 hover:text-yellow-400'}`}
                                >
                                  {idea.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>

                                <div className="flex-1 min-w-0" onDoubleClick={() => handleStartEdit(idea)}>
                                  <span className={`text-sm leading-relaxed block break-words ${idea.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                    {idea.content}
                                  </span>
                                </div>

                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleStartEdit(idea)}
                                    className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                    title="Редагувати"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteIdea(idea.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                    title="Видалити"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ResizablePanel>
              </>
            )
          }

        </ResizablePanelGroup >
      </main >

      {/* Modals */}

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
      />



      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-[#020617] border border-white/10 text-slate-50 sm:rounded-2xl shadow-2xl z-[100] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">Налаштування ШІ</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-medium">
                <Label className="text-slate-200 text-sm">Креативність (Температура)</Label>
                <span className="px-2 py-0.5 rounded bg-[#1e1b4b] text-indigo-300 font-mono text-xs border border-indigo-500/30 shadow-sm">{temperature}</span>
              </div>
              <Slider
                value={[temperature]}
                min={0.1}
                max={1.5}
                step={0.1}
                onValueChange={(vals) => setTemperature(vals[0])}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400 px-1 font-medium tracking-wide">
                <span>Точна</span>
                <span>Збалансована</span>
                <span>Творча</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0f172a] border border-white/5 mt-2 transition-all duration-300">
                <span className="text-pink-400 font-bold block mb-1 text-[10px] uppercase tracking-wider">Що це змінює?</span>
                <p className="text-xs text-slate-300 leading-relaxed min-h-[30px]">
                  {temperature < 0.5 && "✨ Логіка та точність. ШІ буде дотримуватися фактів і писати сухо."}
                  {temperature >= 0.5 && temperature < 1.0 && "⚖️ Баланс. Ідеально для більшості художніх текстів."}
                  {temperature >= 1.0 && "🔥 Хаос та Креатив. ШІ може вигадувати божевільні ідеї, але менш стабільний."}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#020617] border-red-500/20 text-slate-50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 text-xl font-bold">
              {deleteTarget?.type === 'project' && `Видалити проект: ${deleteTarget.name}?`}
              {deleteTarget?.type === 'chapter' && "Видалити цей розділ?"}
              {deleteTarget?.type === 'idea' && "Видалити цю ідею?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {deleteTarget?.type === 'project' && "Ця дія незворотна. Весь вміст проекту та історія буде втрачено назавжди."}
              {deleteTarget?.type === 'chapter' && "Розділ та його вміст буде видалено назавжди."}
              {deleteTarget?.type === 'idea' && "Ця ідея буде видалена зі списку."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/10 text-slate-300">Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white border border-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === 'project') deleteProject(deleteTarget.id);
                if (deleteTarget.type === 'chapter') executeDeleteChapter(deleteTarget.id);
                if (deleteTarget.type === 'idea') executeDeleteIdea(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Analysis Result Modal */}
      <Dialog open={!!analysisResult} onOpenChange={(open) => !open && setAnalysisResult(null)}>
        <DialogContent className="bg-[#0f172a] border border-indigo-500/20 text-slate-100 max-w-2xl shadow-[0_0_50px_rgba(79,70,229,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Аналіз Розділу
            </DialogTitle>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-6 py-2">
              {/* Mood Badge */}
              <div className="flex justify-end">
                <span className="px-3 py-1 rounded-full bg-indigo-950/50 text-indigo-200 text-xs font-mono border border-indigo-500/20 uppercase tracking-widest">
                  Настрій: {analysisResult.mood}
                </span>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Короткий Зміст</h4>
                <p className="text-sm leading-relaxed text-slate-200 bg-black/20 p-4 rounded-xl border border-white/5 font-serif italic">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Key Events */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ключові Події</h4>
                <ul className="space-y-2">
                  {analysisResult.events.map((event, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="font-mono text-indigo-400 font-bold opacity-50">0{i + 1}</span>
                      <span>{event}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* World Update Section */}
              <div className="pt-4 border-t border-white/10 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2">
                    <Book className="w-4 h-4" /> Оновлення Світу
                  </h4>
                  {!isUpdatingWorld && worldUpdates.length === 0 && (
                    <button
                      onClick={handleAnalyzeWorld}
                      className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-200 text-xs px-3 py-1.5 rounded-full border border-amber-500/30 transition-all"
                    >
                      ✨ Шукати нові факти
                    </button>
                  )}
                </div>

                {isUpdatingWorld && (
                  <div className="text-center py-4 text-slate-400 text-sm animate-pulse">
                    🔍 Агент читає текст і шукає нові факти...
                  </div>
                )}

                {worldUpdates.length > 0 && (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {worldUpdates.map((section, idx) => (
                      <div key={idx} className="bg-black/30 rounded-lg p-3 border border-amber-500/10">
                        <h5 className="text-xs font-bold text-amber-500 mb-2 uppercase">{section.section}</h5>
                        <ul className="space-y-2">
                          {section.facts.map((fact: any, fIdx: number) => {
                            const isApplied = appliedUpdates.has(fact);
                            return (
                              <li key={fIdx} className="flex justify-between items-start gap-2 text-sm text-slate-300">
                                <span className="leading-tight pt-0.5">{fact}</span>
                                <button
                                  onClick={() => handleApplyWorldUpdate(section.section, fact)}
                                  disabled={isApplied}
                                  className={`shrink-0 p-1 rounded transition-colors ${isApplied ? 'text-green-500 bg-green-500/10' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-900/20'}`}
                                  title={isApplied ? "Додано" : "Додати в Сюжет"}
                                >
                                  {isApplied ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {!isUpdatingWorld && worldUpdates.length === 0 && (
                  <p className="text-xs text-slate-500 italic">Натисніть кнопку вище, щоб перевірити, чи є в цьому розділі нові факти для Енциклопедії Світу.</p>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Закрити
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="bg-[#0f172a] border border-white/10 text-slate-100 max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b border-white/5 shrink-0 bg-white/5">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              📚 Посібник Користувача
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

            <section>
              <h3 className="text-lg font-bold text-indigo-400 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" /> 1. Редактор та Розділи
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                <li>Створюйте нові розділи кнопкою <strong>+</strong> у верхній панелі.</li>
                <li>Подвійний клік по назві розділу дозволяє його <strong>перейменувати</strong>.</li>
                <li>Текст зберігається автомтично (Autosave).</li>
                <li>Використовуйте кнопку <strong>✨ Аналіз Розділу</strong>, щоб отримати короткий зміст та список подій від ШІ.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-pink-400 mb-2 flex items-center gap-2">
                <Bot className="w-5 h-5" /> 2. ШІ Чат та Пам'ять
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                <li>Спілкуйтеся з ШІ про сюжет. Він пам'ятає останні <strong>70 повідомлень</strong>.</li>
                <li>Ви можете <strong>редагувати</strong> повідомлення ШІ (олівець при наведенні), якщо він помилився.</li>
                <li>Текст історії в чаті виділяється <em>курсивом</em>.</li>
                <li>Натисніть <strong>+</strong> біля повідомлення, щоб вставити його прямо в редактор.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" /> 3. Банк Ідей
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                <li>Натисніть 💡 вгорі, щоб відкрити панель ідей.</li>
                <li>Записуйте швидкі думки, плани або To-Do.</li>
                <li>Можна відмічати виконані та редагувати текст (подвійний клік).</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <Network className="w-5 h-5" /> 4. Граф Сюжету
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                <li>Візуалізація зв'язків між персонажами та локаціями.</li>
                <li>Автоматично будується на основі аналізу тексту (в розробці).</li>
              </ul>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}

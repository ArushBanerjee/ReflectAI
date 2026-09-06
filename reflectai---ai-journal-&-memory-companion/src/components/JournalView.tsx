import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Plus,
  Trash2,
  Brain,
  Check,
  Copy,
  Clock,
  Search,
  RefreshCw,
  Tag,
  AlertCircle,
  FileText,
  Activity,
  Smile,
  ShieldCheck,
} from "lucide-react";
import Markdown from "react-markdown";
import { JournalEntry, ChatMessage, MemoryItem, UserIdentity } from "../types";

interface JournalViewProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onNewEntry: () => void;
  onSaveEntry: (entry: JournalEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  activeMemories: MemoryItem[];
  user: UserIdentity;
}

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onSaveEntry,
  onDeleteEntry,
  activeMemories,
  user,
}) => {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentEntry = entries.find((e) => e.id === activeEntryId) || null;

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentEntry?.messages]);

  const promptStarters = [
    { title: "Morning Intention", text: "What are the 2-3 intentions that will make today feel meaningful and focused?" },
    { title: "Cognitive Roadblock", text: "I'm facing friction with a complex decision. Help me unpack the trade-offs objectively." },
    { title: "Daily Debrief", text: "Reflecting on today: what went exceptionally well, what drained me, and what did I learn?" },
    { title: "Gratitude & Win", text: "I want to celebrate a milestone and acknowledge who helped make it possible." },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setErrorMessage(null);
    setSaveStatus("saving");

    const now = new Date();
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      text,
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    let targetEntry: JournalEntry;
    let isBrandNew = false;

    if (!currentEntry) {
      isBrandNew = true;
      targetEntry = {
        id: `entry_${Date.now()}`,
        userId: user.uid,
        title: "New Reflection",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        messages: [userMsg],
        groundedMemoryCount: activeMemories.length,
      };
    } else {
      targetEntry = {
        ...currentEntry,
        updatedAt: now.toISOString(),
        messages: [...currentEntry.messages, userMsg],
        groundedMemoryCount: activeMemories.length,
      };
    }

    // Immediately persist user message to prevent data loss
    try {
      await onSaveEntry(targetEntry);
      if (isBrandNew) {
        onSelectEntry(targetEntry.id);
      }
    } catch (saveErr) {
      console.error("Failed to persist user message:", saveErr);
      setSaveStatus("error");
      setErrorMessage("Could not save initial prompt. Retrying...");
    }

    setInputText("");

    try {
      // 1. Converse with Gemini 3.6 Flash
      const memorySnippets = activeMemories
        .filter((m) => m.isActive)
        .map((m) => `[${m.type.toUpperCase()}]: ${m.content}`);

      const chatPayload = {
        messages: targetEntry.messages.map((m) => ({
          role: m.role,
          content: m.text,
        })),
        userMemories: memorySnippets,
        activeMood: targetEntry.analysis?.mood || "",
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const resData = await response.json();
      const modelMsg: ChatMessage = {
        id: `msg_${Date.now()}_m`,
        role: "model",
        text: resData.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const updatedEntry: JournalEntry = {
        ...targetEntry,
        updatedAt: new Date().toISOString(),
        messages: [...targetEntry.messages, modelMsg],
      };

      // 2. If it's a new conversation or first message, generate title in background
      if (updatedEntry.messages.length <= 2) {
        fetch("/api/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
          .then((r) => r.json())
          .then((titleData) => {
            if (titleData.title) {
              const withTitle: JournalEntry = {
                ...updatedEntry,
                title: titleData.title,
              };
              onSaveEntry(withTitle);
            }
          })
          .catch((e) => console.warn("Background title gen failed:", e));
      }

      // Persist conversation state with Gemini response
      await onSaveEntry(updatedEntry);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: any) {
      console.error("Chat turn failed:", err);
      setSaveStatus("error");
      setErrorMessage(err?.message || "Failed to communicate with Gemini. Your entry has been saved locally.");
    } finally {
      setIsSending(false);
    }
  };

  const handleAnalyzeEntry = async () => {
    if (!currentEntry || currentEntry.messages.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    const fullConversationText = currentEntry.messages
      .map((m) => `${m.role === "user" ? "Me" : "ReflectAI"}: ${m.text}`)
      .join("\n\n");

    try {
      const response = await fetch("/api/analyze-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullConversationText,
          existingMemories: activeMemories.map((m) => m.content),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze entry");
      }

      const res = await response.json();
      if (res.analysis) {
        const updatedEntry: JournalEntry = {
          ...currentEntry,
          analysis: {
            ...res.analysis,
            analyzedAt: new Date().toISOString(),
          },
        };
        await onSaveEntry(updatedEntry);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setErrorMessage("Could not complete AI analysis: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.title.toLowerCase().includes(term) ||
      e.messages.some((m) => m.text.toLowerCase().includes(term)) ||
      e.analysis?.mood.toLowerCase().includes(term) ||
      e.analysis?.keyTopics.some((t) => t.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar: Entry History */}
      <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 flex flex-col flex-shrink-0 transition-colors">
        {/* Sidebar Header & New Entry */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              Journal History
            </h2>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <button
            id="new-entry-btn"
            onClick={onNewEntry}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {/* Search History */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter past entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
              <p>No reflections found.</p>
              <button
                onClick={onNewEntry}
                className="text-indigo-600 dark:text-indigo-400 underline font-medium"
              >
                Start a fresh entry
              </button>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = entry.id === activeEntryId;
              const lastMsg = entry.messages[entry.messages.length - 1];
              return (
                <div
                  key={entry.id}
                  id={`entry-item-${entry.id}`}
                  onClick={() => onSelectEntry(entry.id)}
                  className={`group relative p-3 rounded-xl cursor-pointer text-left transition-all border ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-xs"
                      : "bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1">
                      {entry.title || "Untitled Reflection"}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this reflection permanently?")) {
                          onDeleteEntry(entry.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-opacity"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                    {lastMsg ? lastMsg.text : "Empty reflection..."}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/50 text-[10px] text-zinc-400">
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {entry.analysis?.mood && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium">
                        {entry.analysis.mood}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Conversation Canvas */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden relative">
        {/* Canvas Header */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {currentEntry?.title || "New Reflection Canvas"}
              </h1>
              {currentEntry?.analysis?.mood && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Smile className="w-3 h-3" />
                  {currentEntry.analysis.mood}
                </span>
              )}
            </div>

            {/* Active Grounded Memories Badge */}
            {activeMemories.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Brain className="w-3 h-3 text-indigo-500" />
                <span>Grounded with {activeMemories.filter((m) => m.isActive).length} long-term memories</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Save Status Indicator */}
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                  <AlertCircle className="w-3 h-3" /> Retry Needed
                </span>
              )}
            </div>

            {/* Analyze Insights Action */}
            {currentEntry && currentEntry.messages.length > 0 && (
              <button
                id="analyze-insights-btn"
                onClick={handleAnalyzeEntry}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${isAnalyzing ? "animate-spin" : ""}`} />
                <span>{isAnalyzing ? "Analyzing..." : "Analyze Mood & Insights"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!currentEntry || currentEntry.messages.length === 0 ? (
            <div className="max-w-xl mx-auto py-12 text-center space-y-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Begin Your Self-Reflection
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Type freely about your thoughts, feelings, roadblocks, or victories. Gemini 3.6 Flash
                  will listen deeply, help organize your thinking, and extract enduring insights.
                </p>
              </div>

              {/* Starter Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {promptStarters.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(starter.text)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all text-xs space-y-1 text-zinc-800 dark:text-zinc-200"
                  >
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {starter.title}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {starter.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            currentEntry.messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto justify-end" : "mr-auto justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed max-w-[85%] sm:max-w-[80%] ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-xs shadow-sm"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-bl-xs border border-zinc-200/80 dark:border-zinc-800"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="markdown-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    )}

                    <div
                      className={`flex items-center justify-between gap-4 mt-2 pt-2 text-[10px] border-t ${
                        isUser
                          ? "border-indigo-500/50 text-indigo-100"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {msg.timestamp}
                      </span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:underline flex items-center gap-1"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex gap-3 max-w-2xl mr-auto">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2">Gemini 3.6 Flash reflecting...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="max-w-4xl mx-auto relative rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 shadow-inner focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <textarea
              id="reflection-input"
              ref={textareaRef}
              rows={3}
              placeholder="Reflect openly... (Press Enter to send, Shift+Enter for new line)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full p-3.5 pr-14 text-xs sm:text-sm bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none"
            />

            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <button
                id="send-reflection-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
                title="Send reflection"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-1">
            <span>Conversations are secured with owner-bound data isolation.</span>
            <span>Gemini 3.6 Flash &bull; Cloud Firestore</span>
          </div>
        </div>
      </main>
    </div>
  );
};

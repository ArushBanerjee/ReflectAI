import React, { useState } from "react";
import {
  Brain,
  Plus,
  Pin,
  Trash2,
  CheckCircle2,
  Sparkles,
  Target,
  Repeat,
  FolderGit2,
  Trophy,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";
import { MemoryItem, MemoryType, UserIdentity } from "../types";

interface MemoriesViewProps {
  memories: MemoryItem[];
  onSaveMemory: (memory: MemoryItem) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  user: UserIdentity;
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  memories,
  onSaveMemory,
  onDeleteMemory,
  user,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<MemoryType>("goal");

  const typeConfig: Record<
    MemoryType,
    { label: string; icon: any; color: string; badgeBg: string }
  > = {
    goal: {
      label: "Goal",
      icon: Target,
      color: "text-emerald-600 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
    },
    habit: {
      label: "Habit",
      icon: Repeat,
      color: "text-indigo-600 dark:text-indigo-400",
      badgeBg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
    },
    project: {
      label: "Project",
      icon: FolderGit2,
      color: "text-sky-600 dark:text-sky-400",
      badgeBg: "bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800",
    },
    achievement: {
      label: "Achievement",
      icon: Trophy,
      color: "text-amber-600 dark:text-amber-400",
      badgeBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
    },
    concern: {
      label: "Concern",
      icon: AlertTriangle,
      color: "text-rose-600 dark:text-rose-400",
      badgeBg: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800",
    },
  };

  const handleToggleActive = async (mem: MemoryItem) => {
    await onSaveMemory({
      ...mem,
      isActive: !mem.isActive,
    });
  };

  const handleTogglePin = async (mem: MemoryItem) => {
    await onSaveMemory({
      ...mem,
      isPinned: !mem.isPinned,
    });
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newMem: MemoryItem = {
      id: `mem_${Date.now()}`,
      userId: user.uid,
      type: newType,
      content: newContent.trim(),
      createdAt: new Date().toISOString(),
      isActive: true,
      isPinned: false,
    };

    await onSaveMemory(newMem);
    setNewContent("");
    setShowAddModal(false);
  };

  const filteredMemories = memories.filter((m) => {
    const matchesFilter = activeFilter === "all" || m.type === activeFilter;
    const matchesSearch =
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sourceEntryTitle && m.sourceEntryTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const activeCount = memories.filter((m) => m.isActive).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              AI Memory System
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Contest Differentiator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Long-term cognitive anchor points automatically extracted from reflections to ground future
            Gemini conversations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
            <Brain className="w-4 h-4" />
            <span>{activeCount} memories actively grounding Gemini</span>
          </div>
          <button
            id="add-memory-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Memory</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          {["all", "goal", "habit", "project", "achievement", "concern"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                activeFilter === f
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {f === "all" ? "All Memories" : `${f}s`}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Memories Grid */}
      {filteredMemories.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <Brain className="w-8 h-8 mx-auto text-indigo-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No memories matched your criteria
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Memories are automatically extracted whenever you analyze a journal entry, or you can manually
            create custom anchor points above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map((mem) => {
            const config = typeConfig[mem.type] || typeConfig.goal;
            const Icon = config.icon;
            return (
              <div
                key={mem.id}
                className={`group relative p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  mem.isActive
                    ? "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 shadow-xs"
                    : "bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-200/50 dark:border-zinc-900 opacity-65"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.badgeBg} ${config.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{config.label}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(mem)}
                        className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                          mem.isPinned ? "text-amber-500" : "text-zinc-400"
                        }`}
                        title={mem.isPinned ? "Unpin Memory" : "Pin Memory"}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        className="p-1 text-zinc-400 hover:text-rose-500 rounded transition-colors"
                        title="Delete Memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {mem.content}
                  </p>

                  {mem.sourceEntryTitle && (
                    <p className="text-[10px] text-zinc-400 truncate">
                      Extracted from: &quot;{mem.sourceEntryTitle}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                  <span className="text-zinc-400">
                    {new Date(mem.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>

                  <button
                    onClick={() => handleToggleActive(mem)}
                    className="flex items-center gap-1 font-medium hover:underline text-zinc-600 dark:text-zinc-300"
                  >
                    {mem.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[11px]">Active Grounding</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-zinc-400" />
                        <span className="text-[11px] text-zinc-400">Paused</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                Add Long-Term Memory
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Memory Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["goal", "habit", "project", "achievement", "concern"] as MemoryType[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`p-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                        newType === t
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-300 font-semibold"
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Memory Statement
                </label>
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. Preparing for Staff Engineer promotion review in Q4..."
                  className="w-full p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Save Memory to Firestore
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

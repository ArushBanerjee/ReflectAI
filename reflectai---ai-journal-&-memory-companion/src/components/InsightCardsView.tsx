import React, { useState } from "react";
import {
  Sparkles,
  Lightbulb,
  Eye,
  ArrowUpRight,
  Search,
  BookOpen,
  Calendar,
} from "lucide-react";
import { JournalEntry } from "../types";

interface InsightCardsViewProps {
  entries: JournalEntry[];
  onOpenEntry: (id: string) => void;
}

export const InsightCardsView: React.FC<InsightCardsViewProps> = ({
  entries,
  onOpenEntry,
}) => {
  const [filterType, setFilterType] = useState<"all" | "insight" | "pattern" | "nextStep">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Flatten all cards from analyzed entries
  const allCards = entries.flatMap((entry) => {
    if (!entry.analysis?.insightCards) return [];
    const dateStr = new Date(entry.createdAt).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return [
      {
        id: `${entry.id}_insight`,
        entryId: entry.id,
        entryTitle: entry.title,
        date: dateStr,
        type: "insight" as const,
        title: "Key Insight",
        content: entry.analysis.insightCards.keyInsight,
        mood: entry.analysis.mood,
      },
      {
        id: `${entry.id}_pattern`,
        entryId: entry.id,
        entryTitle: entry.title,
        date: dateStr,
        type: "pattern" as const,
        title: "Hidden Pattern",
        content: entry.analysis.insightCards.hiddenPattern,
        mood: entry.analysis.mood,
      },
      {
        id: `${entry.id}_nextStep`,
        entryId: entry.id,
        entryTitle: entry.title,
        date: dateStr,
        type: "nextStep" as const,
        title: "Suggested Next Step",
        content: entry.analysis.insightCards.suggestedNextStep,
        mood: entry.analysis.mood,
      },
    ];
  });

  const filteredCards = allCards.filter((card) => {
    const matchesFilter = filterType === "all" || card.type === filterType;
    const matchesSearch =
      card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.entryTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const cardConfig = {
    insight: {
      icon: Lightbulb,
      badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      border: "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400",
    },
    pattern: {
      icon: Eye,
      badge: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      border: "border-indigo-200/80 dark:border-indigo-900/40 hover:border-indigo-400",
    },
    nextStep: {
      icon: ArrowUpRight,
      badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      border: "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400",
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              AI Insight Cards
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Contest Differentiator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Triad analysis generated after reflections: Realizations, Behavioral Patterns, and Actionable Micro-Steps.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search all insights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: `All Cards (${allCards.length})` },
          { id: "insight", label: "Key Insights" },
          { id: "pattern", label: "Hidden Patterns" },
          { id: "nextStep", label: "Suggested Next Steps" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              filterType === f.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <Sparkles className="w-8 h-8 mx-auto text-indigo-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Insight Cards Available
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Analyze a journal reflection to generate Key Insight, Hidden Pattern, and Next Step cards.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const conf = cardConfig[card.type];
            const Icon = conf.icon;
            return (
              <div
                key={card.id}
                onClick={() => onOpenEntry(card.entryId)}
                className={`p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 group ${conf.border}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${conf.badge}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{card.title}</span>
                    </span>

                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {card.date}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {card.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 truncate max-w-[180px]">
                    From: &quot;{card.entryTitle}&quot;
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline flex items-center gap-0.5">
                    Open Entry &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

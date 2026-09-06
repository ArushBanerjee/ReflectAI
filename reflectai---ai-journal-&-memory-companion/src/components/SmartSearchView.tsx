import React, { useState } from "react";
import {
  Search,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Smile,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { JournalEntry, SearchMatchResult } from "../types";

interface SmartSearchViewProps {
  entries: JournalEntry[];
  onOpenEntry: (id: string) => void;
}

export const SmartSearchView: React.FC<SmartSearchViewProps> = ({
  entries,
  onOpenEntry,
}) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchMatchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleQueries = [
    "Show entries where I felt confident and in flow",
    "Find conversations about internships and career growth",
    "Times when I was overwhelmed by fatigue and deadlines",
    "Moments where I celebrated a major breakthrough with gratitude",
    "Reflections on mindfulness and deep work habits",
  ];

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    setErrorMsg(null);
    setHasSearched(true);

    try {
      const response = await fetch("/api/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          entries: entries.map((e) => ({
            id: e.id,
            title: e.title,
            createdAt: e.createdAt,
            mood: e.analysis?.mood,
            content: e.messages.map((m) => m.text).join(" "),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Semantic search query failed.");
      }

      const data = await response.json();
      const rawMatches: Array<{ id: string; score: number; matchReason: string }> =
        data.matches || [];

      // Link match result to actual journal entry
      const enriched: SearchMatchResult[] = rawMatches
        .map((m) => {
          const matchedEntry = entries.find((e) => e.id === m.id);
          if (!matchedEntry) return null;
          return {
            entry: matchedEntry,
            score: m.score,
            matchReason: m.matchReason,
          };
        })
        .filter(Boolean) as SearchMatchResult[];

      setSearchResults(enriched);
    } catch (err: any) {
      console.error("Smart search failed:", err);
      setErrorMsg(err.message || "Could not complete semantic search.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Contest Differentiator &bull; Semantic Search</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Smart Natural Language Search
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
          Query your private reflections using concepts, emotional undertones, or life situations
          instead of rigid keywords.
        </p>
      </div>

      {/* Natural Language Search Input */}
      <div className="relative">
        <div className="flex items-center gap-2 p-2 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 bg-white dark:bg-zinc-900 shadow-md focus-within:border-indigo-500 transition-all">
          <Search className="w-5 h-5 ml-2 text-indigo-500" />
          <input
            id="smart-search-input"
            type="text"
            placeholder="e.g. 'Show entries where I overcame self-doubt' or 'Discussions about internships'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="flex-1 px-2 py-2 text-xs sm:text-sm bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          <button
            id="smart-search-submit-btn"
            onClick={() => handleSearch()}
            disabled={!query.trim() || isSearching}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <span className="text-zinc-400 font-medium flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Try asking:
          </span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-[11px]"
            >
              &quot;{sq}&quot;
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Semantic Matches ({searchResults.length})
            </h2>
            <span className="text-xs text-zinc-400">Scored by Gemini 3.6 Flash</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-400" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No reflections strongly matched this semantic query. Try broadening your phrasing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map(({ entry, score, matchReason }) => {
                const firstUserMsg = entry.messages.find((m) => m.role === "user");
                return (
                  <div
                    key={entry.id}
                    onClick={() => onOpenEntry(entry.id)}
                    className="p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer shadow-xs space-y-3 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {entry.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {score}% Match
                        </span>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* AI Match Explanation */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        Why this matched:{" "}
                      </span>
                      {matchReason}
                    </div>

                    {firstUserMsg && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 italic">
                        &ldquo;{firstUserMsg.text}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      {entry.analysis?.mood && (
                        <span className="flex items-center gap-1">
                          <Smile className="w-3 h-3 text-indigo-500" />
                          Mood: {entry.analysis.mood}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

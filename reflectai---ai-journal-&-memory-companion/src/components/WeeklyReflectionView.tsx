import React, { useState } from "react";
import {
  Calendar,
  Sparkles,
  Trophy,
  AlertTriangle,
  Heart,
  Compass,
  FileText,
  Clock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import Markdown from "react-markdown";
import { WeeklyReflection, JournalEntry, UserIdentity } from "../types";

interface WeeklyReflectionViewProps {
  reflections: WeeklyReflection[];
  entries: JournalEntry[];
  onSaveReflection: (reflection: WeeklyReflection) => Promise<void>;
  user: UserIdentity;
}

export const WeeklyReflectionView: React.FC<WeeklyReflectionViewProps> = ({
  reflections,
  entries,
  onSaveReflection,
  user,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(
    reflections.length > 0 ? reflections[0].id : null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeReflection =
    reflections.find((r) => r.id === selectedReflectionId) || (reflections.length > 0 ? reflections[0] : null);

  const handleGenerateWeekly = async () => {
    if (entries.length === 0) {
      setErrorMsg("You need at least one journal entry to generate a weekly synthesis.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const pastWeekEntries = entries.slice(0, 15).map((e) => ({
        id: e.id,
        title: e.title,
        date: new Date(e.createdAt).toLocaleDateString(),
        mood: e.analysis?.mood || "Reflective",
        stressLevel: e.analysis?.stressLevel || 5,
        productivityScore: e.analysis?.productivityScore || 6,
        content: e.messages.map((m) => `${m.role === "user" ? "Me" : "Gemini"}: ${m.text}`).join("\n"),
      }));

      const response = await fetch("/api/weekly-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: pastWeekEntries,
          dateRange: `${new Date(Date.now() - 7 * 86400000).toLocaleDateString([], { month: "short", day: "numeric" })} - ${new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate reflection.");
      }

      const data = await response.json();
      if (data.reflection) {
        const newRef: WeeklyReflection = {
          id: `ref_${Date.now()}`,
          userId: user.uid,
          dateRange: `${new Date(Date.now() - 7 * 86400000).toLocaleDateString([], { month: "short", day: "numeric" })} - ${new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`,
          createdAt: new Date().toISOString(),
          accomplishments: data.reflection.accomplishments || [],
          recurringChallenges: data.reflection.recurringChallenges || [],
          emotionalPatterns: data.reflection.emotionalPatterns || "",
          recommendations: data.reflection.recommendations || [],
          summaryMarkdown: data.reflection.summaryMarkdown || "",
        };

        await onSaveReflection(newRef);
        setSelectedReflectionId(newRef.id);
      }
    } catch (err: any) {
      console.error("Weekly reflection generation error:", err);
      setErrorMsg(err.message || "Failed to generate reflection.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Weekly Reflection Generator
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Contest Differentiator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gemini synthesizes past reflections into accomplishments, recurring challenges, emotional
            patterns, and actionable weekly recommendations.
          </p>
        </div>

        <button
          id="generate-weekly-btn"
          onClick={handleGenerateWeekly}
          disabled={isGenerating || entries.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Synthesizing Past Entries...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate New Weekly Synthesis</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Reflections Layout: Archive List on Left, Active Reflection on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Archive Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Archived Syntheses ({reflections.length})
          </h2>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {reflections.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                No weekly syntheses yet. Click above to generate your first!
              </div>
            ) : (
              reflections.map((r) => {
                const isSelected = r.id === activeReflection?.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReflectionId(r.id)}
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all text-left space-y-1.5 ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 shadow-xs"
                        : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      <span>{r.dateRange}</span>
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {r.accomplishments.length} wins &bull; {r.recommendations.length} next steps
                    </p>
                    <span className="text-[10px] text-zinc-400">
                      Saved to Firestore on {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Reflection Detail View */}
        <div className="lg:col-span-3 space-y-6">
          {!activeReflection ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-indigo-500" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Weekly Synthesis Ready to Generate
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Generate an overarching review of your goals, victories, emotional patterns, and
                personalized recommendations powered by Gemini 3.6 Flash.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Week of {activeReflection.dateRange}
                  </span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Generated {new Date(activeReflection.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Weekly Reflection &amp; Strategic Review
                </h2>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Accomplishments */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Trophy className="w-4 h-4" />
                    <span>Accomplishments &amp; Milestones</span>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {activeReflection.accomplishments.map((acc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{acc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recurring Challenges */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Recurring Challenges &amp; Friction</span>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {activeReflection.recurringChallenges.map((rc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                        <span>{rc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Emotional Patterns */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
                    <Heart className="w-4 h-4" />
                    <span>Emotional Arc &amp; Equilibrium</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {activeReflection.emotionalPatterns}
                  </p>
                </div>

                {/* Recommendations */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Compass className="w-4 h-4" />
                    <span>Personalized Guidance for Next Week</span>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {activeReflection.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Full Markdown Synthesis */}
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Synthesis Narrative
                </h3>
                <div className="markdown-body text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                  <Markdown>{activeReflection.summaryMarkdown}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

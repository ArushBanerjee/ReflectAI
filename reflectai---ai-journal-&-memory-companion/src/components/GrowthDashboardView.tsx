import React, { useMemo } from "react";
import {
  Activity,
  Flame,
  Award,
  Sparkles,
  Target,
  Repeat,
  CheckCircle2,
  TrendingUp,
  Brain,
  Smile,
  ShieldCheck,
} from "lucide-react";
import { JournalEntry, MemoryItem, WeeklyReflection } from "../types";

interface GrowthDashboardViewProps {
  entries: JournalEntry[];
  memories: MemoryItem[];
  reflections: WeeklyReflection[];
}

export const GrowthDashboardView: React.FC<GrowthDashboardViewProps> = ({
  entries,
  memories,
  reflections,
}) => {
  // Compute analytics
  const analytics = useMemo(() => {
    // 1. Total Words Written
    let totalWords = 0;
    entries.forEach((e) => {
      e.messages.forEach((m) => {
        if (m.role === "user") {
          totalWords += m.text.trim().split(/\s+/).filter(Boolean).length;
        }
      });
    });

    // 2. Day streak calculation
    const dates = Array.from(
      new Set(
        entries.map((e) =>
          new Date(e.createdAt).toISOString().slice(0, 10)
        )
      )
    ).sort().reverse();

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (dates.includes(today) || dates.includes(yesterday)) {
      streak = 1;
      let checkDate = new Date(dates[0]);
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i]);
        const diffDays = Math.round(
          (checkDate.getTime() - prev.getTime()) / (1000 * 3600 * 24)
        );
        if (diffDays === 1) {
          streak++;
          checkDate = prev;
        } else {
          break;
        }
      }
    }

    // 3. Goals & Habits extracted
    const goals = memories.filter((m) => m.type === "goal");
    const habits = memories.filter((m) => m.type === "habit");
    const achievements = memories.filter((m) => m.type === "achievement");

    // 4. Emotional Stability Index (0-100)
    const analyzed = entries.filter((e) => e.analysis);
    let avgStress = 5;
    let avgProd = 6;
    if (analyzed.length > 0) {
      avgStress =
        analyzed.reduce((sum, e) => sum + (e.analysis?.stressLevel || 5), 0) /
        analyzed.length;
      avgProd =
        analyzed.reduce(
          (sum, e) => sum + (e.analysis?.productivityScore || 6),
          0
        ) / analyzed.length;
    }
    // High productivity + low stress = high equilibrium
    const stabilityScore = Math.min(
      100,
      Math.max(20, Math.round(((10 - avgStress) * 5 + avgProd * 5)))
    );

    return {
      totalWords,
      streak: Math.max(streak, entries.length > 0 ? 1 : 0),
      totalEntries: entries.length,
      goalsCount: goals.length,
      habitsCount: habits.length,
      achievementsCount: achievements.length,
      stabilityScore,
      goals,
      habits,
      achievements,
    };
  }, [entries, memories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Personal Growth &amp; Alignment Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Contest Differentiator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Visualizing journaling consistency, emotional stability, and goal realization over time.
          </p>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Reflection Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {analytics.streak}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {analytics.streak === 1 ? "day" : "days"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">Active self-inquiry habit</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Words Externalized</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {analytics.totalWords.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">words</span>
          </div>
          <p className="text-[11px] text-zinc-400">Across all journal interactions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Equilibrium Index</span>
            <Smile className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {analytics.stabilityScore}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">/ 100</span>
          </div>
          <p className="text-[11px] text-zinc-400">Emotional balance &amp; focus</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Tracked Goals &amp; Habits</span>
            <Target className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {analytics.goalsCount + analytics.habitsCount}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">items</span>
          </div>
          <p className="text-[11px] text-zinc-400">In AI Memory System</p>
        </div>
      </div>

      {/* Deep Dive Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Progress */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Active Goals &amp; Horizons
            </h3>
            <span className="text-xs text-zinc-400">{analytics.goals.length} active</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {analytics.goals.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4">No goals captured yet.</p>
            ) : (
              analytics.goals.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1"
                >
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">{g.content}</p>
                  <span className="text-[10px] text-zinc-400">
                    Logged {new Date(g.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Habits Consistency */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-indigo-500" />
              Habit Formations
            </h3>
            <span className="text-xs text-zinc-400">{analytics.habits.length} habits</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {analytics.habits.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4">No habits registered yet.</p>
            ) : (
              analytics.habits.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1"
                >
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">{h.content}</p>
                  <span className="text-[10px] text-zinc-400">
                    Reinforced via Gemini grounding
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Milestone Celebrations */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Recognized Achievements
            </h3>
            <span className="text-xs text-zinc-400">{analytics.achievements.length} wins</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {analytics.achievements.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4">Achievements appear after reflective breakthroughs.</p>
            ) : (
              analytics.achievements.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Milestone</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">{a.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

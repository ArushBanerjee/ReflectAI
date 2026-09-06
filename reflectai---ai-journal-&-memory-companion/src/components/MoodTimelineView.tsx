import React, { useMemo } from "react";
import {
  TrendingUp,
  Activity,
  Smile,
  Zap,
  Calendar,
  AlertCircle,
  BarChart3,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { JournalEntry } from "../types";

interface MoodTimelineViewProps {
  entries: JournalEntry[];
  darkMode: boolean;
  onOpenEntry: (id: string) => void;
}

export const MoodTimelineView: React.FC<MoodTimelineViewProps> = ({
  entries,
  darkMode,
  onOpenEntry,
}) => {
  // Extract entries with analysis
  const analyzedEntries = useMemo(() => {
    return [...entries]
      .filter((e) => Boolean(e.analysis))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [entries]);

  // Timeline series data for Recharts
  const timelineData = useMemo(() => {
    return analyzedEntries.map((e) => {
      const d = new Date(e.createdAt);
      return {
        id: e.id,
        date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        stress: e.analysis?.stressLevel || 5,
        productivity: e.analysis?.productivityScore || 5,
        mood: e.analysis?.mood || "Reflective",
        title: e.title,
      };
    });
  }, [analyzedEntries]);

  // Emotion frequency distribution
  const emotionFrequencies = useMemo(() => {
    const counts: Record<string, number> = {};
    analyzedEntries.forEach((e) => {
      e.analysis?.emotions.forEach((emo) => {
        counts[emo] = (counts[emo] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [analyzedEntries]);

  // Topic frequencies
  const topicFrequencies = useMemo(() => {
    const counts: Record<string, number> = {};
    analyzedEntries.forEach((e) => {
      e.analysis?.keyTopics.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }, [analyzedEntries]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    if (analyzedEntries.length === 0) {
      return { avgStress: 0, avgProductivity: 0, dominantMood: "None", count: 0 };
    }
    const totalStress = analyzedEntries.reduce((sum, e) => sum + (e.analysis?.stressLevel || 0), 0);
    const totalProd = analyzedEntries.reduce((sum, e) => sum + (e.analysis?.productivityScore || 0), 0);
    
    // Mood counts
    const moodCounts: Record<string, number> = {};
    analyzedEntries.forEach((e) => {
      if (e.analysis?.mood) {
        moodCounts[e.analysis.mood] = (moodCounts[e.analysis.mood] || 0) + 1;
      }
    });
    let topMood = "Balanced";
    let maxC = 0;
    for (const [m, c] of Object.entries(moodCounts)) {
      if (c > maxC) {
        maxC = c;
        topMood = m;
      }
    }

    return {
      avgStress: (totalStress / analyzedEntries.length).toFixed(1),
      avgProductivity: (totalProd / analyzedEntries.length).toFixed(1),
      dominantMood: topMood,
      count: analyzedEntries.length,
    };
  }, [analyzedEntries]);

  const emotionColors = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              AI Mood Timeline &amp; Emotional Analytics
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Contest Differentiator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Structured psychological insights extracted by Gemini 3.6 Flash across your journal sessions.
          </p>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Dominant Mood</span>
            <Smile className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {metrics.dominantMood}
          </p>
          <p className="text-[11px] text-zinc-400">Most frequent mental state</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Average Stress</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {metrics.avgStress} <span className="text-xs font-normal text-zinc-400">/ 10</span>
          </p>
          <p className="text-[11px] text-zinc-400">Lower denotes higher serenity</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Productivity Flow</span>
            <Zap className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {metrics.avgProductivity} <span className="text-xs font-normal text-zinc-400">/ 10</span>
          </p>
          <p className="text-[11px] text-zinc-400">Self-reported execution momentum</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Analyzed Sessions</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {metrics.count}
          </p>
          <p className="text-[11px] text-zinc-400">Structured entries in Firestore</p>
        </div>
      </div>

      {analyzedEntries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-indigo-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No Analyzed Reflections Yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Write a reflection in the Journal tab and click &quot;Analyze Mood &amp; Insights&quot; to populate your
            mood arc, stress levels, and emotional spectrum.
          </p>
        </div>
      ) : (
        <>
          {/* Main Trend Chart: Stress vs Productivity */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Emotional Arc &amp; Performance Trend
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Stress Level (1-10) plotted alongside Productivity Score (1-10) over time
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Productivity
                </span>
                <span className="flex items-center gap-1 text-rose-500 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Stress
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={darkMode ? "#27272a" : "#f4f4f5"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={darkMode ? "#71717a" : "#a1a1aa"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    stroke={darkMode ? "#71717a" : "#a1a1aa"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? "#18181b" : "#ffffff",
                      borderColor: darkMode ? "#27272a" : "#e4e4e7",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: darkMode ? "#fafafa" : "#18181b",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="productivity"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#prodGradient)"
                    name="Productivity (1-10)"
                  />
                  <Area
                    type="monotone"
                    dataKey="stress"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#stressGradient)"
                    name="Stress (1-10)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Charts: Emotions & Topics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emotion Breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Nuanced Emotion Spectrum
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Frequency of extracted emotional states across reflections
              </p>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emotionFrequencies} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke={darkMode ? "#a1a1aa" : "#71717a"}
                      fontSize={11}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? "#18181b" : "#ffffff",
                        borderColor: darkMode ? "#27272a" : "#e4e4e7",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {emotionFrequencies.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={emotionColors[index % emotionColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Topic Frequency Cloud */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                Key Recurring Topics
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Core themes synthesized from journal discussions
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {topicFrequencies.map((tf) => (
                  <span
                    key={tf.topic}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60"
                  >
                    <span>{tf.topic}</span>
                    <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                      {tf.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

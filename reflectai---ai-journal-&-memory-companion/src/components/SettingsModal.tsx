import React, { useState } from "react";
import {
  X,
  Database,
  Download,
  Upload,
  RefreshCw,
  Check,
  ShieldCheck,
  Key,
  FolderDown,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { isFirebaseConfigured, getFirebaseConfig } from "../lib/firebase";
import { JournalEntry, MemoryItem, WeeklyReflection, UserIdentity } from "../types";
import { createStarterEntries } from "../lib/sampleData";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserIdentity;
  entries: JournalEntry[];
  memories: MemoryItem[];
  reflections: WeeklyReflection[];
  onReloadData: (entries: JournalEntry[], memories: MemoryItem[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  entries,
  memories,
  reflections,
  onReloadData,
}) => {
  const currentConfig = getFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || "");
  const [projectId, setProjectId] = useState(currentConfig.projectId || "");
  const [authDomain, setAuthDomain] = useState(currentConfig.authDomain || "");
  const [appId, setAppId] = useState(currentConfig.appId || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cfg = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      appId: appId.trim(),
    };
    localStorage.setItem("reflectai_firebase_config", JSON.stringify(cfg));
    setSavedSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleExportJSON = () => {
    const exportData = {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
      exportedAt: new Date().toISOString(),
      entries,
      memories,
      reflections,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reflectai_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    let md = `# ReflectAI Journal Export\n**User:** ${user.displayName || user.email}\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n`;
    entries.forEach((e) => {
      md += `## ${e.title}\n*Date: ${new Date(e.createdAt).toLocaleString()}*\n`;
      if (e.analysis?.mood) {
        md += `*Mood: ${e.analysis.mood} | Stress: ${e.analysis.stressLevel}/10 | Productivity: ${e.analysis.productivityScore}/10*\n`;
      }
      md += `\n`;
      e.messages.forEach((m) => {
        md += `**${m.role === "user" ? "You" : "ReflectAI"}:**\n${m.text}\n\n`;
      });
      md += `---\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reflectai_journal_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    if (confirm("Load starter reflections and memories? (This will add sample entries to your current view)")) {
      const sample = createStarterEntries(user.uid);
      onReloadData(sample.entries, sample.memories);
      onClose();
    }
  };

  const isConnected = isFirebaseConfigured();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Settings &amp; Database Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Database Status Pill */}
        <div className="p-4 rounded-xl border space-y-2 bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Storage Isolation Status
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isConnected
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isConnected ? "Cloud Firestore Connected" : "Local User-Isolated Store"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isConnected
              ? "Reflections are isolated to `/users/" + user.uid + "/...` with zero-insecure-defaults Firestore security rules."
              : "Operating in durable browser-cached user-isolated partition. You can connect a custom Firebase project below anytime."}
          </p>
        </div>

        {/* Firebase Custom Credentials Form */}
        <form onSubmit={handleSaveConfig} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Firebase Web Credentials
            </h3>
            {savedSuccess && (
              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved! Reloading...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                API Key (VITE_FIREBASE_API_KEY)
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Project ID (VITE_FIREBASE_PROJECT_ID)
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-project-id"
                className="w-full p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Auth Domain
              </label>
              <input
                type="text"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="project.firebaseapp.com"
                className="w-full p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                App ID
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:12345:web:abcdef"
                className="w-full p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Update Firebase Configuration
            </button>
          </div>
        </form>

        {/* Data Backup & Starter Pack */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <FolderDown className="w-3.5 h-3.5" /> Data Backup &amp; Samples
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-500" />
              <span>Export Markdown</span>
            </button>

            <button
              onClick={handleLoadSample}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Load Starter Pack</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

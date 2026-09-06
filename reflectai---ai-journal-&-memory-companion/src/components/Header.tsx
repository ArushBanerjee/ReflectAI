import React from "react";
import {
  BookOpen,
  TrendingUp,
  Brain,
  Calendar,
  Sparkles,
  Search,
  Activity,
  Sun,
  Moon,
  LogOut,
  Database,
  SlidersHorizontal,
  User as UserIcon,
} from "lucide-react";
import { ActiveTab, UserIdentity } from "../types";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: UserIdentity;
  onSignOut: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  isFirestoreConnected: boolean;
  onOpenSettings: () => void;
  entryCount: number;
  memoryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onSignOut,
  darkMode,
  setDarkMode,
  isFirestoreConnected,
  onOpenSettings,
  entryCount,
  memoryCount,
}) => {
  const tabs = [
    { id: "journal" as ActiveTab, label: "Journal", icon: BookOpen, count: entryCount },
    { id: "timeline" as ActiveTab, label: "Mood Timeline", icon: TrendingUp },
    { id: "memories" as ActiveTab, label: "AI Memory", icon: Brain, count: memoryCount },
    { id: "weekly" as ActiveTab, label: "Weekly Reflection", icon: Calendar },
    { id: "insights" as any, label: "Insight Cards", icon: Sparkles },
    { id: "search" as ActiveTab, label: "Smart Search", icon: Search },
    { id: "growth" as ActiveTab, label: "Growth", icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md bg-white/85 dark:bg-zinc-950/85 border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("journal")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
                  ReflectAI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                  Gemini 3.6
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Reflective Journal &amp; Long-Term Memory Companion
              </p>
            </div>
          </div>

          {/* User Controls & Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud Firestore Status */}
            <button
              id="firestore-status-btn"
              onClick={onOpenSettings}
              title={isFirestoreConnected ? "Connected to Cloud Firestore" : "Running in User-Isolated Local Store"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                isFirestoreConnected
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isFirestoreConnected ? "Firestore Synced" : "Secure Store"}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${isFirestoreConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
            </button>

            {/* Dark / Light Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            {/* Settings Trigger */}
            <button
              id="settings-trigger-btn"
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Settings &amp; Backup"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* User Avatar & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-medium text-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                    {user.displayName || "Author"}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                    {user.email || "Private Session"}
                  </p>
                </div>
              </div>
              <button
                id="sign-out-btn"
                onClick={onSignOut}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Scrollable on small screens) */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === (tab.id as any);
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : ""}`} />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? "bg-indigo-700/80 text-white"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { LandingAuth } from "./components/LandingAuth";
import { JournalView } from "./components/JournalView";
import { MoodTimelineView } from "./components/MoodTimelineView";
import { MemoriesView } from "./components/MemoriesView";
import { WeeklyReflectionView } from "./components/WeeklyReflectionView";
import { InsightCardsView } from "./components/InsightCardsView";
import { SmartSearchView } from "./components/SmartSearchView";
import { GrowthDashboardView } from "./components/GrowthDashboardView";
import { SettingsModal } from "./components/SettingsModal";
import {
  JournalEntry,
  MemoryItem,
  WeeklyReflection,
  UserIdentity,
  ActiveTab,
} from "./types";
import {
  isFirebaseConfigured,
  fetchJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  fetchMemories,
  saveMemoryItem,
  deleteMemoryItem,
  fetchWeeklyReflections,
  saveWeeklyReflection,
  signOutUser,
  getFirebaseServices,
} from "./lib/firebase";
import { createStarterEntries } from "./lib/sampleData";

export default function App() {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("journal");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem("reflectai_theme") === "dark" ||
      (!("reflectai_theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [reflections, setReflections] = useState<WeeklyReflection[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Sync Dark Mode with DOM
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("reflectai_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("reflectai_theme", "light");
    }
  }, [darkMode]);

  // Restore existing session on mount
  useEffect(() => {
    const saved = localStorage.getItem("reflectai_active_session");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
      } catch {
        // ignore
      }
    }

    // Also check Firebase Auth state
    const { auth } = getFirebaseServices();
    if (auth) {
      const unsub = auth.onAuthStateChanged((fbUser) => {
        if (fbUser) {
          const authUser: UserIdentity = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Author",
            photoURL: fbUser.photoURL,
            isDemo: false,
          };
          setUser(authUser);
          localStorage.setItem("reflectai_active_session", JSON.stringify(authUser));
        }
      });
      return () => unsub();
    }
  }, []);

  // Load user data once authenticated
  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [fetchedEntries, fetchedMemories, fetchedReflections] = await Promise.all([
        fetchJournalEntries(userId),
        fetchMemories(userId),
        fetchWeeklyReflections(userId),
      ]);

      if (fetchedEntries.length === 0 && fetchedMemories.length === 0) {
        // First-time user: seed with thoughtful starter pack
        const seed = createStarterEntries(userId);
        setEntries(seed.entries);
        setMemories(seed.memories);
        setActiveEntryId(seed.entries[0].id);

        // Persist starter entries so they remain in their isolated store
        await Promise.all([
          ...seed.entries.map((e) => saveJournalEntry(e)),
          ...seed.memories.map((m) => saveMemoryItem(m)),
        ]);
      } else {
        setEntries(fetchedEntries);
        setMemories(fetchedMemories);
        setReflections(fetchedReflections);
        if (fetchedEntries.length > 0 && !activeEntryId) {
          setActiveEntryId(fetchedEntries[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setIsDataLoaded(true);
    }
  }, [activeEntryId]);

  useEffect(() => {
    if (user) {
      loadUserData(user.uid);
    }
  }, [user, loadUserData]);

  const handleAuthenticated = (authenticatedUser: UserIdentity) => {
    setUser(authenticatedUser);
    localStorage.setItem("reflectai_active_session", JSON.stringify(authenticatedUser));
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setEntries([]);
    setMemories([]);
    setReflections([]);
    setActiveEntryId(null);
    setIsDataLoaded(false);
  };

  // Entry CRUD handlers
  const handleSaveEntry = async (entry: JournalEntry) => {
    // Optimistic UI state update
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.id === entry.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = entry;
        return next;
      }
      return [entry, ...prev];
    });

    // Check if new memories extracted in analysis
    if (entry.analysis?.insightCards) {
      // Automatic memory extraction sync if available in payload
    }

    // Persist
    await saveJournalEntry(entry);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    if (activeEntryId === entryId) {
      const remaining = entries.filter((e) => e.id !== entryId);
      setActiveEntryId(remaining.length > 0 ? remaining[0].id : null);
    }
    await deleteJournalEntry(user.uid, entryId);
  };

  const handleNewEntry = () => {
    setActiveEntryId(null);
    setActiveTab("journal");
  };

  // Memory CRUD handlers
  const handleSaveMemory = async (memory: MemoryItem) => {
    setMemories((prev) => {
      const index = prev.findIndex((m) => m.id === memory.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = memory;
        return next;
      }
      return [memory, ...prev];
    });
    await saveMemoryItem(memory);
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!user) return;
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    await deleteMemoryItem(user.uid, memoryId);
  };

  // Weekly Reflection Handler
  const handleSaveWeeklyReflection = async (ref: WeeklyReflection) => {
    setReflections((prev) => [ref, ...prev]);
    await saveWeeklyReflection(ref);
  };

  // Open entry from other views (search, insight card, timeline)
  const handleOpenEntryFromAnywhere = (entryId: string) => {
    setActiveEntryId(entryId);
    setActiveTab("journal");
  };

  if (!user) {
    return (
      <LandingAuth
        onAuthenticated={handleAuthenticated}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />
    );
  }

  const isConnected = isFirebaseConfigured();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSignOut={handleSignOut}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isFirestoreConnected={isConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        entryCount={entries.length}
        memoryCount={memories.length}
      />

      <div className="flex-1">
        {activeTab === "journal" && (
          <JournalView
            entries={entries}
            activeEntryId={activeEntryId}
            onSelectEntry={(id) => setActiveEntryId(id)}
            onNewEntry={handleNewEntry}
            onSaveEntry={handleSaveEntry}
            onDeleteEntry={handleDeleteEntry}
            activeMemories={memories}
            user={user}
          />
        )}

        {activeTab === "timeline" && (
          <MoodTimelineView
            entries={entries}
            darkMode={darkMode}
            onOpenEntry={handleOpenEntryFromAnywhere}
          />
        )}

        {activeTab === "memories" && (
          <MemoriesView
            memories={memories}
            onSaveMemory={handleSaveMemory}
            onDeleteMemory={handleDeleteMemory}
            user={user}
          />
        )}

        {activeTab === "weekly" && (
          <WeeklyReflectionView
            reflections={reflections}
            entries={entries}
            onSaveReflection={handleSaveWeeklyReflection}
            user={user}
          />
        )}

        {activeTab === ("insights" as any) && (
          <InsightCardsView
            entries={entries}
            onOpenEntry={handleOpenEntryFromAnywhere}
          />
        )}

        {activeTab === "search" && (
          <SmartSearchView
            entries={entries}
            onOpenEntry={handleOpenEntryFromAnywhere}
          />
        )}

        {activeTab === "growth" && (
          <GrowthDashboardView
            entries={entries}
            memories={memories}
            reflections={reflections}
          />
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        entries={entries}
        memories={memories}
        reflections={reflections}
        onReloadData={(newEntries, newMemories) => {
          setEntries(newEntries);
          setMemories(newMemories);
          if (newEntries.length > 0) setActiveEntryId(newEntries[0].id);
        }}
      />
    </div>
  );
}

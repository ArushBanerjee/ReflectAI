import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Database,
  Brain,
  TrendingUp,
  Search,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Sun,
  Moon,
} from "lucide-react";
import { signInWithGoogle, signInAnonymouslyUser } from "../lib/firebase";
import { UserIdentity } from "../types";

interface LandingAuthProps {
  onAuthenticated: (user: UserIdentity) => void;
  defaultEmail?: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LandingAuth: React.FC<LandingAuthProps> = ({
  onAuthenticated,
  defaultEmail = "arush.banerjee@iitgn.ac.in",
  darkMode = false,
  onToggleDarkMode,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      onAuthenticated(user);
    } catch (err: any) {
      console.warn("Google Sign-In Popup failed or unconfigured:", err);
      setAuthError(
        err?.message || "Google Sign-In could not complete. You can sign in using Quick Access below."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAccess = async (email: string, name: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      try {
        const anonUser = await signInAnonymouslyUser();
        onAuthenticated({
          ...anonUser,
          email,
          displayName: name,
        });
        return;
      } catch (anonErr) {
        console.warn("Anonymous Firebase sign in skipped/not enabled, using local profile:", anonErr);
      }

      const user: UserIdentity = {
        uid: `usr_${btoa(email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
        email,
        displayName: name,
        photoURL: null,
        isDemo: true,
      };
      onAuthenticated(user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Top Bar for Landing Theme Toggle */}
      {onToggleDarkMode && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <button
            id="landing-theme-toggle-btn"
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs flex items-center gap-2 text-xs font-medium"
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-zinc-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto w-full space-y-12">
        {/* Brand Hero */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-white/20">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
            <span>Powered by Gemini 3.6 Flash &amp; Cloud Firestore</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            ReflectAI
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
            An authenticated reflective journaling sanctuary. Converse multi-turn with Gemini,
            track emotional arcs, extract long-term memories, and discover cognitive patterns.
          </p>
        </div>

        {/* Authentication Card */}
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900/90 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sign In to Your Sanctuary
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your journals and memories are cryptographically isolated to your unique user account.
            </p>
          </div>

          {authError && (
            <div className="p-3 text-xs rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              {authError}
            </div>
          )}

          <div className="space-y-3">
            {/* Primary Google Login */}
            <button
              id="google-signin-btn"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isLoading ? "Authenticating..." : "Continue with Google Sign-In"}</span>
            </button>

            {/* Quick Access for Session Verification */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-medium">
                  Direct Verification
                </span>
              </div>
            </div>

            <button
              id="quick-access-btn"
              onClick={() => handleQuickAccess(defaultEmail, "Arush Banerjee")}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <div className="text-left">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Sign in as {defaultEmail.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{defaultEmail}</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <button
              id="guest-access-btn"
              onClick={() => handleQuickAccess("guest.reflective@reflectai.internal", "Mindful Guest")}
              className="w-full text-center py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              Or enter as a Private Sandbox Guest &rarr;
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Zero Password Storage
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              User Isolation
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI Memory System
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Automatically captures goals, habits, projects, and achievements to contextually ground
              future conversations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Mood Timeline &amp; Analytics
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Extracts stress levels, productivity scores, and emotional spectrums visualized via
              interactive charts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Semantic Natural Search
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Search by feeling or theme (e.g. &quot;when I felt confident&quot;) using Gemini semantic
              matching.
            </p>
          </div>
        </div>

        {/* Security & Threat Countermeasures Table */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Production Directives &amp; Security Countermeasures
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <th className="py-2 pr-4 font-semibold">Threat Zone</th>
                  <th className="py-2 pr-4 font-semibold">Security Invariant</th>
                  <th className="py-2 font-semibold">Implementation Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                <tr>
                  <td className="py-2 pr-4 font-medium">Input Surfaces</td>
                  <td className="py-2 pr-4">Schema validation &amp; defensive truncation</td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">OWASP A03 / LLM02</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Memory &amp; State</td>
                  <td className="py-2 pr-4">Owner-bound Firestore paths (<code className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">request.auth.uid == userId</code>)</td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">Zero Insecure Defaults</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Model Resilience</td>
                  <td className="py-2 pr-4">Resilient fallback ladder with error recovery</td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">Gemini 3.6 Flash &rarr; Flash-Lite</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Secret Management</td>
                  <td className="py-2 pr-4">Zero client key exposure; server-side only</td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">Secret Manager Hygiene</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

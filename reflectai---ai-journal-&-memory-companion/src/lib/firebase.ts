import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { JournalEntry, MemoryItem, WeeklyReflection, UserIdentity } from "../types";

// Clean payload utility: Deeply strip undefined values to ensure zero-crash Firestore writes
export function cleanPayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanPayload(item)) as any;
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanPayload(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// Retrieve Firebase credentials from environment or localStorage overrides
export function getFirebaseConfig() {
  const localSaved = localStorage.getItem("reflectai_firebase_config");
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  const env = (import.meta as any).env || {};
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || "",
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: ReturnType<typeof getAuth> | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    return { app: null, auth: null, db: null };
  }

  try {
    if (!cachedApp) {
      const config = getFirebaseConfig();
      cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
      cachedAuth = getAuth(cachedApp);
      cachedDb = getFirestore(cachedApp);
    }
    return { app: cachedApp, auth: cachedAuth, db: cachedDb };
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
    return { app: null, auth: null, db: null };
  }
}

// Storage abstraction that seamlessly writes to Firestore when configured,
// and maintains strict user isolation in durable local storage as a fallback.

const LOCAL_STORAGE_PREFIX = "reflectai_user_data_";

function getLocalStoreKey(userId: string, collectionName: string): string {
  return `${LOCAL_STORAGE_PREFIX}${userId}_${collectionName}`;
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const sanitized = cleanPayload(entry);
  const { db } = getFirebaseServices();

  // 1. Always sync to user-isolated local cache for instant zero-latency recovery
  const localKey = getLocalStoreKey(entry.userId, "entries");
  try {
    const existingRaw = localStorage.getItem(localKey);
    const existing: JournalEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
    const index = existing.findIndex((e) => e.id === entry.id);
    if (index >= 0) {
      existing[index] = sanitized;
    } else {
      existing.unshift(sanitized);
    }
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (err) {
    console.error("Failed to write to local storage cache:", err);
  }

  // 2. Persist to Firestore if configured: path /users/{userId}/entries/{entryId}
  if (db) {
    try {
      const entryRef = doc(db, "users", entry.userId, "entries", entry.id);
      await setDoc(entryRef, sanitized, { merge: true });
    } catch (dbErr) {
      console.error("Firestore saveJournalEntry error:", dbErr);
      throw new Error(`Firestore sync failed: ${(dbErr as any)?.message || "Unknown error"}`);
    }
  }
}

export async function fetchJournalEntries(userId: string): Promise<JournalEntry[]> {
  const { db } = getFirebaseServices();

  if (db) {
    try {
      const entriesRef = collection(db, "users", userId, "entries");
      const q = query(entriesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      if (entries.length > 0) {
        // Sync to local cache
        localStorage.setItem(getLocalStoreKey(userId, "entries"), JSON.stringify(entries));
        return entries;
      }
    } catch (err) {
      console.warn("Firestore fetchJournalEntries fallback to local:", err);
    }
  }

  // Fallback to local cache
  const localKey = getLocalStoreKey(userId, "entries");
  const raw = localStorage.getItem(localKey);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  const { db } = getFirebaseServices();
  if (db) {
    try {
      await deleteDoc(doc(db, "users", userId, "entries", entryId));
    } catch (err) {
      console.error("Firestore delete error:", err);
    }
  }

  const localKey = getLocalStoreKey(userId, "entries");
  const raw = localStorage.getItem(localKey);
  if (raw) {
    const existing: JournalEntry[] = JSON.parse(raw);
    const filtered = existing.filter((e) => e.id !== entryId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  }
}

// Long-Term Memories Storage: /users/{userId}/memories/{memoryId}
export async function saveMemoryItem(memory: MemoryItem): Promise<void> {
  const sanitized = cleanPayload(memory);
  const { db } = getFirebaseServices();

  const localKey = getLocalStoreKey(memory.userId, "memories");
  try {
    const raw = localStorage.getItem(localKey);
    const existing: MemoryItem[] = raw ? JSON.parse(raw) : [];
    const index = existing.findIndex((m) => m.id === memory.id);
    if (index >= 0) {
      existing[index] = sanitized;
    } else {
      existing.unshift(sanitized);
    }
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (err) {
    console.error("Local storage error in saveMemoryItem:", err);
  }

  if (db) {
    try {
      const memRef = doc(db, "users", memory.userId, "memories", memory.id);
      await setDoc(memRef, sanitized, { merge: true });
    } catch (err) {
      console.error("Firestore saveMemoryItem error:", err);
      throw err;
    }
  }
}

export async function fetchMemories(userId: string): Promise<MemoryItem[]> {
  const { db } = getFirebaseServices();
  if (db) {
    try {
      const memRef = collection(db, "users", userId, "memories");
      const q = query(memRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: MemoryItem[] = [];
      snapshot.forEach((d) => list.push(d.data() as MemoryItem));
      if (list.length > 0) {
        localStorage.setItem(getLocalStoreKey(userId, "memories"), JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn("Firestore fetchMemories fallback to local:", err);
    }
  }

  const localKey = getLocalStoreKey(userId, "memories");
  const raw = localStorage.getItem(localKey);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteMemoryItem(userId: string, memoryId: string): Promise<void> {
  const { db } = getFirebaseServices();
  if (db) {
    try {
      await deleteDoc(doc(db, "users", userId, "memories", memoryId));
    } catch (err) {
      console.error("Firestore delete memory error:", err);
    }
  }

  const localKey = getLocalStoreKey(userId, "memories");
  const raw = localStorage.getItem(localKey);
  if (raw) {
    const existing: MemoryItem[] = JSON.parse(raw);
    localStorage.setItem(localKey, JSON.stringify(existing.filter((m) => m.id !== memoryId)));
  }
}

// Weekly Reflections: /users/{userId}/reflections/{reflectionId}
export async function saveWeeklyReflection(reflection: WeeklyReflection): Promise<void> {
  const sanitized = cleanPayload(reflection);
  const { db } = getFirebaseServices();

  const localKey = getLocalStoreKey(reflection.userId, "reflections");
  try {
    const raw = localStorage.getItem(localKey);
    const existing: WeeklyReflection[] = raw ? JSON.parse(raw) : [];
    const index = existing.findIndex((r) => r.id === reflection.id);
    if (index >= 0) {
      existing[index] = sanitized;
    } else {
      existing.unshift(sanitized);
    }
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (err) {
    console.error("Local storage error in saveWeeklyReflection:", err);
  }

  if (db) {
    try {
      const refDoc = doc(db, "users", reflection.userId, "reflections", reflection.id);
      await setDoc(refDoc, sanitized, { merge: true });
    } catch (err) {
      console.error("Firestore saveWeeklyReflection error:", err);
      throw err;
    }
  }
}

export async function fetchWeeklyReflections(userId: string): Promise<WeeklyReflection[]> {
  const { db } = getFirebaseServices();
  if (db) {
    try {
      const coll = collection(db, "users", userId, "reflections");
      const q = query(coll, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: WeeklyReflection[] = [];
      snapshot.forEach((d) => list.push(d.data() as WeeklyReflection));
      if (list.length > 0) {
        localStorage.setItem(getLocalStoreKey(userId, "reflections"), JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn("Firestore fetchWeeklyReflections fallback to local:", err);
    }
  }

  const localKey = getLocalStoreKey(userId, "reflections");
  const raw = localStorage.getItem(localKey);
  return raw ? JSON.parse(raw) : [];
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<UserIdentity> {
  const { auth } = getFirebaseServices();
  if (!auth) {
    throw new Error("Firebase Auth is not configured with valid API keys. You can use Demo Sign In or configure credentials in Settings.");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const u = result.user;

  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || u.email?.split("@")[0] || "Reflective Thinker",
    photoURL: u.photoURL,
    isDemo: false,
  };
}

export async function signOutUser(): Promise<void> {
  const { auth } = getFirebaseServices();
  if (auth) {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("Firebase sign out error:", err);
    }
  }
  localStorage.removeItem("reflectai_active_session");
}

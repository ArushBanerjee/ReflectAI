import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
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
  getDocFromServer,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { JournalEntry, MemoryItem, WeeklyReflection, UserIdentity } from "../types";

// Standard Firestore Operation Types for audit and error tracking
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const { auth } = getFirebaseServices();
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId || null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

// Storage abstraction that seamlessly writes to Firestore under /users/{auth.uid}/...
// and maintains strict user isolation in durable local storage as a zero-latency fallback.

const LOCAL_STORAGE_PREFIX = "reflectai_user_data_";

function getLocalStoreKey(userId: string, collectionName: string): string {
  return `${LOCAL_STORAGE_PREFIX}${userId}_${collectionName}`;
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const { auth, db } = getFirebaseServices();
  // Ensure the effective UID is strictly bound to the authenticated user UID if present
  const authUid = auth?.currentUser?.uid || entry.userId;
  const entryToSave: JournalEntry = {
    ...entry,
    userId: authUid,
  };
  const sanitized = cleanPayload(entryToSave);

  // 1. Always sync to user-isolated local cache for instant zero-latency recovery
  const localKey = getLocalStoreKey(authUid, "entries");
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

  // 2. Persist to Firestore: STRICTLY /users/{auth.uid}/entries/{entryId}
  if (db && auth?.currentUser) {
    const path = `users/${authUid}/entries/${entry.id}`;
    try {
      const entryRef = doc(db, "users", authUid, "entries", entry.id);
      await setDoc(entryRef, sanitized, { merge: true });
    } catch (dbErr) {
      handleFirestoreError(dbErr, OperationType.WRITE, path);
    }
  }
}

export async function fetchJournalEntries(userId: string): Promise<JournalEntry[]> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || userId;
  const path = `users/${authUid}/entries`;

  // Only query Firestore if an authenticated user session is active
  if (db && auth?.currentUser) {
    try {
      const entriesRef = collection(db, "users", authUid, "entries");
      const q = query(entriesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      if (entries.length > 0) {
        // Sync to local cache
        localStorage.setItem(getLocalStoreKey(authUid, "entries"), JSON.stringify(entries));
        return entries;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  // Fallback to local cache
  const localKey = getLocalStoreKey(authUid, "entries");
  const raw = localStorage.getItem(localKey);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || userId;
  const path = `users/${authUid}/entries/${entryId}`;

  if (db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, "users", authUid, "entries", entryId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  const localKey = getLocalStoreKey(authUid, "entries");
  const raw = localStorage.getItem(localKey);
  if (raw) {
    const existing: JournalEntry[] = JSON.parse(raw);
    const filtered = existing.filter((e) => e.id !== entryId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  }
}

// Long-Term Memories Storage: /users/{auth.uid}/memories/{memoryId}
export async function saveMemoryItem(memory: MemoryItem): Promise<void> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || memory.userId;
  const memoryToSave: MemoryItem = {
    ...memory,
    userId: authUid,
  };
  const sanitized = cleanPayload(memoryToSave);

  const localKey = getLocalStoreKey(authUid, "memories");
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

  if (db && auth?.currentUser) {
    const path = `users/${authUid}/memories/${memory.id}`;
    try {
      const memRef = doc(db, "users", authUid, "memories", memory.id);
      await setDoc(memRef, sanitized, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

export async function fetchMemories(userId: string): Promise<MemoryItem[]> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || userId;
  const path = `users/${authUid}/memories`;

  if (db && auth?.currentUser) {
    try {
      const memRef = collection(db, "users", authUid, "memories");
      const q = query(memRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: MemoryItem[] = [];
      snapshot.forEach((d) => list.push(d.data() as MemoryItem));
      if (list.length > 0) {
        localStorage.setItem(getLocalStoreKey(authUid, "memories"), JSON.stringify(list));
        return list;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  const localKey = getLocalStoreKey(authUid, "memories");
  const raw = localStorage.getItem(localKey);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteMemoryItem(userId: string, memoryId: string): Promise<void> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || userId;
  const path = `users/${authUid}/memories/${memoryId}`;

  if (db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, "users", authUid, "memories", memoryId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  const localKey = getLocalStoreKey(authUid, "memories");
  const raw = localStorage.getItem(localKey);
  if (raw) {
    const existing: MemoryItem[] = JSON.parse(raw);
    localStorage.setItem(localKey, JSON.stringify(existing.filter((m) => m.id !== memoryId)));
  }
}

// Weekly Reflections: /users/{auth.uid}/reflections/{reflectionId}
export async function saveWeeklyReflection(reflection: WeeklyReflection): Promise<void> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || reflection.userId;
  const reflectionToSave: WeeklyReflection = {
    ...reflection,
    userId: authUid,
  };
  const sanitized = cleanPayload(reflectionToSave);

  const localKey = getLocalStoreKey(authUid, "reflections");
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

  if (db && auth?.currentUser) {
    const path = `users/${authUid}/reflections/${reflection.id}`;
    try {
      const refDoc = doc(db, "users", authUid, "reflections", reflection.id);
      await setDoc(refDoc, sanitized, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

export async function fetchWeeklyReflections(userId: string): Promise<WeeklyReflection[]> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || userId;
  const path = `users/${authUid}/reflections`;

  if (db && auth?.currentUser) {
    try {
      const coll = collection(db, "users", authUid, "reflections");
      const q = query(coll, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: WeeklyReflection[] = [];
      snapshot.forEach((d) => list.push(d.data() as WeeklyReflection));
      if (list.length > 0) {
        localStorage.setItem(getLocalStoreKey(authUid, "reflections"), JSON.stringify(list));
        return list;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }

  const localKey = getLocalStoreKey(authUid, "reflections");
  const raw = localStorage.getItem(localKey);
  return raw ? JSON.parse(raw) : [];
}

// User Interactions Audit Log: /users/{auth.uid}/interactions/{interactionId}
export async function saveUserInteraction(
  userId: string,
  interactionType: string,
  metadata?: Record<string, any>
): Promise<void> {
  const { auth, db } = getFirebaseServices();
  const authUid = auth?.currentUser?.uid || userId;
  const interactionId = `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `users/${authUid}/interactions/${interactionId}`;

  const payload = cleanPayload({
    id: interactionId,
    userId: authUid,
    interactionType,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  });

  if (db && auth?.currentUser) {
    try {
      await setDoc(doc(db, "users", authUid, "interactions", interactionId), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }
}

// Connection validation helper: strictly verifies connectivity under /users/{auth.uid}/interactions/ping
export async function validateFirestoreConnection(): Promise<boolean> {
  const { db, auth } = getFirebaseServices();
  if (!db || !auth?.currentUser) return false;
  try {
    const testDoc = doc(db, "users", auth.currentUser.uid, "interactions", "ping");
    await getDocFromServer(testDoc);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline. Verify network and configuration.");
    }
    return false;
  }
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<UserIdentity> {
  const { auth } = getFirebaseServices();
  if (!auth) {
    throw new Error(
      "Firebase Auth is not configured with valid API keys. You can use Demo Sign In or configure credentials in Settings."
    );
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

export async function signInAnonymouslyUser(): Promise<UserIdentity> {
  const { auth } = getFirebaseServices();
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }
  const result = await signInAnonymously(auth);
  const u = result.user;
  return {
    uid: u.uid,
    email: u.email || "guest@reflectai.local",
    displayName: "Guest User",
    photoURL: null,
    isDemo: true,
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


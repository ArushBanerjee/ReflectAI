export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface InsightCards {
  keyInsight: string;
  hiddenPattern: string;
  suggestedNextStep: string;
}

export interface EntryAnalysis {
  mood: string;
  emotions: string[];
  stressLevel: number; // 1 - 10
  productivityScore: number; // 1 - 10
  keyTopics: string[];
  insightCards: InsightCards;
  analyzedAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  analysis?: EntryAnalysis;
  groundedMemoryCount?: number;
}

export type MemoryType = 'goal' | 'habit' | 'project' | 'achievement' | 'concern';

export interface MemoryItem {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  sourceEntryId?: string;
  sourceEntryTitle?: string;
  createdAt: string;
  isActive: boolean;
  isPinned?: boolean;
}

export interface WeeklyReflection {
  id: string;
  userId: string;
  dateRange: string;
  createdAt: string;
  accomplishments: string[];
  recurringChallenges: string[];
  emotionalPatterns: string;
  recommendations: string[];
  summaryMarkdown: string;
}

export interface UserIdentity {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo?: boolean;
}

export interface SearchMatchResult {
  entry: JournalEntry;
  score: number;
  matchReason: string;
}

export type ActiveTab = 'journal' | 'timeline' | 'memories' | 'weekly' | 'search' | 'growth';

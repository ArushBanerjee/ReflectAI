import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Lazy-initialized Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Helper: Standard resilient generation with error recovery matrix
async function generateContentWithFallback(
  promptOptions: {
    contents: any;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
  }
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const config: any = {};
      if (promptOptions.systemInstruction) {
        config.systemInstruction = promptOptions.systemInstruction;
      }
      if (promptOptions.responseMimeType) {
        config.responseMimeType = promptOptions.responseMimeType;
      }
      if (promptOptions.responseSchema) {
        config.responseSchema = promptOptions.responseSchema;
      }
      if (typeof promptOptions.temperature === "number") {
        config.temperature = promptOptions.temperature;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptOptions.contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const responseText = response.text || "";
      return { text: responseText, modelUsed: modelName };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
      // Recoverable error status codes or network/quota failures: try next model in ladder
      const errMsg = String(err?.message || "").toLowerCase();
      const status = err?.status || err?.statusCode || 0;
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        errMsg.includes("quota") ||
        errMsg.includes("resource_exhausted") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("overloaded") ||
        errMsg.includes("not found");

      if (!isRecoverable && status === 400 && !errMsg.includes("not supported")) {
        // Validation/Schema error on prompt itself, no need to cycle all models if payload is invalid
        break;
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all fallback models.");
}

// API Routes

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 1. Multi-turn Journal Reflection Conversation (Grounding with AI Memories)
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const userMemories = Array.isArray(data.userMemories) ? data.userMemories : [];
    const activeMood = typeof data.activeMood === "string" ? data.activeMood : "";

    if (messages.length === 0) {
      return res.status(400).json({ error: "At least one message is required." });
    }

    // Defensive input truncation for token safety
    const boundedMessages = messages.slice(-15).map((m: any) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 4000) }],
    }));

    // Memory grounding context
    let memoryGrounding = "";
    if (userMemories.length > 0) {
      memoryGrounding = `\nLong-term Context & Memories about this user (Use naturally to connect previous themes and demonstrate thoughtful recall without being intrusive):\n` +
        userMemories.map((mem: string, i: number) => `- [Memory #${i + 1}]: ${mem}`).join("\n");
    }

    let moodNote = "";
    if (activeMood) {
      moodNote = `\nUser's stated or detected recent mood: "${activeMood}". Calibrate your tone accordingly with empathy, supportive presence, and grounded inquiry.`;
    }

    const systemInstruction = `You are ReflectAI, an empathetic, intellectually stimulating, and supportive philosophical journaling companion.
Your mission is to help the user unpack their thoughts, gain clarity on their experiences, reflect deeply, brainstorm solutions, and recognize emotional patterns.
Guidelines:
- Validate emotions with genuine warmth without toxic positivity.
- Ask 1-2 thoughtful, open-ended questions that provoke meaningful self-reflection.
- Offer constructive, actionable perspectives or reframings when appropriate.
- Format responses cleanly using Markdown (bullet points, bold highlights, concise paragraphs).
- Keep responses focused and readable (typically 2-4 structured paragraphs).${moodNote}${memoryGrounding}`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: boundedMessages,
      systemInstruction,
      temperature: 0.7,
    });

    res.json({
      success: true,
      text,
      modelUsed,
    });
  } catch (error: any) {
    console.error("[Chat Endpoint Error]:", error);
    res.status(500).json({
      error: error?.message || "Failed to process reflection message.",
    });
  }
});

// 2. AI Mood Timeline, Analytics & Memory Extraction
app.post("/api/analyze-entry", async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const text = typeof data.text === "string" ? data.text : "";
    const existingMemories = Array.isArray(data.existingMemories) ? data.existingMemories : [];

    if (!text.trim()) {
      return res.status(400).json({ error: "Journal entry text is required for analysis." });
    }

    const systemInstruction = `You are an expert psychological reflection analyst and cognitive behavioral coach.
Analyze the provided journal entry to produce:
1. Mood assessment: Dominant mood label (e.g., Joyful, Grateful, Calm, Determined, Inspired, Reflective, Anxious, Overwhelmed, Melancholy, Frustrated).
2. Emotional spectrum: 2 to 4 nuanced emotion labels.
3. Stress level on a scale from 1 (completely serene) to 10 (maximum acute distress).
4. Productivity score on a scale from 1 (paralyzed/inactive) to 10 (exceptionally effective flow state).
5. 2 to 5 key topical tags (e.g., Career, Health, Relationships, Learning, Mindfulness, Creativity).
6. Three AI Insight Cards:
   - keyInsight: A profound realization or synthesis of what the user is experiencing.
   - hiddenPattern: An underlying cognitive habit, emotional trigger, or subtle behavior pattern.
   - suggestedNextStep: A tangible, gentle, and practical micro-action to take today.
7. Long-term memories: Identify any new goals, habits, projects, achievements, or recurring concerns worth remembering across future sessions.

Return ONLY a valid JSON object matching this schema:
{
  "mood": "string",
  "emotions": ["string"],
  "stressLevel": number,
  "productivityScore": number,
  "keyTopics": ["string"],
  "insightCards": {
    "keyInsight": "string",
    "hiddenPattern": "string",
    "suggestedNextStep": "string"
  },
  "extractedMemories": [
    {
      "type": "goal" | "habit" | "project" | "achievement" | "concern",
      "content": "string"
    }
  ]
}`;

    const prompt = `Journal Entry to Analyze:\n"""\n${text.slice(0, 6000)}\n"""\nExisting Known Memories:\n${JSON.stringify(existingMemories.slice(0, 10))}`;

    const { text: resultJson, modelUsed } = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.3,
    });

    let parsedData;
    try {
      parsedData = JSON.parse(resultJson);
    } catch {
      // Fallback cleanup if markdown blocks included
      const cleaned = resultJson.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleaned);
    }

    // Defensive validation
    const mood = String(parsedData.mood || "Reflective");
    const emotions = Array.isArray(parsedData.emotions) ? parsedData.emotions.map(String) : ["Calm"];
    const stressLevel = Math.max(1, Math.min(10, Number(parsedData.stressLevel) || 4));
    const productivityScore = Math.max(1, Math.min(10, Number(parsedData.productivityScore) || 6));
    const keyTopics = Array.isArray(parsedData.keyTopics) ? parsedData.keyTopics.map(String) : ["Personal Growth"];
    const insightCards = {
      keyInsight: String(parsedData.insightCards?.keyInsight || "Taking time to reflect offers immediate clarity on priorities."),
      hiddenPattern: String(parsedData.insightCards?.hiddenPattern || "You tend to find clarity once thoughts are externalized."),
      suggestedNextStep: String(parsedData.insightCards?.suggestedNextStep || "Focus on one high-leverage micro-step next."),
    };
    const extractedMemories = Array.isArray(parsedData.extractedMemories)
      ? parsedData.extractedMemories.map((m: any) => ({
          type: ["goal", "habit", "project", "achievement", "concern"].includes(m.type) ? m.type : "project",
          content: String(m.content || "").slice(0, 300),
        })).filter((m: any) => m.content.length > 3)
      : [];

    res.json({
      success: true,
      analysis: {
        mood,
        emotions,
        stressLevel,
        productivityScore,
        keyTopics,
        insightCards,
        extractedMemories,
      },
      modelUsed,
    });
  } catch (error: any) {
    console.error("[Analyze Endpoint Error]:", error);
    res.status(500).json({
      error: error?.message || "Failed to analyze journal entry.",
    });
  }
});

// 3. Weekly Reflection Generator
app.post("/api/weekly-reflection", async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const dateRange = typeof data.dateRange === "string" ? data.dateRange : "Past 7 Days";

    if (entries.length === 0) {
      return res.status(400).json({ error: "At least one journal entry is needed to synthesize a reflection." });
    }

    const formattedEntries = entries.slice(0, 20).map((e: any, idx: number) => {
      return `[Entry #${idx + 1} - ${e.date || "Unknown Date"}] (Title: ${e.title || "Untitled"})\nMood: ${e.mood || "N/A"}, Stress: ${e.stressLevel || "N/A"}/10, Productivity: ${e.productivityScore || "N/A"}/10\nContent:\n${String(e.content || "").slice(0, 1500)}`;
    }).join("\n\n---\n\n");

    const systemInstruction = `You are an insightful life coach and executive mentor synthesizing a weekly journal review.
Given the user's past journal entries, synthesize a comprehensive weekly reflection.
Return a valid JSON object matching:
{
  "accomplishments": ["string (3-5 specific wins or milestones, big or small)"],
  "recurringChallenges": ["string (2-4 obstacles, friction points, or recurring themes)"],
  "emotionalPatterns": "string (1-2 paragraphs detailing mood trends, stress peaks, and restorative moments)",
  "recommendations": ["string (3-4 highly personalized, compassionate, pragmatic steps for next week)"],
  "summaryMarkdown": "string (A beautiful, inspiring markdown narrative summarizing the arc of this week)"
}`;

    const prompt = `Date Range: ${dateRange}\n\nUser's Journal Entries this period:\n${formattedEntries}`;

    const { text: resultJson, modelUsed } = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.4,
    });

    let parsed;
    try {
      parsed = JSON.parse(resultJson);
    } catch {
      const cleaned = resultJson.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      reflection: {
        accomplishments: Array.isArray(parsed.accomplishments) ? parsed.accomplishments.map(String) : [],
        recurringChallenges: Array.isArray(parsed.recurringChallenges) ? parsed.recurringChallenges.map(String) : [],
        emotionalPatterns: String(parsed.emotionalPatterns || "Consistent self-awareness shown through ongoing reflections."),
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
        summaryMarkdown: String(parsed.summaryMarkdown || "# Weekly Reflection\n\nGreat progress achieved this week."),
      },
      modelUsed,
    });
  } catch (error: any) {
    console.error("[Weekly Reflection Error]:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate weekly reflection.",
    });
  }
});

// 4. Smart Natural Language Journal Search
app.post("/api/smart-search", async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const query = typeof data.query === "string" ? data.query.trim() : "";
    const entries = Array.isArray(data.entries) ? data.entries : [];

    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }
    if (entries.length === 0) {
      return res.json({ matches: [] });
    }

    const candidateEntries = entries.slice(0, 30).map((e: any) => ({
      id: e.id,
      title: e.title || "Untitled",
      date: e.createdAt || "",
      mood: e.analysis?.mood || e.mood || "Reflective",
      snippet: (e.content || (e.messages ? e.messages.map((m: any) => m.text).join(" ") : "")).slice(0, 600),
    }));

    const systemInstruction = `You are a semantic search engine analyzing personal journal entries.
Evaluate which entries match the user's natural language query (which might be conceptual, emotion-based, or situational, e.g. "when I felt confident" or "conversations about internships").
Return ONLY a valid JSON array of matched items, sorted by relevance score descending:
[
  {
    "id": "string",
    "score": number (0 to 100),
    "matchReason": "string (concise reason why this entry matches the user's query)"
  }
]
Only include entries with score >= 40. Return at most 10 items.`;

    const prompt = `Search Query: "${query}"\n\nCandidate Entries:\n${JSON.stringify(candidateEntries, null, 2)}`;

    const { text: resultJson, modelUsed } = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
    });

    let matches = [];
    try {
      matches = JSON.parse(resultJson);
      if (!Array.isArray(matches)) matches = [];
    } catch {
      matches = [];
    }

    res.json({
      success: true,
      matches,
      modelUsed,
    });
  } catch (error: any) {
    console.error("[Smart Search Error]:", error);
    res.status(500).json({
      error: error?.message || "Failed to execute semantic search.",
    });
  }
});

// 5. Automatic Conversation Title Generation
app.post("/api/generate-title", async (req: Request, res: Response) => {
  try {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const text = typeof data.text === "string" ? data.text.trim() : "";

    if (!text) {
      return res.json({ title: "New Reflection" });
    }

    const { text: title } = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: `Generate a poetic or reflective 3-5 word title (no quotation marks, no punctuation at end) summarizing this journal prompt:\n"""\n${text.slice(0, 1000)}\n"""` }] }],
      systemInstruction: "You generate concise, elegant, 3 to 5 word titles for personal journal entries. Return ONLY the title string.",
      temperature: 0.4,
    });

    res.json({ title: title.replace(/^["']|["']$/g, "").trim() || "New Reflection" });
  } catch (error: any) {
    console.warn("[Generate Title Error]:", error);
    res.json({ title: "Journal Reflection" });
  }
});

// Server Initialization with Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ReflectAI Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

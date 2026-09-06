import { JournalEntry, MemoryItem } from "../types";

export function createStarterEntries(userId: string): { entries: JournalEntry[]; memories: MemoryItem[] } {
  const now = new Date();
  
  const entries: JournalEntry[] = [
    {
      id: "sample_entry_1",
      userId,
      title: "Clarity on AI System Architecture",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      groundedMemoryCount: 2,
      messages: [
        {
          id: "m1",
          role: "user",
          text: "I spent the morning refactoring the multi-tenant data layer for our new project. At first I felt anxious about whether Firestore security rules would sufficiently isolate user subcollections without latency spikes. But after benchmarking query patterns, everything clicked.",
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: "m2",
          role: "model",
          text: "It is deeply rewarding when architectural uncertainty transforms into verified confidence. Your instinct to ground theoretical anxiety with empirical benchmarks is a powerful engineering habit.\n\n- What specific architectural invariants gave you the strongest peace of mind?\n- How might you protect this deliberate focus block for future design sprints?",
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ],
      analysis: {
        mood: "Inspired",
        emotions: ["Confidence", "Relief", "Focus"],
        stressLevel: 3,
        productivityScore: 9,
        keyTopics: ["Engineering", "Architecture", "Focus"],
        analyzedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        insightCards: {
          keyInsight: "Empirical benchmarking consistently disarms anticipatory anxiety in complex technical work.",
          hiddenPattern: "You transition rapidly from hesitation to deep flow once concrete metrics replace abstract assumptions.",
          suggestedNextStep: "Document the security benchmark findings into an architectural decision record (ADR) for future reference.",
        }
      }
    },
    {
      id: "sample_entry_2",
      userId,
      title: "Balancing Deep Work with Rest",
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      groundedMemoryCount: 1,
      messages: [
        {
          id: "m3",
          role: "user",
          text: "I noticed I've been checking notifications between coding sessions instead of taking true restorative breaks. By 4 PM my mental energy was drained and I felt restless.",
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: "m4",
          role: "model",
          text: "Recognizing pseudo-rest is a vital breakthrough. Switching between cognitive tabs keeps your nervous system in active arousal without replenishing dopamine or working memory.\n\n- What is one low-stimulus ritual—like a 5-minute walk outside or breathwork—you could swap in instead of checking screens?\n- Notice how your body signals fatigue before your mind admits it.",
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ],
      analysis: {
        mood: "Reflective",
        emotions: ["Restless", "Self-Aware", "Seeking Balance"],
        stressLevel: 6,
        productivityScore: 6,
        keyTopics: ["Habits", "Energy Management", "Mindfulness"],
        analyzedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        insightCards: {
          keyInsight: "Digital pseudo-breaks prevent true neural replenishment and compound afternoon fatigue.",
          hiddenPattern: "Restlessness often triggers habitual phone checks when cognitive tasks reach peak complexity.",
          suggestedNextStep: "Institute a 10-minute zero-device physical decompression walk whenever concluding a deep session.",
        }
      }
    },
    {
      id: "sample_entry_3",
      userId,
      title: "Celebrating Team Milestone & Gratitude",
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      groundedMemoryCount: 2,
      messages: [
        {
          id: "m5",
          role: "user",
          text: "We shipped the initial prototype to early beta testers today. The feedback was overwhelmingly positive, especially regarding the conversational pacing. I feel very grateful for the cross-functional collaboration.",
          timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: "m6",
          role: "model",
          text: "What an exhilarating milestone! Pausing to savor collective accomplishments anchors intrinsic motivation and strengthens team trust.\n\nTake a moment to let that appreciation sink in fully—you've built something that resonates directly with human needs.",
          timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ],
      analysis: {
        mood: "Grateful",
        emotions: ["Joy", "Pride", "Connection"],
        stressLevel: 2,
        productivityScore: 9,
        keyTopics: ["Milestones", "Teamwork", "Gratitude"],
        analyzedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        insightCards: {
          keyInsight: "Shared celebration transforms individual exertion into meaningful communal momentum.",
          hiddenPattern: "Positive feedback provides the highest motivation when it validates the core human experience.",
          suggestedNextStep: "Send a brief personal thank-you message to your collaborator highlighting one specific contribution.",
        }
      }
    }
  ];

  const memories: MemoryItem[] = [
    {
      id: "mem_1",
      userId,
      type: "goal",
      content: "Ship production-ready, security-hardened full-stack AI applications on Cloud Run with zero secrets exposure.",
      sourceEntryTitle: "Clarity on AI System Architecture",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      isPinned: true,
    },
    {
      id: "mem_2",
      userId,
      type: "habit",
      content: "Protect 90-minute morning deep work blocks without notification interruptions.",
      sourceEntryTitle: "Balancing Deep Work with Rest",
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      isPinned: true,
    },
    {
      id: "mem_3",
      userId,
      type: "concern",
      content: "Avoid pseudo-rest during fatigue peaks; replace phone scrolling with low-stimulus walks.",
      sourceEntryTitle: "Balancing Deep Work with Rest",
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      isPinned: false,
    },
    {
      id: "mem_4",
      userId,
      type: "achievement",
      content: "Successfully launched prototype beta with glowing early user praise for conversational resonance.",
      sourceEntryTitle: "Celebrating Team Milestone & Gratitude",
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      isPinned: false,
    }
  ];

  return { entries, memories };
}

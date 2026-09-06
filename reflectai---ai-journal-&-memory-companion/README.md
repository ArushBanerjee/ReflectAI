# ReflectAI - AI Journal & Memory Companion
> Production-grade reflective journaling web application powered by **Gemini 3.6 Flash**, **Google Cloud Run**, and **Cloud Firestore**.

ReflectAI is an authenticated, multi-turn journaling sanctuary where users can converse with Gemini, track emotional arcs, automatically extract long-term memories to ground future sessions, synthesize weekly reflections, and search entries using natural language semantics.

---

## Architecture & System Design

```
                     ┌────────────────────────────────────────────────────────┐
                     │                       Browser Client                   │
                     │  (React 19 + Vite + Tailwind CSS + Lucide + Recharts)  │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
             ┌─────────────────────────────────────────────────────────────────────────┐
             │               Cloud Run Full-Stack Express Host (Port 3000)             │
             │                                                                         │
             │  • Top-Level JSON Deserialization Middleware                            │
             │  • Null-Safe Defensive Payload Ingestion Standards                      │
             │  • Zero-Client-Secret Exposure (Server-authoritative proxy)             │
             └────────────────────┬───────────────────────────────┬────────────────────┘
                                  │                               │
                                  ▼                               ▼
    ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
    │          Google Cloud Secret Manager     │    │         Gemini 3.6 Flash Engine          │
    │         (Injected GEMINI_API_KEY)        │    │                                          │
    └──────────────────────────────────────────┘    │  Ladder Fallback Hierarchy:              │
                                                    │  1. gemini-3.6-flash                     │
                                                    │  2. gemini-3.1-flash-lite                │
                                                    │  3. gemini-flash-latest                  │
                                                    │  4. gemini-3.7-flash                     │
                                                    └──────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────────────────────────────────┐
    │                      Cloud Firestore & Firebase Authentication                   │
    │                                                                                  │
    │  • Strict User-Bound Data Isolation: /users/{userId}/{allSubcollections=**}     │
    │  • Zero Insecure Defaults (No public read/write)                                 │
    │  • Federated Google Sign-In (No raw password/email storage)                      │
    └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Agentic Threat Modeling & Security Countermeasures

| Threat Zone | Identified Risk Scenario | Countermeasure & Security Invariant | OWASP / Security Standard |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection in journal prompts, oversized inputs, JSON payload tampering. | Strict schema validation with token length bounds, Express `express.json({ limit: '10mb' })` ordering, and null-safe destructuring. | OWASP A03 (Injection) / LLM02 |
| **Planning & Reasoning** | Prompt injection attempting to alter the reflective persona or extract confidential instructions. | Passive analytical isolation: user journal inputs are framed strictly as non-executable text within prompt boundaries. | OWASP LLM01 (Prompt Injection) |
| **Tool Execution** | Unauthorized route execution or server-side parameter manipulation. | Server-authoritative routing, tokenized identity verification, zero-exposed client API keys. | OWASP A01 (Broken Access Control) |
| **Memory & State** | Cross-tenant reflection leaks between different users in Cloud Firestore. | Zero-insecure-defaults Firestore rules enforcing `request.auth.uid == userId` across all subcollections. | Strict Multi-Tenant Isolation |
| **Inter-System Communication** | Token leakage or API quota failure during peak traffic. | Secret Manager dynamic credential injection with resilient model fallback ladder (`3.6-flash` &rarr; `3.1-flash-lite` &rarr; `latest` &rarr; `3.7-flash`). | Defense-in-Depth & Error Recovery Matrix |

---

## 2. Contest Differentiator Features

1. **AI Mood Timeline & Analytics**
   - Automatically assesses primary mood, nuanced emotional spectrum, stress levels (1-10), productivity scores (1-10), and topical tags after every journal session.
   - Interactive Recharts visualization with Area charts, Emotion Frequency distribution, and topical tags.

2. **AI Memory System**
   - Extracts enduring goals, habits, projects, achievements, and recurring concerns.
   - Contextually grounds future Gemini conversations so the assistant recalls previous discussions naturally.
   - Users can toggle active grounding, pin key items, or add custom memories.

3. **Weekly Reflection Generator**
   - Synthesizes accomplishments, recurring challenges, emotional patterns, and personalized recommendations.
   - Saves dated syntheses to Firestore with clean Markdown reviews.

4. **AI Insight Cards**
   - Triad analysis generated after conversations: *Key Insight*, *Hidden Pattern*, and *Suggested Next Step*.
   - Filterable, searchable, and linked directly to originating journal entries.

5. **Smart Natural Language Search**
   - Semantic natural language matching (e.g. *"Show entries where I felt confident and in flow"*) powered by Gemini scoring with reasoning badges.

6. **Personal Growth & Alignment Dashboard**
   - Visualizes reflection streaks, total words externalized, emotional equilibrium index, and goal progress.

---

## 3. Database Security Configuration: Cloud Firestore Rules

Deploy the following zero-insecure-defaults rules in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strict User Data Isolation: Only authenticated user can access their own subcollections
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Matches all subcollections: /interactions, /entries, /memories, /reflections, /insights
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

To deploy rules to Firebase:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Secret Management Setup (Google Cloud Secret Manager)

ReflectAI eliminates hardcoded credentials. Store the Gemini API key securely in Google Cloud Secret Manager:

```bash
# 1. Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com

# 2. Create the Secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 3. Add the secret version containing your API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 4. Grant your Cloud Run service account access to read the secret
export PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Google Cloud Run Deployment Flow

Build and deploy the full-stack container service to Google Cloud Run:

```bash
# 1. Build and deploy to Cloud Run with Secret Manager binding
gcloud run deploy reflectai-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000

# 2. Apply Mandatory Campaign Verification Label
gcloud run services update reflectai-service \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Walkthrough & Test Verification Suite

The following comprehensive walkthrough tests verify all processes and user interactions:

### Test Case 1: Authentication & User Isolation
- **Action 1.1**: Open the app landing page. Verify that sign-in options ("Continue with Google Sign-In" and "Direct Verification") are displayed.
- **Action 1.2**: Click "Sign in as arush.banerjee@iitgn.ac.in".
- **Expected Result**: User enters their private dashboard; user profile name and email appear in the top-right corner; isolated storage partition is mounted.
- **Action 1.3**: Click "Sign Out".
- **Expected Result**: User session clears, redirecting back to landing page.

### Test Case 2: Multi-turn Conversational Journaling with Gemini 3.6 Flash
- **Action 2.1**: In the **Journal** tab, click "New Reflection".
- **Action 2.2**: Click the prompt starter chip *"Morning Intention"* or enter custom text: *"Today I am refactoring the authentication middleware to enforce zero insecure defaults."*
- **Action 2.3**: Press Enter or click the Send button.
- **Expected Result**: User message appears immediately; save indicator shows "Saving..."; Gemini reflects thoughtfully with formatted Markdown; conversation title is automatically generated in the background.
- **Action 2.4**: Type a follow-up reply: *"What potential edge cases should I test first?"* and send.
- **Expected Result**: Gemini responds in multi-turn context, grounding advice with long-term memory points.

### Test Case 3: AI Mood & Memory Extraction
- **Action 3.1**: In an active journal entry, click the **"Analyze Mood & Insights"** button.
- **Expected Result**: Spinner activates; `/api/analyze-entry` executes; entry displays a mood badge (e.g. *Inspired* or *Reflective*); stress and productivity metrics are recorded; 3 Insight Cards and new memories are extracted.
- **Action 3.2**: Check the left sidebar. The entry displays the extracted mood pill and formatted date.

### Test Case 4: AI Mood Timeline & Analytics
- **Action 4.1**: Click the **Mood Timeline** tab.
- **Expected Result**: Stat cards display Dominant Mood, Average Stress, and Productivity Flow.
- **Action 4.2**: Inspect the AreaChart: Stress and Productivity lines render with smooth curves and hoverable tooltips.
- **Action 4.3**: Inspect the Nuanced Emotion Spectrum bar chart and Key Recurring Topics badges.

### Test Case 5: AI Memory System
- **Action 5.1**: Click the **AI Memory** tab.
- **Expected Result**: Extracted memory items appear categorized into Goals, Habits, Projects, Achievements, and Concerns.
- **Action 5.2**: Click "Add Memory". Select "Goal", input *"Achieve 99.9% uptime on Cloud Run"*, and save.
- **Expected Result**: New goal appears in the grid.
- **Action 5.3**: Toggle "Active Grounding" off and on. Pin an item with the pin button.
- **Expected Result**: Active count updates in the header pill; pinned items sort to top.

### Test Case 6: Weekly Reflection Generator
- **Action 6.1**: Click the **Weekly Reflection** tab.
- **Action 6.2**: Click **"Generate New Weekly Synthesis"**.
- **Expected Result**: `/api/weekly-reflection` synthesizes past entries; grid renders Accomplishments & Milestones, Recurring Challenges, Emotional Arc, Personalized Guidance, and Full Markdown Narrative.
- **Action 6.3**: Verify the synthesis is archived in the left panel with timestamp.

### Test Case 7: AI Insight Cards
- **Action 7.1**: Click the **Insight Cards** tab.
- **Expected Result**: 3 cards per analyzed entry (Key Insight, Hidden Pattern, Suggested Next Step) render in cards grid.
- **Action 7.2**: Filter by "Key Insights" or search by keyword.
- **Action 7.3**: Click "Open Entry &rarr;".
- **Expected Result**: Navigates directly to the originating journal entry in the Journal tab.

### Test Case 8: Semantic Natural Language Search
- **Action 8.1**: Click the **Smart Search** tab.
- **Action 8.2**: Click the sample query *"Show entries where I felt confident and in flow"* or type a custom natural language query.
- **Action 8.3**: Click **Search**.
- **Expected Result**: Gemini scores semantic relevance (e.g. *95% Match*), explains *"Why this matched"*, and allows 1-click jump to the entry.

### Test Case 9: Growth & Alignment Dashboard
- **Action 9.1**: Click the **Growth** tab.
- **Expected Result**: Reflection streak counter, total words written, emotional equilibrium index, active goals, and milestone achievements display cleanly.

### Test Case 10: Settings, Theme & Backup
- **Action 10.1**: Click the Sun/Moon toggle in the header.
- **Expected Result**: UI smoothly switches between Dark and Light mode, persisting in `localStorage`.
- **Action 10.2**: Click the Settings button (Sliders icon).
- **Action 10.3**: Click "Export JSON" and "Export Markdown".
- **Expected Result**: Browser initiates file downloads of the user's complete journal archive.

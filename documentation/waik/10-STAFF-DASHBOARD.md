# WAiK Staff Dashboard

**Version**: 1.1  
**Last Updated**: April 2026  
**Surface**: Mobile-first Staff command center (`/staff/*`)

---

## Overview

The staff dashboard is optimized for a nurse opening WAiK on an iPhone with ~30 seconds:

- **Is anything urgent?** (pending questions, due assessments)
- **How do I report what just happened?** (one-tap “Report Incident”)

---

## Layout, Routing, and Role Gating

### Layout entry point

- `app/staff/layout.tsx` (server component guard + shell)
- `components/staff/staff-app-shell.tsx` (mobile header + bottom tabs + badge polling)

### Role gating (defense-in-depth)

- Unauthenticated → redirect to `/sign-in`
- WAiK super admin → redirect to `/waik-admin`
- Admin-tier (DON/Admin roles) → redirect to `/admin/dashboard`
- Staff-tier roles (RN/CNA/LPN/etc.) → allowed

---

## Dashboard Page (Home Tab)

### File

- `app/staff/dashboard/page.tsx` (`"use client"`)

### Data fetching

The dashboard makes **three** API calls on load:

1. `GET /api/staff/incidents` — shared state for hero banner + pending + recent
2. `GET /api/assessments/due` — due assessments strip (7-day window)
3. `GET /api/staff/performance` — performance card analytics (cached)

### Section 1 — Hero card

- Primary CTA: **“🎤 Report Incident”** → `/staff/report`
- Must remain visible without scrolling on a 375px viewport (iPhone SE)
- If an unfinished report exists, an **amber “continue” banner** renders above the hero and deep-links to `/staff/incidents/[id]`

### Section 2 — Pending Questions

**Authoritative rule:** An incident is pending when:

- `phase === "phase_1_in_progress"` **and**
- `completenessScore < 100`

Cards are sorted **oldest first** by `startedAt`.

UI elements per card:

- room (room number only)
- incident type
- elapsed time since `startedAt`
- “N questions remaining” badge (derived from `tier2QuestionsGenerated - questionsAnswered`, min 1)
- circular completion ring
- “Continue report” → `/staff/incidents/[id]`

### Section 3 — Recent Reports

- Shows the staff member’s **latest 5** reports (newest first)
- Row is tappable and routes to `/staff/incidents/[id]`
- Phase dot colors:
  - `phase_1_in_progress` → amber `#E8A838`
  - `phase_1_complete` → yellow `#F4D03F`
  - `phase_2_in_progress` → blue `#2E86DE`
  - `closed` → teal `#0D7377`

### Section 4 — Assessments Due This Week

- Driven by `GET /api/assessments/due`
- **Conditionally invisible** when the list is empty (no empty headings)
- Days badge colors:
  - ≤ 1 day: green
  - 2–3 days: amber
  - 4–7 days: gray
- “Start” deep link: `/staff/assessments/[type]?residentId=...`

### Section 5 — Performance Card

- Driven by `GET /api/staff/performance`
- **Collapsed by default**, expands on tap
- Score colors:
  - ≥ 85: teal
  - 60–84: amber
  - < 60: red
- Streak definition:
  - consecutive signed reports (newest first) with `completenessAtSignoff >= 85`
  - stops at first below 85
- Streak banner only shown when `currentStreak >= 3`

---

## Bottom Tab Bar + Badge Polling

Tabs:

- Home (`/staff/dashboard`)
- Incidents (`/staff/incidents`)
- Assessments (`/staff/assessments`)
- Intelligence (`/staff/intelligence`)

Badges:

- Home + Incidents: `pendingQuestions`
- Assessments: `dueAssessments`

Polling:

- `GET /api/staff/badge-counts` on mount and every **60 seconds**

---

## Privacy Constraints (PHI)

- Dashboard APIs and UI surfaces must not return or render resident names.
- Room number is allowed.

---

## Related Docs

- `documentation/waik/03-API-REFERENCE.md`
- `documentation/pilot_1_plan/phase_3c/task-05e-integration-verification.md`

---

## Incident List

### Search & Filter

| Filter | Options |
|--------|---------|
| **Search** | Resident name, title, room number |
| **Status** | All, Open, In Progress, Pending Review, Closed |
| **Priority** | All, Urgent, High, Medium, Low |
| **Sort** | Newest First, Oldest First, Priority, Resident Name |

### Incident Card Display

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Fall incident in hallway                                                   │
│  Margaret Thompson • Room 204                                               │
│  Created Jan 20, 2025                                                       │
│                                                                             │
│  [HIGH] [OPEN] [2 Questions]                          [View Details →]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Badge | Meaning |
|-------|---------|
| Priority | Urgent (orange), High (red), Medium (yellow), Low (gray) |
| Status | Open, In Progress, Pending Review, Closed |
| Questions | Number of unanswered questions (red if > 0) |

---

## Incident Detail Page

### File

`app/staff/incidents/[id]/page.tsx`

### Tabs

| Tab | Icon | Content |
|-----|------|---------|
| **Overview** | FileText | Narrative, metadata, report card |
| **Q&A** | MessageSquare | Pending and answered questions |
| **Intelligence** | Brain | AI chat interface |
| **WAiK Agent** | Target | AI-generated summary, insights, recommendations |

### Overview Tab

**Incident Information**:
- Title with AI-enhanced badge
- Enhanced narrative (collapsible original)
- Priority and status badges
- Resident name and room
- Reporter name
- Creation and update timestamps

**Investigative Highlights**:
- Resident state notes
- Environment notes
- Answer highlights (first 3)

**Report Card**:
- Overall quality score (0-10)
- Completeness score
- Strengths and gaps
- Quick critique summary

### Q&A Tab

**Pending Questions Section**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Pending Questions (6)                                [Text] [Voice]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Q1] [Q2] [Q3] [Q4] [Q5] [Q6]                                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Were the wheelchair brakes engaged prior to the fall?                │  │
│  │  Asked by Admin User • Jan 20, 2025 at 3:45 PM                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Your Answer                                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                                                                 │  │  │
│  │  │  Type your answer here...                                       │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │                                              [Save Answer]            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [← Previous]                                              [Next →]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Answer Modes**:

| Mode | Description |
|------|-------------|
| **Text** | Type answer in textarea |
| **Voice** | Speak answer, review transcript, submit |

**Voice Mode Flow**:
1. AI speaks the question (TTS)
2. Staff speaks their answer (STT)
3. Transcript appears for editing
4. Staff reviews and saves

**Answered Questions Section**:
- Tab navigation through answered questions
- Question text with asker info
- Answer text with responder info
- Method badge (voice/text)

### Intelligence Tab

RAG-powered Q&A interface:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🧠 Incident Intelligence                             [Stop] [Audio On]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│  ┌─ AI ──────────────────────────────────────────────────────────────────┐  │
│  │  The resident was found on the floor at 8:15 AM. They were attempting │  │
│  │  to get out of bed and lost their balance.                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ You ─────────────────────────────────────────────────────────────────┐  │
│  │  Were there any injuries?                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ AI ──────────────────────────────────────────────────────────────────┐  │
│  │  Based on the report, the resident sustained minor bruising on their  │  │
│  │  left hip. No serious injuries were detected.                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐  [🎤] [Send]              │
│  │  Ask a question...                          │                           │
│  └─────────────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Suggested questions on empty state
- Voice input via microphone button
- Auto-speak AI responses (toggleable)
- Stop speaking button

### WAiK Agent Tab

Displays AI-generated analysis:

| Section | Content |
|---------|---------|
| **Summary** | Executive summary of the incident |
| **Insights** | What happened, impact, prevention, future actions |
| **Recommendations** | Staff training, environmental changes, policy updates |
| **Action Items** | Specific tasks with role assignments |

Metadata shown:
- AI Model used
- Confidence percentage
- Generation timestamp
- Token usage (if available)

---

## Notifications

### Real-time Polling

```typescript
useEffect(() => {
  if (userId) {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)  // 30 seconds
    return () => clearInterval(interval)
  }
}, [userId])
```

### API Endpoint

```
GET /api/staff/notifications?staffId={userId}
```

**Response**:
```json
{
  "unansweredCount": 7,
  "notifications": [
    {
      "incidentId": "inc-1",
      "incidentTitle": "Fall in Room 204",
      "questionCount": 3
    }
  ]
}
```

### Notification Bell

- Badge shows total unanswered count
- Dropdown lists incidents with pending questions
- Click navigates to incident detail page

---

## Key User Flows

### 1. Answer a Question (Text)

```
Dashboard → Click "View Details" → Q&A Tab → Select Question
→ Type Answer → Click "Save Answer" → Success Toast
```

### 2. Answer a Question (Voice)

```
Dashboard → Incident Detail → Q&A Tab → Click "Voice" mode
→ AI speaks question → Click "Start Recording" → Speak answer
→ Review transcript → Click "Save Answer"
```

### 3. Ask Intelligence Question

```
Incident Detail → Intelligence Tab → Type question (or use mic)
→ Press Enter or click Send → AI responds
→ (Optional) AI speaks response if auto-speak enabled
```

### 4. Create New Incident (Standard)

```
Sidebar → "New Incident" → Voice-guided 5-step form
→ Resident name → Room → Narrative → State → Environment
→ Submit → AI processes and generates questions
→ Redirect to dashboard
```

### 5. Create New Incident (AI Companion)

```
Sidebar → "AI Companion" → Click "Start Conversation"
→ WAiK speaks greeting → Answer 4 narrative prompts
→ WAiK analyzes and asks follow-ups → Answer each
→ Report card with score → Return to dashboard
```

---

## State Management

### Auth Store (Zustand)

```typescript
interface AuthState {
  userId: string | null
  name: string | null
  role: "staff" | "admin" | null
  isAuthenticated: boolean
  login: (userId: string, name: string, role: string) => void
  logout: () => void
}
```

### Component State

| State | Purpose |
|-------|---------|
| `incidents` | All incidents assigned to user |
| `filteredIncidents` | After search/filter applied |
| `answers` | Draft answers keyed by questionId |
| `qaMode` | "text" or "voice" |
| `currentQuestionIndex` | Which question is active |
| `intelligenceMessages` | Chat history for Intelligence |

---

## API Dependencies

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/staff/incidents?staffId=` | GET | Fetch user's incidents |
| `/api/staff/notifications?staffId=` | GET | Get pending question counts |
| `/api/incidents/{id}` | GET | Fetch single incident |
| `/api/incidents/{id}/answers` | POST | Submit answer |
| `/api/incidents/{id}/intelligence` | POST | Ask AI question |
| `/api/incidents/{id}/report-card` | GET | Get scoring data |
| `/api/users` | GET | List staff for assignment |

---

## Related Documentation

- [11-ADMIN-DASHBOARD.md](./11-ADMIN-DASHBOARD.md) - Admin capabilities
- [12-INCIDENT-FORMS.md](./12-INCIDENT-FORMS.md) - All incident creation modes
- [03-API-REFERENCE.md](./03-API-REFERENCE.md) - API documentation

---

*The Staff Dashboard is designed for efficiency and accessibility, supporting both text and voice input to minimize disruption to patient care.*


# WAiK Staff Dashboard

**Version**: 1.0  
**Last Updated**: December 2024  
**Role**: Staff (Nurses, CNAs, Healthcare Workers)

---

## Table of Contents

1. [Overview](#overview)
2. [Access & Authentication](#access--authentication)
3. [Layout & Navigation](#layout--navigation)
4. [Dashboard Features](#dashboard-features)
5. [Incident List](#incident-list)
6. [Incident Detail Page](#incident-detail-page)
7. [Notifications](#notifications)
8. [Key User Flows](#key-user-flows)

---

## Overview

The Staff Dashboard is the primary interface for healthcare workers to:
- View incidents assigned to them
- Answer follow-up questions (text or voice)
- Query the AI Intelligence system
- Review AI-generated reports

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STAFF DASHBOARD OVERVIEW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────┐                                                      │
│   │     SIDEBAR      │    ┌─────────────────────────────────────────────┐   │
│   │                  │    │                                             │   │
│   │  WAiK Logo       │    │              MAIN CONTENT AREA              │   │
│   │  Staff Portal    │    │                                             │   │
│   │  User Name       │    │   ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│   │                  │    │   │  Open   │ │ Pending │ │Completed│       │   │
│   │  ──────────────  │    │   │Incidents│ │Questions│ │  Today  │       │   │
│   │                  │    │   │   (3)   │ │   (7)   │ │   (2)   │       │   │
│   │  Dashboard       │    │   └─────────┘ └─────────┘ └─────────┘       │   │
│   │  New Incident    │    │                                             │   │
│   │  Conversational  │    │   ┌─────────────────────────────────────┐   │   │
│   │  AI Companion    │    │   │                                     │   │   │
│   │                  │    │   │         INCIDENT LIST               │   │   │
│   │  ──────────────  │    │   │    (Search, Filter, Sort)           │   │   │
│   │                  │    │   │                                     │   │   │
│   │  Logout          │    │   └─────────────────────────────────────┘   │   │
│   │                  │    │                                             │   │
│   └──────────────────┘    └─────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Access & Authentication

### Route Protection

```typescript
// app/staff/layout.tsx
<AuthGuard allowedRoles={["staff"]}>
  {children}
</AuthGuard>
```

Only users with `role: "staff"` can access the `/staff/*` routes.

### Auth State

```typescript
const { name, userId, logout } = useAuthStore()
```

| Property | Description |
|----------|-------------|
| `name` | Display name of logged-in user |
| `userId` | Unique identifier for API calls |
| `role` | Always "staff" for this dashboard |
| `logout` | Function to clear auth and redirect |

---

## Layout & Navigation

### File Structure

```
app/staff/
├── layout.tsx              # Staff layout with sidebar
├── dashboard/
│   ├── page.tsx            # Main dashboard
│   └── loading.tsx         # Loading state
├── incidents/
│   └── [id]/
│       └── page.tsx        # Incident detail view
└── report/
    └── page.tsx            # Conversational reporting
```

### Sidebar Navigation

| Button | Route | Description |
|--------|-------|-------------|
| **Dashboard** | `/staff/dashboard` | Main incident list |
| **New Incident** | `/incidents/create` | Standard voice-guided form |
| **Conversational Reporting** | `/incidents/conversational/create` | Chat-based reporting |
| **AI Companion** | `/incidents/companion/create` | Full voice conversation |

### Mobile Responsiveness

- Collapsible sidebar on mobile (`< 1024px`)
- Touch-friendly notification bell in header
- Responsive incident cards

---

## Dashboard Features

### Statistics Cards

```typescript
const openIncidents = incidents.filter((i) => i.status === "open")
const pendingQuestions = incidents.reduce((count, incident) => {
  return count + incident.questions.filter((q) => !q.answer).length
}, 0)
const completedToday = incidents.filter((i) => {
  const today = new Date().toDateString()
  return i.status === "closed" && new Date(i.updatedAt).toDateString() === today
}).length
```

| Card | Color | Description |
|------|-------|-------------|
| **Open Incidents** | Primary | Incidents assigned to this staff |
| **Pending Questions** | Accent | Questions awaiting response |
| **Completed Today** | Green | Incidents closed today |

### Data Fetching

```typescript
const fetchIncidents = async () => {
  const response = await fetch(`/api/staff/incidents?staffId=${userId}`)
  const data = await response.json()
  setIncidents(data.incidents)
}
```

Only incidents where `staffId === userId` are returned.

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


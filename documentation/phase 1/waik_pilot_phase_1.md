# WAiK Pilot Build Plan v2
## Codebase Assessment + Sequenced Cursor Prompts
### From current state → pilot-ready PWA in 30 days

---

## WHAT YOU HAVE — HONEST ASSESSMENT

**You are significantly further along than most founders at this stage. This is not a prototype. This is a working product.**

### What's already production-quality

**The agentic core is real and sophisticated.**
- `expert_investigator/graph.ts` — full conversational gap-filling loop with session management
- `expert_investigator/analyze.ts` — narrative scoring with heuristic extraction + LLM function calling
- `expert_investigator/gap_questions.ts` — dynamic question generation against Gold Standards
- `expert_investigator/fill_gaps.ts` — answer processing with state updates
- `expert_investigator/finalize.ts` — investigation completion
- Two-agent handoff pattern (report agent → investigation agent) is clean and correct
- Gold Standards typed schema is comprehensive and extensible
- MongoDB + Mongoose models with facilityId hooks already present
- The conversational voice UI (`staff/report/page.tsx`) is a full state machine with speech synthesis, recognition, and streaming agent responses

**Your incident model is already thinking about multi-tenancy.**
`facilityId`, `companyId` are on the schema. `phase` state machine is implemented. Signature schemas exist. IDT team structure exists in the investigation model. You built ahead of where you thought you were.

**The documentation is exceptional.**
14 files in `/documentation/waik/` including architecture diagrams, API reference, Gold Standards reference, roadmap. This is a major asset for onboarding developers and for investor due diligence.

### What's missing or needs work

**Auth is a custom Zustand store with no real security.**
`lib/auth-store.ts` stores userId and role in localStorage via `persist`. Role is `"staff" | "admin"` only. API routes have no auth middleware — they trust whatever userId is passed in the query string or body. This is the single biggest thing to fix before a pilot.

**No multi-tenancy at the API or data layer.**
`getIncidents()` returns all incidents from all facilities. Any staff member can see any incident. This is a data isolation failure that will disqualify you from any serious pilot.

**Two roles only.**
`UserRole = "staff" | "admin"`. You need DON, Administrator, RN, LPN, CNA, PT, Dietician, Owner at minimum.

**No admin user management.**
There is no way for an administrator or DON to invite staff, assign roles, or deactivate a user. For a pilot, the community admin must own their own user management without calling you.

**Dashboards are the same flat list for both personas.**
The staff and admin dashboards are essentially identical incident lists. A nurse opening WAiK at 6am needs one button and her pending questions. An administrator needs a command center. These are completely different experiences.

**No PWA manifest or service worker.**
Not a PWA yet. No `manifest.json`, no `sw.js`, no offline support.

**iOS voice capture will break.**
Web Speech API with `continuous: false` is interrupted when the iOS screen locks. Not production-safe.

**Session store for Expert Investigator is in-memory.**
`expert_investigator/session_store.ts` uses a JavaScript Map. On Vercel serverless, every invocation is a fresh process. The conversational investigation is broken in production right now. This is a critical bug.

**Google Sheets integration exists.**
`lib/google-sheets.ts` — remove this before pilot. Data leak risk.

---

## PHASE OVERVIEW

| Phase | Days | Focus | Prompts |
|---|---|---|---|
| **1 — Foundation** | 1–5 | Auth, multi-tenancy, security | 1, 2 |
| **2 — Core Hardening** | 6–10 | Fix production bugs, iOS voice | 3, 4 |
| **3 — Dashboards** | 11–16 | Rebuild staff + admin UX | 5, 6 |
| **4 — Features** | 17–22 | Assessments, Resident Story, Intelligence | 7, 8, 9 |
| **5 — Admin & Settings** | 23–26 | User management, roles, permissions | 10, 11 |
| **6 — PWA & Notifications** | 27–30 | PWA, push notifications, pilot hardening | 12, 13 |

---

## SEQUENCED CURSOR PROMPTS

Paste each prompt into Cursor Agent mode in sequence.
Complete and verify each one before moving to the next.

---

## PHASE 1 — FOUNDATION & AUTH (Days 1–5)

### PROMPT 1 — Install ClerkJS + Multi-Tenant Auth Foundation

```
I'm building a Next.js 14 app (App Router) called WAiK. I need to replace the existing custom Zustand auth store with ClerkJS for production-grade multi-tenant authentication.

CURRENT STATE:
- lib/auth-store.ts uses Zustand + persist to store userId, username, role, name in localStorage
- API routes have no auth middleware — they trust userId passed in request body/query
- Two roles only: "staff" | "admin"
- app/api/auth/login/route.ts does manual bcrypt comparison against MongoDB

WHAT I NEED:

1. Install and configure ClerkJS with Organizations for multi-tenancy:
   npm install @clerk/nextjs

2. Create middleware.ts at the project root:
   - Protect all routes under /staff/*, /admin/*, /api/incidents/*, /api/agent/*, /api/assessments/*, /api/residents/*
   - Public routes: /, /sign-in/*, /sign-up/*, /api/push/*, /offline
   - Use clerkMiddleware() with createRouteMatcher

3. Define the role hierarchy using Clerk's publicMetadata on each user:
   {
     facilityId: string,
     orgId: string,
     role: "owner" | "administrator" | "director_of_nursing" | "head_nurse" | "rn" | "lpn" | "cna" | "staff" | "physical_therapist" | "dietician",
     facilityName: string,
     isWaikSuperAdmin: boolean  // for Gerard/Scott only
   }

   Admin roles (can access /admin/*): owner, administrator, director_of_nursing, head_nurse
   Staff roles (access /staff/* only): rn, lpn, cna, staff, physical_therapist, dietician

4. Create lib/auth.ts with these exports:
   - getCurrentUser() — returns { userId, orgId, facilityId, role, name, isWaikSuperAdmin } from Clerk session
   - requireRole(allowedRoles: string[]) — throws 401/403 if not authenticated or wrong role
   - requireFacilityAccess(facilityId: string) — throws 403 if user not in that facility
   - isAdminRole(role: string) — returns true for admin-tier roles
   - canAccessPhase2(role: string) — returns true for director_of_nursing, administrator, owner

5. Create app/sign-in/[[...sign-in]]/page.tsx using Clerk's <SignIn /> component
   - Style to match WAiK teal/dark color scheme
   - After sign-in, redirect based on role: admin roles → /admin/dashboard, staff roles → /staff/dashboard

6. Update app/layout.tsx to wrap with <ClerkProvider>

7. Update ALL existing API routes to call getCurrentUser() at the top and return 401 if not authenticated

8. Remove lib/auth-store.ts and app/api/auth/login/route.ts after confirming Clerk works

9. Remove lib/google-sheets.ts entirely — data leak risk

DO NOT change any MongoDB models, agent logic, or UI components yet.
```

---

### PROMPT 2 — Multi-Tenant Data Isolation

```
I'm building WAiK on Next.js 14 with ClerkJS auth now installed. I need to add proper multi-tenant data isolation to all API routes and database queries so no facility can see another facility's data.

CURRENT STATE:
- MongoDB models have facilityId and companyId fields but they're not enforced
- lib/db.ts getIncidents() returns ALL incidents regardless of facility
- API routes don't filter by facilityId

WHAT I NEED:

1. Update lib/db.ts — add facilityId to every query:
   - getIncidents(facilityId: string) — only returns incidents for that facility
   - getIncidentsByStaffId(staffId: string, facilityId: string) — filter by both
   - createIncidentFromReport(input) — must include facilityId
   - getIncidentById(id: string, facilityId: string) — verify ownership before returning
   - All other incident queries — add facilityId parameter and enforce it

2. Update ALL API route handlers:
   - Import getCurrentUser from lib/auth.ts
   - Call getCurrentUser() at the start of every handler
   - Return 401 if not authenticated
   - Pass facilityId to all db queries
   - Return 403 if incident/resource doesn't belong to user's facility

3. Update lib/types.ts:
   - Expand UserRole: "owner" | "administrator" | "director_of_nursing" | "head_nurse" | "rn" | "lpn" | "cna" | "staff" | "physical_therapist" | "dietician"
   - Add facilityId: string to Incident interface
   - Add orgId: string to Incident interface

4. Update backend/src/models/user.model.ts:
   - Add facilityId: string
   - Add orgId: string
   - Update role enum to match expanded UserRole
   - Add isWaikSuperAdmin: boolean (default false)

5. Add a facilityId compound index to IncidentModel:
   IncidentSchema.index({ facilityId: 1, createdAt: -1 })
   IncidentSchema.index({ facilityId: 1, phase: 1 })
   IncidentSchema.index({ facilityId: 1, staffId: 1 })

6. Create lib/db-facility.ts — a thin wrapper that pre-binds facilityId to all queries:
   export function facilityDb(facilityId: string) {
     return {
       getIncidents: () => getIncidents(facilityId),
       getIncidentById: (id) => getIncidentById(id, facilityId),
       // etc.
     }
   }
   This makes API routes cleaner: const db = facilityDb(user.facilityId)

DO NOT change any agent logic, voice capture, or UI components.
```

---

## PHASE 2 — CORE HARDENING (Days 6–10)

### PROMPT 3 — Fix Critical Production Bugs

```
I'm building WAiK on Next.js 14 deployed on Vercel. I have three critical production bugs to fix before the pilot.

BUG 1 — In-Memory Session Store (CRITICAL):
lib/agents/expert_investigator/session_store.ts uses a JavaScript Map. On Vercel serverless, every request can be a fresh process so sessions are lost between the /start and /answer API calls. This breaks the entire conversational investigation.

FIX: Replace the in-memory Map with Redis using ioredis.
- Key pattern: "waik:session:{sessionId}" with 2-hour TTL
- Store InvestigatorSession as JSON
- Keep exact same API: createSession, getSession, updateSession, deleteSession
- REDIS_URL comes from environment variables
- Handle Redis connection errors gracefully — if Redis is down, return a meaningful error to the client rather than crashing

BUG 2 — Vercel Serverless Timeout:
The /api/agent/report-conversational route chains multiple LLM calls (analyze → gap questions → upsert). This can exceed Vercel's 60-second limit.

FIX:
- Add export const maxDuration = 60 to the route handler
- Add a 45-second timeout wrapper around the full LLM chain
- If timeout is hit, save whatever state was computed and return:
  { status: "partial", sessionId, incidentId, questions: [], message: "Analysis is taking longer than expected. Your report was saved. We'll send you questions shortly." }
- The client should handle "partial" status gracefully

BUG 3 — iOS Voice Interruption:
Web Speech API stops when the iOS screen dims or the user switches apps.

FIX in app/staff/report/page.tsx:
- Request navigator.wakeLock.request('screen') when isListening becomes true
- Release wake lock when isListening becomes false or page loses focus
- Add a visibility change listener: if document.visibilityState === 'visible' and awaitingAnswer is true, restart listening after 1 second
- After 2 consecutive failed voice attempts (no-speech error), automatically show a textarea fallback below the mic button with placeholder "Type your answer here..."
- The textarea fallback submits on Enter key or a "Submit" button
- Keep the mic button visible so user can still try voice

BUG 4 — Missing Error Boundaries:
The staff report page has no error boundary. If the agent throws, the entire page breaks with no recovery.

FIX:
- Wrap the main Card content in an ErrorBoundary component
- On error, show: "Something went wrong. Your progress has been saved. Tap here to restart."
- Log errors to console with enough context to debug
```

---

### PROMPT 4 — PWA Foundation

```
I'm adding PWA support to my Next.js 14 app called WAiK. The app is deployed on Vercel.

WHAT I NEED:

1. Install @serwist/next and serwist (the maintained App Router fork of next-pwa):
   npm install @serwist/next serwist

2. Create public/manifest.json:
{
  "name": "WAiK — Conversations not Checkboxes",
  "short_name": "WAiK",
  "description": "Voice-first clinical documentation for senior care",
  "start_url": "/staff/dashboard",
  "display": "standalone",
  "background_color": "#0A3D40",
  "theme_color": "#0D7377",
  "orientation": "portrait-primary",
  "categories": ["medical", "productivity"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [],
  "shortcuts": [
    {
      "name": "Report Incident",
      "url": "/staff/report",
      "icons": [{ "src": "/icons/shortcut-report.png", "sizes": "96x96" }]
    }
  ]
}

3. Configure serwist in next.config.js with these caching strategies:
   - NetworkFirst for all /api/* routes (fresh data, graceful offline)
   - StaleWhileRevalidate for /staff/dashboard and /admin/dashboard
   - CacheFirst for static assets (/_next/static/*)
   - Precache the offline fallback page

4. Create app/offline/page.tsx:
   Simple page showing:
   "You're offline. Any reports you started have been saved and will sync when you reconnect."
   Show a list of any queued offline reports (from IndexedDB)

5. Create lib/offline-queue.ts:
   Uses IndexedDB to store pending incident payloads when POST /api/incidents fails due to network
   - addToQueue(payload: CreateIncidentPayload): Promise<string> — returns a local ID
   - getQueue(): Promise<QueuedIncident[]>
   - removeFromQueue(id: string): Promise<void>
   - flushQueue(): Promise<void> — called on 'online' event, retries all queued posts
   Show a toast when queued reports sync successfully

6. Create components/pwa-install-prompt.tsx:
   Listens for beforeinstallprompt event
   Shows a subtle bottom banner: "Add WAiK to your home screen for the best experience"
   Has "Add" and "Not now" buttons
   Only shows once per device (dismissed state in localStorage key "waik-pwa-prompt-dismissed")
   Works on iOS too: detect iOS and show manual instructions ("Tap Share → Add to Home Screen")

7. Create placeholder teal (#0D7377) square PNG icons at:
   public/icons/icon-192.png (192x192)
   public/icons/icon-512.png (512x512)
   public/icons/icon-512-maskable.png (512x512)
   public/icons/shortcut-report.png (96x96)
   Generate these programmatically using the canvas API in a setup script.

8. Add <link rel="manifest"> and <meta name="theme-color"> to app/layout.tsx
```

---

## PHASE 3 — DASHBOARD REBUILDS (Days 11–16)

### PROMPT 5 — Rebuild Staff Dashboard (Mobile-First)

```
I'm rebuilding the staff dashboard for WAiK (Next.js 14). The current dashboard (app/staff/dashboard/page.tsx) is a flat incident list that serves no one well. I need to rebuild it as a mobile-first experience for nurses and CNAs.

PERSONA: A nurse on a 12-hour shift. She opens WAiK on her iPhone at 6am. She has 30 seconds. She needs to know: do I have anything urgent, and how do I report the thing that just happened.

DESIGN PRINCIPLES:
- Mobile-first, single column
- Maximum 3 taps to any action
- Large touch targets (min 48px)
- Teal/dark color scheme matching existing globals.css
- Use existing shadcn/ui components

WHAT I NEED:

Replace app/staff/dashboard/page.tsx with this layout:

SECTION 1 — Hero Action Bar (always visible, sticky top)
Large primary button: "🎤 Report Incident" → /staff/report
Subtitle: "Tap to start a voice report"
If the user has a pending incomplete report (phase === "open" and they are the reporter), show a yellow banner: "You have an unfinished report. Tap to continue." with a link to that incident.

SECTION 2 — My Pending Questions (urgent)
Heading: "Questions waiting for you" with a badge count
Each card shows:
  - Resident name + incident date
  - How many questions need answering
  - Time since the incident (e.g. "3 hours ago")
  - "Answer Now" button → /staff/incidents/[id]
Empty state: "No pending questions. You're all caught up."
Sort by: oldest first (most urgent at top)

SECTION 3 — My Recent Reports
Heading: "Your reports"
Compact list (not cards) showing last 5 incidents:
  - Resident name, incident type badge, date
  - Phase status dot: yellow = phase 1, blue = phase 2, green = closed
  - Tap to view → /staff/incidents/[id]
"View all" link at bottom

SECTION 4 — Upcoming Assessments
Heading: "Assessments due"
Show any assessments due in the next 7 days for residents assigned to this staff member
Each item: resident name, assessment type, due date
"Start Assessment" button

SECTION 5 — Completeness Score Card (motivational)
Show the staff member's average report completeness score for the last 30 days
Display as a large number (e.g. "87%") with a subtitle "Average report completeness"
Color: green if ≥ 85%, amber if 60-84%, red if < 60%
One line of encouragement based on the score

NAVIGATION:
Bottom tab bar (mobile-style):
  Home | Report | My Incidents | Profile

DATA:
- Fetch /api/staff/incidents?staffId={userId}&facilityId={facilityId}
- Fetch /api/assessments/due?staffId={userId}&facilityId={facilityId}
- Fetch completeness score from incident questions answered

Do not touch the admin dashboard in this prompt.
```

---

### PROMPT 6 — Rebuild Admin Dashboard (Command Center)

```
I'm rebuilding the admin dashboard for WAiK (Next.js 14). The current dashboard is a flat incident list. I need to rebuild it as a command center for Directors of Nursing and Administrators.

PERSONA: A DON or administrator. She opens WAiK at 7am. She needs to know: what happened overnight, what needs my attention right now, what's overdue, and what's at risk legally.

DESIGN PRINCIPLES:
- Desktop-first but responsive
- Information density is appropriate — this is a professional tool
- Clear visual hierarchy: urgent → active → routine
- Teal/dark color scheme matching globals.css
- Use existing shadcn/ui components

WHAT I NEED:

Replace app/admin/dashboard/page.tsx with this layout:

TOP BAR — Daily Brief
A dismissible card at the top (shown once per day, dismissed via localStorage):
"Good morning [name]. Here's your community at a glance:
  [X] open investigations | [X] pending staff questions | [X] assessments due this week"
This is the WAiK Intelligence daily brief — it auto-generates by querying the data.

TAB 1 — "Needs Attention" (default tab, shows badge count)
Three sections within this tab:

  A. RED ALERTS (redFlags.hasInjury = true OR phase_1 > 4 hours open)
  Full-width red banner cards, one per incident:
  - Resident name, incident time, reporting nurse
  - If injury: "Injury reported — state report may be required"
  - Time elapsed since incident
  - "Claim Investigation" button → transitions to Phase 2

  B. AWAITING PHASE 2 CLAIM (phase === phase_1_immediate, > 2 hours old, no injury)
  Yellow cards:
  - Resident name, incident time, completeness score badge
  - "Claim" button

  C. PENDING SPECIALIST TASKS (IDT team tasks assigned but not completed)
  - Which specialist, which incident, how long overdue
  - "Send Reminder" button (triggers push notification)

TAB 2 — "Active Investigations"
Table view (desktop) / card stack (mobile):
Columns: Resident | Reported By | Phase | Completeness | Tasks Status | Days Open | Actions
Each row has: "View" button → /admin/incidents/[id]
Filter by: All | Phase 1 | Phase 2 | Pending Closure
Sort by: Date | Resident | Completeness

TAB 3 — "Closed" (last 30 days)
Compact table: Resident | Date | Completeness Score | Investigator | Duration
"Export" button → generates CSV of the filtered view

RIGHT SIDEBAR (desktop) / Bottom section (mobile):
  Quick Stats for the last 30 days:
  - Total incidents
  - Average completeness score
  - Average time to close (Phase 1 → closed)
  - % of incidents with injury flag
  
  Upcoming assessments (next 7 days)
  
  "WAiK Intelligence" search bar shortcut → /admin/intelligence

NAVIGATION:
Top navigation bar with:
  Dashboard | Residents | Assessments | Intelligence | Settings

DATA:
- GET /api/incidents?facilityId={id}&phase=phase_1_immediate (needs attention)
- GET /api/incidents?facilityId={id}&phase=phase_2_investigation (active)
- GET /api/incidents?facilityId={id}&phase=closed&days=30 (closed)
- Stats computed from the above data client-side

Do not touch the staff dashboard in this prompt.
```

---

## PHASE 4 — FEATURES (Days 17–22)

### PROMPT 7 — Conversational Assessment System

```
I'm building WAiK on Next.js 14. I need to add a conversational assessment system that mirrors the existing voice incident report flow. Assessments are structured conversations (activity assessment, dietary assessment) that replace clipboard-based forms.

EXISTING PATTERN TO FOLLOW:
- app/staff/report/page.tsx — use this voice UI as the template
- lib/agents/expert_investigator/graph.ts — mirror this conversational agent pattern

WHAT I NEED:

1. Create lib/assessment_standards.ts with two assessment schemas:

ACTIVITY ASSESSMENT:
- preferred_activities (string)
- activity_participation_level: "high" | "moderate" | "low" | "declined"
- mobility_level: "independent" | "supervised" | "assisted" | "dependent"
- social_preferences (string)
- barriers_to_participation (string)
- recent_engagement_changes (string)
- staff_observations (string)
- resident_stated_preferences (string)

DIETARY ASSESSMENT:
- appetite_level: "good" | "fair" | "poor"
- food_preferences (string)
- food_aversions (string)
- texture_requirements: "regular" | "soft" | "minced" | "pureed" | "liquid"
- fluid_intake_level: "adequate" | "borderline" | "inadequate"
- recent_weight_changes (string)
- meal_assistance_needed: boolean | null
- cultural_dietary_needs (string)
- reported_GI_issues (string)
- staff_observations (string)

2. Create lib/agents/assessment_agent.ts:
   - startAssessmentConversation({ residentId, residentName, assessmentType, conductedById, conductedByName, facilityId })
   - answerAssessmentQuestion({ sessionId, questionId, answerText, answeredBy, method })
   - Store sessions in Redis: key "waik:assessment-session:{sessionId}" with 2hr TTL
   - Generate 4-6 gap questions per assessment type using gpt-4o-mini
   - Score completeness against the standards schema
   - On completion: save to Assessment model and set next_due_at = now + 90 days

3. Create backend/src/models/assessment.model.ts:
   id, facilityId, residentId, residentName
   type: "activity" | "dietary"
   conductedById, conductedByName
   narrative_raw (original voice, preserved exactly as spoken)
   structured_output (JSON matching assessment standards)
   completeness_score (number 0-100)
   status: "in-progress" | "completed"
   next_due_at (Date)
   createdAt, updatedAt

4. Create API routes:
   - POST /api/assessments — create assessment record
   - POST /api/agent/assessment — start/answer assessment conversation
   - GET /api/assessments?residentId=X&facilityId=Y
   - GET /api/assessments/due?facilityId=Y&days=7

5. Create app/staff/assessments/[type]/page.tsx:
   Mirror app/staff/report/page.tsx voice flow
   Opening question varies by type:
   - Activity: "Tell me about [resident name]'s engagement with activities lately. What do they seem to enjoy?"
   - Dietary: "How has [resident name] been eating lately? Walk me through their appetite and any preferences or concerns."
   WAiK guides the rest conversationally
   On completion: show structured summary card with all captured fields

6. Add due assessment alerts to staff dashboard (already planned in Prompt 5)

Do not modify existing incident report logic.
```

---

### PROMPT 8 — Resident Story (Longitudinal Profile)

```
I'm building WAiK on Next.js 14. I need to add the Resident Story — a longitudinal profile connecting incidents, assessments, notes, and attachments for each resident.

WHAT I NEED:

1. Create backend/src/models/resident.model.ts:
   id, facilityId, orgId
   firstName, lastName, preferredName
   roomNumber, wing (optional)
   admissionDate, dateOfBirth, gender
   status: "active" | "discharged" | "on-leave"
   primaryDiagnosis, secondaryDiagnoses: string[]
   careLevel: "independent" | "assisted" | "memory_care" | "skilled_nursing"
   primaryPhysician (string)
   emergencyContact: { name, relationship, phone }
   createdAt, updatedAt

2. Create backend/src/models/note.model.ts:
   id, facilityId
   parentType: "incident" | "assessment" | "resident"
   parentId (string)
   content (string — free-form observation, max 2000 chars)
   authorId, authorName, authorRole
   visibility: "team" | "admin_only" | "sealed"
   isFlagged: boolean (true = needs admin attention)
   createdAt

3. Create backend/src/models/attachment.model.ts:
   id, facilityId
   parentType: "incident" | "assessment" | "resident"
   parentId
   fileUrl, fileName, fileType, fileSizeBytes
   label: "witness_statement" | "resident_statement" | "scene_photo" | "medical_document" | "other"
   uploadedById, uploadedByName
   createdAt

4. Add optional residentId field to IncidentModel and AssessmentModel

5. Create API routes:
   - GET /api/residents?facilityId=X — list with search
   - POST /api/residents — create resident
   - GET /api/residents/[id] — full profile with linked incidents, assessments, notes
   - PATCH /api/residents/[id] — update resident info
   - POST /api/residents/[id]/notes — add note
   - POST /api/incidents/[id]/notes — add note to incident
   - POST /api/incidents/[id]/attachments — add attachment (stores URL, not the file — use Vercel Blob or presigned S3 for actual upload)
   - GET /api/residents/[id]/mds-recommendations — returns MDS coding suggestions based on documented assessments and incidents

6. Create app/admin/residents/page.tsx:
   Search + filter resident list (name, room, care level, status)
   Each row: name, room, care level, # incidents (30 days), last assessment date, next assessment due
   "View Story" button

7. Create app/admin/residents/[id]/page.tsx — The Resident Story:
   Header: name, room, care level, admission date, primary diagnosis
   Status badge: Active / Discharged / On Leave
   
   Four tabs:
   TAB 1 — Overview
     Recent incidents (last 3, with phase status)
     Recent assessments (last 2, with scores)
     Upcoming assessments (next due)
     Any flagged notes (isFlagged = true) shown prominently
   
   TAB 2 — Incidents
     Full timeline, newest first
     Each: date, type, phase, completeness score, reporting nurse, "View" link
   
   TAB 3 — Assessments
     All assessments grouped by type
     Each: date, type, score, conducted by, next due, "View" link
   
   TAB 4 — Notes & Observations
     All notes from any parent (incident, assessment, resident-level)
     Filter by: All | Admin Only | Flagged
     "Add Observation" button — opens a textarea modal
     Character count, visibility selector, "Flag for admin" toggle

8. Add MDS Recommendations section to the Resident Story overview tab:
   Based on documented assessments and incidents, show:
   "Based on documented clinical data, the following MDS items may qualify for enhanced reimbursement:
    - [Specific recommendation with dollar estimate if applicable]"
   This is a simple LLM call against the resident's assessment history — not a certified coding tool, just a flag for the MDS coordinator to review.
```

---

### PROMPT 9 — Phase 2 Investigation + WAiK Intelligence

```
I'm building WAiK on Next.js 14. I need to complete the Phase 2 investigation workflow and add WAiK Intelligence.

PART A — Phase 2 Investigation Workflow

1. Rebuild app/admin/incidents/[id]/page.tsx as a full Phase 2 workspace:

   SECTION 1 — Phase 1 Summary (read-only)
   Show the nurse's original narrative (raw voice, preserved exactly)
   Show the clinical record (WAiK-generated)
   Show completeness score with filled/missing fields breakdown
   Show all Phase 1 questions and answers

   SECTION 2 — Investigation Status
   Phase badge: Phase 1 Complete → Investigation In Progress → Closed
   Assigned investigator (claim if unclaimed)
   Days open counter

   SECTION 3 — IDT Team Tasks
   For each assigned specialist (dietary, PT, physician, activities):
     - Their assigned question
     - Status: pending / completed
     - Their response (if completed)
     - "Send reminder" button (triggers push notification)
   "Assign new task" button: select role, type the question, assign

   SECTION 4 — Investigation Findings
   Contributing factors (multi-select: medication change, UTI, environmental, equipment, staffing)
   Root cause (free text, required to close)
   Permanent intervention / care plan update (free text)

   SECTION 5 — Close Investigation (DON/Admin only, role-gated)
   All tasks must be completed to enable this section
   Text declaration: "I certify that this investigation is complete and accurate."
   "Sign & Close" button
   On close: records signature, sets phase to "closed", sets completedAt

2. Create API routes:
   - PATCH /api/incidents/[id]/phase — transition phase with role check
   - POST /api/incidents/[id]/tasks — create IDT task
   - PATCH /api/incidents/[id]/tasks/[taskId] — complete task
   - POST /api/incidents/[id]/close — close with signature (DON/admin only)
   - GET /api/incidents/[id]/report-pdf — generate a closure report (returns HTML for now, PDF later)

PART B — WAiK Intelligence

3. Create app/admin/intelligence/page.tsx:
   
   Search bar: "Ask anything about your community..."
   Uses existing lib/agents/intelligence-qa.ts (already built)
   
   Suggested queries shown on empty state:
   - "What are the most common fall locations this month?"
   - "Which residents have had more than 2 incidents in the last 30 days?"
   - "Show me all open investigations older than 48 hours"
   - "What environmental factors appear most often in fall incidents?"
   - "Which staff members have the highest average report completeness?"
   - "Are there any residents with both a fall incident and a declining dietary assessment?"
   
   Results display:
   - Plain language response paragraph
   - Supporting data table (if applicable)
   - Linked incident or resident IDs (clickable)
   - "Save this query" button (stores to localStorage for quick re-run)
   
   Enforce facilityId filtering on all queries — never return cross-facility data

4. Add a Daily Brief generator:
   GET /api/intelligence/daily-brief?facilityId=X
   Returns a plain text summary (2-3 sentences) of the community status:
   "You have 3 open investigations. 2 incidents were reported overnight. 1 assessment is due today for Mrs. Chen."
   This is shown as the dismissible banner on the admin dashboard (Prompt 6).
```

---

## PHASE 5 — ADMIN SETTINGS & USER MANAGEMENT (Days 23–26)

### PROMPT 10 — Staff Management & Role System

```
I'm building WAiK on Next.js 14 with ClerkJS. I need to build a complete staff management system so administrators and DONs can manage their own users without needing Gerard or Scott to do it for them.

This is a critical pilot feature. The community administrator must be able to:
- Invite new staff by email
- Assign roles and permissions
- Deactivate staff who leave
- Reset passwords (via Clerk's built-in flow)
- See who has accessed the system and when

WHAT I NEED:

1. Create app/admin/settings/staff/page.tsx — Staff Management:

   SECTION 1 — Active Staff List
   Table columns: Name | Role | Email | Last Active | Status | Actions
   Filters: All Roles | Admin Tier | Clinical Staff | Inactive
   Search by name or email
   
   Each row actions:
   - "Edit Role" — opens a modal to change role (only owner/administrator can do this)
   - "Deactivate" — suspends the Clerk account + marks user inactive in MongoDB
   - "Resend Invite" — resends the Clerk invitation email if pending

   SECTION 2 — Pending Invitations
   List of sent invitations not yet accepted
   Columns: Email | Role | Invited By | Date Sent | Actions
   "Cancel" button per invitation

   SECTION 3 — Invite New Staff
   Form: Email, First Name (optional), Last Name (optional), Role (dropdown)
   "Send Invitation" button
   On submit: calls Clerk's invitation API, creates a pending user record in MongoDB
   Show success toast with the invited email

2. Create API routes for staff management:
   - GET /api/admin/staff?facilityId=X — list all staff with last-active timestamps
   - POST /api/admin/staff/invite — send Clerk invitation + create pending MongoDB user
   - PATCH /api/admin/staff/[userId]/role — change role (requires administrator/owner)
   - PATCH /api/admin/staff/[userId]/deactivate — suspend Clerk account + mark inactive
   - GET /api/admin/staff/invitations?facilityId=X — list pending invitations
   - DELETE /api/admin/staff/invitations/[id] — cancel invitation

3. Role permission matrix — enforce these rules:
   Who can invite staff:
   - owner: can invite any role including administrator
   - administrator: can invite any role except owner
   - director_of_nursing: can invite rn, lpn, cna, staff, physical_therapist, dietician only
   - All others: cannot invite

   Who can change roles:
   - owner: can change any role
   - administrator: can change any role except owner
   - director_of_nursing: cannot change admin-tier roles

   Who can deactivate:
   - owner and administrator only

4. Create a RoleGate component (components/role-gate.tsx):
   <RoleGate allowedRoles={["owner", "administrator"]}>
     <SensitiveButton />
   </RoleGate>
   Renders null (or a disabled state) if the current user doesn't have the required role.
   Use this throughout the admin UI to hide/disable actions the user can't perform.

5. Create an Activity Log:
   backend/src/models/activity-log.model.ts:
   - userId, userName, role, facilityId
   - action: "login" | "incident_created" | "phase2_claimed" | "investigation_closed" | "user_invited" | "role_changed" | "user_deactivated"
   - resourceType, resourceId (what was acted on)
   - ipAddress, userAgent
   - createdAt

   Log entries for all sensitive actions automatically.
   
   Add app/admin/settings/activity/page.tsx showing the last 100 activity entries:
   Filterable by user, action type, and date range.
```

---

### PROMPT 11 — Complete Admin Settings Section

```
I'm building WAiK on Next.js 14. I need to complete the full admin settings section covering community profile, notifications preferences, and the WAiK super-admin panel.

WHAT I NEED:

1. Create app/admin/settings/page.tsx — Settings home with sub-navigation:
   - Community Profile
   - Staff Management (links to Prompt 10 page)
   - Notification Preferences  
   - Activity Log (links to Prompt 10 activity page)
   - Data & Export
   - Help & Support

2. Create app/admin/settings/profile/page.tsx — Community Profile:
   Editable fields:
   - Community name
   - Facility type (SNF | ALF | Memory Care | CCRC)
   - State (US state dropdown)
   - Bed count
   - Primary contact name + phone + email
   - Reporting configuration: mandated reporting window in hours (default: 2)
   
   Save button → PATCH /api/admin/facility (updates MongoDB facility record)
   
   Read-only display:
   - WAiK Plan: Pilot
   - Facility ID (for support reference)
   - Onboarding date

3. Create app/admin/settings/notifications/page.tsx — Notification Preferences:
   Per-role notification configuration:
   
   Director of Nursing receives:
   ☑ New incident Phase 2 trigger (immediately)
   ☑ Red flag incidents (injury detected) (immediately)
   ☑ Daily brief (7:00 AM)
   ☐ Weekly Intelligence Report (Mondays 8:00 AM)
   
   Administrator receives:
   ☑ New incident Phase 2 trigger (immediately)
   ☑ Investigations open > 48 hours (daily digest)
   ☑ Daily brief (7:00 AM)
   ☐ Weekly Intelligence Report (Mondays 8:00 AM)
   
   Staff receives:
   ☑ Pending question reminders (2 hours after reporting)
   ☑ Assessment due reminders (morning of due date)
   
   Each toggle calls PATCH /api/admin/notification-preferences

4. Create app/admin/settings/export/page.tsx — Data & Export:
   - "Export Incidents (CSV)" — all incidents for this facility, last 90 days
   - "Export Assessments (CSV)" — all assessments for this facility
   - "Export Resident List (CSV)" — all active residents
   - Each export is a GET /api/admin/export?type=incidents&facilityId=X&days=90 route
   - Show a confirmation: "Export includes data from [date range]. Contains [X] records."

5. Create app/waik-admin/ — WAiK Super Admin Panel:
   Protected by isWaikSuperAdmin: true in Clerk publicMetadata
   Only Gerard and Scott can access this.
   
   app/waik-admin/page.tsx — All Communities Overview:
   Table: Community Name | Facility Type | State | # Staff | # Incidents (30d) | Last Activity | Plan | Actions
   Quick stats: Total communities | Total incidents this month | Most active community
   
   app/waik-admin/[facilityId]/page.tsx — Single Facility Deep Dive:
   - All incidents for that facility
   - All staff members
   - Usage metrics: daily active users, avg reports/day, avg completeness score
   - "Impersonate" link (opens facility's admin dashboard as that facility)
   - "Send Message to Admin" (sends email via Clerk)

6. Create app/accept-invite/page.tsx — Invitation Acceptance Flow:
   When a new staff member clicks their email invitation:
   - Show a welcome screen: "You've been invited to join [Community Name] on WAiK"
   - Clerk handles the account creation (password set via Clerk's UI)
   - After account creation, store facilityId in Clerk publicMetadata
   - Redirect to /staff/dashboard with a first-time onboarding tooltip sequence
   
   First-time onboarding tooltips (shown once, dismissed per user):
   1. "This is your dashboard — your home base"
   2. "Tap here to report an incident by voice"
   3. "Pending questions will appear here when WAiK needs more details"
   4. "You're ready. Start your first report anytime."
```

---

## PHASE 6 — PWA & PUSH NOTIFICATIONS (Days 27–30)

### PROMPT 12 — Push Notifications + Reminder System

```
I'm building WAiK on Next.js 14 as a PWA. I need to add push notifications for the pilot.

PRIORITY NOTIFICATIONS (must work for pilot):
1. Phase 2 trigger — DON notified when nurse completes Phase 1
2. Pending question reminder — nurse nudged 2 hours after reporting

SECONDARY (build but can be rough for pilot):
3. Assessment due reminder
4. Daily brief (7am summary for admins)
5. Red flag alert (injury detected)

WHAT I NEED:

1. Install web-push:
   npm install web-push @types/web-push
   Generate VAPID keys and store in environment variables:
   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY

2. Create backend/src/models/push-subscription.model.ts:
   id, userId, facilityId
   subscription (JSON — PushSubscription object from browser)
   userAgent (string — for debugging)
   isActive: boolean
   createdAt, lastUsedAt

3. Create API routes:
   - POST /api/push/subscribe — save subscription for authenticated user
   - DELETE /api/push/unsubscribe — deactivate subscription
   These routes call Clerk's getCurrentUser() for the userId

4. Create lib/push-service.ts:
   sendPush(userId: string, payload: { title, body, url, icon }) — finds active subscriptions for that user and sends via web-push
   
   Notification payloads:
   
   phase2Trigger(incidentId, residentName, facilityId):
     title: "Investigation ready — [residentName]"
     body: "Phase 1 complete. Tap to claim the investigation."
     url: /admin/incidents/[incidentId]
   
   pendingQuestionReminder(incidentId, residentName, staffId):
     title: "Questions waiting for you"
     body: "[residentName]'s report needs a few more details."
     url: /staff/incidents/[incidentId]
   
   assessmentDue(residentName, assessmentType):
     title: "Assessment due today"
     body: "[assessmentType] assessment for [residentName] is due."
     url: /staff/assessments/[type]
   
   dailyBrief(openCount, pendingCount, facilityId):
     title: "WAiK Daily Brief"
     body: "[openCount] open investigations, [pendingCount] questions pending."
     url: /admin/dashboard

5. Call push-service.ts from these trigger points:
   - /api/incidents/[id]/phase (when transitioning to phase_2) → phase2Trigger to all DON/admin users
   - /api/agent/report-conversational (when Phase 1 completes with unanswered questions) → schedule pendingQuestionReminder for 2 hours later using Vercel Cron
   - /api/assessments (when assessment is created with next_due_at) → schedule assessmentDue for day of due date

6. Create vercel.json with cron jobs:
{
  "crons": [
    { "path": "/api/cron/question-reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/daily-brief", "schedule": "0 7 * * *" },
    { "path": "/api/cron/assessment-reminders", "schedule": "0 6 * * *" }
  ]
}

7. Create the cron route handlers:
   /api/cron/question-reminders — finds incidents with unanswered questions created 2+ hours ago, sends push to the reporter
   /api/cron/daily-brief — generates brief text, sends push to all DON/admin users in each facility
   /api/cron/assessment-reminders — finds assessments where next_due_at is today, sends push to assigned staff

8. Update the service worker to handle push events:
   self.addEventListener('push', event => { show notification with the payload data })
   self.addEventListener('notificationclick', event => { open the url from the payload })

9. Add push notification opt-in to staff profile:
   app/staff/profile/page.tsx — show current user's name, role, facility
   "Enable push notifications" button — calls Notification.requestPermission() then /api/push/subscribe
   Show current subscription status
```

---

### PROMPT 13 — Pilot Hardening, Feedback & Demo Mode

```
I'm preparing WAiK for its first pilot. I need to add the final hardening touches, a feedback mechanism, and a proper demo mode.

WHAT I NEED:

PART A — Real-Time Completeness Score in Voice Report

1. Update app/staff/report/page.tsx:
   During the agent phase (when answering gap-fill questions), show a live completeness bar:
   - Progress bar at the top of the conversation card
   - Label: "Report completeness: [X]%"
   - Color: red → amber → green as it increases
   - Updates after each answered question using the completenessScore from the API response
   This makes the value of answering questions visceral and visible.

PART B — Incident Closure Report (PDF-ready)

2. Create app/admin/incidents/[id]/report/page.tsx — printable closure report:
   A clean, print-friendly HTML page (no nav, no chrome) showing:
   - Community name + logo placeholder
   - Resident name, room, date/time of incident
   - Phase 1: nurse's original narrative (preserved verbatim) + clinical record
   - All Q&A from Phase 1 and Phase 2
   - IDT team findings
   - Root cause and permanent intervention
   - All signatures with timestamps
   - Completeness score
   
   Add a "Print / Save as PDF" button (uses window.print())
   Add a "Download Report" link in the admin incident view → opens this page in new tab

PART C — Nurse Feedback Mechanism

3. After Phase 1 completion (when reportCard is shown in staff/report/page.tsx), add a one-question survey below the score:
   "Was WAiK helpful today?"
   Three options: 👍 Yes | 😐 Kind of | 👎 Not really
   Optional text: "Tell us why (optional)" — single line input
   "Submit feedback" button → POST /api/feedback
   
   Create API route POST /api/feedback:
   Stores: userId, facilityId, rating, comment, incidentId, createdAt
   
   Create backend/src/models/feedback.model.ts
   
   Add feedback summary to WAiK super-admin panel:
   Average rating by facility, total responses, recent comments

PART D — Demo Mode

4. Update app/waik-demo-start/login/page.tsx:
   Show: "WAiK Demo — Explore without creating an account"
   Four demo role buttons:
   - "I'm a Nurse" → loads demo with staff role
   - "I'm a Director of Nursing" → loads demo with DON role  
   - "I'm an Administrator" → loads demo with admin role
   - "I'm an Owner" → loads demo with owner role
   
   Demo mode rules:
   - All data comes from data/db.json (seed data — make this realistic with 5 residents, 10 incidents in various phases)
   - Voice reporting works but incidents are not saved to MongoDB (saved to sessionStorage only)
   - All admin views show the seed data
   - Show a yellow "DEMO MODE — No data is saved" banner on all pages
   - Demo session expires after 30 minutes

5. Create realistic seed data in data/db.json:
   5 residents: mix of care levels, some with multiple incidents
   10 incidents: 3 in phase_1, 4 in phase_2, 3 closed
   Incidents include: falls (bed, wheelchair, slip), one medication error
   Completeness scores vary: some high, some low — to show the improvement effect
   Several with pending questions unanswered

PART E — Error Monitoring

6. Install Sentry for error tracking:
   npm install @sentry/nextjs
   
   Configure for Next.js App Router
   Set SENTRY_DSN in environment variables
   Capture:
   - All unhandled API route errors
   - All agent failures (report agent, investigation agent)
   - All Redis connection errors
   - Client-side React errors via ErrorBoundary
   
   Add user context to Sentry (userId, facilityId, role) for every error — never include PHI (no resident names, no narrative content in error reports)

PART F — Performance

7. Add loading skeletons to both dashboards so they feel fast on slow mobile connections:
   Use shadcn/ui Skeleton component
   Staff dashboard: skeleton cards for pending questions and recent reports
   Admin dashboard: skeleton rows for the incident tables
   Show skeletons while data is loading, replace with real data when ready
```

---

## ENVIRONMENT VARIABLES CHECKLIST

Set these in `.env.local` before running any prompt:

```bash
# ClerkJS
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/staff/dashboard

# MongoDB
DATABASE_URL=mongodb+srv://...
MONGODB_DB_NAME=waik-pilot

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_TEXT_EMBEDDING_MODEL=text-embedding-3-small

# Redis
REDIS_URL=redis://...

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...

# Sentry
SENTRY_DSN=https://...

# App
NEXT_PUBLIC_APP_URL=https://your-pilot-domain.vercel.app
CRON_SECRET=random-secret-string  # protects cron routes from external calls
```

---

## FILES TO DELETE BEFORE PILOT

```
lib/google-sheets.ts                        SECURITY RISK — remove immediately
data/db.json                                Remove after verifying MongoDB migration
data/embeddings.json                        Remove after verifying Redis has embeddings
app/api/auth/login/route.ts                 Remove after Prompt 1 (ClerkJS replaces this)
lib/auth-store.ts                           Remove after Prompt 1
backend/scripts/migrate-lowdb-to-mongo.ts   Keep locally, don't deploy
```

---

## PILOT READINESS CHECKLIST

After all 13 prompts, verify every item:

**Security**
- [ ] No API route returns data without Clerk authentication
- [ ] Staff user cannot see incidents from a different facility
- [ ] Admin cannot see data from a different organization
- [ ] All sensitive actions logged in activity log

**Core Workflow**
- [ ] Voice incident report works on iPhone 13+ (test on real device)
- [ ] Voice fallback (Whisper) works when browser speech fails
- [ ] Phase 1 → Phase 2 transition notifies DON via push
- [ ] Expert investigator session survives across multiple API calls (Redis)
- [ ] Investigation closes with DON signature and generates closure report

**User Management**
- [ ] Admin can invite a new nurse by email
- [ ] Invited nurse receives email and can set up account
- [ ] Admin can change a staff member's role
- [ ] Admin can deactivate a departed staff member
- [ ] Role-gated UI correctly hides/shows controls per role

**Dashboards**
- [ ] Staff dashboard shows pending questions prominently
- [ ] Staff dashboard shows "Report Incident" as the primary action
- [ ] Admin dashboard shows red alerts and urgent items first
- [ ] Admin daily brief appears on first login of the day

**Assessments**
- [ ] Activity assessment completes start-to-finish by voice
- [ ] Dietary assessment completes start-to-finish by voice
- [ ] Assessment due reminders appear on staff dashboard
- [ ] Assessment linked to resident in Resident Story

**PWA**
- [ ] App installs to home screen on iOS
- [ ] App installs to home screen on Android
- [ ] Offline page appears when network drops
- [ ] Queued offline reports sync when connectivity resumes
- [ ] Push notifications received on iOS and Android

**Pilot Experience**
- [ ] Demo mode works with realistic seed data
- [ ] Nurse feedback (thumbs up/down) captured after each report
- [ ] Sentry capturing errors without PHI
- [ ] Loading skeletons show on slow connections

---

## 15-MINUTE PILOT DEMO SCRIPT

Every minute shows something the audience has never seen before.

**(0:00–2:00) The Nurse Reports**
Open WAiK on iPhone. Tap "Report Incident." Speak naturally about Mrs. Chen's fall. Show the voice wave animation and the conversation building in real time.

**(2:00–4:00) WAiK Asks**
Show WAiK identifying the incident as a wheelchair fall. Watch it ask 3 targeted questions. Nurse answers casually. Show completeness bar going from 40% → 85%. Phase 1 complete.

**(4:00–5:00) The Transformation**
Show the raw narrative side-by-side with the clinical record. "This is what she said. This is what the record says. Both preserved."

**(5:00–7:00) The Administrator's View**
Switch to admin dashboard on a tablet. Show the Phase 2 notification arrived. DON claims the investigation. Assigns tasks to the dietitian and PT.

**(7:00–9:00) The Investigation Closes**
Show the dietitian responding to their assigned question. DON reviews findings, adds root cause, signs and closes. Clinical record is complete. Permanent. Queryable.

**(9:00–11:00) WAiK Intelligence**
Admin types: "Are there any residents with both a fall and a declining dietary assessment this month?" Results appear in 3 seconds. Click through to Mrs. Chen's Resident Story.

**(11:00–13:00) The Resident Story**
Show Mrs. Chen's full profile — linked incidents, assessment timeline, notes from three different staff members. MDS recommendation flagged: "Respiratory assessment data supports enhanced reimbursement coding."

**(13:00–15:00) The Assessment**
Back to staff view. Nurse opens dietary assessment for Mrs. Rivera. Speaks naturally. WAiK guides with 4 questions. Structured output appears — ready for MDS coordinator review. Next assessment automatically scheduled in 90 days.

**Close:** "Everything you just saw runs on a phone. No integration with your EHR required. No IT project. One session to onboard your staff. Conversations not Checkboxes."

---

## WHAT YOUR PILOT DATA NEEDS TO PROVE

When the pilot ends, you need to walk into your next conversation with five numbers:

1. **Average time to complete Phase 1** — target: under 10 minutes
2. **Average report completeness score** — target: above 85%
3. **Phase 2 close rate** — % of Phase 1 incidents that successfully closed Phase 2
4. **Staff feedback score** — average of thumbs up/down ratings
5. **At least one documented MDS recovery dollar amount** — even one example makes the business case

Everything else is anecdote. These five numbers are proof.

---

## PHASE 7 — NAVIGATION, INTELLIGENCE & HISTORY (Additional Prompts)

### PROMPT 14 — Navigation Architecture + Incident History for All Users

```
I'm building WAiK on Next.js 14. I need to implement the final navigation architecture and give all users — including frontline staff — access to their incident history and currently active reports.

NAVIGATION STRUCTURE:

STAFF NAVIGATION (mobile bottom bar — 4 tabs max):
Tab 1: Home (/staff/dashboard)
Tab 2: Incidents (/staff/incidents) — list + "Report Incident" action button
Tab 3: Assessments (/staff/assessments) — list + "Start Assessment" action button
Tab 4: Intelligence (/staff/intelligence) — community WAiK Intelligence

Plus: profile icon in top-right header → /staff/profile

ADMIN NAVIGATION (top bar — horizontal):
Dashboard | Incidents | Assessments | Residents | Intelligence | Settings

Plus: notification bell icon → /admin/notifications
Plus: profile/avatar → /admin/profile

1. Create a shared layout component for staff: components/layouts/staff-layout.tsx
   - Bottom tab bar with the 4 tabs above
   - Active tab highlighted in teal
   - Top header: WAiK logo left, profile avatar right
   - Shows "DEMO MODE" banner if facilityId === "demo"
   - Shows notification badge (red dot) on the bell if unread notifications exist

2. Create a shared layout component for admin: components/layouts/admin-layout.tsx
   - Top navigation bar with the items above
   - Notification bell with unread count badge
   - Collapsible sidebar on mobile
   - Active section highlighted

3. Create app/staff/incidents/page.tsx — Staff Incident History:

   TOP — Primary Action Card (always visible):
   Large teal card: "Report a New Incident"
   Subtitle: "Voice report in 5 minutes"
   → navigates to /staff/report

   SECTION 1 — Currently In Progress
   Heading: "Active right now"
   Shows incidents where:
   - staffId === currentUser.userId AND phase !== "closed"
   - OR the user has unanswered questions assigned to them (regardless of who reported)
   Each card: resident name, incident date, phase badge, completeness bar, pending question count
   "Continue" button → /staff/incidents/[id]

   SECTION 2 — My Report History
   Heading: "My reports"
   All incidents reported by this user, sorted newest first
   Filter tabs: All | Open | In Progress | Closed
   Each row: resident name, date, incident type, phase, completeness score
   Tap to view full report → /staff/incidents/[id]

   SECTION 3 — Assigned to Me
   Heading: "Questions assigned to me"
   Incidents where this user has been assigned Phase 2 questions (IDT tasks)
   Even if they didn't file the original report
   "Answer" button per item

4. Create app/staff/incidents/[id]/page.tsx — Staff Incident Detail View:

   This is the read-only view for a staff member to see the full lifecycle of their report.
   
   SECTION 1 — What You Reported
   Original narrative (verbatim, clearly labeled "Your exact words")
   WAiK's clinical record (labeled "Official clinical record")
   Side-by-side or toggle view
   
   SECTION 2 — Questions & Answers
   All Phase 1 Q&A (answered by the nurse)
   Each question: the text, the answer, when it was answered
   Any unanswered questions show a yellow "Needs your answer" tag with an "Answer Now" button
   
   SECTION 3 — Investigation Status (read-only for staff)
   Current phase badge
   Who claimed the investigation (DON/admin name)
   IDT team tasks — show status but not the content if visibility is admin_only
   Expected completion (if set)
   
   SECTION 4 — Outcome (shown only when closed)
   Root cause (if visibility allows)
   Care plan update (if visibility allows)
   "This report is closed and complete."

5. Create app/staff/assessments/page.tsx — Staff Assessment History:

   TOP — Action Card:
   Two buttons side by side: "Activity Assessment" | "Dietary Assessment"
   Both with voice icon and subtitle "Conversational, ~10 minutes"

   SECTION 1 — Due Soon
   Assessments due in the next 7 days for residents on this staff member's caseload
   Each: resident name, assessment type, due date, days remaining
   "Start Now" button

   SECTION 2 — My Assessment History
   All assessments conducted by this user
   Filter: All | Activity | Dietary
   Each: resident name, type, date, completeness score, next due
   Tap to view → /staff/assessments/[id]

Do not change the voice report flow or agent logic.
```

---

### PROMPT 15 — Community WAiK Intelligence (All Users)

```
I'm building WAiK on Next.js 14. I need to add community-level WAiK Intelligence accessible to all users — both staff and admins — but scoped appropriately by role.

CONTEXT:
There are two levels of WAiK Intelligence:
1. INCIDENT-LEVEL: Already exists at /admin/incidents/[id] — focused on one incident
2. COMMUNITY-LEVEL: New — queries across all incidents, assessments, and residents in a facility

WHAT I NEED:

1. Create app/staff/intelligence/page.tsx — Staff Intelligence View:

   Staff intelligence is scoped to data they have access to:
   - Their own incidents
   - Incidents for residents they've worked with
   - Community-level patterns (anonymized — no names for residents they haven't worked with)
   - Assessment trends

   Layout:
   Header: "WAiK Intelligence" with subtitle "Ask questions about your reports and your residents"
   
   Search bar: "Ask anything..."
   
   Suggested questions for staff:
   - "How have my report completeness scores changed this month?"
   - "What questions am I most often missing in my reports?"
   - "Show me all my reports for Mrs. Chen"
   - "What incidents have I reported in the last 30 days?"
   - "Are there patterns in the incidents I've reported?"
   
   Results display:
   - Plain language response
   - Any linked incident IDs are clickable
   - Data tables when relevant
   
   Staff scope enforcement: API must filter all queries to only return data
   where staffId === currentUser.userId OR residentId is in their assigned residents

2. Create app/admin/intelligence/page.tsx — Admin Intelligence View:

   Admin intelligence sees everything in the facility.
   
   Header: "WAiK Intelligence" with subtitle "Your community's institutional memory"
   
   TWO SECTIONS on the page:

   SECTION A — Ask Anything (RAG query interface):
   Same search bar as staff view but with full facility scope
   
   Suggested questions for admins:
   - "What are the most common fall locations this month?"
   - "Which residents have had more than 2 incidents in the last 30 days?"
   - "Show me all open investigations older than 48 hours"
   - "What environmental factors appear most often in fall incidents?"
   - "Which staff members have the highest average report completeness?"
   - "Are there any residents with both a fall incident and a declining dietary assessment?"
   - "What is our average time to close an investigation this quarter?"
   - "Which wing has the most incidents?"
   
   SECTION B — Saved Insights (persistent, no prompt required):
   These run automatically and refresh daily. Show as cards:
   
   Card 1: "This Week at a Glance"
   - X incidents reported, X investigations closed, X assessments completed
   - vs. last week (up/down arrows)
   
   Card 2: "Completeness Trend"
   - Simple sparkline of average completeness score per week for last 8 weeks
   
   Card 3: "Attention Needed"
   - Auto-generated: any pattern that looks like it needs attention
   - "3 falls in Wing B in the last 7 days — above your 30-day average"
   - "Mrs. Torres has had 3 incidents this month — consider care plan review"
   
   Card 4: "Staff Performance"
   - Top 3 staff by completeness score (anonymized label: "Staff A, B, C" unless admin)
   - Any staff with dramatically lower scores (coaching opportunity)

3. Create API route POST /api/intelligence/query:
   Body: { query: string, facilityId: string, scope: "full" | "staff", userId?: string }
   
   Calls lib/agents/intelligence-qa.ts (already built) with:
   - facilityId filter always enforced
   - If scope === "staff": additional filter on staffId or assigned residents
   - Returns: { response: string, relatedIncidentIds: string[], relatedResidentIds: string[], dataTable?: object }
   
   Never return cross-facility data regardless of scope.

4. Create API route GET /api/intelligence/saved-insights?facilityId=X:
   Runs the 4 auto-insight queries and returns results
   Cache results in Redis for 1 hour (key: "waik:insights:{facilityId}")
   Return cached if fresh, regenerate if stale
   
   The 4 queries to run:
   - Weekly summary: count incidents/assessments/closures vs prior week
   - Completeness trend: average score per week for last 8 weeks
   - Anomaly detection: any location/resident/shift with incident rate > 2x the 30-day average
   - Staff completeness: per-staff average scores, flag anyone > 15 points below facility average

5. Update existing lib/agents/intelligence-qa.ts and intelligence-tools.ts:
   Add facilityId as a required parameter to all tool calls
   Add staffId as an optional filter parameter
   Ensure every MongoDB query in the tools includes facilityId in the where clause
```

---

### PROMPT 16 — Notification Center

```
I'm building WAiK on Next.js 14. I need to add a persistent notification center — an in-app inbox that all users can check, separate from push notifications.

This is distinct from push notifications (which go to the device). The notification center is the persistent feed inside the app that users check when they open WAiK. Think of it as the bell icon + dropdown that every modern SaaS app has.

WHAT I NEED:

1. Create backend/src/models/notification.model.ts (update existing):
   The existing model has: id, incidentId, type, message, createdAt, readAt, targetUserId
   
   Add these fields:
   - facilityId: string (for multi-tenant filtering)
   - actionUrl: string (deep link to the relevant resource)
   - category: "incident" | "assessment" | "investigation" | "system" | "intelligence"
   - priority: "urgent" | "normal" | "low"
   - actorName: string (who triggered this — e.g. "Sarah M. reported an incident")
   - isArchived: boolean (default false)

2. Create API routes:
   - GET /api/notifications?userId=X&facilityId=Y&unreadOnly=false — list notifications
   - PATCH /api/notifications/[id]/read — mark single as read
   - PATCH /api/notifications/read-all — mark all as read for this user
   - PATCH /api/notifications/[id]/archive — archive a notification
   - GET /api/notifications/count?userId=X&facilityId=Y — just returns { unread: number }

3. Create components/notification-center.tsx:
   A bell icon button that opens a popover/dropdown panel
   Shows unread count badge (red dot with number, max "9+")
   Polls /api/notifications/count every 60 seconds to update the badge
   
   The panel (opens on bell click):
   Header: "Notifications" | "Mark all read" button | "View all" link
   
   Shows last 10 notifications grouped by today / yesterday / older
   Each notification:
   - Category icon (🚨 incident, 📋 assessment, 🔍 investigation, 💡 intelligence)
   - Message text (e.g. "Mrs. Chen's fall investigation was closed by Dr. Sarah M.")
   - Time ago (e.g. "2 hours ago")
   - Unread dot (teal) if not read
   - Tap/click → navigates to actionUrl and marks as read
   
   "View all notifications" → /staff/notifications or /admin/notifications (full page)

4. Create app/staff/notifications/page.tsx and app/admin/notifications/page.tsx:
   Full notification history page
   Filter tabs: All | Unread | Incidents | Assessments | System
   Each notification as a full row with all details
   "Mark all read" and "Archive read" bulk actions
   Infinite scroll or pagination (20 per page)

5. Create lib/notification-service.ts — centralized notification creation:
   createNotification({ targetUserIds, facilityId, category, priority, message, actionUrl, actorName })
   
   Handles:
   - Saving to MongoDB NotificationModel
   - Triggering push notification if user has active subscription and category priority is "urgent"
   - Does NOT send push for "normal" or "low" priority (inbox only)
   
   Replace all existing scattered notification creation calls with this service.

6. Define the full notification event catalog — call createNotification at these points:

   URGENT (inbox + push):
   - Incident Phase 1 complete → notify all DON/admin: "New investigation ready — [resident]"
   - Red flag detected (injury) → notify all DON/admin: "⚠️ Injury reported — [resident]. State report may be required."
   - Phase 2 task overdue > 24h → notify investigator: "Investigation task overdue — [incident]"

   NORMAL (inbox only):
   - Investigation closed → notify original reporter: "Your report for [resident] was reviewed and closed."
   - Question answered by another staff → notify investigator: "[Staff name] answered a question on [incident]"
   - Assessment due in 3 days → notify assigned staff: "Assessment due soon for [resident]"
   - New staff member joined → notify DON/admin: "[Name] joined the team as [role]"
   - WAiK Intelligence insight generated → notify admin: "New weekly insight available"

   LOW (inbox only, no push):
   - Report completeness score available → notify reporter: "Your report scored [X]%"
   - Incident passed 7 days open → notify admin: "[Incident] has been open for 7 days"
```

---

### PROMPT 17 — Bulk Import: Staff + Residents

```
I'm building WAiK on Next.js 14. I need to add bulk import functionality for staff and residents — CSV/Excel upload that creates accounts and profiles without manual entry.

This is critical for pilot onboarding. A community should be able to go from zero to fully set up in under 30 minutes.

PART A — BULK STAFF IMPORT

1. Create app/admin/settings/staff/import/page.tsx:

   STEP 1 — Upload:
   Drag-and-drop zone that accepts CSV or Excel (.xlsx) files
   "Download template" button → downloads a pre-formatted CSV with headers:
   first_name, last_name, email, role, phone (optional)
   
   Show accepted role values in a helper text below the upload zone.

   STEP 2 — Preview:
   After upload, parse the file client-side and show a preview table:
   Columns: First Name | Last Name | Auto-Generated Username | Email | Role | Status
   
   Auto-generate username as: first_name.last_name (lowercase, spaces → underscores)
   Handle duplicates: if maria.rodriguez exists, show maria.rodriguez2
   
   Row validation — flag rows with:
   - Missing required fields (first_name, last_name, email, role) → red row
   - Invalid email format → red row
   - Invalid role value → red row  
   - Email already exists in this facility → yellow row ("already has an account")
   
   Show summary: "X staff will be created, Y have errors, Z already exist"
   "Fix errors" guidance below any red rows
   
   STEP 3 — Confirm & Import:
   "Create [X] staff accounts" button (disabled if any red rows)
   
   On confirm: POST /api/admin/staff/bulk-import
   Show a progress bar as accounts are created (stream the response)
   On completion: show results — how many succeeded, any that failed

2. Create POST /api/admin/staff/bulk-import:
   Accepts array of validated staff records
   For each record:
   - Generate username: first_name.last_name (handle duplicates with incrementing suffix)
   - Generate temporary password: WAiK + random 6-digit number (e.g. WAiK847291)
   - Create user in MongoDB UserModel with hashed password
   - Store { facilityId, orgId, role } in user record
   - Create Clerk user account with the email (invite flow, not password-based in Clerk)
   - Send welcome email with username and temporary password
   - Flag account as "must change password on first login"
   
   Welcome email content:
   Subject: "Welcome to WAiK — Your login details"
   Body:
   "You've been added to WAiK by [Community Name].
   Username: [username]
   Temporary password: [password]
   Login at: [app URL]
   You will be asked to create a new password on your first login.
   Questions? Contact [admin name]."
   
   Return: { created: number, failed: number, errors: string[] }

3. Force password change on first login:
   Add mustChangePassword: boolean to UserModel (default false, set true for bulk-imported users)
   In middleware.ts: if user is authenticated AND mustChangePassword is true, redirect to /change-password
   Create app/change-password/page.tsx: simple form with new password + confirm
   On submit: update password in MongoDB + Clerk, set mustChangePassword = false

PART B — BULK RESIDENT IMPORT

4. Create app/admin/residents/import/page.tsx:

   Same 3-step flow as staff import.
   
   Template CSV headers:
   first_name, last_name, preferred_name (optional), room_number, wing (optional),
   date_of_birth (MM/DD/YYYY), gender (M/F/Other), admission_date (MM/DD/YYYY),
   care_level (independent/assisted/memory_care/skilled_nursing),
   primary_diagnosis (optional), emergency_contact_name (optional),
   emergency_contact_phone (optional), emergency_contact_relationship (optional)
   
   Row validation:
   - Required: first_name, last_name, room_number, care_level
   - date_of_birth and admission_date must be valid dates in MM/DD/YYYY format
   - care_level must be one of the four valid values
   - room_number must be unique within facility (flag duplicates as yellow warning)
   
   Preview table shows:
   Full Name | Room | Care Level | DOB | Admission Date | Status
   
   Duplicate detection: if a resident with same name AND room already exists, mark as "already exists — will skip"

5. Create POST /api/admin/residents/bulk-import:
   Validates all records server-side (second validation pass)
   Creates ResidentModel documents for each valid row
   All linked to facilityId from authenticated user
   Returns: { created: number, skipped: number, failed: number, errors: string[] }

6. Add "Import Residents" button to app/admin/residents/page.tsx next to "Add Resident"
   Add "Import Staff" button to app/admin/settings/staff/page.tsx

7. Create a reusable CSV/Excel parser utility lib/import-parser.ts:
   parseFile(file: File): Promise<Record<string, string>[]>
   Handles both CSV and .xlsx using the papaparse and xlsx libraries
   npm install papaparse xlsx @types/papaparse
   Returns normalized array of objects with lowercase keys
   Trims whitespace from all values
   Handles BOM characters in CSV (common in Excel exports)
```

---

## UPDATED NAVIGATION SPEC

### Staff Navigation (Final)

**Bottom tab bar — 4 items (mobile):**

| Tab | Route | Icon | Badge |
|---|---|---|---|
| Home | /staff/dashboard | 🏠 | Pending questions count |
| Incidents | /staff/incidents | 📋 | Unanswered questions |
| Assessments | /staff/assessments | 📝 | Due this week |
| Intelligence | /staff/intelligence | 💡 | — |

**Top header (all staff pages):**
WAiK logo (left) | Notification bell with unread count (right) | Avatar/profile (far right)

**"Report Incident" is NOT a nav tab.** It lives as the primary action button at the top of /staff/incidents. Same for "Start Assessment" on /staff/assessments. This keeps the nav clean and the action prominent in context.

---

### Admin Navigation (Final)

**Top horizontal bar:**

| Item | Route | Notes |
|---|---|---|
| Dashboard | /admin/dashboard | Command center |
| Incidents | /admin/incidents | Full incident pipeline |
| Assessments | /admin/assessments | All assessments + due tracker |
| Residents | /admin/residents | Resident Story |
| Intelligence | /admin/intelligence | Community-level RAG |
| Settings | /admin/settings | Facility, staff, notifications |

**Top right:** Notification bell | Avatar → profile/logout

---

### Permission Matrix — Who Sees What

| Feature | CNA/Staff | RN/LPN | Head Nurse | DON | Administrator | Owner |
|---|---|---|---|---|---|---|
| Report incident | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own incidents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all facility incidents | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Conduct assessments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all assessments | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Claim Phase 2 investigation | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Close investigation (sign) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| View Resident Story | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Staff Intelligence (own data) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Community Intelligence | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Invite staff | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage roles | ❌ | ❌ | ❌ | limited | ✅ | ✅ |
| Bulk import | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Settings | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| WAiK super-admin | ❌ | ❌ | ❌ | ❌ | ❌ | WAiK team only |

---

## UPDATED PILOT READINESS CHECKLIST ADDITIONS

**Navigation**
- [ ] Staff bottom nav works on iPhone — all 4 tabs accessible with one thumb
- [ ] Admin top nav collapses cleanly on mobile
- [ ] Notification bell shows correct unread count
- [ ] Notification center opens and marks items as read

**Incident History**
- [ ] Staff can see their own report history with phase status
- [ ] Staff can see incidents assigned to them (Phase 2 tasks) even if not their report
- [ ] Admin can see all facility incidents filtered by phase
- [ ] Permission matrix enforced — CNA cannot see other staff incidents

**Intelligence**
- [ ] Staff intelligence scoped to own data only
- [ ] Admin intelligence queries full facility data
- [ ] Saved insights (4 auto-cards) load on admin intelligence page
- [ ] All queries return facility-scoped results only — never cross-facility

**Bulk Import**
- [ ] Staff CSV import creates accounts and sends welcome emails
- [ ] Duplicate username handling works (maria.rodriguez → maria.rodriguez2)
- [ ] First-login password change enforced for imported staff
- [ ] Resident CSV import creates resident profiles with all fields
- [ ] Duplicate resident detection shows warning before import

**Notifications**
- [ ] Notification center shows correct categorized feed
- [ ] Urgent notifications also trigger push
- [ ] "Mark all read" works
- [ ] Notification deep links navigate to the correct resource

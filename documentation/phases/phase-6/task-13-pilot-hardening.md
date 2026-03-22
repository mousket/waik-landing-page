# Task: Pilot Hardening, Feedback & Demo Mode
## Phase: 6
## Depends On: task-12-push-notifications
## Estimated Time: 6 hours

## Context Files
- app/staff/report/page.tsx (completeness bar, feedback survey)
- app/admin/incidents/[id]/report/page.tsx (create)
- app/api/feedback (create)
- backend/src/models/feedback.model.ts (create)
- app/waik-demo-start/login/page.tsx (update)
- data/db.json (create seed data)
- package.json (add @sentry/nextjs)
- Dashboard pages (loading skeletons)

## Success Criteria
- [ ] Live completeness bar during agent phase in staff report
- [ ] Printable closure report page; Download Report link in admin incident view
- [ ] Feedback: "Was WAiK helpful?" + optional comment → POST /api/feedback; model and super-admin summary
- [ ] Demo mode: 4 role buttons; seed data from data/db.json; DEMO MODE banner; 30-min expiry
- [ ] Sentry installed; API/agent/Redis/ErrorBoundary errors captured; no PHI in context
- [ ] Loading skeletons on staff and admin dashboards

## Test Cases
- Completeness bar updates after each answered question
- Submit feedback → stored; appears in super-admin summary
- Demo login loads seed data; no MongoDB writes for report
- Sentry receives error without resident names/narrative

## Implementation Prompt

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

# Task 14 — Navigation Architecture + Incident & Assessment History for All Users
## Phase: 7 — Navigation, Intelligence & Imports
## Estimated Time: 5–6 hours
## Depends On: task-05, task-06, task-07

---

## Why This Task Exists

The navigation built in tasks 05 and 06 was scaffolded as part of the
dashboard rebuild. This task completes it — establishing the full final
navigation spec, giving all users access to their history, and ensuring
staff can see what is currently in motion for incidents they're involved in
regardless of whether they filed the original report.

---

## Success Criteria

- [ ] Staff bottom nav has exactly 4 tabs: Home, Incidents, Assessments, Intelligence
- [ ] Admin top nav has: Dashboard, Incidents, Assessments, Residents, Intelligence, Settings
- [ ] Both navs show notification bell with unread count
- [ ] `app/staff/incidents/page.tsx` shows 3 sections: Active, My History, Assigned to Me
- [ ] Staff can see incidents assigned to them even if they didn't file the original report
- [ ] `app/staff/incidents/[id]/page.tsx` shows full incident lifecycle read-only
- [ ] Unanswered Phase 1 questions show "Answer Now" button on staff incident detail
- [ ] Phase 2 content respects visibility (admin_only notes not shown to staff)
- [ ] `app/staff/assessments/page.tsx` shows due assessments and history
- [ ] `app/admin/incidents/page.tsx` shows full pipeline with phase filters

---

## Test Cases

```
TEST 1 — Staff sees assigned Phase 2 task
  Setup: Create incident filed by Nurse A; assign IDT task to Nurse B
  Action: Log in as Nurse B; check /staff/incidents
  Expected: That incident appears in "Assigned to Me" section
  Pass/Fail: ___

TEST 2 — Staff cannot see other staff's incidents
  Setup: Create incident filed by Nurse A
  Action: Log in as Nurse B; check /staff/incidents "My History"
  Expected: Nurse A's incident does NOT appear
  Pass/Fail: ___

TEST 3 — Admin-only note hidden from staff
  Setup: Add note with visibility "admin_only" to an incident
  Action: Log in as staff, view incident detail
  Expected: That note is not visible
  Pass/Fail: ___

TEST 4 — Answer Now button on unanswered question
  Setup: Create incident with unanswered Phase 1 question for current user
  Action: View /staff/incidents/[id]
  Expected: "Answer Now" button appears next to the unanswered question
  Pass/Fail: ___

TEST 5 — Completed incident shows "closed" state
  Setup: Close an incident
  Action: View /staff/incidents/[id] as the original reporter
  Expected: "This report is closed and complete" shown; no open questions
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm completing the navigation architecture for WAiK (Next.js 14) and building full incident/assessment history pages for all users.

FINAL NAVIGATION SPEC:

STAFF — app/staff/layout.tsx:
Bottom fixed tab bar (4 tabs):
  🏠 Home → /staff/dashboard (badge: pending question count)
  📋 Incidents → /staff/incidents (badge: unanswered questions)
  📝 Assessments → /staff/assessments (badge: due this week)
  💡 Intelligence → /staff/intelligence
Top header: WAiK logo left, notification bell right (→ /staff/notifications), avatar far right (→ /staff/profile)
"Report Incident" is NOT a tab — it lives as a primary action button on /staff/incidents

ADMIN — app/admin/layout.tsx:
Top horizontal nav: Dashboard | Incidents | Assessments | Residents | Intelligence | Settings
Right: notification bell with count, avatar → /admin/profile

CREATE app/staff/incidents/page.tsx:

TOP — Primary Action Card:
Large teal card: "Report a New Incident" with microphone icon
Subtitle: "Voice report in 5 minutes"
→ /staff/report

SECTION 1 — Currently In Progress:
Heading: "Active right now"
Show incidents where: staffId === currentUser.userId AND phase !== "closed"
PLUS: incidents where this user has assigned IDT tasks (regardless of who filed)
For each: resident name, incident date, phase badge, completeness bar, pending question count
"Continue" button → /staff/incidents/[id]

SECTION 2 — My Report History:
Heading: "My reports"
All incidents where staffId === currentUser.userId, newest first
Filter tabs: All | Open | In Progress | Closed
Each row: resident name, date, incident type badge, phase color dot, completeness score
Tap row → /staff/incidents/[id]

SECTION 3 — Questions Assigned to Me:
Heading: "Tasks assigned to me"
Incidents where current user appears in investigation.idtTeam with status "pending"
Even if they didn't file the original report
"Answer" button → /staff/incidents/[id]

CREATE app/staff/incidents/[id]/page.tsx — Staff incident read-only view:

Section 1 — What You Reported:
Side-by-side toggle: "Your original words" | "Official clinical record"
The raw narrative and clinical record from initialReport

Section 2 — Questions & Answers:
All Phase 1 Q&A listed
Unanswered questions: yellow badge "Needs your answer" + "Answer Now" inline button
Answered questions: green check, answer text, timestamp

Section 3 — Investigation Status (read-only, limited visibility):
Current phase badge
Investigator name (if claimed)
IDT team tasks: show status but hide admin_only content
If phase === "closed": "Investigation complete" banner with close date

Section 4 — Outcome (only when phase === "closed"):
Root cause (if visibility allows)
Care plan update (if visibility allows)
"This report is closed and archived."

CREATE app/staff/assessments/page.tsx:

TOP — Two Action Buttons:
"Activity Assessment" (with voice icon) → /staff/assessments/activity
"Dietary Assessment" (with voice icon) → /staff/assessments/dietary

SECTION 1 — Due Soon:
Assessments where next_due_at is within 7 days
Each: resident name, type, due date, days remaining
"Start Now" → /staff/assessments/[type]?residentId=X&residentName=Y

SECTION 2 — My Assessment History:
All assessments by this user, newest first
Filter: All | Activity | Dietary
Each row: resident name, type badge, date, completeness score, next due date
Tap → /staff/assessments/[id] (read-only view of completed assessment)

CREATE app/admin/incidents/page.tsx — Admin full incident pipeline:
Table with full pipeline view — all facility incidents
Columns: Resident | Phase | Completeness | Reported By | Days Open | Actions
Filter select: All Phases | Phase 1 | Phase 2 | Closed
Filter select: All Time | Last 7 days | Last 30 days | Last 90 days
Search input: resident name or incident ID
"View" button → /admin/incidents/[id]
"New Incident" button → /staff/report (admin can also file reports)

All data fetching must use getCurrentUser() and facilityId enforcement.
Notes with visibility "admin_only" must never appear in staff views.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_7/task-14-DONE.md`

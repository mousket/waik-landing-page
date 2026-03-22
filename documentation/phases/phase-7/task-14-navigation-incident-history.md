# Task: Navigation Architecture + Incident History for All Users
## Phase: 7
## Depends On: task-13-pilot-hardening
## Estimated Time: 6 hours

## Context Files
- components/layouts/staff-layout.tsx (create)
- components/layouts/admin-layout.tsx (create)
- app/staff/incidents/page.tsx (create)
- app/staff/incidents/[id]/page.tsx (create/update)
- app/staff/assessments/page.tsx (create)

## Success Criteria
- [ ] Staff layout: bottom tab bar (Home, Incidents, Assessments, Intelligence), header with profile; DEMO banner when facilityId demo
- [ ] Admin layout: top nav (Dashboard, Incidents, Assessments, Residents, Intelligence, Settings), notification bell, collapsible mobile
- [ ] Staff incidents page: Report card, Active, My Report History (filter tabs), Assigned to Me
- [ ] Staff incident detail: What You Reported, Q&A, Investigation Status (read-only), Outcome when closed
- [ ] Staff assessments page: Activity/Dietary buttons, Due Soon, My Assessment History

## Test Cases
- Staff bottom nav highlights active tab; all 4 tabs navigate correctly
- Staff incidents list shows own reports and assigned questions
- Staff incident detail shows narrative + clinical record + Q&A; Answer Now for unanswered

## Implementation Prompt

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

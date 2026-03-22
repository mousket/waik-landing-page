# Task: Rebuild Staff Dashboard (Mobile-First)
## Phase: 3
## Depends On: task-04-pwa-foundation
## Estimated Time: 5 hours

## Context Files
- app/staff/dashboard/page.tsx (replace)

## Success Criteria
- [ ] Hero: "Report Incident" primary button → /staff/report; pending report banner if applicable
- [ ] My Pending Questions section with count, cards, "Answer Now"
- [ ] My Recent Reports (last 5), phase dots, "View all"
- [ ] Upcoming Assessments section
- [ ] Completeness score card (30-day average, color by score)
- [ ] Bottom nav: Home | Report | My Incidents | Profile
- [ ] Data from /api/staff/incidents, /api/assessments/due

## Test Cases
- Staff dashboard loads with pending questions and recent reports
- Tap "Report Incident" → navigates to /staff/report
- Empty state for no pending questions shows "You're all caught up"

## Implementation Prompt

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

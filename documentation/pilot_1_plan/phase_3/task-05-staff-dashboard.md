# Task 05 — Rebuild Staff Dashboard (Mobile-First)
## Phase: 3 — Dashboard Rebuilds
## Estimated Time: 5–6 hours
## Depends On: task-04 (PWA), task-03 (VoiceInputScreen component)

---

## Why This Task Exists

The current staff dashboard is a flat incident list. A nurse opening WAiK at
6am has thirty seconds and two needs: is anything urgent, and how do I report
what just happened. A list that requires scanning and filtering before acting is
the wrong tool for that moment.

This rebuild reimagines the dashboard around that thirty-second reality. It
also introduces the performance and coaching layer — the streak indicator,
personal average, and completeness history that Scott described as making
nurses want to compete with each other in a good way. That coaching layer is
what turns a documentation tool into something people actually invest in
getting better at.

This task implements Screen 10 of the UI Specification (Pass 2, page 1).

---

## Context Files

- `app/staff/dashboard/page.tsx` — full replacement
- `app/staff/layout.tsx` — bottom tab bar + top header
- `lib/auth.ts` — getCurrentUser() for userId, facilityId, role
- `app/api/staff/incidents/route.ts` — primary data source
- `app/api/assessments/due/route.ts` — due assessments
- `components/voice-input-screen.tsx` — built in task-03, reference for component patterns

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] "Report Incident" button visible without scrolling on 375px viewport
- [ ] Amber "continue" banner appears when nurse has in-progress incident
- [ ] Pending questions section shows question count badge per incident card
- [ ] Pending questions sorted oldest-first
- [ ] Each pending question card shows: resident room, incident type, time elapsed, question count, completion ring, Continue Report button
- [ ] Empty state: green "all caught up" card when no pending questions
- [ ] Recent reports shows last 5 incidents with phase color dots
- [ ] Phase dots: amber = phase_1_in_progress, yellow = phase_1_complete, blue = phase_2_in_progress, green = closed
- [ ] Upcoming assessments section hidden when nothing due this week
- [ ] Performance card collapsed by default showing single large average score
- [ ] Performance card expands to show: month comparison with arrow, current streak, best streak, View full analysis link
- [ ] Streak indicator shows fire emoji and count when streak ≥ 3
- [ ] Completeness score color: teal ≥ 85%, amber 60-84%, red < 60%
- [ ] Bottom tab bar: 4 tabs with correct routes, active tab teal
- [ ] Tab badges: Home shows unanswered question count, Incidents shows unanswered count, Assessments shows due-this-week count
- [ ] Top header: WAiK logo, notification bell with unread count, avatar
- [ ] Skeleton loaders visible on Slow 3G before data loads
- [ ] All touch targets minimum 48px height

---

## Test Cases

```
TEST 1 — Primary action visible without scroll
  Action: Open dashboard on 375px viewport (iPhone SE)
  Expected: Report Incident button in first viewport, no scroll needed
  Pass/Fail: ___

TEST 2 — Amber continue banner triggers correctly
  Setup: Create incident with staffId = currentUser, phase = phase_1_in_progress
  Action: Load dashboard
  Expected: Amber banner "You have an unfinished report" visible above hero card
  Pass/Fail: ___

TEST 3 — Question count badge on pending card
  Setup: Create incident with 4 unanswered Tier 2 questions for currentUser
  Action: Load dashboard
  Expected: Card shows "4 questions remaining" badge
  Pass/Fail: ___

TEST 4 — Pending questions sorted oldest-first
  Setup: Incident A created 3 hours ago (unanswered), Incident B created 1 hour ago
  Action: Load dashboard
  Expected: Incident A appears above Incident B
  Pass/Fail: ___

TEST 5 — Empty state renders correctly
  Setup: Ensure no unanswered questions for current user
  Action: Load dashboard
  Expected: Green "No pending questions — you are all caught up" card
  Pass/Fail: ___

TEST 6 — Phase dot colors correct
  Setup: Create incidents in each phase
  Expected: phase_1_in_progress = amber, phase_1_complete = yellow,
            phase_2_in_progress = blue, closed = green
  Pass/Fail: ___

TEST 7 — Performance card collapsed by default
  Action: Load dashboard, look at performance section
  Expected: Single large number visible, not expanded details
  Pass/Fail: ___

TEST 8 — Performance card expands on tap
  Action: Tap performance card
  Expected: Month comparison, current streak, best streak, View link all visible
  Pass/Fail: ___

TEST 9 — Streak indicator appears at 3+ consecutive
  Setup: Mock staffCompletionHistory with 4 reports above 85%
  Expected: "🔥 4-report streak" visible in expanded performance card
  Pass/Fail: ___

TEST 10 — Tab badges correct
  Setup: Create 3 unanswered questions for current user, 2 assessments due this week
  Action: Look at tab bar
  Expected: Home badge = 3, Incidents badge = 3, Assessments badge = 2
  Pass/Fail: ___

TEST 11 — Skeleton loaders visible
  Action: Throttle to Slow 3G, load dashboard
  Expected: Skeleton cards visible before real data loads
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm rebuilding the staff dashboard for WAiK (Next.js 14, App Router) as a
mobile-first experience matching UI Specification Screen 10. This is the home
screen every frontline staff member sees when they open WAiK.

PERSONA: Nurse opening WAiK at 6am on her iPhone. 30 seconds. Two needs:
is anything urgent, and how do I report what just happened.

DESIGN: Mobile-first single column. Teal (#0D7377) and dark (#0A3D40) colors.
Existing shadcn/ui components. Minimum 48px touch targets. Skeleton loaders.

PART A — REPLACE app/staff/dashboard/page.tsx

SECTION 1 — HERO ACTION (sticky, always first):
Full-width teal card with:
- Large button: "🎤  Report Incident" → /staff/report
- Subtitle: "Start a voice report in under 10 minutes"
- If any incident exists where staffId === userId AND phase contains "in_progress":
  Show amber banner ABOVE the card: "You have an unfinished report. Tap to continue."
  linking to /staff/incidents/[that-incident-id]

SECTION 2 — PENDING QUESTIONS:
Heading: "Questions waiting for you" — red badge showing total unanswered count.
Only show section when count > 0.

Each card shows:
  - Resident room number and incident type badge
  - Time elapsed since incident started ("3 hours ago" format using date-fns)
  - Question count badge: "4 questions remaining" (red badge)
  - Completion ring (circular progress, teal, shows percentage numerically)
  - "Continue Report" button → /staff/incidents/[id]

Sort: oldest createdAt first (most urgent at top).
Empty state (count = 0): green card with checkmark: "No pending questions — you are all caught up."
Show Skeleton cards (shadcn Skeleton) while loading.

SECTION 3 — MY RECENT REPORTS:
Heading: "Your reports"
Compact list (not cards) — last 5 incidents where staffId === currentUser.userId
Each row:
  - Resident room number + incident type badge
  - Date formatted as "Mar 21" or "Today"
  - Phase dot (8px colored circle):
    phase_1_in_progress: amber (#E8A838)
    phase_1_complete: yellow (#F4D03F)
    phase_2_in_progress: blue (#2E86DE)
    closed: teal (#0D7377)
  - Completeness percentage in small muted text
  - Tap row → /staff/incidents/[id]
"View all" text link → /staff/incidents
Show Skeleton rows while loading.

SECTION 4 — UPCOMING ASSESSMENTS:
Heading: "Assessments due this week"
Hide section entirely if nothing due within 7 days.
Each item: resident room, assessment type, days remaining badge ("2 days")
"Start" button → /staff/assessments/[type]?residentId=X&residentName=Y

SECTION 5 — MY PERFORMANCE (collapsible card):
Default: collapsed. Shows one large number — average completeness score for
last 30 days. Color: teal ≥ 85%, amber 60-84%, red < 60%.
Label below: "Your average completeness (30 days)"
Tap to expand/collapse.

EXPANDED state shows:
  - Month comparison: "This month: [X]% | Last month: [Y]%" with directional arrow
    (green ↑ if improved, red ↓ if declined, gray → if same)
  - Streak card (only shown when currentStreak ≥ 3):
    "🔥 [N]-report streak — above 85%"
  - "Best streak: [N] reports" in muted text
  - "View full analysis" link → /staff/intelligence

DATA: GET /api/staff/incidents?staffId={userId}&facilityId={facilityId}
Compute from response:
  - pendingQuestions: incidents where unansweredQuestions > 0
  - recentReports: last 5 sorted by createdAt desc
  - averageCompleteness: mean of completenessAtSignoff from last 30 days
  - currentStreak: consecutive incidents above 85% (newest first)
  - bestStreak: all-time max streak
Also: GET /api/assessments/due?staffId={userId}&facilityId={facilityId}&days=7

PART B — UPDATE app/staff/layout.tsx

BOTTOM TAB BAR (fixed, full width):
Four tabs:
  🏠 Home → /staff/dashboard
  📋 Incidents → /staff/incidents
  📝 Assessments → /staff/assessments
  💡 Intelligence → /staff/intelligence

Active tab: teal icon + label. Inactive: muted gray.
Badges (red circles with white numbers, hidden when 0):
  Home: total unanswered questions across all active incidents
  Incidents: same count
  Assessments: count of assessments due within 7 days

To show badges: call GET /api/staff/badge-counts?userId={userId}&facilityId={facilityId}
Create this route if it does not exist — returns { pendingQuestions: number, dueAssessments: number }
Poll every 60 seconds using setInterval in a useEffect.

TOP HEADER:
Left: "WAiK" wordmark in teal
Right: notification bell icon with unread count badge → /staff/notifications
       Avatar circle (initials) → /staff/profile

PART C — API ROUTE — GET /api/staff/badge-counts
Returns: { pendingQuestions: number, dueAssessments: number }
pendingQuestions: count of incidents for this staff member with unanswered Tier 2 questions
dueAssessments: count of assessments where next_due_at is within 7 days for residents
                assigned to this staff member
Requires getCurrentUser() — returns 401 if not authenticated.

Do not touch admin dashboard or any other pages.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Rewrite `documentation/waik/10-STAFF-DASHBOARD.md` to reflect new design
- Document `/api/staff/badge-counts` in `documentation/waik/03-API-REFERENCE.md`
- Create `plan/pilot_1/phase_3/task-05-DONE.md`

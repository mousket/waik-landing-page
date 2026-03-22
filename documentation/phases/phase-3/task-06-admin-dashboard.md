# Task: Rebuild Admin Dashboard (Command Center)
## Phase: 3
## Depends On: task-05-staff-dashboard
## Estimated Time: 5 hours

## Context Files
- app/admin/dashboard/page.tsx (replace)

## Success Criteria
- [ ] Daily Brief card (dismissible, once per day)
- [ ] Tab 1 "Needs Attention": Red Alerts, Awaiting Phase 2 Claim, Pending Specialist Tasks
- [ ] Tab 2 "Active Investigations": table/cards, filter by phase, sort
- [ ] Tab 3 "Closed": last 30 days, Export CSV
- [ ] Right sidebar: Quick Stats, upcoming assessments, Intelligence shortcut
- [ ] Top nav: Dashboard | Residents | Assessments | Intelligence | Settings

## Test Cases
- Admin dashboard loads with Needs Attention as default tab
- Red alerts show injury or >4h open phase_1
- Claim button transitions incident to Phase 2
- Export Closed produces CSV

## Implementation Prompt

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

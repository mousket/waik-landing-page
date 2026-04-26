# Task 06b — Needs Attention Tab + PATCH /api/incidents/[id]/phase
## Phase: 3b — Admin Dashboard
## Estimated Time: 3–4 hours
## Depends On: task-06a (API contract and layout must be complete)

---

## Why This Task Exists

The Needs Attention tab is the default landing view for every DON and
administrator who opens WAiK. It answers: "What needs my action right now?"
It is not a list of all incidents — it is a curated priority queue.

Three categories of urgency live here, in this exact order:

**Red alerts** — incidents where `hasInjury === true` OR where Phase 1
has been open more than 4 hours without sign-off. These carry regulatory
and legal risk. A nurse who reported a fall injury and never finished the
report starts a two-hour state reporting clock. The DON must see this
immediately.

**Yellow — awaiting claim** — Phase 1 is signed and complete, waiting
for the DON to claim Phase 2. No injury flag. These need attention but
are not emergencies.

**Overdue IDT tasks** — Phase 2 investigations where an IDT team member
was sent a question more than 24 hours ago and has not responded. These
block investigation progress and slow the 48-hour clock.

**Design pattern: Classification logic belongs in a pure function.**
The card classification (red vs yellow) is computed from incident data,
not from the database. It is a pure function of the incident's phase,
hasInjury, and elapsed time. Keeping this logic in a testable utility
function (`lib/utils/incident-classification.ts`) means the UI is
a simple renderer and the classification is unit-testable.

**Infrastructure: PATCH /api/incidents/[id]/phase.**
The "Claim Investigation" button is the first write action on this
dashboard. It transitions an incident from `phase_1_complete` to
`phase_2_in_progress`. This transition has side effects:
  - Sets investigatorId and investigatorName from the claiming user
  - Records phaseTransitionTimestamps.phase2Claimed
  - Appends an entry to the incident's auditTrail
  - Fires a notification to configured DON/admin roles
This is not a simple field update — it is a state machine transition
with consequences. Building it correctly here prevents bugs in all
later Phase 2 tasks.

---

## Context Files

- `app/admin/dashboard/page.tsx` — add Needs Attention tab content
- `app/api/incidents/[id]/route.ts` — already exists, do not break it
- `app/api/incidents/[id]/phase/route.ts` — CREATE THIS
- `lib/utils/incident-classification.ts` — CREATE THIS
- `lib/types/incident-summary.ts` — from task-06a
- `lib/permissions.ts` — withAdminAuth(), requirePhase2Access()
- `backend/src/models/incident.model.ts` — auditTrail, phaseTransitionTimestamps

---

## Classification Logic (pure functions — unit testable)

```typescript
// lib/utils/incident-classification.ts

export type IncidentUrgency = "red_alert" | "yellow_awaiting" | "none"

export function classifyIncident(
  incident: IncidentSummary,
  nowMs: number = Date.now()
): IncidentUrgency {
  const startedMs = new Date(incident.startedAt).getTime()
  const hoursOpen = (nowMs - startedMs) / (1000 * 60 * 60)

  // Red: injury flagged (any phase) OR Phase 1 open > 4 hours
  if (incident.hasInjury) return "red_alert"
  if (
    incident.phase === "phase_1_in_progress" &&
    hoursOpen > 4
  ) return "red_alert"

  // Yellow: Phase 1 complete, no injury, waiting for Phase 2 claim
  if (
    incident.phase === "phase_1_complete" &&
    !incident.hasInjury
  ) return "yellow_awaiting"

  return "none"
}

export function isIdtOverdue(
  member: IdtTeamMember,
  nowMs: number = Date.now(),
  thresholdHours: number = 24
): boolean {
  if (member.status === "answered") return false
  if (!member.questionSentAt) return false
  const sentMs = new Date(member.questionSentAt).getTime()
  const hoursElapsed = (nowMs - sentMs) / (1000 * 60 * 60)
  return hoursElapsed > thresholdHours
}
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `lib/utils/incident-classification.ts` exists with classifyIncident()
- [ ] classifyIncident() unit tests: injury → red, >4hr → red, phase_1_complete → yellow
- [ ] Needs Attention tab is the default active tab on /admin/dashboard
- [ ] Tab shows count badge (total red + yellow + overdue IDT)
- [ ] Red alert cards render for injury-flagged incidents
- [ ] Red alert cards render for phase_1_in_progress incidents open > 4 hours
- [ ] Yellow cards render for phase_1_complete incidents with no injury
- [ ] Cards show room number only — no resident name
- [ ] "Claim Investigation" button calls PATCH /api/incidents/[id]/phase
- [ ] After claim: incident moves to phase_2_in_progress in MongoDB
- [ ] After claim: investigatorId set to claiming user's ID
- [ ] After claim: phaseTransitionTimestamps.phase2Claimed set to now
- [ ] After claim: auditTrail entry appended
- [ ] After claim: card disappears from Needs Attention tab
- [ ] PATCH /api/incidents/[id]/phase requires canAccessPhase2() — returns 403 for head_nurse
- [ ] Empty state shown when no red/yellow/overdue incidents exist
- [ ] Loading skeletons shown while data fetches

---

## Test Cases

```
TEST 1 — classifyIncident: injury flag → red
  Action: classifyIncident({ hasInjury: true, phase: "phase_1_complete", startedAt: now })
  Expected: "red_alert"
  Pass/Fail: ___

TEST 2 — classifyIncident: >4hr open → red
  Action: classifyIncident({ hasInjury: false, phase: "phase_1_in_progress",
          startedAt: 5_hours_ago })
  Expected: "red_alert"
  Pass/Fail: ___

TEST 3 — classifyIncident: phase_1_complete no injury → yellow
  Action: classifyIncident({ hasInjury: false, phase: "phase_1_complete",
          startedAt: 3_hours_ago })
  Expected: "yellow_awaiting"
  Pass/Fail: ___

TEST 4 — classifyIncident: phase_2_in_progress → none
  Action: classifyIncident({ phase: "phase_2_in_progress", hasInjury: false })
  Expected: "none"
  Pass/Fail: ___

TEST 5 — Tab renders red alert card from seed data
  Action: Sign in as DON, load /admin/dashboard
  Expected: INC-003 (injury, in_progress) appears as red card
            INC-004 (injury, phase_1_complete) appears as red card
  Pass/Fail: ___

TEST 6 — Tab renders yellow card from seed data
  Action: Load /admin/dashboard
  Expected: INC-005 (no injury, phase_1_complete) appears as yellow card
  Pass/Fail: ___

TEST 7 — No resident name on cards
  Action: Inspect any alert card in DOM
  Expected: residentRoom ("204") visible. "Johnson", "Chen", or any
            resident surname is NOT visible anywhere on the card.
  Pass/Fail: ___

TEST 8 — Claim Investigation transitions phase
  Action: Click "Claim" on a yellow card
  Expected: PATCH /api/incidents/[id]/phase called
            MongoDB: incident.phase = "phase_2_in_progress"
            MongoDB: investigatorId = currentUser.userId
            MongoDB: phaseTransitionTimestamps.phase2Claimed = now (approximately)
            Card disappears from Needs Attention tab
  Pass/Fail: ___

TEST 9 — PATCH phase requires canAccessPhase2
  Action: PATCH /api/incidents/[id]/phase with head_nurse token
  Expected: 403 — head_nurse does not have canAccessPhase2
  Pass/Fail: ___

TEST 10 — Empty state renders
  Action: Remove all red/yellow/overdue incidents from DB temporarily
  Expected: Green card: "No immediate action needed. Your community is on track."
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task builds the Needs Attention
tab on the admin dashboard and creates the PATCH /phase route that the
Claim Investigation button calls.

PART A — CREATE lib/utils/incident-classification.ts

Create the file exactly as specified in the task-06b spec. Export:
  classifyIncident(incident: IncidentSummary, nowMs?: number): IncidentUrgency
  isIdtOverdue(member: IdtTeamMember, nowMs?: number, thresholdHours?: number): boolean

Write unit tests in __tests__/incident-classification.test.ts:
  - injury flag returns red_alert
  - 5hr open phase_1_in_progress returns red_alert
  - 3hr open phase_1_in_progress returns none (< 4hr threshold)
  - phase_1_complete no injury returns yellow_awaiting
  - phase_2_in_progress returns none
  - closed returns none
  - isIdtOverdue: answered member → false
  - isIdtOverdue: pending, 25hr elapsed → true
  - isIdtOverdue: pending, 20hr elapsed → false (threshold 24)

PART B — CREATE PATCH /api/incidents/[id]/phase/route.ts

This route transitions an incident's phase. It has side effects that
must all succeed or all fail (use a try/catch with rollback intent).

export const PATCH = withAdminAuth(async (req, { currentUser }) => {
  // 1. Parse and validate body
  const { phase, investigatorId, investigatorName } = await req.json()
  
  const validTransitions: Record<string, string[]> = {
    "phase_1_complete":    ["phase_2_in_progress"],
    "phase_2_in_progress": ["closed"],
    "closed":              []  // can only be re-opened by unlock flow
  }
  
  // 2. Load incident — enforce facilityId ownership
  const incident = await IncidentModel.findOne({
    id: params.id,
    facilityId: currentUser.facilityId
  })
  if (!incident) return Response.json({ error: "Not found" }, { status: 404 })
  
  // 3. Check permission for phase transitions
  // Transitioning to phase_2_in_progress requires canAccessPhase2
  if (phase === "phase_2_in_progress" && !currentUser.canAccessPhase2) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  
  // 4. Validate transition is allowed
  const allowed = validTransitions[incident.phase] ?? []
  if (!allowed.includes(phase)) {
    return Response.json(
      { error: `Cannot transition from ${incident.phase} to ${phase}` },
      { status: 400 }
    )
  }
  
  // 5. Build update object
  const now = new Date()
  const update: Record<string, any> = {
    phase,
    updatedAt: now
  }
  
  if (phase === "phase_2_in_progress") {
    update.investigatorId = currentUser.userId
    update.investigatorName = `${currentUser.firstName} ${currentUser.lastName}`
    update["phaseTransitionTimestamps.phase2Claimed"] = now
  }
  
  if (phase === "closed") {
    update["phaseTransitionTimestamps.phase2Locked"] = now
  }
  
  // 6. Append to auditTrail
  const auditEntry = {
    action: "phase_transitioned",
    performedBy: currentUser.userId,
    performedByName: `${currentUser.firstName} ${currentUser.lastName}`,
    timestamp: now,
    previousValue: incident.phase,
    newValue: phase
  }
  
  // 7. Apply update atomically
  await IncidentModel.findOneAndUpdate(
    { id: params.id, facilityId: currentUser.facilityId },
    {
      $set: update,
      $push: { auditTrail: auditEntry }
    },
    { new: true }
  )
  
  // 8. TODO: fire notification (implemented in task-06f)
  // For now: log the intent
  console.log(`[Phase transition] ${incident.id}: ${incident.phase} → ${phase} by ${currentUser.userId}`)
  
  return Response.json({ success: true, newPhase: phase })
})

PART C — NEEDS ATTENTION TAB UI

In app/admin/dashboard/page.tsx, build the Needs Attention tab content.
This is a Client Component section ("use client") that:

1. Fetches incidents on mount:
   GET /api/incidents?phase=phase_1_in_progress,phase_1_complete
   (both phases needed to compute red vs yellow)

2. Classifies each incident using classifyIncident() from lib/utils/incident-classification.ts

3. Separates into three arrays:
   redAlerts = incidents where classify() === "red_alert"
   yellowAwaiting = incidents where classify() === "yellow_awaiting"
   overdueIdt = [] (populated in task-06f)

4. Renders in order: red alerts → yellow awaiting → overdue IDT

RED ALERT CARD (for each redAlert):
  Border-left: 4px solid #C0392B
  Background: #FDE8E8
  Border-radius: 12px, padding: 16px, margin-bottom: 12px
  
  Row 1: "Room [residentRoom] — [incidentType display label]"
         font-semibold + time elapsed badge ("X hours ago" via date-fns formatDistanceToNow)
  
  Row 2 (if hasInjury):
    Amber badge: "⚠️ Injury reported — state notification may be required"
  
  Row 3: "Reported by: [reportedByName], [reportedByRole display]"
  
  Row 4: Full-width button "Claim Investigation"
    On click: PATCH /api/incidents/[id]/phase { phase: "phase_2_in_progress" }
    Loading state: button shows spinner, disabled
    On success: remove card from list with fade-out animation (300ms)
    On error: show error toast

YELLOW AWAITING CARD (for each yellowAwaiting):
  Same structure but:
  Border-left: 4px solid #E8A838
  Background: #FBF0D9
  No injury row
  Shows Phase 1 completeness: "[X]% complete"
  Button: "Claim" (smaller than red alert button)

COUNT BADGE on tab:
  Tab label: "Needs Attention"
  Badge: redAlerts.length + yellowAwaiting.length (+ overdueIdt.length when 06f adds it)
  Red badge circle with white number

EMPTY STATE (when all three arrays are empty):
  Green card, teal left border, checkmark icon:
  "No immediate action needed. Your community is on track."

LOADING SKELETON (while fetching):
  3 skeleton cards with gray shimmer using shadcn <Skeleton />
  Same height as real cards

DESIGN NOTE on "time ago":
  Use date-fns formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })
  This gives "5 hours ago", "2 days ago" etc.
  Import: import { formatDistanceToNow } from "date-fns"

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/11-ADMIN-DASHBOARD.md` — Needs Attention tab
- Document PATCH /phase in `documentation/waik/03-API-REFERENCE.md`
- Create `plan/pilot_1/phase_3b/task-06b-DONE.md`

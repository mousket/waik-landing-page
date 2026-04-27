# Task 5b-02 — Staff Incident Detail Page
## Phase: 5b — Staff Experience Redesign
## Estimated Time: 2–3 hours
## Depends On: task-5b-01 (shared components extracted)

---

## Why This Task Exists

When a nurse taps "View" on an incident from her dashboard or her incident
list, she needs to see the full record of what happened — her original
narrative, her answers, the current phase status, and any follow-up
questions the DON has sent her. Right now this page either does not exist
or shows a basic list.

This page is the staff-facing equivalent of the admin's incident detail
(Screen 14 in the UI spec). It uses the same tab structure and visual
design. What differs is the absence of Phase 2 investigation controls —
no Claim button, no section workspaces, no dual sign-off. The nurse sees
the investigation progress but cannot drive it.

**Design pattern: read-only Phase 2 view for staff.**
The staff incident detail has three tabs. Tab 1 is My Report — her own
words alongside the generated clinical record, identical to what the
admin sees in Tab 1 of the Phase 2 workspace. Tab 2 is Questions — the
full Q&A history. Tab 3 is Investigation Status — a read-only view of
Phase 2 progress, including any questions the DON has sent the nurse
with a response input if a question is pending.

---

## Context Files

- `app/staff/incidents/[id]/page.tsx` — CREATE THIS
- `app/staff/incidents/page.tsx` — incident list, verify exists
- `app/api/incidents/[id]/route.ts` — GET single incident
- `lib/types/staff-incident-summary.ts` — from Phase 3c
- `components/shared/phase-badge.tsx` — from task-5b-01
- `components/shared/completion-ring.tsx` — from task-5b-01

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `/staff/incidents/[id]` loads for any incident where staffId = currentUser
- [ ] 403 returned if staffId ≠ currentUser (can't view other nurses' incidents)
- [ ] Header: back arrow, incident type + room number, phase badge, completeness ring
- [ ] Tab 1 — My Report: original narrative in quote block, clinical record below
- [ ] Tab 1: "Compare" toggle shows both versions side-by-side on tablet+
- [ ] Tab 2 — Questions: all Q&A pairs with timestamps, deferred/unknown badges
- [ ] Tab 2: unanswered Tier 2 questions show "Answer Now" button → /staff/report/[id]/answer
- [ ] Tab 3 — Investigation Status: shows current phase, section completion dots
- [ ] Tab 3: DON-sent questions appear with text input for response
- [ ] Tab 3: Submitting response calls POST /api/incidents/[id]/idtQuestions/[qId]/respond
- [ ] Tab 3: Phase 2 locked state shows "Investigation complete" with root cause and new interventions
- [ ] No Phase 2 controls visible (no Claim, no section workspaces, no sign-off)
- [ ] Staff incident list page at /staff/incidents loads and shows all staff's incidents

---

## Test Cases

```
TEST 1 — Page loads for Maria's incident
  Action: Sign in as m.torres@sunrisemn.com
          Navigate to /staff/incidents/inc-003
  Expected: Page loads. Header shows "Fall — Room 515"
            Phase badge shows "Phase 1 Active"
  Pass/Fail: ___

TEST 2 — Cannot view another nurse's incident
  Action: Sign in as m.torres@sunrisemn.com
          Navigate to /staff/incidents/inc-001 (Linda's incident)
  Expected: 403 page or redirect — not Maria's incident
  Pass/Fail: ___

TEST 3 — My Report tab shows original narrative
  Action: View Tab 1 of INC-003
  Expected: Nurse's verbatim words visible in styled quote block
            Label: "Your original words — preserved exactly as spoken"
  Pass/Fail: ___

TEST 4 — Questions tab shows Q&A history
  Action: View Tab 2 of INC-003
  Expected: Tier 1 questions listed with answers
            Unanswered questions (if any) show "Answer Now" button
  Pass/Fail: ___

TEST 5 — Investigation Status tab shows Phase 2 progress for INC-007
  Action: Sign in as m.torres@sunrisemn.com
          Navigate to /staff/incidents/inc-007 (Phase 2, ready to lock)
  Expected: Tab 3 shows all 4 section dots as green (all complete)
            "Investigation ready for sign-off" message
  Pass/Fail: ___

TEST 6 — DON question appears with response input
  Action: If DON has sent a question to this nurse on any incident
  Expected: Question text visible with textarea for response
            Submit button calls response API
  Pass/Fail: ___

TEST 7 — Closed incident shows root cause
  Action: Navigate to /staff/incidents/inc-009 (closed)
  Expected: Tab 3 shows "Investigation complete"
            Root cause text visible (read-only)
            New interventions visible (read-only)
  Pass/Fail: ___

TEST 8 — No Phase 2 controls visible
  Action: View any incident as staff user
  Expected: No "Claim Investigation" button, no section workspace links,
            no sign-off controls visible anywhere on the page
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building the staff incident detail page for WAiK (Next.js 14).
This page shows a nurse her own incident record with a read-only view
of Phase 2 investigation progress.

PART A — GET /api/incidents/[id]/route.ts — STAFF ACCESS CHECK

The existing GET route must verify:
  const incident = await IncidentModel.findOne({ id: params.id, facilityId })
  if (!incident) return 404
  
  If currentUser is not admin-tier AND incident.staffId !== currentUser.userId:
    return Response.json({ error: "Forbidden" }, { status: 403 })
  
  Return full incident including: all Q&A, phase2Sections, idtTeam,
  investigation narrative, audit trail

PART B — CREATE app/staff/incidents/[id]/page.tsx

"use client" component. Fetches GET /api/incidents/[id] on mount.

HEADER (sticky top, white background, border-bottom):
  Back arrow → /staff/incidents
  Title: "[incidentType display] — Room [residentRoom]"
  Right: PhaseBadge + CompletionRing (40px, completenessScore)

INCIDENT SUMMARY CARD (pinned above tabs):
  incident type, date/time, location, reported by name/role,
  phase1SignedAt formatted if present

THREE TABS (shadcn Tabs, default Tab 1):

TAB 1 — MY REPORT:
  
  Section: "Your original words"
    Styled blockquote: dark border-left, bg-gray-50, italic
    Label above: "Preserved exactly as spoken"
    Content: incident.narrativeOriginal or the Q2 Tier1 answer verbatim
  
  Section: "Official clinical record" (below, or side-by-side toggle)
    The WAiK-generated clinical record text
    Toggle button: "Compare side by side" (tablet+ only)
  
  Divider
  
  Section: "All your answers"
    List of Q&A pairs from Tier1 + Tier2 + closing:
    Question text (bold) → Answer text below
    Timestamp in muted text
    If deferred: amber "Deferred" badge
    If unknown: gray "Not known" badge

TAB 2 — QUESTIONS:
  Grouped by: Tier 1 | Tier 2 | Closing Questions
  
  Each group heading in muted uppercase
  
  Per question:
    Question text bold
    Answer text below (or status badge if unanswered/deferred)
    Timestamp muted
    
    If unanswered AND phase === "phase_1_in_progress":
      "Answer Now" button → push to /staff/report with this question
      (in a later task this will deep-link to the voice screen)

TAB 3 — INVESTIGATION STATUS:
  
  Phase indicator:
    Large phase badge (same as header but bigger)
    Human-readable status:
      phase_1_in_progress → "Your report is in progress."
      phase_1_complete → "Your report has been submitted. The Director of Nursing will begin the investigation."
      phase_2_in_progress → "Investigation is underway."
      closed → "Investigation complete. This case is closed."
  
  If phase_2_in_progress or closed:
    Section completion dots row (4 dots):
      contributingFactors, rootCause, interventionReview, newIntervention
      Each dot: gray = not_started, amber = in_progress, teal = complete
      Label below each dot (truncated): "Contributing Factors", "Root Cause", etc.
  
  If any idtTeam questions were sent to THIS nurse:
    Section: "Questions from the Director of Nursing"
    For each question assigned to currentUser.userId:
      If status === "answered":
        Question text + response text below in quote block
        "Answered [date]" in muted text
      If status === "pending":
        Question text bold
        Textarea placeholder "Type your response..."
        "Submit Response" button
        On submit → POST /api/incidents/[id]/idtQuestions/respond
          body: { questionIndex, response }
          Show success state: "Response submitted"
  
  If phase === "closed":
    Section: "Investigation outcome" (teal card)
    Root cause: incident.phase2Sections.rootCause.description (read-only)
    New interventions: incident.phase2Sections.newIntervention.interventions list

PART C — CREATE app/staff/incidents/page.tsx (if not exists)

Simple incident list for staff. Shows all incidents where staffId = currentUser.
Same filter controls as admin's incident list (phase filter, type filter)
but scoped to this nurse only.

Table/card list: room, type, phase badge, completeness ring, date, View button
"New Report" button top right.

PART D — POST /api/incidents/[id]/idtQuestions/respond

New sub-route. Staff can respond to a DON-sent question.
  body: { questionIndex: number, response: string }
  Find the idtTeam entry where userId === currentUser.userId and index matches
  Update: status → "answered", response → body.response, respondedAt → now
  Return: { success: true }
  Requires auth — staff can only respond to questions assigned to them

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Document /api/incidents/[id]/idtQuestions/respond in API reference
- Create `plan/pilot_1/phase_5b/task-5b-02-DONE.md`

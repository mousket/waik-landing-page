# Task 09 — Phase 2 Investigation Workspace + WAiK Intelligence
## Phase: 4 — Core Features
## Estimated Time: 8–10 hours
## Depends On: task-01, task-02, task-06, task-08

---

## Why This Task Exists

Phase 2 is where WAiK proves its value to administrators and earns its renewal.
The Phase 1 record captures what happened. Phase 2 answers why it happened,
what was done about it, and what the community is committed to changing. Without
a complete Phase 2, WAiK produces better incident reports that still go nowhere.
With it, WAiK produces the complete closed investigation record that protects
the facility, satisfies the regulator, and earns the community's trust.

The Phase 2 design changed significantly from the original build plan based on
two co-founder meetings:

1. Phase 2 is now sections, not a sequential workflow. The DON works through
   Contributing Factors, Root Cause, Intervention Review, and New Intervention
   in whatever order makes sense for the incident. Each section is independently
   completable. The process is non-linear.

2. Both the DON and the administrator must sign to lock the investigation.
   This is a regulatory requirement Scott confirmed explicitly. Phase 2 is not
   closed until both have signed. The screen should wait for both.

3. Phase 2 can be unlocked after locking, but only by the DON or administrator,
   with a mandatory reason recorded in the audit trail. Every lock, unlock, and
   relock is timestamped and immutable.

4. The gold standard for Phase 2 closure is 48 hours from Phase 1 sign-off.
   WAiK should track and surface this clock prominently.

5. The Resident Context tab surfaces previous interventions, incident patterns,
   and recent assessments for this resident — the data the DON needs to make a
   good root cause decision without leaving WAiK to search the EHR.

WAiK Intelligence is the second part of this task — community-level natural
language queries and the auto-generated weekly insight cards.

This task implements Screens 14–17 of the UI Specification (Pass 2) and
Screen 26 (Pass 3).

---

## Context Files

- `app/admin/incidents/[id]/page.tsx` — full replacement (Phase 2 workspace)
- `backend/src/models/incident.model.ts` — phase2Sections and auditTrail added in task-02
- `backend/src/models/intervention.model.ts` — created in task-02
- `lib/agents/intelligence-qa.ts` — needs facilityId enforcement
- `lib/agents/intelligence-tools.ts` — needs facilityId enforcement
- `lib/auth.ts` — canAccessPhase2(), isAdminRole()
- `lib/push-service.ts` — for Phase 2 section complete notification

---

## Success Criteria

**Phase 2 Workspace:**
- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Unclaimed Phase 2 shows full-screen "Claim Investigation" overlay — tabs inaccessible until claimed
- [ ] Claim sets investigatorId, investigatorName, phaseTransitionTimestamps.phase2Claimed
- [ ] Four tabs: Phase 1 Record (read-only), IDT Team & Questions, Investigation Sections, Resident Context
- [ ] Phase 1 Record tab shows original narrative verbatim alongside clinical record — toggle or side-by-side
- [ ] IDT Team panel: add member, shows each member's status and question count
- [ ] Question sender: AI-generated suggestions with editable text and recommended recipient
- [ ] Question sender: manual compose with recipient selector
- [ ] Questions sent: list of all questions with status and responses
- [ ] Send Reminder on overdue question fires push notification to IDT member
- [ ] Investigation Sections tab: four sections with status dots (not started / in progress / complete)
- [ ] Each section navigable to Section Workspace (Screen 16)
- [ ] When all four sections complete: "Ready to Lock" banner appears + notification fires
- [ ] Resident Context tab: intervention history, incident pattern, recent assessments
- [ ] Intervention History panel matches Resident Story — all interventions, active/removed status
- [ ] Audit trail visible below summary card — collapsed by default
- [ ] Phase 2 Sign-Off screen requires both DON and administrator signatures
- [ ] Lock button only appears when both signatures captured
- [ ] After locking: phase = "closed", both signatures timestamped, audit trail entry added
- [ ] Unlock requires mandatory reason text (min 20 characters)
- [ ] Unlock adds entry to audit trail with reason
- [ ] After unlock: previous signatures cleared, both must re-sign before relocking

**Section Workspaces:**
- [ ] Contributing Factors: multi-select list + IDT responses panel + notes + mark complete
- [ ] Root Cause: required textarea (min 50 chars) + AI suggestion + IDT responses + mark complete
- [ ] Intervention Review: per-intervention toggle (still effective / remove) + mark complete
- [ ] New Intervention: add intervention form (description, department, type, date) + mark complete
- [ ] All sections auto-save every 30 seconds
- [ ] All sections show "Back to Investigation" link
- [ ] Section completion dot updates on Screen 14 in real time

**WAiK Intelligence:**
- [ ] `/admin/intelligence` search bar submits query and returns plain-text response
- [ ] 8 suggested queries on empty state
- [ ] All queries facility-scoped — never cross-facility
- [ ] Four auto-insight cards load on page open: This Week, Completeness Trend, Attention Needed, Staff Performance
- [ ] Insight cards cached in Redis 1 hour per facility
- [ ] Daily brief endpoint returns summary, cached 1 hour

---

## Test Cases

```
TEST 1 — Unclaimed Phase 2 shows overlay
  Setup: Create incident with phase = phase_1_complete (not yet claimed)
  Action: Navigate to /admin/incidents/[id] as administrator
  Expected: Full-screen "Claim this investigation" overlay. Tabs not accessible.
  Pass/Fail: ___

TEST 2 — Claim sets correct fields
  Action: Click Claim on the overlay
  Expected: incident.phase = phase_2_in_progress, investigatorId = currentUser.userId,
            phaseTransitionTimestamps.phase2Claimed = now
  Pass/Fail: ___

TEST 3 — Staff cannot claim Phase 2
  Action: Navigate to /admin/incidents/[id] with cna role token
  Expected: 403 or redirect — CNA cannot see Phase 2 workspace
  Pass/Fail: ___

TEST 4 — Phase 1 Record shows both versions
  Action: View Phase 1 Record tab
  Expected: Nurse's verbatim original narrative visible, labeled "Staff's original words"
            Clinical record visible, labeled "Official clinical record"
  Pass/Fail: ___

TEST 5 — Add IDT team member
  Action: Tap Add Team Member, search for a staff member, select them
  Expected: Member appears in IDT team list with "No questions yet" status
  Pass/Fail: ___

TEST 6 — AI question generation
  Action: Click Generate Question on IDT Questions tab
  Expected: 3-5 suggested question cards appear with editable text and recommended recipients
  Pass/Fail: ___

TEST 7 — Send question to IDT member
  Action: Add question to queue, click Send All Questions
  Expected: Question saved to investigation, push notification sent to recipient
  Pass/Fail: ___

TEST 8 — Section completion updates dot
  Action: Navigate to Contributing Factors workspace, select 2 factors, click Mark Complete
  Expected: Contributing Factors dot on Screen 14 turns green
  Pass/Fail: ___

TEST 9 — Root cause minimum length enforced
  Action: Type 40 characters in root cause field, click Mark Complete
  Expected: Mark Complete button disabled. Error: "Root cause must be at least 50 characters."
  Pass/Fail: ___

TEST 10 — Ready to Lock fires when all sections complete
  Action: Mark all four sections complete
  Expected: "Ready to Lock" banner appears on Investigation Sections tab.
            Push notification sent to DON and administrator.
  Pass/Fail: ___

TEST 11 — Both signatures required to lock
  Action: DON signs. Click Lock Investigation.
  Expected: Lock button disabled. Message: "Waiting for Administrator to sign."
  Pass/Fail: ___

TEST 12 — Lock seals investigation
  Action: Both DON and administrator sign. Click Lock Investigation. Confirm.
  Expected: incident.phase = "closed". Both signatures and timestamps recorded.
            auditTrail entry: { action: "locked", performedBy: ... }
            Notification sent to reporting nurse.
  Pass/Fail: ___

TEST 13 — Unlock requires reason
  Action: Click Unlock Investigation. Type 15 characters for reason. Submit.
  Expected: Unlock blocked. Error: "Reason must be at least 20 characters."
  Pass/Fail: ___

TEST 14 — Unlock clears signatures
  Action: Provide valid reason, confirm unlock.
  Expected: Both signatures cleared. auditTrail entry with reason added.
            investigation.phase = phase_2_in_progress.
  Pass/Fail: ___

TEST 15 — Resident Context shows interventions
  Setup: Create 3 interventions for the incident's resident (2 active, 1 removed)
  Action: View Resident Context tab
  Expected: 3 interventions visible. 2 show green Active badge. 1 shows strikethrough + Removed.
  Pass/Fail: ___

TEST 16 — Intelligence query is facility-scoped
  Setup: Create incidents in two facilities
  Action: POST /api/intelligence/query { query: "how many falls", facilityId: "fac-a" }
  Expected: Only fac-a data in response
  Pass/Fail: ___

TEST 17 — Auto-insight cards load
  Action: Navigate to /admin/intelligence
  Expected: Four insight cards visible: This Week / Completeness Trend / Attention Needed / Staff Performance
  Pass/Fail: ___

TEST 18 — Insight cards cached
  Action: Load /admin/intelligence twice within 1 hour
  Expected: Second load returns same data without hitting MongoDB (Redis cache hit)
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task builds the complete Phase 2
investigation workspace and WAiK Intelligence. The data models with Phase 2
sections and audit trail were already created in task-02.

PART A — PHASE 2 INVESTIGATION WORKSPACE

Rebuild app/admin/incidents/[id]/page.tsx matching UI Specification Screen 14.

STATE: On page load, call GET /api/incidents/[id] (facilityId enforcement).
If incident.phase === phase_1_complete AND investigatorId is null:
  Show full-screen overlay: "Claim this investigation to begin Phase 2."
  "Claim" button → PATCH /api/incidents/[id]/phase { phase: phase_2_in_progress,
  investigatorId: currentUser.userId, investigatorName: currentUser.name }
  On success: overlay disappears, tabs become accessible.

If current user is not DON/admin/owner: show 403 message and back button.

HEADER BAR:
Back arrow → /admin/incidents
Title: "[IncidentType] Investigation — Room [roomNumber]"
Phase badge
48-hour countdown clock: hours since phase1SignedAt.
  Color: gray >24h, amber 6-24h, red <6h, bold red if overdue.

SUMMARY CARD (pinned above tabs):
Room number, incident type, incident date/time, reporting nurse name/role,
Phase 1 completeness ring, phase1SignedAt timestamp, investigator name,
IDT team avatar stack (initials circles),
Four section status dots (contributing_factors, root_cause, intervention_review,
new_intervention) — gray=not_started, amber=in_progress, teal=complete.

AUDIT TRAIL (collapsed by default, below summary card):
"Investigation History" toggle. When expanded: list of auditTrail array entries
showing action, performedByName, timestamp, reason (if present).
Read-only.

FOUR TABS:

TAB 1 — PHASE 1 RECORD (read-only):
Two toggleable views: "Staff's original words" / "Official clinical record"
Toggle button at top. Default: show both side-by-side on desktop, toggled on mobile.
"Staff's original words": verbatim narrative in a quoted text block with quotation
mark styling. Label: "Preserved exactly as spoken."
"Official clinical record": WAiK-generated text in clean clinical language.
Below both views: full Q&A transcript — all Tier 1, Tier 2, and closing questions
with answers, timestamps, and answered-by names.

TAB 2 — IDT TEAM & QUESTIONS:

SECTION A — IDT TEAM:
List of team members. Each card: name, role, department, status (Active/
Questions Pending/Responded), questions sent count, questions answered count.
"Add Team Member" → search modal → on select: member added, notification sent
to them: "You have been added to a Phase 2 investigation for Room [X]."

SECTION B — QUESTION SENDER:
"Generate Question" button → navigates to Screen 15 (IDT Question Sender page)
  /admin/incidents/[id]/questions

Direct compose: textarea "Write a question..." + recipient dropdown + Send button
→ POST /api/incidents/[id]/idtQuestions { question, recipientId, facilityId }
Recipient receives push notification.

SECTION C — QUESTIONS SENT:
List of all sent questions. Each: question text, sent to (name + role), date sent,
status (pending/answered).
If answered: response text in quoted block with responder name and timestamp.
If pending AND assignedAt > 24 hours: amber warning + "Send Reminder" button
→ POST /api/push/send { targetUserId: recipientId, payload: { title: "Response needed",
body: "Your input on a Phase 2 investigation is overdue." } }

TAB 3 — INVESTIGATION SECTIONS:
Four section cards. Each shows: section name, status dot, content summary if started,
"Work on this section" button → /admin/incidents/[id]/section/[sectionName]

When all four sections have status "complete":
Show "Ready to Lock" banner: "All sections complete. Ready for sign-off."
"Go to Sign-Off" button → /admin/incidents/[id]/signoff
Fire notification to DON + administrator: "Phase 2 ready for sign-off — Room [X]."

TAB 4 — RESIDENT CONTEXT:
Lazy-loaded. Calls GET /api/residents/[residentId] and GET /api/incidents?residentId=X.

Incident Pattern:
Show count of incidents for this resident in last 30/90/180 days with type breakdown.
If 3+ incidents in 30 days: amber alert "Repeat incident pattern — consider care plan review."

Intervention History Panel:
Same as Resident Story Overview — all interventions active and removed, with dates.
"Add Intervention" button → POST /api/residents/[residentId]/interventions
This is the same panel built in task-08 — import and reuse the component.

Recent Assessments:
Last dietary assessment and last activity assessment with completeness scores.

SIGN-OFF PAGE — app/admin/incidents/[id]/signoff:
Full investigation report in document format (all sections in order).
All sections read-only on this page.
"Back to Investigation" link if correction needed.

DUAL SIGNATURE BLOCK (side by side desktop, stacked mobile):
DON block: name pre-filled, role "Director of Nursing", timestamp (now, not editable),
signature input (fingertip mobile / typed name desktop), "Sign as Director of Nursing" button.
If already signed: green checkmark, name, timestamp. Not editable.
On sign: send notification to Administrator "DON has signed — your signature needed."

Administrator block: same structure.
On sign: send notification to DON "Administrator has signed."

LOCK BUTTON: only visible when BOTH signatures present.
Full-width dark teal: "Lock Investigation"
Subtitle: "Both signatures recorded. This action is permanent."
On tap: confirmation dialog "Lock this investigation permanently?" → Confirm / Cancel
On confirm:
  incident.phase = "closed"
  Record both signatures with timestamps
  phaseTransitionTimestamps.phase2Locked = now
  Append to auditTrail: { action: "locked", performedBy: currentUserId,
    performedByName: currentUserName, timestamp: now }
  Generate closure report (existing /report page)
  Notify reporting nurse: "Your [incidentType] investigation has been completed."

UNLOCK BUTTON (visible on Screen 14 after locking, DON/admin only):
"Unlock Investigation" → confirmation dialog with required reason textarea (min 20 chars).
On confirm:
  Clear both signatures
  incident.phase = phase_2_in_progress
  Append to auditTrail: { action: "unlocked", reason: reasonText, ... }
  Show amber banner on Screen 14: "This investigation was unlocked on [date]. Changes recorded in audit trail."

IDT QUESTION SENDER PAGE — app/admin/incidents/[id]/questions:
(UI Specification Screen 15)
Shows incident context strip at top.
"Generate suggested questions" → call /api/intelligence/suggest-questions { incidentId, facilityId }
  Returns 3-5 suggested questions with recommended recipient roles.
  Each appears as editable card with recipient selector.
  "Add to queue" per card.
Manual compose: textarea + recipient selector + "Add to queue".
Queue review list with Remove buttons.
"Send All Questions" → sends all, fires notifications, returns to Screen 14.

SECTION WORKSPACE PAGES — app/admin/incidents/[id]/section/[sectionName]:
(UI Specification Screen 16)
Breadcrumb: Investigation → [Section Name]
Auto-save every 30 seconds (debounced PATCH to /api/incidents/[id]/sections/[sectionName])
IDT Responses panel always visible in sidebar (desktop) or collapsed accordion (mobile)
"Back to Investigation" link

CONTRIBUTING FACTORS:
Multi-select checklist. Default options: Medication Change, UTI or Infection,
Environmental Hazard, Equipment Failure, Staffing Issue, Resident Behavior,
Cognitive Decline, Pain or Discomfort, Toileting Need, Activity-Related, Other.
Other reveals free text. Notes free text.
"Mark section complete" → enabled when ≥1 factor selected.
PATCH /api/incidents/[id]/sections/contributing_factors { status: "complete", factors, notes }

ROOT CAUSE:
Required textarea, min 50 characters. Character count displayed.
"Suggest root cause" button → call /api/intelligence/suggest-root-cause { incidentId, facilityId }
  Returns suggested text as editable card. Accept / Modify / Dismiss.
"Mark section complete" → enabled when textarea ≥ 50 characters.
PATCH /api/incidents/[id]/sections/root_cause { status: "complete", description }

INTERVENTION REVIEW:
Fetch all interventions for this resident from GET /api/residents/[residentId]/interventions.
Per intervention: toggle "Still effective and active" / "No longer effective — remove".
Removed: flagged with note "Recommend removing from care plan."
Notes free text.
"Mark section complete" → enabled when all interventions have been toggled.
PATCH /api/incidents/[id]/sections/intervention_review { status: "complete", reviewedInterventions }

NEW INTERVENTION:
"Add intervention" → inline form: description (required), department (dropdown),
type (Temporary/Permanent), startDate (date picker, default today), notes (optional).
Multiple can be added. Each as a removable card.
"Mark section complete" → enabled when ≥1 intervention added.
On mark complete:
  PATCH /api/incidents/[id]/sections/new_intervention { status: "complete", interventions }
  Also POST to /api/residents/[residentId]/interventions for each new intervention
  (saves them to the resident's intervention history automatically).

NEW API ROUTES:

PATCH /api/incidents/[id]/sections/[sectionName]:
  Update section fields + status. Requires canAccessPhase2().
  Validates root_cause min length server-side.
  On status → "complete": check if all 4 sections now complete → fire notification.

POST /api/incidents/[id]/idtQuestions:
  Create IDT question. Requires canAccessPhase2().
  Notify recipient.

POST /api/incidents/[id]/signoff:
  { role: "don"|"administrator", signatureName: string }
  Record signature for the appropriate role.
  If both now signed: do NOT lock automatically — wait for Lock button.
  Notify the other role that their signature is needed.

POST /api/incidents/[id]/lock:
  Requires BOTH signatures to be present.
  Sets phase = "closed". Records phaseTransitionTimestamps.phase2Locked.
  Appends to auditTrail.

POST /api/incidents/[id]/unlock:
  { reason: string (min 20 chars) }
  Clears both signatures. Sets phase = phase_2_in_progress.
  Appends to auditTrail with reason.

GET /api/intelligence/suggest-questions?incidentId=X&facilityId=Y:
  Use gpt-4o-mini to analyze Phase 1 record and return 3-5 suggested questions.

GET /api/intelligence/suggest-root-cause?incidentId=X&facilityId=Y:
  Use gpt-4o-mini to suggest root cause based on Phase 1 + contributing factors.

PART B — WAIK INTELLIGENCE

Update lib/agents/intelligence-qa.ts and intelligence-tools.ts:
  facilityId required on ALL MongoDB queries — no exceptions.

app/admin/intelligence/page.tsx (UI Specification Screen 26):

SECTION 1 — ASK ANYTHING:
Search bar: "Ask anything about your community..."
On submit: POST /api/intelligence/query { query, facilityId }
Display response as plain-language text. Incident IDs as tappable links.
8 suggested queries on empty state:
  "What are the most common fall locations this month?"
  "Which residents have had more than 2 incidents in the last 30 days?"
  "Show all open investigations older than 48 hours"
  "What environmental factors appear most often in fall incidents?"
  "Which staff members have the highest average completeness scores?"
  "Which wing has the most incidents this quarter?"
  "Are there residents with both a fall and a declining dietary assessment?"
  "What is our average time to close a Phase 2 investigation?"

SECTION 2 — SAVED INSIGHTS (auto-generated):
Four cards loading on page open. Call GET /api/intelligence/saved-insights?facilityId=X
Cache in Redis: "waik:insights:{facilityId}" 1-hour TTL.

Card 1 — This Week at a Glance:
  incidents this week vs last week, Phase 2 closed this week vs last, assessments done.
  Three large numbers with directional arrows.

Card 2 — Completeness Trend:
  Use recharts BarChart. Average Phase 1 completeness per week, last 8 weeks.
  Teal bars. Dashed line at facility target threshold.

Card 3 — Attention Needed:
  LLM-generated anomaly: compare this week's incident counts/patterns to 30-day baseline.
  If anomaly: "X falls in Wing B in 7 days — above your 30-day average of Y per week."
  If none: "No unusual patterns detected this week."

Card 4 — Staff Performance:
  Top 3 completeness scores this month (show names to admin/DON, anonymized to others).
  Flag: any staff member whose avg is 15+ points below facility average.

GET /api/intelligence/saved-insights?facilityId=X:
  Generate all 4 card contents. Cache in Redis. Return as JSON.

GET /api/intelligence/daily-brief?facilityId=X:
  Open investigations count, pending staff questions, assessments due today.
  Return plain text. Cache in Redis "waik:brief:{facilityId}" 1 hour.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Rewrite `documentation/waik/06-INVESTIGATION-AGENT.md` — Phase 2 complete spec
- Create `documentation/waik/17-WAIK-INTELLIGENCE.md`
- Create `plan/pilot_1/phase_4/task-09-DONE.md`

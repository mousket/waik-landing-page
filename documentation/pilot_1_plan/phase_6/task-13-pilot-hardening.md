# Task 13 — Pilot Hardening, Feedback & Demo Mode
## Phase: 6 — PWA & Notifications
## Estimated Time: 6–7 hours
## Depends On: All previous tasks

---

## Why This Task Exists

This task is the difference between a working product and a pilot-ready product.
The individual features are complete after task-12. This task makes the whole
thing feel like something you would show a stranger.

The report card is the single most important addition from the co-founder
meetings. Scott said it directly: nurses will compete with each other in a good
way once they can see their scores. The streak indicator, personal average, and
facility average are not vanity metrics — they are the behavioral feedback loop
that drives documentation improvement over time. The report card is the last
screen every nurse sees after every report. It has to be right.

The demo mode seed data is also more specific now. Scott described wanting to
use demo mode for beta testing — real nurses trying real scenarios. The seed
data needs to be realistic enough that an experienced nurse looks at it and
thinks "yes, this is what our building looks like." That means varied
completeness scores, incidents in all phases, injuries flagged on some, Phase 2
investigations with IDT questions sent and responses received.

The closure report is the tangible output administrators will use to evaluate
WAiK before agreeing to a pilot. It has to be clean and professional.

This task implements Screen 9 (report card) and Screen 30 (demo mode) of the
UI Specification, plus the closure report for Screen 17.

---

## Context Files

- `app/staff/report/page.tsx` — add completeness bar + feedback widget + report card
- `app/admin/incidents/[id]/report/page.tsx` — create closure report
- `app/waik-demo-start/login/page.tsx` — rebuild as 4-role demo entry
- `data/db.json` — rebuild with realistic seed data
- `backend/src/models/feedback.model.ts` — create

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Completeness ring animates in real time during Tier 2 question answering
- [ ] Ring color: red 0–59%, amber 60–84%, teal 85–100%
- [ ] Report card screen (Screen 9) appears after Phase 1 sign-off
- [ ] Report card shows: score for this report, personal average, facility average
- [ ] Report card shows streak indicator when currentStreak ≥ 3 (fire emoji + count)
- [ ] Report card shows 2–3 specific coaching tips based on missing fields
- [ ] Tips tone is celebratory above 85%, encouraging 60–84%, direct below 60%
- [ ] Feedback widget "Was WAiK helpful today?" appears below report card
- [ ] Feedback submits rating + optional comment to `/api/feedback`
- [ ] Feedback appears in WAiK super-admin feedback summary
- [ ] Closure report at `/admin/incidents/[id]/report` renders cleanly
- [ ] Closure report has all 9 sections in correct order
- [ ] "Print / Save as PDF" triggers browser print dialog
- [ ] Demo entry screen has 4 role cards with correct role labels
- [ ] Demo session set to 30 minutes via sessionStorage
- [ ] DEMO MODE banner visible on every page in demo mode
- [ ] Demo voice report runs but writes nothing to MongoDB
- [ ] Demo session expired modal offers "New Demo" and "Create Account"
- [ ] Seed data has 5 residents, 10 incidents, realistic completeness distribution
- [ ] Sentry installed, capturing errors without PHI
- [ ] beforeSend hook strips narrative/statement/answer fields

---

## Test Cases

```
TEST 1 — Completeness ring updates after answer
  Action: Start voice report on Tier 2 board, answer a question
  Expected: Ring animates upward to new percentage
  Pass/Fail: ___

TEST 2 — Ring color correct at each tier
  Setup: Mock completeness at 50%, then 72%, then 88%
  Expected: Red, then amber, then teal
  Pass/Fail: ___

TEST 3 — Report card appears after sign-off
  Action: Complete Phase 1 sign-off (Screen 8)
  Expected: Report card screen (Screen 9) appears, not the dashboard
  Pass/Fail: ___

TEST 4 — Report card shows three score comparisons
  Action: View report card after submitting a report
  Expected: Three lines visible: "Your score this report", "Your personal average",
            "Facility average" — all with correct values
  Pass/Fail: ___

TEST 5 — Streak indicator appears at threshold
  Setup: Mock staff with 4 consecutive reports above 85%
  Action: View report card
  Expected: "🔥 4-report streak — above 85%" card visible
  Pass/Fail: ___

TEST 6 — Streak not shown below threshold
  Setup: Staff has 2 consecutive reports above 85%
  Action: View report card
  Expected: Streak card not visible (minimum 3 to show)
  Pass/Fail: ___

TEST 7 — Coaching tips are specific not generic
  Setup: Report missing call light status and footwear fields
  Action: View report card coaching tips
  Expected: Tips mention call light and footwear specifically, not generic advice
  Pass/Fail: ___

TEST 8 — Feedback widget appears below report card
  Action: Complete Phase 1 sign-off, arrive at report card
  Expected: "Was WAiK helpful today?" with 3 emoji buttons visible below score
  Pass/Fail: ___

TEST 9 — Feedback submits and widget hides
  Action: Click 👍, add comment "Easy to use", click Submit
  Expected: "Thank you for your feedback!" shown. Widget disappears.
            FeedbackModel document exists in MongoDB.
  Pass/Fail: ___

TEST 10 — Feedback skip works
  Action: Click "Skip" link on feedback widget
  Expected: Widget disappears. No feedback document created.
  Pass/Fail: ___

TEST 11 — Closure report renders correctly
  Action: Navigate to /admin/incidents/[id]/report for a locked investigation
  Expected: Clean page, no nav chrome, 9 sections all populated
  Pass/Fail: ___

TEST 12 — Print dialog opens
  Action: Click "Print / Save as PDF" on closure report
  Expected: Browser print dialog opens
  Pass/Fail: ___

TEST 13 — Demo entry loads correctly
  Action: Navigate to /waik-demo-start/login, click "I'm a Director of Nursing"
  Expected: Admin dashboard loads with seed data. Yellow DEMO MODE banner visible.
  Pass/Fail: ___

TEST 14 — Demo does not write to MongoDB
  Action: In demo mode, complete a voice report through sign-off
  Expected: No new documents in MongoDB. Report shows in demo dashboard only.
  Pass/Fail: ___

TEST 15 — Demo session expires correctly
  Action: Set waik-demo-expires to 2 minutes ago. Navigate to any demo page.
  Expected: Expiry modal appears: "Your demo session has ended."
            Two buttons: "Start New Demo" and "Create Account"
  Pass/Fail: ___

TEST 16 — Sentry does not capture PHI
  Action: Trigger an agent error while processing an incident with resident name
  Expected: Sentry event exists. Event context does NOT contain resident name,
            narrative text, question text, or answer text.
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm preparing WAiK for its first pilot. This task adds the report card screen,
feedback system, closure report, demo mode with realistic seed data, and error
monitoring. It implements Screen 9 and Screen 30 of the UI specification.

PART A — COMPLETENESS RING IN VOICE REPORT

In app/staff/report/page.tsx:
The completion ring already exists in the VoiceInputScreen component (task-03).
Ensure the ring is also visible on the Tier 2 question board (Screen 5 state).
During the agent phase, after each answered question:
  - Receive completenessScore from API response
  - Animate ring from previous value to new value using CSS transition (400ms ease)
  - Color: red (#C0392B) 0-59%, amber (#E8A838) 60-84%, teal (#0D7377) 85-100%

PART B — REPORT CARD SCREEN (Screen 9)

After Phase 1 sign-off, navigate to a report card route:
/staff/report/[type]/[id]/reportcard

Build app/staff/report/[type]/[id]/reportcard/page.tsx:

SECTION 1 — THANK YOU HEADER:
Full-width teal card.
Large text: "Report submitted. Thank you."
Subtext: "Your Phase 1 report has been submitted."

SECTION 2 — SCORE DISPLAY (hero element):
Large circular ring (80px diameter) filled to completeness percentage.
Large number inside ring: "[X]%"
Ring color: same rules as above.
Three lines below:
  "Your score this report: [X]%"
  "Your personal average on [incidentType] reports: [Y]%" 
    — compute from staffCompletionHistory (task-05 added this to incident model)
    — if first report of this type: "This is your first [type] report."
  "Facility average on [incidentType] reports: [Z]%"
    — compute from all incidents this month for this facility and type
    — if fewer than 5 facility reports of this type: hide this line

SECTION 3 — STREAK INDICATOR (conditional):
Only show when currentStreak >= 3.
Amber background card with fire emoji:
"🔥 [N]-report streak — above 85%"
"You have submitted [N] consecutive reports above the excellence threshold."
currentStreak: count consecutive recent incidents where completenessAtSignoff >= 85
  (newest first, stop at first incident below 85)
Store currentStreak and bestStreak on the staff member's user record or derive
from incident history.

SECTION 4 — COACHING TIPS (personalized):
Generate 2-3 tips based on which Gold Standards fields were NOT captured.
This requires knowing which fields are in the completenessAtSignoff gap.
Store unfilledFields: string[] on the incident at sign-off time.

Tips generation:
  - Look at unfilledFields for this incident
  - Map each unfilled Gold Standards field to a plain-language tip
  - Limit to 3 most common/important missing fields
  - Tone based on score:
      ≥90%: lead with celebration before tips: "Excellent report — your narrative
             covered [X] automatically."
      ≥85%: positive framing: "Strong report. For next time: ..."
      60-84%: helpful guidance: "A few details would strengthen this report: ..."
      <60%: direct and specific: "Next time, try to include: ..."

Example tip mappings:
  "callLightWithinReach" → "Note whether the call light was within the resident's reach."
  "footwearType" → "Describe the resident's footwear at time of the incident."
  "lightingCondition" → "Include the lighting conditions in your environment description."
  "witnessNames" → "List the names of any witnesses who were present."
  "physiciansNotified" → "Note whether and when the physician was notified."

SECTION 5 — FEEDBACK WIDGET:
"Was WAiK helpful today?"
Three emoji buttons: 👍 Yes | 😐 Kind of | 👎 Not really
Optional text input: "Tell us why (optional)" — single line
"Submit" button → POST /api/feedback { userId, facilityId, rating, comment, incidentId }
After submit: show "Thank you for your feedback!" Hide widget.
"Skip" link: hide widget without submitting.

SECTION 6 — HOME BUTTON:
Full-width "Return to Dashboard" button → /staff/dashboard
Back navigation disabled from this screen (swipe down does nothing).

Create FeedbackModel if not exists:
  id, userId, facilityId, rating: { type: Number, enum: [-1, 0, 1] },
  comment, incidentId, createdAt

Add to /waik-admin/[facilityId]/page.tsx:
  Feedback summary: avg rating (1 decimal), total responses, 5 most recent comments.
  Each comment: emoji for rating, comment text, date.

PART C — CLOSURE REPORT (Screen 17 continuation)

Create app/admin/incidents/[id]/report/page.tsx:
Print-optimized: max-width 800px, no nav, white background.
CSS @media print { @page { margin: 1in; } body { print-color-adjust: exact; } }

Nine sections in order:
  1. Header: community name (from facility profile), "Incident Investigation Report",
     generated date and time
  2. Resident + Incident Details: room number, incident type, date/time, location
  3. Reporting Staff: name, role, phase1SignedAt
  4. Phase 1 — Staff's Original Words: verbatim narrative in styled quote block,
     labeled "Staff's exact words — preserved verbatim"
  5. Phase 1 — Clinical Record: WAiK-generated version
  6. Phase 1 — All Q&A: each question/answer pair with answered-by and timestamp
  7. Phase 2 — IDT Contributions: all questions sent + responses received, with
     responder name, role, timestamp
  8. Investigation Findings: contributing factors list, root cause text,
     intervention review summary (removed + retained), new interventions list
  9. Signatures: Phase 1 nurse signature with timestamp, DON signature with timestamp,
     Administrator signature with timestamp, Phase 2 locked timestamp
  10. Completeness: "Phase 1 completeness: [X]% of Gold Standards fields captured."

"Print / Save as PDF" button at top of page: onClick={() => window.print()}
"Back to investigation" link: opens /admin/incidents/[id] in current tab.

Route protection: only DON, administrator, owner can access this page.

PART D — DEMO MODE (Screen 30)

Rebuild app/waik-demo-start/login/page.tsx:
Full-screen teal background. WAiK logo + tagline.
Title: "WAiK Demo — Explore without creating an account."
Subtitle: "Experience WAiK as any role in a senior care community."

Four large role cards (2x2 grid):
  "I'm a Nurse" → sets demoRole = "rn", redirects to /staff/dashboard
  "I'm a Director of Nursing" → demoRole = "director_of_nursing", redirects to /admin/dashboard
  "I'm an Administrator" → demoRole = "administrator", redirects to /admin/dashboard
  "I'm an Owner" → demoRole = "owner", redirects to /admin/dashboard

On click: sessionStorage.setItem("waik-demo-role", demoRole)
          sessionStorage.setItem("waik-demo-expires", Date.now() + 30*60*1000)

Create lib/demo-context.ts:
  isDemoMode(): boolean — check sessionStorage and expiry
  getDemoRole(): string | null
  clearDemoSession(): void

Create components/demo-banner.tsx:
  Reads isDemoMode()
  If true: yellow sticky banner at top of every page:
    "DEMO MODE — No data is saved. Session expires in [X] minutes."
    "Start Over" link → /waik-demo-start/login
  Countdown updates every minute.

Session expiry handling:
  On any page load: check isDemoMode() + expiry.
  If expired: show modal (not redirect):
    Title: "Your demo session has ended."
    Two buttons: "Start New Demo" → /waik-demo-start/login
                 "Create Account" → /sign-up
  Modal cannot be dismissed without choosing one option.

Demo mode API behavior:
  In each API route: check if demo session is active (look for demo header or cookie).
  If demo: return seed data from data/db.json instead of querying MongoDB.
  POST/PATCH/DELETE in demo mode: return success response but write nothing.
  Add a helper isDemoRequest(req) that checks for the demo indicator.

Update data/db.json with realistic seed data:

5 RESIDENTS:
  Room 102: Margaret Chen, SNF, memory care, 84F, hip fracture primary diagnosis
  Room 204: Robert Johnson, SNF, skilled nursing, 78M, COPD + diabetes
  Room 306: Dorothy Martinez, ALF, assisted, 91F, mild dementia
  Room 411: James Wilson, SNF, skilled nursing, 67M, recent stroke
  Room 515: Helen Thompson, SNF, skilled nursing, 88F, CHF + fall history

10 INCIDENTS (mix of completeness scores to show range):

PHASE 1 IN PROGRESS (3):
  - Room 102 fall, completeness 45%, 6 Tier 2 questions pending (shows low score)
  - Room 306 fall, completeness 67%, 3 Tier 2 questions pending
  - Room 515 medication error, completeness 88%, 1 closing question pending

PHASE 2 IN PROGRESS (4):
  - Room 204 fall, Phase 1 completeness 82%, IDT questions sent to dietary + PT,
    dietary responded, PT pending 26 hours (shows overdue IDT task)
    hasInjury = true (shows red alert if Phase 2 somehow unclaimed)
  - Room 411 fall, Phase 1 completeness 76%, all 4 sections in progress
  - Room 102 resident conflict, Phase 1 completeness 91%, sections: contributing
    factors complete, root cause in progress, others not started
  - Room 306 fall, Phase 1 completeness 79%, all sections complete, ready to lock
    (shows Ready to Lock banner state)

CLOSED (3):
  - Room 515 fall, Phase 1 completeness 93%, Phase 2 locked 3 days ago
  - Room 204 medication error, Phase 1 completeness 71%, closed 10 days ago
  - Room 411 wound injury, Phase 1 completeness 85%, closed 18 days ago

PART E — ERROR MONITORING

npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
Set SENTRY_DSN in environment variables.

Configure in sentry.client.config.ts and sentry.server.config.ts:
  dsn: process.env.SENTRY_DSN

  beforeSend(event) {
    // Strip PHI from all event contexts
    const phiFields = ['narrative', 'statement', 'answerText', 'questionText',
      'residentName', 'firstName', 'lastName', 'content', 'rawTranscript']
    if (event.extra) {
      phiFields.forEach(field => { delete event.extra[field] })
    }
    if (event.contexts) {
      Object.values(event.contexts).forEach(ctx => {
        phiFields.forEach(field => { delete ctx[field] })
      })
    }
    return event
  }

Add user context to every server-side error:
  Sentry.setUser({ id: userId, facilityId, role })
  NEVER add residentName, narrative, or any clinical content to context.

Capture these error sources:
  - All unhandled API route errors (global error handler)
  - All agent failures (try/catch in report-conversational, intelligence-query)
  - All Redis connection errors
  - Client-side React errors via ErrorBoundary (already created in task-03)

Loading skeletons (if not already complete from task-05 and task-06):
  Verify Skeleton components from shadcn/ui are showing on:
  - Staff dashboard: pending questions and recent reports sections
  - Admin dashboard: all three tab tables
  These were specified in task-05 and task-06 — only add here if missing.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/READY_TO_TEST.md` with current pilot readiness status
- Create `plan/pilot_1/phase_6/task-13-DONE.md`

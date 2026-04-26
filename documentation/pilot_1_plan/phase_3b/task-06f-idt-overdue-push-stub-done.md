# Task 06f — IDT Overdue Section + Push Notification Stub
## Phase: 3b — Admin Dashboard
## Estimated Time: 2–3 hours
## Depends On: task-06e (sidebar complete)

---

## Why This Task Exists

IDT overdue tasks are the third section of the Needs Attention tab. They
were left for this task deliberately — they depend on the `isIdtOverdue()`
utility from task-06b, the push notification system from task-12, and a
stub API that can be replaced when push is real.

**Design pattern: Stub before real.**
The "Send Reminder" button needs to fire a push notification to an IDT
team member. Task-12 builds the full push infrastructure. Waiting for
task-12 to build this button would delay the admin dashboard by many
tasks. The correct pattern: build a stub API route now that logs the
intent and returns success, then wire the real push payload in task-12.
The button works end-to-end today. Task-12 replaces one import without
touching the UI.

**Infrastructure: POST /api/push/send stub.**
The stub accepts `{ targetUserId, payload }`, logs the notification
intent, and returns `{ success: true, queued: true, delivered: false }`.
The `delivered: false` flag tells the UI this is a stub — in production
it will be `true`. The stub is safe to deploy — no real push is sent,
no VAPID keys are needed, no service worker is involved.

**Why IDT overdue is separate from red/yellow alerts:**
Red and yellow alerts require the DON's action (claim the investigation).
IDT overdue requires sending a nudge to another person. These are
categorically different actions — one is the DON taking ownership, the
other is the DON managing her team. Grouping them would blur that
distinction. Separate sections with separate verbs ("Claim" vs
"Send Reminder") make the required action unambiguous.

---

## Context Files

- `app/admin/dashboard/page.tsx` — add overdue IDT section to Needs Attention tab
- `app/api/push/send/route.ts` — CREATE STUB
- `lib/utils/incident-classification.ts` — isIdtOverdue() from task-06b
- `lib/types/incident-summary.ts` — from task-06a

---

## Push Stub API Contract

```typescript
// POST /api/push/send
// Request body:
{
  targetUserId: string,
  payload: {
    title: string,      // notification title
    body: string,       // notification body
    url: string         // deep link
  }
}

// Response:
{
  success: true,
  queued: true,
  delivered: false,    // false = stub, true = real push sent (task-12)
  message: "Notification queued (push not yet configured)"
}
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Overdue IDT section visible in Needs Attention tab below yellow cards
- [ ] Overdue IDT task shows: IDT member name, role, which incident (room + type), hours overdue
- [ ] "Send Reminder" button calls POST /api/push/send
- [ ] After click: button shows "Sent ✓" for 5 seconds, then resets
- [ ] POST /api/push/send stub returns { success: true, queued: true, delivered: false }
- [ ] Stub logs the notification intent to console (not to database)
- [ ] Overdue IDT section hidden when no overdue tasks exist
- [ ] Count badge on Needs Attention tab includes overdue IDT count
- [ ] POST /api/push/send requires auth — 401 if no session

---

## Test Cases

```
TEST 1 — isIdtOverdue identifies overdue member
  Action: isIdtOverdue({ status: "pending", questionSentAt: 30_hours_ago })
  Expected: true
  Pass/Fail: ___

TEST 2 — isIdtOverdue ignores answered members
  Action: isIdtOverdue({ status: "answered", questionSentAt: 30_hours_ago })
  Expected: false
  Pass/Fail: ___

TEST 3 — Overdue IDT section shows Kevin Park from INC-006
  Action: Load Needs Attention tab
  Expected: Kevin Park (physical_therapist) visible
            "Room 204 — Fall" visible
            "18 hours overdue" or similar time label visible
  Pass/Fail: ___

TEST 4 — Send Reminder calls push stub
  Action: Click "Send Reminder" on Kevin Park's overdue task
  Expected: POST /api/push/send called with:
            targetUserId: "user-pt-001"
            payload.title: contains "Response needed" or similar
            payload.url: /admin/incidents/inc-006
  Pass/Fail: ___

TEST 5 — Push stub returns queued response
  Action: POST /api/push/send { targetUserId, payload }
  Expected: { success: true, queued: true, delivered: false }
  Pass/Fail: ___

TEST 6 — Button shows Sent state
  Action: Click Send Reminder
  Expected: Button changes to "Sent ✓", disabled for 5 seconds
            Then resets to "Send Reminder"
  Pass/Fail: ___

TEST 7 — Needs Attention count includes overdue IDT
  Action: Load tab with 2 red, 1 yellow, 1 overdue IDT
  Expected: Tab badge shows "4"
  Pass/Fail: ___

TEST 8 — Push route requires auth
  Action: POST /api/push/send without Clerk session
  Expected: 401 Unauthorized
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task adds the overdue IDT section
to the Needs Attention tab and creates a push notification stub API.

PART A — CREATE POST /api/push/send/route.ts (STUB)

This is a stub that will be replaced by the real push implementation in
task-12. It accepts the notification request, logs it, and returns success.

export const POST = withAuth(async (req, { currentUser }) => {
  const { targetUserId, payload } = await req.json()
  
  if (!targetUserId || !payload?.title || !payload?.body) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }
  
  // STUB: log intent — real push sent in task-12
  console.log("[Push Stub] Notification queued:", {
    from: currentUser.userId,
    to: targetUserId,
    facilityId: currentUser.facilityId,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    timestamp: new Date().toISOString()
  })
  
  return Response.json({
    success: true,
    queued: true,
    delivered: false,
    message: "Notification queued (push infrastructure configured in task-12)"
  })
})

IMPORTANT: This stub must NOT be confused with the real push route in task-12.
Add a comment at the top of the file:
  // STUB — Replace with real implementation in task-12-push-notifications
  // Do not add VAPID logic here — task-12 handles that

PART B — IDT OVERDUE SECTION DATA

In app/admin/dashboard/page.tsx, extend the Needs Attention data processing.

After loading phase_2_in_progress incidents (already loaded for Active tab —
share the data, do not fetch again), extract overdue IDT members:

  type OverdueIdtTask = {
    incidentId: string
    residentRoom: string
    incidentType: string
    member: IdtTeamMember
    hoursOverdue: number
  }
  
  const overdueIdtTasks: OverdueIdtTask[] = []
  
  phase2Incidents.forEach(incident => {
    incident.idtTeam.forEach(member => {
      if (isIdtOverdue(member)) {
        const sentMs = new Date(member.questionSentAt!).getTime()
        const hoursElapsed = (Date.now() - sentMs) / (1000 * 60 * 60)
        overdueIdtTasks.push({
          incidentId: incident.id,
          residentRoom: incident.residentRoom,
          incidentType: incident.incidentType,
          member,
          hoursOverdue: Math.floor(hoursElapsed - 24)  // hours beyond threshold
        })
      }
    })
  })
  
  // Sort: most overdue first
  overdueIdtTasks.sort((a, b) => b.hoursOverdue - a.hoursOverdue)

Update Needs Attention count badge:
  redAlerts.length + yellowAwaiting.length + overdueIdtTasks.length

PART C — OVERDUE IDT SECTION UI

In the Needs Attention tab, below the yellow awaiting section:

  {overdueIdtTasks.length > 0 && (
    <>
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mt-6 mb-3">
        Overdue IDT Tasks
      </h3>
      {overdueIdtTasks.map((task, i) => (
        <OverdueIdtCard key={i} task={task} />
      ))}
    </>
  )}

OverdueIdtCard component (inline or extract):
  White card, border-left 4px solid #E8A838, border-radius 12px
  Background: #FBF0D9
  Padding: 16px, margin-bottom: 8px
  
  Row 1: "[member.name]" (font-semibold) + role badge (small teal pill)
  Row 2: "Room [residentRoom] — [incidentType display]"
  Row 3: "[hoursOverdue] hours overdue" in amber text
  Row 4: SendReminderButton component

SendReminderButton ("use client"):
  Props: targetUserId, incidentId, residentRoom, incidentType
  
  States: idle | loading | sent | error
  
  idle: teal outline button "Send Reminder"
  loading: spinner, disabled
  sent: green "Sent ✓", disabled — resets to idle after 5 seconds
  error: red "Failed — retry"
  
  On click:
    setStatus("loading")
    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId,
        payload: {
          title: "Response needed — WAiK investigation",
          body: `Your input on the Room ${residentRoom} ${incidentType} investigation is overdue.`,
          url: `/admin/incidents/${incidentId}`
        }
      })
    })
    if (res.ok) {
      setStatus("sent")
      setTimeout(() => setStatus("idle"), 5000)
    } else {
      setStatus("error")
    }

PART D — UPDATE NEEDS ATTENTION COUNT

The count badge on the Needs Attention tab must include all three
sections. Update wherever the badge count is computed:
  const needsAttentionCount = redAlerts.length + yellowAwaiting.length + overdueIdtTasks.length

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/11-ADMIN-DASHBOARD.md` — IDT overdue section
- Document push stub in `documentation/waik/03-API-REFERENCE.md`
  with note: "Stub — full implementation in task-12"
- Create `plan/pilot_1/phase_3b/task-06f-DONE.md`

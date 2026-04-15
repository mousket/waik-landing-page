# Task 12 — Push Notifications + Notification Center
## Phase: 6 — PWA & Notifications
## Estimated Time: 6–7 hours
## Depends On: task-04 (PWA), task-11 (notification preferences settings)

---

## Why This Task Exists

Push notifications are the mechanism that keeps WAiK alive between sessions.
The Phase 2 trigger notification — firing the moment a nurse signs Phase 1 —
is what makes the DON feel that WAiK is watching, not just storing. Without it,
Phase 2 depends on the DON checking the dashboard. With it, Phase 2 happens
because the DON was told something needed her attention right now.

Two things changed from the original plan based on the co-founder meetings:

First: notification content must be split by device type. Scott was explicit —
personal cell phones should receive room numbers only, not resident names.
Work-issued devices can receive full details. This is a HIPAA risk management
decision, not a preference. The `deviceType` field on the user profile (set in
task-02 and exposed in Screen 27) drives this split automatically. The
push-service needs to check deviceType before constructing the payload.

Second: the notification center (in-app inbox) is now part of this task.
The bell icon, popover panel, full notification history page, and the
`lib/notification-service.ts` centralized creator are all here. Notifications
stored in the database, queryable, markable as read — not just push-and-forget.

This task implements Screen 24 of the UI Specification (Pass 3) alongside the
push infrastructure.

---

## Context Files

- `backend/src/models/user.model.ts` — deviceType field (task-02)
- `lib/push-service.ts` — create this
- `lib/notification-service.ts` — create this (centralized notification creator)
- `backend/src/models/notification.model.ts` — create this
- `public/sw.js` — serwist service worker (task-04)
- `app/admin/settings/notifications/page.tsx` — preferences stored in task-11

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] VAPID keys in environment variables
- [ ] `POST /api/push/subscribe` saves subscription with deviceType from user profile
- [ ] `sendPush()` constructs payload based on recipient's deviceType:
      personal = room number only, work = full details
- [ ] Phase 1 sign-off triggers Phase 2 notification to configured roles within 30 seconds
- [ ] Phase 1 sign-off notification respects per-facility notification preferences
- [ ] Push notification received on locked device screen
- [ ] Tapping notification opens correct deep link
- [ ] Cron routes all protected by CRON_SECRET
- [ ] Question reminder fires 2 hours after deferred questions
- [ ] Second reminder fires at 4 hours. Escalation to admin at 8 hours.
- [ ] `lib/notification-service.ts` creates both DB record and push simultaneously
- [ ] `backend/src/models/notification.model.ts` exists with all fields
- [ ] Bell icon shows correct unread count across all pages
- [ ] Bell count polls every 60 seconds without full page reload
- [ ] Popover panel shows last 10 notifications grouped by Today/Yesterday/Older
- [ ] Tapping notification in popover navigates to actionUrl and marks as read
- [ ] "Mark all read" clears all unread
- [ ] Full notification history page at `/staff/notifications` and `/admin/notifications`
- [ ] All 11 notification types listed in catalog are implemented

---

## Test Cases

```
TEST 1 — Personal device gets room number only
  Setup: Set user.deviceType = "personal". Subscribe to push.
  Action: Complete a Phase 1 report (triggers Phase 2 notification)
  Expected: Push notification body contains "Room 204" but NOT the resident name
  Pass/Fail: ___

TEST 2 — Work device gets full details
  Setup: Set user.deviceType = "work". Subscribe to push.
  Action: Complete a Phase 1 report
  Expected: Push notification body contains resident name and full incident details
  Pass/Fail: ___

TEST 3 — Notification respects facility preferences
  Setup: In settings, disable Therapy Director for Fall Phase 1 signed notification
  Action: Complete a Fall Phase 1 report
  Expected: Therapy Director does NOT receive push notification
  Pass/Fail: ___

TEST 4 — Phase 2 trigger within 30 seconds
  Setup: DON user subscribed to push
  Action: Submit Phase 1 sign-off
  Expected: DON receives push within 30 seconds
  Pass/Fail: ___

TEST 5 — Notification deep link correct
  Action: Tap Phase 2 trigger notification
  Expected: App opens to /admin/incidents/[correct-incidentId]
  Pass/Fail: ___

TEST 6 — Background push received
  Action: Background the app on iOS/Android. Trigger Phase 2 notification.
  Expected: Push visible in device notification tray
  Pass/Fail: ___

TEST 7 — Cron routes require CRON_SECRET
  Action: GET /api/cron/question-reminders without Authorization header
  Expected: 401 Unauthorized
  Pass/Fail: ___

TEST 8 — Question reminder fires at 2 hours
  Setup: Create incident with deferred questions. Set deferredAt to 2.5 hours ago.
  Action: Trigger /api/cron/question-reminders
  Expected: Push sent to incident.staffId. DB notification record created.
  Pass/Fail: ___

TEST 9 — Escalation to admin at 8 hours
  Setup: Incident with deferred questions, deferredAt = 9 hours ago
  Action: Trigger /api/cron/question-reminders
  Expected: Escalation notification sent to DON + admin for that facility
  Pass/Fail: ___

TEST 10 — Bell icon count correct
  Setup: Create 3 unread notifications for current user
  Action: Load any page with the top header
  Expected: Bell shows red badge with "3"
  Pass/Fail: ___

TEST 11 — Bell count updates without reload
  Setup: Create a new notification for current user while page is open
  Action: Wait 65 seconds
  Expected: Badge count increments without manual page refresh
  Pass/Fail: ___

TEST 12 — Popover shows grouped notifications
  Action: Create notifications from Today and Yesterday. Click bell.
  Expected: Popover shows "Today" group and "Yesterday" group with correct entries
  Pass/Fail: ___

TEST 13 — Tapping notification marks as read and navigates
  Action: Click an unread notification in popover
  Expected: Teal unread dot disappears. App navigates to actionUrl. Badge decrements.
  Pass/Fail: ___

TEST 14 — Mark all read
  Action: Click "Mark all read" in popover header
  Expected: All teal dots disappear. Badge clears to 0.
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14 as a PWA. This task adds push notifications
with PHI-aware device routing, the complete notification catalog, and the
in-app notification center. It implements Screen 24 of the UI specification.

PART A — PUSH INFRASTRUCTURE

1. Install and configure web-push:
   npm install web-push @types/web-push
   npx web-push generate-vapid-keys
   Set in .env.local: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY

2. Create backend/src/models/push-subscription.model.ts:
   id, userId, facilityId (required, indexed)
   subscription: Schema.Types.Mixed (full PushSubscription JSON)
   deviceType: { type: String, enum: ['personal','work'], default: 'personal' }
   userAgent: String
   isActive: { type: Boolean, default: true }
   createdAt, lastUsedAt: Date

3. POST /api/push/subscribe:
   Requires getCurrentUser()
   Read user.deviceType from UserModel for this userId
   Save subscription with deviceType from user profile
   If subscription for this userId already exists: update it

4. DELETE /api/push/unsubscribe:
   Set isActive = false for all subscriptions for this userId

5. Create lib/push-service.ts:

   sendPush(targetUserId: string, payload: {
     titlePersonal: string,   // version for personal device (room numbers only)
     titleWork: string,       // version for work device (full details)
     bodyPersonal: string,
     bodyWork: string,
     url: string
   }): Promise<void>
     - Find all active PushSubscriptions for targetUserId
     - For each: pick titlePersonal/bodyPersonal if deviceType === 'personal',
       else pick titleWork/bodyWork
     - Send via webpush.sendNotification()
     - On 410 Gone: set subscription.isActive = false
     - Fire-and-forget: do not await in calling routes

   Helper functions (all use sendPush internally):

   sendPhase2Trigger(incidentId, roomNumber, residentName, facilityId, incidentType):
     titlePersonal: "[incidentType] investigation ready — Room [roomNumber]"
     titleWork: "[incidentType] investigation ready — [residentName], Room [roomNumber]"
     bodyPersonal: "Phase 1 complete. Tap to begin the investigation."
     bodyWork: "Phase 1 complete. Tap to claim the investigation."
     url: /admin/incidents/[incidentId]
     Targets: all DON + administrator users for this facility who have active subscriptions
     Respects facility notification preferences: only send to roles enabled for
     "when Phase 1 signed" for this incident type

   sendQuestionReminder(incidentId, roomNumber, residentName, staffId, questionsCount):
     titlePersonal: "Questions waiting — Room [roomNumber] report"
     titleWork: "Questions waiting — [residentName] report needs [questionsCount] more answers"
     bodyPersonal: "Tap to continue your incident report."
     bodyWork: "Tap to answer [questionsCount] remaining questions."
     url: /staff/incidents/[incidentId]
     Targets: staffId only

   sendAdminEscalation(incidentId, roomNumber, residentName, facilityId, hoursElapsed):
     titlePersonal: "Incomplete report — Room [roomNumber] — [hoursElapsed]h elapsed"
     titleWork: "Incomplete report — [residentName], Room [roomNumber] — [hoursElapsed]h"
     bodyPersonal: "Questions remain unanswered. Review needed."
     bodyWork: "Staff has not completed the incident report. Review required."
     url: /admin/incidents/[incidentId]
     Targets: all DON + admin users for this facility

   sendPhase2ReadyToLock(incidentId, roomNumber, facilityId):
     titlePersonal: "Investigation ready for sign-off — Room [roomNumber]"
     titleWork: "Investigation ready for sign-off — Room [roomNumber]"
     bodyPersonal: "All sections complete. Both signatures needed to lock."
     bodyWork: "All sections complete. Both signatures needed to lock."
     url: /admin/incidents/[incidentId]/signoff
     Targets: DON + administrator for facility

   sendAssessmentDue(residentName, roomNumber, assessmentType, staffId):
     titlePersonal: "Assessment due — Room [roomNumber]"
     titleWork: "[assessmentType] assessment due — [residentName]"
     url: /staff/assessments/[assessmentType]

PART B — NOTIFICATION MODEL + SERVICE

6. Create backend/src/models/notification.model.ts:
   id, targetUserId, facilityId (required, indexed)
   category: "incident"|"assessment"|"investigation"|"system"|"intelligence"
   priority: "urgent"|"normal"|"low" (default "normal")
   message: String (required)
   actorName: String
   actionUrl: String (deep link URL)
   readAt: Date (null if unread)
   isArchived: { type: Boolean, default: false }
   createdAt: Date
   Compound indexes: { targetUserId: 1, readAt: 1 }, { facilityId: 1, createdAt: -1 }

7. Create lib/notification-service.ts:
   createNotification({
     targetUserIds: string[],
     facilityId: string,
     category: string,
     priority: "urgent"|"normal"|"low",
     message: string,
     actorName: string,
     actionUrl: string
   }): void  — fire-and-forget, non-blocking

   For each targetUserId:
     - Create NotificationModel document
     - If priority === "urgent": also call the appropriate sendPush helper
   
   Replace all existing notification creation code throughout the API routes
   with calls to createNotification().

   Key trigger points:
   - Phase 1 signed → createNotification({ priority: "urgent", category: "incident", ... })
                       + sendPhase2Trigger()
   - Injury flagged → createNotification({ priority: "urgent", ... })
   - Phase 2 all sections complete → createNotification({ priority: "urgent", ... })
                                      + sendPhase2ReadyToLock()
   - Investigation locked → createNotification to reporting nurse ({ priority: "normal" })
   - IDT question sent → createNotification to recipient ({ priority: "normal" })
   - Assessment due → createNotification ({ priority: "normal" })

8. Notification API routes:
   GET  /api/notifications?userId=X&unreadOnly=false — list, newest first, max 50
   PATCH /api/notifications/[id]/read — set readAt = now
   PATCH /api/notifications/read-all — set readAt = now for all unread for this user
   GET  /api/notifications/count — returns { unread: number }

PART C — CRON JOBS

9. Create vercel.json:
{
  "crons": [
    { "path": "/api/cron/question-reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/daily-brief",        "schedule": "0 7 * * *" },
    { "path": "/api/cron/assessment-reminders","schedule": "0 6 * * *" }
  ]
}

Each cron route: check Authorization header === `Bearer ${process.env.CRON_SECRET}`
Return 401 if missing or wrong.

/api/cron/question-reminders:
  Find incidents where:
    - phase === phase_1_in_progress
    - unanswered Tier 2 questions exist
    - deferredAt exists (staff tapped Answer Later)
  For each:
    If deferredAt is 2–2.5 hours ago: sendQuestionReminder()
    If deferredAt is 4–4.5 hours ago: sendQuestionReminder() (second reminder)
    If deferredAt is 8+ hours ago: sendAdminEscalation() + createNotification to admin

/api/cron/daily-brief:
  For each facility: call GET /api/intelligence/daily-brief?facilityId=X
  Send brief text to all DON + admin subscriptions via push
  Only if facility has notifications.dailyBrief = true in preferences

/api/cron/assessment-reminders:
  Find assessments where next_due_at is tomorrow (between 24-48 hours from now)
  sendAssessmentDue() to conductedById for each

PART D — NOTIFICATION CENTER UI (Screen 24)

10. Update app/staff/layout.tsx and app/admin/layout.tsx — bell icon:
    Import NotificationBell component (create this)
    Place in top right of header

    components/notification-bell.tsx:
    - Fetch GET /api/notifications/count on mount
    - Poll every 60 seconds using setInterval
    - Show Lucide Bell icon. If unread > 0: red badge with count (show "9+" if >9)
    - Tap bell → open NotificationPopover

    components/notification-popover.tsx:
    - Fetch GET /api/notifications?userId=X (last 10)
    - Group by date: Today / Yesterday / Older
    - Per notification:
        Category icon (colored circle per category: incident=teal, assessment=blue,
        investigation=amber, system=gray, intelligence=purple)
        Message text, actorName in muted, time elapsed ("2 hours ago" via date-fns)
        Teal dot on left if readAt is null (unread)
        On click: navigate to actionUrl, PATCH /api/notifications/[id]/read
    - Header: "Notifications" left, "Mark all read" button right
    - Footer: "View all →" link → /staff/notifications or /admin/notifications

11. Create app/staff/notifications/page.tsx and app/admin/notifications/page.tsx:
    Full notification list, newest first, 50 per page with "Load more"
    Filter tabs: All | Unread | Incidents | Assessments | System
    "Mark all read" button at top right
    Same card format as popover but full width

PART E — STAFF PROFILE PUSH SETTINGS (Screen 27 — add push section)

12. Create app/staff/profile/page.tsx (if not exists):
    Identity section (read-only): name, role, facility, email
    
    DEVICE TYPE SECTION:
    Explanation callout (see UI spec Screen 27).
    Two large radio cards:
      "This is my personal device" — room numbers only in push notifications
      "This is a work-issued device" — full details permitted
    Default: personal. On change → PATCH /api/auth/device-type { deviceType }
    Route updates UserModel.deviceType and re-saves push subscription with new deviceType.
    
    PUSH NOTIFICATION SECTION:
    Three states (check Notification.permission):
      "granted" + active subscription: green "Push notifications are enabled ✓"
      "denied": amber "Push notifications are blocked — check your browser settings"
      "default": teal button "Enable push notifications"
        On tap: Notification.requestPermission() → if granted → POST /api/push/subscribe
    
    Performance summary: same as dashboard performance card (collapsible).
    Account: Change Password link, Sign Out button.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Document all notification routes in `documentation/waik/03-API-REFERENCE.md`
- Create `documentation/waik/18-NOTIFICATION-SYSTEM.md`
- Create `plan/pilot_1/phase_6/task-12-DONE.md`

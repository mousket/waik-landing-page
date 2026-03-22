# Task: Push Notifications + Reminder System
## Phase: 6
## Depends On: task-11-admin-settings
## Estimated Time: 6 hours

## Context Files
- package.json (add web-push)
- backend/src/models/push-subscription.model.ts (create)
- app/api/push/subscribe (create)
- app/api/push/unsubscribe (create)
- lib/push-service.ts (create)
- vercel.json (crons)
- app/api/cron/question-reminders (create)
- app/api/cron/daily-brief (create)
- app/api/cron/assessment-reminders (create)
- app/staff/profile/page.tsx (opt-in button)

## Success Criteria
- [ ] VAPID keys in env; POST/DELETE push subscribe/unsubscribe
- [ ] push-service: sendPush, phase2Trigger, pendingQuestionReminder, assessmentDue, dailyBrief
- [ ] Triggers: phase transition → phase2Trigger; report-conversational → schedule question reminder; assessment → schedule due reminder
- [ ] Cron routes: question-reminders (hourly), daily-brief (7am), assessment-reminders (6am)
- [ ] Service worker handles push and notificationclick
- [ ] Staff profile: Enable push button, subscription status

## Test Cases
- Subscribe → subscription saved; sendPush delivers to client
- Phase 2 transition notifies DON/admin
- Cron question-reminders finds 2+ hour old unanswered, sends push

## Implementation Prompt

```
I'm building WAiK on Next.js 14 as a PWA. I need to add push notifications for the pilot.

PRIORITY NOTIFICATIONS (must work for pilot):
1. Phase 2 trigger — DON notified when nurse completes Phase 1
2. Pending question reminder — nurse nudged 2 hours after reporting

SECONDARY (build but can be rough for pilot):
3. Assessment due reminder
4. Daily brief (7am summary for admins)
5. Red flag alert (injury detected)

WHAT I NEED:

1. Install web-push:
   npm install web-push @types/web-push
   Generate VAPID keys and store in environment variables:
   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY

2. Create backend/src/models/push-subscription.model.ts:
   id, userId, facilityId
   subscription (JSON — PushSubscription object from browser)
   userAgent (string — for debugging)
   isActive: boolean
   createdAt, lastUsedAt

3. Create API routes:
   - POST /api/push/subscribe — save subscription for authenticated user
   - DELETE /api/push/unsubscribe — deactivate subscription
   These routes call Clerk's getCurrentUser() for the userId

4. Create lib/push-service.ts:
   sendPush(userId: string, payload: { title, body, url, icon }) — finds active subscriptions for that user and sends via web-push
   
   Notification payloads:
   
   phase2Trigger(incidentId, residentName, facilityId):
     title: "Investigation ready — [residentName]"
     body: "Phase 1 complete. Tap to claim the investigation."
     url: /admin/incidents/[incidentId]
   
   pendingQuestionReminder(incidentId, residentName, staffId):
     title: "Questions waiting for you"
     body: "[residentName]'s report needs a few more details."
     url: /staff/incidents/[incidentId]
   
   assessmentDue(residentName, assessmentType):
     title: "Assessment due today"
     body: "[assessmentType] assessment for [residentName] is due."
     url: /staff/assessments/[type]
   
   dailyBrief(openCount, pendingCount, facilityId):
     title: "WAiK Daily Brief"
     body: "[openCount] open investigations, [pendingCount] questions pending."
     url: /admin/dashboard

5. Call push-service.ts from these trigger points:
   - /api/incidents/[id]/phase (when transitioning to phase_2) → phase2Trigger to all DON/admin users
   - /api/agent/report-conversational (when Phase 1 completes with unanswered questions) → schedule pendingQuestionReminder for 2 hours later using Vercel Cron
   - /api/assessments (when assessment is created with next_due_at) → schedule assessmentDue for day of due date

6. Create vercel.json with cron jobs:
{
  "crons": [
    { "path": "/api/cron/question-reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/daily-brief", "schedule": "0 7 * * *" },
    { "path": "/api/cron/assessment-reminders", "schedule": "0 6 * * *" }
  ]
}

7. Create the cron route handlers:
   /api/cron/question-reminders — finds incidents with unanswered questions created 2+ hours ago, sends push to the reporter
   /api/cron/daily-brief — generates brief text, sends push to all DON/admin users in each facility
   /api/cron/assessment-reminders — finds assessments where next_due_at is today, sends push to assigned staff

8. Update the service worker to handle push events:
   self.addEventListener('push', event => { show notification with the payload data })
   self.addEventListener('notificationclick', event => { open the url from the payload })

9. Add push notification opt-in to staff profile:
   app/staff/profile/page.tsx — show current user's name, role, facility
   "Enable push notifications" button — calls Notification.requestPermission() then /api/push/subscribe
   Show current subscription status
```

# Task 16 — Notification Center
## Phase: 7 — Navigation, Intelligence & Imports
## Estimated Time: 4–5 hours
## Depends On: task-12

---

## Why This Task Exists

Push notifications go to the device. The notification center is the persistent
inbox inside the app — the bell icon that shows unread count and lets users
review their activity history. Without it, users who miss a push notification
have no way to find what they missed. With it, WAiK feels alive and connected.

---

## Success Criteria

- [ ] Notification bell in nav shows correct unread count
- [ ] Bell count updates every 60 seconds without full page refresh
- [ ] Clicking bell opens notification panel showing last 10 notifications
- [ ] Clicking a notification navigates to actionUrl and marks it as read
- [ ] "Mark all read" button works
- [ ] Full notification history page at /staff/notifications and /admin/notifications
- [ ] Phase 2 trigger creates notification for all DON/admin users
- [ ] Question answer creates notification for the investigator
- [ ] All notification creations go through lib/notification-service.ts

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm adding a persistent notification center to WAiK (Next.js 14).

1. Update backend/src/models/notification.model.ts — add fields to existing model:
   facilityId: string (required, indexed)
   actionUrl: string (the deep link)
   category: "incident" | "assessment" | "investigation" | "system" | "intelligence"
   priority: "urgent" | "normal" | "low" (default "normal")
   actorName: string (who triggered this)
   isArchived: boolean (default false)
   Keep existing fields: id, incidentId, type, message, createdAt, readAt, targetUserId

2. Create API routes:
   GET  /api/notifications?facilityId=Y&unreadOnly=false — list, newest first, max 50
   PATCH /api/notifications/[id]/read — set readAt = now
   PATCH /api/notifications/read-all — set readAt = now for all unread for this user
   PATCH /api/notifications/[id]/archive — set isArchived = true
   GET  /api/notifications/count — returns { unread: number }

3. Create components/notification-center.tsx:
   Bell icon button using Lucide Bell icon
   Red badge showing unread count (show "9+" if >9), hide if 0
   Poll /api/notifications/count every 60 seconds using setInterval in useEffect
   Click opens a Popover (shadcn) panel:
     Header: "Notifications" (left) | "Mark all read" button (right)
     List of last 10 notifications, grouped by Today / Yesterday / Older
     Each notification:
       Category icon in small colored circle
       Message text, actorName
       Time ago ("2 hours ago" using date-fns)
       Teal dot on left if unread
       Clicking: navigate to actionUrl + call PATCH /api/notifications/[id]/read
     Footer: "View all" link → /staff/notifications or /admin/notifications

4. Create app/staff/notifications/page.tsx and app/admin/notifications/page.tsx:
   Full list, newest first, max 50 per page (add "Load more" button)
   Filter tabs: All | Unread | Incidents | Assessments | System
   Each notification as a full row
   "Mark all read" bulk button
   Paginate with ?page=N query param

5. Create lib/notification-service.ts:
   createNotification({ targetUserIds: string[], facilityId, category, priority, message, actionUrl, actorName })
   - Creates NotificationModel document for each targetUserId
   - If priority === "urgent": also calls sendPush() from lib/push-service.ts
   - Fire-and-forget (don't block the calling route)

6. Replace all existing scattered createNotification() calls in API routes with calls to lib/notification-service.ts

7. Call createNotification at these points:
   URGENT — Phase 1 complete → notify all DON/admin: "New investigation ready — [resident]"
   URGENT — Injury red flag → notify all DON/admin: "⚠️ Injury reported — [resident]"
   NORMAL — Investigation closed → notify original reporter: "Your report for [resident] was reviewed and closed"
   NORMAL — Assessment due in 3 days → notify assigned staff: "Assessment due soon for [resident]"
   LOW — Report completeness scored → notify reporter: "Your report scored [X]%"
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_7/task-16-DONE.md`

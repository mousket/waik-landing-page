# Task: Notification Center
## Phase: 7
## Depends On: task-15-community-intelligence
## Estimated Time: 5 hours

## Context Files
- backend/src/models/notification.model.ts (update)
- app/api/notifications/* (create)
- components/notification-center.tsx (create)
- app/staff/notifications/page.tsx (create)
- app/admin/notifications/page.tsx (create)
- lib/notification-service.ts (create)

## Success Criteria
- [ ] Notification model: facilityId, actionUrl, category, priority, actorName, isArchived
- [ ] GET list, PATCH read, PATCH read-all, PATCH archive, GET count
- [ ] notification-center component: bell + badge, popover with last 10, group by today/yesterday/older, tap → actionUrl + mark read
- [ ] Full pages: staff and admin notifications with filters and bulk actions
- [ ] createNotification() centralizes create + optional push for urgent; event catalog implemented

## Test Cases
- Bell shows unread count; opening panel marks read on click
- Urgent notification creates DB record and sends push
- Mark all read clears badge

## Implementation Prompt

```
I'm building WAiK on Next.js 14. I need to add a persistent notification center — an in-app inbox that all users can check, separate from push notifications.

This is distinct from push notifications (which go to the device). The notification center is the persistent feed inside the app that users check when they open WAiK. Think of it as the bell icon + dropdown that every modern SaaS app has.

WHAT I NEED:

1. Create backend/src/models/notification.model.ts (update existing):
   The existing model has: id, incidentId, type, message, createdAt, readAt, targetUserId
   
   Add these fields:
   - facilityId: string (for multi-tenant filtering)
   - actionUrl: string (deep link to the relevant resource)
   - category: "incident" | "assessment" | "investigation" | "system" | "intelligence"
   - priority: "urgent" | "normal" | "low"
   - actorName: string (who triggered this — e.g. "Sarah M. reported an incident")
   - isArchived: boolean (default false)

2. Create API routes:
   - GET /api/notifications?userId=X&facilityId=Y&unreadOnly=false — list notifications
   - PATCH /api/notifications/[id]/read — mark single as read
   - PATCH /api/notifications/read-all — mark all as read for this user
   - PATCH /api/notifications/[id]/archive — archive a notification
   - GET /api/notifications/count?userId=X&facilityId=Y — just returns { unread: number }

3. Create components/notification-center.tsx:
   A bell icon button that opens a popover/dropdown panel
   Shows unread count badge (red dot with number, max "9+")
   Polls /api/notifications/count every 60 seconds to update the badge
   
   The panel (opens on bell click):
   Header: "Notifications" | "Mark all read" button | "View all" link
   
   Shows last 10 notifications grouped by today / yesterday / older
   Each notification:
   - Category icon (🚨 incident, 📋 assessment, 🔍 investigation, 💡 intelligence)
   - Message text (e.g. "Mrs. Chen's fall investigation was closed by Dr. Sarah M.")
   - Time ago (e.g. "2 hours ago")
   - Unread dot (teal) if not read
   - Tap/click → navigates to actionUrl and marks as read
   
   "View all notifications" → /staff/notifications or /admin/notifications (full page)

4. Create app/staff/notifications/page.tsx and app/admin/notifications/page.tsx:
   Full notification history page
   Filter tabs: All | Unread | Incidents | Assessments | System
   Each notification as a full row with all details
   "Mark all read" and "Archive read" bulk actions
   Infinite scroll or pagination (20 per page)

5. Create lib/notification-service.ts — centralized notification creation:
   createNotification({ targetUserIds, facilityId, category, priority, message, actionUrl, actorName })
   
   Handles:
   - Saving to MongoDB NotificationModel
   - Triggering push notification if user has active subscription and category priority is "urgent"
   - Does NOT send push for "normal" or "low" priority (inbox only)
   
   Replace all existing scattered notification creation calls with this service.

6. Define the full notification event catalog — call createNotification at these points:

   URGENT (inbox + push):
   - Incident Phase 1 complete → notify all DON/admin: "New investigation ready — [resident]"
   - Red flag detected (injury) → notify all DON/admin: "⚠️ Injury reported — [resident]. State report may be required."
   - Phase 2 task overdue > 24h → notify investigator: "Investigation task overdue — [incident]"

   NORMAL (inbox only):
   - Investigation closed → notify original reporter: "Your report for [resident] was reviewed and closed."
   - Question answered by another staff → notify investigator: "[Staff name] answered a question on [incident]"
   - Assessment due in 3 days → notify assigned staff: "Assessment due soon for [resident]"
   - New staff member joined → notify DON/admin: "[Name] joined the team as [role]"
   - WAiK Intelligence insight generated → notify admin: "New weekly insight available"

   LOW (inbox only, no push):
   - Report completeness score available → notify reporter: "Your report scored [X]%"
   - Incident passed 7 days open → notify admin: "[Incident] has been open for 7 days"
```

# Task: Complete Admin Settings Section
## Phase: 5
## Depends On: task-10-staff-management
## Estimated Time: 6 hours

## Context Files
- app/admin/settings/page.tsx (create)
- app/admin/settings/profile/page.tsx (create)
- app/admin/settings/notifications/page.tsx (create)
- app/admin/settings/export/page.tsx (create)
- app/waik-admin/* (create)
- app/accept-invite/page.tsx (create)
- app/api/admin/facility (create)
- app/api/admin/notification-preferences (create)
- app/api/admin/export (create)

## Success Criteria
- [ ] Settings home with sub-nav: Community Profile, Staff, Notifications, Activity, Data & Export, Help
- [ ] Community Profile: editable name, type, state, bed count, contact, reporting window; PATCH /api/admin/facility
- [ ] Notification Preferences: per-role toggles; PATCH /api/admin/notification-preferences
- [ ] Data & Export: CSV export for incidents, assessments, residents (GET with confirmation)
- [ ] app/waik-admin: super-admin only (isWaikSuperAdmin); all communities table; single facility deep dive
- [ ] accept-invite flow: welcome screen, Clerk account creation, redirect + first-time tooltips

## Test Cases
- Non–super-admin cannot access /waik-admin
- Export CSV returns facility-scoped data
- Accept invite stores facilityId in Clerk metadata, redirects to staff dashboard

## Implementation Prompt

```
I'm building WAiK on Next.js 14. I need to complete the full admin settings section covering community profile, notifications preferences, and the WAiK super-admin panel.

WHAT I NEED:

1. Create app/admin/settings/page.tsx — Settings home with sub-navigation:
   - Community Profile
   - Staff Management (links to Prompt 10 page)
   - Notification Preferences  
   - Activity Log (links to Prompt 10 activity page)
   - Data & Export
   - Help & Support

2. Create app/admin/settings/profile/page.tsx — Community Profile:
   Editable fields:
   - Community name
   - Facility type (SNF | ALF | Memory Care | CCRC)
   - State (US state dropdown)
   - Bed count
   - Primary contact name + phone + email
   - Reporting configuration: mandated reporting window in hours (default: 2)
   
   Save button → PATCH /api/admin/facility (updates MongoDB facility record)
   
   Read-only display:
   - WAiK Plan: Pilot
   - Facility ID (for support reference)
   - Onboarding date

3. Create app/admin/settings/notifications/page.tsx — Notification Preferences:
   Per-role notification configuration:
   
   Director of Nursing receives:
   ☑ New incident Phase 2 trigger (immediately)
   ☑ Red flag incidents (injury detected) (immediately)
   ☑ Daily brief (7:00 AM)
   ☐ Weekly Intelligence Report (Mondays 8:00 AM)
   
   Administrator receives:
   ☑ New incident Phase 2 trigger (immediately)
   ☑ Investigations open > 48 hours (daily digest)
   ☑ Daily brief (7:00 AM)
   ☐ Weekly Intelligence Report (Mondays 8:00 AM)
   
   Staff receives:
   ☑ Pending question reminders (2 hours after reporting)
   ☑ Assessment due reminders (morning of due date)
   
   Each toggle calls PATCH /api/admin/notification-preferences

4. Create app/admin/settings/export/page.tsx — Data & Export:
   - "Export Incidents (CSV)" — all incidents for this facility, last 90 days
   - "Export Assessments (CSV)" — all assessments for this facility
   - "Export Resident List (CSV)" — all active residents
   - Each export is a GET /api/admin/export?type=incidents&facilityId=X&days=90 route
   - Show a confirmation: "Export includes data from [date range]. Contains [X] records."

5. Create app/waik-admin/ — WAiK Super Admin Panel:
   Protected by isWaikSuperAdmin: true in Clerk publicMetadata
   Only Gerard and Scott can access this.
   
   app/waik-admin/page.tsx — All Communities Overview:
   Table: Community Name | Facility Type | State | # Staff | # Incidents (30d) | Last Activity | Plan | Actions
   Quick stats: Total communities | Total incidents this month | Most active community
   
   app/waik-admin/[facilityId]/page.tsx — Single Facility Deep Dive:
   - All incidents for that facility
   - All staff members
   - Usage metrics: daily active users, avg reports/day, avg completeness score
   - "Impersonate" link (opens facility's admin dashboard as that facility)
   - "Send Message to Admin" (sends email via Clerk)

6. Create app/accept-invite/page.tsx — Invitation Acceptance Flow:
   When a new staff member clicks their email invitation:
   - Show a welcome screen: "You've been invited to join [Community Name] on WAiK"
   - Clerk handles the account creation (password set via Clerk's UI)
   - After account creation, store facilityId in Clerk publicMetadata
   - Redirect to /staff/dashboard with a first-time onboarding tooltip sequence
   
   First-time onboarding tooltips (shown once, dismissed per user):
   1. "This is your dashboard — your home base"
   2. "Tap here to report an incident by voice"
   3. "Pending questions will appear here when WAiK needs more details"
   4. "You're ready. Start your first report anytime."
```

# Task 11 — Complete Admin Settings + WAiK Super Admin
## Phase: 5 — Admin Settings & User Management
## Estimated Time: 6–7 hours
## Depends On: task-10

---

## Why This Task Exists

Settings are what make WAiK self-service. Without this task, every configuration
change requires Gerard or Scott to get involved. With it, the community
administrator controls the entire product — completion thresholds, which
incident types are active, who gets notified for what, Gold Standards
customization, phase mode, data exports. WAiK should never require a support
call for configuration.

Three decisions from the co-founder meetings added significant new surface to
this task beyond the original plan:

First: the notification system is now configurable per incident type. A fall
notifies different roles than a medication error. Communities can customize this
in settings. The notification content is also now split by device type — personal
devices receive room numbers only (HIPAA), work devices receive full details.
This requires a new Incident Configuration settings page.

Second: the phase toggle (one-phase vs two-phase) belongs in settings with
explicit friction before switching — the default must stay two-phase and the
administrator must acknowledge the tradeoffs before changing it.

Third: the WAiK super admin panel now includes the feedback summary from every
pilot community, giving Gerard and Scott a real-time view of nurse sentiment
without querying the database directly.

This task implements Screens 18–23 and Screen 29 of the UI Specification (Pass 3).

---

## Context Files

- `app/admin/settings/staff/page.tsx` — already built in task-10
- `lib/auth.ts` — isWaikSuperAdmin check, canAccessPhase2()
- `backend/src/models/user.model.ts` — mustChangePassword, deviceType already added in task-02
- `backend/src/models/facility.model.ts` — create this in this task

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `/admin/settings` shows 6 navigation cards
- [ ] Community profile saves all fields including mandated reporting window
- [ ] Incident Configuration page shows phase mode toggle with friction warning
- [ ] Switching to single-phase mode requires explicit confirmation after reading explanation
- [ ] Per-incident-type completion thresholds configurable (60–95% range)
- [ ] Gold Standards modal shows default fields (non-removable) + custom field add
- [ ] Notification preferences page shows per-incident-type configuration
- [ ] Per-incident-type: two sections — when started, when Phase 1 signed
- [ ] Personal device / work device content split documented on notification page
- [ ] Notification preferences save and persist on reload
- [ ] Export Incidents CSV downloads valid CSV with room numbers (not resident names) by default
- [ ] "Include resident names" toggle available with PHI acknowledgment
- [ ] `/waik-admin` blocked for non-super-admin with no information about the route
- [ ] WAiK super-admin all-communities table has 8 columns
- [ ] Single facility deep-dive shows usage metrics + staff list + feedback summary
- [ ] `/accept-invite` lands on correct dashboard with onboarding tooltips (once only)
- [ ] `/change-password` redirects mustChangePassword users before dashboard
- [ ] After password change mustChangePassword = false in MongoDB

---

## Test Cases

```
TEST 1 — Settings home renders 6 cards
  Action: Navigate to /admin/settings
  Expected: Six cards: Community Profile, Incident Configuration, Staff Management,
            Notification Preferences, Data Export, Help & Support
  Pass/Fail: ___

TEST 2 — Community profile saves mandated reporting window
  Action: Change mandated reporting window to 4 hours. Save.
  Expected: Success toast. Reload shows 4 hours.
  Pass/Fail: ___

TEST 3 — Phase mode switch requires confirmation
  Action: Toggle to single-phase on Incident Configuration page
  Expected: Explanation modal appears BEFORE change takes effect.
            Two buttons: "Switch to single-phase" and "Keep two-phase mode".
  Pass/Fail: ___

TEST 4 — Phase mode persists after confirmation
  Action: Confirm switch to single-phase
  Expected: Toggle shows single-phase. Reload confirms.
  Action: Confirm switch back to two-phase
  Expected: Toggle shows two-phase. Reload confirms.
  Pass/Fail: ___

TEST 5 — Completion threshold enforced in range
  Action: Try to set threshold below 60% or above 95%
  Expected: Input rejects value and shows range error
  Pass/Fail: ___

TEST 6 — Notification preferences per incident type save
  Action: For Fall incidents, toggle off Therapy Director from Phase 1 signed notification
  Action: Save. Reload.
  Expected: Therapy Director toggle is still off for Fall Phase 1 signed
  Pass/Fail: ___

TEST 7 — Export defaults to room numbers not resident names
  Action: Click Export Incidents CSV
  Expected: CSV columns include roomNumber. No residentName column by default.
  Pass/Fail: ___

TEST 8 — Export with names requires acknowledgment
  Action: Toggle "Include resident names". Observe.
  Expected: Acknowledgment dialog appears: "This file will contain PHI..."
            Must confirm before toggle activates.
  Pass/Fail: ___

TEST 9 — Super admin blocked for non-super-admin
  Action: Navigate to /waik-admin with regular administrator token
  Expected: 403 page with no route information visible
  Pass/Fail: ___

TEST 10 — Super admin shows all facilities
  Action: Navigate to /waik-admin as isWaikSuperAdmin user
  Expected: Table with columns: Name, Type, State, Staff, Incidents (30d),
            Avg Completeness, Last Activity, Plan
  Pass/Fail: ___

TEST 11 — Facility deep dive shows feedback summary
  Action: Navigate to /waik-admin/[facilityId]
  Expected: Feedback section shows average rating, total responses, most recent 5 comments
  Pass/Fail: ___

TEST 12 — Accept invite flow
  Action: Click a Clerk invitation link
  Expected: Welcome screen with community name. After account creation:
            redirected to role-appropriate dashboard with onboarding tooltips.
  Pass/Fail: ___

TEST 13 — Onboarding tooltips shown once
  Action: Complete onboarding. Reload dashboard.
  Expected: Tooltips do not appear again (hasSeenOnboarding is set)
  Pass/Fail: ___

TEST 14 — mustChangePassword forces redirect
  Action: Log in as user where mustChangePassword = true
  Expected: Middleware intercepts. Redirected to /change-password.
  Pass/Fail: ___

TEST 15 — Password change clears flag
  Action: Complete /change-password form with valid password
  Expected: mustChangePassword = false in MongoDB. Next login goes to dashboard.
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task completes the admin settings
section, adds the WAiK super admin panel, and implements invite acceptance
with onboarding. It implements Screens 18-23 and Screen 29 of the UI spec.

PART A — SETTINGS INFRASTRUCTURE

Create backend/src/models/facility.model.ts:
  id, orgId (required)
  name, type: "snf"|"alf"|"memory_care"|"ccrc"|"other"
  state: String (US state code)
  bedCount: Number
  primaryContact: { name, phone, email } (_id: false)
  reportingConfig: { mandatedReportingWindowHours: { type: Number, default: 2 } }
  phaseMode: { type: String, enum: ['one_phase','two_phase'], default: 'two_phase' }
  completionThresholds: {
    fall: { type: Number, default: 75, min: 60, max: 95 },
    medication_error: { type: Number, default: 80, min: 60, max: 95 },
    resident_conflict: { type: Number, default: 70, min: 60, max: 95 },
    wound_injury: { type: Number, default: 80, min: 60, max: 95 },
    abuse_neglect: { type: Number, default: 90, min: 60, max: 95 }
  }
  notificationPreferences: Schema.Types.Mixed
  onboardingDate: Date
  plan: { type: String, enum: ['pilot','enterprise'], default: 'pilot' }
  createdAt, updatedAt

PART B — SETTINGS PAGES

app/admin/settings/page.tsx (Screen 18):
Six navigation cards linking to:
  /admin/settings/profile — Community Profile
  /admin/settings/incidents — Incident Configuration
  /admin/settings/staff — Staff Management (built in task-10)
  /admin/settings/notifications — Notification Preferences
  /admin/settings/export — Data Export
  /admin/settings/help — Help (static: Facility ID display, support email, docs link)

app/admin/settings/profile/page.tsx (Screen 19):
Editable: community name, facility type, state (US dropdown), bed count,
primary contact name/phone/email, mandated reporting window (hours, default 2).
Save → PATCH /api/admin/facility { ...fields }
Read-only: WAiK Plan (Pilot), Facility ID, Onboarding Date.
Create GET + PATCH /api/admin/facility routes.

app/admin/settings/incidents/page.tsx (Screen 20):

SECTION 1 — PHASE MODE:
Toggle: "Two-Phase Investigation Mode" On/Off. Default: On.
When admin tries to switch to Off: show modal BEFORE applying:
Title: "Before you switch to single-phase mode"
Body: "Single-phase mode means incident reports close after Phase 1 only —
no formal leadership investigation, root cause analysis, or intervention
documentation. This reduces administrative burden but may not meet state
regulatory requirements for investigation-level events such as falls with
injury. Most communities using WAiK operate in two-phase mode. Are you sure
you want to proceed?"
Two buttons: "Switch to single-phase" (applies change) / "Keep two-phase mode" (cancels).
Save to facility.phaseMode.

SECTION 2 — COMPLETION THRESHOLDS:
Per incident type: slider or number input.
Label: "[Type] completion threshold: [X]%"
Range: 60–95. Default values from facility.completionThresholds.
Note below each: "Staff cannot submit a Phase 1 report below this threshold."
Save all thresholds on a single "Save Thresholds" button.
PATCH /api/admin/facility/thresholds { thresholds: { fall: X, ... } }

SECTION 3 — GOLD STANDARDS:
For each incident type: "View and Edit Gold Standards" button → opens modal.
Modal shows all default fields with checkboxes (checked + disabled — cannot uncheck).
"Add custom field" button: field name, field type (text/yes-no/multi-select),
required toggle.
Custom fields show "Custom" badge and a delete button.
Changes → PATCH /api/admin/facility/gold-standards { incidentType, customFields }

SECTION 4 — ACTIVE INCIDENT TYPES:
Toggle list. Default types always on (non-toggleable).
"Add Custom Type" → form: type name (required) + description.
PATCH /api/admin/facility/incident-types.

app/admin/settings/notifications/page.tsx (Screen 22):
Tabs or accordion per active incident type.

Per incident type — two sections:
  A. WHEN INCIDENT STARTS: role toggles for who gets notified immediately.
  B. WHEN PHASE 1 SIGNED: role toggles for who gets the Phase 2 trigger.

Default roles for Fall:
  When started: DON=On, Administrator=On, Unit Manager=On, Therapy Director=On
  When Phase 1 signed: same defaults

Role toggles: one per role in the facility (from staff list).
Show role name not individual name (applies to anyone in that role).

NOTIFICATION CONTENT PANEL (below per-incident config):
Read-only explanation panel:
  "Personal device: room number only (e.g. 'Fall incident started — Room 204')"
  "Work device: full details (e.g. 'Fall incident started — Maria Chen, Room 204')"
  "Work email: full details + link to incident"
  "Staff set their device type on their profile page."

GLOBAL PREFERENCES section:
  Daily Brief (DON/Admin): On/Off, time picker (default 7:00 AM)
  Weekly Intelligence Report: On/Off, day of week selector (default Monday)
  Overdue Phase 2 alerts: On/Off, hours threshold (default 24)
  Assessment due reminders for staff: On/Off, days before (default 1)

Save all → PATCH /api/admin/notification-preferences { facilityId, preferences }
Store in facility.notificationPreferences.

app/admin/settings/export/page.tsx (Screen 23):
Three export cards:
  Incidents: date range picker (default 90 days). "Export [X] records."
  Assessments: date range picker. "Export [X] records."
  Resident List: no date range. "Export [X] records."

"Include resident names in exports" toggle below all three cards.
Default: OFF (room numbers only).
On toggle to ON: show acknowledgment dialog:
  "This export will contain Protected Health Information (PHI) including
  resident names. You are responsible for handling this file in compliance
  with HIPAA. Do you want to proceed?"
  Confirm / Cancel.

CSV export routes: GET /api/admin/export?type=incidents&facilityId=X&days=90&includeNames=false
Include fields per type:
  incidents: roomNumber (or residentName if includeNames), incidentType,
    completenessAtSignoff, phase1SignedAt, phase2LockedAt, reportedBy
  assessments: roomNumber, assessmentType, completenessScore, conductedAt, nextDueAt
  residents: roomNumber, careLevel, admissionDate, status

PART C — WAIK SUPER ADMIN (Screen 29)

app/waik-admin/page.tsx:
Protected: if !isWaikSuperAdmin → return 403 page with no route information.

Quick stats banner: Total communities | Total incidents this month | Most active community.

All Facilities table:
  Community Name (clickable → facility deep dive) | Type | State | Staff Count |
  Incidents (30d) | Avg Completeness (30d) | Last Activity | Plan

app/waik-admin/[facilityId]/page.tsx:
Header: facility name, type, state, plan, onboarding date.

Usage metrics panel:
  Daily active users this week (simple number)
  Average incidents per day (30d)
  Average Phase 1 completeness (trend vs prior 30d)
  Phase 2 close rate: % of Phase 1 incidents that reached closure

Staff list: name, role, last login, total reports, avg completeness. Read-only.
Recent incidents: last 20. Read-only.

Feedback summary (from FeedbackModel):
  Average rating (👍 👎 scale), total responses, most recent 5 comments.
  Each comment: rating emoji, comment text, date.

"Send message to administrator" → compose modal → POST to Clerk email API.

PART D — INVITE ACCEPTANCE + ONBOARDING (Screen 28)

app/accept-invite/page.tsx:
Full-screen teal background. WAiK logo.
"Welcome to WAiK at [Community Name]."
"You have been invited by [inviting admin name]."
Use Clerk <SignUp /> component for account creation.
After creation: store facilityId in Clerk publicMetadata.
Redirect to role-appropriate dashboard.

On first load of /staff/dashboard (or /admin/dashboard):
Check localStorage "hasSeenOnboarding". If absent: show tooltip sequence.
Four steps with Next button and progress dots:
  1. "This is your dashboard — your home base."
  2. "Tap here to report an incident by voice."
  3. "Pending questions appear here when WAiK needs more detail."
  4. "You are ready. Start your first report anytime."
After step 4: "Get started" button. Set localStorage "hasSeenOnboarding" = "true".

PART E — FORCED PASSWORD CHANGE

mustChangePassword and deviceType are already on UserModel (task-02).

In middleware.ts: after Clerk auth check — call GET /api/auth/user-flags to check
mustChangePassword. If true: redirect to /change-password (skip if already there).

app/change-password/page.tsx:
"Welcome. Please create a new password before getting started."
New Password + Confirm Password fields with strength indicator.
Submit → PATCH /api/auth/change-password { newPassword }
Server: update Clerk password + set UserModel.mustChangePassword = false.
On success: redirect to role-appropriate dashboard (triggers onboarding if first time).
```

---

## Post-Task Documentation Update

After passing all test cases:
- Document all new settings routes in `documentation/waik/03-API-REFERENCE.md`
- Create `plan/pilot_1/phase_5/task-11-DONE.md`

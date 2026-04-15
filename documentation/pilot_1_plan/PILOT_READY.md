# WAiK Pilot 1 — Readiness Declaration
## Complete this file last. Every checkbox must be ticked before the first pilot community goes live.

---

## How to Use This File

Work through each section in order. For each item:
- Test it manually on a real device (not just in the browser)
- Check the box only when you have confirmed it works
- Sign off at the bottom when all sections are complete

---

## Phase 1 — Foundation & Auth

- [ ] task-01: ClerkJS installed, middleware protecting all routes
- [ ] task-01: `getCurrentUser()` returns correct shape from Clerk session
- [ ] task-01: Role-based redirect after sign-in works (staff → /staff, admin → /admin)
- [ ] task-01: `lib/auth-store.ts` deleted
- [ ] task-01: `app/api/auth/login/route.ts` deleted
- [ ] task-01: `lib/google-sheets.ts` deleted
- [ ] task-02: `GET /api/incidents` without auth returns 401
- [ ] task-02: Staff user cannot see incidents from a different facility
- [ ] task-02: Admin user cannot see data from a different organization
- [ ] task-02: All 10 user roles defined in UserRole type
- [ ] task-02: Three compound indexes on IncidentModel confirmed in MongoDB Atlas

---

## Phase 2 — Core Hardening

- [ ] task-03: Expert Investigator sessions stored in Redis (not in-memory)
- [ ] task-03: Answering a question in a second API call retrieves correct session
- [ ] task-03: Vercel timeout returns `{ status: "partial" }` instead of 504
- [ ] task-03: iOS Wake Lock activates when voice listening starts (tested on real iPhone)
- [ ] task-03: Text fallback textarea appears after 2 consecutive no-speech failures
- [ ] task-03: ErrorBoundary catches agent crash and shows recovery message
- [ ] task-04: App installs to home screen on iPhone (tested manually)
- [ ] task-04: App installs to home screen on Android (tested manually)
- [ ] task-04: App launches in standalone mode (no browser chrome)
- [ ] task-04: Offline page appears when network is disconnected
- [ ] task-04: Queued offline reports sync when connection returns

---

## Phase 3 — Dashboards

- [ ] task-05: "Report Incident" button visible without scrolling on iPhone SE
- [ ] task-05: Pending questions sorted oldest-first
- [ ] task-05: Completeness score shows correct color (green/amber/red)
- [ ] task-05: Bottom tab bar has 4 tabs, all navigating correctly
- [ ] task-05: Skeleton loaders appear on slow connections
- [ ] task-06: Needs Attention tab is the default active tab
- [ ] task-06: Red alert cards appear for injury incidents
- [ ] task-06: "Claim Investigation" button transitions incident to Phase 2
- [ ] task-06: Admin top navigation has all 6 items
- [ ] task-06: Daily brief appears once per day, dismissible

---

## Phase 4 — Core Features

- [ ] task-07: Activity assessment completes start-to-finish by voice
- [ ] task-07: Dietary assessment completes start-to-finish by voice
- [ ] task-07: `next_due_at` set to 90 days after completion
- [ ] task-07: Assessment sessions survive across API calls (Redis)
- [ ] task-08: Resident can be created via POST /api/residents
- [ ] task-08: Resident Story shows 4 tabs with correct data
- [ ] task-08: Notes with `admin_only` visibility hidden from staff
- [ ] task-08: Flagged notes appear prominently in Overview tab
- [ ] task-08: MDS recommendations generate from resident's assessment history
- [ ] task-09: "Claim Investigation" requires DON/admin role (403 for staff)
- [ ] task-09: Investigation closes with DON signature — sets phase to "closed"
- [ ] task-09: Closure report renders at `/admin/incidents/[id]/report`
- [ ] task-09: WAiK Intelligence returns facility-scoped results only
- [ ] task-09: Daily brief endpoint returns plain-text summary

---

## Phase 5 — Admin Settings & User Management

- [ ] task-10: Admin can invite new staff member by email
- [ ] task-10: Invitation email arrives and creates account correctly
- [ ] task-10: DON cannot invite admin-tier roles
- [ ] task-10: Deactivated user cannot log in
- [ ] task-10: `RoleGate` component hides content from unauthorized roles
- [ ] task-10: Activity log records key actions (invite, role change, incident created)
- [ ] task-11: Community profile saves and persists
- [ ] task-11: Notification preferences save and persist
- [ ] task-11: Export Incidents CSV downloads valid file
- [ ] task-11: `/waik-admin` inaccessible to non-super-admin users
- [ ] task-11: WAiK super-admin shows all pilot facilities
- [ ] task-11: `mustChangePassword` redirects to `/change-password` on login
- [ ] task-11: After password change, user proceeds to dashboard normally

---

## Phase 6 — PWA & Notifications

- [ ] task-12: VAPID keys set in production environment variables
- [ ] task-12: Push subscription saves to MongoDB when user opts in
- [ ] task-12: Phase 2 trigger push notification received on real device
- [ ] task-12: Notification opens correct deep link when tapped
- [ ] task-12: Question reminder cron route sends correct notifications
- [ ] task-12: Cron routes protected by CRON_SECRET
- [ ] task-13: Completeness bar animates during voice report agent phase
- [ ] task-13: Closure report has all sections, print dialog works
- [ ] task-13: Nurse feedback widget appears after Phase 1 completion
- [ ] task-13: Feedback data appears in WAiK super-admin panel
- [ ] task-13: Demo mode accessible with 4 role buttons at `/waik-demo-start/login`
- [ ] task-13: Demo mode shows yellow DEMO MODE banner
- [ ] task-13: Demo does not write to MongoDB
- [ ] task-13: Sentry capturing errors in production
- [ ] task-13: Sentry errors contain no PHI (no resident names, no narratives)

---

## Phase 7 — Navigation, Intelligence & Imports

- [ ] task-14: Staff can see incidents assigned to them from other reporters
- [ ] task-14: Staff cannot see other staff members' incidents
- [ ] task-14: "Answer Now" button appears on unanswered Phase 1 questions
- [ ] task-14: Admin-only notes hidden in staff incident detail view
- [ ] task-15: Staff intelligence returns only current user's data
- [ ] task-15: Admin intelligence returns full facility data
- [ ] task-15: Auto-insight cards load on admin intelligence page
- [ ] task-15: Insights cached in Redis (1 hour)
- [ ] task-16: Notification bell shows correct unread count
- [ ] task-16: Bell count updates without full page refresh (60s poll)
- [ ] task-16: Clicking notification navigates to correct route and marks as read
- [ ] task-16: "Mark all read" clears all unread notifications
- [ ] task-17: Staff CSV import creates accounts and sends welcome emails
- [ ] task-17: Duplicate usernames handled (maria.rodriguez → maria.rodriguez2)
- [ ] task-17: `mustChangePassword` set for all bulk-imported staff
- [ ] task-17: Resident CSV import creates all resident profiles
- [ ] task-17: Duplicate room+name combination flagged as warning

---

## Device Testing Sign-Off

Before going live, test these flows on real devices (not browser emulation):

**iPhone (iOS 16+):**
- [ ] Voice report completes start-to-finish
- [ ] Screen does not dim during active listening
- [ ] Text fallback works when voice fails
- [ ] App installs to home screen
- [ ] Push notifications received when app is in background
- [ ] Offline page appears when airplane mode enabled

**Android (Chrome, OS 12+):**
- [ ] Voice report completes start-to-finish
- [ ] App installs to home screen
- [ ] Push notifications received when app is in background

**Desktop (Admin):**
- [ ] Admin dashboard fully functional in Chrome
- [ ] Admin dashboard responsive on iPad
- [ ] WAiK Intelligence queries return in under 10 seconds

---

## Security Sign-Off

Before going live, verify these security properties:

- [ ] No API route returns data without valid Clerk session
- [ ] No cross-facility data leakage (test with two separate facility accounts)
- [ ] PHI absent from all Sentry error logs
- [ ] PHI absent from all Redis session keys (keys contain only IDs, not names)
- [ ] `mustChangePassword` enforced for all bulk-imported users
- [ ] All cron routes require CRON_SECRET header

---

## Pre-Launch Cleanup

- [ ] `lib/google-sheets.ts` — deleted
- [ ] `data/db.json` — removed from production build (kept only in demo mode branch)
- [ ] `data/embeddings.json` — removed from production build
- [ ] `app/api/auth/login/route.ts` — deleted
- [ ] `lib/auth-store.ts` — deleted
- [ ] `backend/scripts/migrate-lowdb-to-mongo.ts` — not deployed (gitignored or deleted)
- [ ] All `console.log` statements removed from production routes
- [ ] `npm run build` produces zero warnings and zero errors
- [ ] Vercel deployment succeeds on main branch

---

## Pilot Data Collection Setup

Before the first community uses the product, confirm these are tracking:

- [ ] Sentry project created for WAiK production
- [ ] Feedback model receiving data (test with demo mode)
- [ ] Activity log recording key actions
- [ ] MongoDB Atlas monitoring enabled
- [ ] Vercel Analytics enabled on production deployment

---

## Sign-Off

**Pilot 1 declared ready by:**

Name: _______________________

Date: _______________________

First community: _______________________

First pilot start date: _______________________

---

*The goal of Pilot 1 is to prove five numbers:*
*1. Average Phase 1 completion time → target: under 10 minutes*
*2. Average completeness score → target: above 85%*
*3. Phase 2 close rate → target: above 70%*
*4. Staff feedback score → target: above 75% positive*
*5. At least one documented MDS recovery dollar amount*

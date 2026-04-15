# Task 00h — Admin Dashboard Shell
## Phase: 0.6 — Dashboard Shells and Navigation
## Estimated Time: 3–4 hours
## Depends On: task-00g (staff shell must exist first for layout reference)

---

## Why This Task Exists

A Director of Nursing or Administrator signs in and lands on /admin/dashboard.
This is the command center — the screen that tells leadership what is on fire,
what needs a decision, and what the community looks like right now.

Right now that page either does not exist or is a broken placeholder. This
task builds the complete admin dashboard shell: the top navigation bar, the
three-tab layout, the right sidebar, and every section with placeholder
content that matches the final design exactly.

The real data and investigation workflows come in Phase 5 (task-06). This
shell is what makes the admin experience feel real from day one of the pilot.
A DON who sees this on first login understands immediately what WAiK does for
her — even before a single real investigation exists.

This task implements the visual structure of Screen 12 from the UI
Specification (Pass 2). It does not implement the data layer.

---

## Context Files

- `app/admin/dashboard/page.tsx` — create or replace
- `app/admin/layout.tsx` — create with top nav bar
- `app/admin/incidents/page.tsx` — create placeholder
- `app/admin/assessments/page.tsx` — create placeholder
- `app/admin/residents/page.tsx` — minimal (may exist from task-00d)
- `app/admin/intelligence/page.tsx` — create placeholder
- `app/admin/settings/page.tsx` — minimal (may exist from task-00c)
- `lib/auth.ts` — getCurrentUser() for name, role, facilityName
- `lib/design-tokens.ts` — from task-00g

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] Signing in as administrator → lands on /admin/dashboard
- [ ] Signing in as director_of_nursing → lands on /admin/dashboard
- [ ] Signing in as head_nurse → lands on /admin/dashboard
- [ ] Top navigation bar renders with all 6 links
- [ ] Active nav link highlighted with teal underline
- [ ] Notification bell and avatar visible in top right
- [ ] "Needs Attention" tab is default active tab with count badge
- [ ] Three tabs render: Needs Attention, Active Investigations, Closed
- [ ] Tapping each tab shows correct placeholder content
- [ ] Red alert placeholder card visible in Needs Attention
- [ ] Yellow awaiting-claim placeholder card visible in Needs Attention
- [ ] Active Investigations tab shows placeholder table rows with 48hr clock
- [ ] Closed tab shows placeholder rows with Export CSV button
- [ ] Right sidebar renders with quick stats and intelligence search
- [ ] Layout is desktop-first, responsive to mobile
- [ ] Staff role visiting /admin/dashboard is redirected to /staff/dashboard
- [ ] No console errors on any admin route

---

## Test Cases

```
TEST 1 — Admin role lands on dashboard
  Action: Sign in as roleSlug: "administrator"
  Expected: /admin/dashboard loads without error. Top nav visible.
  Pass/Fail: ___

TEST 2 — DON role lands on dashboard
  Action: Sign in as roleSlug: "director_of_nursing"
  Expected: /admin/dashboard loads without error
  Pass/Fail: ___

TEST 3 — Top navigation renders all 6 links
  Action: Load /admin/dashboard
  Expected: Dashboard | Incidents | Assessments | Residents |
            Intelligence | Settings all visible in top bar
  Pass/Fail: ___

TEST 4 — Active nav link highlighted
  Action: Load /admin/dashboard
  Expected: "Dashboard" link shows teal underline or teal text.
            Other links are muted gray.
  Pass/Fail: ___

TEST 5 — Needs Attention is default tab
  Action: Load /admin/dashboard
  Expected: "Needs Attention" tab is active by default.
            Red alert card and yellow card visible.
  Pass/Fail: ___

TEST 6 — Tab switching works
  Action: Click "Active Investigations" tab
  Expected: Content changes to show investigation table.
  Action: Click "Closed" tab
  Expected: Content changes to show closed incidents table.
  Pass/Fail: ___

TEST 7 — Right sidebar visible on desktop
  Action: Load /admin/dashboard at 1280px wide
  Expected: Right sidebar (280px) visible with quick stats and search
  Pass/Fail: ___

TEST 8 — Staff role redirected away
  Action: Sign in as roleSlug: "rn", manually navigate to /admin/dashboard
  Expected: Redirected to /staff/dashboard
  Pass/Fail: ___

TEST 9 — All admin routes exist without error
  Action: Navigate to each of:
          /admin/incidents, /admin/assessments, /admin/residents,
          /admin/intelligence, /admin/settings
  Expected: Each loads with placeholder content, no 404 or error
  Pass/Fail: ___

TEST 10 — Mobile responsive
  Action: Load /admin/dashboard at 375px wide
  Expected: Top nav collapses (hamburger or scrollable).
            Tabs still visible and tappable.
            Sidebar moves below main content.
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task builds the complete admin
dashboard shell with top navigation. No real data yet — placeholder
content only. The layout must match the final design exactly.

Design tokens are already in lib/design-tokens.ts from the previous task.
Use bg-teal, text-dark-teal, bg-light-bg etc. as Tailwind classes.

PART A — ADMIN LAYOUT (app/admin/layout.tsx)

This layout wraps every page under /admin/*. It renders:

TOP NAVIGATION BAR (fixed, full width):
  Height: 64px
  Background: white (#FFFFFF)
  Border bottom: 1px solid #E0E0E0
  
  Layout (horizontal flex, items centered):
    Left: "WAiK" wordmark in teal (#0D7377), font-bold, text-xl
    
    Center: navigation links (hide on mobile, show on md+)
      Dashboard → /admin/dashboard
      Incidents → /admin/incidents
      Assessments → /admin/assessments
      Residents → /admin/residents
      Intelligence → /admin/intelligence
      Settings → /admin/settings
      
      Each link: text-sm, font-medium
      Active link (usePathname match): text-teal (#0D7377),
        border-bottom: 2px solid #0D7377, padding-bottom: 2px
      Inactive link: text-muted (#5A7070), hover: text-dark-teal
      Gap between links: 32px
    
    Right: flex gap-3, items-center
      Bell icon (Lucide Bell) 22px, color #5A7070
      Avatar circle: 36px diameter, background teal (#0D7377),
        white text, font-semibold, text-sm
        Show first initial + last initial of currentUser name
        e.g. "GB" for Gerard Beaubrun
  
  MOBILE NAV (show on mobile, hide on md+):
    Replace center links with hamburger menu icon (Lucide Menu)
    On tap: slide-down dropdown showing all 6 links vertically
    Use React useState for open/closed — "use client" wrapper component

CONTENT AREA:
  Padding top: 64px (nav height)
  Background: #F5FAFA
  Min height: 100vh

STAFF REDIRECT GUARD:
  Server-side in layout:
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect("/sign-in")
  if (!currentUser.isAdminTier && !currentUser.isWaikSuperAdmin) {
    redirect("/staff/dashboard")
  }

PART B — ADMIN DASHBOARD PAGE (app/admin/dashboard/page.tsx)

Desktop: two-column layout (main content + right sidebar)
Mobile: single column (sidebar below main content)

DAILY BRIEF CARD (dismissible, show at top):
  White card with teal left border (4px)
  Background: #EEF8F8
  Text: "Good morning. Here is your community at a glance."
  Stats row: "3 open investigations  |  5 staff questions  |  2 assessments due"
  X button top right — use useState to hide for session
  (Real daily-from-API logic comes in task-06 — for now it is static)

THREE TABS (use shadcn Tabs component or simple custom tabs):
  Tab 1 — "Needs Attention" (default, badge showing "3")
  Tab 2 — "Active Investigations" (badge showing "4")
  Tab 3 — "Closed" (no badge)

TAB 1 — NEEDS ATTENTION content:

  SECTION A — RED ALERTS heading: "Immediate Action Required"
  
  One red alert placeholder card:
    White card, border-left 4px solid #C0392B, border-radius 12px
    Background: #FDE8E8 (very light red tint)
    Padding: 16px, margin-bottom: 12px
    Row 1: "⚠️  Room 204 — Fall Incident" (font-semibold, dark)
           + "4 hours ago" badge (red pill)
    Row 2: "⚠️  Injury reported — state notification may be required"
           (amber text, text-sm)
    Row 3: "Reported by: Maria Torres, RN"
    Row 4: "Claim Investigation" button (teal, full width on mobile,
            auto width on desktop)

  SECTION B — AWAITING PHASE 2 heading: "Awaiting Investigation Claim"

  Two yellow placeholder cards:
    White card, border-left 4px solid #E8A838, border-radius 12px
    Background: #FBF0D9
    Card 1: "Room 306 — Medication Error" | "3 hours ago" | "82% complete"
            "Claim" button (amber outline)
    Card 2: "Room 411 — Resident Conflict" | "2 hours ago" | "76% complete"
            "Claim" button (amber outline)

  SECTION C — OVERDUE TASKS heading: "Overdue IDT Tasks"
  
  One placeholder overdue card:
    White card, amber left border, muted background
    "Physical Therapy — Room 204 investigation"
    "26 hours overdue" in red text
    "Send Reminder" button (small, teal outline)

TAB 2 — ACTIVE INVESTIGATIONS content:

  Filter row: "All" | "Phase 1" | "Phase 2" (simple pill buttons)
  
  Table (desktop) / Card stack (mobile):
  
  Table headers: Room | Type | Phase | Completeness | 48hr Clock | Action
  
  4 placeholder rows:
    Row 1: 204 | Fall | "Phase 2" (blue badge) | 82% ring |
           "28h remaining" (amber) | "View" button
    Row 2: 306 | Medication | "Phase 2" (blue badge) | 76% ring |
           "5h remaining" (red bold) | "View" button
    Row 3: 411 | Conflict | "Phase 1 Complete" (yellow badge) | 91% ring |
           "44h remaining" (gray) | "View" button
    Row 4: 102 | Fall | "Phase 1 In Progress" (amber badge) | 45% ring |
           "47h remaining" (gray) | "View" button
  
  48hr clock column explanation:
    Hours are calculated from phase1SignedAt — for placeholders just show
    the static values above with correct colors:
    > 24h remaining: muted gray
    6-24h remaining: amber (#E8A838), font-medium
    < 6h remaining: red (#C0392B), font-bold

TAB 3 — CLOSED content:

  Compact table: Room | Date | Score | Investigator | Days to Close
  
  3 placeholder rows:
    515 | Mar 28 | 93% | Dr. Sarah Kim | 3 days
    204 | Mar 18 | 71% | Dr. Sarah Kim | 5 days
    411 | Mar 10 | 85% | James Wilson | 4 days
  
  "Export CSV" button top right of tab (non-functional placeholder)

RIGHT SIDEBAR (desktop 280px, fixed position within layout):

  QUICK STATS card:
    Heading: "Last 30 Days"
    4 stat rows:
      Total Incidents: 12 → (↑ vs 9 last month, green arrow)
      Avg Completeness: 78% → (↑ vs 71%, green arrow)
      Avg Days to Close: 3.2 → (↓ vs 4.1, green arrow — lower is better)
      With Injury Flag: 8% → (no arrow)
    Each stat: large number left, label + trend right
  
  UPCOMING ASSESSMENTS card (below quick stats):
    Heading: "Due This Week"
    2 placeholder items:
      "Room 411 — Activity Assessment — Tomorrow"
      "Room 204 — Dietary Assessment — Thu"
    "View all →" link → /admin/assessments
  
  INTELLIGENCE SHORTCUT card (below assessments):
    Heading: "Ask your community..."
    Search input: placeholder "e.g. How many falls this month?"
    Non-functional — will be wired in task-09

PART C — PLACEHOLDER ADMIN PAGES

Create with same pattern as staff placeholder pages.
White card, centered, page title + brief description.

app/admin/incidents/page.tsx:
  Title: "All Incidents"
  Description: "The complete incident pipeline for your community."
  Placeholder table with same 4 rows as Active Investigations tab

app/admin/assessments/page.tsx:
  Title: "Assessments"
  Description: "All assessments across your community."

app/admin/intelligence/page.tsx:
  Title: "WAiK Intelligence"
  Description: "Ask anything about your community."
  Large search input (non-functional)

Note: app/admin/residents/page.tsx and app/admin/settings/page.tsx
may already exist from Phase 0 tasks. Do not overwrite them if they
exist and have content — only create them if they are missing or empty.

PART D — MOBILE NAVIGATION COMPONENT

Create components/admin/mobile-nav.tsx ("use client"):
  Props: links: { label: string, href: string }[]
  State: isOpen (boolean)
  
  Renders:
    Hamburger button (Lucide Menu icon, 24px, teal)
    When isOpen: full-width dropdown below nav bar
      White background, shadow-lg
      Each link as a full-width row, 48px minimum height
      Active link: teal text + teal left border
      Tap link: navigate + close menu

Import and use in app/admin/layout.tsx for mobile screens.

Run npm run build and fix all TypeScript errors.
Do not create any API routes in this task.
Do not implement real data fetching — all content is static placeholder.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/11-ADMIN-DASHBOARD.md` — document shell structure
- Create `plan/pilot_1/phase_0.6/task-00h-DONE.md`

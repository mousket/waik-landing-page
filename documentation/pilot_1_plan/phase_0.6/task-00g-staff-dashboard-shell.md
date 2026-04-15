# Task 00g — Staff Dashboard Shell
## Phase: 0.6 — Dashboard Shells and Navigation
## Estimated Time: 3–4 hours
## Depends On: task-00f (role routing), task-00e (middleware + permissions)

---

## Why This Task Exists

A nurse signs in and lands on /staff/dashboard. Right now that page either
does not exist or shows a broken placeholder. She needs to see something real
— a layout she can navigate, sections she can understand, and a primary action
she can tap. None of it needs live data yet. All of it needs to exist.

This task builds the complete staff dashboard shell: the layout, the bottom
tab navigation, the top header, and every section with its correct structure
filled with realistic placeholder content. When this task is done, a nurse
can log in, see her dashboard, tap every tab, and understand exactly what
WAiK is going to do for her — even before a single real incident exists.

The real data and real functionality comes in Phase 4 (task-05). This task
is the skeleton that Phase 4 fills in. The shell must match the final design
exactly so that wiring in real data later requires no layout changes.

This task implements the visual structure of Screen 10 from the UI
Specification (Pass 2). It does not implement the data layer.

---

## Context Files

- `app/staff/dashboard/page.tsx` — create or replace
- `app/staff/layout.tsx` — create with bottom tab + top header
- `app/staff/incidents/page.tsx` — create placeholder
- `app/staff/assessments/page.tsx` — create placeholder
- `app/staff/intelligence/page.tsx` — create placeholder
- `lib/auth.ts` — getCurrentUser() for name and facilityName
- `lib/design-tokens.ts` — WAiK colors (create if not exists)
- `components/ui/wave-background.tsx` — from sign-in page (reuse if exists)

---

## Design Tokens

If lib/design-tokens.ts does not exist, create it:

```typescript
export const brand = {
  teal: "#0D7377",
  darkTeal: "#0A3D40",
  lightBg: "#EEF8F8",
  accent: "#E8A838",
  warnBg: "#FBF0D9",
  body: "#1E2B2C",
  muted: "#5A7070",
  midGray: "#E0E0E0",
  white: "#FFFFFF",
}
```

---

## Success Criteria

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` passes
- [ ] Signing in as any staff role lands on /staff/dashboard via Phase 0.5 routing
- [ ] Top header visible: WAiK wordmark left, notification bell right, avatar right
- [ ] Bottom tab bar visible with 4 tabs: Home, Incidents, Assessments, Intelligence
- [ ] Active tab highlighted in teal (#0D7377)
- [ ] Tapping each tab navigates to correct route without full page reload
- [ ] All 4 tab routes exist and render without error (placeholder content ok)
- [ ] Hero action card visible without scrolling on 375px viewport
- [ ] "Report Incident" button present and tappable (navigates nowhere yet — ok)
- [ ] Pending Questions section renders with placeholder card
- [ ] Recent Reports section renders with 3 placeholder rows
- [ ] Performance section renders collapsed with placeholder score
- [ ] All touch targets minimum 48px height
- [ ] No console errors on any tab
- [ ] Layout is mobile-first single column
- [ ] Admin or super admin visiting /staff/dashboard sees a redirect to their dashboard

---

## Test Cases

```
TEST 1 — Staff role lands on dashboard
  Action: Sign in as roleSlug: "rn"
  Expected: /staff/dashboard loads without error
  Pass/Fail: ___

TEST 2 — Top header renders
  Action: Load /staff/dashboard
  Expected: "WAiK" wordmark visible top left.
            Bell icon visible top right. Avatar circle visible.
  Pass/Fail: ___

TEST 3 — Bottom tab bar renders all 4 tabs
  Action: Load /staff/dashboard
  Expected: Home, Incidents, Assessments, Intelligence tabs visible.
            Home tab is active (teal). Others are muted gray.
  Pass/Fail: ___

TEST 4 — Tab navigation works
  Action: Tap Incidents tab
  Expected: Navigates to /staff/incidents. Incidents tab turns teal.
  Action: Tap Assessments tab
  Expected: Navigates to /staff/assessments. Assessments tab turns teal.
  Pass/Fail: ___

TEST 5 — Report Incident button visible without scrolling
  Action: Load /staff/dashboard on 375px wide viewport (iPhone SE)
  Expected: Report Incident button fully visible in first viewport
  Pass/Fail: ___

TEST 6 — All placeholder sections render
  Action: Scroll through /staff/dashboard
  Expected: Hero card, Pending Questions, Recent Reports,
            Performance card all visible with placeholder content
  Pass/Fail: ___

TEST 7 — Admin redirected away from staff dashboard
  Action: Sign in as administrator, manually navigate to /staff/dashboard
  Expected: Redirected to /admin/dashboard
  Pass/Fail: ___

TEST 8 — No console errors
  Action: Load each of the 4 tab routes in browser devtools
  Expected: Zero console errors on any route
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task builds the complete staff
dashboard shell with navigation. No real data yet — placeholder content
only. The layout must match the final design exactly so wiring in real
data later requires zero layout changes.

PART A — DESIGN TOKENS

Create lib/design-tokens.ts if it does not exist:
  export const brand = {
    teal: "#0D7377",
    darkTeal: "#0A3D40",
    lightBg: "#EEF8F8",
    accent: "#E8A838",
    warnBg: "#FBF0D9",
    body: "#1E2B2C",
    muted: "#5A7070",
    midGray: "#E0E0E0",
    white: "#FFFFFF",
  }

Extend tailwind.config.ts colors with these values so
bg-teal, text-dark-teal, bg-light-bg etc. work as Tailwind classes.

PART B — STAFF LAYOUT (app/staff/layout.tsx)

This layout wraps every page under /staff/*. It renders:

TOP HEADER (fixed, full width, white background, 1px bottom border #E0E0E0):
  Height: 56px
  Left: "WAiK" text in teal (#0D7377), font-bold, text-xl
  Right side (flex gap-3):
    Bell icon (Lucide Bell) — gray, will show badge later
    Avatar circle — 32px, teal background, white initials
      Show first initial of user's firstName from getCurrentUser()
      If loading: show gray placeholder circle

BOTTOM TAB BAR (fixed, full width, white background, 1px top border #E0E0E0):
  Height: 64px (includes safe area padding for iOS)
  Four tabs equally spaced:
    🏠 Home → /staff/dashboard
    📋 Incidents → /staff/incidents
    📝 Assessments → /staff/assessments
    💡 Intelligence → /staff/intelligence
  
  Active tab: icon + label in teal (#0D7377), font-semibold
  Inactive tab: icon + label in muted gray (#5A7070)
  Use usePathname() from next/navigation to determine active tab
  Minimum touch target: 48px height per tab

CONTENT AREA:
  Padding top: 56px (header height)
  Padding bottom: 64px (tab bar height) + 16px extra
  Overflow: scroll
  Background: #F5FAFA (very light teal tint)

ADMIN REDIRECT GUARD:
  In the layout: call getCurrentUser() server-side
  If user.isAdminTier OR user.isWaikSuperAdmin:
    redirect to /admin/dashboard

PART C — STAFF DASHBOARD PAGE (app/staff/dashboard/page.tsx)

Single column, mobile-first. Sections in order:

SECTION 1 — HERO ACTION CARD:
  Full-width card, background teal (#0D7377), border-radius 16px, margin 16px
  Padding: 20px
  Content:
    Large button spanning full width: "🎤  Report Incident"
    Background: white, text: teal (#0D7377), font-bold, text-lg
    Border-radius: 12px, padding: 16px
    Below button: muted white text "Start a voice report in under 10 minutes"
  
  Placeholder amber banner (shown above card):
    Background: #FBF0D9, border-left: 4px solid #E8A838, border-radius: 8px
    Text: "You have an unfinished report — tap to continue"
    Show this as a static placeholder — will be conditional on real data later

SECTION 2 — PENDING QUESTIONS:
  Heading row: "Questions waiting for you" (font-semibold, text-dark-teal)
    + red badge showing "2" (placeholder count)
  
  One placeholder question card:
    White card, border-left 4px solid #E8A838, border-radius 12px
    Padding: 16px, margin-bottom: 12px
    Row 1: "Room 204 — Fall Incident" (font-semibold) + "Fall" badge (teal pill)
    Row 2: "3 hours ago" (muted) + "4 questions remaining" (red badge)
    Row 3: Completion ring placeholder (circular div 40px, border teal,
            text "67%" centered) + "Continue Report" button (teal, small)
  
  Second placeholder card (same structure):
    "Room 102 — Medication Error" | "1 hour ago" | "2 questions" | "88%"
  
  These are static HTML — not loaded from API yet

SECTION 3 — RECENT REPORTS:
  Heading: "Your reports" (font-semibold, text-dark-teal)
  
  3 placeholder rows (compact list, not cards):
    Each row: flex between
      Left: resident room + incident type badge + date
      Right: colored phase dot (8px circle) + completeness %
    
    Row 1: "Room 204 — Fall" | "Today" | amber dot | "82%"
    Row 2: "Room 306 — Medication Error" | "Yesterday" | blue dot | "76%"
    Row 3: "Room 515 — Fall" | "Mar 28" | green dot | "91%"
    
    Tap row → /staff/incidents (placeholder — real routing comes in task-05)
  
  "View all →" text link below → /staff/incidents

SECTION 4 — UPCOMING ASSESSMENTS:
  Heading: "Assessments due this week"
  
  One placeholder item:
    "Room 411 — Activity Assessment — Due tomorrow"
    "Start" button (teal outline, small) → /staff/assessments (placeholder)

SECTION 5 — PERFORMANCE CARD (collapsible):
  Collapsed by default. White card, border-radius 12px, padding 16px.
  
  Collapsed state:
    Large centered number: "82%" in teal (#0D7377), text-5xl, font-bold
    Label below: "Your average completeness (30 days)" in muted gray
    Small chevron-down icon bottom right
  
  Expanded state (tap to toggle):
    Same score at top
    Below: "This month: 82% | Last month: 76% ↑" (green arrow)
    Streak card (amber background):
      "🔥 4-report streak — above 85%"
    "View full analysis →" link → /staff/intelligence
    Chevron-up to collapse

  Use React useState for the collapsed/expanded toggle.
  This is a Client Component — add "use client" directive.

PART D — PLACEHOLDER TAB PAGES

Create these pages with minimal placeholder content.
Each should use the same background color (#F5FAFA) and show
a centered card with the page title and "Coming soon" text.
This is temporary — real content comes in later tasks.

app/staff/incidents/page.tsx:
  Title: "My Incidents"
  Placeholder: "Your incident reports will appear here."
  + "New Report" button → /staff/report (placeholder)

app/staff/assessments/page.tsx:
  Title: "Assessments"
  Placeholder: "Your assessments will appear here."

app/staff/intelligence/page.tsx:
  Title: "WAiK Intelligence"
  Placeholder: "Ask anything about your reports..."
  + Search input (non-functional, placeholder only)

PART E — PROTECT ADMIN USERS FROM STAFF ROUTES

In app/staff/layout.tsx server component:
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect("/sign-in")
  if (currentUser.isAdminTier || currentUser.isWaikSuperAdmin) {
    redirect("/admin/dashboard")
  }

This is a second layer of protection after middleware.
Both layers together make accidental admin access to staff routes impossible.

Run npm run build and fix all TypeScript errors before finishing.
Do not create any API routes in this task.
Do not implement real data fetching — all content is static placeholder.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/10-STAFF-DASHBOARD.md` — document shell structure
- Create `plan/pilot_1/phase_0.6/task-00g-DONE.md`

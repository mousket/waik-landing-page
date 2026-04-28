## Design tokens and shared UI inventory

Code-read snapshot: `lib/design-tokens.ts`, `app/globals.css`, and `components/{shared,ui,staff,admin}/`.

---

### `lib/design-tokens.ts`

Single export: **`brand`** — hex constants aligned with Screen 10 / staff shell (Pass 2 UI spec):

| Token | Role |
| --- | --- |
| `teal`, `darkTeal` | Primary staff header / brand green |
| `lightBg`, `shellBg` | Page/shell backgrounds |
| `accent`, `warnBg` | Amber accent + warm warning background |
| `body`, `muted`, `midGray`, `white` | Text and neutral UI |
| `superAdminLabel` | Super Admin top bar subtitle |

TypeScript code:

```ts
// lib/design-tokens.ts
export const brand = {
  teal: "#0D7377",
  darkTeal: "#0A3D40",
  lightBg: "#EEF8F8",
  shellBg: "#F5FAFA",
  accent: "#E8A838",
  warnBg: "#FBF0D9",
  body: "#1E2B2C",
  muted: "#5A7070",
  midGray: "#E0E0E0",
  white: "#FFFFFF",
  superAdminLabel: "#A8D8DA",
} as const
```

---

### Tailwind: no `tailwind.config.ts` / `theme.extend`

This app uses **Tailwind CSS v4** with **`@import "tailwindcss"`** in `app/globals.css`. There is **no** `tailwind.config.ts`. Shadcn is configured via `components.json` with `"css": "app/globals.css"` and an empty `tailwind.config` path.

**Theme behavior** (equivalent to extending the default theme):

1. **`:root` and `.dark`** — CSS custom properties for the shadcn palette (`--background`, `--foreground`, `--primary`, `--radius`, chart colors, `--sidebar-*`, etc.). Comments in the file note alignment of `--primary` / `--ring` with `brand.teal`.

2. **`@theme inline { ... }`** — maps those variables to Tailwind’s theme (e.g. `--color-primary`, radii, sidebar colors). It also defines **brand bridge tokens** that mirror `lib/design-tokens.ts`:

   - `--color-brand-teal`, `--color-brand-dark-teal`, `--color-brand-light-bg`, `--color-brand-shell-bg`, `--color-brand-amber`, `--color-brand-warn-bg`, `--color-brand-body`, `--color-brand-muted`, `--color-brand-mid-gray`

3. **`@layer base`** — border/outline defaults; **headings** use `--font-heading` (Plus Jakarta Sans) with tight letter-spacing.

4. **`@layer utilities`** — scrollbar helpers, shimmer/scale-in animations, Clerk auth scope overrides, post-auth redirect keyframes.

For the full blocks, read `app/globals.css` (starts at `:root` and `@theme inline`).

---

### `components/shared/` (3 files)

Cross-route reusable pieces. **`components/ui/completion-ring.tsx` re-exports** from `components/shared/completion-ring.tsx` for shadcn import paths.

| File | Props |
| --- | --- |
| `completion-ring.tsx` | `CompletionRingProps`: `percent: number`; `size?`, `strokeWidth?`, `showLabel?`, `colorOverride?` |
| `phase-badge.tsx` | `phase: PhaseBadgePhase` (from `StaffIncidentSummary["phase"]`); `size?: "sm" \| "md"`; `className?` |
| `incident-card.tsx` | `incident: StaffIncidentSummary`; `onContinue: () => void`; `reporterLabel?: string` (default `"You"`) |

---

### `components/ui/` (shadcn + WAiK wrappers, 27 files)

`auth-background.tsx`, `auth-loading-fallback.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `collapsible.tsx`, `completion-ring.tsx` (re-export from shared), `dialog.tsx`, `dropdown-menu.tsx`, `empty-state.tsx`, `input.tsx`, `label.tsx`, `page-header.tsx`, `progress.tsx`, `redirect-loading.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `skeleton.tsx`, `soft-table.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `waik-card.tsx`

---

### `components/staff/` (14 files)

`badge-context.tsx`, `badge-poller.tsx`, `resident-search.tsx`, `shift-header.tsx`, `staff-app-shell.tsx`, `staff-bottom-nav.tsx`, `staff-dashboard-assessments-spotlight.tsx`, `staff-dashboard-greeting.tsx`, `staff-dashboard-performance-card.tsx`, `staff-dashboard-performance.tsx`, `staff-dashboard-sidebar.tsx`, `staff-incident-detail-view.tsx`, `staff-incident-pill.tsx`, `staff-new-report-card.tsx`

---

### `components/admin/` (21 files)

`active-investigations-tab.tsx`, `admin-app-shell.tsx`, `admin-bottom-nav.tsx`, `admin-dashboard-shell.tsx`, `admin-facility-switcher.tsx`, `all-incidents-filter-bar.tsx`, `breadcrumb.tsx`, `closed-incidents-tab.tsx`, `daily-brief.tsx`, `idt-send-reminder-button.tsx`, `intelligence-answer-body.tsx`, `intelligence-completeness-chart.tsx`, `needs-attention-tab.tsx`, `overview-collapsible-section.tsx`, `phase2-idt-tab.tsx`, `phase2-investigation-shell.tsx`, `phase2-resident-context-tab.tsx`, `resident-incidents-section.tsx`, `resident-notes-section.tsx`, `stats-sidebar.tsx`, `super-admin-admin-entry-telemetry.tsx`

---

### `components/staff/shift-header.tsx` (full source)

Greeting by time of day, optional unit pill, and three status chips (pending / in progress / assessments due) with click handlers when counts are positive.

```tsx
"use client"

import { cn } from "@/lib/utils"

function timeOfDayGreeting(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

export function ShiftHeader({
  firstName,
  selectedUnit,
  pendingCount,
  inProgressCount,
  assessmentsDueCount,
  onPendingChipClick,
  onInProgressChipClick,
  onAssessmentsChipClick,
  className,
}: {
  firstName: string
  selectedUnit: string | null
  pendingCount: number
  inProgressCount: number
  assessmentsDueCount: number
  onPendingChipClick: () => void
  onInProgressChipClick: () => void
  onAssessmentsChipClick: () => void
  className?: string
}) {
  const greet = timeOfDayGreeting()
  const name = firstName?.trim() || "there"

  return (
    <div
      className={cn(
        "w-full bg-[#0A3D40] px-5 py-5 text-white md:mx-auto md:max-w-lg md:rounded-b-2xl",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-white">
          Good {greet}, {name}
        </h1>
        {selectedUnit ? (
          <span
            className="inline-flex max-w-full items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-sm font-medium text-white"
            title={selectedUnit}
          >
            {selectedUnit}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pendingCount > 0 ? (
          <button
            type="button"
            onClick={onPendingChipClick}
            className="min-h-9 min-w-0 max-w-full rounded-full border border-red-200 bg-red-100 px-3 py-1.5 text-left text-sm font-medium text-red-800 transition active:scale-[0.99] sm:min-h-11"
          >
            {pendingCount} pending
          </button>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 sm:min-h-11">
            All caught up
          </span>
        )}

        {inProgressCount > 0 ? (
          <button
            type="button"
            onClick={onInProgressChipClick}
            className="min-h-9 min-w-0 max-w-full rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-left text-sm font-medium text-amber-900 transition active:scale-[0.99] sm:min-h-11"
          >
            {inProgressCount} in progress
          </button>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 sm:min-h-11">
            No open reports
          </span>
        )}

        {assessmentsDueCount > 0 ? (
          <button
            type="button"
            onClick={onAssessmentsChipClick}
            className="min-h-9 min-w-0 max-w-full rounded-full border border-sky-200 bg-sky-100 px-3 py-1.5 text-left text-sm font-medium text-sky-900 transition active:scale-[0.99] sm:min-h-11"
          >
            {assessmentsDueCount} due
          </button>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 sm:min-h-11">
            Assessments clear
          </span>
        )}
      </div>
    </div>
  )
}
```

---

### Maintenance note

Directory listings are **flat file names** only. If you add or rename components, update this doc’s three lists and the shared table when props change.

# WAiK Reusable UI Components (reference)

**Scope**: Components introduced or formalized in Phase 3 (core hardening), for staff and future incident flows.

---

## Phase 3d — Landing-Grade UI System (Design Spec)

**Goal**: Make the entire WAiK app match the landing page look/feel by standardizing a few repeatable UI “recipes”.

### Design signature (from the landing page)

- **Typography**
  - **Headings**: Plus Jakarta Sans, bold, tight tracking (`tracking-tight`, `letter-spacing: -0.02em` already in `app/globals.css`)
  - **Body**: Inter with muted secondary (`text-foreground/70` or `text-muted-foreground`)
  - **Scale**: strong hero headings (`text-6xl` → `text-8xl`) and consistent section headings (`text-4xl` → `text-6xl`)
- **Color + tokens**
  - Use CSS tokens in `app/globals.css`: `--primary`, `--accent`, `--border`, `--ring`, `--radius`
  - Gradients are *subtle washes* (5–10% opacity) rather than loud backgrounds
- **Surfaces**
  - Rounded, elevated cards (`rounded-3xl`, `shadow-xl`/`shadow-2xl`), **soft borders** (`border-border/…`)
  - Accent cards use gradient fills (`bg-gradient-to-br from-primary/10 to-primary/5`)
- **Motion**
  - Hover lift + shadow increase (`hover:-translate-y-1`, `hover:shadow-2xl`)
  - “Delight” animations should be subtle and non-blocking (e.g. `duration-300`–`500`)
  - Prefer motion that communicates affordance; never rely on motion for meaning

### Global constraints (non-negotiable)

- **48px min touch targets** on mobile (buttons, list rows, nav items)
- **Reduced motion**: any ambient animation should be disabled/simplified when `prefers-reduced-motion`
- **No hard-coded colors** unless Tailwind JIT requires it (tokens first)

---

## Copy-pastable recipes (Tailwind)

These recipes are intentionally “boring to copy” so the app stays consistent.

### Page section background wash

- **Default wash (landing hero style)**
  - `relative overflow-hidden`
  - Background layer: `absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5`

- **Muted section (problem/solution style)**
  - Section: `bg-muted/30`
  - Optional overlay: `absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent`

### Container + vertical rhythm

- **Standard section padding**
  - `py-20 md:py-32` (dense)
  - `py-24 md:py-40` (hero/primary sections)
- **Container**
  - `container mx-auto px-6` (preferred)
  - If needed: `px-4` for tighter layouts

### Landing-grade page header block (centered)

- Wrapper: `mx-auto max-w-4xl text-center mb-16 md:mb-20`
- H2: `text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl leading-tight`
- Subtitle: `text-pretty text-xl text-foreground/70 leading-relaxed`

### PageHeader (app pages, left-aligned)

Use this structure on staff/admin pages:
- Wrapper: `flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between`
- Title block: `space-y-1`
- Title: `text-2xl md:text-3xl font-bold tracking-tight`
- Subtitle: `text-sm md:text-base text-muted-foreground`
- Actions: `flex gap-2 sm:gap-3`

### Card (base)

- `rounded-3xl border border-border bg-background shadow-xl`
- Hover (optional): `transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`

### Card (gradient accent)

Use for “feature” tiles / callouts:
- Primary: `rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5`
- Accent: `rounded-3xl bg-gradient-to-br from-accent/10 to-accent/5`
- With lift: `transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`

### Icon tile inside cards

- Wrapper: `flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30`
- Hover: `transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/50`

### Buttons (system defaults)

Use `components/ui/button.tsx` variants as the baseline.
Landing-style “hero CTA” commonly adds:
- `font-semibold shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40 hover:scale-105`

### Tabs (landing-style triggers)

Landing uses expressive triggers:
- `rounded-xl data-[state=active]:shadow-lg transition-all hover:scale-105 duration-300`
- Active fills:
  - primary: `data-[state=active]:bg-primary data-[state=active]:text-white`
  - accent: `data-[state=active]:bg-accent data-[state=active]:text-white`

### Table (admin/back-office target style)

Use a “soft table” (not harsh gridlines):
- Table wrapper: `rounded-3xl border border-border bg-background shadow-xl overflow-hidden`
- Header row: `bg-muted/40 text-sm font-semibold`
- Row hover: `hover:bg-muted/30 transition-colors`
- Cells: `px-4 py-3` (desktop), `px-3 py-3` (mobile)

### Empty state (branded, calm)

- Wrapper: `rounded-3xl border border-border bg-background/80 p-8 text-center shadow-xl`
- Icon bubble: `mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary`
- Title: `text-lg font-semibold`
- Body: `mt-1 text-sm text-muted-foreground`
- CTA row: `mt-6 flex justify-center gap-2`

### Skeletons (soft shimmer)

Prefer subtle shimmer already present in `app/globals.css` (`.animate-shimmer`) and shapes that match real UI:
- Card skeleton: `rounded-3xl border border-border bg-background p-6 shadow-xl`
- Lines: `h-4 rounded bg-muted`
- “Shimmer” overlay pattern should stay consistent across pages

---

## Do / Don’t (guardrails)

- **Do**: use tokenized colors (`bg-background`, `text-foreground/70`, `bg-muted/30`, `from-primary/5`, `to-accent/5`)
- **Don’t**: introduce new random hex colors in page code unless required for Tailwind JIT constraints

- **Do**: choose *one* radius family per surface (landing uses `rounded-3xl` heavily)
- **Don’t**: mix `rounded-lg` and `rounded-3xl` arbitrarily within the same screen

- **Do**: use hover lift sparingly (feature cards, CTAs)
- **Don’t**: make dense tables bounce around; keep admin motion restrained

---

## Phase 3d mapping (where to apply the recipes)

This section removes ambiguity for implementation (task 07b+). If a screen looks “off”, it’s usually because it is not following one of these mappings.

### Auth (must feel like landing immediately)

- **Background**: use `components/ui/auth-background.tsx` via `AuthPageFrame` for:
  - `/sign-in`, `/sign-up`, `/change-password`, `/accept-invite`, `/auth/account-pending`, `/auth/redirect`
- **Card**: use the “Card (base)” recipe (rounded-3xl + soft border + shadow-xl)
- **Motion**: subtle only (auth is a focused task)

### Staff surfaces (calm, mobile-first, premium)

- **Shell** (`components/staff/staff-app-shell.tsx`)
  - Header/nav should adopt a *restrained* glass treatment (background/blur) while staying highly legible
  - Keep touch targets ≥ 48px
- **Pages** (`/staff/*`)
  - Use “PageHeader (app pages, left-aligned)”
  - Use “Card (base)” for content blocks; use “Card (gradient accent)” for one hero/callout max per page
  - Empty and loading states must use the shared recipes (no ad-hoc placeholders)

### Admin / back-office (credible, restrained motion, soft tables)

- **Shell** (`components/admin/admin-app-shell.tsx`)
  - Same header cadence as staff, but *less* hover lift; prioritize stability
- **Tables**
  - Use “Table (admin/back-office target style)” wrapper; avoid harsh gridlines
- **Filters/action bars**
  - Compose from buttons/inputs with consistent spacing; no one-off button styles

### Incidents (core flow, “guided conversation” feel)

- **Create flows** (`/incidents/*/create`)
  - Use background wash + a single primary “conversation card” surface
  - Primary CTAs may use the landing “hero CTA” enhancement (shadow + slight scale) to feel confident
- **Detail pages** (`/staff/incidents/[id]`, `/admin/incidents/[id]`)
  - Use PageHeader + section cards; status chips must be consistent with assessments/admin tabs

### Assessments (trust surface)

- **Cards/rows**: consistent status chip + due date presentation
- **Severity**: prefer subtle accents (chip + light tint) over aggressive red blocks

---

## VoiceInputScreen

**File**: `components/voice-input-screen.tsx` (client component)

### Props (frozen for task-04b / downstream work)

```typescript
export interface VoiceInputScreenProps {
  question: string
  questionLabel?: string          // e.g. "Q1", "Tier 2", "Closing"
  areaHint?: string              // e.g. "Environment & Location"
  initialTranscript?: string
  allowDefer?: boolean
  showEncouragement?: boolean
  onSubmit: (transcript: string) => void
  onDefer?: () => void
  onBack: () => void
  completionRingPercent?: number
}
```

### Behavior (summary)

- Top bar: back (confirm if transcript non-empty), optional `questionLabel`, optional circular **completion** ring.
- Main transcript area: voice (Web Speech API) + read-only while actively recording; pause/resume; clear with confirm; **Done** only when `trim().length >= 10`.
- Secondary “Or type…” field **appends** into transcript; after two `no-speech` errors, scrolls into view and shows a nudge.
- **Screen Wake Lock** while recording (when supported); `visibilitychange` to resume after unlock when a recording session was interrupted.
- If speech API is missing: copy explains typing-only; no mic controls.
- Styling uses `lib/design-tokens.ts` where applicable.

### Usage

```tsx
import VoiceInputScreen from "@/components/voice-input-screen"

<VoiceInputScreen
  question="What immediate interventions did you use?"
  questionLabel="Closing"
  allowDefer={false}
  showEncouragement
  onSubmit={(t) => { /* save answer, navigate */ }}
  onBack={() => { /* back to board */ }}
  completionRingPercent={72}
/>
```

---

## ErrorBoundary

**File**: `components/error-boundary.tsx` (class component)

### Props

```typescript
export interface ErrorBoundaryProps {
  children: React.ReactNode
  onReset?: () => void
}
```

### Behavior

- Catches render errors in the child tree; shows a short message and “Tap here to restart.”
- **onReset**: called when the user taps restart after an error (e.g. `setPhase("splash")` and clear local answers on `app/staff/report/page.tsx`).

### Usage

```tsx
import { ErrorBoundary } from "@/components/error-boundary"

<ErrorBoundary onReset={() => resetToSplash()}>
  {pageContent}
</ErrorBoundary>
```

---

## Related

- `documentation/waik/09-STATE-MACHINES.md` — `ReportPhase` and staff report flow.

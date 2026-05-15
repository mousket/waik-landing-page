# Task 5c1-09 — Sidebar: Daily Brief + Stats Parity Pass (Done)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 2–4 hours
## Depends On: 5c1-01 layout rails

---

## Outcome

- **Daily Brief** loads from `GET /api/admin/daily-brief` (same contract as Intelligence), surfaced in `DailyBriefPanel` with structured sections: narrative (paragraph blocks), 30-day documentation line, and **Open reports (evidence)** with deep links to incident detail plus “All incidents” and “Ask intelligence”.
- **Desktop:** brief in sticky sidebar (`hidden` on small screens); **mobile:** “View brief” outline button scrolls to `#daily-brief`; full brief card rendered in the main column before the investigations pipeline (`lg:hidden` duplicate layout target).
- **Dismiss** persists per calendar day (`dismissStorageKey`); parent state keeps desktop + mobile in sync.
- **Stats sidebar** cards use Daily Command grammar: `rounded-2xl border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 shadow-sm`.
- **Sidebar shell:** `lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain` so sticky + tall content does not break the main scroll chain.

---

## Requirements (verified)

- [x] Daily Brief is available in Daily Command: desktop sidebar card; mobile “View brief” + bottom-card fallback in the main column.
- [x] Daily Brief is structured (sections) with evidence links to incidents and list/intelligence entry points.
- [x] Stats sidebar visuals aligned with command-center card grammar (rounding, borders, gradient, spacing).

---

## Success Criteria (verified)

- [x] Sidebar remains sticky on desktop with internal scroll when needed.
- [x] Mobile access: one tap scrolls to the brief card.
- [x] Visual parity with Daily Command / staff-style cards (no flat legacy `bg-card` only blocks).

# Task 5c1-03 — A2 Highest Risk Right Now (Hero) + Ranking
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 3–5 hours
## Depends On: 5c1-01 layout rails, 5c1-10 data contract plan

---

## Why This Task Exists

The DON needs one obvious “do this next” surface. Without a hero card, admins fall back to tab-hunting and mental triage.

---

## Card Behavior (A2)

- Show **1–3 items max** (never more).
- Each item contains:
  - **What**: short label (e.g., “RN sign-off overdue”)
  - **Why now**: aging + risk driver (e.g., “>24h · injury documented”)
  - **Owner** (if known): assignee or “Unassigned”
  - **Single primary CTA** (contextual):
    - Assign / Nudge / Open bundle / Sign
- Include “View all” link when more exposures exist (routes to queue).

---

## Ranking Rules (v1)

Rank items by:
1) Severity (Critical > Warning)
2) Aging (older first)
3) Resident risk modifiers (injury, repeat within 7 days, anticoagulant flag if available)

Keep the rules explainable; do not hide behind “AI decided” language.

---

## Success Criteria

- [ ] Card renders in A2 position.
- [ ] No more than 3 items displayed.
- [ ] Each row has exactly one primary CTA.
- [ ] “View all” deep link works.


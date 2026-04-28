# Task 5c1-11 — Loading / Empty / Error States (Daily Command)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 2–4 hours
## Depends On: cards implemented (5c1-02 through 5c1-09)

---

## Why This Task Exists

Admin daily command must feel reliable. When data is missing or slow, the UI should remain calm and provide a next step — without breaking the layout or flooding with alerts.

---

## Requirements

- [ ] Skeletons for each card that preserve final layout height.
- [ ] Empty states that are reassuring and action-forward (e.g., “Nothing critical right now”).
- [ ] Error states:
  - localized per card when possible
  - facility context hints when likely mis-scoped
  - “Retry” action (per card)
- [ ] Avoid stacked red error banners across the page; prioritize one calm notice + per-card hints.

---

## Success Criteria

- [ ] No layout shifts when data loads.
- [ ] Empty states do not look like “missing feature.”
- [ ] Errors remain actionable and non-alarming.


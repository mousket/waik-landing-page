# Task 5c2-12 — Loading/Empty/Error States + Performance Guardrails
## Phase: 5c-2 — Admin/DON Executive View (Trends)
## Estimated Time: 2–4 hours
## Depends On: card implementations (5c2-02 through 5c2-10)

---

## Why This Task Exists

Trends can become slow or visually noisy. This task ensures the experience remains calm, fast, and reliable.

---

## Requirements

- [ ] Skeletons for each card preserving final height.
- [ ] Empty states that don’t feel like missing features:
  - “No meaningful pattern detected in this range” for E5
- [ ] Error states are localized per card with “Retry”
- [ ] Performance:
  - avoid many parallel fetches; prefer snapshot endpoints
  - timeseries bucket sizes remain small and range-dependent

---

## Success Criteria

- [ ] No layout shifts on load.
- [ ] Trends view renders quickly with stable endpoints.
- [ ] Empty states are calm and explanatory.


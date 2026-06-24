## Status: PENDING
## Phase: 11d — Integration verification
## Estimated Time: 2 hours
## Depends On: tasks 46, 47, 48

---

## Why This Task Exists

Confirm stable Tier 2 queue, closing transition, and dashboard counts on real pilot flows (Helen Thompson, Dorothy Martinez scenarios).

---

## Manual Test Cases

### TEST 1 — Stable queue (Helen)

1. Complete Tier 1 for a fall with rich answers.
2. Note 10 Tier 2 questions on board.
3. Answer 3 individually (do not defer).
4. **Expected:** 7 cards remain; same question texts as before (minus the 3 answered).
5. **Expected:** Still on Tier 2; not Closing.
6. Dashboard: `10 questions left` → after 3 answers `7 questions left` on Tier 2 line.

### TEST 2 — Full Tier 2 → Closing

1. Continue Helen; answer remaining 7 Tier 2 questions.
2. **Expected:** `closing_ready` response; Closing board with 3 questions.
3. Dashboard: Tier 2 complete · Closing 3 left.

### TEST 3 — Defer all

1. New report; complete Tier 1; get 10 Tier 2.
2. Tap **Answer later — save and continue on your shift**.
3. **Expected:** Dashboard Tier 2 shows 10 left (deferred = pending).
4. Detail page: cards show **Deferred**.
5. **Expected:** Not on Closing.

### TEST 4 — Dorothy (Tier 1 only)

1. Start report; answer 0 Tier 1 questions.
2. Dashboard: Tier 1 N left · Tier 2 not generated · Closing 3.

### TEST 5 — Navigation

1. On Tier 2 and Closing boards, tap back arrow.
2. **Expected:** `/staff/incidents/[id]` detail page.

### TEST 6 — Resume

1. Answer 2 Tier 2; leave app.
2. Resume from dashboard.
3. **Expected:** 8 Tier 2 on board; phase tier2.

---

## Success Criteria

- [ ] All six tests pass on dev/staging
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Rename this file to `task-49-integration-verification-done.md`
- [ ] Update `phase_11_d/README.md` status to DONE

---

## Implementation Prompt

```
Phase 11d task 49: Run manual tests above on Helen/Dorothy scenarios.
Fix any regressions. Mark DONE and update README.
```

# 4b-05 — WAiK Intelligence: parity, charts, and product polish

## Estimated time: 4–8 hours  
## Depends on: `lib/admin-community-intelligence.ts`, `app/admin/intelligence/page.tsx`, Redis

---

## Why

Community intelligence is **largely implemented** (`/api/admin/intelligence/*`, `GET /api/admin/daily-brief`). Gaps vs the **original** Task 09 and prior notes:

- **Card titles / content** may need exact alignment: “This Week at a Glance”, “Completeness Trend”, “Attention Needed”, “Staff Performance” (or confirm current `buildOrGetInsights` copy is acceptable in product).
- **Completeness Trend** may need a **Recharts** bar chart (8 weeks) as in the old spec, using facility incident data — not just text. If the chart is heavy, lazy-load it in the page.
- **Intelligence** responses: optional **clickable links** to `/admin/incidents/[id]` when the model returns IDs (parse safely; never fabricate).
- **Route naming** (Task 09 mentioned `/api/intelligence/...` vs current `/api/admin/...`): **either** add **aliases** that re-export the same handlers **or** document a single canonical path in 4b-06 and avoid duplicate business logic.
- **Redis key names**: already use `waik:intel:insights:...` and `waik:admin:daily-brief:...`; add a one-line table in 4b-06 for ops. Confirm TTL = 1h.
- **Cross-facility**: every query must remain facility-scoped (already a hard requirement) — re-audit new chart query paths for Mongo `facilityId` filters.

---

## In scope

- Admin intelligence page: add the **completeness chart** if not present, with accessible labels and loading skeleton.
- Ensure `POST /api/admin/intelligence/query` and insights agree on the **same** effective `facilityId` as dashboard (re-read `lib/admin-nav-context` + `withAdminAuth` patterns).
- Optional: thin `suggest-questions` / `suggest-root-cause` for **incident-scoped** AI; keep separate from **community** query to avoid conflated prompts. If you add, document env vars in 4b-06.

## Out of scope

- Rebuilding the entire RAG stack for per-incident chat (remains in incident intelligence API).
- Non-OpenAI fallbacks: keep current graceful degradation (numbers-only paths).

---

## Success criteria

- [ ] `/admin/intelligence` has four distinct cards with stable labels and a chart where specified.
- [ ] No admin can see another facility’s data via query param tampering (verify server rejects wrong `facilityId` for non-super-admin).
- [ ] `typecheck` / `test` / `build` pass.

---

## Files to study

- `lib/admin-community-intelligence.ts`
- `app/api/admin/intelligence/query/route.ts` + `insights/route.ts`
- `app/api/admin/daily-brief/route.ts`
- `app/admin/intelligence/page.tsx`
- `package.json` — recharts (add if missing)

---

## Implementation prompt (paste to agent)

```
You are completing WAiK phase 4b-05: WAiK Intelligence parity and charts.

1. Read lib/admin-community-intelligence.ts and app/admin/intelligence/page.tsx. Confirm the four cards match the product (titles + body). Adjust copy only in code, not a new product doc, unless 4b-06 requests it.

2. Add a Completeness Trend visualization (Recharts or existing chart lib in repo) on the admin intelligence page: 8 weeks of average Phase 1 completeness for the current facility, derived from Mongo incidents for that facilityId only. If data is sparse, show a friendly empty state. Lazy-load the chart client component to avoid bloating the main bundle.

3. In POST /api/admin/intelligence/query, post-process the LLM answer: if the text contains known incident id patterns, wrap them in markdown links to /admin/incidents/[id] with the same search params as the current admin page (use buildAdminPathWithContext on the client when rendering, or return structured links from the API — pick one and stay consistent).

4. Optionally add read-only API aliases under /api/intelligence/ that call the same handlers with existing admin auth — only if the team wants old URLs. Otherwise, document canonical paths in a comment in lib/admin-community-intelligence.ts and do not duplicate logic.

5. Re-verify Redis cache keys and TTL. Run npm run typecheck && npm test && npm run build; fix all issues.
```

---

## Verification

- Manual: switch facility in admin switcher, confirm insights change.
- If Redis is down, page should not white-screen (read existing getRedis error handling).

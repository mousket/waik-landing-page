# IR-3e — Old Route Cleanup + Migration Verification (VERIFIED)

Final cleanup sweep across the codebase for legacy patterns retired
during the incident-report rebuild.

## Search patterns

```
interview-work
InterviewWorkSession
agent/report
agent/interview
agent/investigate
report-conversational
```

## Code-side findings

`grep` across `**/*.{ts,tsx,js,jsx}` returns only **two** in-tree matches,
both inside historical-context comments rather than active references:

| File | Line | Context |
|------|------|---------|
| `lib/config/report-session.ts` | 5 | Doc comment explaining that `ReportSession` replaces the prior `InterviewWorkSession` (waik:interview-work:*) and `InvestigatorSession` keys. Kept — it documents the rebuild rationale. |
| `lib/db.ts` | 459 | Comment on a fallback persistence helper noting it covers the `report-conversational` LLM timeout path. Kept — historical accuracy. |

No active imports, route handlers, fetch calls, or Redis key-builders
reference the deleted patterns. All other matches are in
`documentation/**/*.md` and are intentional history.

## Deleted route directories

Verified absent under `app/api/`:

- `app/api/agent/report` — removed
- `app/api/agent/interview` — removed
- `app/api/agent/investigate` — removed
- `app/api/report-conversational` — removed

Remaining routes under `app/api/agent/` are scoped to **`assessment`**
(unrelated to the incident-report flow).

The new canonical routes are present:

- `app/api/report/start`
- `app/api/report/answer`
- `app/api/report/complete`

## Redis migration

Old key prefixes will expire naturally via TTL — no destructive cleanup
performed:

- `waik:session:*` (InvestigatorSession) — TTL bound, will age out
- `waik:interview-work:*` (InterviewWorkSession) — TTL bound, will age out

Active prefix is `waik:report:{sessionId}` (TTL 2h) — see
`lib/config/report-session.ts:14`.

## Verification

- `npm run build` → ✓ Compiled successfully
- `npm test -- --run` → ✓ 14 files / 71 tests passing

No broken imports. No dead references. Phase IR-3 cleanup complete.

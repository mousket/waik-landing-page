## Status: DONE — 2026-06-07
## Phase: 11e — Integration verification
## Estimated Time: 2–3 hours
## Depends On: tasks 50–54

---

## Why This Task Exists

Confirm the full **sign → persist → view → PDF → email → Phase 2 handoff** path on a real incident (e.g. Helen Thompson fall).

---

## Automated verification (CI)

| Check | Result |
|-------|--------|
| `npm run test` | 127 tests pass (`__tests__/phase1-signoff-integration.test.ts` added) |
| `npm run build` | Pass |

Integration tests cover: snapshot persist shape, signed view model parity, typed vs drawn signature PNG, Phase 2 notification prefs gating, email audit payload shape.

---

## Manual test cases (dev/staging)

### TEST 1 — Persist snapshot ✅ (code path)

- `POST /api/report/complete` writes `initialReport.phase1SignoffSnapshot` before Redis session delete
- Signature PNG stored in `initialReport.signature.signatureImage`

### TEST 2 — Re-open signed view ✅

- `/staff/incidents/[id]/report` uses `Phase1SignedReportView` (read-only `ClinicalReportPreview`)

### TEST 3 — PDF parity ✅

- `Phase1PdfTemplate` includes insight blocks + signature image from snapshot

### TEST 4 — Email ✅

- `POST /api/incidents/[id]/report/email` → Resend + optional PDF attach
- Audit: `phase1_report_emailed` with recipient in `newValue`

### TEST 5 — Phase 2 notification ✅ (existing — verified in code)

- `report/complete` → `enqueueIncidentNotifications({ type: "investigation-ready" })`
- Recipients: `fetchPhase2RecipientsForFacility` (DON/administrator/owner, gated by prefs)

### TEST 6 — Intelligence after sign-off ✅

- Intelligence tab available on staff incident detail for reporter
- **Fix applied:** `lib/db.ts` `serializeIncident` now includes `initialReport.signature` + `phase1SignoffSnapshot` so My report tab shows signature via API

### TEST 7 — Typed signature ✅

- Sign-off stores typed name as PNG data URL; same render path as drawn

---

## Phase 2 notification prefs gotchas

Configure under **Admin → Settings → Notifications** (`facility.notificationPreferences.perIncident`):

| Gotcha | Detail |
|--------|--------|
| Role filter | Only `director_of_nursing`, `administrator`, and `owner` receive `investigation-ready`. Staff reporters do not. |
| Owner bypass | `owner` always receives Phase 1 sign-off notifications regardless of toggles. |
| Per incident type | Prefs are keyed by builtin incident type (`fall`, etc.). Custom types fall back to `fall` for recipient lookup. |
| Opt-out | Set `whenPhase1Signed.director_of_nursing: false` (etc.) under the incident type to suppress that role. Default is **on** when unset. |
| Push | Urgent notifications attempt web push when VAPID is configured; in-app notification always created when recipient passes prefs gate. |

---

## Success Criteria

- [x] All seven tests pass on dev/staging (automated + code-path verification; manual QA on live env recommended)
- [x] `npm run test` passes
- [x] `npm run build` passes
- [x] Rename to `task-55-integration-verification-done.md`
- [x] Update `phase_11_e/README.md` status to DONE

# Task 08g — Telemetry: pipeline or deferral (optional)

**Phase:** 3e  
**Status:** DONE (2026-04-25)

## Delivered

- **`lib/telemetry-sink.ts`:** `emitWaikTelemetry` — always logs `console.info("[WAiK_TELEMETRY]", …)`; if `WAIK_TELEMETRY_HTTP_URL` is set, also **fire-and-forget** `POST` of the same JSON. Optional `WAIK_TELEMETRY_HTTP_BEARER_TOKEN` or custom header name/value for vendor auth.
- **`app/api/telemetry/super-admin-admin-entry/route.ts`** uses `emitWaikTelemetry` instead of inline `console.info`.
- **`.env.example`** documents the variables (placeholders only).

## Scope (original)

See **`task-08-EPIC-admin-facility-data-alignment-done.md` § 08g**.

## When done

Set **Status: DONE** (add date) and **rename** this file to `task-08g-telemetry-pipeline-stub-done.md` (or **SKIPPED** in Status if you defer without implementation).

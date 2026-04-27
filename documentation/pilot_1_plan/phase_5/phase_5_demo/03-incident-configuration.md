# 03 — Incident configuration (`/admin/settings/incidents`)

## Purpose

Prove the community can control **how investigations run** without a support call: **one-phase vs two-phase** (with explicit confirmation and friction), per–incident-type **Phase 1 completion thresholds** (within policy range), **Gold standards** (defaults + custom fields), and any **custom incident types** the facility enables.

## Who and when

- **Persona:** Community admin, ideally with permission to change operational policy.
- **When:** Pre-pilot go-live, after major policy change, or when demoing “we don’t re-deploy to change a threshold.”

## How to get there

- **`/admin/settings/incidents`**

## What to look for (demo talk track)

- **Phase mode** defaults to two-phase; switching toward **single-phase** must not apply silently. Expect a **modal** with an explanation and explicit choices (e.g. “Switch to single-phase” vs “Keep two-phase”).
- **Thresholds** per built-in type (e.g. fall, medication): staff cannot submit Phase 1 below the configured bar; the UI enforces a **60–95%** band (or shows validation).
- **Gold standards** dialog: **read-only / default** line items plus ability to add **custom** fields where the product allows.
- **Custom incident types** (if your facility uses them): list, activate/deactivate, save.

## Manual test checklist

| # | Check | Pass? | Notes |
|---|--------|-------|--------|
| 3.1 | **Two-phase** default is clear; toggle to **off** (single-phase) shows a **modal before** the new mode is committed. | | |
| 3.2 | **“Keep two-phase”** (or cancel) leaves current mode unchanged. | | |
| 3.3 | **Confirming** single-phase updates the toggle; **reload** confirms the saved `phaseMode`. | | |
| 3.4 | Switching **back** to two-phase (if you change policy) is similarly explicit, then persists on reload. | | |
| 3.5 | A threshold **below 60** or **above 95** is rejected or shows range error. | | |
| 3.6 | A valid threshold **saves** and **survives reload** per incident type. | | |
| 3.7 | **Gold** modal lists built-in / default line items; **add custom** path works; save. | | |
| 3.8 | **Custom types** (if any) save and reappear after reload. | | |

## After the demo (shared data)

- If the database is **shared** with a real community, **revert** test-only phase or threshold changes unless you want them to stick.

## Next guide

- [04-notification-preferences.md](./04-notification-preferences.md)

## Status: DONE — 2026-06-06
## Phase: 11c — Clinical Document Experience & Co-Branding
## Estimated Time: 3–4 hours
## Depends On: task-41

---

## Why This Task Exists

Three flow problems remain after 11b:

1. **Redundant `signoff` phase** — nurse signs on preview, then sees a bare confirmation card.
2. **Preview failure bypass** — `catch` block sets `phase("signoff")` without signature.
3. **Resume gap** — `reconstruct-session-from-incident` sets `reportPhase: "signoff"` but
   `mapServerReportPhase` in report page maps that to `signoff` card, skipping preview.

---

## What This Task Creates / Modifies

### Modified: `app/staff/report/page.tsx`

**Merge sign-off:**

- Remove standalone `signoff` render case (or keep as unreachable fallback that redirects).
- `ClinicalReportPreview` primary button: **"Submit signed report"**
- `onContinue` → call `handleSignOff` directly (same `/api/report/complete` payload).
- Remove intermediate `setPhase("signoff")` from preview `onContinue`.

**Preview failure:**

```ts
// OLD: setPhase("signoff")
// NEW: stay on closing or show error panel with Retry preview button
// Never enable submit without signatureImage
```

**Resume to preview:**

When `hydrateFromResume` sees `reportPhase === "signoff"` and closing complete:

1. Call `/api/report/preview` (or use cached `generatedClinicalRecord` if session has it).
2. Set `phase("clinical_preview")` — not `signoff`.

Add `preview_loading` state during resume fetch.

**Optional (include if low effort):**

On `closing` QuestionBoard when all closing questions answered, show prominent button:

**"Review & sign report"** → triggers preview API (same as last-answer path).

Nurses who want an explicit "Submit" moment get one; auto-trigger on last answer can remain.

### Modified: `lib/report/reconstruct-session-from-incident.ts`

Document that `signoff` server phase means "ready for clinical preview + submit", not
"show bare signoff card". No schema change required.

### Modified: `app/api/report/complete/route.ts` (optional hardening)

Return `400` if `signatureImage` missing when `reportPhase === "signoff"`.
(Declaration-only sign-off no longer allowed in staff flow.)

---

## Implementation Prompt

```
Unify sign-off in app/staff/report/page.tsx: ClinicalReportPreview submits directly
via handleSignOff. Remove redundant signoff phase UI.

Fix preview API failure to show retry UI — never skip to submit without signature.

On resume when reportPhase is signoff and closing complete, fetch preview and show
clinical_preview.

Optionally add Review & sign report button on closing board when all answers complete.

Harden complete route to require signatureImage for staff Phase 1 submit.
```

---

## Test Cases

1. Happy path: last closing answer → preview → sign → submit → reportcard (no signoff card).
2. Preview API fails → error + retry; submit not possible without signature.
3. Resume incident from dashboard at sign-off-ready → clinical preview loads.
4. Submit without signature (devtools) → API 400.
5. Back button from preview → returns to closing board without losing edits.

---

## Success Criteria

- [ ] No user-visible standalone `signoff` card in normal flow
- [ ] Submit only after signature captured on document preview
- [ ] Preview failure does not bypass signature
- [ ] Resume opens clinical preview for sign-off-ready sessions
- [ ] `npm run typecheck` passes

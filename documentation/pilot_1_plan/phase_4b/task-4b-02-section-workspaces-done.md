# 4b-02 — Section workspaces: intervention review, new intervention, autosave, optional AI

## Estimated time: 8–12 hours  
## Depends on: `PATCH /api/incidents/[id]/sections/[sectionName]` (exists), resident intervention APIs

---

## Why

`app/admin/incidents/[id]/section/[sectionName]/page.tsx` has **working** UIs for **contributing factors** and **root cause** but still needs:

1. **Intervention review** — for each resident intervention, toggle *still effective* vs *remove*; all toggled before complete (per original Task 09). Data from `GET /api/residents/[id]/interventions` (or equivalent) with `facilityId` scope.
2. **New intervention** — multi-card form; on “complete” section, **POST** new rows to the resident’s intervention list per spec (not only on-incident JSON). Align departments/types with `Intervention` type in `lib/types.ts`.
3. **Autosave** — **debounced PATCH every 30 seconds** while editing (not only on button) for all four sections; cancel timers on unmount; optional “last saved at” in UI.
4. **AI assists** (if OpenAI configured) — `suggest root cause` and (optionally) `suggest IDT questions` via thin API routes that call `lib/openai.ts` with **strict** facility+incident context (no other facilities).

---

## In scope

- Replace **InterventionStub** in the section page with a full list component (load state, error state, mark toggles, PATCH `intervention-review` with `reviewedInterventions: [{ interventionId, stillEffective, notes? }]`).
- **New intervention**: add/remove rows in local state; save drafts via PATCH; on `status: complete`, ensure each new item exists in Mongo via `POST /api/residents/[residentId]/interventions` (or batch — prefer existing patterns; **must** pass `incident.residentId`).
- **30s autosave**: shared hook e.g. `useDebouncedPhase2SectionSave` with `20000–30000` ms debounce, flushing on unmount/visibility change optional.
- **Server validation** already in sections route: extend if intervention review needs “all IDs reviewed” before complete.
- **Root cause**: optional `POST /api/incidents/[id]/intelligence` extension or new `suggest-root-cause` route returning editable text; **no** raw incident IDs from other facilities in the prompt.

## Out of scope

- Rebuilding the entire `Phase2InvestigationShell` (only link back + refresh patterns).
- Changing lock/sign-off rules (4b-04/elsewhere).

---

## Success criteria

- [ ] All four section routes usable end-to-end without 400s in happy path.
- [ ] New interventions appear in resident intervention history after complete.
- [ ] Autosave does not fire excessive PATCH spam (one request per debounce window after edits).
- [ ] `npm run typecheck` / `test` / `build` pass.

---

## Files to study

- `app/admin/incidents/[id]/section/[sectionName]/page.tsx`
- `app/api/incidents/[id]/sections/[sectionName]/route.ts`
- `app/api/residents/[id]/interventions/route.ts` (GET/POST)
- `lib/phase2-default-sections.ts` — section param mapping

---

## Implementation prompt (paste to agent)

```
You are completing WAiK phase 4b-02: Phase 2 section workspaces.

1. Read app/admin/incidents/[id]/section/[sectionName]/page.tsx and the PATCH handler app/api/incidents/[id]/sections/[sectionName]/route.ts. Implement a full "intervention-review" UI: load GET /api/residents/[residentId]/interventions with the same admin facility context as other admin fetches. For each intervention, toggle still effective vs mark for removal; map to phase2Sections.interventionReview.reviewedInterventions with interventionId strings. Enforce "mark complete" only when every intervention in the list has a decision (or document if zero interventions is allowed: match product — if zero, allow complete with a confirmation banner).

2. new-intervention section: support multiple local rows (description, department, type, startDate, notes). PATCH progress to the section route on debounce. On mark complete, POST each new item to the resident interventions API, then set section status complete in one coherent flow. Handle errors per row if one POST fails.

3. Add 30s debounced autosave for in-progress section edits (contributing factors, root cause, the two above). Reuse a small hook; clear timeouts on unmount. Show a subtle "Saved" or "Saving…" state.

4. Optional: add POST /api/incidents/[id]/suggest-root-cause (or similar) that uses lib/openai.ts, passes only this incident’s facilityId-scoped text, returns { text } for the user to accept into the textarea. Guard with isOpenAIConfigured; return 503 or friendly message if not configured.

5. Keep code style matching the repo. Run npm run typecheck && npm test && npm run build; fix all issues.
```

---

## Verification

- Unit test optional: debounce hook or pure merge of `reviewedInterventions`.
- Manual: complete all four sections in order, then hit lock preconditions in signoff (with 4b-04/05 as applicable).

# 4b-04 — Push and in-app notifications (Phase 2 events)

## Estimated time: 4–8 hours  
## Depends on: 4b-01 (IDT) optional; lock/sign-off already in API

---

## Why

Task 09 required notifications when: **all four sections complete** (ready to lock, notify DON + administrator), when **one party signs** (nudge the other role), **after lock** (notify reporting nurse), and **IDT remind** (covered in 4b-01, but centralize here if a shared helper is better).

Today, lock/ unlock write `auditTrail` but may not call **push** or `NotificationModel`. This task wires **best-effort** server-side notification creation consistent with `lib/push-service.ts` / `app/api/push/send`.

---

## In scope

- **Server-only** (route handlers or small service functions): on events below, call existing push/notification abstractions. **Never** throw 500 to the user if push fails — log and continue.
- **Events (minimum set)**:
  1. **All 4 `phase2Sections` → complete** (detect in `PATCH` sections when merging, or a shared `checkAllSectionsComplete`): notify configured DON + admin roles in facility (or specific users if product specifies).
  2. **DON signoff** recorded → nudge **administrator**; **admin sign** → nudge **DON** (if the other is missing).
  3. **POST lock** success → notify **reporting staff** (`incident.staffId` / `staff` user) that investigation is closed.
  4. **Unlock** (optional in-app to DON/admin): reason already in `auditTrail`; add push only if spec demands — default to skip to reduce noise, document the choice.
- **Idempotency**: if PATCH sections fires many times, avoid **spamming** “ready to lock” — use a flag on incident (e.g. `phase2Notifications?: { readyForLockNotifiedAt?: string }`) **or** de-dup by only firing on transition to “all complete.” Prefer a single optional field in Mongo over Redis for durability.

## Out of scope

- Full notification center UI redesign.
- Email channel (PWA only unless already in codebase).

---

## Success criteria

- [ ] “All complete” does not send duplicate push on every autosave.
- [ ] Sign-off nudges are role-correct and facility-scoped.
- [ ] `npm run typecheck` / `test` / `build` pass.

---

## Files to study

- `app/api/incidents/[id]/sections/[sectionName]/route.ts` (detection point)
- `app/api/incidents/[id]/signoff/route.ts`
- `app/api/incidents/[id]/lock/route.ts`
- `lib/push-service.ts` and `app/api/push/send/route.ts`
- `NotificationModel` usage elsewhere

---

## Implementation prompt (paste to agent)

```
You are completing WAiK phase 4b-04: push notifications for Phase 2.

1. Trace lib/push-service.ts and the POST /api/push/send route. Understand the payload and how target users are resolved.

2. In PATCH /api/incidents/[id]/sections/[sectionName], after a successful update, if all four phase2 section statuses are "complete" AND the previous state was not all complete, enqueue notifications to DON and administrator in the same facility. Implement de-duplication: e.g. set incident.phase2NotificationFlags.allSectionsCompleteNotifiedAt once, or skip if already set. Use Mongo $set in the same or follow-up updateOne.

3. In POST signoff, when a signature is added, if the other role’s signature is still missing, send one push to an appropriate user. Do not send if both already present. Map roles using UserModel queries by facilityId + roleSlug (director_of_nursing, administrator) — or use a small internal helper. Super-admin should not be required in production; handle missing users gracefully (log, no 500).

4. In POST lock, notify incident.staffName’s user id: resolve staffId to Clerk/Mongo user for push, or the API’s established pattern in other flows.

5. All notification sends must be try/catch; failures are logged, JSON responses from main routes stay success. Add minimal tests if you extract pure "should notify" functions.

6. Run npm run typecheck && npm test && npm run build; fix all issues.
```

---

## Verification

- Dev: mock push or log lines to verify single fire. Production: enable push credentials in staging and confirm one notification per event.

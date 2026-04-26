# Task 07c — Auth Makeover (Wave Background + Landing-Grade Auth UI)
## Phase: 3d — Design Unification
## Estimated Time: 2–3 hours
## Depends On: task-07b

---

## Why This Task Exists

Auth is the first “app” experience. If sign-in feels different than the landing page,
users subconsciously assume the product is stitched together.

We already have a great foundation:
- `components/ui/auth-background.tsx` (gradient + textures + wave canvas)
- `components/login-wave-animation.tsx` (ambient motion)
- `lib/clerk-appearance.ts` (customized Clerk styles)

This task applies that consistently and upgrades the auth-adjacent pages.

---

## What This Task Builds

- Use `AuthPageFrame` for all auth pages:
  - `/sign-in`, `/sign-up`, `/change-password`, `/accept-invite`, `/auth/account-pending`, `/auth/redirect`
- Ensure the auth card matches landing page “elevated card” recipe:
  - soft border, glass blur, subtle shadow, consistent radius
- Add tasteful landing-like micro-interactions:
  - hover lift on secondary buttons (where appropriate)
  - refined focus rings (already tokenized via `--ring`)
- Leverage the wave background animation for a cohesive “tech + calm” feel.

---

## Success Criteria

- [ ] All auth routes render on top of the same wave/gradient background frame
- [ ] Clerk card looks consistent with landing page cards (radius/shadow/border)
- [ ] No auth page shows a stark flat white screen (unless explicitly intended)
- [ ] Performance remains good on mobile (no jank; wave animation remains subtle)

---

## Implementation Prompt

Paste into Cursor Agent mode:

```
Unify all WAiK auth screens with the existing AuthPageFrame (wave background).

1) Wrap all auth-adjacent pages with <AuthPageFrame>:
   - sign-in, sign-up, change-password, accept-invite, account-pending, redirect/loading.
2) Align Clerk appearance card styles to the shared Card recipe from Phase 3d primitives.
3) Ensure backgrounds, textures, and waves match the landing hero palette
   (teal primary + purple accent) and remain subtle.
4) Verify reduced-motion support: if prefers-reduced-motion, stop or simplify the canvas animation.
```


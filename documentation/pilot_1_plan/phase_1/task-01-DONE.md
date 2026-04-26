# Task 01 — DONE (ClerkJS + multi-tenant auth foundation)

## Implemented

- **`@clerk/nextjs`** — already installed; `ClerkProvider` in `app/layout.tsx`, sign-in/up routes, middleware.
- **`middleware.ts`** — `clerkMiddleware` + `createRouteMatcher`: public routes include `/`, `/sign-in`, `/sign-up`, `/login` (redirect), `/auth/after-sign-in`, `/waik-demo-start`, `/offline`. `/api/push/*` is not public (task-06f). All other matched routes call `auth.protect()`. Existing API CORS behavior preserved for `/api/*`.
- **`lib/waik-roles.ts`** — `WaikRole` union, admin vs staff tier lists, `toUiRole()` for legacy UI (`"admin"` | `"staff"`), `canAccessPhase2`, `WaikPublicMetadata` shape.
- **`lib/auth.ts`** — `getCurrentUser()`, `requireRole()`, `requireFacilityAccess()`, `unauthorizedResponse` / `forbiddenResponse`, re-exports `isAdminRole` / `canAccessPhase2`.
- **`hooks/use-waik-user.ts`** — client mapping from Clerk `publicMetadata` to legacy UI role for existing pages.
- **`components/auth-guard.tsx`** — uses Clerk via `useWaikUser`; redirects to `/sign-in`.
- **`app/auth/after-sign-in/page.tsx`** — sends admin-tier roles to `/admin/dashboard`, others to `/staff/dashboard`. Set `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/after-sign-in`.
- **`app/sign-in` / `app/sign-up`** — WAiK teal `#0D7377` / dark `#0A3D40` styling on Clerk components.
- **API routes** — all `app/api/**/route.ts` handlers call `getCurrentUser()` and return `401` when unauthenticated; staff list endpoints enforce `staffId === session user` (or super-admin).
- **Removed** — `lib/auth-store.ts`, `app/api/auth/login/route.ts`, `lib/google-sheets.ts` (replaced by `lib/public-forms.ts` + updated component imports).
- **`app/login/page.tsx`** — server redirect to `/sign-in`.

## Clerk Dashboard checklist

- Set **publicMetadata** on users: `role`, `orgId`, `facilityId`, `facilityName`, `isWaikSuperAdmin` as needed.
- **Paths**: sign-in `/sign-in`, sign-up `/sign-up`, after sign-in `/auth/after-sign-in`.
- **Allowed redirect URLs**: include `http://localhost:3000/*` and production origins.

## Tests (manual)

Run the test cases in `task-01-clerk-auth.md` (unauthenticated redirect, API 401, role redirects, etc.).

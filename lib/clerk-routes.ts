/**
 * Central Clerk redirect targets. Clerk v6 uses SIGN_IN_*_REDIRECT_URL env vars;
 * NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL is legacy and may be ignored.
 */
export function getClerkPostAuthUrl(): string {
  return (
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL?.trim() ||
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL?.trim() ||
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL?.trim() ||
    "/auth/redirect"
  )
}

export function getClerkAfterSignOutUrl(): string {
  const v = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL?.trim()
  return v && v.length > 0 ? v : "/sign-in"
}

import type { CurrentUser } from "@/lib/types"

/**
 * Where to send a user after sign-in or from the marketing home “enter application” prompt.
 * Mirrors `/auth/redirect` routing so role boundaries stay consistent everywhere.
 */
export type WaikAppEntryResolution =
  | { status: "anonymous" }
  | { status: "pending_profile"; path: "/auth/account-pending" }
  | { status: "must_change_password"; path: "/change-password" }
  | {
      status: "ready"
      path: string
      workspaceLabel: string
      workspaceDescription: string
    }

export function resolveWaikApplicationEntry(
  clerkUserId: string | null | undefined,
  user: CurrentUser | null,
): WaikAppEntryResolution {
  if (!clerkUserId) {
    return { status: "anonymous" }
  }
  if (!user) {
    return { status: "pending_profile", path: "/auth/account-pending" }
  }
  if (user.mustChangePassword) {
    return { status: "must_change_password", path: "/change-password" }
  }
  if (user.isWaikSuperAdmin) {
    return {
      status: "ready",
      path: "/waik-admin",
      workspaceLabel: "WAiK Super Admin",
      workspaceDescription:
        "Continue to the Super Admin console to manage organizations, facilities, and platform configuration.",
    }
  }
  if (user.isAdminTier) {
    return {
      status: "ready",
      path: "/admin/dashboard",
      workspaceLabel: "Administrator workspace",
      workspaceDescription:
        "Continue to your facility command center to oversee incidents, residents, staff, and operational intelligence.",
    }
  }
  return {
    status: "ready",
    path: "/staff/dashboard",
    workspaceLabel: "Staff workspace",
    workspaceDescription:
      "Continue to your staff dashboard for incident reporting, assigned tasks, and day-to-day clinical workflows.",
  }
}

/** Path used by `/auth/redirect` (sign-in callback). */
export function redirectPathFromResolution(r: WaikAppEntryResolution): string {
  switch (r.status) {
    case "anonymous":
      return "/sign-in"
    case "pending_profile":
    case "must_change_password":
      return r.path
    case "ready":
      return r.path
    default:
      return "/sign-in"
  }
}

import type { CurrentUser } from "./types"

/** All Mongo user id shapes that can appear on `Incident.staffId` (seed uses business `id`, some paths use Clerk id). */
export function staffIdMatch(currentUser: CurrentUser): { staffId: string | { $in: string[] } } {
  const a = (currentUser.userId || "").trim()
  const b = (currentUser.clerkUserId || "").trim()
  if (a && b && a !== b) {
    return { staffId: { $in: [a, b] } }
  }
  if (a) return { staffId: a }
  if (b) return { staffId: b }
  return { staffId: { $in: [] } }
}

export function sameIdsForOrMatch(currentUser: CurrentUser): string[] {
  const a = (currentUser.userId || "").trim()
  const b = (currentUser.clerkUserId || "").trim()
  return a && b && a !== b ? [a, b] : a ? [a] : b ? [b] : []
}

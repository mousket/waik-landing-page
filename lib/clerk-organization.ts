import { createClerkClient } from "@clerk/backend"

const WAIK_ORG_META = "waikOrgId" as const

/** Mirrors `isAdminTierRole` for Clerk org roles — no `@/` imports (scripts use plain Node). */
const WAIK_CLERK_ORG_ADMIN_SLUGS = new Set<string>([
  "owner",
  "administrator",
  "director_of_nursing",
  "head_nurse",
])

export function clerkOrgRoleForWaikRole(roleSlug: string): "org:admin" | "org:member" {
  return WAIK_CLERK_ORG_ADMIN_SLUGS.has(roleSlug) ? "org:admin" : "org:member"
}

/**
 * Create a Clerk Organization and link the WAiK `organizationId` in publicMetadata.
 * `createdBy` is required by Clerk; use the super-admin or service actor’s `user_…` id.
 */
export async function createClerkOrganizationForWaik({
  name,
  waikOrgId,
  createdByClerkUserId,
  secretKey,
}: {
  name: string
  waikOrgId: string
  createdByClerkUserId: string
  secretKey: string
}): Promise<{ id: string }> {
  const client = createClerkClient({ secretKey })
  const res = (await client.organizations.createOrganization({
    name: name.slice(0, 256),
    createdBy: createdByClerkUserId,
    publicMetadata: { [WAIK_ORG_META]: waikOrgId } as { waikOrgId: string },
  })) as unknown
  const d = res as { id?: string; data?: { id?: string } } | { data?: { id: string } }
  const id = (res as { id?: string })?.id ?? d?.data?.id
  if (id) {
    return { id: String(id) }
  }
  throw new Error("Clerk createOrganization returned no organization id")
}

/**
 * Add a Clerk user to a Clerk org so the hosted sign-in “create organization” task is skipped
 * (user already has a membership). Default role: `org:member`.
 */
export async function addClerkOrgMembership(
  {
    organizationId,
    userId,
    role,
  }: { organizationId: string; userId: string; role: "org:admin" | "org:member" | "org:manager" },
  secretKey: string,
) {
  const client = createClerkClient({ secretKey })
  try {
    return await client.organizations.createOrganizationMembership({
      organizationId,
      userId,
      role,
    })
  } catch (err) {
    const msg = (err as { message?: string })?.message ?? String(err)
    const isDup =
      msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate")
    if (isDup) {
      return { skipped: true as const }
    }
    throw err
  }
}

export function getClerkSecretKey(): string | null {
  const s = process.env.CLERK_SECRET_KEY?.trim()
  return s && s.length > 0 ? s : null
}

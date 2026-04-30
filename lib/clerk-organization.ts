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

export function isClerkNotFoundError(err: unknown): boolean {
  const e = err as
    | { status?: number; errors?: Array<{ code?: string; message?: string }> }
    | { statusCode?: number; errors?: Array<{ code?: string; message?: string }> }
    | { message?: string }
  const status = e?.status ?? (e as { statusCode?: number } | undefined)?.statusCode
  if (status === 404) return true
  const code = e?.errors?.[0]?.code?.toLowerCase()
  if (code && (code.includes("not_found") || code.includes("resource_not_found"))) return true
  const msg = (e?.errors?.[0]?.message ?? e?.message ?? String(err)).toLowerCase()
  return msg.includes("not found") || msg.includes("resource_not_found") || msg.includes("404")
}

export function getClerkErrorStatus(err: unknown): number | null {
  const e = err as { status?: number; statusCode?: number } | null | undefined
  const s = e?.status ?? e?.statusCode
  return typeof s === "number" ? s : null
}

export function getClerkErrorDetails(err: unknown): Array<{ code?: string; message?: string }> | null {
  const e = err as { errors?: Array<{ code?: string; message?: string }> } | null | undefined
  return Array.isArray(e?.errors) ? e!.errors! : null
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

export async function findClerkOrganizationIdForWaikOrg({
  waikOrgId,
  secretKey,
}: {
  waikOrgId: string
  secretKey: string
}): Promise<string | null> {
  const client = createClerkClient({ secretKey })
  for (let off = 0; off < 500; off += 20) {
    const list = await client.organizations.getOrganizationList({ limit: 20, offset: off })
    if (!list.data?.length) break
    const found =
      (list.data as { publicMetadata?: { waikOrgId?: string }; id: string }[]).find(
        (c) => c?.publicMetadata?.[WAIK_ORG_META] === waikOrgId,
      ) ?? null
    if (found?.id) return found.id
  }
  return null
}

export async function ensureClerkOrganizationForWaikOrg({
  waikOrgId,
  name,
  secretKey,
  createdByClerkUserId,
}: {
  waikOrgId: string
  name: string
  secretKey: string
  createdByClerkUserId?: string
}): Promise<{ id: string }> {
  const existing = await findClerkOrganizationIdForWaikOrg({ waikOrgId, secretKey })
  if (existing) return { id: existing }
  const actor = createdByClerkUserId?.trim() || process.env.WAIK_CLERK_ACTOR_USER_ID?.trim()
  if (!actor) {
    throw new Error("Missing Clerk actor user id (set WAIK_CLERK_ACTOR_USER_ID)")
  }
  return await createClerkOrganizationForWaik({ name, waikOrgId, createdByClerkUserId: actor, secretKey })
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

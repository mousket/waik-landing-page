/**
 * One-off: mirror WAiK MongoDB organizations in Clerk, then add Clerk org memberships
 * for existing users so they stop seeing “Set up your organization” at sign-in.
 *
 * Usage (from repo root, with .env loaded):
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-clerk-orgs.ts
 * Optional:
 *   WAIK_ORG_ID=org-sunrise-001  — only this WAiK org id
 *   WAIK_CLERK_ACTOR_USER_ID=user_xxx — fallback `createdBy` if `createdBySuperId` is invalid (Clerk user id, not password)
 *
 * Requires: MONGODB_URI, CLERK_SECRET_KEY
 */
import { config } from "dotenv"
import { createClerkClient } from "@clerk/backend"
import { resolve } from "node:path"

import connectMongo from "../backend/src/lib/mongodb"
import OrganizationModel from "../backend/src/models/organization.model"
import UserModel from "../backend/src/models/user.model"
import {
  addClerkOrgMembership,
  clerkOrgRoleForWaikRole,
  createClerkOrganizationForWaik,
  getClerkSecretKey,
} from "../lib/clerk-organization"

config({ path: resolve(__dirname, "../.env") })
config({ path: resolve(__dirname, "../.env.local") })

function actorId(org: { createdBySuperId: string }): string {
  const f = process.env.WAIK_CLERK_ACTOR_USER_ID?.trim()
  if (f) {
    return f
  }
  return org.createdBySuperId
}

async function main() {
  const sk = getClerkSecretKey()
  if (!sk) {
    throw new Error("Set CLERK_SECRET_KEY in .env")
  }

  await connectMongo()
  const only = process.env.WAIK_ORG_ID?.trim()
  const noClerk: Record<string, unknown> = {
    $or: [
      { clerkOrganizationId: { $exists: false } },
      { clerkOrganizationId: null },
      { clerkOrganizationId: "" },
    ],
  }
  const orgs = await OrganizationModel.find(only ? { id: only, ...noClerk } : { ...noClerk })
    .lean()
    .exec()

  if (orgs.length === 0) {
    console.log("No organizations need Clerk backfill (or WAIK_ORG_ID not found / already synced).")
    return
  }

  for (const raw of orgs) {
    const o = raw as unknown as { id: string; name: string; createdBySuperId: string }
    console.log(`\n== ${o.id} — ${o.name} ==`)
    let clerkOrgId: string
    try {
      const created = await createClerkOrganizationForWaik({
        name: o.name,
        waikOrgId: o.id,
        createdByClerkUserId: actorId(o as { createdBySuperId: string }),
        secretKey: sk,
      })
      clerkOrgId = created.id
    } catch (e) {
      console.error("  createOrganization failed, scanning Clerk orgs for waikOrgId", o.id, e)
      const client = createClerkClient({ secretKey: sk })
      let found: { id: string } | null = null
      for (let off = 0; off < 500 && !found; off += 20) {
        const list = await client.organizations.getOrganizationList({ limit: 20, offset: off })
        if (!list.data?.length) {
          break
        }
        found =
          (list.data as { publicMetadata?: { waikOrgId?: string }; id: string }[]).find(
            (c) => c?.publicMetadata?.waikOrgId === o.id,
          ) ?? null
      }
      if (found?.id) {
        console.log("  linked existing Clerk org (waikOrgId in metadata):", found.id)
        clerkOrgId = found.id
      } else {
        continue
      }
    }

    await OrganizationModel.updateOne({ id: o.id }, { $set: { clerkOrganizationId: clerkOrgId } }).exec()
    console.log("  stored clerkOrganizationId:", clerkOrgId)

    const users = await UserModel.find({ organizationId: o.id, clerkUserId: { $exists: true, $ne: null } })
      .lean()
      .exec()
    for (const u of users) {
      const uu = u as unknown as { clerkUserId: string; roleSlug: string; id: string; email: string }
      try {
        await addClerkOrgMembership(
          {
            organizationId: clerkOrgId,
            userId: uu.clerkUserId,
            role: clerkOrgRoleForWaikRole(uu.roleSlug),
          },
          sk,
        )
        console.log(`  membership: ${uu.email} (${uu.roleSlug})`)
      } catch (err) {
        console.warn(`  skip ${uu.email}:`, err)
      }
    }
  }
  console.log("\nDone.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

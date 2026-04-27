/**
 * Set Mongo `clerkOrganizationId` for a WAiK org (e.g. link Sunrise to your Clerk `org_…`).
 *
 *   WAIK_ORG_ID=org-sunrise-001 WAIK_CLERK_ORG_ID=org_xxx npm run set-organization-clerk-id
 */
import { resolve } from "node:path"
import { config } from "dotenv"

import connectMongo from "../backend/src/lib/mongodb"
import OrganizationModel from "../backend/src/models/organization.model"

config({ path: resolve(process.cwd(), ".env") })
config({ path: resolve(process.cwd(), ".env.local") })

async function main() {
  const orgId = process.env.WAIK_ORG_ID?.trim() || "org-sunrise-001"
  const clerkId = process.env.WAIK_CLERK_ORG_ID?.trim()
  if (!clerkId) {
    throw new Error("Set WAIK_CLERK_ORG_ID to the Clerk org id (e.g. org_3CuC...)")
  }
  await connectMongo()
  const r = await OrganizationModel.updateOne({ id: orgId }, { $set: { clerkOrganizationId: clerkId } }).exec()
  if (r.matchedCount === 0) {
    console.error(`No organization with id ${orgId}`)
    process.exit(1)
  }
  console.log(`Updated ${orgId} → clerkOrganizationId = ${clerkId}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

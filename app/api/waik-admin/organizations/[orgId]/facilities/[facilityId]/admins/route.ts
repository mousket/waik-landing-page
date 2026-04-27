import { NextResponse, type NextRequest } from "next/server"
import { createClerkClient } from "@clerk/backend"
import connectMongo from "@/backend/src/lib/mongodb"
import FacilityModel from "@/backend/src/models/facility.model"
import OrganizationModel from "@/backend/src/models/organization.model"
import UserModel from "@/backend/src/models/user.model"
import { addClerkOrgMembership, getClerkSecretKey } from "@/lib/clerk-organization"
import { sendWelcomeEmail } from "@/lib/send-welcome-email"
import { requireWaikSuperAdmin } from "@/lib/waik-admin-api"
import { generateTempPassword, generateUserId } from "@/lib/waik-admin-utils"
import { leanOne } from "@/lib/mongoose-lean"
import type { FacilityDocument } from "@/backend/src/models/facility.model"
import type { OrganizationDocument } from "@/backend/src/models/organization.model"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; facilityId: string }> },
) {
  const gate = await requireWaikSuperAdmin()
  if (gate instanceof NextResponse) return gate

  const { orgId, facilityId } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : ""
  const lastName = typeof b.lastName === "string" ? b.lastName.trim() : ""
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : ""
  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "firstName, lastName, and email are required" }, { status: 400 })
  }

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  await connectMongo()

  const org = leanOne<OrganizationDocument>(await OrganizationModel.findOne({ id: orgId }).lean().exec())
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const facility = leanOne<FacilityDocument>(
    await FacilityModel.findOne({ id: facilityId, organizationId: orgId }).lean().exec(),
  )
  if (!facility) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const clerk = createClerkClient({ secretKey })
  const listed = await clerk.users.getUserList({ emailAddress: [email], limit: 5 })
  if (listed.data.length > 0) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
  }

  const tempPassword = generateTempPassword()

  const publicMetadata = {
    role: "administrator" as const,
    facilityId: facility.id,
    orgId,
    organizationId: orgId,
    facilityName: facility.name,
    isWaikSuperAdmin: false,
    mustChangePassword: true,
  }

  let clerkUserId: string
  try {
    const created = await clerk.users.createUser({
      firstName,
      lastName,
      emailAddress: [email],
      password: tempPassword,
      publicMetadata,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
    })
    clerkUserId = created.id
  } catch (err) {
    const retry = await clerk.users.getUserList({ emailAddress: [email], limit: 5 })
    if (retry.data[0]?.id) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }
    console.error("[waik-admin] Clerk createUser failed:", err)
    return NextResponse.json({ error: "Could not create user account" }, { status: 500 })
  }

  const userDoc = {
    id: generateUserId(email),
    clerkUserId,
    firstName,
    lastName,
    email,
    roleSlug: "administrator",
    facilityId: facility.id,
    organizationId: orgId,
    isWaikSuperAdmin: false,
    isActive: true,
    mustChangePassword: true,
    deviceType: "personal" as const,
    name: `${firstName} ${lastName}`.trim(),
  }

  try {
    await UserModel.create(userDoc)
  } catch (mongoErr) {
    try {
      await clerk.users.deleteUser(clerkUserId)
    } catch {
      /* best effort */
    }
    console.error("[waik-admin] Mongo user create failed:", mongoErr)
    return NextResponse.json({ error: "Could not save user profile" }, { status: 500 })
  }

  const sk2 = getClerkSecretKey()
  const coid = org.clerkOrganizationId
  if (coid && sk2) {
    try {
      await addClerkOrgMembership(
        { organizationId: coid, userId: clerkUserId, role: "org:admin" },
        sk2,
      )
    } catch (e) {
      console.error("[waik-admin] Clerk org membership failed:", e)
      try {
        await UserModel.deleteOne({ id: userDoc.id })
      } catch {
        /* best effort */
      }
      try {
        await clerk.users.deleteUser(clerkUserId)
      } catch {
        /* best effort */
      }
      return NextResponse.json(
        { error: "User was not added to the Clerk organization. Run the Clerk backfill, then try again." },
        { status: 502 },
      )
    }
  } else if (!coid) {
    console.warn(
      `[waik-admin] Organization ${orgId} has no clerkOrganizationId — run scripts/backfill-clerk-orgs.ts`,
    )
  }

  try {
    await sendWelcomeEmail({
      to: email,
      firstName,
      facilityName: facility.name,
      tempPassword,
    })
  } catch (emailErr) {
    console.error("[waik-admin] Welcome email failed:", emailErr)
    return NextResponse.json(
      {
        error: "User was created but the welcome email could not be sent. Configure RESEND_API_KEY and EMAIL_FROM.",
        partial: true,
        clerkUserId,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    success: true,
    message: "Administrator created and welcome email sent",
    user: { id: userDoc.id, email, firstName, lastName },
  })
}

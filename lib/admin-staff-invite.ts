import { createClerkClient } from "@clerk/backend"
import connectMongo from "@/backend/src/lib/mongodb"
import OrganizationModel from "@/backend/src/models/organization.model"
import RoleModel from "@/backend/src/models/role.model"
import UserModel from "@/backend/src/models/user.model"
import {
  addClerkOrgMembership,
  clerkOrgRoleForWaikRole,
  getClerkSecretKey,
} from "@/lib/clerk-organization"
import { sendStaffWelcomeEmail } from "@/lib/send-welcome-email"
import { isRoleAssignableByInviter } from "@/lib/role-assignment-permissions"
import { generateTempPassword, generateUserId } from "@/lib/waik-admin-utils"
import type { WaikRoleSlug } from "@/lib/waik-roles"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase())
}

export type InviteStaffSuccess = {
  ok: true
  clerkUserId: string
  userMongoId: string
  tempPassword: string
}

export type InviteStaffFailure = {
  ok: false
  code: "duplicate" | "invalid_role" | "clerk_error" | "email_config"
  message: string
}

export type InviteStaffResult = InviteStaffSuccess | InviteStaffFailure

export async function inviteStaffMember(opts: {
  facilityId: string
  organizationId: string
  facilityName: string
  firstName: string
  lastName: string
  email: string
  roleSlug: string
  inviterName: string
  inviterRole: string
  inviterRoleSlug: string
  invitedByUserId: string
  sendWelcomeEmail: boolean
}): Promise<InviteStaffResult> {
  const email = opts.email.trim().toLowerCase()
  const firstName = (opts.firstName ?? "").trim() || "Invited"
  const lastName = (opts.lastName ?? "").trim() || "User"
  if (!isValidEmail(email)) {
    return { ok: false, code: "invalid_role", message: "Invalid email address" }
  }

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    return { ok: false, code: "clerk_error", message: "Server misconfiguration" }
  }

  await connectMongo()

  const roleDoc = await RoleModel.findOne({ slug: opts.roleSlug }).lean().exec()
  if (!roleDoc || Array.isArray(roleDoc)) {
    return { ok: false, code: "invalid_role", message: "Unknown role" }
  }

  if (!isRoleAssignableByInviter(opts.inviterRoleSlug, opts.roleSlug)) {
    return { ok: false, code: "invalid_role", message: "You cannot assign this role" }
  }

  const existingMongo = await UserModel.findOne({ email, facilityId: opts.facilityId }).lean().exec()
  if (existingMongo) {
    return { ok: false, code: "duplicate", message: "A user with this email already exists for this facility" }
  }

  const clerk = createClerkClient({ secretKey })
  const listed = await clerk.users.getUserList({ emailAddress: [email], limit: 5 })
  if (listed.data.length > 0) {
    return { ok: false, code: "duplicate", message: "A user with this email already exists" }
  }

  const tempPassword = generateTempPassword()
  const roleSlug = opts.roleSlug as WaikRoleSlug

  const publicMetadata = {
    role: roleSlug,
    roleSlug,
    facilityId: opts.facilityId,
    organizationId: opts.organizationId,
    orgId: opts.organizationId,
    facilityName: opts.facilityName,
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
      return { ok: false, code: "duplicate", message: "A user with this email already exists" }
    }
    console.error("[admin-staff-invite] Clerk createUser failed:", err)
    return { ok: false, code: "clerk_error", message: "Could not create user account" }
  }

  const userDoc = {
    id: generateUserId(email),
    clerkUserId,
    firstName,
    lastName,
    email,
    roleSlug: opts.roleSlug,
    facilityId: opts.facilityId,
    organizationId: opts.organizationId,
    isWaikSuperAdmin: false,
    isActive: true,
    mustChangePassword: true,
    deviceType: "personal" as const,
    name: `${firstName} ${lastName}`.trim(),
    invitedByUserId: opts.invitedByUserId,
    invitedByName: opts.inviterName,
  }

  try {
    await UserModel.create(userDoc)
  } catch (mongoErr) {
    try {
      await clerk.users.deleteUser(clerkUserId)
    } catch {
      /* best effort */
    }
    console.error("[admin-staff-invite] Mongo user create failed:", mongoErr)
    return { ok: false, code: "clerk_error", message: "Could not save user profile" }
  }

  const sk = getClerkSecretKey()
  if (sk) {
    const org = await OrganizationModel.findOne({ id: opts.organizationId }).lean().exec()
    const clerkOrgId = org && !Array.isArray(org) ? (org as { clerkOrganizationId?: string }).clerkOrganizationId : undefined
    if (clerkOrgId) {
      try {
        await addClerkOrgMembership(
          {
            organizationId: clerkOrgId,
            userId: clerkUserId,
            role: clerkOrgRoleForWaikRole(opts.roleSlug),
          },
          sk,
        )
      } catch (e) {
        console.error("[admin-staff-invite] Clerk org membership failed:", e)
        try {
          await UserModel.deleteOne({ id: userDoc.id }).exec()
        } catch {
          /* best effort */
        }
        try {
          await clerk.users.deleteUser(clerkUserId)
        } catch {
          /* best effort */
        }
        return {
          ok: false,
          code: "clerk_error",
          message: "User was not added to the Clerk organization. Re-run the Clerk org backfill, then try again.",
        }
      }
    } else {
      console.warn(
        `[admin-staff-invite] Organization ${opts.organizationId} has no clerkOrganizationId — run scripts/backfill-clerk-orgs.ts for Clerk sync.`,
      )
    }
  }

  if (opts.sendWelcomeEmail) {
    try {
      await sendStaffWelcomeEmail({
        to: email,
        firstName,
        facilityName: opts.facilityName,
        inviterName: opts.inviterName,
        inviterRole: opts.inviterRole,
        tempPassword,
      })
    } catch (emailErr) {
      console.error("[admin-staff-invite] Staff welcome email failed:", emailErr)
      return {
        ok: false,
        code: "email_config",
        message: "User was created but the welcome email could not be sent. Configure RESEND_API_KEY and EMAIL_FROM.",
      }
    }
  }

  return { ok: true, clerkUserId, userMongoId: userDoc.id, tempPassword }
}

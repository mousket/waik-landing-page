import path from "path"
import dotenv from "dotenv"

const rootEnv = path.resolve(process.cwd(), ".env")
const localEnv = path.resolve(process.cwd(), ".env.local")
dotenv.config({ path: rootEnv })
dotenv.config({ path: localEnv })

import connectMongo from "../backend/src/lib/mongodb"
import RoleModel from "../backend/src/models/role.model"

const roles = [
  {
    slug: "owner",
    name: "Owner",
    isAdminTier: true,
    canAccessPhase2: true,
    canInviteStaff: true,
    canManageResidents: true,
    permissions: ["*"],
  },
  {
    slug: "administrator",
    name: "Administrator",
    isAdminTier: true,
    canAccessPhase2: true,
    canInviteStaff: true,
    canManageResidents: true,
    permissions: [
      "incidents:*",
      "assessments:*",
      "residents:*",
      "staff:*",
      "settings:*",
      "intelligence:*",
      "phase2:*",
    ],
  },
  {
    slug: "director_of_nursing",
    name: "Director of Nursing",
    isAdminTier: true,
    canAccessPhase2: true,
    canInviteStaff: false,
    canManageResidents: true,
    permissions: ["incidents:*", "assessments:*", "residents:read", "phase2:*", "intelligence:*"],
  },
  {
    slug: "head_nurse",
    name: "Head Nurse",
    isAdminTier: true,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:*", "assessments:*", "residents:read", "intelligence:own"],
  },
  {
    slug: "rn",
    name: "Registered Nurse",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: [
      "incidents:create",
      "incidents:own",
      "assessments:create",
      "assessments:own",
      "intelligence:own",
    ],
  },
  {
    slug: "lpn",
    name: "Licensed Practical Nurse",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: [
      "incidents:create",
      "incidents:own",
      "assessments:create",
      "assessments:own",
      "intelligence:own",
    ],
  },
  {
    slug: "cna",
    name: "Certified Nursing Assistant",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:create", "incidents:own", "intelligence:own"],
  },
  {
    slug: "staff",
    name: "Staff",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:create", "incidents:own", "intelligence:own"],
  },
  {
    slug: "physical_therapist",
    name: "Physical Therapist",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["incidents:own", "assessments:create", "assessments:own", "intelligence:own"],
  },
  {
    slug: "dietician",
    name: "Dietician",
    isAdminTier: false,
    canAccessPhase2: false,
    canInviteStaff: false,
    canManageResidents: false,
    permissions: ["assessments:create", "assessments:own", "intelligence:own"],
  },
] as const

async function seed() {
  await connectMongo()

  for (const r of roles) {
    const id = `role-${r.slug}`
    await RoleModel.updateOne(
      { slug: r.slug },
      {
        $set: {
          id,
          name: r.name,
          slug: r.slug,
          permissions: [...r.permissions],
          isAdminTier: r.isAdminTier,
          canAccessPhase2: r.canAccessPhase2,
          canInviteStaff: r.canInviteStaff,
          canManageResidents: r.canManageResidents,
          canViewIntelligence: true,
          facilityScoped: true,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    )
  }

  const count = await RoleModel.countDocuments({})
  console.log(`seed:roles complete — ${count} role document(s) in collection.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("seed:roles failed:", err)
  process.exit(1)
})

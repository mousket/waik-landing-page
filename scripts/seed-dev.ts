/**
 * Development seed: organization, facility, Clerk + Mongo staff, residents,
 * incidents, interventions, assessments (see documentation/pilot_1_plan/phase_0.7/task-00j-seed-data-spec.md).
 *
 * Requires: DATABASE_URL, MONGODB_DB_NAME, CLERK_SECRET_KEY, SEED_CLERK_PASSWORD (optional),
 * and super-admin gerard@waik.care for createdBySuperId (or falls back to "seed-script").
 */
import path from "path"
import dotenv from "dotenv"

const rootEnv = path.resolve(process.cwd(), ".env")
const localEnv = path.resolve(process.cwd(), ".env.local")
dotenv.config({ path: rootEnv })
dotenv.config({ path: localEnv })

import mongoose from "mongoose"
import { createClerkClient } from "@clerk/backend"
import connectMongo from "../backend/src/lib/mongodb"
import OrganizationModel from "../backend/src/models/organization.model"
import FacilityModel from "../backend/src/models/facility.model"
import UserModel from "../backend/src/models/user.model"
import ResidentModel from "../backend/src/models/resident.model"
import IncidentModel from "../backend/src/models/incident.model"
import InterventionModel from "../backend/src/models/intervention.model"
import AssessmentModel from "../backend/src/models/assessment.model"

const ORG_ID = "org-sunrise-001"
const FACILITY_ID = "fac-sunrise-mpls-001"
const SEED_PASSWORD = process.env.SEED_CLERK_PASSWORD || "WaiK@Seed2026!"

const DECLARATION =
  "I certify this investigation report is complete and accurate to the best of my knowledge."

function dateYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function main() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required for seed:dev")
  }

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
  const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000)
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000)
  const yearsAgo = (n: number) => new Date(now.getTime() - n * 365 * 24 * 60 * 60 * 1000)

  console.log("WAiK Development Seed Script")
  console.log("══════════════════════════════")

  await connectMongo()
  // Legacy index from when QuestionSchema had unique: true on id (invalid for embedded arrays).
  try {
    await mongoose.connection.collection("incidents").dropIndex("questions.id_1")
  } catch {
    // Index absent or already dropped
  }
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const gerardDoc = await UserModel.findOne({ email: "gerard@waik.care" }).exec()
  const createdBySuperId = gerardDoc?.id ?? "seed-script"

  await seedOrganization(createdBySuperId)
  await seedFacility(daysAgo)
  await seedStaffUsers(clerk, now, daysAgo, hoursAgo)
  await seedResidents(daysAgo, yearsAgo)
  await seedIncidents({
    now,
    daysAgo,
    hoursAgo,
    daysFromNow,
  })
  await seedInterventions(daysAgo)
  await seedAssessments(daysAgo, daysFromNow)

  console.log("\n══════════════════════════════")
  console.log("Seed complete. WAiK development database is ready.")
  console.log("")
  console.log("Sign in as any seed user with password: WaiK@Seed2026!")
  console.log("  Maria Torres (RN):        m.torres@sunrisemn.com")
  console.log("  Dr. Sarah Kim (DON):      s.kim@sunrisemn.com")
  console.log("  Patricia Walsh (Admin):   p.walsh@sunrisemn.com")

  await mongoose.disconnect()
  process.exit(0)
}

async function seedOrganization(createdBySuperId: string) {
  console.log("\n📁 Organization")
  const existing = await OrganizationModel.findOne({ id: ORG_ID }).exec()
  if (existing) {
    console.log("  Sunrise Senior Living already exists — skipping")
    return
  }
  await OrganizationModel.create({
    id: ORG_ID,
    name: "Sunrise Senior Living Minnesota",
    type: "independent",
    plan: "pilot",
    primaryContact: {
      name: "Patricia Walsh",
      email: "p.walsh@sunrisemn.com",
      phone: "612-555-0100",
    },
    createdBySuperId,
    isActive: true,
  })
  console.log("  ✓ Created: Sunrise Senior Living Minnesota")
}

async function seedFacility(daysAgo: (n: number) => Date) {
  console.log("\n🏢 Facility")
  const existing = await FacilityModel.findOne({ id: FACILITY_ID }).exec()
  if (existing) {
    console.log("  Sunrise Minneapolis already exists — skipping")
    return
  }
  await FacilityModel.create({
    id: FACILITY_ID,
    organizationId: ORG_ID,
    name: "Sunrise Minneapolis — Uptown",
    type: "alf",
    state: "MN",
    bedCount: 85,
    plan: "pilot",
    phaseMode: "two_phase",
    onboardingDate: daysAgo(30),
    primaryContact: {
      name: "Patricia Walsh",
      email: "p.walsh@sunrisemn.com",
      phone: "612-555-0100",
    },
    reportingConfig: { mandatedReportingWindowHours: 2 },
    completionThresholds: {
      fall: 75,
      medication_error: 80,
      resident_conflict: 70,
      wound_injury: 80,
      abuse_neglect: 90,
    },
    units: ["Wing A — East", "Wing B — West", "Memory Care Unit", "Skilled Nursing"],
    isActive: true,
  })
  console.log("  ✓ Created: Sunrise Minneapolis — Uptown")
}

type StaffDef = {
  id: string
  firstName: string
  lastName: string
  email: string
  roleSlug: string
  deviceType: "personal" | "work"
  lastLoginAt: Date
  selectedUnit?: string
  selectedUnitDate?: string | null
}

const STAFF: StaffDef[] = [
  {
    id: "user-admin-001",
    firstName: "Patricia",
    lastName: "Walsh",
    email: "p.walsh@sunrisemn.com",
    roleSlug: "administrator",
    deviceType: "work",
    lastLoginAt: new Date(),
  },
  {
    id: "user-don-001",
    firstName: "Sarah",
    lastName: "Kim",
    email: "s.kim@sunrisemn.com",
    roleSlug: "director_of_nursing",
    deviceType: "work",
    lastLoginAt: new Date(),
  },
  {
    id: "user-hn-001",
    firstName: "James",
    lastName: "Wilson",
    email: "j.wilson@sunrisemn.com",
    roleSlug: "head_nurse",
    deviceType: "work",
    lastLoginAt: new Date(),
  },
  {
    id: "user-rn-001",
    firstName: "Maria",
    lastName: "Torres",
    email: "m.torres@sunrisemn.com",
    roleSlug: "rn",
    deviceType: "personal",
    lastLoginAt: new Date(),
    selectedUnit: "Wing A — East",
    selectedUnitDate: null,
  },
  {
    id: "user-rn-002",
    firstName: "DeShawn",
    lastName: "Carter",
    email: "d.carter@sunrisemn.com",
    roleSlug: "rn",
    deviceType: "personal",
    lastLoginAt: new Date(),
  },
  {
    id: "user-cna-001",
    firstName: "Linda",
    lastName: "Osei",
    email: "l.osei@sunrisemn.com",
    roleSlug: "cna",
    deviceType: "personal",
    lastLoginAt: new Date(),
  },
  {
    id: "user-pt-001",
    firstName: "Kevin",
    lastName: "Park",
    email: "k.park@sunrisemn.com",
    roleSlug: "physical_therapist",
    deviceType: "work",
    lastLoginAt: new Date(),
  },
  {
    id: "user-diet-001",
    firstName: "Amara",
    lastName: "Diallo",
    email: "a.diallo@sunrisemn.com",
    roleSlug: "dietician",
    deviceType: "personal",
    lastLoginAt: new Date(),
  },
]

async function seedStaffUsers(
  clerk: ReturnType<typeof createClerkClient>,
  now: Date,
  daysAgo: (n: number) => Date,
  hoursAgo: (n: number) => Date,
) {
  console.log("\n👥 Staff Users")

  const todayYmd = dateYmd(now)

  for (const def of STAFF) {
    const lastLogin =
      def.id === "user-admin-001"
        ? daysAgo(2)
        : def.id === "user-don-001"
          ? daysAgo(1)
          : def.id === "user-hn-001"
            ? daysAgo(3)
            : def.id === "user-rn-001"
              ? hoursAgo(6)
              : def.id === "user-rn-002"
                ? daysAgo(1)
                : def.id === "user-cna-001"
                  ? hoursAgo(4)
                  : def.id === "user-pt-001"
                    ? daysAgo(2)
                    : daysAgo(1)

    const selectedUnitDate = def.id === "user-rn-001" ? todayYmd : def.selectedUnitDate ?? undefined

    const existingMongo = await UserModel.findOne({ id: def.id }).exec()
    if (existingMongo) {
      console.log(`  ${def.firstName} ${def.lastName} already exists — skipping`)
      continue
    }

    const normalized = def.email.toLowerCase()
    const listed = await clerk.users.getUserList({ emailAddress: [normalized], limit: 10 })
    let clerkUserId: string

    if (listed.totalCount > 0 && listed.data[0]?.id) {
      clerkUserId = listed.data[0].id
      await clerk.users.updateUser(clerkUserId, {
        banned: false,
        firstName: def.firstName,
        lastName: def.lastName,
        publicMetadata: {
          role: def.roleSlug,
          roleSlug: def.roleSlug,
          facilityId: FACILITY_ID,
          organizationId: ORG_ID,
          facilityName: "Sunrise Minneapolis — Uptown",
          isWaikSuperAdmin: false,
        },
      } as never)
    } else {
      const created = await clerk.users.createUser({
        firstName: def.firstName,
        lastName: def.lastName,
        emailAddress: [normalized],
        password: SEED_PASSWORD,
        publicMetadata: {
          role: def.roleSlug,
          roleSlug: def.roleSlug,
          facilityId: FACILITY_ID,
          organizationId: ORG_ID,
          facilityName: "Sunrise Minneapolis — Uptown",
          isWaikSuperAdmin: false,
        },
        skipPasswordChecks: false,
      })
      clerkUserId = created.id
    }

    await UserModel.create({
      id: def.id,
      clerkUserId,
      firstName: def.firstName,
      lastName: def.lastName,
      email: normalized,
      roleSlug: def.roleSlug,
      facilityId: FACILITY_ID,
      organizationId: ORG_ID,
      isWaikSuperAdmin: false,
      isActive: true,
      mustChangePassword: false,
      deviceType: def.deviceType,
      lastLoginAt: lastLogin,
      selectedUnit: def.selectedUnit,
      selectedUnitDate: selectedUnitDate ?? undefined,
    })

    console.log(`  ✓ Created: ${def.firstName} ${def.lastName} (${def.roleSlug})`)
  }
}

async function seedResidents(
  daysAgo: (n: number) => Date,
  yearsAgo: (n: number) => Date,
) {
  console.log("\n🧑 Residents")

  const rows = [
    {
      id: "res-001",
      firstName: "Margaret",
      lastName: "Chen",
      roomNumber: "102",
      wing: "Memory Care Unit",
      careLevel: "memory_care" as const,
      dateOfBirth: yearsAgo(84),
      admissionDate: daysAgo(425),
      primaryDiagnosis: "Moderate Alzheimer's disease",
      secondaryDiagnoses: ["Osteoporosis", "Hypertension"],
      primaryPhysician: "Dr. Anita Patel",
    },
    {
      id: "res-002",
      firstName: "Robert",
      lastName: "Johnson",
      roomNumber: "204",
      wing: "Skilled Nursing",
      careLevel: "skilled_nursing" as const,
      dateOfBirth: yearsAgo(78),
      admissionDate: daysAgo(182),
      primaryDiagnosis: "COPD with acute exacerbation",
      secondaryDiagnoses: ["Type 2 Diabetes", "Peripheral neuropathy"],
      primaryPhysician: "Dr. Marcus Webb",
    },
    {
      id: "res-003",
      firstName: "Dorothy",
      lastName: "Martinez",
      roomNumber: "306",
      wing: "Wing A — East",
      careLevel: "assisted" as const,
      dateOfBirth: yearsAgo(91),
      admissionDate: daysAgo(730),
      primaryDiagnosis: "Mild vascular dementia",
      secondaryDiagnoses: ["Atrial fibrillation", "Arthritis"],
      primaryPhysician: "Dr. Anita Patel",
    },
    {
      id: "res-004",
      firstName: "James",
      lastName: "Okafor",
      roomNumber: "411",
      wing: "Wing B — West",
      careLevel: "skilled_nursing" as const,
      dateOfBirth: yearsAgo(67),
      admissionDate: daysAgo(90),
      primaryDiagnosis: "CVA — left hemisphere stroke",
      secondaryDiagnoses: ["Dysphagia", "Depression", "Hypertension"],
      primaryPhysician: "Dr. Marcus Webb",
    },
    {
      id: "res-005",
      firstName: "Helen",
      lastName: "Thompson",
      roomNumber: "515",
      wing: "Skilled Nursing",
      careLevel: "skilled_nursing" as const,
      dateOfBirth: yearsAgo(88),
      admissionDate: daysAgo(334),
      primaryDiagnosis: "Congestive heart failure",
      secondaryDiagnoses: ["Fall risk — high", "Chronic kidney disease stage 3"],
      primaryPhysician: "Dr. Anita Patel",
    },
  ]

  for (const r of rows) {
    const existing = await ResidentModel.findOne({ id: r.id }).exec()
    if (existing) {
      console.log(`  ${r.firstName} ${r.lastName} — Room ${r.roomNumber} already exists — skipping`)
      continue
    }
    await ResidentModel.create({
      id: r.id,
      facilityId: FACILITY_ID,
      organizationId: ORG_ID,
      firstName: r.firstName,
      lastName: r.lastName,
      roomNumber: r.roomNumber,
      wing: r.wing,
      careLevel: r.careLevel,
      dateOfBirth: r.dateOfBirth,
      admissionDate: r.admissionDate,
      primaryDiagnosis: r.primaryDiagnosis,
      secondaryDiagnoses: r.secondaryDiagnoses,
      primaryPhysician: r.primaryPhysician,
      status: "active",
    })
    console.log(`  ✓ Created: ${r.firstName} ${r.lastName} — Room ${r.roomNumber}`)
  }
}

type TimeHelpers = {
  now: Date
  daysAgo: (n: number) => Date
  hoursAgo: (n: number) => Date
  daysFromNow: (n: number) => Date
}

function closedSignatures(signedAt: Date) {
  return {
    don: {
      signedBy: "user-don-001",
      signedByName: "Dr. Sarah Kim",
      signedAt,
      role: "don",
      declaration: DECLARATION,
    },
    admin: {
      signedBy: "user-admin-001",
      signedByName: "Patricia Walsh",
      signedAt,
      role: "admin",
      declaration: DECLARATION,
    },
  }
}

async function seedIncidents(t: TimeHelpers) {
  const { now, daysAgo, hoursAgo } = t
  console.log("\n📋 Incidents")

  const incidentRows: Array<Record<string, unknown>> = [
    {
      id: "inc-001",
      label: "INC-001 — Room 102 Fall (phase_1_in_progress, 42%)",
      residentId: "res-001",
      residentName: "Margaret Chen",
      residentRoom: "102",
      incidentType: "fall",
      location: "Bathroom — beside toilet",
      incidentDate: now,
      incidentTime: "06:15",
      reportedById: "user-cna-001",
      reportedByName: "Linda Osei",
      reportedByRole: "cna",
      hasInjury: false,
      witnessesPresent: false,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "medium",
      startedAt: hoursAgo(5),
      completenessScore: 42,
      completenessAtTier1Complete: 38,
      tier2QuestionsGenerated: 12,
      questionsAnswered: 4,
      questionsDeferred: 2,
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-002",
      label: "INC-002 — Room 306 Medication (phase_1_in_progress, 67%)",
      residentId: "res-003",
      residentName: "Dorothy Martinez",
      residentRoom: "306",
      incidentType: "medication_error",
      location: "Room 306",
      incidentDate: now,
      incidentTime: "08:30",
      reportedById: "user-rn-002",
      reportedByName: "DeShawn Carter",
      reportedByRole: "rn",
      hasInjury: false,
      witnessesPresent: true,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "medium",
      startedAt: hoursAgo(3),
      completenessScore: 67,
      tier2QuestionsGenerated: 8,
      questionsAnswered: 5,
      questionsDeferred: 1,
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-003",
      label: "INC-003 — Room 515 Fall (phase_1_in_progress, 88%)",
      residentId: "res-005",
      residentName: "Helen Thompson",
      residentRoom: "515",
      incidentType: "fall",
      location: "Hallway near nursing station",
      incidentDate: now,
      incidentTime: "11:45",
      reportedById: "user-rn-001",
      reportedByName: "Maria Torres",
      reportedByRole: "rn",
      hasInjury: true,
      injuryDescription: "Small abrasion on left knee — skin tear",
      witnessesPresent: true,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "urgent",
      startedAt: hoursAgo(1),
      completenessScore: 88,
      tier2QuestionsGenerated: 6,
      questionsAnswered: 5,
      questionsDeferred: 0,
      redFlags: { hasInjury: true, carePlanViolated: false, notificationSentToAdmin: true },
    },
    {
      id: "inc-004",
      label: "INC-004 — Room 204 Fall (phase_1_complete, 82%)",
      residentId: "res-002",
      residentName: "Robert Johnson",
      residentRoom: "204",
      incidentType: "fall",
      location: "Room 204 — bedside",
      incidentDate: daysAgo(1),
      incidentTime: "22:15",
      reportedById: "user-rn-001",
      reportedByName: "Maria Torres",
      reportedByRole: "rn",
      hasInjury: true,
      injuryDescription: "Hip pain reported — no visible bruising",
      witnessesPresent: false,
      phase: "phase_1_complete",
      status: "pending-review",
      priority: "high",
      startedAt: hoursAgo(14),
      phase1SignedAt: hoursAgo(5),
      completenessAtSignoff: 82,
      completenessScore: 82,
      redFlags: { hasInjury: true, carePlanViolated: false, notificationSentToAdmin: true },
    },
    {
      id: "inc-005",
      label: "INC-005 — Room 411 Conflict (phase_1_complete, 76%)",
      residentId: "res-004",
      residentName: "James Okafor",
      residentRoom: "411",
      incidentType: "resident_conflict",
      location: "Dining Room",
      incidentDate: daysAgo(1),
      incidentTime: "12:30",
      reportedById: "user-rn-002",
      reportedByName: "DeShawn Carter",
      reportedByRole: "rn",
      hasInjury: false,
      witnessesPresent: true,
      phase: "phase_1_complete",
      status: "pending-review",
      priority: "medium",
      startedAt: hoursAgo(26),
      phase1SignedAt: hoursAgo(3),
      completenessAtSignoff: 76,
      completenessScore: 76,
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-006",
      label: "INC-006 — Room 204 Fall (phase_2_in_progress, 82%)",
      residentId: "res-002",
      residentName: "Robert Johnson",
      residentRoom: "204",
      incidentType: "fall",
      location: "Bathroom",
      incidentDate: daysAgo(3),
      incidentTime: "14:00",
      reportedById: "user-rn-001",
      reportedByName: "Maria Torres",
      reportedByRole: "rn",
      hasInjury: false,
      witnessesPresent: false,
      phase: "phase_2_in_progress",
      status: "in-progress",
      priority: "medium",
      startedAt: daysAgo(3),
      phase1SignedAt: hoursAgo(20),
      completenessAtSignoff: 82,
      completenessScore: 82,
      investigatorId: "user-don-001",
      investigatorName: "Dr. Sarah Kim",
      idtTeam: [
        {
          userId: "user-pt-001",
          name: "Kevin Park",
          role: "physical_therapist",
          status: "pending",
          questionSent: "Did the resident attempt the transfer without staff assist?",
          questionSentAt: hoursAgo(18),
        },
        {
          userId: "user-diet-001",
          name: "Amara Diallo",
          role: "dietician",
          status: "answered",
          questionSent: "Any recent medication changes that could affect balance?",
          questionSentAt: hoursAgo(16),
          response:
            "No medication changes in past 30 days. Current regimen reviewed — no balance-affecting medications identified.",
          respondedAt: hoursAgo(10),
        },
      ],
      phase2Sections: {
        contributingFactors: {
          status: "complete",
          factors: ["Environmental Hazard", "Resident Behavior"],
          notes: "Wet floor surface — mat not in place",
          completedAt: hoursAgo(15),
          completedBy: "user-don-001",
        },
        rootCause: {
          status: "in_progress",
          description: "Resident attempted independent transfer",
        },
        interventionReview: { status: "not_started", reviewedInterventions: [] },
        newIntervention: { status: "not_started", interventions: [] },
      },
      investigation: {
        status: "in-progress",
        investigatorId: "user-don-001",
        investigatorName: "Dr. Sarah Kim",
      },
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-007",
      label: "INC-007 — Room 306 Fall (phase_2_in_progress, 91%)",
      residentId: "res-003",
      residentName: "Dorothy Martinez",
      residentRoom: "306",
      incidentType: "fall",
      location: "Room 306 — beside bed",
      incidentDate: daysAgo(4),
      incidentTime: "02:30",
      reportedById: "user-rn-001",
      reportedByName: "Maria Torres",
      reportedByRole: "rn",
      hasInjury: false,
      witnessesPresent: false,
      phase: "phase_2_in_progress",
      status: "in-progress",
      priority: "medium",
      startedAt: daysAgo(4),
      phase1SignedAt: hoursAgo(43),
      completenessAtSignoff: 91,
      completenessScore: 91,
      investigatorId: "user-don-001",
      investigatorName: "Dr. Sarah Kim",
      idtTeam: [
        {
          userId: "user-pt-001",
          name: "Kevin Park",
          role: "physical_therapist",
          status: "answered",
          questionSent: "Review current PT plan — is the walker being used consistently?",
          questionSentAt: hoursAgo(40),
          response:
            "Walker in use but resident frequently refuses. Recommend PT session 3x weekly and family education on fall risk.",
          respondedAt: hoursAgo(30),
        },
      ],
      phase2Sections: {
        contributingFactors: {
          status: "complete",
          factors: ["Resident Behavior", "Cognitive Decline"],
          completedAt: hoursAgo(35),
          completedBy: "user-don-001",
        },
        rootCause: {
          status: "complete",
          description:
            "Resident with moderate dementia ambulating independently at night without call light use. Cognitive impairment prevents consistent adherence to fall prevention protocol.",
          completedAt: hoursAgo(32),
          completedBy: "user-don-001",
        },
        interventionReview: {
          status: "complete",
          reviewedInterventions: [],
          completedAt: hoursAgo(28),
          completedBy: "user-don-001",
        },
        newIntervention: {
          status: "complete",
          interventions: [
            {
              description: "Bed alarm activated 9pm–6am",
              department: "nursing",
              type: "permanent",
              startDate: daysAgo(4),
            },
            {
              description: "PT 3x weekly — walker training and strengthening",
              department: "therapy",
              type: "permanent",
              startDate: daysAgo(4),
            },
          ],
          completedAt: hoursAgo(25),
          completedBy: "user-don-001",
        },
      },
      investigation: {
        status: "in-progress",
        investigatorId: "user-don-001",
        investigatorName: "Dr. Sarah Kim",
      },
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-008",
      label: "INC-008 — Room 411 Wound (phase_2_in_progress, 79%)",
      residentId: "res-004",
      residentName: "James Okafor",
      residentRoom: "411",
      incidentType: "wound_injury",
      location: "Room 411 — during repositioning",
      incidentDate: daysAgo(2),
      incidentTime: "09:00",
      reportedById: "user-rn-002",
      reportedByName: "DeShawn Carter",
      reportedByRole: "rn",
      hasInjury: true,
      injuryDescription: "Stage 2 pressure injury noted on sacrum during repositioning",
      witnessesPresent: false,
      phase: "phase_2_in_progress",
      status: "in-progress",
      priority: "high",
      startedAt: daysAgo(2),
      phase1SignedAt: hoursAgo(4),
      completenessAtSignoff: 79,
      completenessScore: 79,
      investigatorId: "user-admin-001",
      investigatorName: "Patricia Walsh",
      idtTeam: [],
      phase2Sections: {
        contributingFactors: { status: "not_started", factors: [] },
        rootCause: { status: "not_started" },
        interventionReview: { status: "not_started", reviewedInterventions: [] },
        newIntervention: { status: "not_started", interventions: [] },
      },
      investigation: {
        status: "in-progress",
        investigatorId: "user-admin-001",
        investigatorName: "Patricia Walsh",
      },
      redFlags: { hasInjury: true, carePlanViolated: false, notificationSentToAdmin: true },
    },
    {
      id: "inc-009",
      label: "INC-009 — Room 515 Fall (closed, 93%)",
      residentId: "res-005",
      residentName: "Helen Thompson",
      residentRoom: "515",
      incidentType: "fall",
      location: "Room 515 — bathroom",
      incidentDate: daysAgo(18),
      incidentTime: "03:15",
      reportedById: "user-rn-001",
      reportedByName: "Maria Torres",
      reportedByRole: "rn",
      hasInjury: false,
      witnessesPresent: false,
      phase: "closed",
      status: "closed",
      priority: "medium",
      startedAt: daysAgo(18),
      phase1SignedAt: daysAgo(18),
      phase2LockedAt: daysAgo(15),
      completenessAtSignoff: 93,
      completenessScore: 93,
      investigatorId: "user-don-001",
      investigatorName: "Dr. Sarah Kim",
      phase2Sections: {
        contributingFactors: {
          status: "complete",
          factors: ["Environmental Hazard", "Toileting Need"],
        },
        rootCause: {
          status: "complete",
          description:
            "Resident ambulated to bathroom without call light activation. Non-slip mat absent from bathroom floor — removed during room cleaning and not replaced.",
        },
        interventionReview: { status: "complete", reviewedInterventions: [] },
        newIntervention: {
          status: "complete",
          interventions: [
            {
              description: "Non-slip mat inspection added to daily room check",
              department: "nursing",
              type: "permanent",
              startDate: daysAgo(15),
            },
            {
              description: "Gait belt use required for all bathroom transfers",
              department: "nursing",
              type: "permanent",
              startDate: daysAgo(15),
            },
          ],
        },
      },
      investigation: {
        status: "completed",
        investigatorId: "user-don-001",
        investigatorName: "Dr. Sarah Kim",
        completedAt: daysAgo(15),
        signatures: closedSignatures(daysAgo(15)),
      },
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-010",
      label: "INC-010 — Room 306 Medication (closed, 71%)",
      residentId: "res-003",
      residentName: "Dorothy Martinez",
      residentRoom: "306",
      incidentType: "medication_error",
      location: "Medication room",
      incidentDate: daysAgo(28),
      incidentTime: "19:45",
      reportedById: "user-rn-002",
      reportedByName: "DeShawn Carter",
      reportedByRole: "rn",
      hasInjury: false,
      witnessesPresent: true,
      phase: "closed",
      status: "closed",
      priority: "medium",
      startedAt: daysAgo(28),
      phase1SignedAt: daysAgo(28),
      phase2LockedAt: daysAgo(23),
      completenessAtSignoff: 71,
      completenessScore: 71,
      investigatorId: "user-don-001",
      investigatorName: "Dr. Sarah Kim",
      phase2Sections: {
        contributingFactors: {
          status: "complete",
          factors: ["Staffing Issue"],
        },
        rootCause: {
          status: "complete",
          description:
            "Double-check protocol not followed during high-census evening. Single nurse dispensing medications without confirmation step.",
        },
        interventionReview: { status: "complete", reviewedInterventions: [] },
        newIntervention: { status: "complete", interventions: [] },
      },
      investigation: {
        status: "completed",
        investigatorId: "user-don-001",
        investigatorName: "Dr. Sarah Kim",
        completedAt: daysAgo(23),
        signatures: closedSignatures(daysAgo(23)),
      },
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
  ]

  for (const raw of incidentRows) {
    const id = raw.id as string
    const existing = await IncidentModel.findOne({ id }).exec()
    if (existing) {
      console.log(`  ${raw.label} already exists — skipping`)
      continue
    }

    const reportedById = raw.reportedById as string
    const reportedByName = raw.reportedByName as string
    const startedAt = raw.startedAt as Date
    const phase1SignedAt = raw.phase1SignedAt as Date | undefined
    const phase2LockedAt = raw.phase2LockedAt as Date | undefined

    const phaseTransitionTimestamps: Record<string, Date> = {
      phase1Started: startedAt,
    }
    if (phase1SignedAt) phaseTransitionTimestamps.phase1Signed = phase1SignedAt
    if (phase2LockedAt) phaseTransitionTimestamps.phase2Locked = phase2LockedAt

    const doc: Record<string, unknown> = {
      id,
      facilityId: FACILITY_ID,
      organizationId: ORG_ID,
      title: raw.label,
      description: `${raw.incidentType} — ${raw.location}`,
      incidentType: raw.incidentType,
      location: raw.location,
      incidentDate: raw.incidentDate,
      incidentTime: raw.incidentTime,
      witnessesPresent: raw.witnessesPresent,
      hasInjury: raw.hasInjury,
      injuryDescription: raw.injuryDescription,
      residentId: raw.residentId,
      completenessScore: raw.completenessScore,
      completenessAtTier1Complete: raw.completenessAtTier1Complete ?? 0,
      completenessAtSignoff: raw.completenessAtSignoff ?? 0,
      tier2QuestionsGenerated: raw.tier2QuestionsGenerated ?? 0,
      questionsAnswered: raw.questionsAnswered ?? 0,
      questionsDeferred: raw.questionsDeferred ?? 0,
      questionsMarkedUnknown: 0,
      activeDataCollectionSeconds: 0,
      dataPointsPerQuestion: [],
      phaseTransitionTimestamps,
      phase: raw.phase,
      phase2Sections: raw.phase2Sections,
      redFlags: raw.redFlags,
      status: raw.status,
      priority: raw.priority,
      staffId: reportedById,
      staffName: reportedByName,
      residentName: raw.residentName,
      residentRoom: raw.residentRoom,
      createdAt: startedAt,
      updatedAt: now,
      questions: [],
      investigatorId: raw.investigatorId,
      investigatorName: raw.investigatorName,
      idtTeam: raw.idtTeam ?? [],
      investigation: raw.investigation,
      auditTrail: [],
    }

    await IncidentModel.create(doc)
    console.log(`  ✓ Created: ${raw.label}`)
  }

  console.log("  Phase distribution: 3 in progress / 2 complete / 3 phase 2 / 2 closed ✓")
}

async function seedInterventions(daysAgo: (n: number) => Date) {
  console.log("\n💊 Interventions")

  const rows = [
    {
      id: "int-001",
      label: "INT-001 — Room 102 Bed alarm (active)",
      residentId: "res-001",
      room: "102",
      description: "Bed alarm activated every night 8pm–7am",
      isActive: true,
      placedAt: daysAgo(182),
      triggeringIncidentId: undefined as string | undefined,
    },
    {
      id: "int-002",
      label: "INT-002 — Room 204 Two-person assist (active)",
      residentId: "res-002",
      room: "204",
      description: "Two-person assist required for all transfers and ambulation",
      isActive: true,
      placedAt: daysAgo(152),
      triggeringIncidentId: undefined,
    },
    {
      id: "int-003",
      label: "INT-003 — Room 515 Non-slip mat protocol (active)",
      residentId: "res-005",
      room: "515",
      description: "Non-slip mat inspection added to daily room check protocol",
      isActive: true,
      placedAt: daysAgo(15),
      triggeringIncidentId: "inc-009",
    },
    {
      id: "int-004",
      label: "INT-004 — Room 515 Gait belt (active)",
      residentId: "res-005",
      room: "515",
      description: "Gait belt use required for all bathroom transfers",
      isActive: true,
      placedAt: daysAgo(15),
      triggeringIncidentId: "inc-009",
    },
    {
      id: "int-005",
      label: "INT-005 — Room 102 Restraint removed",
      residentId: "res-001",
      room: "102",
      description: "Physical restraint — lap belt during meals (discontinued)",
      isActive: false,
      type: "temporary" as const,
      placedAt: daysAgo(240),
      removedAt: daysAgo(182),
      notes: "Discontinued per resident rights review — replaced with bed alarm monitoring protocol",
      triggeringIncidentId: undefined,
    },
  ]

  for (const r of rows) {
    const existing = await InterventionModel.findOne({ id: r.id }).exec()
    if (existing) {
      console.log(`  ${r.label} already exists — skipping`)
      continue
    }
    await InterventionModel.create({
      id: r.id,
      facilityId: FACILITY_ID,
      residentId: r.residentId,
      residentRoom: r.room,
      description: r.description,
      department: "nursing",
      type: r.type ?? "permanent",
      isActive: r.isActive,
      placedAt: r.placedAt,
      removedAt: r.removedAt,
      notes: r.notes,
      triggeringIncidentId: r.triggeringIncidentId,
    })
    console.log(`  ✓ Created: ${r.label}`)
  }
}

async function seedAssessments(
  daysAgo: (n: number) => Date,
  daysFromNow: (n: number) => Date,
) {
  console.log("\n📊 Assessments")

  const rows = [
    {
      id: "assess-001",
      label: "ASSESS-001 — Room 411 Activity (84%)",
      residentId: "res-004",
      room: "411",
      assessmentType: "activity" as const,
      conductedById: "user-rn-001",
      conductedByName: "Maria Torres",
      conductedAt: daysAgo(21),
      completenessScore: 84,
      status: "completed" as const,
      nextDueAt: daysFromNow(9),
    },
    {
      id: "assess-002",
      label: "ASSESS-002 — Room 411 Dietary (91%)",
      residentId: "res-004",
      room: "411",
      assessmentType: "dietary" as const,
      conductedById: "user-diet-001",
      conductedByName: "Amara Diallo",
      conductedAt: daysAgo(18),
      completenessScore: 91,
      status: "completed" as const,
      nextDueAt: daysFromNow(12),
    },
    {
      id: "assess-003",
      label: "ASSESS-003 — Room 204 Activity due tomorrow (77%)",
      residentId: "res-002",
      room: "204",
      assessmentType: "activity" as const,
      conductedById: "user-rn-001",
      conductedByName: "Maria Torres",
      conductedAt: daysAgo(29),
      completenessScore: 77,
      status: "completed" as const,
      nextDueAt: daysFromNow(1),
    },
  ]

  for (const a of rows) {
    const existing = await AssessmentModel.findOne({ id: a.id }).exec()
    if (existing) {
      console.log(`  ${a.label} already exists — skipping`)
      continue
    }
    await AssessmentModel.create({
      id: a.id,
      facilityId: FACILITY_ID,
      organizationId: ORG_ID,
      residentId: a.residentId,
      residentRoom: a.room,
      assessmentType: a.assessmentType,
      conductedById: a.conductedById,
      conductedByName: a.conductedByName,
      conductedAt: a.conductedAt,
      completenessScore: a.completenessScore,
      status: a.status,
      nextDueAt: a.nextDueAt,
    })
    console.log(`  ✓ Created: ${a.label}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

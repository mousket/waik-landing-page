/**
 * Add synthetic incidents + assessments for the Mongo user with email
 * `gerardbeaubrun@yahoo.com` (staff dashboard demo).
 *
 * No Clerk / no org seed — only `DATABASE_URL` and `MONGODB_DB_NAME` in `.env`.
 *
 * Usage:  npm run seed:gerard-demo
 */
import path from "path"
import dotenv from "dotenv"

const rootEnv = path.resolve(process.cwd(), ".env")
const localEnv = path.resolve(process.cwd(), ".env.local")
dotenv.config({ path: rootEnv })
dotenv.config({ path: localEnv })

import mongoose from "mongoose"
import connectMongo from "../backend/src/lib/mongodb"
import UserModel from "../backend/src/models/user.model"
import IncidentModel from "../backend/src/models/incident.model"
import AssessmentModel from "../backend/src/models/assessment.model"

const TARGET_EMAIL = "gerardbeaubrun@yahoo.com"

const FALLBACK_FACILITY_ID = "fac-sunrise-mpls-001"
const FALLBACK_ORG_ID = "org-sunrise-001"

const DECLARATION =
  "I certify this investigation report is complete and accurate to the best of my knowledge."

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

function p2s(status: "not_started" | "in_progress" | "complete" = "not_started") {
  return {
    contributingFactors: {
      status,
      factors: status === "complete" ? (["Resident Behavior"] as string[]) : ([] as string[]),
    },
    rootCause: { status: "not_started" as const },
    interventionReview: { status: "not_started" as const, reviewedInterventions: [] as string[] },
    newIntervention: { status: "not_started" as const, interventions: [] as unknown[] },
  }
}

async function createIncidentFromRow(
  raw: Record<string, unknown>,
  now: Date,
  facilityId: string,
  organizationId: string,
) {
  const id = raw.id as string
  if (!id) return
  const existing = await IncidentModel.findOne({ id }).exec()
  if (existing) {
    console.log(`  ${String(raw.label)} already exists — skipping`)
    return
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
    facilityId,
    organizationId,
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
    completenessAtTier1Complete: (raw.completenessAtTier1Complete as number | undefined) ?? 0,
    completenessAtSignoff: (raw.completenessAtSignoff as number | undefined) ?? 0,
    tier2QuestionsGenerated: (raw.tier2QuestionsGenerated as number | undefined) ?? 0,
    questionsAnswered: (raw.questionsAnswered as number | undefined) ?? 0,
    questionsDeferred: (raw.questionsDeferred as number | undefined) ?? 0,
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
    idtTeam: (raw.idtTeam as unknown[]) ?? [],
    investigation: raw.investigation,
    auditTrail: [],
  }

  await IncidentModel.create(doc)
  console.log(`  ✓ Incident: ${raw.label}`)
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required. Set it in .env")
  }

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
  const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000)
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000)

  await connectMongo()

  const user = await UserModel.findOne({
    email: new RegExp(`^${TARGET_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .lean()
    .exec()

  if (!user) {
    console.error("")
    console.error(`No Mongo user with email: ${TARGET_EMAIL}`)
    console.error("Create the user in your app (invite) or add a document to the users collection, then re-run.")
    process.exit(1)
  }

  const staffId = (user as { id?: string }).id
  if (!staffId) {
    console.error("User record is missing the business `id` field.")
    process.exit(1)
  }

  const u = user as {
    firstName?: string
    lastName?: string
    facilityId?: string
    organizationId?: string
  }
  const staffName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Gerard Beaubrun"
  const facilityId = (u.facilityId && String(u.facilityId).trim()) || FALLBACK_FACILITY_ID
  const organizationId = (u.organizationId && String(u.organizationId).trim()) || FALLBACK_ORG_ID

  console.log("")
  console.log("─".repeat(60))
  console.log(`  Seed Gerard demo  →  ${TARGET_EMAIL}`)
  console.log(`  user.id (staffId):  ${staffId}`)
  console.log(`  staffName:          ${staffName}`)
  console.log(`  facilityId:         ${facilityId}`)
  console.log("─".repeat(60))
  console.log("")

  const rows: Array<Record<string, unknown>> = [
    {
      id: "inc-brun-ger-001",
      label: "INC-BRUN-001 — 102 fall (P1, open)",
      residentId: "res-001",
      residentName: "Margaret Chen",
      residentRoom: "102",
      incidentType: "fall",
      location: "Bathroom",
      incidentDate: now,
      incidentTime: "04:00",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: true,
      injuryDescription: "Minor contusion to elbow",
      witnessesPresent: true,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "high",
      startedAt: hoursAgo(2),
      completenessScore: 35,
      completenessAtTier1Complete: 30,
      tier2QuestionsGenerated: 10,
      questionsAnswered: 2,
      questionsDeferred: 1,
      redFlags: { hasInjury: true, carePlanViolated: false, notificationSentToAdmin: true },
    },
    {
      id: "inc-brun-ger-002",
      label: "INC-BRUN-002 — 204 fall (P1, open)",
      residentId: "res-002",
      residentName: "Robert Johnson",
      residentRoom: "204",
      incidentType: "fall",
      location: "Dining",
      incidentDate: now,
      incidentTime: "10:00",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: false,
      witnessesPresent: false,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "medium",
      startedAt: hoursAgo(5),
      completenessScore: 55,
      tier2QuestionsGenerated: 8,
      questionsAnswered: 4,
      questionsDeferred: 0,
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-brun-ger-003",
      label: "INC-BRUN-003 — 306 med (P1, open)",
      residentId: "res-003",
      residentName: "Dorothy Martinez",
      residentRoom: "306",
      incidentType: "medication_error",
      location: "Nurses station",
      incidentDate: now,
      incidentTime: "11:00",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: false,
      witnessesPresent: true,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "urgent",
      startedAt: hoursAgo(7),
      completenessScore: 72,
      tier2QuestionsGenerated: 6,
      questionsAnswered: 3,
      questionsDeferred: 1,
      redFlags: { hasInjury: false, carePlanViolated: true, notificationSentToAdmin: false },
    },
    {
      id: "inc-brun-ger-004",
      label: "INC-BRUN-004 — 411 conflict (P1, open)",
      residentId: "res-004",
      residentName: "James Okafor",
      residentRoom: "411",
      incidentType: "resident_conflict",
      location: "Common area",
      incidentDate: now,
      incidentTime: "13:20",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: false,
      witnessesPresent: true,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "medium",
      startedAt: hoursAgo(8),
      completenessScore: 62,
      tier2QuestionsGenerated: 9,
      questionsAnswered: 5,
      questionsDeferred: 0,
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-brun-ger-005",
      label: "INC-BRUN-005 — 515 fall (P1, open)",
      residentId: "res-005",
      residentName: "Helen Thompson",
      residentRoom: "515",
      incidentType: "fall",
      location: "Hall",
      incidentDate: now,
      incidentTime: "15:00",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: true,
      injuryDescription: "Abrasion right knee",
      witnessesPresent: false,
      phase: "phase_1_in_progress",
      status: "open",
      priority: "high",
      startedAt: hoursAgo(10),
      completenessScore: 80,
      tier2QuestionsGenerated: 5,
      questionsAnswered: 4,
      questionsDeferred: 0,
      redFlags: { hasInjury: true, carePlanViolated: false, notificationSentToAdmin: true },
    },
    {
      id: "inc-brun-ger-006",
      label: "INC-BRUN-006 — 102 med (P1 done)",
      residentId: "res-001",
      residentName: "Margaret Chen",
      residentRoom: "102",
      incidentType: "medication_error",
      location: "Med cart",
      incidentDate: daysAgo(1),
      incidentTime: "08:00",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: false,
      witnessesPresent: true,
      phase: "phase_1_complete",
      status: "pending-review",
      priority: "medium",
      startedAt: daysAgo(1),
      phase1SignedAt: hoursAgo(2),
      completenessAtSignoff: 84,
      completenessScore: 84,
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
    {
      id: "inc-brun-ger-007",
      label: "INC-BRUN-007 — 204 wound (P2 in progress)",
      residentId: "res-002",
      residentName: "Robert Johnson",
      residentRoom: "204",
      incidentType: "wound_injury",
      location: "Room 204",
      incidentDate: daysAgo(2),
      incidentTime: "19:00",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: true,
      injuryDescription: "Skin tear to forearm",
      witnessesPresent: false,
      phase: "phase_2_in_progress",
      status: "in-progress",
      priority: "high",
      startedAt: daysAgo(2),
      phase1SignedAt: hoursAgo(8),
      completenessAtSignoff: 78,
      completenessScore: 78,
      investigatorId: "user-don-001",
      investigatorName: "Dr. Sarah Kim",
      idtTeam: [] as const,
      phase2Sections: p2s("in_progress"),
      investigation: {
        status: "in-progress",
        investigatorId: "user-don-001",
        investigatorName: "Dr. Sarah Kim",
      },
      redFlags: { hasInjury: true, carePlanViolated: false, notificationSentToAdmin: true },
    },
    {
      id: "inc-brun-ger-008",
      label: "INC-BRUN-008 — 306 fall (closed)",
      residentId: "res-003",
      residentName: "Dorothy Martinez",
      residentRoom: "306",
      incidentType: "fall",
      location: "Bathroom",
      incidentDate: daysAgo(12),
      incidentTime: "05:00",
      reportedById: staffId,
      reportedByName: staffName,
      hasInjury: false,
      witnessesPresent: false,
      phase: "closed",
      status: "closed",
      priority: "low",
      startedAt: daysAgo(12),
      phase1SignedAt: daysAgo(12),
      phase2LockedAt: daysAgo(8),
      completenessAtSignoff: 90,
      completenessScore: 90,
      phase2Sections: p2s("complete"),
      investigatorId: "user-don-001",
      investigatorName: "Dr. Sarah Kim",
      investigation: {
        status: "completed",
        investigatorId: "user-don-001",
        investigatorName: "Dr. Sarah Kim",
        completedAt: daysAgo(8),
        signatures: closedSignatures(daysAgo(8)),
      },
      redFlags: { hasInjury: false, carePlanViolated: false, notificationSentToAdmin: false },
    },
  ]

  for (const raw of rows) {
    await createIncidentFromRow(raw, now, facilityId, organizationId)
  }

  const assRows = [
    {
      id: "assess-brun-ger-1",
      residentId: "res-001",
      room: "102",
      assessmentType: "behavioral" as const,
      conductedAt: daysAgo(5),
      completenessScore: 82,
      nextDueAt: daysFromNow(1),
    },
    {
      id: "assess-brun-ger-2",
      residentId: "res-002",
      room: "204",
      assessmentType: "activity" as const,
      conductedAt: daysAgo(8),
      completenessScore: 76,
      nextDueAt: daysFromNow(2),
    },
  ] as const

  for (const a of assRows) {
    const ex = await AssessmentModel.findOne({ id: a.id }).exec()
    if (ex) {
      console.log(`  ${a.id} (assessment) already exists — skipping`)
      continue
    }
    await AssessmentModel.create({
      id: a.id,
      facilityId,
      organizationId,
      residentId: a.residentId,
      residentRoom: a.room,
      assessmentType: a.assessmentType,
      conductedById: staffId,
      conductedByName: staffName,
      conductedAt: a.conductedAt,
      completenessScore: a.completenessScore,
      status: "completed" as const,
      nextDueAt: a.nextDueAt,
    })
    console.log(`  ✓ Assessment: ${a.id}`)
  }

  console.log("")
  console.log("Done. Sign in as that user and open /staff/dashboard.")
  console.log("")
  await mongoose.disconnect()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

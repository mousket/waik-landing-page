import bcrypt from "bcryptjs"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import UserModel from "@/backend/src/models/user.model"
import type { UserDocument } from "@/backend/src/models/user.model"
import NotificationModel from "@/backend/src/models/notification.model"
import { leanOne } from "@/lib/mongoose-lean"
import type {
  Answer,
  CurrentUser,
  Incident,
  IncidentInitialReport,
  IncidentInvestigationMetadata,
  IncidentNotification,
  IncidentPhase2Sections,
  InvestigationStatus,
  Question,
  User,
  UserRole,
} from "./types"
import { toUiRole } from "@/lib/waik-roles"
import { getQuestionEmbedding } from "./embeddings"
import { isOpenAIConfigured } from "./openai"

let isInitialized = false

async function ensureDatabase() {
  await connectMongo()
  if (!isInitialized) {
    isInitialized = true
  }
}

const toIsoString = (value?: Date | string | null): string | undefined => {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

const serializeAnswer = (answer?: any): Answer | undefined => {
  if (!answer) return undefined
  return {
    id: answer.id,
    questionId: answer.questionId,
    answerText: answer.answerText,
    answeredBy: answer.answeredBy,
    answeredAt: toIsoString(answer.answeredAt) ?? new Date().toISOString(),
    method: answer.method,
  }
}

const serializeQuestion = (question: any): Question => ({
  id: question.id,
  incidentId: question.incidentId,
  questionText: question.questionText,
  askedBy: question.askedBy,
  askedByName: question.askedByName,
  askedAt: toIsoString(question.askedAt) ?? new Date().toISOString(),
  assignedTo: question.assignedTo?.length ? question.assignedTo : undefined,
  answer: serializeAnswer(question.answer),
  source: question.source,
  generatedBy: question.generatedBy,
  vectorizedAt: toIsoString(question.vectorizedAt),
  metadata: question.metadata,
})

const serializeIncident = (incident: any): Incident => ({
  id: incident.id,
  title: incident.title,
  description: incident.description,
  status: incident.status,
  priority: incident.priority,
  staffId: incident.staffId,
  staffName: incident.staffName,
  residentName: incident.residentName,
  residentRoom: incident.residentRoom,
  createdAt: toIsoString(incident.createdAt) ?? new Date().toISOString(),
  updatedAt: toIsoString(incident.updatedAt) ?? new Date().toISOString(),
  summary: incident.summary ?? null,
  questions: (incident.questions ?? []).map(serializeQuestion),
  initialReport: incident.initialReport
    ? {
        capturedAt: toIsoString(incident.initialReport.capturedAt) ?? new Date().toISOString(),
        narrative: incident.initialReport.narrative,
        residentState: incident.initialReport.residentState,
        environmentNotes: incident.initialReport.environmentNotes,
        enhancedNarrative: incident.initialReport.enhancedNarrative,
        recordedById: incident.initialReport.recordedById,
        recordedByName: incident.initialReport.recordedByName,
        recordedByRole: incident.initialReport.recordedByRole,
      }
    : undefined,
  investigation: incident.investigation
    ? {
        ...incident.investigation,
        startedAt: toIsoString(incident.investigation.startedAt),
        completedAt: toIsoString(incident.investigation.completedAt),
        signatures: incident.investigation.signatures
          ? {
              don: incident.investigation.signatures.don
                ? {
                    ...incident.investigation.signatures.don,
                    signedAt:
                      toIsoString(incident.investigation.signatures.don.signedAt) ??
                      new Date().toISOString(),
                  }
                : undefined,
              admin: incident.investigation.signatures.admin
                ? {
                    ...incident.investigation.signatures.admin,
                    signedAt:
                      toIsoString(incident.investigation.signatures.admin.signedAt) ??
                      new Date().toISOString(),
                  }
                : undefined,
            }
          : undefined,
      }
    : undefined,
  humanReport: incident.humanReport
    ? {
        ...incident.humanReport,
        createdAt: toIsoString(incident.humanReport.createdAt) ?? new Date().toISOString(),
        lastEditedAt: toIsoString(incident.humanReport.lastEditedAt),
      }
    : undefined,
  aiReport: incident.aiReport
    ? {
        ...incident.aiReport,
        generatedAt: toIsoString(incident.aiReport.generatedAt) ?? new Date().toISOString(),
      }
    : undefined,
  facilityId: incident.facilityId,
  organizationId: incident.organizationId,
  incidentType: incident.incidentType,
  location: incident.location,
  incidentDate: toIsoString(incident.incidentDate),
  incidentTime: incident.incidentTime,
  witnessesPresent: incident.witnessesPresent,
  hasInjury: incident.hasInjury,
  injuryDescription: incident.injuryDescription,
  residentId: incident.residentId,
  completenessScore: incident.completenessScore,
  investigatorId: incident.investigatorId,
  investigatorName: incident.investigatorName,
  idtTeam: (incident.idtTeam ?? []).map((m: any) => ({
    userId: m.userId,
    name: m.name,
    role: m.role,
    questionSent: m.questionSent,
    questionSentAt: toIsoString(m.questionSentAt),
    response: m.response,
    respondedAt: toIsoString(m.respondedAt),
    status: m.status,
  })),
  phase: incident.phase,
  tier2QuestionsGenerated: incident.tier2QuestionsGenerated ?? 0,
  questionsAnswered: incident.questionsAnswered ?? 0,
  questionsDeferred: incident.questionsDeferred ?? 0,
  questionsMarkedUnknown: incident.questionsMarkedUnknown ?? 0,
  activeDataCollectionSeconds: incident.activeDataCollectionSeconds ?? 0,
  completenessAtTier1Complete: incident.completenessAtTier1Complete ?? 0,
  completenessAtSignoff: incident.completenessAtSignoff ?? 0,
  dataPointsPerQuestion: incident.dataPointsPerQuestion,
  phaseTransitionTimestamps: incident.phaseTransitionTimestamps
    ? {
        phase1Started: toIsoString(incident.phaseTransitionTimestamps.phase1Started),
        tier1Complete: toIsoString(incident.phaseTransitionTimestamps.tier1Complete),
        tier2Started: toIsoString(incident.phaseTransitionTimestamps.tier2Started),
        phase1Signed: toIsoString(incident.phaseTransitionTimestamps.phase1Signed),
        phase2Claimed: toIsoString(incident.phaseTransitionTimestamps.phase2Claimed),
        phase2Locked: toIsoString(incident.phaseTransitionTimestamps.phase2Locked),
      }
    : undefined,
  phase2Sections: incident.phase2Sections
    ? (serializePhase2Sections(incident.phase2Sections) as IncidentPhase2Sections)
    : undefined,
  auditTrail: (incident.auditTrail ?? []).map((e: any) => ({
    action: e.action,
    performedBy: e.performedBy,
    performedByName: e.performedByName,
    timestamp: toIsoString(e.timestamp) ?? new Date().toISOString(),
    reason: e.reason,
    previousValue: e.previousValue,
    newValue: e.newValue,
  })),
})

function serializePhase2Sections(p: any): Partial<IncidentPhase2Sections> {
  if (!p) return {}
  return {
    contributingFactors: {
      status: p.contributingFactors?.status ?? "not_started",
      factors: p.contributingFactors?.factors ?? [],
      notes: p.contributingFactors?.notes,
      completedAt: toIsoString(p.contributingFactors?.completedAt),
      completedBy: p.contributingFactors?.completedBy,
    },
    rootCause: {
      status: p.rootCause?.status ?? "not_started",
      description: p.rootCause?.description,
      completedAt: toIsoString(p.rootCause?.completedAt),
      completedBy: p.rootCause?.completedBy,
    },
    interventionReview: {
      status: p.interventionReview?.status ?? "not_started",
      reviewedInterventions: p.interventionReview?.reviewedInterventions ?? [],
      completedAt: toIsoString(p.interventionReview?.completedAt),
      completedBy: p.interventionReview?.completedBy,
    },
    newIntervention: {
      status: p.newIntervention?.status ?? "not_started",
      interventions: (p.newIntervention?.interventions ?? []).map((i: any) => ({
        ...i,
        startDate: toIsoString(i.startDate),
      })),
      completedAt: toIsoString(p.newIntervention?.completedAt),
      completedBy: p.newIntervention?.completedBy,
    },
  }
}

const serializeUser = (user: any): User => {
  const legacyRole = user.role as UserRole | undefined
  const fromSlug = user.roleSlug ? toUiRole(String(user.roleSlug)) : null
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    (typeof user.name === "string" ? user.name : "") ||
    ""

  return {
    id: user.id,
    username: user.username ?? "",
    password: user.password ?? "",
    role: fromSlug ?? legacyRole ?? "staff",
    name: displayName,
    email: user.email,
    createdAt: toIsoString(user.createdAt) ?? new Date().toISOString(),
  }
}

const serializeNotification = (notification: any): IncidentNotification => ({
  id: notification.id,
  incidentId: notification.incidentId,
  type: notification.type,
  message: notification.message,
  createdAt: toIsoString(notification.createdAt) ?? new Date().toISOString(),
  readAt: toIsoString(notification.readAt),
  targetUserId: notification.targetUserId,
})

const VOICE_SEED_QUESTIONS: Array<{ key: keyof IncidentInitialReport; prompt: string }> = [
  { key: "narrative", prompt: "Describe what happened during the incident." },
  { key: "residentState", prompt: "How is the resident doing right now?" },
  { key: "environmentNotes", prompt: "Describe the room or environment conditions." },
]

const toDateOrUndefined = (value?: string | null): Date | undefined => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed
}

const prepareHumanReport = (report?: Incident["humanReport"]) =>
  report
    ? {
        ...report,
        createdAt: toDateOrUndefined(report.createdAt) ?? new Date(),
        lastEditedAt: toDateOrUndefined(report.lastEditedAt) ?? undefined,
      }
    : undefined

const prepareAIReport = (report?: Incident["aiReport"]) =>
  report
    ? {
        ...report,
        generatedAt: toDateOrUndefined(report.generatedAt) ?? new Date(),
      }
    : undefined

const prepareInvestigation = (investigation?: IncidentInvestigationMetadata) => {
  if (!investigation) return undefined
  const sig = investigation.signatures
  return {
    ...investigation,
    startedAt: toDateOrUndefined(investigation.startedAt) ?? undefined,
    completedAt: toDateOrUndefined(investigation.completedAt) ?? undefined,
    signatures: sig
      ? {
          don: sig.don
            ? {
                ...sig.don,
                signedAt: toDateOrUndefined(sig.don.signedAt) ?? new Date(),
              }
            : undefined,
          admin: sig.admin
            ? {
                ...sig.admin,
                signedAt: toDateOrUndefined(sig.admin.signedAt) ?? new Date(),
              }
            : undefined,
        }
      : undefined,
  }
}

export async function getUsers(): Promise<User[]> {
  await ensureDatabase()
  const users = await UserModel.find({}).lean().exec()
  return users.map(serializeUser)
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureDatabase()
  const user = leanOne<UserDocument>(await UserModel.findOne({ id }).lean().exec())
  return user ? serializeUser(user) : null
}

/** Map Clerk id or business id from the client to `User.id` for `Incident.staffId`. */
export async function resolveUserBusinessIdForReport(staffIdFromClient: string): Promise<string> {
  const trimmed = (staffIdFromClient || "").trim()
  if (!trimmed) return staffIdFromClient
  const byId = await getUserById(trimmed)
  if (byId?.id) return byId.id
  await ensureDatabase()
  const doc = await UserModel.findOne({ clerkUserId: trimmed }).lean().exec()
  const d = leanOne<UserDocument>(doc)
  if (d?.id) return d.id
  return trimmed
}

export async function getUserByCredentials(username: string, password: string): Promise<User | null> {
  await ensureDatabase()
  const user = leanOne<UserDocument>(await UserModel.findOne({ username }).lean().exec())
  if (!user?.password) return null

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  return serializeUser(user)
}

export async function getIncidents(facilityId: string): Promise<Incident[]> {
  await ensureDatabase()
  if (!facilityId) return []
  const incidents = await IncidentModel.find({ facilityId }).lean().exec()
  return incidents.map(serializeIncident)
}

export async function getIncidentById(id: string, facilityId: string): Promise<Incident | null> {
  await ensureDatabase()
  if (!facilityId) return null
  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id, facilityId }).lean().exec(),
  )
  return incident ? serializeIncident(incident) : null
}

/**
 * For API handlers: 404 if missing, 403 if incident belongs to another facility (or legacy doc without facility).
 */
export async function getIncidentForUser(
  id: string,
  user: CurrentUser,
): Promise<
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "ok"; incident: Incident }
> {
  await ensureDatabase()
  const raw = leanOne<IncidentDocument>(await IncidentModel.findOne({ id }).lean().exec())
  if (!raw) return { kind: "not_found" }
  if (user.isWaikSuperAdmin) return { kind: "ok", incident: serializeIncident(raw) }
  if (!user.facilityId || !raw.facilityId || raw.facilityId !== user.facilityId) {
    return { kind: "forbidden" }
  }
  // Non-admin staff may only read incidents they filed (reporter = Mongo userId).
  if (!user.isAdminTier) {
    const reporter = String((raw as { staffId?: string }).staffId ?? "")
    if (reporter && reporter !== user.userId) {
      return { kind: "forbidden" }
    }
  }
  return { kind: "ok", incident: serializeIncident(raw) }
}

/** Facility id for scoped updates (incident row may include facility even for super-admin reads). */
export function facilityIdForIncidentMutation(incident: Incident, user: CurrentUser): string | null {
  return incident.facilityId ?? user.facilityId ?? null
}

export async function getIncidentsByStaffId(staffId: string, facilityId: string): Promise<Incident[]> {
  await ensureDatabase()
  if (!facilityId) return []
  const incidents = await IncidentModel.find({
    facilityId,
    $or: [
      { staffId },
      { "questions.assignedTo": staffId },
      { "questions.metadata.assignedStaffIds": staffId },
    ],
  })
    .lean()
    .exec()

  return incidents.map(serializeIncident)
}

export async function updateIncident(
  id: string,
  facilityId: string,
  updates: Partial<Incident>,
): Promise<Incident | null> {
  await ensureDatabase()
  if (!facilityId) return null

  const preparedUpdates: any = {
    ...updates,
    updatedAt: new Date(),
  }

  if (updates.humanReport) {
    preparedUpdates.humanReport = prepareHumanReport(updates.humanReport)
  }

  if (updates.aiReport) {
    preparedUpdates.aiReport = prepareAIReport(updates.aiReport)
}

  if (updates.investigation) {
    preparedUpdates.investigation = prepareInvestigation(updates.investigation)
  }

  if (updates.initialReport) {
    preparedUpdates.initialReport = {
      ...updates.initialReport,
      capturedAt: toDateOrUndefined(updates.initialReport.capturedAt) ?? new Date(),
    }
  }

  if (updates.summary === null) {
    preparedUpdates.summary = null
  }

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOneAndUpdate({ id, facilityId }, preparedUpdates, {
      new: true,
      lean: true,
    }),
  )

  return incident ? serializeIncident(incident) : null
}

/**
 * Best-effort persistence when the report-conversational LLM path times out
 * (does not mark investigation completed; never downgrades a completed state).
 */
export async function updateInvestigationProgressOnTimeout(
  incidentId: string,
  facilityId: string,
  completenessScore: number,
): Promise<void> {
  const incident = await getIncidentById(incidentId, facilityId)
  if (!incident) return

  const inv = incident.investigation
  const existing: IncidentInvestigationMetadata = inv
    ? { ...inv }
    : { status: "not-started" }

  if (existing.status === "completed") {
    await updateIncident(incidentId, facilityId, {
      investigation: {
        ...existing,
        completenessScore: completenessScore ?? existing.completenessScore ?? 0,
      },
    })
    return
  }

  const nextStatus: InvestigationStatus =
    existing.status === "not-started" ? "in-progress" : existing.status

  await updateIncident(incidentId, facilityId, {
    investigation: {
      ...existing,
      status: nextStatus,
      completenessScore,
    },
  })
}

export async function addQuestionToIncident(
  incidentId: string,
  facilityId: string,
  input: {
    questionText: string
    askedBy: string
    askedByName?: string
    assignedTo?: string[]
    metadata?: Question["metadata"]
    source?: Question["source"]
    generatedBy?: string
    answer?: Answer
  },
): Promise<Question | null> {
  await ensureDatabase()
  if (!facilityId) return null

  const now = new Date()
  const questionId = `q-${Date.now()}`

  const questionDoc = {
    id: questionId,
    incidentId,
    questionText: input.questionText,
    askedBy: input.askedBy,
    askedByName: input.askedByName,
    askedAt: now,
    assignedTo: input.assignedTo,
    metadata: input.metadata,
    source: input.source ?? "manual",
    generatedBy: input.generatedBy,
    answer: input.answer
      ? {
          ...input.answer,
          answeredAt: toDateOrUndefined(input.answer.answeredAt) ?? now,
        }
      : undefined,
  }

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOneAndUpdate(
      { id: incidentId, facilityId },
      {
        $push: { questions: questionDoc },
        $set: { updatedAt: now },
      },
      { new: true, lean: true },
    ),
  )

  const question = incident?.questions?.find((q: any) => q.id === questionId)
  if (!question) {
    return null
  }

  if (isOpenAIConfigured()) {
    getQuestionEmbedding(
      incidentId,
      question.id,
      question.questionText,
      question.askedBy,
      toIsoString(question.askedAt) ?? now.toISOString(),
      question.answer
        ? {
            id: question.answer.id,
            text: question.answer.answerText,
            answeredBy: question.answer.answeredBy,
            answeredAt: toIsoString(question.answer.answeredAt) ?? now.toISOString(),
          }
        : undefined,
      {
        assignedTo: question.assignedTo,
        reporterId: incident?.staffId,
        reporterName: incident?.staffName,
        reporterRole: incident?.questions?.[0]?.metadata?.reporterRole,
        source: question.source,
        generatedBy: question.generatedBy,
      },
    ).catch((error) => {
      console.error("[DB] Failed to vectorize question", question.id, error)
    })
  }

  return serializeQuestion(question)
}

export async function answerQuestion(
  incidentId: string,
  facilityId: string,
  questionId: string,
  answer: Answer,
): Promise<Question | null> {
  await ensureDatabase()
  if (!facilityId) return null

  const answeredAt = toDateOrUndefined(answer.answeredAt) ?? new Date()

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOneAndUpdate(
      { id: incidentId, facilityId, "questions.id": questionId },
      {
        $set: {
          "questions.$.answer": {
            ...answer,
            answeredAt,
          },
          "questions.$.vectorizedAt": answeredAt,
          updatedAt: new Date(),
        },
      },
      { new: true, lean: true },
    ),
  )

  const question = incident?.questions?.find((q: any) => q.id === questionId)
  if (!question) {
    return null
  }

  if (isOpenAIConfigured() && question.answer) {
    getQuestionEmbedding(
      incidentId,
      questionId,
      question.questionText,
      question.askedBy,
      toIsoString(question.askedAt) ?? answeredAt.toISOString(),
      {
        id: question.answer.id,
        text: question.answer.answerText,
        answeredBy: question.answer.answeredBy,
        answeredAt: toIsoString(question.answer.answeredAt) ?? answeredAt.toISOString(),
      },
      {
        assignedTo: question.assignedTo,
        reporterId: incident?.staffId,
        reporterName: incident?.staffName,
        reporterRole: incident?.questions?.[0]?.metadata?.reporterRole,
        source: question.source,
        generatedBy: question.generatedBy,
      },
    ).catch((error) => {
      console.error("[DB] Auto-vectorization failed (non-critical):", error)
    })
  }

  const idt = question.metadata?.idt === true
  const idtTarget = (question.metadata?.idtTargetUserId as string | undefined) ?? undefined
  if (idt && idtTarget && question.answer) {
    await IncidentModel.updateOne(
      { id: incidentId, facilityId, "idtTeam.userId": idtTarget },
      {
        $set: {
          "idtTeam.$[m].status": "answered",
          "idtTeam.$[m].response": question.answer.answerText,
          "idtTeam.$[m].respondedAt": answeredAt,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "m.userId": idtTarget }] },
    )
      .exec()
      .catch((error) => {
        console.error("[DB] idtTeam sync after answer (non-critical):", error)
      })
  }

  return serializeQuestion(question)
}

export async function deleteQuestion(
  incidentId: string,
  facilityId: string,
  questionId: string,
): Promise<boolean> {
  await ensureDatabase()
  if (!facilityId) return false

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id: incidentId, facilityId }).lean().exec(),
  )
  if (!incident) {
    return false
  }

  const question = incident.questions?.find((q: any) => q.id === questionId)
  if (!question || question.answer) {
    return false
  }

  const result = await IncidentModel.updateOne(
    { id: incidentId, facilityId },
    {
      $pull: { questions: { id: questionId } },
      $set: { updatedAt: new Date() },
    },
  )

  return result.modifiedCount > 0
}

export interface CreateIncidentFromReportInput {
  facilityId: string
  organizationId?: string
  title?: string
  narrative: string
  /** When known (e.g. from resident search on staff report), links the incident to the facility resident record. */
  residentId?: string
  residentName: string
  residentRoom: string
  residentState?: string
  environmentNotes?: string
  reportedById: string
  reportedByName: string
  reportedByRole: UserRole
  priority?: "low" | "medium" | "high" | "urgent"
  enhancedNarrative?: string
}

function defaultPhase2SectionsForCreate() {
  return {
    contributingFactors: { status: "not_started" as const, factors: [] as string[] },
    rootCause: { status: "not_started" as const },
    interventionReview: { status: "not_started" as const, reviewedInterventions: [] as const },
    newIntervention: { status: "not_started" as const, interventions: [] as const },
  }
}

export async function createIncidentFromReport(input: CreateIncidentFromReportInput): Promise<Incident> {
  await ensureDatabase()
  if (!input.facilityId) {
    throw new Error("createIncidentFromReport: facilityId is required")
  }

  const now = new Date()
  const incidentId = `inc-${Date.now()}`

  const initialReport: IncidentInitialReport = {
    capturedAt: now.toISOString(),
    narrative: input.narrative,
    residentState: input.residentState,
    environmentNotes: input.environmentNotes,
    enhancedNarrative: input.enhancedNarrative,
    recordedById: input.reportedById,
    recordedByName: input.reportedByName,
    recordedByRole: input.reportedByRole,
  }

  const baseQuestionProps = {
    reporterId: input.reportedById,
    reporterName: input.reportedByName,
    reporterRole: input.reportedByRole,
  }

  const seedQuestions = VOICE_SEED_QUESTIONS.flatMap((seed, index) => {
    const value = (initialReport as any)[seed.key]
    if (!value) return []

    const questionId = `q-${Date.now()}-${index}`
    const answerId = `a-${Date.now()}-${index}`

    return [
      {
        id: questionId,
        incidentId,
        questionText: seed.prompt,
        askedBy: input.reportedById,
        askedByName: input.reportedByName,
        askedAt: now,
        source: "voice-report" as Question["source"],
        generatedBy: "reporter-agent",
        metadata: {
          ...baseQuestionProps,
          createdVia: "voice" as const,
        },
        answer: {
          id: answerId,
          questionId,
          answerText: value,
          answeredBy: input.reportedById,
          answeredAt: now,
          method: "voice" as const,
        },
      },
    ]
  })

  const incidentDoc = await IncidentModel.create({
    id: incidentId,
    facilityId: input.facilityId,
    organizationId: input.organizationId,
    title: input.title || `${input.residentName} Incident`,
    description: input.narrative || "Incident reported via voice agent.",
    status: "open",
    priority: input.priority || "medium",
    staffId: input.reportedById,
    staffName: input.reportedByName,
    ...(input.residentId ? { residentId: input.residentId } : {}),
    residentName: input.residentName,
    residentRoom: input.residentRoom,
    createdAt: now,
    updatedAt: now,
    questions: seedQuestions,
    initialReport: {
      ...initialReport,
      capturedAt: now,
    },
    investigation: {
      status: "not-started",
    },
    tier2QuestionsGenerated: 0,
    questionsAnswered: 0,
    questionsDeferred: 0,
    questionsMarkedUnknown: 0,
    activeDataCollectionSeconds: 0,
    completenessAtTier1Complete: 0,
    completenessAtSignoff: 0,
    dataPointsPerQuestion: [],
    phase2Sections: defaultPhase2SectionsForCreate(),
    auditTrail: [],
  })

  const incident = serializeIncident(incidentDoc.toJSON())

  if (isOpenAIConfigured()) {
    Promise.all(
      incident.questions.map((question) =>
        getQuestionEmbedding(
          incident.id,
          question.id,
          question.questionText,
          question.askedBy,
          question.askedAt,
          question.answer
            ? {
                id: question.answer.id,
                text: question.answer.answerText,
                answeredBy: question.answer.answeredBy,
                answeredAt: question.answer.answeredAt,
              }
            : undefined,
          {
            assignedTo: question.assignedTo,
            reporterId: incident.staffId,
            reporterName: incident.staffName,
            reporterRole: input.reportedByRole,
            source: question.source,
            generatedBy: question.generatedBy,
          },
        ).catch((error) => {
          console.error("[DB] Failed to vectorize seed question", question.id, error)
        }),
      ),
    ).catch((error) => console.error("[DB] Seed vectorization batch failed", error))
  }

  return incident
}

export interface QueueInvestigationQuestionsInput {
  facilityId: string
  incidentId: string
  questions: Array<{
    questionText: string
    assignedTo?: string[]
    source?: "voice-report" | "ai-generated" | "manual"
    generatedBy?: string
    askedBy?: string
    askedByName?: string
    priority?: {
      phase: "initial" | "follow-up" | "final-critical"
      order: number
      isCritical: boolean
      goldStandardField?: string
    }
  }>
  investigatorId?: string
  investigatorName?: string
  generatedBy?: string
  askedById?: string
  askedByName?: string
  phase?: "initial" | "follow-up" | "final-critical"
}

export async function queueInvestigationQuestions(
  input: QueueInvestigationQuestionsInput,
): Promise<Question[]> {
  await ensureDatabase()
  if (!input.facilityId) {
    throw new Error("queueInvestigationQuestions: facilityId is required")
  }

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOne({ id: input.incidentId, facilityId: input.facilityId }).lean().exec(),
  )
  if (!incident) {
    throw new Error(`Incident ${input.incidentId} not found`)
  }

  const reporterRole =
    (incident.investigation as { reporterRole?: UserRole } | undefined)?.reporterRole ??
    (await getUserById(incident.staffId))?.role ??
    "staff"
  const timestamp = new Date()
  const generatedBy = input.generatedBy || "investigation-agent"
  const askedBy = input.askedById || "investigation-agent"

  const newQuestions = input.questions.map((item, index) => {
    const questionId = `q-${Date.now()}-${index}`
    return {
      id: questionId,
      incidentId: incident.id,
      questionText: item.questionText,
      askedBy: item.askedBy || askedBy,
      askedByName: item.askedByName || input.askedByName,
      askedAt: timestamp,
      assignedTo: item.assignedTo,
      source: item.source || ("ai-generated" as const),
      generatedBy: item.generatedBy || generatedBy,
      metadata: {
        reporterId: incident.staffId,
        reporterName: incident.staffName,
        reporterRole,
        assignedStaffIds: item.assignedTo,
        createdVia: "system" as const,
      },
      priority: item.priority || {
        phase: input.phase || "follow-up",
        order: index,
        isCritical: false,
      },
    }
  })

  await IncidentModel.updateOne(
    { id: input.incidentId, facilityId: input.facilityId },
    {
      $push: { questions: { $each: newQuestions } },
      $set: {
        updatedAt: timestamp,
        investigation: {
          ...(incident.investigation ?? {}),
          status: "in-progress",
          startedAt: incident.investigation?.startedAt ?? timestamp,
        },
      },
    },
  )

  if (isOpenAIConfigured()) {
    Promise.all(
      newQuestions.map((question) =>
        getQuestionEmbedding(
          incident.id,
          question.id,
          question.questionText,
          question.askedBy,
          timestamp.toISOString(),
          undefined,
          {
            assignedTo: question.assignedTo,
            reporterId: incident.staffId,
            reporterName: incident.staffName,
            reporterRole,
            source: question.source,
            generatedBy: question.generatedBy,
          },
        )
          .then(() => {
            console.log("[DB] Vectorized question:", question.id)
          })
          .catch((error) => console.error("[DB] Failed to vectorize queued question", question.id, error)),
      ),
    ).catch((error) => console.error("[DB] Queue vectorization batch failed", error))
  }

  return newQuestions.map(serializeQuestion)
}

export async function markInvestigationComplete(
  incidentId: string,
  facilityId: string,
  updates: Partial<Omit<IncidentInvestigationMetadata, "status">> = {},
): Promise<Incident | null> {
  await ensureDatabase()
  if (!facilityId) return null

  const incident = leanOne<IncidentDocument>(
    await IncidentModel.findOneAndUpdate(
      { id: incidentId, facilityId },
      {
        $set: {
          investigation: {
            ...(updates ?? {}),
            status: "completed" as InvestigationStatus,
            completedAt: toDateOrUndefined(updates.completedAt) ?? new Date(),
          },
          updatedAt: new Date(),
        },
      },
      { new: true, lean: true },
    ),
  )

  return incident ? serializeIncident(incident) : null
}

type CreateNotificationInput = Omit<IncidentNotification, "id" | "createdAt" | "readAt"> & { id?: string }

export async function createNotification(input: CreateNotificationInput): Promise<IncidentNotification> {
  await ensureDatabase()

  const notification = await NotificationModel.create({
    id: input.id || `notif-${Date.now()}`,
    incidentId: input.incidentId,
    type: input.type,
    message: input.message,
    createdAt: new Date(),
    targetUserId: input.targetUserId,
  })

  return serializeNotification(notification.toJSON())
}

export async function getNotificationsForUser(userId: string): Promise<IncidentNotification[]> {
  await ensureDatabase()
  const notifications = await NotificationModel.find({ targetUserId: userId }).lean().exec()
  return notifications.map(serializeNotification)
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await ensureDatabase()
  await NotificationModel.updateOne({ id: notificationId }, { $set: { readAt: new Date() } })
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function isDatabaseInitialized(): boolean {
  return isInitialized
}

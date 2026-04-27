import { NextResponse } from "next/server"
import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel, { INCIDENT_PHASES } from "@/backend/src/models/incident.model"
import { withAdminAuth } from "@/lib/api-handler"
import { isEffectiveAdminFacilityError, resolveEffectiveAdminFacility } from "@/lib/effective-admin-facility"
import { actorNameFromUser, logActivity } from "@/lib/activity-logger"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth"
import { createIncidentFromReport, addQuestionToIncident, getUserById, resolveUserBusinessIdForReport } from "@/lib/db"
import { mapIncidentDocToSummary } from "@/lib/map-incident-summary"
import { getQuestionEmbedding } from "@/lib/embeddings"
import { isOpenAIConfigured } from "@/lib/openai"
import type { IncidentPhase } from "@/lib/types/incident-summary"

function parsePhaseList(raw: string | null): IncidentPhase[] | null {
  if (!raw || !raw.trim()) return null
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as IncidentPhase[]
  const allowed = new Set(INCIDENT_PHASES as readonly string[])
  const filtered = parts.filter((p) => allowed.has(p))
  return filtered.length ? filtered : null
}

export const GET = withAdminAuth(async (request, { currentUser }) => {
  try {
    const url = new URL(request.url)
    const phaseRaw = url.searchParams.get("phase")
    const daysRaw = url.searchParams.get("days")
    const hasInjuryRaw = url.searchParams.get("hasInjury")

    const resolved = await resolveEffectiveAdminFacility(request, currentUser)
    if (isEffectiveAdminFacilityError(resolved)) return resolved.error
    const effectiveFacilityId = resolved.facilityId

    await connectMongo()

    const filter: Record<string, unknown> = { facilityId: effectiveFacilityId }

    const residentIdQ = (url.searchParams.get("residentId") ?? "").trim()
    if (residentIdQ) {
      filter.residentId = residentIdQ
    }

    const phases = parsePhaseList(phaseRaw)
    if (phases) {
      filter.phase = phases.length === 1 ? phases[0] : { $in: phases }
    }

    const days = daysRaw != null ? Number.parseInt(daysRaw, 10) : NaN
    if (!Number.isNaN(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const closedOnly = phases?.length === 1 && phases[0] === "closed"
      if (closedOnly) {
        // Closed tab: window by when the investigation was locked, not when it was reported (task-06d).
        filter["phaseTransitionTimestamps.phase2Locked"] = { $gte: cutoff }
      } else {
        filter.$expr = {
          $gte: [{ $ifNull: ["$phaseTransitionTimestamps.phase1Started", "$createdAt"] }, cutoff],
        }
      }
    }

    if (hasInjuryRaw === "true") {
      filter.$or = [{ hasInjury: true }, { "redFlags.hasInjury": true }]
    }

    const raw = await IncidentModel.find(filter).sort({ updatedAt: -1 }).lean().exec()
    const incidents = raw.map((doc) => mapIncidentDocToSummary(doc as unknown as Record<string, unknown>))

    return NextResponse.json({ incidents, total: incidents.length })
  } catch (error) {
    console.error("[api/incidents GET]", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
})

export async function POST(request: Request) {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) return unauthorizedResponse()
  try {
    const body = await request.json()
    const {
      title,
      description,
      residentId: residentIdBody,
      residentName,
      residentRoom,
      staffId,
      staffName,
      priority = "medium",
      questions = [], // Array of { questionText, answerText }
    } = body

    if (staffId !== sessionUser.clerkUserId && !sessionUser.isWaikSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Validate required fields
    if (!title || !description || !residentName || !staffId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, residentName, staffId" },
        { status: 400 },
      )
    }

    if (!sessionUser.facilityId) {
      return NextResponse.json({ error: "No facility assigned to user" }, { status: 400 })
    }

    const reportedById = await resolveUserBusinessIdForReport(String(staffId))
    const reporter = (await getUserById(reportedById)) || undefined

    const residentId =
      typeof residentIdBody === "string" && residentIdBody.trim() ? residentIdBody.trim() : undefined

    const incident = await createIncidentFromReport({
      facilityId: sessionUser.facilityId,
      organizationId: sessionUser.organizationId,
      title,
      narrative: description,
      residentId,
      residentName,
      residentRoom,
      residentState: undefined,
      environmentNotes: undefined,
      reportedById,
      reportedByName: staffName || reporter?.name || reportedById,
      reportedByRole: reporter?.role || "staff",
      priority,
    })

    logActivity({
      userId: sessionUser.userId,
      userName: actorNameFromUser(sessionUser),
      role: sessionUser.roleSlug,
      facilityId: sessionUser.facilityId,
      action: "incident_created",
      resourceType: "incident",
      resourceId: incident.id,
      metadata: { title },
      req: request,
    })

    console.log("[v0] Created incident:", incident.id, "with", questions.length, "Q&A pairs")

    // Append any additional answered questions provided in the payload (legacy flow support)
    if (Array.isArray(questions) && questions.length > 0) {
      const now = new Date().toISOString()

      await Promise.all(
        questions.map(async (q, index) => {
          if (!q?.questionText) return

          const questionId = `q-${Date.now()}-${index}`
          const answerId = `a-${Date.now()}-${index}`

          const question = {
            id: questionId,
            incidentId: incident.id,
            questionText: q.questionText,
            askedBy: reportedById,
            askedByName: staffName || reporter?.name,
            askedAt: now,
            assignedTo: q.assignedTo,
            source: "voice-report" as const,
            generatedBy: "reporter-agent",
            metadata: {
              reporterId: reportedById,
              reporterName: staffName || reporter?.name || reportedById,
              reporterRole: reporter?.role || "staff",
              createdVia: "voice" as const,
            },
            answer: {
              id: answerId,
              questionId,
              answerText: q.answerText || "",
              answeredBy: reportedById,
              answeredAt: now,
              method: "voice" as const,
            },
          }

          await addQuestionToIncident(incident.id, sessionUser.facilityId, question)

          if (isOpenAIConfigured()) {
            getQuestionEmbedding(
              incident.id,
              questionId,
              question.questionText,
              question.askedBy,
              question.askedAt,
              {
                id: answerId,
                text: question.answer!.answerText,
                answeredBy: question.answer!.answeredBy,
                answeredAt: question.answer!.answeredAt,
              },
              {
                assignedTo: question.assignedTo,
                reporterId: reportedById,
                reporterName: staffName || reporter?.name || reportedById,
                reporterRole: reporter?.role || "staff",
                source: question.source,
                generatedBy: question.generatedBy,
              },
            ).catch((err) => console.error("[v0] Legacy vectorization failed", err))
          }
        }),
      )
    }

    // AUTO-VECTORIZE all questions and answers in background
    // This makes Intelligence searchable immediately!
    if (isOpenAIConfigured()) {
      console.log("[v0] Auto-vectorizing incident questions for:", incident.id)

      Promise.all(
        incident.questions.map((q) =>
          getQuestionEmbedding(
            incident.id,
            q.id,
            q.questionText,
            q.askedBy,
            q.askedAt,
            q.answer
              ? {
                  id: q.answer.id,
                  text: q.answer.answerText,
                  answeredBy: q.answer.answeredBy,
                  answeredAt: q.answer.answeredAt,
                }
              : undefined,
            {
              assignedTo: q.assignedTo,
              reporterId: incident.staffId,
              reporterName: incident.staffName,
              reporterRole: reporter?.role || "staff",
              source: q.source,
              generatedBy: q.generatedBy,
            },
          ).catch((err) => {
            console.error("[v0] Error vectorizing question", q.id, err)
          }),
        ),
      ).catch((err) => console.error("[v0] Error vectorizing Q&A (non-critical):", err))
    }

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating incident:", error)
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 })
  }
}

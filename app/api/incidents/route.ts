import { NextResponse } from "next/server"
import { getIncidents, createIncidentFromReport, addQuestionToIncident, getUserById } from "@/lib/db"
import { getQuestionEmbedding } from "@/lib/embeddings"
import { isOpenAIConfigured } from "@/lib/openai"

export async function GET() {
  try {
    console.log("[v0] [API] Fetching all incidents for admin dashboard...")
    const incidents = getIncidents()
    console.log("[v0] [API] ✅ Fetched", incidents.length, "incidents")
    console.log("[v0] [API] Incident IDs:", incidents.map((i) => i.id).join(", "))
    return NextResponse.json(incidents)
  } catch (error) {
    console.error("[v0] Error fetching incidents:", error)
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      residentName,
      residentRoom,
      staffId,
      staffName,
      priority = "medium",
      questions = [], // Array of { questionText, answerText }
    } = body

    // Validate required fields
    if (!title || !description || !residentName || !staffId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, residentName, staffId" },
        { status: 400 },
      )
    }

    // Create incident with questions and answers
    const reporter = (await getUserById(staffId)) || undefined

    const incident = await createIncidentFromReport({
      title,
      narrative: description,
      residentName,
      residentRoom,
      residentState: undefined,
      environmentNotes: undefined,
      reportedById: staffId,
      reportedByName: staffName || reporter?.name || staffId,
      reportedByRole: reporter?.role || "staff",
      priority,
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
            askedBy: staffId,
            askedByName: staffName || reporter?.name,
            askedAt: now,
            assignedTo: q.assignedTo,
            source: "voice-report" as const,
            generatedBy: "reporter-agent",
            metadata: {
              reporterId: staffId,
              reporterName: staffName || reporter?.name || staffId,
              reporterRole: reporter?.role || "staff",
              createdVia: "voice" as const,
            },
            answer: {
              id: answerId,
              questionId,
              answerText: q.answerText || "",
              answeredBy: staffId,
              answeredAt: now,
              method: "voice" as const,
            },
          }

          await addQuestionToIncident(incident.id, question)

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
                reporterId: staffId,
                reporterName: staffName || reporter?.name || staffId,
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

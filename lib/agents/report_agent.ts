import { createIncidentFromReport, createNotification, getUsers } from "../db"
import type { IncidentNotification, UserRole } from "../types"
import { generateChatCompletion, isOpenAIConfigured } from "../openai"
import { runInvestigationAgent } from "./investigation_agent"

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const formatInlineHtml = (value: string) =>
  escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

const formatSummaryAsHtml = (value: string) => {
  const blocks = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  const htmlBlocks = blocks.map((block) => {
    const lines = block
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) return ""

    const bulletLines = lines.filter((line) => line.startsWith("- "))
    const nonBulletLines = lines.filter((line) => !line.startsWith("- "))

    const parts: string[] = []

    if (nonBulletLines.length > 0) {
      parts.push(`<p>${formatInlineHtml(nonBulletLines.join(" "))}</p>`)
    }

    if (bulletLines.length > 0) {
      const items = bulletLines
        .map((line) => `<li>${formatInlineHtml(line.slice(2))}</li>`)
        .join("")
      parts.push(`<ul>${items}</ul>`)
    }

    return parts.join("")
  })

  const html = htmlBlocks.join("")
  return html.length > 0 ? html : `<p>${escapeHtml(value)}</p>`
}

export type ReportAgentEvent =
  | { type: "log"; node: string; message: string }
  | { type: "incident_created"; node: "create_incident_and_handoff"; incidentId: string }
  | { type: "notification"; node: "create_incident_and_handoff"; notification: IncidentNotification }
  | { type: "enhanced_narrative"; node: "enhance_narrative"; content: string }
  | { type: "investigation_progress"; node: string; message: string }
  | { type: "error"; node: string; error: string }
  | { type: "complete"; node: "node_exit_message"; incidentId: string }

export interface ReportAgentInput {
  residentName: string
  residentRoom: string
  narrative: string
  residentState?: string
  environmentNotes?: string
  reportedById: string
  reportedByName: string
  reportedByRole: UserRole
}

export async function* runReportAgent(input: ReportAgentInput): AsyncGenerator<ReportAgentEvent> {
  try {
    yield { type: "log", node: "start_report", message: "Initializing reporter agent" }

    const requiredFields: Array<keyof ReportAgentInput> = [
      "residentName",
      "residentRoom",
      "narrative",
      "reportedById",
      "reportedByName",
      "reportedByRole",
    ]

    const missing = requiredFields.filter((field) => !input[field])
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`)
    }

    yield {
      type: "log",
      node: "capture_narrative",
      message: "Captured resident details and narrative description",
    }

    let enhancedNarrative: string | undefined

    if (isOpenAIConfigured()) {
      yield {
        type: "log",
        node: "enhance_narrative",
        message: "Enhancing narrative with AI summary",
      }

      try {
        const summary = await generateEnhancedNarrative({
          residentName: input.residentName,
          narrative: input.narrative,
          residentState: input.residentState,
          environmentNotes: input.environmentNotes,
        })

        if (summary) {
          enhancedNarrative = summary
          yield {
            type: "enhanced_narrative",
            node: "enhance_narrative",
            content: summary,
          }
        } else {
          yield {
            type: "log",
            node: "enhance_narrative",
            message: "AI returned empty summary; keeping original narrative only",
          }
        }
      } catch (enhancementError) {
        yield {
          type: "error",
          node: "enhance_narrative",
          error: `Failed to enhance narrative: ${String(enhancementError)}`,
        }
      }
    } else {
      yield {
        type: "log",
        node: "enhance_narrative",
        message: "OpenAI not configured; skipping enhanced narrative step",
      }
    }

    yield {
      type: "log",
      node: "create_incident_and_handoff",
      message: "Creating incident record and seeding initial report",
    }

    const incident = await createIncidentFromReport({
      title: `${input.residentName} Incident Report`,
      narrative: input.narrative,
      residentName: input.residentName,
      residentRoom: input.residentRoom,
      residentState: input.residentState,
      environmentNotes: input.environmentNotes,
      reportedById: input.reportedById,
      reportedByName: input.reportedByName,
      reportedByRole: input.reportedByRole,
      enhancedNarrative,
    })

    yield {
      type: "incident_created",
      node: "create_incident_and_handoff",
      incidentId: incident.id,
    }

    try {
      const users = await getUsers()
      const admins = users.filter((user) => user.role === "admin")

      if (admins.length > 0) {
        for (const admin of admins) {
          const notification = await createNotification({
            incidentId: incident.id,
            targetUserId: admin.id,
            type: "incident-created",
            message: `New incident reported for ${incident.residentName} (Room ${incident.residentRoom}).`,
          })

          yield {
            type: "notification",
            node: "create_incident_and_handoff",
            notification,
          }
        }
      }
    } catch (notificationError) {
      yield {
        type: "error",
        node: "create_incident_and_handoff",
        error: `Failed to create admin notifications: ${String(notificationError)}`,
      }
    }

    yield {
      type: "log",
      node: "create_incident_and_handoff",
      message: "Running investigator agent to generate follow-up questions",
    }

    for await (const event of runInvestigationAgent(incident.id)) {
      switch (event.type) {
        case "log":
          yield {
            type: "investigation_progress",
            node: `investigation:${event.node}`,
            message: event.message,
          }
          break
        case "classification":
          yield {
            type: "investigation_progress",
            node: "investigation:classify_subtype",
            message: `Subtype classified as ${event.subtype}`,
          }
          break
        case "questions_generated":
          yield {
            type: "investigation_progress",
            node: "investigation:queue_questions",
            message: `Queued ${event.count} follow-up questions for staff`,
          }
          break
        case "error":
          yield {
            type: "error",
            node: `investigation:${event.node}`,
            error: event.error,
          }
          break
        case "complete":
          yield {
            type: "log",
            node: "investigation:complete",
            message: "Investigation agent completed",
          }
          break
        default:
          break
      }
    }

    yield {
      type: "complete",
      node: "node_exit_message",
      incidentId: incident.id,
    }
  } catch (error) {
    yield {
      type: "error",
      node: "report_agent",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function generateEnhancedNarrative(args: {
  residentName: string
  narrative: string
  residentState?: string
  environmentNotes?: string
}): Promise<string | null> {
  const { residentName, narrative, residentState, environmentNotes } = args

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a clinical documentation assistant. Rewrite staff-provided incident notes into a concise, professional summary. Highlight resident condition, key events, observed injuries, and environmental factors. Avoid speculation or new facts. Return clear, professional language without markdown.",
    },
    {
      role: "user" as const,
      content: `Resident Name: ${residentName || "Unknown"}

Incident Narrative:
${narrative || "(not provided)"}

Resident State:
${residentState || "(not provided)"}

Environment / Room Notes:
${environmentNotes || "(not provided)"}

Please produce a polished summary (2-3 paragraphs max) and, when helpful, follow with concise bullet lists for observations or next steps. Do not use markdown syntax.`,
    },
  ]

  const response = await generateChatCompletion(messages, { temperature: 0.2, maxTokens: 400 })
  const summary = response.choices?.[0]?.message?.content?.trim()
  if (!summary) return null

  try {
    return formatSummaryAsHtml(summary)
  } catch (error) {
    console.warn("[Report Agent] Failed to format enhanced narrative", error)
    return `<p>${escapeHtml(summary)}</p>`
  }
}


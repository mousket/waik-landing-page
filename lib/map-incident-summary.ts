import { INCIDENT_PHASES } from "@/backend/src/models/incident.model"
import type { IdtTeamMember, IncidentPhase, IncidentSummary, Phase2SectionStatus } from "@/lib/types/incident-summary"

function toIso(d: Date | string | null | undefined): string | null {
  if (d == null) return null
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

function coercePhase(p: string | undefined): IncidentPhase {
  if (p && (INCIDENT_PHASES as readonly string[]).includes(p)) {
    return p as IncidentPhase
  }
  return "phase_1_in_progress"
}

function coerceSectionStatus(s: unknown): Phase2SectionStatus {
  if (s === "not_started" || s === "in_progress" || s === "complete") return s
  return "not_started"
}

function mapIdtTeam(raw: unknown): IdtTeamMember[] {
  if (!Array.isArray(raw)) return []
  return raw.map((m) => {
    const row = m as Record<string, unknown>
    const status = row.status === "answered" ? "answered" : "pending"
    return {
      userId: String(row.userId ?? ""),
      name: String(row.name ?? ""),
      role: String(row.role ?? ""),
      status,
      questionSent: row.questionSent != null ? String(row.questionSent) : null,
      questionSentAt: toIso(row.questionSentAt as Date | string | undefined),
      response: row.response != null ? String(row.response) : null,
      respondedAt: toIso(row.respondedAt as Date | string | undefined),
    }
  })
}

function defaultPhase2Sections(): IncidentSummary["phase2Sections"] {
  return {
    contributingFactors: { status: "not_started" },
    rootCause: { status: "not_started" },
    interventionReview: { status: "not_started" },
    newIntervention: { status: "not_started" },
  }
}

/**
 * Maps a Mongo lean incident document to the admin GET /api/incidents contract (no resident name).
 */
export function mapIncidentDocToSummary(doc: Record<string, unknown>): IncidentSummary {
  const initialReport = doc.initialReport as Record<string, unknown> | undefined
  const pts = doc.phaseTransitionTimestamps as Record<string, unknown> | undefined
  const p2 = doc.phase2Sections as Record<string, Record<string, unknown>> | undefined

  const phase1Started = toIso(pts?.phase1Started as Date | string | undefined)
  const created = toIso(doc.createdAt as Date | string | undefined) ?? new Date().toISOString()
  const startedAt = phase1Started ?? created

  const hasInjury = Boolean(doc.hasInjury || (doc.redFlags as Record<string, unknown> | undefined)?.hasInjury)

  const incidentType = String(doc.incidentType ?? doc.subType ?? "incident")

  const reportedByName = String(
    initialReport?.recordedByName ?? doc.staffName ?? "Unknown",
  )
  const reportedByRole = String(initialReport?.recordedByRole ?? "staff")

  const phase2Sections: IncidentSummary["phase2Sections"] = p2
    ? {
        contributingFactors: {
          status: coerceSectionStatus((p2.contributingFactors as { status?: unknown } | undefined)?.status),
        },
        rootCause: { status: coerceSectionStatus((p2.rootCause as { status?: unknown } | undefined)?.status) },
        interventionReview: {
          status: coerceSectionStatus((p2.interventionReview as { status?: unknown } | undefined)?.status),
        },
        newIntervention: {
          status: coerceSectionStatus((p2.newIntervention as { status?: unknown } | undefined)?.status),
        },
      }
    : defaultPhase2Sections()

  return {
    id: String(doc.id),
    facilityId: String(doc.facilityId ?? ""),
    residentRoom: String(doc.residentRoom ?? ""),
    incidentType,
    hasInjury,
    phase: coercePhase(doc.phase as string | undefined),
    staffId: String(doc.staffId ?? ""),
    reportedByName,
    reportedByRole,
    startedAt,
    phase1SignedAt: toIso(pts?.phase1Signed as Date | string | undefined),
    phase2ClaimedAt: toIso(pts?.phase2Claimed as Date | string | undefined),
    phase2LockedAt: toIso(pts?.phase2Locked as Date | string | undefined),
    completenessAtSignoff: Number(doc.completenessAtSignoff ?? 0),
    completenessScore: Number(doc.completenessScore ?? 0),
    investigatorId: doc.investigatorId != null ? String(doc.investigatorId) : null,
    investigatorName: doc.investigatorName != null ? String(doc.investigatorName) : null,
    idtTeam: mapIdtTeam(doc.idtTeam),
    phase2Sections,
  }
}

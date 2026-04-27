import connectMongo from "@/backend/src/lib/mongodb"
import AssessmentModel from "@/backend/src/models/assessment.model"
import IncidentModel from "@/backend/src/models/incident.model"
import InterventionModel from "@/backend/src/models/intervention.model"
import NoteModel from "@/backend/src/models/note.model"
import type { CurrentUser } from "@/lib/types"
import { isAdminRole } from "@/lib/waik-roles"

const ADMIN_NOTES: readonly string[] = ["admin_only", "sealed"]

function noteIsVisible(visibility: string, user: CurrentUser): boolean {
  if (isAdminRole(String(user.roleSlug || ""))) {
    return true
  }
  if (ADMIN_NOTES.includes(visibility)) {
    return false
  }
  return true
}

export function mapIncidentLean(x: {
  id?: string
  title?: string
  phase?: string
  completenessScore?: number
  createdAt?: Date
  staffName?: string
}): {
  id: string
  title: string
  phase: string
  completenessScore: number
  createdAt: string | null
  staffName: string
} {
  const createdAt = x.createdAt ? new Date(x.createdAt) : null
  return {
    id: String(x.id ?? ""),
    title: String(x.title ?? ""),
    phase: String(x.phase ?? ""),
    completenessScore: Math.round(Number(x.completenessScore ?? 0)),
    createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString() : null,
    staffName: String(x.staffName ?? ""),
  }
}

export async function fetchResidentDetail(args: { facilityId: string; residentId: string; user: CurrentUser }) {
  await connectMongo()
  const ResidentModel = (await import("@/backend/src/models/resident.model")).default
  const r = await ResidentModel.findOne({ id: args.residentId, facilityId: args.facilityId }).lean().exec()
  if (!r || Array.isArray(r)) {
    return { error: 404 as const, body: { error: "Resident not found" } as const }
  }

  const [incidentRows, asRows, interventionRows, noteAll] = await Promise.all([
    IncidentModel.find({ facilityId: args.facilityId, residentId: args.residentId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec(),
    AssessmentModel.find({ facilityId: args.facilityId, residentId: args.residentId })
      .sort({ conductedAt: -1 })
      .limit(200)
      .lean()
      .exec(),
    InterventionModel.find({ facilityId: args.facilityId, residentId: args.residentId })
      .lean()
      .exec(),
    NoteModel.find({ facilityId: args.facilityId })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
      .exec(),
  ])

  const iIds = (incidentRows as { id?: string }[]).map((i) => String(i.id))
  const aIds = (asRows as { id?: string }[]).map((a) => String(a.id))

  const relNotes = (noteAll as Array<Record<string, unknown>>).filter((n) => {
    if (n.parentId == null) {
      return false
    }
    if (n.parentType === "resident" && n.parentId === args.residentId) {
      return true
    }
    if (n.parentType === "incident" && iIds.includes(String(n.parentId))) {
      return true
    }
    if (n.parentType === "assessment" && aIds.includes(String(n.parentId))) {
      return true
    }
    return false
  })

  const visNotes = relNotes
    .filter((n) => {
      return noteIsVisible(String(n.visibility ?? "team"), args.user)
    })
    .map((n) => ({
      id: String(n.id),
      parentType: String(n.parentType),
      parentId: String(n.parentId),
      content: String(n.content),
      authorName: String(n.authorName ?? ""),
      authorRole: String(n.authorRole ?? ""),
      visibility: String(n.visibility ?? "team"),
      isFlagged: Boolean(n.isFlagged),
      createdAt: n.createdAt ? new Date(n.createdAt as string | Date).toISOString() : new Date().toISOString(),
    }))

  const rawIntv = (interventionRows as Record<string, unknown>[]).sort((a, b) => {
    const ia = Boolean((a as { isActive?: boolean }).isActive)
    const ib = Boolean((b as { isActive?: boolean }).isActive)
    if (ia !== ib) {
      return ia ? -1 : 1
    }
    const pa = (a as { placedAt?: Date }).placedAt
      ? new Date((a as { placedAt: Date }).placedAt).getTime()
      : 0
    const pb = (b as { placedAt?: Date }).placedAt
      ? new Date((b as { placedAt: Date }).placedAt).getTime()
      : 0
    return pb - pa
  })
  const intv = rawIntv.map((i) => ({
    id: String(i.id),
    description: String(i.description ?? ""),
    department: String(i.department ?? ""),
    type: String(i.type ?? ""),
    isActive: Boolean(i.isActive),
    placedAt: i.placedAt ? new Date(i.placedAt as Date).toISOString() : null,
    removedAt: i.removedAt ? new Date(i.removedAt as Date).toISOString() : null,
    triggeringIncidentId: i.triggeringIncidentId != null ? String(i.triggeringIncidentId) : undefined,
    notes: i.notes != null ? String(i.notes) : undefined,
  }))

  const mapResidentIncident = (raw: Record<string, unknown>) => {
    const lean = mapIncidentLean({
      id: String(raw.id ?? ""),
      title: String(raw.title ?? ""),
      phase: String(raw.phase ?? ""),
      completenessScore: Number(raw.completenessScore ?? 0),
      createdAt: raw.createdAt as Date | undefined,
      staffName: String(raw.staffName ?? ""),
    })
    const pts = raw.phaseTransitionTimestamps as Record<string, unknown> | undefined
    const phase1 = pts?.phase1Started
      ? new Date(pts.phase1Started as string | Date).toISOString()
      : null
    const created = raw.createdAt ? new Date(raw.createdAt as string | Date).toISOString() : null
    return {
      ...lean,
      incidentType: String(raw.incidentType ?? raw.subType ?? "incident"),
      startedAt: phase1 ?? created ?? lean.createdAt ?? new Date().toISOString(),
    }
  }

  return {
    resident: r,
    incidents: (incidentRows as Record<string, unknown>[]).map((x) => mapResidentIncident(x)),
    assessments: (asRows as Record<string, unknown>[]).map((a) => ({
      id: String(a.id),
      assessmentType: String(a.assessmentType),
      status: String(a.status),
      completenessScore: Math.round(Number(a.completenessScore ?? 0)),
      conductedAt: a.conductedAt ? new Date(a.conductedAt as Date).toISOString() : null,
      nextDueAt: a.nextDueAt ? new Date(a.nextDueAt as Date).toISOString() : null,
      conductedByName: String(a.conductedByName ?? ""),
    })),
    interventions: intv,
    notes: visNotes,
  }
}

import type { IncidentSummary } from "@/lib/types/incident-summary"
import type { StaffIncidentSummary } from "@/lib/types/staff-incident-summary"

export type IncidentListRow = {
  id: string
  residentName: string
  residentRoom: string
  incidentType: string
  hasInjury: boolean
  phase: IncidentSummary["phase"]
  startedAt: string
  completenessPercent: number
  reporterName: string
}

function coerceCompleteness(primary: number, fallback: number) {
  return Math.max(0, Math.min(100, Math.round(primary || fallback || 0)))
}

export function mapStaffIncidentSummaryToListRow(incident: StaffIncidentSummary): IncidentListRow {
  return {
    id: incident.id,
    residentName: incident.residentName,
    residentRoom: incident.residentRoom,
    incidentType: incident.incidentType,
    hasInjury: incident.hasInjury,
    phase: incident.phase,
    startedAt: incident.startedAt,
    completenessPercent: coerceCompleteness(incident.completenessAtSignoff, incident.completenessScore),
    reporterName: "",
  }
}

export function mapIncidentSummaryToListRow(incident: IncidentSummary): IncidentListRow {
  return {
    id: incident.id,
    residentName: incident.residentName,
    residentRoom: incident.residentRoom,
    incidentType: incident.incidentType,
    hasInjury: incident.hasInjury,
    phase: incident.phase,
    startedAt: incident.startedAt,
    completenessPercent: coerceCompleteness(incident.completenessAtSignoff, incident.completenessScore),
    reporterName: incident.reportedByName,
  }
}

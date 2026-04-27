import type { IncidentSummary } from "@/lib/types/incident-summary"

/** Days from phase 1 sign-off to phase 2 lock (investigation closed). */
export function computeDaysToClose(inc: Pick<IncidentSummary, "phase1SignedAt" | "phase2LockedAt">): number | null {
  if (!inc.phase1SignedAt || !inc.phase2LockedAt) return null
  const ms = new Date(inc.phase2LockedAt).getTime() - new Date(inc.phase1SignedAt).getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

/** Admin data export: matches phase 5 task; optional resident PHI column. */
export function generateAdminIncidentsExportCsv(
  incidents: IncidentSummary[],
  options: { includeResidentName: boolean },
): string {
  const headers = [
    "roomNumber",
    ...(options.includeResidentName ? (["residentName"] as const) : []),
    "incidentType",
    "completenessAtSignoff",
    "phase1SignedAt",
    "phase2LockedAt",
    "reportedBy",
  ]

  const rows = incidents.map((inc) => {
    const cells: string[] = [
      inc.residentRoom,
      ...(options.includeResidentName ? [inc.residentName ?? ""] : []),
      inc.incidentType,
      String(inc.completenessAtSignoff ?? ""),
      inc.phase1SignedAt ?? "",
      inc.phase2LockedAt ?? "",
      inc.reportedByName ?? "",
    ]
    return cells.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
  })
  return [headers.join(","), ...rows].join("\n")
}

/**
 * CSV for closed investigations. Room numbers only — no resident names.
 * @deprecated Prefer generateAdminIncidentsExportCsv for new code.
 */
export function generateClosedIncidentsCsv(incidents: IncidentSummary[]): string {
  const headers = [
    "roomNumber",
    "incidentType",
    "completenessAtSignoff",
    "phase1SignedAt",
    "phase2LockedAt",
    "investigatorName",
    "daysToClose",
  ]

  const rows = incidents.map((inc) => {
    const days = computeDaysToClose(inc)
    const daysToClose = days == null ? "" : String(days)

    const cells = [
      inc.residentRoom,
      inc.incidentType,
      String(inc.completenessAtSignoff ?? ""),
      inc.phase1SignedAt ?? "",
      inc.phase2LockedAt ?? "",
      inc.investigatorName ?? "",
      daysToClose,
    ]

    return cells.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

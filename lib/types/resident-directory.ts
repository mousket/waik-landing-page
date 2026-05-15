export type ResidentDirectoryRow = {
  id: string
  firstName: string
  lastName: string
  roomNumber: string
  careLevel: string
  status?: string
  admissionDate?: string | null
  incidents30d?: number
  lastAssessmentAt?: string | null
  nextDueAt?: string | null
}

export function residentFullName(resident: ResidentDirectoryRow) {
  return `${resident.firstName} ${resident.lastName}`.trim() || "—"
}

export function formatResidentCareLevel(value: string) {
  return (value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatResidentDate(value?: string | null) {
  return value ? value.slice(0, 10) : "—"
}

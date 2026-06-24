import type { ResidentCareLevel, ResidentStatus } from "@/backend/src/models/resident.model"

export const RESIDENT_IMPORT_TEMPLATE_HEADERS =
  "first_name,last_name,room_number,care_level,preferred_name,wing,date_of_birth,admission_date,gender,primary_diagnosis,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,status"

export const RESIDENT_IMPORT_EXAMPLE_ROW =
  "Jane,Doe,101,assisted,Jane,Wing A,01/15/1940,03/01/2024,female,,Mary Doe,555-0100,daughter,active"

export type ResidentImportRowStatus = "valid" | "error" | "duplicate" | "warning"

export type ResidentImportPreviewRow = {
  first_name: string
  last_name: string
  room_number: string
  care_level: ResidentCareLevel
  preferred_name?: string
  wing?: string
  date_of_birth?: string
  admission_date?: string
  gender?: string
  primary_diagnosis?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  status: ResidentStatus
  status_row: ResidentImportRowStatus
  error?: string
}

const CARE_LEVELS: ResidentCareLevel[] = ["independent", "assisted", "memory_care", "skilled_nursing"]
const STATUSES: ResidentStatus[] = ["active", "inactive", "discharged", "on-leave"]
const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const

const REQUIRED = ["first_name", "last_name", "room_number", "care_level"] as const

export function parseImportDate(raw: string): Date | null {
  const s = raw.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) {
    const month = Number(m[1])
    const day = Number(m[2])
    const year = Number(m[3])
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      return null
    }
    return d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function residentKey(first: string, last: string, room: string): string {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}|${room.trim().toLowerCase()}`
}

export function validateResidentImportRows(
  rawRows: Record<string, string>[],
  opts: {
    existingKeys: Set<string>
    roomNamePairs: Set<string>
  },
): ResidentImportPreviewRow[] {
  const seenKeys = new Set<string>()
  const out: ResidentImportPreviewRow[] = []

  for (const raw of rawRows) {
    const first_name = (raw["first_name"] ?? "").trim()
    const last_name = (raw["last_name"] ?? "").trim()
    const room_number = (raw["room_number"] ?? "").trim()
    const care_level_raw = (raw["care_level"] ?? "").trim() as ResidentCareLevel
    const preferred_name = (raw["preferred_name"] ?? "").trim() || undefined
    const wing = (raw["wing"] ?? "").trim() || undefined
    const date_of_birth = (raw["date_of_birth"] ?? "").trim() || undefined
    const admission_date = (raw["admission_date"] ?? "").trim() || undefined
    const gender_raw = (raw["gender"] ?? "").trim().toLowerCase()
    const primary_diagnosis = (raw["primary_diagnosis"] ?? "").trim() || undefined
    const emergency_contact_name = (raw["emergency_contact_name"] ?? "").trim() || undefined
    const emergency_contact_phone = (raw["emergency_contact_phone"] ?? "").trim() || undefined
    const emergency_contact_relationship =
      (raw["emergency_contact_relationship"] ?? "").trim() || undefined
    const status_raw = (raw["status"] ?? "active").trim().toLowerCase() as ResidentStatus

    const partial = {
      first_name,
      last_name,
      room_number,
      care_level: care_level_raw,
      preferred_name,
      wing,
      date_of_birth,
      admission_date,
      gender: gender_raw || undefined,
      primary_diagnosis,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      status: status_raw,
      status_row: "error" as ResidentImportRowStatus,
    }

    if (!first_name || !last_name) {
      out.push({ ...partial, status_row: "error", error: "First and last name are required" })
      continue
    }
    if (!room_number) {
      out.push({ ...partial, status_row: "error", error: "room_number is required" })
      continue
    }
    if (!care_level_raw || !CARE_LEVELS.includes(care_level_raw)) {
      out.push({
        ...partial,
        status_row: "error",
        error: "care_level must be independent, assisted, memory_care, or skilled_nursing",
      })
      continue
    }
    if (date_of_birth && !parseImportDate(date_of_birth)) {
      out.push({ ...partial, status_row: "error", error: "Invalid date_of_birth (use YYYY-MM-DD or MM/DD/YYYY)" })
      continue
    }
    if (admission_date && !parseImportDate(admission_date)) {
      out.push({ ...partial, status_row: "error", error: "Invalid admission_date (use YYYY-MM-DD or MM/DD/YYYY)" })
      continue
    }
    if (gender_raw && !GENDERS.includes(gender_raw as (typeof GENDERS)[number])) {
      out.push({
        ...partial,
        status_row: "error",
        error: "gender must be male, female, other, or prefer_not_to_say",
      })
      continue
    }
    if (status_raw && !STATUSES.includes(status_raw)) {
      out.push({
        ...partial,
        status_row: "error",
        error: "status must be active, inactive, discharged, or on-leave",
      })
      continue
    }

    const status: ResidentStatus = STATUSES.includes(status_raw) ? status_raw : "active"
    const key = residentKey(first_name, last_name, room_number)
    const roomPair = `${room_number.toLowerCase()}|${first_name.toLowerCase()}|${last_name.toLowerCase()}`

    if (opts.existingKeys.has(key) || seenKeys.has(key)) {
      out.push({
        ...partial,
        care_level: care_level_raw,
        status,
        status_row: "duplicate",
        error: seenKeys.has(key) ? "Duplicate row in file" : "Resident already exists (name + room)",
      })
      continue
    }

    seenKeys.add(key)

    let status_row: ResidentImportRowStatus = "valid"
    let error: string | undefined
    if (opts.roomNamePairs.has(roomPair)) {
      status_row = "warning"
      error = "Another resident in this facility has the same room and name"
    }

    out.push({
      first_name,
      last_name,
      room_number,
      care_level: care_level_raw,
      preferred_name,
      wing,
      date_of_birth,
      admission_date,
      gender: gender_raw || undefined,
      primary_diagnosis,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      status,
      status_row,
      error,
    })
  }

  return out
}

export function residentImportMissingHeaders(headers: string[]): string[] {
  return REQUIRED.filter((h) => !headers.includes(h))
}

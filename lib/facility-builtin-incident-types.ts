/** Default incident type keys; always on in the product UI. */
export const BUILTIN_INCIDENT_TYPE_IDS = [
  "fall",
  "medication_error",
  "resident_conflict",
  "wound_injury",
  "abuse_neglect",
] as const

export type BuiltinIncidentTypeId = (typeof BUILTIN_INCIDENT_TYPE_IDS)[number]

const LABEL: Record<string, string> = {
  fall: "Fall",
  medication_error: "Medication error",
  resident_conflict: "Resident conflict",
  wound_injury: "Wound / injury",
  abuse_neglect: "Abuse / neglect",
}

export function builtinIncidentTypeLabel(id: string): string {
  return LABEL[id] ?? id
}

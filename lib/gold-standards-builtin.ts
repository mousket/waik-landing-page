import type { BuiltinIncidentTypeId } from "@/lib/facility-builtin-incident-types"
import { BUILTIN_INCIDENT_TYPE_IDS } from "@/lib/facility-builtin-incident-types"

/** Non-removable default “Gold Standard” lines shown in admin settings. */
const BY_TYPE: Record<BuiltinIncidentTypeId, readonly { id: string; label: string }[]> = {
  fall: [
    { id: "f_resident", label: "Resident and room" },
    { id: "f_time", label: "Date and time" },
    { id: "f_narr", label: "Staff narrative" },
    { id: "f_inj", label: "Injury assessment" },
    { id: "f_vitals", label: "Vital signs" },
  ],
  medication_error: [
    { id: "m_med", label: "Medication and dose" },
    { id: "m_route", label: "Route" },
    { id: "m_witness", label: "Discovery and reporter" },
    { id: "m_response", label: "Immediate response" },
  ],
  resident_conflict: [
    { id: "c_part", label: "Persons involved" },
    { id: "c_place", label: "Location" },
    { id: "c_narr", label: "Narrative" },
    { id: "c_inj", label: "Injury / outcome" },
  ],
  wound_injury: [
    { id: "w_wound", label: "Wound type and location" },
    { id: "w_staging", label: "Tissue and staging" },
    { id: "w_treat", label: "Interventions" },
  ],
  abuse_neglect: [
    { id: "a_legal", label: "Mandated reporting per policy" },
    { id: "a_narr", label: "Objective narrative" },
    { id: "a_safe", label: "Immediate safety steps" },
  ],
}

export function getBuiltinGoldStandardItems(incidentType: string): { id: string; label: string }[] {
  if ((BUILTIN_INCIDENT_TYPE_IDS as readonly string[]).includes(incidentType)) {
    return [...BY_TYPE[incidentType as BuiltinIncidentTypeId]]
  }
  return []
}

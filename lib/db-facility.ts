import {
  createIncidentFromReport,
  getIncidentById,
  getIncidents,
  type CreateIncidentFromReportInput,
} from "@/lib/db"

/**
 * Scoped DB helpers for a single facility (multi-tenant boundary).
 */
export function facilityDb(facilityId: string) {
  return {
    getIncidents: () => getIncidents(facilityId),
    getIncidentById: (id: string) => getIncidentById(id, facilityId),
    createIncidentFromReport: (
      input: Omit<CreateIncidentFromReportInput, "facilityId" | "organizationId"> & {
        organizationId?: string
      },
    ) => createIncidentFromReport({ ...input, facilityId }),
  }
}

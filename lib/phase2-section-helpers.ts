import type { IncidentPhase2Sections } from "@/lib/types"

/** True when all four phase 2 block statuses are "complete" (kebab in API maps to these keys). */
export function areAllPhase2SectionsComplete(
  p2: Partial<IncidentPhase2Sections> | null | undefined,
): boolean {
  if (!p2) {
    return false
  }
  return (
    p2.contributingFactors?.status === "complete" &&
    p2.rootCause?.status === "complete" &&
    p2.interventionReview?.status === "complete" &&
    p2.newIntervention?.status === "complete"
  )
}

import type { IncidentTrendBucket } from "@/lib/types/trends-incident-trends"

const BUCKET_ORDER: IncidentTrendBucket[] = ["fall", "skin", "medication", "behavior"]

function matchesFall(s: string): boolean {
  return /\bfall\b|slip|trip|syncope|unwitnessed fall/.test(s)
}

function matchesSkin(s: string): boolean {
  return /skin|wound|pressure|ulcer|lacerat|burn|bruise|hematoma/.test(s)
}

function matchesMedication(s: string): boolean {
  return /med|drug|pharm|adverse|order|abx|dose|error|iv\b/.test(s)
}

function matchesBehavior(s: string): boolean {
  return /behavior|abuse|aggress|elope|wander|neglect|rights|altercation/.test(s)
}

/**
 * Map free-text incident type to one of four executive buckets (first match wins).
 * Returns null when no bucket applies — those incidents are omitted from type trends.
 */
export function mapIncidentTypeToTrendBucket(incidentType: string): IncidentTrendBucket | null {
  const s = (incidentType || "").toLowerCase().trim()
  if (!s) return null
  for (const b of BUCKET_ORDER) {
    if (b === "fall" && matchesFall(s)) return "fall"
    if (b === "skin" && matchesSkin(s)) return "skin"
    if (b === "medication" && matchesMedication(s)) return "medication"
    if (b === "behavior" && matchesBehavior(s)) return "behavior"
  }
  return null
}

export function trendBucketLabel(bucket: IncidentTrendBucket): string {
  switch (bucket) {
    case "fall":
      return "Falls"
    case "skin":
      return "Skin"
    case "medication":
      return "Medication"
    case "behavior":
      return "Behavior"
    default:
      return bucket
  }
}

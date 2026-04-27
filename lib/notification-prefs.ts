import type { BuiltinIncidentTypeId } from "@/lib/facility-builtin-incident-types"
import { BUILTIN_INCIDENT_TYPE_IDS } from "@/lib/facility-builtin-incident-types"

/** Slugs used in toggles. “Unit manager” is represented as head_nurse. “Therapy director” → physical_therapist. */
export const NOTIFY_ROLE_SLUGS = [
  "director_of_nursing",
  "administrator",
  "head_nurse",
  "physical_therapist",
] as const

export const NOTIFY_ROLE_LABELS: Record<string, string> = {
  director_of_nursing: "Director of Nursing",
  administrator: "Administrator",
  head_nurse: "Unit manager",
  physical_therapist: "Therapy director",
}

export type PerIncidentNotify = {
  whenStarted: Record<string, boolean>
  whenPhase1Signed: Record<string, boolean>
}

export function defaultRoleToggles(): Record<string, boolean> {
  const o: Record<string, boolean> = {}
  for (const slug of NOTIFY_ROLE_SLUGS) {
    o[slug] = true
  }
  return o
}

export function defaultPerIncidentMap(): Record<string, PerIncidentNotify> {
  const out: Record<string, PerIncidentNotify> = {}
  for (const k of BUILTIN_INCIDENT_TYPE_IDS) {
    const t = defaultRoleToggles()
    out[k] = {
      whenStarted: { ...t },
      whenPhase1Signed: { ...t },
    }
  }
  return out
}

export type GlobalNotifPrefs = {
  dailyBrief: { enabled: boolean; timeLocal: string }
  weeklyIntelligence: { enabled: boolean; dayOfWeek: string }
  overduePhase2: { enabled: boolean; hours: number }
  assessmentReminders: { enabled: boolean; daysBefore: number }
}

export function defaultGlobalNotifPrefs(): GlobalNotifPrefs {
  return {
    dailyBrief: { enabled: true, timeLocal: "07:00" },
    weeklyIntelligence: { enabled: true, dayOfWeek: "monday" },
    overduePhase2: { enabled: true, hours: 24 },
    assessmentReminders: { enabled: true, daysBefore: 1 },
  }
}

export type MergedNotificationPrefs = {
  version: number
  perIncident: Record<string, PerIncidentNotify>
  global: GlobalNotifPrefs
}

export function mergeNotificationPreferences(stored: Record<string, unknown> | null | undefined): MergedNotificationPrefs {
  const defaults: MergedNotificationPrefs = {
    version: 1,
    perIncident: defaultPerIncidentMap(),
    global: defaultGlobalNotifPrefs(),
  }
  if (!stored || typeof stored !== "object") {
    return defaults
  }
  const g = (stored as { global?: unknown }).global
  if (g && typeof g === "object" && g !== null) {
    const gg = g as GlobalNotifPrefs
    defaults.global = { ...defaults.global, ...gg }
  }
  const p = (stored as { perIncident?: unknown }).perIncident
  if (p && typeof p === "object" && p !== null) {
    for (const id of BUILTIN_INCIDENT_TYPE_IDS) {
      const k = id as string
      const fromSt = p as Record<string, PerIncidentNotify | undefined>
      const v = fromSt[k]
      if (v && typeof v === "object" && "whenStarted" in v) {
        defaults.perIncident[k] = {
          whenStarted: { ...defaultRoleToggles(), ...v.whenStarted },
          whenPhase1Signed: { ...defaultRoleToggles(), ...v.whenPhase1Signed },
        }
      }
    }
  }
  return defaults
}

export function isBuiltinIncidentId(id: string): id is BuiltinIncidentTypeId {
  return (BUILTIN_INCIDENT_TYPE_IDS as readonly string[]).includes(id)
}

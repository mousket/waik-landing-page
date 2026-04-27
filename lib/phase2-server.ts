import connectMongo from "@/backend/src/lib/mongodb"
import IncidentModel from "@/backend/src/models/incident.model"
import { getCurrentUser, type CurrentUser } from "@/lib/auth"
import { leanOne } from "@/lib/mongoose-lean"

type Err = { ok: false; status: number; error: string }

type Ok = {
  ok: true
  user: CurrentUser
  doc: Record<string, unknown>
  facilityId: string
}

/**
 * Load incident for Phase 2 mutations: authenticated, facility-scoped, optional super-admin.
 */
export async function loadPhase2Incident(incidentId: string): Promise<Err | Ok> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }
  await connectMongo()
  const raw = await IncidentModel.findOne({ id: incidentId }).lean().exec()
  const doc = leanOne(raw) as Record<string, unknown> | null
  if (!doc) {
    return { ok: false, status: 404, error: "Not found" }
  }
  const facId = String(doc.facilityId ?? "")
  if (!user.isWaikSuperAdmin) {
    if (!user.facilityId || !facId || facId !== user.facilityId) {
      return { ok: false, status: 403, error: "Forbidden" }
    }
  }
  if (!user.isWaikSuperAdmin && !user.canAccessPhase2) {
    return { ok: false, status: 403, error: "Forbidden" }
  }
  return { ok: true, user, doc, facilityId: facId }
}

export function isWaikDonOrAdmin(
  user: CurrentUser,
  role: "don" | "administrator",
): { ok: true } | { ok: false; error: string } {
  const slug = (user.roleSlug ?? "").toLowerCase()
  if (user.isWaikSuperAdmin) {
    return { ok: true }
  }
  if (role === "don") {
    if (slug === "director_of_nursing") return { ok: true }
    return { ok: false, error: "Only the Director of Nursing can perform this action." }
  }
  if (slug === "administrator" || slug === "owner") {
    return { ok: true }
  }
  return { ok: false, error: "Only an administrator or owner can perform this action." }
}

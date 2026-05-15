import { randomUUID } from "node:crypto"
import connectMongo from "@/backend/src/lib/mongodb"
import NotificationModel, {
  type NotificationCategory,
  type NotificationEventType,
  type NotificationPriority,
} from "@/backend/src/models/notification.model"
import FacilityModel from "@/backend/src/models/facility.model"
import UserModel from "@/backend/src/models/user.model"
import { mergeNotificationPreferences, isBuiltinIncidentId } from "@/lib/notification-prefs"
import { WAIK_PHASE2_ROLES, type WaikRoleSlug } from "@/lib/waik-roles"
import { sendDualPushToUser, type DualPushText } from "@/lib/push-service"

function inferCategory(type: NotificationEventType): NotificationCategory {
  switch (type) {
    case "incident-created":
    case "investigation-ready":
    case "follow-up-required":
      return "incident"
    case "investigation-started":
    case "investigation-completed":
    case "phase2-all-sections-complete":
    case "phase2-pending-signature":
    case "investigation-reporter-closed":
      return "investigation"
    default:
      return "system"
  }
}

export function inferDefaultPriority(type: NotificationEventType): NotificationPriority {
  if (type === "investigation-ready" || type === "phase2-all-sections-complete") return "urgent"
  return "normal"
}

export type CreateIncidentNotificationInput = {
  targetUserIds: string[]
  facilityId: string
  incidentId: string
  type: NotificationEventType
  message: string
  actionUrl: string
  actorName?: string
  priority?: NotificationPriority
  category?: NotificationCategory
  push?: DualPushText | null
  /** When set, sends web push whenever `push` is provided (not only for urgent). */
  deliverPush?: boolean
}

/**
 * Fire-and-forget entry point — await only when you explicitly need persistence confirmation.
 */
export function enqueueIncidentNotifications(input: CreateIncidentNotificationInput): void {
  void createIncidentNotifications(input).catch((e) =>
    console.error("[notification-service] createIncidentNotifications:", e),
  )
}

export async function createIncidentNotifications(input: CreateIncidentNotificationInput): Promise<void> {
  const priority = input.priority ?? inferDefaultPriority(input.type)
  const category = input.category ?? inferCategory(input.type)

  await connectMongo()
  for (const targetUserId of input.targetUserIds) {
    if (!targetUserId) continue
    const id = `notif-${randomUUID()}`
    await NotificationModel.create({
      id,
      incidentId: input.incidentId,
      type: input.type,
      message: input.message,
      createdAt: new Date(),
      targetUserId,
      facilityId: input.facilityId,
      actionUrl: input.actionUrl,
      category,
      priority,
      actorName: input.actorName,
      isArchived: false,
    })

    const shouldPush =
      Boolean(input.push) && (input.deliverPush === true || priority === "urgent")
    if (shouldPush && input.push) {
      await sendDualPushToUser(targetUserId, input.push)
    }
  }
}

/** Role-level gate for Phase 1 sign-off investigative handoff (+ owner always). */
export function roleReceivesPhase1SignedPush(
  roleSlug: string,
  prefs: ReturnType<typeof mergeNotificationPreferences>,
  incidentTypeId: string,
): boolean {
  if (roleSlug === "owner") return true

  type Phase2Role = (typeof WAIK_PHASE2_ROLES)[number]
  const slug = roleSlug as Phase2Role
  if (!(WAIK_PHASE2_ROLES as readonly string[]).includes(slug)) return false

  let typeKey = incidentTypeId
  if (!isBuiltinIncidentId(typeKey)) {
    typeKey = "fall"
  }

  const per = prefs.perIncident[typeKey]

  function roleKeyForPrefs(r: WaikRoleSlug): string | null {
    if (r === "director_of_nursing") return "director_of_nursing"
    if (r === "administrator") return "administrator"
    return null
  }

  const key = roleKeyForPrefs(slug)
  if (!key) return false
  if (!per?.whenPhase1Signed) return true
  return per.whenPhase1Signed[key] !== false
}

/** Loads facility prefs and returns DON/administrator/owner user ids gated by prefs. */
export async function fetchPhase2RecipientsForFacility(
  facilityId: string,
  incidentTypeId: string,
): Promise<Array<{ userId: string; roleSlug: string }>> {
  await connectMongo()
  const fac = await FacilityModel.findOne({ id: facilityId }).lean().exec()
  const prefs = mergeNotificationPreferences(
    (fac as unknown as { notificationPreferences?: Record<string, unknown> } | null)?.notificationPreferences ??
      null,
  )

  const users = await UserModel.find({
    facilityId,
    isActive: true,
    roleSlug: { $in: [...WAIK_PHASE2_ROLES] },
  })
    .select(["id", "roleSlug"])
    .lean()
    .exec()

  const out: Array<{ userId: string; roleSlug: string }> = []
  for (const u of users) {
    const id = String((u as { id?: string }).id ?? "")
    const roleSlug = String((u as { roleSlug?: string }).roleSlug ?? "")
    if (!id || !roleSlug) continue
    if (!roleReceivesPhase1SignedPush(roleSlug, prefs, incidentTypeId)) continue
    out.push({ userId: id, roleSlug })
  }

  return out
}

/** DON / administrator / owner user ids for a facility (escalations — not filtered by notification prefs). */
export async function fetchFacilityAdminRecipients(facilityId: string): Promise<string[]> {
  await connectMongo()
  const users = await UserModel.find({
    facilityId,
    isActive: true,
    roleSlug: { $in: [...WAIK_PHASE2_ROLES] },
  })
    .select(["id"])
    .lean()
    .exec()
  const ids: string[] = []
  for (const u of users) {
    const id = String((u as { id?: string }).id ?? "")
    if (id) ids.push(id)
  }
  return ids
}

export type PersistNotificationInput = {
  incidentId: string
  type: NotificationEventType
  message: string
  targetUserId: string
  id?: string
  createdAt?: Date
  facilityId?: string
  actionUrl?: string
  priority?: NotificationPriority
  category?: NotificationCategory
  actorName?: string
  push?: DualPushText | null
  deliverPush?: boolean
}

/**
 * Persist a single inbox row and optionally send web push when `push` is set
 * (urgent always; or any priority when `deliverPush` is true).
 */
export async function persistOneNotification(row: PersistNotificationInput): Promise<Record<string, unknown>> {
  const priority = row.priority ?? inferDefaultPriority(row.type)
  const category = row.category ?? inferCategory(row.type)
  await connectMongo()
  const id = row.id ?? `notif-${randomUUID()}`
  const created = await NotificationModel.create({
    id,
    incidentId: row.incidentId,
    type: row.type,
    message: row.message,
    createdAt: row.createdAt ?? new Date(),
    targetUserId: row.targetUserId,
    facilityId: row.facilityId,
    actionUrl: row.actionUrl,
    category,
    priority,
    actorName: row.actorName,
    isArchived: false,
  })

  const shouldPush = Boolean(row.push) && (row.deliverPush === true || priority === "urgent")
  if (shouldPush && row.push) {
    await sendDualPushToUser(row.targetUserId, row.push)
  }

  return created.toJSON() as Record<string, unknown>
}

import connectMongo from "@/backend/src/lib/mongodb"
import ActivityLogModel, {
  type ActivityLogAction,
  newActivityLogId,
} from "@/backend/src/models/activity-log.model"

export type LogActivityInput = {
  userId: string
  userName: string
  role: string
  facilityId: string
  action: ActivityLogAction
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  req?: Request
}

function clientIpFromRequest(req: Request | undefined): string | undefined {
  if (!req) return undefined
  const xf = req.headers.get("x-forwarded-for")
  if (xf) {
    return xf.split(",")[0]?.trim() || undefined
  }
  return req.headers.get("x-real-ip") ?? undefined
}

/**
 * Persists a facility activity row. Call without awaiting; logs errors only.
 */
export function logActivity(input: LogActivityInput): void {
  const row = {
    id: newActivityLogId(),
    userId: input.userId,
    userName: input.userName,
    role: input.role,
    facilityId: input.facilityId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
    ipAddress: clientIpFromRequest(input.req),
    createdAt: new Date(),
  }
  void (async () => {
    try {
      await connectMongo()
      await ActivityLogModel.create(row)
    } catch (e) {
      console.error("[logActivity]", e)
    }
  })()
}

export function actorNameFromUser(u: { firstName: string; lastName: string; email: string }): string {
  const n = `${u.firstName} ${u.lastName}`.trim()
  return n || u.email
}

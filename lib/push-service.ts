import webpush from "web-push"
import connectMongo from "@/backend/src/lib/mongodb"
import PushSubscriptionModel from "@/backend/src/models/push-subscription.model"

let configured = false

function configureVapidOnce() {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject =
    process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_VAPID_CONTACT || "mailto:support@waik.care"
  if (!publicKey || !privateKey) return
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/** Full URL suitable for Notification click handling in the SW. */
export function publicOrigin(): string {
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromSite?.startsWith("http")) return fromSite.replace(/\/$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
  return "http://localhost:3000"
}

export function toAbsoluteWaikUrl(pathOrUrl: string): string {
  const raw = pathOrUrl.trim()
  if (raw.startsWith("http")) return raw
  const origin = publicOrigin()
  const path = raw.startsWith("/") ? raw : `/${raw}`
  return `${origin}${path}`
}

export type DualPushText = {
  titlePersonal: string
  titleWork: string
  bodyPersonal: string
  bodyWork: string
  /** Relative (/admin/…) or absolute */
  url: string
}

/**
 * Sends a Web Push to every active subscription for the user with PHI-aware payloads.
 */
export async function sendDualPushToUser(userId: string, payload: DualPushText): Promise<void> {
  if (!isPushConfigured()) {
    console.info("[push] Skipped (VAPID not configured)", { userId })
    return
  }
  configureVapidOnce()
  await connectMongo()

  const absUrl = toAbsoluteWaikUrl(payload.url)
  const body = JSON.stringify({
    title: "[WAiK]", // placeholder overwritten per subscription
    body: "",
    url: absUrl,
    titlePersonal: payload.titlePersonal,
    titleWork: payload.titleWork,
    bodyPersonal: payload.bodyPersonal,
    bodyWork: payload.bodyWork,
  })

  const subs = await PushSubscriptionModel.find({ userId, isActive: true }).lean().exec()
  if (subs.length === 0) return

  await Promise.all(
    subs.map(async (docRaw) => {
      const doc = docRaw as unknown as {
        endpoint: string
        subscription: webpush.PushSubscription
        deviceType?: string
      }
      const subscription = doc.subscription as webpush.PushSubscription
      const personal = doc.deviceType === "personal"
      const title = personal ? payload.titlePersonal : payload.titleWork
      const text = personal ? payload.bodyPersonal : payload.bodyWork
      const outbound = JSON.stringify({ title, body: text, url: absUrl })
      try {
        await webpush.sendNotification(subscription, outbound)
        await PushSubscriptionModel.updateOne(
          { endpoint: doc.endpoint },
          { $set: { lastUsedAt: new Date() } },
        ).exec()
      } catch (e: unknown) {
        const status = typeof e === "object" && e && "statusCode" in e ? (e as { statusCode: number }).statusCode : 0
        if (status === 410) {
          await PushSubscriptionModel.updateOne({ endpoint: doc.endpoint }, { $set: { isActive: false } }).exec()
        }
        console.error("[push] send failed", doc.endpoint.slice(0, 48), e)
      }
    }),
  )
}

export function dualPushTier2QuestionReminder(input: {
  incidentId: string
  roomNumber: string
  residentName: string
  unansweredCount: number
}): DualPushText {
  const room = input.roomNumber.trim() || "—"
  const name = input.residentName.trim() || "Resident"
  const n = Math.max(1, input.unansweredCount)
  return {
    titlePersonal: `Questions waiting — Room ${room} report`,
    titleWork: `Questions waiting — ${name} report needs ${n} more answers`,
    bodyPersonal: "Tap to continue your incident report.",
    bodyWork: `Tap to answer ${n} remaining questions.`,
    url: `/staff/incidents/${encodeURIComponent(input.incidentId)}`,
  }
}

export function dualPushTier2Escalation(input: {
  incidentId: string
  roomNumber: string
  residentName: string
  hoursElapsed: number
}): DualPushText {
  const room = input.roomNumber.trim() || "—"
  const name = input.residentName.trim() || "Resident"
  const h = Math.round(input.hoursElapsed)
  return {
    titlePersonal: `Incomplete report — Room ${room} — ${h}h elapsed`,
    titleWork: `Incomplete report — ${name}, Room ${room} — ${h}h`,
    bodyPersonal: "Questions remain unanswered. Review needed.",
    bodyWork: "Staff has not completed the incident report. Review required.",
    url: `/admin/incidents/${encodeURIComponent(input.incidentId)}`,
  }
}

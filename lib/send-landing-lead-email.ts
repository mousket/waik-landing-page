import { resend, isEmailConfigured } from "@/lib/email"

export const LANDING_LEAD_INBOX_DEFAULT = "gerard@waik.care"

function leadInbox(): string {
  return process.env.LEAD_NOTIFICATION_EMAIL?.trim() || LANDING_LEAD_INBOX_DEFAULT
}

export type LandingLeadKind = "demo" | "vanguard"

export async function sendLandingLeadEmail(opts: {
  kind: LandingLeadKind
  fullName: string
  role: string
  email: string
  facilityName: string
  phone: string
}): Promise<void> {
  if (!isEmailConfigured() || !resend) {
    throw new Error("Email is not configured (RESEND_API_KEY / RESEND_KEY and EMAIL_FROM)")
  }
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error("EMAIL_FROM is not set")

  const to = leadInbox()
  const title = opts.kind === "demo" ? "Demo request" : "Vanguard pilot application"
  const subject =
    opts.kind === "demo"
      ? `[WAiK] Demo request — ${opts.facilityName}`
      : `[WAiK] Pilot application — ${opts.facilityName}`

  const lines = [
    title,
    "",
    `Name: ${opts.fullName}`,
    `Role: ${opts.role}`,
    `Work email: ${opts.email}`,
    `Facility: ${opts.facilityName}`,
    `Phone: ${opts.phone}`,
    "",
    `Submitted: ${new Date().toISOString()}`,
  ]

  const text = lines.join("\n")
  const html = `
    <p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#0A3D40"><strong>${escapeHtml(title)}</strong></p>
    <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1e293b">${escapeHtml(`Name: ${opts.fullName}`)}</p>
    <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1e293b">${escapeHtml(`Role: ${opts.role}`)}</p>
    <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1e293b">${escapeHtml(`Work email: ${opts.email}`)}</p>
    <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1e293b">${escapeHtml(`Facility: ${opts.facilityName}`)}</p>
    <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1e293b">${escapeHtml(`Phone: ${opts.phone}`)}</p>
    <p style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;color:#64748b;margin-top:12px">${escapeHtml(`Submitted: ${new Date().toISOString()}`)}</p>
  `

  await resend.emails.send({
    from,
    to,
    replyTo: opts.email,
    subject,
    text,
    html,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

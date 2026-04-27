import * as React from "react"
import { render } from "@react-email/render"
import { resend, isEmailConfigured } from "@/lib/email"
import { WelcomeAdminEmail } from "@/emails/welcome-admin"
import { WelcomeStaffEmail } from "@/emails/welcome-staff"

export async function sendWelcomeEmail({
  to,
  firstName,
  facilityName,
  tempPassword,
}: {
  to: string
  firstName: string
  facilityName: string
  tempPassword: string
}): Promise<void> {
  if (!isEmailConfigured() || !resend) {
    throw new Error("Email is not configured (RESEND_API_KEY / RESEND_KEY and EMAIL_FROM)")
  }
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error("EMAIL_FROM is not set")

  const html = await render(
    React.createElement(WelcomeAdminEmail, {
      firstName,
      facilityName,
      email: to,
      tempPassword,
    }),
  )

  await resend.emails.send({
    from,
    to,
    subject: "Welcome to WAiK — Your administrator account is ready",
    html,
  })
}

export async function sendStaffWelcomeEmail({
  to,
  firstName,
  facilityName,
  inviterName,
  inviterRole,
  tempPassword,
}: {
  to: string
  firstName: string
  facilityName: string
  inviterName: string
  inviterRole: string
  tempPassword: string
}): Promise<void> {
  if (!isEmailConfigured() || !resend) {
    throw new Error("Email is not configured (RESEND_API_KEY / RESEND_KEY and EMAIL_FROM)")
  }
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error("EMAIL_FROM is not set")

  const html = await render(
    React.createElement(WelcomeStaffEmail, {
      firstName,
      facilityName,
      inviterName,
      inviterRole,
      email: to,
      tempPassword,
    }),
  )

  await resend.emails.send({
    from,
    to,
    subject: `${inviterName} has invited you to WAiK at ${facilityName}`,
    html,
  })
}

import * as React from "react"
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

  await resend.emails.send({
    from,
    to,
    subject: "Welcome to WAiK — Your administrator account is ready",
    react: React.createElement(WelcomeAdminEmail, {
      firstName,
      facilityName,
      email: to,
      tempPassword,
    }),
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

  await resend.emails.send({
    from,
    to,
    subject: `${inviterName} has invited you to WAiK at ${facilityName}`,
    react: React.createElement(WelcomeStaffEmail, {
      firstName,
      facilityName,
      inviterName,
      inviterRole,
      email: to,
      tempPassword,
    }),
  })
}

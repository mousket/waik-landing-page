import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY
export const resend = apiKey ? new Resend(apiKey) : null

export function isEmailConfigured(): boolean {
  return Boolean(apiKey && process.env.EMAIL_FROM)
}

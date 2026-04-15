import { randomInt } from "crypto"

const LOWER = "abcdefghjkmnpqrstuvwxyz"
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ"
const NUM = "23456789"

/** Format: WaiK-XXXXXX (alphanumeric, easy to read) */
export function generateTempPassword(): string {
  const chars = [...LOWER, ...UPPER, ...NUM]
  let suffix = ""
  for (let i = 0; i < 6; i++) {
    suffix += chars[randomInt(chars.length)]!
  }
  return `WaiK-${suffix}`
}

export function generateOrgId(): string {
  return `org-${Date.now()}-${randomInt(1000, 9999)}`
}

export function generateFacilityId(): string {
  return `fac-${Date.now()}-${randomInt(1000, 9999)}`
}

export function generateUserId(email: string): string {
  return `user-${email.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${randomInt(100, 999)}`
}

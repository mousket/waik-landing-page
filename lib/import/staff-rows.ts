import { isValidEmail } from "@/lib/validate-email"

export const STAFF_IMPORT_TEMPLATE_HEADERS =
  "first_name,last_name,email,role_slug,phone,device_type,unit"

export const STAFF_IMPORT_EXAMPLE_ROW = "Jane,Doe,jane.doe@example.com,rn,,personal,Wing A"

export type StaffImportRowStatus = "valid" | "error" | "duplicate"

export type StaffImportPreviewRow = {
  first_name: string
  last_name: string
  email: string
  role_slug: string
  phone?: string
  device_type?: "personal" | "work"
  unit?: string
  status: StaffImportRowStatus
  error?: string
}

const REQUIRED = ["first_name", "last_name", "email", "role_slug"] as const

function parseDeviceType(raw: string): "personal" | "work" | undefined {
  const v = raw.trim().toLowerCase()
  if (!v) return undefined
  if (v === "personal" || v === "work") return v
  return undefined
}

/** Accept `role` header as alias for `role_slug`. */
function roleSlugFromRow(raw: Record<string, string>): string {
  return (raw["role_slug"] ?? raw["role"] ?? "").trim()
}

export function validateStaffImportRows(
  rawRows: Record<string, string>[],
  opts: { roleSlugs: Set<string>; existingEmails: Set<string> },
): StaffImportPreviewRow[] {
  const seenEmails = new Set<string>()
  const out: StaffImportPreviewRow[] = []

  for (const raw of rawRows) {
    const first_name = (raw["first_name"] ?? "").trim()
    const last_name = (raw["last_name"] ?? "").trim()
    const email = (raw["email"] ?? "").trim().toLowerCase()
    const role_slug = roleSlugFromRow(raw)
    const phone = (raw["phone"] ?? "").trim() || undefined
    const unit = (raw["unit"] ?? raw["wing"] ?? "").trim() || undefined
    const deviceRaw = (raw["device_type"] ?? "").trim()
    const device_type = parseDeviceType(deviceRaw)

    const base = { first_name, last_name, email, role_slug, phone, unit, device_type }

    if (!first_name || !last_name) {
      out.push({ ...base, status: "error", error: "First and last name are required" })
      continue
    }
    if (!email) {
      out.push({ ...base, status: "error", error: "Email is required" })
      continue
    }
    if (!isValidEmail(email)) {
      out.push({ ...base, status: "error", error: "Invalid email format" })
      continue
    }
    if (!role_slug || !opts.roleSlugs.has(role_slug)) {
      out.push({ ...base, status: "error", error: "Invalid or unknown role_slug" })
      continue
    }
    if (deviceRaw && !device_type) {
      out.push({ ...base, status: "error", error: "device_type must be personal or work" })
      continue
    }

    if (opts.existingEmails.has(email) || seenEmails.has(email)) {
      out.push({
        ...base,
        status: "duplicate",
        error: seenEmails.has(email) ? "Duplicate email in file" : "Already exists in this facility",
      })
      continue
    }

    seenEmails.add(email)
    out.push({ ...base, status: "valid" })
  }

  return out
}

export function staffImportMissingHeaders(headers: string[]): string[] {
  return REQUIRED.filter((h) => !headers.includes(h) && !(h === "role_slug" && headers.includes("role")))
}

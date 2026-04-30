import { redirect } from "next/navigation"

/** Legacy URL — incident reporting lives at `/staff/report`. */
export default function LegacyIncidentsBetaCreateRedirectPage() {
  redirect("/staff/report")
}

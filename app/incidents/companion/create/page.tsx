import { redirect } from "next/navigation"

/** Legacy URL — incident reporting lives at `/staff/report`. */
export default function LegacyIncidentsCompanionCreateRedirectPage() {
  redirect("/staff/report")
}

import { redirect } from "next/navigation"

/** Avoid `/waik-admin/organizations` matching the `[facilityId]` catch-all. */
export default function WaikAdminOrganizationsIndexPage() {
  redirect("/waik-admin")
}

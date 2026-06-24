import { getCurrentUser } from "@/lib/auth"
import { AdminIncidentsListClient } from "./admin-incidents-list-client"

export default async function AdminIncidentsListPage() {
  const user = await getCurrentUser()

  return (
    <AdminIncidentsListClient
      isWaikSuperAdmin={Boolean(user?.isWaikSuperAdmin)}
      roleSlug={user?.roleSlug ?? ""}
      userFacilityId={user?.facilityId ?? ""}
    />
  )
}

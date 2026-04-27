import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { UnifiedResidentProfilePage } from "@/components/resident/unified-resident-profile-page"

export default async function UnifiedResidentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in")
  }
  const { id } = await params
  return (
    <UnifiedResidentProfilePage
      residentId={id}
      isAdminTier={Boolean(user.isAdminTier || user.isWaikSuperAdmin)}
    />
  )
}

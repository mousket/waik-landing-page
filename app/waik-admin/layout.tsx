import type { ReactNode } from "react"
import { getCurrentUser } from "@/lib/auth"
import { WaikAdminShell } from "./waik-admin-shell"

export default async function WaikAdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user?.isWaikSuperAdmin) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
        <p>Access denied.</p>
      </div>
    )
  }

  return <WaikAdminShell userEmail={user.email}>{children}</WaikAdminShell>
}

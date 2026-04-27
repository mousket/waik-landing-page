import type { ReactNode } from "react"
import { getCurrentUser } from "@/lib/auth"
import { WaikAdminShell } from "./waik-admin-shell"

export default async function WaikAdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user?.isWaikSuperAdmin) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    )
  }

  return <WaikAdminShell userEmail={user.email}>{children}</WaikAdminShell>
}

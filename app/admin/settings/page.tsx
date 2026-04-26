"use client"

import Link from "next/link"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { useMemo } from "react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { PageHeader } from "@/components/ui/page-header"
import { Users } from "lucide-react"

export default function AdminSettingsIndexPage() {
  const searchParams = useAdminUrlSearchParams()
  const staffHref = useMemo(
    () => buildAdminPathWithContext("/admin/settings/staff", searchParams),
    [searchParams],
  )

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 md:py-10">
        <PageHeader
          className="mb-8"
          title="Settings"
          description="Manage your facility and team."
        />

        <ul className="space-y-3">
          <li>
            <Link
              href={staffHref}
              className="flex min-h-14 items-center gap-3 rounded-3xl border border-border bg-background p-4 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-2xl"
            >
              <Users className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">Staff</p>
                <p className="text-xs text-muted-foreground">Invite and manage staff accounts</p>
              </div>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

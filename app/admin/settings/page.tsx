"use client"

import Link from "next/link"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { useMemo } from "react"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { PageHeader } from "@/components/ui/page-header"
import type { LucideIcon } from "lucide-react"
import { Building2, FileDown, HelpCircle, ListChecks, Mail, UserCircle, Users } from "lucide-react"

const CARDS: {
  title: string
  description: string
  href: string
  icon: LucideIcon
}[] = [
  { title: "Community profile", description: "Name, location, contacts, reporting window", href: "/admin/settings/profile", icon: Building2 },
  { title: "Incident configuration", description: "Phase mode, thresholds, gold standards, active types", href: "/admin/settings/incidents", icon: ListChecks },
  { title: "Staff", description: "Invitations, roles, and deactivation", href: "/admin/settings/staff", icon: Users },
  { title: "Notification preferences", description: "Per incident type and device/PHI guidance", href: "/admin/settings/notifications", icon: Mail },
  { title: "Data export", description: "Incidents, assessments, residents (CSV)", href: "/admin/settings/export", icon: FileDown },
  { title: "Help & support", description: "Facility ID, support contact, and docs", href: "/admin/settings/help", icon: HelpCircle },
]

export default function AdminSettingsIndexPage() {
  const searchParams = useAdminUrlSearchParams()
  const activityHref = useMemo(
    () => buildAdminPathWithContext("/admin/settings/activity", searchParams),
    [searchParams],
  )
  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:max-w-4xl md:py-10">
        <PageHeader
          className="mb-8"
          title="Settings"
          description="Configure this facility, notifications, and exports."
        />

        <ul className="grid gap-3 sm:grid-cols-2">
          {CARDS.map((c) => {
            const href = buildAdminPathWithContext(c.href, searchParams)
            const Icon = c.icon
            return (
              <li key={c.href}>
                <Link
                  href={href}
                  className="flex min-h-[4.5rem] items-center gap-3 rounded-3xl border border-border bg-background p-4 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-2xl"
                >
                  <Icon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <UserCircle className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
          <Link href={activityHref} className="font-medium text-primary underline-offset-2 hover:underline">
            View activity log
          </Link>{" "}
          for the last 100 account events in this facility.
        </p>
      </div>
    </div>
  )
}

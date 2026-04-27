"use client"

import { useRouter } from "next/navigation"
import { FilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Aligned to admin dashboard "Facility" card (dashboardInline): same row as the shift greeting.
 */
export function StaffNewReportCard() {
  const router = useRouter()
  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between gap-2 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.05] p-2.5 shadow-sm sm:p-3">
      <div>
        <p className="text-xs font-semibold text-primary sm:text-sm">New report</p>
        <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-snug text-muted-foreground sm:line-clamp-2 sm:text-xs">
          Resident, then voice workflow.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-1 w-full min-h-9 text-xs font-semibold shadow-sm sm:min-h-10 sm:text-sm"
        onClick={() => router.push("/staff/report")}
      >
        <FilePlus className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
        Report incident
      </Button>
    </div>
  )
}

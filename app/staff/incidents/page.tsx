import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { FileText } from "lucide-react"

export default function StaffIncidentsPlaceholderPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <PageHeader
          title="My incidents"
          description="Your incident reports will appear here."
          actions={
            <Button asChild className="min-h-[48px] font-semibold shadow-lg shadow-primary/15">
              <Link href="/staff/report">New report</Link>
            </Button>
          }
        />
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No reports yet"
          description="When you create a report, you’ll see it here with its status and next steps."
          actions={
            <Button asChild className="min-h-[48px] font-semibold shadow-lg shadow-primary/15">
              <Link href="/staff/report">Start a report</Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}

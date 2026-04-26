import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { ClipboardCheck } from "lucide-react"

export default function StaffAssessmentsPlaceholderPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <PageHeader title="Assessments" description="Your due assessments will appear here." />
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="No assessments due"
          description="When an assessment is assigned or becomes due, you’ll see it here."
        />
      </div>
    </div>
  )
}

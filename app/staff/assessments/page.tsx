import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { ClipboardCheck } from "lucide-react"

export default function StaffAssessmentsPlaceholderPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        <PageHeader title="Assessments" description="Your due assessments will appear here." />
        <WaikCard>
          <WaikCardContent className="p-6 md:p-8">
            <EmptyState
              icon={<ClipboardCheck className="h-6 w-6" />}
              title="No assessments due"
              description="When an assessment is assigned or becomes due, you’ll see it here."
            />
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}

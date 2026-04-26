import { Sparkles } from "lucide-react"

import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"

export default function StaffIntelligencePlaceholderPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <PageHeader
          title="WAiK Intelligence"
          description="Search and ask questions about your reports when this is available."
        />
        <WaikCard variant="base">
          <WaikCardContent className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">
              Full search is on the way. The field below is a preview of where you’ll type.
            </p>
            <Input
              type="search"
              placeholder="Search reports…"
              className="mt-6 min-h-12 w-full"
              readOnly
              aria-readonly
            />
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}

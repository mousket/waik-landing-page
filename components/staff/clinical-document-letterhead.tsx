import { WaikLogo } from "@/components/waik-logo"
import { cn } from "@/lib/utils"

export type ClinicalDocumentLetterheadProps = {
  facilityName: string
  documentTitle?: string
  incidentType?: string
  incidentId?: string
  incidentDate?: string
  incidentTime?: string
  reportDate?: string
  className?: string
}

function formatTypeLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Formal letterhead for Phase 1 clinical documents — facility name + WAiK co-brand.
 * Client/facility logo upload is deferred; WAiK wordmark only for now.
 */
export function ClinicalDocumentLetterhead({
  facilityName,
  documentTitle = "Incident Report — Phase 1 Clinical Record",
  incidentType,
  incidentId,
  incidentDate,
  incidentTime,
  reportDate,
  className,
}: ClinicalDocumentLetterheadProps) {
  const hasMeta = incidentId || incidentDate || reportDate

  return (
    <header
      className={cn(
        "mb-6 border-b-2 border-primary pb-5 print:border-black",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight text-foreground print:text-black">
            {facilityName}
          </p>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary/90 print:text-black">
            {documentTitle}
          </p>
          {incidentType ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-200 print:border print:border-gray-400 print:bg-white print:text-black">
                {formatTypeLabel(incidentType)}
              </span>
              {incidentId ? (
                <span className="font-mono text-xs text-muted-foreground print:text-gray-700">
                  {incidentId}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <WaikLogo size="lg" className="print:h-9" />
          {hasMeta ? (
            <dl className="mt-2 space-y-0.5 text-[0.65rem] text-muted-foreground print:text-gray-700">
              {incidentId ? (
                <div>
                  <dt className="sr-only">Incident ID</dt>
                  <dd className="font-mono">ID {incidentId}</dd>
                </div>
              ) : null}
              {incidentDate ? (
                <div>
                  <dt className="sr-only">Incident date</dt>
                  <dd>
                    Incident {incidentDate}
                    {incidentTime ? ` · ${incidentTime}` : ""}
                  </dd>
                </div>
              ) : null}
              {reportDate ? (
                <div>
                  <dt className="sr-only">Report date</dt>
                  <dd>Report {reportDate}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </header>
  )
}

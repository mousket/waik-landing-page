"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Building2, ClipboardList, FileText, Loader2, Pencil, Stethoscope, UserRound } from "lucide-react"

import type { ClinicalRecord } from "@/lib/agents/clinical-record-generator"
import type { ClinicalPreviewInsights } from "@/lib/agents/clinical-preview-insights"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CompletionRing } from "@/components/shared/completion-ring"
import { ClinicalDocumentLetterhead } from "@/components/staff/clinical-document-letterhead"
import { StaffFlowFrame } from "@/components/staff/staff-flow-backdrop"
import { cn } from "@/lib/utils"

export type PreviewResponse = {
  facilityName: string
  clinicalRecord: ClinicalRecord
  incidentSummary: {
    incidentId: string
    incidentType: string
    residentName: string
    residentRoom: string
    location: string
    staffName: string
    staffRole: string
    incidentDate: string
    incidentTime: string
  }
  fullNarrative: string
  tier1QA: Array<{ question: string; answer: string; areaHint: string }>
  tier2QA: Array<{ question: string; answer: string; areaHint: string }>
  closingQA: Array<{ question: string; answer: string; areaHint: string }>
  completenessScore: number
  previewInsights?: ClinicalPreviewInsights
}

const SECTIONS: Array<{ key: keyof ClinicalRecord; title: string }> = [
  { key: "narrative", title: "Description of Incident" },
  { key: "residentStatement", title: "Resident Statement" },
  { key: "interventions", title: "Immediate Interventions" },
  { key: "contributingFactors", title: "Contributing Factors" },
  { key: "recommendations", title: "Recommendations" },
  { key: "environmentalAssessment", title: "Environmental Assessment" },
]

const CLINICAL_SURFACE =
  "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/70 shadow-sm dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-800/80"

const CLINICAL_SECTION_LABEL =
  "text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"

function typedNameToBase64(name: string): string {
  const canvas = document.createElement("canvas")
  canvas.width = 400
  canvas.height = 80
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  ctx.font = "48px Caveat, cursive"
  ctx.fillStyle = "#1E2B2C"
  ctx.fillText(name, 10, 55)
  return canvas.toDataURL("image/png")
}

function InsightCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: typeof Stethoscope
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn(CLINICAL_SURFACE, "p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100/90 text-primary dark:border-slate-600 dark:bg-slate-800">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={CLINICAL_SECTION_LABEL}>{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{children}</div>
    </section>
  )
}

function QaGroup({
  title,
  items,
}: {
  title: string
  items: Array<{ question: string; answer: string; areaHint: string }>
}) {
  if (!items.length) return null
  return (
    <div className="space-y-3">
      <p className={CLINICAL_SECTION_LABEL}>{title}</p>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-xl border border-slate-200/70 bg-white/80 p-3.5 dark:border-slate-700/60 dark:bg-slate-900/50"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {item.areaHint}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.question}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {item.answer}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RecordDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px min-w-0 flex-1 bg-slate-200 dark:bg-slate-700" />
      <p className={cn(CLINICAL_SECTION_LABEL, "shrink-0 text-slate-400")}>{label}</p>
      <div className="h-px min-w-0 flex-1 bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

export function ClinicalReportPreview({
  previewData,
  onSubmit,
  onBack,
  isSubmitting = false,
  mode = "signoff",
  signedSignature,
}: {
  previewData: PreviewResponse
  onSubmit?: (signatureImage: string, editedSections: Record<string, string>) => void
  onBack?: () => void
  isSubmitting?: boolean
  mode?: "signoff" | "readonly"
  signedSignature?: {
    signatureImage?: string | null
    signedAt?: string
    signedByName?: string
    declaration?: string
  }
}) {
  const {
    facilityName,
    clinicalRecord,
    incidentSummary,
    fullNarrative,
    tier1QA,
    tier2QA,
    closingQA,
    completenessScore,
    previewInsights,
  } = previewData

  const insights = previewInsights ?? {
    expertNurseSummary:
      clinicalRecord.narrative.trim() ||
      "Review the full record below. Your original narrative and structured sections are preserved for sign-off.",
    nurseRecommendations:
      clinicalRecord.recommendations.trim() ||
      "Continue monitoring the resident and document any changes in condition.",
    administratorRecommendations:
      "Route for Phase 2 review and confirm care-plan updates per facility policy.",
  }

  const [editedSections, setEditedSections] = useState<Record<string, string>>({})
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw")
  const [typedName, setTypedName] = useState(incidentSummary.staffName)
  const [hasDrawn, setHasDrawn] = useState(false)
  const sigCanvasRef = useRef<SignatureCanvas>(null)

  const readOnly = mode === "readonly"
  const signedAt = readOnly && signedSignature?.signedAt
    ? new Date(signedSignature.signedAt)
    : new Date()
  const signedAtLabel = Number.isNaN(signedAt.getTime()) ? "—" : signedAt.toLocaleString()

  const sectionText = useCallback(
    (key: keyof ClinicalRecord) =>
      readOnly ? (clinicalRecord[key] ?? "") : (editedSections[key] ?? clinicalRecord[key] ?? ""),
    [clinicalRecord, editedSections, readOnly],
  )

  const startEdit = (key: keyof ClinicalRecord) => {
    setEditingSection(key)
    setEditDraft(sectionText(key))
  }

  const saveEdit = () => {
    if (!editingSection) return
    setEditedSections((prev) => ({ ...prev, [editingSection]: editDraft.trim() }))
    setEditingSection(null)
    setEditDraft("")
  }

  const cancelEdit = () => {
    setEditingSection(null)
    setEditDraft("")
  }

  const canSubmit = signatureMode === "draw" ? hasDrawn : typedName.trim().length > 0

  const handleSubmit = () => {
    if (readOnly || !onSubmit) return
    const sigImage =
      signatureMode === "draw"
        ? sigCanvasRef.current?.getTrimmedCanvas().toDataURL("image/png") ?? ""
        : typedNameToBase64(typedName.trim())
    if (!sigImage) return
    onSubmit(sigImage, editedSections)
  }

  const documentShell = (
    <div
      className={cn(
        "mx-auto min-h-0 w-full flex-1 overflow-y-auto",
        "max-w-full px-4 py-5 sm:px-6 sm:py-6 md:max-w-3xl md:px-8 lg:max-w-4xl lg:py-8 xl:max-w-5xl",
        readOnly
          ? "pb-[calc(2rem+env(safe-area-inset-bottom,0px))] print:max-w-none print:px-0 print:py-0"
          : "pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))]",
        "print:bg-white print:pb-8",
      )}
    >
        {onBack ? (
          <div className="mb-4">
            <Button type="button" variant="ghost" size="sm" className="rounded-xl px-2" onClick={onBack}>
              ← Back to closing questions
            </Button>
          </div>
        ) : null}

        <div className={cn(CLINICAL_SURFACE, "mb-6 p-4 sm:p-6 lg:p-8 print:border print:border-gray-300 print:shadow-none")}>
          <ClinicalDocumentLetterhead
            facilityName={facilityName}
            incidentType={incidentSummary.incidentType}
            incidentId={incidentSummary.incidentId}
            incidentDate={incidentSummary.incidentDate}
            incidentTime={incidentSummary.incidentTime}
            reportDate={signedAtLabel}
            className="mb-0 border-b border-slate-200/80 pb-5 dark:border-slate-700"
          />

          {/* Metadata */}
          <div className="mt-5 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/40 lg:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Resident</dt>
                  <dd className="font-medium text-foreground">
                    {incidentSummary.residentName}
                    {incidentSummary.residentRoom ? (
                      <span className="font-normal text-slate-600"> · Room {incidentSummary.residentRoom}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Reporter</dt>
                  <dd className="font-medium text-foreground">
                    {incidentSummary.staffName}
                    {incidentSummary.staffRole ? (
                      <span className="font-normal text-slate-600"> · {incidentSummary.staffRole}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Location</dt>
                  <dd className="text-foreground">{incidentSummary.location || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Incident date &amp; time</dt>
                  <dd className="text-foreground">
                    {incidentSummary.incidentDate} {incidentSummary.incidentTime}
                  </dd>
                </div>
              </dl>
              <div className="flex shrink-0 items-center justify-center sm:justify-end">
                <CompletionRing percent={completenessScore} size={52} />
              </div>
            </div>
          </div>

          {/* WAiK insights — lead the review */}
          <div className="mt-6 space-y-4">
            <InsightCard
              icon={Stethoscope}
              title="Clinical summary"
              subtitle="Expert nurse perspective — based on your reported observations"
            >
              <p className="whitespace-pre-wrap">{insights.expertNurseSummary}</p>
            </InsightCard>

            <div className="grid gap-4 md:grid-cols-2">
              <InsightCard
                icon={UserRound}
                title="WAiK recommendations"
                subtitle="For the nursing team"
              >
                <p className="whitespace-pre-wrap">{insights.nurseRecommendations}</p>
              </InsightCard>
              <InsightCard
                icon={Building2}
                title="WAiK recommendations"
                subtitle="For leadership &amp; administration"
              >
                <p className="whitespace-pre-wrap">{insights.administratorRecommendations}</p>
              </InsightCard>
            </div>
          </div>

          <RecordDivider label="Full report record" />

          {/* Original narrative */}
          <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/90 p-4 dark:border-slate-700/60 dark:bg-slate-900/40 sm:p-5">
            <p className={CLINICAL_SECTION_LABEL}>Your original words — preserved verbatim</p>
            <p className="mt-1 text-xs text-slate-500">
              This section is permanently preserved and cannot be edited.
            </p>
            <blockquote className="mt-3 border-l-[3px] border-primary/35 bg-slate-50/90 p-4 text-sm italic leading-relaxed text-slate-800 dark:bg-slate-800/50 dark:text-slate-100">
              {fullNarrative.trim() || "—"}
            </blockquote>
          </div>

          {/* Clinical record sections */}
          <div className="mt-6 space-y-3">
            <div>
              <p className={CLINICAL_SECTION_LABEL}>Official clinical record</p>
              {!readOnly ? (
                <p className="mt-1 text-xs text-slate-500">
                  Organized from your narrative. You may edit any section before signing.
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">As signed on {signedAtLabel}.</p>
              )}
            </div>
            {SECTIONS.map(({ key, title }) => (
              <div
                key={key}
                className="rounded-xl border border-slate-200/70 bg-white/90 p-4 dark:border-slate-700/60 dark:bg-slate-900/40"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  {!readOnly && editingSection !== key ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2"
                      onClick={() => startEdit(key)}
                      aria-label={`Edit ${title}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
                {!readOnly && editingSection === key ? (
                  <div className="space-y-2">
                    <Textarea
                      className="min-h-28 rounded-xl border-slate-200 bg-white text-sm dark:border-slate-700"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" className="rounded-lg" onClick={saveEdit}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {sectionText(key) || "—"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Q&A */}
          <div className="mt-6 space-y-5 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30 sm:p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-slate-500" aria-hidden />
              <p className={CLINICAL_SECTION_LABEL}>Questions &amp; answers</p>
            </div>
            <QaGroup title="Initial questions" items={tier1QA} />
            <QaGroup title="Follow-up questions" items={tier2QA} />
            <QaGroup title="Closing questions" items={closingQA} />
          </div>

          {/* Signature */}
          <div className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-br from-slate-50/90 via-white to-primary/[0.04] p-4 dark:from-slate-900 dark:via-slate-900 dark:to-primary/10 sm:p-5">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {readOnly && signedSignature?.declaration
                ? signedSignature.declaration
                : "By signing below, I confirm that this report accurately reflects my observations and actions."}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Signer</p>
                <p className="font-medium text-foreground">
                  {readOnly ? signedSignature?.signedByName ?? incidentSummary.staffName : incidentSummary.staffName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date &amp; time</p>
                <p className="font-medium text-foreground">{signedAtLabel}</p>
              </div>
            </div>

            {readOnly ? (
              signedSignature?.signatureImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedSignature.signatureImage}
                  alt="Signature"
                  className="mt-4 h-16 max-w-full object-contain opacity-90 print:h-14"
                />
              ) : (
                <p className="mt-4 text-sm text-slate-500">No signature image on file.</p>
              )
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["draw", "type"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSignatureMode(mode)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition",
                        signatureMode === mode
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-slate-200/80 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      {mode === "draw" ? "Draw my signature" : "Type my name"}
                    </button>
                  ))}
                </div>

                {signatureMode === "draw" ? (
                  <div className="mt-3 space-y-2">
                    <SignatureCanvas
                      ref={sigCanvasRef}
                      canvasProps={{
                        className: "w-full rounded-lg border-2 border-slate-200 bg-white dark:border-slate-600",
                        style: { height: 120 },
                      }}
                      onEnd={() => setHasDrawn(true)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        sigCanvasRef.current?.clear()
                        setHasDrawn(false)
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />
                    <p className="text-4xl text-foreground" style={{ fontFamily: "'Caveat', cursive" }}>
                      {typedName || " "}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom breathing room inside the document card */}
          <div className="mt-8 h-4 sm:mt-10" aria-hidden />
        </div>
      </div>
  )

  if (readOnly) {
    return documentShell
  }

  return (
    <StaffFlowFrame>
      {documentShell}

      {/* Fixed submit bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md",
          "dark:border-slate-700/80 dark:bg-slate-950/95",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
        )}
      >
        <div className="mx-auto w-full max-w-full px-4 sm:px-6 md:max-w-3xl md:px-8 lg:max-w-4xl xl:max-w-5xl">
          <Button
            type="button"
            className="min-h-12 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/15"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Submit signed report
              </>
            )}
          </Button>
        </div>
      </div>
    </StaffFlowFrame>
  )
}

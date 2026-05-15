import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"

import "./closure-print.css"

import FacilityModel from "@/backend/src/models/facility.model"
import connectMongo from "@/backend/src/lib/mongodb"
import { ClosureReportToolbar } from "./closure-report-toolbar"
import { getCurrentUser } from "@/lib/auth"
import { getIncidentForUser } from "@/lib/db"
import type { Incident, InvestigationSignature } from "@/lib/types"
import { canAccessPhase2 } from "@/lib/waik-roles"

type InitialWithSig = NonNullable<Incident["initialReport"]> & { signature?: InvestigationSignature }

function formatTs(iso?: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return "—"
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-foreground print:border-black">
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  )
}

export default async function IncidentClosureReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const incidentId = String(id ?? "").trim()
  if (!incidentId) notFound()

  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  if (!user.isWaikSuperAdmin && !canAccessPhase2(user.roleSlug)) {
    notFound()
  }

  const scope = await getIncidentForUser(incidentId, user)
  if (scope.kind !== "ok") notFound()
  const incident = scope.incident

  await connectMongo()
  const facilityId = incident.facilityId ?? user.facilityId
  const facility = facilityId
    ? await FacilityModel.findOne({ id: facilityId }).select(["name"]).lean().exec()
    : null
  const communityName =
    typeof (facility as { name?: string } | null)?.name === "string"
      ? String((facility as { name: string }).name).trim() || "Community"
      : "Community"

  const generatedLabel = formatTs(new Date().toISOString())
  const backHref = `/admin/incidents/${incidentId}`

  if (incident.phase !== "closed") {
    return (
      <div className="closure-report-root min-h-screen bg-background px-4 py-8 text-foreground">
        <div className="mx-auto max-w-[800px]">
          <ClosureReportToolbar backHref={backHref} />
          <p className="text-sm text-muted-foreground">
            This printable closure report is available only after the investigation is locked (closed). Current
            workflow phase: <span className="font-mono text-foreground">{incident.phase}</span>.
          </p>
        </div>
      </div>
    )
  }

  const ir = incident.initialReport
  const p1sig = (ir as InitialWithSig | undefined)?.signature
  const inv = incident.investigation
  const p2 = incident.phase2Sections
  const phase1Complete = incident.completenessAtSignoff ?? inv?.completenessScore ?? incident.completenessScore

  const sortedQuestions = [...(incident.questions ?? [])].sort((a, b) => {
    const ta = new Date(a.askedAt).getTime()
    const tb = new Date(b.askedAt).getTime()
    return ta - tb
  })

  return (
    <div className="closure-report-root min-h-screen bg-background text-foreground print:bg-white">
      <div className="mx-auto max-w-[800px] px-6 py-8 print:max-w-none print:px-0 print:py-0">
        <ClosureReportToolbar backHref={backHref} />

        <header className="mb-8 border-b border-border/60 pb-6 print:border-black">
          <p className="text-xs font-medium text-muted-foreground">{communityName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground print:text-black">
            Incident investigation report
          </h1>
          <p className="mt-2 text-xs text-muted-foreground print:text-gray-700">
            Generated {generatedLabel} · Incident ID{" "}
            <span className="font-mono text-foreground print:text-black">{incident.id}</span>
          </p>
        </header>

        <Section title="2. Resident and incident details">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Resident</dt>
              <dd>
                {incident.residentName} (Room {incident.residentRoom})
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Incident type</dt>
              <dd>{incident.incidentType ?? incident.title}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Date / time</dt>
              <dd>
                {incident.incidentDate ? formatTs(incident.incidentDate) : "—"}
                {incident.incidentTime ? ` · ${incident.incidentTime}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Location</dt>
              <dd>{incident.location ?? "—"}</dd>
            </div>
          </dl>
        </Section>

        <Section title="3. Reporting staff">
          <p>
            <span className="font-medium">{incident.staffName}</span> — Phase 1 signed{" "}
            {formatTs(incident.phaseTransitionTimestamps?.phase1Signed)}
          </p>
        </Section>

        <Section title="4. Phase 1 — Staff original words">
          {ir?.narrative ? (
            <blockquote className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-foreground print:border-gray-300 print:bg-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Staff&apos;s exact words — preserved verbatim
              </p>
              <p className="mt-2 whitespace-pre-wrap">{ir.narrative}</p>
            </blockquote>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </Section>

        <Section title="5. Phase 1 — Clinical record (structured)">
          {ir?.enhancedNarrative ? (
            <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/10 px-4 py-3 print:border-gray-300">
              {ir.enhancedNarrative}
            </div>
          ) : incident.humanReport ? (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 px-4 py-3 print:border-gray-300">
              {incident.humanReport.summary ? <p className="whitespace-pre-wrap">{incident.humanReport.summary}</p> : null}
              {incident.humanReport.insights ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{incident.humanReport.insights}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </Section>

        <Section title="6. Phase 1 — Questions and answers">
          {sortedQuestions.length === 0 ? (
            <p className="text-muted-foreground">—</p>
          ) : (
            <ol className="list-decimal space-y-4 pl-5">
              {sortedQuestions.map((q) => (
                <li key={q.id} className="break-inside-avoid">
                  <p className="font-medium">{q.questionText}</p>
                  {q.answer ? (
                    <p className="mt-1 text-muted-foreground">
                      <span className="text-foreground">Answer: </span>
                      {q.answer.answerText}
                      <span className="block text-xs text-muted-foreground">
                        {q.answer.answeredBy} · {formatTs(q.answer.answeredAt)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-800 print:text-gray-800">No answer recorded.</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="7. Phase 2 — IDT and follow-up questions">
          {(incident.idtTeam?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">No IDT question record on file.</p>
          ) : (
            <div className="space-y-3">
              {incident.idtTeam?.map((m, i) => (
                <div key={`${m.userId}-${i}`} className="rounded-lg border border-border/50 px-3 py-2 print:border-gray-300">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {m.name} · {m.role}
                  </p>
                  {m.questionSent ? <p className="mt-1">Q: {m.questionSent}</p> : null}
                  {m.questionSentAt ? <p className="text-xs text-muted-foreground">Sent {formatTs(m.questionSentAt)}</p> : null}
                  {m.response ? (
                    <p className="mt-1 text-muted-foreground">
                      <span className="text-foreground">Response: </span>
                      {m.response}{" "}
                      <span className="block text-xs">{m.respondedAt ? formatTs(m.respondedAt) : ""}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Pending response</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="8. Investigation findings">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Contributing factors</p>
              {p2?.contributingFactors?.factors?.length ? (
                <ul className="list-disc pl-5">
                  {p2.contributingFactors.factors.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
              {p2?.contributingFactors?.notes ? (
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{p2.contributingFactors.notes}</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Root cause</p>
              <p className="whitespace-pre-wrap">{p2?.rootCause?.description?.trim() || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Intervention review</p>
              {p2?.interventionReview?.reviewedInterventions?.length ? (
                <ul className="list-disc pl-5">
                  {p2.interventionReview.reviewedInterventions.map((r) => (
                    <li key={r.interventionId}>
                      {r.interventionId}: {r.stillEffective ? "retained / effective" : "removed or not effective"}
                      {r.notes ? ` — ${r.notes}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">New interventions</p>
              {p2?.newIntervention?.interventions?.length ? (
                <ul className="list-disc pl-5">
                  {p2.newIntervention.interventions.map((n, idx) => (
                    <li key={idx} className="whitespace-pre-wrap">
                      {(n.description ?? "").trim() || "—"}
                      {n.department ? ` · ${n.department}` : ""}
                      {n.type ? ` · ${n.type}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </Section>

        <Section title="9. Signatures and lock">
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Reporting staff (Phase 1)</span>
              <br />
              {p1sig ? (
                <>
                  {p1sig.signedByName} · {formatTs(p1sig.signedAt)}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
            <p>
              <span className="font-medium">Director of Nursing (Phase 2)</span>
              <br />
              {inv?.signatures?.don ? (
                <>
                  {inv.signatures.don.signedByName} · {formatTs(inv.signatures.don.signedAt)}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
            <p>
              <span className="font-medium">Administrator (Phase 2)</span>
              <br />
              {inv?.signatures?.admin ? (
                <>
                  {inv.signatures.admin.signedByName} · {formatTs(inv.signatures.admin.signedAt)}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
            <p>
              <span className="font-medium">Investigation locked</span>
              <br />
              {formatTs(incident.phaseTransitionTimestamps?.phase2Locked)}
            </p>
          </div>
        </Section>

        <Section title="10. Documentation completeness">
          <p>
            Phase 1 completeness at sign-off:{" "}
            <span className="font-semibold tabular-nums">
              {typeof phase1Complete === "number" ? `${Math.round(phase1Complete)}%` : "—"}
            </span>{" "}
            of Gold Standards fields captured (per WAiK scoring at time of sign-off).
          </p>
        </Section>
      </div>
    </div>
  )
}

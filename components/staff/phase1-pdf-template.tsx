import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import type { IncidentDocument } from "@/backend/src/models/incident.model"
import type { Question } from "@/lib/types"
import {
  clinicalRecordToSections,
  hasStructuredClinicalSections,
  resolvePhase1ClinicalRecord,
  resolvePhase1PreviewInsights,
} from "@/lib/report/phase1-signed-report-data"
import { staffQuestionGroup } from "@/lib/staff-incident-question-group"

const TEAL = "#0D7377"
const TEAL_DARK = "#0A3D40"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1E2B2C",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  facilityName: { fontSize: 18, fontWeight: "bold" },
  title: { fontSize: 9, fontWeight: "bold", marginTop: 4, color: TEAL_DARK, letterSpacing: 0.5 },
  metaRight: { fontSize: 8, textAlign: "right", color: "#555" },
  waikLogo: { width: 72, height: 28, objectFit: "contain" as const },
  divider: { height: 1, backgroundColor: TEAL, marginVertical: 10 },
  badge: { fontSize: 9, color: TEAL, fontWeight: "bold", marginBottom: 4 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 6,
    color: TEAL_DARK,
  },
  grayBox: {
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  insightBox: {
    backgroundColor: "#F0F7F7",
    borderWidth: 0.5,
    borderColor: "#B8D4D5",
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  insightSubtitle: { fontSize: 7, color: "#555", marginBottom: 4 },
  insightBody: { fontSize: 9, lineHeight: 1.4 },
  insightRow: { flexDirection: "row", marginBottom: 8 },
  insightHalf: { flex: 1, marginRight: 6 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: TEAL_DARK,
    color: "#fff",
    padding: 6,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    fontSize: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  tableRowAlt: { backgroundColor: "#F9FAFB" },
  colQ: { width: "45%" },
  colA: { width: "55%" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#888",
  },
  sigImage: { width: 200, height: 60, marginTop: 8 },
})

function pdfText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value)
  }
  if (value instanceof Date) return value.toLocaleString()
  return String(value)
}

function formatReportDate(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  }
  return new Date().toLocaleString()
}

function tierLabel(tier?: string) {
  if (tier === "tier1") return "INITIAL QUESTIONS (TIER 1)"
  if (tier === "tier2") return "FOLLOW-UP QUESTIONS (TIER 2)"
  if (tier === "closing") return "CLOSING QUESTIONS"
  return "QUESTIONS"
}

type QRow = { question: string; answer: string }

function groupQuestions(incident: IncidentDocument): Array<{ title: string; rows: QRow[] }> {
  const groups = new Map<string, QRow[]>()
  for (const q of incident.questions ?? []) {
    if (q.metadata?.idt) continue
    const tier = staffQuestionGroup(q as unknown as Question)
    const answerText = q.answer?.answerText?.trim()
    if (!answerText || answerText === "__DEFERRED__" || answerText === "__UNKNOWN__") continue
    const key = tier
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ question: q.questionText, answer: answerText })
  }
  const order = ["tier1", "tier2", "closing"]
  return order
    .filter((t) => groups.has(t))
    .map((t) => ({ title: tierLabel(t), rows: groups.get(t)! }))
}

export function Phase1PdfTemplate({
  incident,
  facilityName,
  waikLogoSrc,
}: {
  incident: IncidentDocument
  facilityName: string
  waikLogoSrc: string
}) {
  const ir = incident.initialReport
  const sig = ir?.signature
  const snapshot = ir?.phase1SignoffSnapshot
  const insights = resolvePhase1PreviewInsights(incident)
  const clinicalRecord = resolvePhase1ClinicalRecord(incident)
  const clinicalSections = clinicalRecordToSections(clinicalRecord)
  const structuredSections = hasStructuredClinicalSections(clinicalRecord)
  const qaGroups = groupQuestions(incident)
  const completeness =
    incident.completenessAtSignoff ?? incident.completenessScore ?? incident.investigation?.completenessScore ?? 0

  const incidentDate =
    incident.incidentDate instanceof Date
      ? incident.incidentDate.toLocaleDateString()
      : incident.incidentDate
        ? String(incident.incidentDate)
        : "—"
  const reportDate = formatReportDate(snapshot?.signedAt ?? sig?.signedAt)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.facilityName}>{facilityName}</Text>
            <Text style={styles.title}>INCIDENT REPORT — PHASE 1 CLINICAL RECORD</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Image src={waikLogoSrc} style={styles.waikLogo} />
            <Text style={[styles.metaRight, { marginTop: 6 }]}>Incident ID: {incident.id}</Text>
            <Text style={styles.metaRight}>Incident date: {incidentDate}</Text>
            <Text style={styles.metaRight}>Report date: {reportDate}</Text>
          </View>
        </View>
        <View style={styles.divider} />

        <Text style={styles.badge}>{(incident.incidentType ?? "incident").toUpperCase()}</Text>
        <Text>Location: {incident.location ?? "—"}</Text>
        <Text>
          Resident: {incident.residentName} · Room {incident.residentRoom ?? "—"}
        </Text>
        <Text>
          Reporter: {ir?.recordedByName ?? incident.staffName} · {ir?.recordedByRole ?? "reporter"}
        </Text>
        <Text>Documentation completeness: {completeness}%</Text>

        {insights ? (
          <View>
            <Text style={styles.sectionTitle}>Clinical Summary</Text>
            <View style={styles.insightBox}>
              <Text style={styles.insightSubtitle}>
                Expert nurse perspective — based on reported observations
              </Text>
              <Text style={styles.insightBody}>{pdfText(insights.expertNurseSummary)}</Text>
            </View>

            <View style={styles.insightRow}>
              <View style={[styles.insightBox, styles.insightHalf]}>
                <Text style={styles.sectionTitle}>WAiK Recommendations</Text>
                <Text style={styles.insightSubtitle}>For the nursing team</Text>
                <Text style={styles.insightBody}>{pdfText(insights.nurseRecommendations)}</Text>
              </View>
              <View style={[styles.insightBox, styles.insightHalf]}>
                <Text style={styles.sectionTitle}>WAiK Recommendations</Text>
                <Text style={styles.insightSubtitle}>For leadership & administration</Text>
                <Text style={styles.insightBody}>
                  {pdfText(insights.administratorRecommendations)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Original Narrative (Staff Words)</Text>
        <View style={styles.grayBox}>
          <Text>{ir?.narrative?.trim() || "—"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Official Clinical Record</Text>
        {structuredSections ? (
          clinicalSections.map((s) => (
            <View key={s.title} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: "bold", fontSize: 9 }}>{s.title}</Text>
              <Text style={{ marginTop: 2 }}>{s.body}</Text>
            </View>
          ))
        ) : (
          <Text>{ir?.enhancedNarrative?.trim() || "—"}</Text>
        )}

        {qaGroups.map((group) => (
          <View key={group.title} wrap={false}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colQ}>Question</Text>
              <Text style={styles.colA}>Answer</Text>
            </View>
            {group.rows.map((row, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.colQ}>{pdfText(row.question)}</Text>
                <Text style={styles.colA}>{pdfText(row.answer)}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.sectionTitle}>Signature</Text>
        <Text style={{ fontSize: 8, color: "#666" }}>
          This report was reviewed and signed by {sig?.signedByName ?? "—"} on {reportDate}.
        </Text>
        <Text style={{ fontSize: 7, color: "#888", marginTop: 4 }}>
          {sig?.declaration?.trim() ||
            "I confirm that this report accurately reflects my observations and actions."}
        </Text>
        {sig?.signatureImage?.trim() ? (
          <Image src={sig.signatureImage.trim()} style={styles.sigImage} />
        ) : null}
        <Text style={{ fontWeight: "bold", marginTop: 4 }}>{sig?.signedByName ?? ""}</Text>

        <View style={styles.footer} fixed>
          <Text>WAiK — Confidential incident record</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

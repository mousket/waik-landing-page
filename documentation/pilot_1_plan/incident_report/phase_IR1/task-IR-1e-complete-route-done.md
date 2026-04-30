# Task IR-1e — POST /api/report/complete — Sign-Off + Clinical Record + Report Card
## Phase: IR-1 — Incident Reporting Frontend + Backend Wiring
## Estimated Time: 4–5 hours
## Depends On: IR-1d complete (all answer branches working)

---

## Why This Task Exists

This is the culmination of the entire incident reporting flow. When the
nurse taps "Sign Off," this route generates the clinical record from her
raw narrative, writes the complete incident state to MongoDB, fires the
Phase 2 notification, generates the report card, and deletes the Redis
session. Everything the nurse said across 10+ voice interactions is
synthesized into a permanent, defensible clinical record.

This is the highest-stakes route in the system. It must not lose data.

---

## What This Task Creates

1. `app/api/report/complete/route.ts` — POST route
2. `lib/agents/clinical-record-generator.ts` — new agent for generating the clinical record

---

## Context Files

- `lib/config/report-session.ts` — getReportSession, deleteReportSession
- `lib/agents/expert_investigator/finalize.ts` — finalizeInvestigation (reference)
- `lib/openai.ts` — generateChatCompletion for LLM calls
- `backend/src/models/incident.model.ts` — IncidentModel for final write
- `lib/db.ts` — updateIncident, createNotification, getUsers
- `blueprint/WAiK_Incident_Reporting_Blueprint.md` — Section 2 (POST /api/report/complete)

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] POST /api/report/complete generates a clinical record from the full narrative
- [ ] Clinical record has sections: narrative, residentStatement, interventions,
      contributingFactors, recommendations, environmentalAssessment
- [ ] Nurse's edits (editedSections) override generated sections
- [ ] MongoDB incident updated with complete initialReport subdocument
- [ ] MongoDB incident updated with investigation subdocument (goldStandard, subTypeData)
- [ ] MongoDB incident phase set to "phase_1_complete"
- [ ] MongoDB incident analytics fields populated (all 8 analytics fields)
- [ ] Signature recorded in initialReport.signature subdocument
- [ ] auditTrail entry added with action: "signed"
- [ ] phaseTransitionTimestamps.phase1Signed set to now
- [ ] Redis session deleted after successful write
- [ ] Report card returned with completenessScore, facilityAverage, personalAverage, streak
- [ ] Phase 2 notification created for DON/admin users
- [ ] If injury flagged, redFlags.stateReportDueAt is set
- [ ] Missing session → 404
- [ ] Missing signature → 400

---

## Test Cases

```
TEST 1 — Complete happy path
  Action: POST /api/report/complete
  Body: {
    sessionId: "<valid session with all questions answered>",
    editedSections: {
      narrative: "Corrected: Margaret was found at 6:18am, not 6:15am."
    },
    signature: {
      declaration: "I confirm this report reflects my observations and actions.",
      signedAt: "2026-04-28T12:30:00.000Z"
    }
  }
  Expected: 200 with {
    status: "completed",
    incidentId: "<id>",
    reportCard: {
      completenessScore: <number>,
      facilityAverage: <number>,
      personalAverage: <number>,
      currentStreak: <number>,
      bestStreak: <number>,
      coachingTips: [string, string],
      totalQuestionsAsked: <number>,
      totalActiveSeconds: <number>,
      dataPointsCaptured: <number>
    }
  }
  Verify: MongoDB IncidentModel has:
    phase: "phase_1_complete"
    initialReport.narrative: (full narrative — NOT edited version)
    initialReport.enhancedNarrative: (clinical record text)
    initialReport.signature.signedBy: user ID
    investigation.goldStandard: populated JSON
    completenessAtSignoff: > 0
    activeDataCollectionSeconds: > 0
  Verify: Redis waik:report:{sessionId} no longer exists
  Pass/Fail: ___

TEST 2 — Missing signature
  Action: POST without signature field
  Expected: 400 { error: "Signature required" }
  Pass/Fail: ___

TEST 3 — Missing session
  Action: POST with invalid sessionId
  Expected: 404
  Pass/Fail: ___

TEST 4 — Phase 2 notification created
  Action: After successful complete
  Verify: At least one notification document created in MongoDB
    with type containing "phase_2" or "investigation_ready"
    targeted at DON/admin roles for this facility
  Pass/Fail: ___

TEST 5 — Analytics fields populated
  Action: After successful complete
  Verify in MongoDB incident:
    tier2QuestionsGenerated > 0
    questionsAnswered > 0
    activeDataCollectionSeconds > 0
    completenessAtTier1Complete > 0
    completenessAtSignoff > 0
    dataPointsPerQuestion.length > 0
  Pass/Fail: ___

TEST 6 — Original narrative preserved (not edited)
  Action: Complete with editedSections.narrative = "EDITED TEXT"
  Verify: incident.initialReport.narrative = full original narrative
  Verify: incident.initialReport.enhancedNarrative contains "EDITED TEXT"
          (the edit applies to the clinical record, NOT the raw narrative)
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am building the /api/report/complete route for WAiK. This is the
sign-off route that generates the clinical record, writes everything
to MongoDB, and returns the report card.

REFERENCE: Read the architectural blueprint at
plan/pilot_1/blueprint/WAiK_Incident_Reporting_Blueprint.md
Section 2 (POST /api/report/complete — full 10-step server behavior).

═══════════════════════════════════════════════════════════
PART A — CREATE lib/agents/clinical-record-generator.ts
═══════════════════════════════════════════════════════════

This agent takes the full narrative + labeled answers and produces
a structured clinical record.

import { generateChatCompletion } from "@/lib/openai"
// OR use the direct OpenAI SDK pattern from the existing codebase

interface ClinicalRecordInput {
  fullNarrative: string
  tier1Answers: Record<string, string>   // keyed by question area hint
  tier2Answers: Record<string, string>
  closingAnswers: Record<string, string>
  incidentType: string
  residentName: string
  location: string
}

interface ClinicalRecord {
  narrative: string               // professional description of the incident
  residentStatement: string       // what the resident said, in clinical language
  interventions: string           // what the nurse did
  contributingFactors: string     // possible factors
  recommendations: string         // prevention suggestions
  environmentalAssessment: string // environment at time of incident
}

export async function generateClinicalRecord(
  input: ClinicalRecordInput
): Promise<ClinicalRecord> {

  const systemPrompt = `You are a clinical documentation specialist for senior care facilities.
Given the raw staff narrative and question-answer pairs from an incident report,
produce a structured clinical record with six sections.

RULES:
- Use professional clinical language but remain faithful to what was reported
- Do NOT add any information that was not in the original narrative or answers
- Do NOT remove or soften any observations the staff member made
- DO surface clinical significance that was present but unstated
  (e.g., if staff said "she seemed confused," note that as a possible cognitive status change)
- Each section should be 2-5 sentences of clear, clinical prose
- If no information was provided for a section, write "No information provided by reporting staff."

Return ONLY a JSON object with these exact keys:
{
  "narrative": "...",
  "residentStatement": "...",
  "interventions": "...",
  "contributingFactors": "...",
  "recommendations": "...",
  "environmentalAssessment": "..."
}`

  const userPrompt = `INCIDENT TYPE: ${input.incidentType}
RESIDENT: ${input.residentName}
LOCATION: ${input.location}

═══ RAW STAFF NARRATIVE ═══
${input.fullNarrative}

═══ TIER 1 ANSWERS (labeled) ═══
${Object.entries(input.tier1Answers).map(([k, v]) => `${k}: ${v}`).join("\n\n")}

═══ TIER 2 ANSWERS (gap-fill) ═══
${Object.entries(input.tier2Answers).map(([k, v]) => `${k}: ${v}`).join("\n\n")}

═══ CLOSING ANSWERS ═══
${Object.entries(input.closingAnswers).map(([k, v]) => `${k}: ${v}`).join("\n\n")}

Generate the structured clinical record as JSON.`

  // Use the LLM call pattern from the existing codebase
  // Temperature: 0.2 (low creativity, high fidelity)
  // Model: gpt-4o-mini (or whatever AI_CONFIG.model is)
  const response = await generateChatCompletion(
    systemPrompt,
    userPrompt,
    { temperature: 0.2, max_tokens: 2000 }
  )

  // Parse JSON from response
  // Handle potential markdown code fences
  const cleaned = response.replace(/```json\s*/g, "").replace(/```/g, "").trim()
  const record = JSON.parse(cleaned) as ClinicalRecord

  return record
}

═══════════════════════════════════════════════════════════
PART B — CREATE app/api/report/complete/route.ts
═══════════════════════════════════════════════════════════

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

import { getCurrentUser } from "@/lib/auth"
import { getReportSession, deleteReportSession } from "@/lib/config/report-session"
import { generateClinicalRecord } from "@/lib/agents/clinical-record-generator"

export async function POST(request: Request) {
  // 1. Auth
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // 2. Parse body
  const body = await request.json()
  const { sessionId, editedSections, signature } = body

  if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 })
  if (!signature?.declaration || !signature?.signedAt) {
    return Response.json({ error: "Signature required" }, { status: 400 })
  }

  // 3. Load session
  const session = await getReportSession(sessionId)
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 })
  if (session.userId !== user.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // 4. Generate clinical record
    const clinicalRecord = await generateClinicalRecord({
      fullNarrative: session.fullNarrative,
      tier1Answers: session.tier1Answers,
      tier2Answers: session.tier2Answers,
      closingAnswers: session.closingAnswers,
      incidentType: session.incidentType,
      residentName: session.residentName,
      location: session.location,
    })

    // 5. Apply nurse's edits (override generated text, NOT original narrative)
    if (editedSections) {
      if (editedSections.narrative) clinicalRecord.narrative = editedSections.narrative
      if (editedSections.residentStatement) clinicalRecord.residentStatement = editedSections.residentStatement
      if (editedSections.interventions) clinicalRecord.interventions = editedSections.interventions
      if (editedSections.contributingFactors) clinicalRecord.contributingFactors = editedSections.contributingFactors
      if (editedSections.recommendations) clinicalRecord.recommendations = editedSections.recommendations
    }

    // 6. Build enhanced narrative string from clinical record sections
    const enhancedNarrative = [
      `DESCRIPTION OF INCIDENT:\n${clinicalRecord.narrative}`,
      `RESIDENT STATEMENT:\n${clinicalRecord.residentStatement}`,
      `IMMEDIATE INTERVENTIONS:\n${clinicalRecord.interventions}`,
      `CONTRIBUTING FACTORS:\n${clinicalRecord.contributingFactors}`,
      `RECOMMENDATIONS:\n${clinicalRecord.recommendations}`,
      `ENVIRONMENTAL ASSESSMENT:\n${clinicalRecord.environmentalAssessment}`,
    ].join("\n\n")

    // 7. Write final state to MongoDB
    const now = new Date()
    await connectToDatabase()
    const { IncidentModel } = await import("@/backend/src/models/incident.model")

    await IncidentModel.updateOne(
      { id: session.incidentId, facilityId: session.facilityId },
      {
        $set: {
          phase: "phase_1_complete",
          completenessScore: session.completenessScore,
          completenessAtSignoff: session.completenessScore,
          completenessAtTier1Complete: session.completenessAtTier1,
          tier2QuestionsGenerated: session.tier2Questions.length,
          questionsAnswered: Object.keys(session.tier2Answers).length +
                            Object.keys(session.tier1Answers).length +
                            Object.keys(session.closingAnswers).length,
          questionsDeferred: session.tier2DeferredIds.length,
          questionsMarkedUnknown: session.tier2UnknownIds.length,
          activeDataCollectionSeconds: Math.round(session.activeDataCollectionMs / 1000),
          dataPointsPerQuestion: session.dataPointsPerQuestion,
          summary: clinicalRecord.narrative.slice(0, 500),
          updatedAt: now,

          "initialReport.capturedAt": now,
          "initialReport.narrative": session.fullNarrative,
          "initialReport.enhancedNarrative": enhancedNarrative,
          "initialReport.recordedById": session.userId,
          "initialReport.recordedByName": session.userName,
          "initialReport.recordedByRole": session.userRole,
          "initialReport.signature": {
            signedBy: session.userId,
            signedByName: session.userName,
            signedAt: new Date(signature.signedAt),
            role: session.userRole,
            declaration: signature.declaration,
          },

          "investigation.status": "not-started",
          "investigation.goldStandard": session.agentState?.global_standards ?? null,
          "investigation.subTypeData": session.agentState?.sub_type_data ?? null,
          "investigation.subtype": session.agentState?.sub_type ?? null,
          "investigation.score": session.completenessScore,
          "investigation.completenessScore": session.completenessScore,

          "phaseTransitionTimestamps.phase1Signed": now,

          "redFlags.hasInjury": session.hasInjury === true,
        },
        $push: {
          auditTrail: {
            action: "signed",
            performedBy: session.userId,
            performedByName: session.userName,
            timestamp: now,
          }
        }
      }
    )

    // 8. Generate report card data
    // Compute facility average (last 30 days, this facility)
    const recentIncidents = await IncidentModel.find({
      facilityId: session.facilityId,
      phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
      "phaseTransitionTimestamps.phase1Signed": {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }).select("completenessAtSignoff staffId").lean()

    const facilityScores = recentIncidents
      .map(i => i.completenessAtSignoff || 0)
      .filter(s => s > 0)
    const facilityAverage = facilityScores.length > 0
      ? Math.round(facilityScores.reduce((a, b) => a + b, 0) / facilityScores.length)
      : 0

    // Compute personal average
    const personalIncidents = recentIncidents
      .filter(i => i.staffId === session.userId)
    const personalScores = personalIncidents
      .map(i => i.completenessAtSignoff || 0)
      .filter(s => s > 0)
    const personalAverage = personalScores.length > 0
      ? Math.round(personalScores.reduce((a, b) => a + b, 0) / personalScores.length)
      : session.completenessScore

    // Compute streak (consecutive reports above 85%)
    const staffHistory = await IncidentModel.find({
      facilityId: session.facilityId,
      staffId: session.userId,
      phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    }).sort({ "phaseTransitionTimestamps.phase1Signed": -1 }).select("completenessAtSignoff").lean()

    let currentStreak = 0
    for (const inc of staffHistory) {
      if ((inc.completenessAtSignoff || 0) >= 85) {
        currentStreak++
      } else {
        break
      }
    }
    // Include current report in streak if above 85
    if (session.completenessScore >= 85) {
      currentStreak = Math.max(currentStreak, 1)
    }

    // Generate coaching tips (simple version — LLM version in IR-2f)
    const totalDataPoints = session.dataPointsPerQuestion
      .reduce((sum, q) => sum + q.dataPointsCovered, 0)
    const coachingTips: string[] = []

    if (session.completenessScore >= 85) {
      coachingTips.push(
        "Excellent report. Your narratives are thorough and clinically complete."
      )
    }
    if (session.completenessAtTier1 > 40) {
      coachingTips.push(
        "Strong opening — your Tier 1 narrative covered many data points before follow-up questions were needed."
      )
    } else {
      coachingTips.push(
        "Next time, try to include details about the environment, footwear, and medication changes in your opening narrative — this reduces follow-up questions."
      )
    }

    const reportCard = {
      completenessScore: session.completenessScore,
      facilityAverage,
      personalAverage,
      currentStreak,
      bestStreak: currentStreak,  // TODO: track best streak in user profile
      coachingTips,
      totalQuestionsAsked: session.tier2Questions.length + 5 + 3,
      totalActiveSeconds: Math.round(session.activeDataCollectionMs / 1000),
      dataPointsCaptured: totalDataPoints,
    }

    // 9. Fire Phase 2 notification (best effort)
    try {
      const { getUsers, createNotification } = await import("@/lib/db")
      const users = await getUsers()
      const admins = users.filter(u =>
        ["director_of_nursing", "administrator", "owner"].includes(u.role || "") &&
        u.facilityId === session.facilityId
      )
      for (const admin of admins) {
        await createNotification({
          userId: admin.userId || admin.id,
          facilityId: session.facilityId,
          type: "phase_2_ready",
          title: `Investigation ready — Room ${session.residentRoom}`,
          body: `Phase 1 complete for ${session.incidentType} incident. Tap to review.`,
          link: `/admin/incidents/${session.incidentId}`,
          read: false,
        })
      }
    } catch (err) {
      console.error("[report/complete] Failed to create notifications:", err)
    }

    // 10. Delete Redis session
    await deleteReportSession(sessionId)

    // 11. Return report card
    return Response.json({
      status: "completed",
      incidentId: session.incidentId,
      reportCard,
    })

  } catch (error) {
    console.error("[report/complete] Error:", error)
    return Response.json(
      { error: "Failed to complete report. Your data has been preserved in the session." },
      { status: 500 }
    )
  }
}

IMPORTANT:
- The ORIGINAL narrative (session.fullNarrative) is ALWAYS preserved
  in initialReport.narrative. Nurse edits go to enhancedNarrative only.
- The clinical record is generated ONCE at sign-off, not during reporting.
- Use the DB connection pattern from existing routes.
- Use dynamic imports for IncidentModel to avoid build-time connections.
- The notification creation follows the existing pattern in lib/db.ts.
  Check if createNotification exists. If not, create the notification
  document directly using NotificationModel.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR1/task-IR-1e-DONE.md`

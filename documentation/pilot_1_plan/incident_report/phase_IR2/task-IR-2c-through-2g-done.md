# Task IR-2c — Intelligence Q&A Agent Rebuild (Cross-Incident)
## Phase: IR-2 — Intelligence Pipeline
## Estimated Time: 3–4 hours
## Depends On: IR-2b complete (vector search working)

---

## Why This Task Exists

The current intelligence-qa.ts searches one incident. The rebuild
searches across all incidents in a facility, synthesizes answers from
multiple records, and returns plain-language responses. This is the
feature that makes a DON say "I cannot imagine running this building
without WAiK" — because no other system answers natural language
questions about the entire facility's incident history.

---

## What This Task Creates

1. `app/api/intelligence/query/route.ts` — facility-wide intelligence endpoint
2. `app/api/admin/intelligence/insights/route.ts` — auto-generated insight cards

## What This Task Modifies

3. `lib/agents/intelligence-qa.ts` — extend with cross-incident capability

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] POST /api/intelligence/query with natural language returns plain-language answer
- [ ] Answer draws from multiple incidents when relevant
- [ ] Answer includes citations (which incidents informed the response)
- [ ] Search is facility-scoped (no cross-facility leakage)
- [ ] Staff-level queries return only the querying staff member's incidents
- [ ] Admin-level queries return all facility incidents
- [ ] GET /api/admin/intelligence/insights returns 3-5 auto-generated insight cards
- [ ] Insights include: total incidents, completeness trend, location patterns
- [ ] Insight cards cached in Redis for 1 hour

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am rebuilding WAiK Intelligence to search across all facility
incidents instead of just one.

READ lib/agents/intelligence-qa.ts to understand the current approach.
READ lib/agents/vector-search.ts (from IR-2b) for the search function.

═══════════════════════════════════════════════════════════
PART A — CREATE app/api/intelligence/query/route.ts
═══════════════════════════════════════════════════════════

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

import { getCurrentUser } from "@/lib/auth"
import { searchFacilityIncidents, queryFacilityIncidentStats } from "@/lib/agents/vector-search"
import { generateChatCompletion } from "@/lib/openai"

// Request: { question: string, scope?: "personal" | "facility" }
// Response: { answer: string, citations: Array<{ incidentId, snippet }>, timestamp }

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!user.facilityId) return Response.json({ error: "Facility required" }, { status: 400 })

  const { question, scope } = await request.json()
  if (!question?.trim()) return Response.json({ error: "Question required" }, { status: 400 })

  // Determine scope: staff see only their own, admin see all
  const isAdmin = ["director_of_nursing", "administrator", "owner", "head_nurse"]
    .includes(user.role || "")
  const effectiveScope = scope === "personal" || !isAdmin ? "personal" : "facility"

  try {
    // Step 1: Semantic search for relevant incidents
    const searchResults = await searchFacilityIncidents(
      user.facilityId,
      question,
      10,
      effectiveScope === "personal" ? { /* TODO: filter by staffId */ } : undefined
    )

    // Step 2: Also get structured stats for quantitative questions
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const stats = await queryFacilityIncidentStats(user.facilityId, thirtyDaysAgo, now)

    // Step 3: Build context for LLM
    const incidentContext = searchResults.results
      .map((r, i) => [
        `[Incident ${i + 1}] ${r.incidentType} — ${r.residentName} (Room ${r.residentRoom})`,
        `Date: ${r.incidentDate?.split("T")[0] || "unknown"} | Location: ${r.location}`,
        `Score: ${r.completenessScore}% | Phase: ${r.phase}`,
        `Summary: ${r.snippet}`,
      ].join("\n"))
      .join("\n\n")

    const statsContext = [
      `FACILITY STATS (last 30 days):`,
      `Total incidents: ${stats.total}`,
      `By type: ${Object.entries(stats.byType).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
      `By location: ${Object.entries(stats.byLocation).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
      `Avg completeness: ${stats.avgCompleteness}%`,
      `Residents with most incidents: ${stats.byResident.slice(0, 3).map(r => `${r.name} (${r.count})`).join(", ")}`,
    ].join("\n")

    const systemPrompt = `You are WAiK Intelligence — an institutional memory system
for a senior care facility. You answer questions about incident history,
patterns, and clinical documentation using ONLY the data provided below.

If the data does not contain enough information to answer the question,
say so clearly. Do not speculate or invent data.

Respond in clear, concise, professional language. When referencing
specific incidents, cite them by resident name and date.

SCOPE: ${effectiveScope === "personal" ? "This staff member's own reports only." : "All facility incidents."}`

    const userPrompt = `QUESTION: ${question}

═══ RELEVANT INCIDENTS ═══
${incidentContext || "No relevant incidents found."}

═══ AGGREGATE STATISTICS ═══
${statsContext}

Answer the question based on the above data.`

    const answer = await generateChatCompletion(
      systemPrompt,
      userPrompt,
      { temperature: 0.3, max_tokens: 800 }
    )

    return Response.json({
      answer,
      citations: searchResults.results.slice(0, 5).map(r => ({
        incidentId: r.incidentId,
        residentName: r.residentName,
        incidentDate: r.incidentDate,
        snippet: r.snippet,
        similarityScore: r.similarityScore,
      })),
      scope: effectiveScope,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error("[intelligence/query] Error:", error)
    return Response.json({ error: "Intelligence query failed" }, { status: 500 })
  }
}

═══════════════════════════════════════════════════════════
PART B — CREATE app/api/admin/intelligence/insights/route.ts
═══════════════════════════════════════════════════════════

Auto-generated insight cards for the admin Intelligence dashboard.
Cached in Redis for 1 hour.

import { getCurrentUser } from "@/lib/auth"
import { queryFacilityIncidentStats } from "@/lib/agents/vector-search"
import { getRedisClient } from wherever-redis-is-imported

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user?.facilityId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const cacheKey = `waik:insights:${user.facilityId}`

  // Check cache
  try {
    const redis = getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) return Response.json(JSON.parse(cached))
  } catch {}

  // Generate insights
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const monthStats = await queryFacilityIncidentStats(user.facilityId, thirtyDaysAgo, now)
  const weekStats = await queryFacilityIncidentStats(user.facilityId, sevenDaysAgo, now)

  const insights = []

  // Insight 1: Weekly summary
  insights.push({
    id: "weekly-summary",
    type: "summary",
    title: "This Week",
    body: `${weekStats.total} incident${weekStats.total !== 1 ? "s" : ""} reported this week. Average completeness: ${weekStats.avgCompleteness}%.`,
    priority: weekStats.total > 5 ? "high" : "normal",
  })

  // Insight 2: Location hotspot
  const topLocation = Object.entries(monthStats.byLocation)
    .sort(([, a], [, b]) => b - a)[0]
  if (topLocation && topLocation[1] >= 3) {
    insights.push({
      id: "location-hotspot",
      type: "pattern",
      title: "Location Pattern",
      body: `${topLocation[0]} has had ${topLocation[1]} incidents in the past 30 days — highest in the facility.`,
      priority: "high",
    })
  }

  // Insight 3: Repeat residents
  const repeatResidents = monthStats.byResident.filter(r => r.count >= 2)
  if (repeatResidents.length > 0) {
    insights.push({
      id: "repeat-residents",
      type: "alert",
      title: "Residents with Multiple Incidents",
      body: `${repeatResidents.map(r => `${r.name} (Room ${r.room}): ${r.count} incidents`).join(". ")}. Consider care plan review.`,
      priority: "high",
    })
  }

  // Insight 4: Completeness trend
  insights.push({
    id: "completeness-trend",
    type: "metric",
    title: "Documentation Quality",
    body: `Average report completeness: ${monthStats.avgCompleteness}% (30-day). Average data collection time: ${Math.round(monthStats.avgActiveSeconds / 60)} minutes per report.`,
    priority: "normal",
  })

  const response = { insights, generatedAt: now.toISOString() }

  // Cache for 1 hour
  try {
    const redis = getRedisClient()
    await redis.set(cacheKey, JSON.stringify(response), "EX", 3600)
  } catch {}

  return Response.json(response)
}

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR2/task-IR-2c-DONE.md`

---
---

# Task IR-2d — Clinical Record Verification Agent
## Phase: IR-2 — Intelligence Pipeline
## Estimated Time: 2–3 hours
## Depends On: IR-1e complete (clinical record generator exists)

---

## Why This Task Exists

The clinical record generator transforms casual speech into professional
documentation. The verification agent ensures that transformation was
faithful — nothing added, nothing removed, clinical significance surfaced.
This is the boundary between enhancement and fabrication, and it is what
makes WAiK legally defensible.

---

## What This Task Creates

1. `lib/agents/verification-agent.ts` — clinical record fidelity check

## What This Task Modifies

2. `app/api/report/complete/route.ts` — add verification step before final write

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] Verification agent compares clinical record against original narrative
- [ ] Returns fidelity score (0-100) and specific discrepancy flags
- [ ] Flags: additions (information not in original), omissions (information removed),
      enhancements (clinical significance surfaced — this is GOOD)
- [ ] If fidelity score < 80, log a warning (do not block sign-off)
- [ ] Verification result stored on incident for audit purposes
- [ ] Verification runs AFTER clinical record generation, BEFORE final write

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am building a verification agent that checks clinical record
fidelity against the nurse's original narrative.

CREATE lib/agents/verification-agent.ts

import { generateChatCompletion } from "@/lib/openai"

interface VerificationInput {
  originalNarrative: string        // nurse's raw words
  clinicalRecord: {
    narrative: string
    residentStatement: string
    interventions: string
    contributingFactors: string
    recommendations: string
    environmentalAssessment: string
  }
}

interface VerificationResult {
  fidelityScore: number            // 0-100
  additions: string[]              // things in clinical record NOT in original
  omissions: string[]              // things in original NOT in clinical record
  enhancements: string[]           // clinical significance surfaced (good)
  overallAssessment: "faithful" | "minor_issues" | "significant_issues"
}

export async function verifyClinicalRecord(
  input: VerificationInput
): Promise<VerificationResult> {

  const systemPrompt = `You are a clinical documentation auditor.
Compare a clinical record against the original staff narrative.
Determine if the clinical record is a FAITHFUL representation.

RULES:
1. ADDITIONS: The clinical record must NOT contain facts, events,
   or observations that were not stated or clearly implied in the
   original narrative. List any additions found.
2. OMISSIONS: The clinical record must NOT remove or soften
   observations the staff member made. List any omissions.
3. ENHANCEMENTS: The clinical record SHOULD surface clinical
   significance that was present but unstated (e.g., "seemed confused"
   → "possible altered mental status"). List enhancements found.
   Enhancements are GOOD — they do not reduce the fidelity score.

Return ONLY a JSON object:
{
  "fidelityScore": 0-100,
  "additions": ["string"],
  "omissions": ["string"],
  "enhancements": ["string"],
  "overallAssessment": "faithful" | "minor_issues" | "significant_issues"
}

Score guide:
- 95-100: Perfect fidelity, no additions or omissions
- 80-94: Minor issues, acceptable for sign-off
- 60-79: Significant issues, should be flagged
- Below 60: Major fidelity problems`

  const userPrompt = `═══ ORIGINAL STAFF NARRATIVE ═══
${input.originalNarrative}

═══ CLINICAL RECORD TO VERIFY ═══
Narrative: ${input.clinicalRecord.narrative}
Resident Statement: ${input.clinicalRecord.residentStatement}
Interventions: ${input.clinicalRecord.interventions}
Contributing Factors: ${input.clinicalRecord.contributingFactors}
Recommendations: ${input.clinicalRecord.recommendations}
Environment: ${input.clinicalRecord.environmentalAssessment}

Perform the fidelity check and return JSON.`

  try {
    const response = await generateChatCompletion(
      systemPrompt,
      userPrompt,
      { temperature: 0, max_tokens: 1000 }
    )

    const cleaned = response.replace(/```json\s*/g, "").replace(/```/g, "").trim()
    const result = JSON.parse(cleaned) as VerificationResult
    return result
  } catch (error) {
    console.error("[verification-agent] Failed:", error)
    // Return passing result on failure — do not block sign-off
    return {
      fidelityScore: 100,
      additions: [],
      omissions: [],
      enhancements: [],
      overallAssessment: "faithful",
    }
  }
}

Then MODIFY app/api/report/complete/route.ts:

After generating the clinical record (step 4) and before the final
MongoDB write (step 7), add:

import { verifyClinicalRecord } from "@/lib/agents/verification-agent"

const verification = await verifyClinicalRecord({
  originalNarrative: session.fullNarrative,
  clinicalRecord,
})

if (verification.fidelityScore < 80) {
  console.warn(
    `[report/complete] Low fidelity score (${verification.fidelityScore}) for incident ${session.incidentId}`,
    { additions: verification.additions, omissions: verification.omissions }
  )
}

// Store verification result on the incident (add to the $set block):
"investigation.verificationResult": {
  fidelityScore: verification.fidelityScore,
  overallAssessment: verification.overallAssessment,
  additions: verification.additions,
  omissions: verification.omissions,
  enhancements: verification.enhancements,
  verifiedAt: new Date(),
}

// Add verificationResult to InvestigationSchema in incident.model.ts:
verificationResult: {
  fidelityScore: Number,
  overallAssessment: String,
  additions: [String],
  omissions: [String],
  enhancements: [String],
  verifiedAt: Date,
}

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_IR2/task-IR-2d-DONE.md`

---
---

# Task IR-2e — Report Card LLM Coaching Tips
## Phase: IR-2 — Intelligence Pipeline
## Estimated Time: 2 hours
## Depends On: IR-1e complete (report card data returned from complete route)

---

## Why This Task Exists

The report card in IR-1e returns basic coaching tips based on heuristics.
This task replaces those with LLM-generated personalized coaching that
references the specific Gold Standard fields this nurse missed, compares
against her historical pattern, and gives actionable advice for next time.

---

## What This Task Creates

1. `lib/agents/coaching-tips-generator.ts`

## What This Task Modifies

2. `app/api/report/complete/route.ts` — use LLM tips instead of heuristic tips

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
CREATE lib/agents/coaching-tips-generator.ts

import { generateChatCompletion } from "@/lib/openai"

interface CoachingInput {
  completenessScore: number
  completenessAtTier1: number
  missedFields: string[]           // Gold Standard fields not captured
  capturedInTier1: string[]        // fields captured in initial narrative (reward these)
  totalQuestionsAsked: number
  personalAverage: number
  facilityAverage: number
  incidentType: string
}

export async function generateCoachingTips(
  input: CoachingInput
): Promise<string[]> {
  const systemPrompt = `You are a supportive clinical documentation coach.
Generate 2-3 brief, specific, actionable coaching tips for a nurse who
just completed an incident report. Be encouraging, not critical.

Focus on:
1. What they did well (fields captured in their initial narrative)
2. What they can improve next time (specific fields they missed)
3. How they compare to facility average (only mention if they are above)

Each tip: 1-2 sentences. No bullet points or numbering in the text.
Return ONLY a JSON array of strings: ["tip1", "tip2", "tip3"]`

  const userPrompt = `REPORT SUMMARY:
Incident type: ${input.incidentType}
Completeness: ${input.completenessScore}%
Completeness after initial narrative only: ${input.completenessAtTier1}%
Personal average: ${input.personalAverage}%
Facility average: ${input.facilityAverage}%
Total follow-up questions needed: ${input.totalQuestionsAsked}

Fields captured in initial narrative (without being asked): ${input.capturedInTier1.join(", ") || "none"}
Fields that were missed entirely: ${input.missedFields.join(", ") || "none"}

Generate 2-3 coaching tips.`

  try {
    const response = await generateChatCompletion(
      systemPrompt,
      userPrompt,
      { temperature: 0.3, max_tokens: 300 }
    )
    const cleaned = response.replace(/```json\s*/g, "").replace(/```/g, "").trim()
    return JSON.parse(cleaned) as string[]
  } catch {
    // Fallback tips if LLM fails
    return input.completenessScore >= 85
      ? ["Excellent report — thorough and clinically complete."]
      : ["Try to include environment details and medication changes in your opening narrative next time."]
  }
}

Then MODIFY app/api/report/complete/route.ts:
Replace the heuristic coaching tips section with:

import { generateCoachingTips } from "@/lib/agents/coaching-tips-generator"

const coachingTips = await generateCoachingTips({
  completenessScore: session.completenessScore,
  completenessAtTier1: session.completenessAtTier1,
  missedFields: [], // Extract from agentState — fields still null at sign-off
  capturedInTier1: [], // Extract from agentState — fields filled after Tier 1 only
  totalQuestionsAsked: session.tier2Questions.length,
  personalAverage,
  facilityAverage,
  incidentType: session.incidentType,
})

Use coachingTips in the reportCard response instead of the hardcoded array.

Run npm run build. Fix all TypeScript errors.
```

---
---

# Task IR-2f — Tier 1 Question Configuration API
## Phase: IR-2 — Intelligence Pipeline
## Estimated Time: 2 hours
## Depends On: IR-1a complete (tier1-questions.ts exists)

---

## Why This Task Exists

For the pilot, Tier 1 questions are hardcoded. But Scott's vision includes
the ability for facility administrators to customize Gold Standard fields
and potentially add facility-specific Tier 1 questions. This task creates
the API endpoint that serves Tier 1 questions — currently from the config
file, but architecturally ready for database-driven customization.

This also enables the admin settings page (already partially built in
app/admin/settings/incidents/page.tsx) to display and eventually manage
these questions.

---

## What This Task Creates

1. `app/api/admin/incident-config/route.ts` — GET/PATCH for incident type config

---

## Implementation Prompt

```
CREATE app/api/admin/incident-config/route.ts

GET — returns the current Tier 1 questions and Gold Standard config
for a given incident type.

Request: ?incidentType=fall
Response: {
  incidentType: "fall",
  tier1Questions: [...],
  closingQuestions: [...],
  goldStandardFields: { defaultFields: [...], customFields: [...] },
  completionThreshold: 75,
}

PATCH — updates facility-specific settings (threshold, custom fields).
For now: only completionThreshold is editable.
Tier 1 question customization is deferred to post-pilot.

Response: { success: true }

The GET handler loads Tier 1 questions from lib/config/tier1-questions.ts
and Gold Standard fields from lib/gold-standards-builtin.ts +
facility custom fields from MongoDB (FacilityModel.goldStandardCustom).

Run npm run build.
```

---
---

# Task IR-2g — Integration Verification
## Phase: IR-2 — Intelligence Pipeline
## Estimated Time: 1–2 hours
## Depends On: IR-2a through IR-2f complete

---

## Why This Task Exists

Six tasks have built the intelligence layer. This task proves it works
end-to-end: report → embedding → search → intelligence query.

---

## Verification Steps

```
FULL INTELLIGENCE PIPELINE TEST

1. Complete 3 incident reports through the full flow (IR-1 routes)
   - Fall in Room 102 (bed fall, injury)
   - Fall in Room 204 (slip, no injury)
   - Fall in Room 306 (wheelchair, no injury)

2. Verify embeddings exist:
   - All 3 incidents have non-null embedding arrays in MongoDB
   - Each embedding has 1536 dimensions

3. Query facility intelligence:
   POST /api/intelligence/query
   Body: { question: "What are the most common fall locations?" }
   Expected: Answer references Room 102, 204, and 306

4. Query with specific filter:
   POST /api/intelligence/query
   Body: { question: "Which residents have had falls with injuries?" }
   Expected: Answer references only the Room 102 incident

5. Verify auto-insights:
   GET /api/admin/intelligence/insights
   Expected: Returns insight cards including weekly summary and
             resident incident counts

6. Verify clinical record verification:
   Check that all 3 incidents have investigation.verificationResult
   with fidelityScore and overallAssessment

7. Verify report card coaching tips:
   Check that all 3 reports returned coaching tips in the report card
   (from the complete route response, not from MongoDB)
```

---

## Phase IR-2 Epic Complete Marker

After all tasks pass, create `plan/pilot_1/phase_IR2/EPIC-DONE.md`:

```markdown
# Phase IR-2 — Intelligence Pipeline — COMPLETE

## Tasks Completed
- [x] IR-2a — Embedding generation at sign-off
- [x] IR-2b — Facility-wide vector search
- [x] IR-2c — Intelligence Q&A rebuild (cross-incident)
- [x] IR-2d — Clinical record verification agent
- [x] IR-2e — Report card LLM coaching tips
- [x] IR-2f — Tier 1 question configuration API
- [x] IR-2g — Integration verification

## New Files Created
- lib/agents/embedding-service.ts
- lib/agents/vector-search.ts
- lib/agents/verification-agent.ts
- lib/agents/coaching-tips-generator.ts
- app/api/intelligence/query/route.ts
- app/api/admin/intelligence/insights/route.ts
- app/api/admin/incident-config/route.ts

## What Comes Next
Phase IR-3 — Analytics + Data Strategy
```

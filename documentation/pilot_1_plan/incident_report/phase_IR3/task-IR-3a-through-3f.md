# Task IR-3a — Analytics Aggregation Endpoints
## Phase: IR-3 — Analytics + Data Strategy
## Estimated Time: 3–4 hours
## Depends On: Phase IR-1 complete (analytics fields populated on incidents)

---

## Why This Task Exists

The admin dashboard and intelligence pages need aggregated metrics.
Total incidents, average completeness, time trends, location patterns,
staff rankings. These endpoints serve the dashboard widgets and provide
the data that proves WAiK is working.

---

## What This Task Creates

1. `app/api/admin/analytics/overview/route.ts` — facility-level summary
2. `app/api/admin/analytics/staff/route.ts` — per-staff performance
3. `app/api/admin/analytics/trends/route.ts` — time-series data

---

## Success Criteria

- [ ] GET /api/admin/analytics/overview returns facility snapshot
- [ ] GET /api/admin/analytics/staff returns per-staff rankings
- [ ] GET /api/admin/analytics/trends returns weekly time-series
- [ ] All endpoints facility-scoped via auth
- [ ] All endpoints cached in Redis (5-minute TTL)
- [ ] Data is accurate against real incident records

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am building analytics aggregation endpoints for WAiK's admin dashboard.

═══════════════════════════════════════════════════════════
CREATE app/api/admin/analytics/overview/route.ts
═══════════════════════════════════════════════════════════

GET — returns facility-level metrics for the admin dashboard.

Query params: ?days=30 (default 30, max 90)

Response shape:
{
  period: { from: ISO, to: ISO, days: number },
  summary: {
    totalIncidents: number,
    openInvestigations: number,
    avgCompleteness: number,
    avgQuestionsToCompletion: number,
    avgActiveSeconds: number,
    injuryRate: number,          // % of incidents with hasInjury
  },
  byType: Record<string, number>,
  byPhase: Record<string, number>,
  topLocations: Array<{ location: string, count: number }>,
  topResidents: Array<{ name: string, room: string, count: number }>,
  completenessDistribution: {
    excellent: number,   // >= 85%
    good: number,        // 70-84%
    fair: number,        // 50-69%
    poor: number,        // < 50%
  },
}

Implementation:
- Auth required (admin-tier roles only)
- Query IncidentModel with facilityId + date range
- Aggregate using MongoDB $group or in-memory computation
- Cache result in Redis at waik:analytics:overview:{facilityId}:{days}
  with 300-second TTL (5 minutes)

═══════════════════════════════════════════════════════════
CREATE app/api/admin/analytics/staff/route.ts
═══════════════════════════════════════════════════════════

GET — returns per-staff performance metrics.

Query params: ?days=30

Response shape:
{
  staff: Array<{
    staffId: string,
    staffName: string,
    totalReports: number,
    avgCompleteness: number,
    avgQuestionsNeeded: number,
    avgActiveSeconds: number,
    currentStreak: number,
    trend: "improving" | "stable" | "declining",
  }>,
  facilityAverage: number,
}

Implementation:
- Group incidents by staffId
- For each staff: compute averages from their incidents
- Trend: compare last 5 reports avg to previous 5 reports avg
  - If diff > +5: "improving"
  - If diff < -5: "declining"
  - Else: "stable"
- Sort by totalReports desc
- Cache in Redis: waik:analytics:staff:{facilityId}:{days}, TTL 300s

═══════════════════════════════════════════════════════════
CREATE app/api/admin/analytics/trends/route.ts
═══════════════════════════════════════════════════════════

GET — returns weekly time-series for charts.

Query params: ?weeks=8 (default 8, max 52)

Response shape:
{
  weeks: Array<{
    weekStart: ISO,
    weekEnd: ISO,
    incidentCount: number,
    avgCompleteness: number,
    avgQuestionsNeeded: number,
    avgActiveSeconds: number,
    injuryCount: number,
  }>
}

Implementation:
- Generate week boundaries (Monday to Sunday)
- For each week: filter incidents by phaseTransitionTimestamps.phase1Signed
- Aggregate metrics per week
- Cache in Redis: waik:analytics:trends:{facilityId}:{weeks}, TTL 300s

Run npm run build. Fix all TypeScript errors.
```

---
---

# Task IR-3b — Weekly Intelligence Report Auto-Generation
## Phase: IR-3 — Analytics + Data Strategy
## Estimated Time: 3–4 hours
## Depends On: IR-3a complete (analytics endpoints), IR-2c (intelligence Q&A)

---

## Why This Task Exists

Every Monday morning, WAiK generates an unprompted intelligence report
for community leadership. No query required. No dashboard to build.
WAiK notices what is worth noticing and presents it in plain language.

This is the feature that proves WAiK is not just documentation — it is
an intelligence system working for your community 24/7.

---

## What This Task Creates

1. `lib/agents/weekly-report-generator.ts` — report generation logic
2. `app/api/cron/weekly-report/route.ts` — Vercel cron handler

---

## Success Criteria

- [ ] Weekly report generated with 4 sections
- [ ] Section 1: This Week at a Glance (incident counts vs prior week)
- [ ] Section 2: Completeness Trend (8-week trajectory)
- [ ] Section 3: Attention Needed (anomaly flags)
- [ ] Section 4: Staff Performance (coaching opportunities)
- [ ] Report stored in MongoDB (new WeeklyReportModel or on FacilityModel)
- [ ] Notification sent to DON/admin with report summary
- [ ] Cron handler protected by CRON_SECRET header
- [ ] Cron runs for all active facilities

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I am building WAiK's weekly intelligence report auto-generation.

═══════════════════════════════════════════════════════════
CREATE lib/agents/weekly-report-generator.ts
═══════════════════════════════════════════════════════════

import { queryFacilityIncidentStats } from "@/lib/agents/vector-search"
import { generateChatCompletion } from "@/lib/openai"

interface WeeklyReport {
  facilityId: string
  generatedAt: string
  weekStart: string
  weekEnd: string
  sections: {
    atAGlance: {
      incidentsThisWeek: number
      incidentsLastWeek: number
      investigationsClosed: number
      avgCompleteness: number
      avgCompletenessLastWeek: number
    }
    completenessNarrative: string    // LLM-written paragraph about the trend
    attentionNeeded: string[]        // anomaly flags in plain language
    staffPerformance: string         // LLM-written paragraph about staff trends
  }
  rawData: any                       // full stats for debugging
}

export async function generateWeeklyReport(
  facilityId: string
): Promise<WeeklyReport> {

  const now = new Date()
  const weekEnd = now
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Get this week and last week stats
  const thisWeek = await queryFacilityIncidentStats(facilityId, weekStart, weekEnd)
  const lastWeek = await queryFacilityIncidentStats(facilityId, prevWeekStart, weekStart)

  // Build at-a-glance section
  const atAGlance = {
    incidentsThisWeek: thisWeek.total,
    incidentsLastWeek: lastWeek.total,
    investigationsClosed: 0, // TODO: count phase transitions to "closed" this week
    avgCompleteness: thisWeek.avgCompleteness,
    avgCompletenessLastWeek: lastWeek.avgCompleteness,
  }

  // Detect anomalies for "Attention Needed"
  const attentionNeeded: string[] = []

  // Location clustering
  for (const [loc, count] of Object.entries(thisWeek.byLocation)) {
    if (count >= 3) {
      attentionNeeded.push(
        `${loc} has had ${count} incidents this week — above normal. Consider an environmental review.`
      )
    }
  }

  // Repeat residents
  for (const resident of thisWeek.byResident) {
    if (resident.count >= 2) {
      attentionNeeded.push(
        `${resident.name} (Room ${resident.room}) had ${resident.count} incidents this week. Care plan review recommended.`
      )
    }
  }

  // Completeness drop
  if (lastWeek.avgCompleteness > 0 && thisWeek.avgCompleteness < lastWeek.avgCompleteness - 10) {
    attentionNeeded.push(
      `Documentation completeness dropped from ${lastWeek.avgCompleteness}% to ${thisWeek.avgCompleteness}% this week. Consider a staff refresher on thorough initial narratives.`
    )
  }

  // Generate LLM narratives for the report
  const context = `
FACILITY WEEKLY DATA:
This week: ${thisWeek.total} incidents, avg completeness ${thisWeek.avgCompleteness}%, avg collection time ${Math.round(thisWeek.avgActiveSeconds / 60)} min
Last week: ${lastWeek.total} incidents, avg completeness ${lastWeek.avgCompleteness}%
Types this week: ${Object.entries(thisWeek.byType).map(([k, v]) => `${k}: ${v}`).join(", ")}
Top locations: ${Object.entries(thisWeek.byLocation).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ")}
Repeat residents: ${thisWeek.byResident.filter(r => r.count >= 2).map(r => `${r.name}: ${r.count}`).join(", ") || "none"}
`

  let completenessNarrative = ""
  let staffPerformance = ""

  try {
    completenessNarrative = await generateChatCompletion(
      "You are WAiK Intelligence writing a weekly report for a senior care facility administrator. Write a 2-3 sentence assessment of the documentation quality trend. Be professional, concise, and actionable. If things are improving, say so. If declining, identify the likely cause.",
      `Based on this data, assess the documentation quality trend:\n${context}`,
      { temperature: 0.3, max_tokens: 200 }
    )

    staffPerformance = await generateChatCompletion(
      "You are WAiK Intelligence. Write a 2-3 sentence summary of staff documentation performance. Highlight anyone who improved significantly. Note coaching opportunities without naming specific staff members negatively.",
      `Based on this facility data, assess staff performance:\n${context}`,
      { temperature: 0.3, max_tokens: 200 }
    )
  } catch {
    completenessNarrative = `Average completeness this week: ${thisWeek.avgCompleteness}% (last week: ${lastWeek.avgCompleteness}%).`
    staffPerformance = `${thisWeek.total} reports completed this week across all staff.`
  }

  return {
    facilityId,
    generatedAt: now.toISOString(),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    sections: {
      atAGlance,
      completenessNarrative,
      attentionNeeded,
      staffPerformance,
    },
    rawData: { thisWeek, lastWeek },
  }
}

═══════════════════════════════════════════════════════════
CREATE app/api/cron/weekly-report/route.ts
═══════════════════════════════════════════════════════════

import { generateWeeklyReport } from "@/lib/agents/weekly-report-generator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all active facilities
    const { FacilityModel } = await import("@/backend/src/models/facility.model")
    const facilities = await FacilityModel.find({ status: { $ne: "inactive" } })
      .select("id name").lean()

    const results = []

    for (const facility of facilities) {
      try {
        const report = await generateWeeklyReport(facility.id)

        // Store report (use a simple collection or append to facility)
        // For now: store in Redis with 7-day TTL
        const redis = getRedisClient()
        await redis.set(
          `waik:weekly-report:${facility.id}:${report.weekStart}`,
          JSON.stringify(report),
          "EX", 7 * 24 * 60 * 60
        )

        // Send notification to DON/admin
        // TODO: create notification records

        results.push({ facilityId: facility.id, status: "success" })
      } catch (err) {
        console.error(`[weekly-report] Failed for ${facility.id}:`, err)
        results.push({ facilityId: facility.id, status: "error" })
      }
    }

    return Response.json({ generated: results.length, results })
  } catch (error) {
    console.error("[weekly-report] Cron error:", error)
    return Response.json({ error: "Cron failed" }, { status: 500 })
  }
}

Add to vercel.json crons array:
{ "path": "/api/cron/weekly-report", "schedule": "0 7 * * 1" }

This runs every Monday at 7am UTC.

Run npm run build. Fix all TypeScript errors.
```

---
---

# Task IR-3c — Question Effectiveness Tracking
## Phase: IR-3 — Analytics + Data Strategy
## Estimated Time: 2–3 hours
## Depends On: IR-1e complete (dataPointsPerQuestion populated)

---

## Why This Task Exists

Every incident records how many Gold Standard fields each question
covered. Over time, this data reveals which question phrasings are
most effective — which ones consistently elicit 5+ data points versus
which ones only get 1-2. This is the data that eventually trains the
Question Compressor to generate better questions.

---

## What This Task Creates

1. `lib/analytics/question-effectiveness.ts` — ranking engine
2. `app/api/admin/analytics/questions/route.ts` — API endpoint

---

## Implementation Prompt

```
CREATE lib/analytics/question-effectiveness.ts

interface QuestionRanking {
  questionText: string
  timesAsked: number
  avgDataPointsCovered: number
  maxDataPointsCovered: number
  commonFieldsCovered: string[]     // most frequently covered fields
  effectivenessScore: number        // composite ranking 0-100
}

export async function rankQuestionEffectiveness(
  facilityId: string,
  incidentType?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<QuestionRanking[]> {

  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  const query: any = {
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
    "dataPointsPerQuestion.0": { $exists: true },  // has at least one entry
  }
  if (incidentType) query.incidentType = incidentType
  if (dateFrom) query.createdAt = { ...query.createdAt, $gte: dateFrom }
  if (dateTo) query.createdAt = { ...query.createdAt, $lte: dateTo }

  const incidents = await IncidentModel.find(query)
    .select("dataPointsPerQuestion")
    .lean()

  // Aggregate across all incidents
  const questionMap = new Map<string, {
    text: string
    totalDataPoints: number
    maxDataPoints: number
    count: number
    fieldFrequency: Record<string, number>
  }>()

  for (const inc of incidents) {
    for (const dpq of (inc.dataPointsPerQuestion || [])) {
      // Normalize question text (lowercase, trim) for grouping
      const key = (dpq.questionText || "").toLowerCase().trim().slice(0, 100)
      if (!key) continue

      const existing = questionMap.get(key) || {
        text: dpq.questionText,
        totalDataPoints: 0,
        maxDataPoints: 0,
        count: 0,
        fieldFrequency: {},
      }

      existing.totalDataPoints += (dpq.dataPointsCovered || 0)
      existing.maxDataPoints = Math.max(existing.maxDataPoints, dpq.dataPointsCovered || 0)
      existing.count++

      for (const field of (dpq.fieldsCovered || [])) {
        existing.fieldFrequency[field] = (existing.fieldFrequency[field] || 0) + 1
      }

      questionMap.set(key, existing)
    }
  }

  // Compute rankings
  const rankings: QuestionRanking[] = Array.from(questionMap.values())
    .filter(q => q.count >= 2)  // need at least 2 data points
    .map(q => {
      const avgDP = q.totalDataPoints / q.count
      const commonFields = Object.entries(q.fieldFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([field]) => field)

      return {
        questionText: q.text,
        timesAsked: q.count,
        avgDataPointsCovered: Math.round(avgDP * 10) / 10,
        maxDataPointsCovered: q.maxDataPoints,
        commonFieldsCovered: commonFields,
        effectivenessScore: Math.round(
          Math.min(100, (avgDP / 5) * 50 + (q.count / 10) * 30 + (q.maxDataPoints / 8) * 20)
        ),
      }
    })
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)

  return rankings
}

CREATE app/api/admin/analytics/questions/route.ts

GET endpoint that returns question effectiveness rankings.
Auth: admin-tier only. Cache: Redis 1 hour.

Run npm run build.
```

---
---

# Task IR-3d — Staff Improvement Trajectory
## Phase: IR-3 — Analytics + Data Strategy
## Estimated Time: 2–3 hours
## Depends On: IR-3a complete (analytics endpoints)

---

## Why This Task Exists

Scott's vision: "Does this individual improve over time?" Track each
nurse's report quality over their history with WAiK. Show whether they
need fewer questions over time, whether their completeness is climbing,
and where they might benefit from coaching.

---

## What This Task Creates

1. `lib/analytics/staff-trajectory.ts` — per-staff improvement tracking
2. `app/api/staff/analytics/trajectory/route.ts` — personal analytics for staff

---

## Implementation Prompt

```
CREATE lib/analytics/staff-trajectory.ts

interface StaffTrajectory {
  staffId: string
  staffName: string
  totalReports: number
  trajectory: Array<{
    incidentId: string
    date: string
    completeness: number
    questionsNeeded: number
    activeSeconds: number
    dataPointsCaptured: number
  }>
  metrics: {
    avgCompleteness: number
    avgCompletenessLast5: number
    avgCompletenessFirst5: number
    improvement: number            // last5 - first5
    avgQuestionsNeeded: number
    avgQuestionsLast5: number
    bestCompleteness: number
    bestStreak: number
    currentStreak: number
  }
  trend: "improving" | "stable" | "declining" | "new"
}

export async function getStaffTrajectory(
  staffId: string,
  facilityId: string
): Promise<StaffTrajectory> {

  const { IncidentModel } = await import("@/backend/src/models/incident.model")

  const incidents = await IncidentModel.find({
    staffId,
    facilityId,
    phase: { $in: ["phase_1_complete", "phase_2_in_progress", "closed"] },
  })
    .sort({ "phaseTransitionTimestamps.phase1Signed": 1 })
    .select("id staffName completenessAtSignoff tier2QuestionsGenerated questionsAnswered activeDataCollectionSeconds dataPointsPerQuestion phaseTransitionTimestamps")
    .lean()

  if (incidents.length === 0) {
    return {
      staffId,
      staffName: "",
      totalReports: 0,
      trajectory: [],
      metrics: {
        avgCompleteness: 0, avgCompletenessLast5: 0, avgCompletenessFirst5: 0,
        improvement: 0, avgQuestionsNeeded: 0, avgQuestionsLast5: 0,
        bestCompleteness: 0, bestStreak: 0, currentStreak: 0,
      },
      trend: "new",
    }
  }

  const trajectory = incidents.map(inc => ({
    incidentId: inc.id,
    date: inc.phaseTransitionTimestamps?.phase1Signed?.toISOString() || "",
    completeness: inc.completenessAtSignoff || 0,
    questionsNeeded: inc.tier2QuestionsGenerated || 0,
    activeSeconds: inc.activeDataCollectionSeconds || 0,
    dataPointsCaptured: (inc.dataPointsPerQuestion || [])
      .reduce((sum: number, q: any) => sum + (q.dataPointsCovered || 0), 0),
  }))

  // Compute metrics
  const scores = trajectory.map(t => t.completeness)
  const first5 = scores.slice(0, 5)
  const last5 = scores.slice(-5)
  const avgFirst5 = first5.reduce((a, b) => a + b, 0) / first5.length
  const avgLast5 = last5.reduce((a, b) => a + b, 0) / last5.length

  // Streak calculation
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] >= 85) {
      if (i === scores.length - 1 - currentStreak) currentStreak++
      tempStreak++
      bestStreak = Math.max(bestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  const improvement = Math.round(avgLast5 - avgFirst5)
  let trend: "improving" | "stable" | "declining" | "new" = "stable"
  if (incidents.length < 3) trend = "new"
  else if (improvement > 5) trend = "improving"
  else if (improvement < -5) trend = "declining"

  return {
    staffId,
    staffName: incidents[0].staffName || "",
    totalReports: incidents.length,
    trajectory,
    metrics: {
      avgCompleteness: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      avgCompletenessLast5: Math.round(avgLast5),
      avgCompletenessFirst5: Math.round(avgFirst5),
      improvement,
      avgQuestionsNeeded: Math.round(
        trajectory.reduce((s, t) => s + t.questionsNeeded, 0) / trajectory.length
      ),
      avgQuestionsLast5: Math.round(
        trajectory.slice(-5).reduce((s, t) => s + t.questionsNeeded, 0) / Math.min(5, trajectory.length)
      ),
      bestCompleteness: Math.max(...scores),
      bestStreak,
      currentStreak,
    },
    trend,
  }
}

CREATE app/api/staff/analytics/trajectory/route.ts

GET — returns the calling staff member's own trajectory.
Auth: any authenticated user. Scoped to their own staffId.

Response: the StaffTrajectory object.

This powers the staff performance card on their dashboard
and their personal intelligence page.

Run npm run build.
```

---
---

# Task IR-3e — Old Route Cleanup + Migration Verification
## Phase: IR-3 — Analytics + Data Strategy
## Estimated Time: 1–2 hours
## Depends On: All IR-1, IR-2, IR-3a-d tasks complete

---

## Why This Task Exists

Final sweep. Verify that no part of the codebase still references
the six deleted agent routes. Verify the InterviewWorkSession Redis
key pattern is no longer used. Clean up any dead imports.

---

## Implementation Prompt

```
COMPREHENSIVE CLEANUP:

1. Search for ALL references to old patterns:
   grep -r "interview-work\|InterviewWorkSession\|agent/report\|agent/interview\|agent/investigate\|report-conversational" \
     --include="*.ts" --include="*.tsx" -l

2. For each file found:
   - If it is a deleted file: verify it no longer exists
   - If it references old routes: update to new /api/report/* routes
   - If it imports InterviewWorkSession: remove or replace with ReportSession
   - If it is a type file that defines InterviewWorkSession: mark for deletion

3. Check for orphaned Redis sessions:
   - The old key patterns (waik:session:*, waik:interview-work:*) may have
     leftover data in Redis. These will expire naturally via TTL.
   - No cleanup needed, but document in the DONE file.

4. Verify no broken imports:
   npm run build
   Must pass with zero errors.

5. Verify the complete report flow still works:
   Run the 8-step journey test from IR-1h.
```

---
---

# Task IR-3f — Complete Integration Test (Full System)
## Phase: IR-3 — Analytics + Data Strategy
## Estimated Time: 2 hours
## Depends On: All IR-1, IR-2, IR-3a-e tasks complete

---

## Why This Task Exists

The final proof. Every layer of the incident reporting system tested
end-to-end: frontend → API → LangGraph pipeline → Redis → MongoDB →
embeddings → intelligence → analytics → report card.

---

## Full System Verification

```
═══ LAYER 1: INCIDENT REPORT FLOW ═══

1. Open WAiK as Maria Torres (RN)
2. Tap Report Incident → Fall → select Margaret Chen Room 102
3. Answer all 5 Tier 1 questions via voice
4. Verify: gap analysis triggers, Tier 2 questions appear
5. Answer 3 Tier 2 questions
6. Verify: some questions disappear (implicitly answered)
7. Tap "Answer Later" — verify dashboard shows pending
8. Return to incident — answer remaining questions
9. Verify: closing questions appear when threshold reached
10. Answer all 3 closing questions
11. Verify: sign-off screen shows clinical record
12. Edit one section, sign off
13. Verify: report card shows score, streak, coaching tips

═══ LAYER 2: DATA PERSISTENCE ═══

14. MongoDB incident has:
    - phase: "phase_1_complete"
    - initialReport.narrative (original words)
    - initialReport.enhancedNarrative (clinical record)
    - initialReport.signature (signed, timestamped)
    - investigation.goldStandard (populated JSON)
    - investigation.verificationResult (fidelity check)
    - completenessAtSignoff > 0
    - activeDataCollectionSeconds > 0
    - dataPointsPerQuestion.length > 0
    - embedding (1536-dimension array)
    - auditTrail with "signed" entry

15. Redis session deleted (waik:report:{id} no longer exists)

═══ LAYER 3: INTELLIGENCE ═══

16. POST /api/intelligence/query
    { question: "Tell me about Margaret Chen's fall" }
    Verify: answer references the incident we just created

17. GET /api/admin/intelligence/insights
    Verify: insight cards generated, include incident count

═══ LAYER 4: ANALYTICS ═══

18. GET /api/admin/analytics/overview?days=30
    Verify: totalIncidents includes our new incident

19. GET /api/admin/analytics/staff
    Verify: Maria Torres appears with correct metrics

20. GET /api/staff/analytics/trajectory
    Verify: trajectory includes our new incident

═══ LAYER 5: ADMIN DASHBOARD ═══

21. Sign in as Dr. Sarah Kim (DON)
22. Verify: notification about Room 102 fall exists
23. Verify: incident appears in Needs Attention tab
24. Verify: incident detail shows complete Phase 1 record
```

---

## Phase IR-3 Epic Complete Marker

After all tasks pass, create `plan/pilot_1/phase_IR3/EPIC-DONE.md`:

```markdown
# Phase IR-3 — Analytics + Data Strategy — COMPLETE

## Tasks Completed
- [x] IR-3a — Analytics aggregation endpoints (overview, staff, trends)
- [x] IR-3b — Weekly intelligence report auto-generation
- [x] IR-3c — Question effectiveness tracking
- [x] IR-3d — Staff improvement trajectory
- [x] IR-3e — Old route cleanup + migration verification
- [x] IR-3f — Complete integration test

## New Files Created
- app/api/admin/analytics/overview/route.ts
- app/api/admin/analytics/staff/route.ts
- app/api/admin/analytics/trends/route.ts
- app/api/admin/analytics/questions/route.ts
- app/api/staff/analytics/trajectory/route.ts
- app/api/cron/weekly-report/route.ts
- lib/agents/weekly-report-generator.ts
- lib/analytics/question-effectiveness.ts
- lib/analytics/staff-trajectory.ts

## The Complete Incident Reporting Stack

Frontend:
  app/staff/report/page.tsx → QuestionBoard → VoiceInputScreen

API Layer:
  POST /api/report/start → create incident + Redis session
  POST /api/report/answer → persist answer + re-analyze gaps
  POST /api/report/complete → sign-off + clinical record + report card

Intelligence Pipeline:
  analyze.ts → gap_questions.ts → fill_gaps.ts → finalize.ts
  clinical-record-generator.ts → verification-agent.ts
  embedding-service.ts → vector-search.ts → intelligence-qa.ts

Analytics:
  question-effectiveness.ts → staff-trajectory.ts
  weekly-report-generator.ts → analytics endpoints

Storage:
  MongoDB: IncidentModel (permanent record + embeddings)
  Redis: ReportSession (live session, 2hr TTL)

## What WAiK Now Captures Per Incident
- Original nurse narrative (preserved verbatim, sealed at sign-off)
- AI-generated clinical record (verified for fidelity)
- Gold Standard analysis (22+ fields for falls)
- Analytics: questions generated, answered, deferred, active seconds
- Data points per question (for compression engine training)
- Searchable embedding (1536 dimensions, text-embedding-3-small)
- Verification result (fidelity score, additions, omissions)
- Report card coaching tips (personalized, LLM-generated)

## What WAiK Now Answers
- "What are the most common fall locations this month?"
- "Which residents have had repeated incidents?"
- "How is Maria Torres improving over time?"
- "Which question phrasings produce the most data points?"
- Weekly intelligence reports — unprompted, every Monday at 7am
```

# Task 05d — Performance Card + Streak Analytics
## Phase: 3c — Staff Dashboard
## Estimated Time: 2–3 hours
## Depends On: task-05c (assessments complete)

---

## Why This Task Exists

The performance card is the coaching layer of the staff dashboard. Scott
said in the second co-founder meeting: "People like to do well. They like
immediate feedback. I can definitely see nurses competing with each other
in a good way." The streak indicator is the game mechanic that makes that
possible.

But performance analytics are a trap if implemented naively. The incidents
already loaded on the dashboard are filtered to phase_1_in_progress and
recent reports — they are not the full history needed for accurate averages
and streaks. Computing analytics client-side from partial data produces
wrong numbers.

**Design pattern: Server-side aggregation for analytics.**
A dedicated `GET /api/staff/performance` endpoint runs MongoDB aggregation
against the full 30-day history for this staff member. It returns
pre-computed numbers: average completeness, streak count, month-over-month
comparison. The client renders these numbers — it does not compute them.

**Infrastructure: Redis cache for performance data.**
Performance analytics are expensive (aggregation across all incidents for
this staff member) but do not change often. A nurse who submits a report
at 6am will not see her streak change until her next report. Caching the
performance response in Redis for 10 minutes is correct.

Key: `waik:perf:{staffId}:{facilityId}`
TTL: 600 seconds (10 minutes)
Invalidation: the report sign-off route (task-03e / future task-09)
should call `redis.del(cacheKey)` after a successful sign-off so the
performance card shows updated data promptly after a new report.

**The streak definition (authoritative):**
A streak is the count of consecutive closed or phase_1_complete incidents
(newest first) where `completenessAtSignoff >= 85`. Count stops at the
first incident below 85%.

Example: [93%, 91%, 82%, 84%, 88%] → streak = 2 (93%, 91% above 85%, then 82% breaks it)

The streak only counts incidents with a real `completenessAtSignoff` value
(> 0). Phase_1_in_progress incidents do not count toward the streak because
they have not been signed yet.

---

## Context Files

- `app/staff/dashboard/page.tsx` — add performance section
- `app/api/staff/performance/route.ts` — CREATE THIS
- `lib/redis.ts` — from task-03a
- `lib/permissions.ts` — withAuth()
- `backend/src/models/incident.model.ts` — completenessAtSignoff, staffId

---

## Performance API Response Shape

```typescript
interface StaffPerformance {
  averageCompleteness30d: number      // mean of completenessAtSignoff for signed incidents
  averageCompleteness30dPrev: number  // prior 30 days (for month comparison)
  currentStreak: number               // consecutive above-85% reports
  bestStreak: number                  // all-time max streak
  totalReports30d: number             // signed incidents this month
  generatedAt: string                 // ISO — for cache freshness display
}
```

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] GET /api/staff/performance returns StaffPerformance shape
- [ ] averageCompleteness30d computed from completenessAtSignoff only (not score)
- [ ] currentStreak computed correctly using consecutive-above-85% rule
- [ ] bestStreak is all-time high consecutive above-85% count
- [ ] Performance data cached in Redis 10 minutes (waik:perf:{userId}:{facilityId})
- [ ] Cache miss: runs aggregation, stores, returns
- [ ] Cache hit: returns without touching MongoDB
- [ ] Performance card collapsed by default on dashboard
- [ ] Shows single large number (averageCompleteness30d) when collapsed
- [ ] Score color: teal ≥ 85%, amber 60-84%, red < 60%
- [ ] Tapping card expands to show: month comparison, streak, best streak, link
- [ ] Month comparison shows direction arrow (↑ green, ↓ amber, → gray)
- [ ] Streak card shows 🔥 and count when currentStreak ≥ 3
- [ ] Streak card hidden when currentStreak < 3
- [ ] "View full analysis" link navigates to /staff/intelligence
- [ ] Loading skeleton while performance data fetches

---

## Test Cases

```
TEST 1 — Performance API returns correct shape for Maria
  Action: Sign in as m.torres@sunrisemn.com
          GET /api/staff/performance
  Expected: averageCompleteness30d ≈ 87 (mean of INC-004:82, INC-006:82, INC-007:91, INC-009:93)
            currentStreak = 4 (93, 91, 82, 82 — all ≥ 85? Wait: 82 < 85)
            Recalculate: 93 ✓, 91 ✓, then 82 ✗ → streak = 2
            (This is the correct streak based on the authoritative definition)
            bestStreak = 2
            totalReports30d = 5 (all within 30 days)
  Pass/Fail: ___
  Note: Update seed data interpretation if streak calculation differs.

TEST 2 — Streak definition enforced
  Action: Create test with scores [93, 91, 88, 80, 90]
          Call performance API
  Expected: currentStreak = 3 (93, 91, 88 all ≥ 85; 80 breaks it)
  Pass/Fail: ___

TEST 3 — Performance data cached in Redis
  Action: GET /api/staff/performance twice within 10 minutes
  Expected: Second call returns same data without MongoDB aggregation
            Redis CLI: EXISTS waik:perf:user-rn-001:fac-sunrise-mpls-001 → 1
  Pass/Fail: ___

TEST 4 — Performance card collapsed by default
  Action: Load /staff/dashboard as m.torres@sunrisemn.com
  Expected: Single large number visible (approximately 87%)
            Score color: teal (≥ 85%)
            Detailed stats NOT visible
  Pass/Fail: ___

TEST 5 — Performance card expands on tap
  Action: Tap performance card
  Expected: Expands to show:
            "This month: 87% | Last month: —%" with direction arrow
            (prev30 likely 0 for seed data — show → gray)
            Best streak: 2
            "View full analysis →" link
  Pass/Fail: ___

TEST 6 — Streak card shown at ≥ 3 consecutive
  Action: Create scenario where nurse has 4 consecutive above-85% reports
  Expected: "🔥 4-report streak — above 85%" visible in expanded card
  Pass/Fail: ___

TEST 7 — Streak card hidden below threshold
  Action: Maria's streak = 2 (below 3 threshold)
  Expected: No flame emoji or streak card visible
  Pass/Fail: ___

TEST 8 — Loading skeleton for performance
  Action: Throttle to Slow 3G, load dashboard
  Expected: Skeleton card visible where performance card will be
            Same height as collapsed performance card
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building the staff dashboard performance card for WAiK (Next.js 14).
This task builds the server-side analytics endpoint with Redis caching
and the collapsible performance card UI.

PART A — CREATE GET /api/staff/performance/route.ts

export const GET = withAuth(async (req, { currentUser }) => {
  const { userId, facilityId } = currentUser
  const cacheKey = `waik:perf:${userId}:${facilityId}`
  const CACHE_TTL = 600  // 10 minutes
  
  // Check Redis cache
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return Response.json(JSON.parse(cached))
  } catch (e) {
    console.warn("[perf] Cache miss:", e.message)
  }
  
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  
  // All signed incidents for this staff member (completenessAtSignoff > 0)
  const allSigned = await IncidentModel.find({
    facilityId,
    staffId: userId,
    completenessAtSignoff: { $gt: 0 }
  })
  .sort({ "phaseTransitionTimestamps.phase1Signed": -1 })  // newest first
  .select("completenessAtSignoff phaseTransitionTimestamps.phase1Signed")
  .lean()
  
  // Current 30 days
  const current30 = allSigned.filter(i => {
    const signed = i.phaseTransitionTimestamps?.phase1Signed
    return signed && new Date(signed) >= thirtyDaysAgo
  })
  
  // Prior 30 days
  const prev30 = allSigned.filter(i => {
    const signed = i.phaseTransitionTimestamps?.phase1Signed
    return signed && new Date(signed) >= sixtyDaysAgo && new Date(signed) < thirtyDaysAgo
  })
  
  // Average completeness
  const avg = (arr: typeof allSigned) =>
    arr.length > 0
      ? Math.round(arr.reduce((s, i) => s + i.completenessAtSignoff, 0) / arr.length)
      : 0
  
  // Streak: consecutive above-85% newest first
  let currentStreak = 0
  for (const incident of allSigned) {
    if (incident.completenessAtSignoff >= 85) {
      currentStreak++
    } else {
      break  // stop at first below-85%
    }
  }
  
  // Best streak: scan full history for max consecutive run
  let bestStreak = 0
  let runningStreak = 0
  for (const incident of allSigned) {
    if (incident.completenessAtSignoff >= 85) {
      runningStreak++
      bestStreak = Math.max(bestStreak, runningStreak)
    } else {
      runningStreak = 0
    }
  }
  
  const performance = {
    averageCompleteness30d: avg(current30),
    averageCompleteness30dPrev: avg(prev30),
    currentStreak,
    bestStreak,
    totalReports30d: current30.length,
    generatedAt: now.toISOString()
  }
  
  // Cache
  try {
    await redis.set(cacheKey, JSON.stringify(performance), "EX", CACHE_TTL)
  } catch (e) {
    console.warn("[perf] Cache store failed:", e.message)
  }
  
  return Response.json(performance)
})

PART B — PERFORMANCE CARD UI

In app/staff/dashboard/page.tsx, add performance data fetch:

  const [perf, setPerf] = useState<StaffPerformance | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)
  
  useEffect(() => {
    fetch("/api/staff/performance")
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPerf(data); setPerfLoading(false) })
  }, [])

PERFORMANCE CARD (below assessments section):

  const [expanded, setExpanded] = useState(false)
  
  function scoreColor(score: number): string {
    if (score >= 85) return "#0D7377"   // teal
    if (score >= 60) return "#E8A838"   // amber
    return "#C0392B"                    // red
  }

  Loading state: skeleton card, same height as collapsed card (~80px)
  
  COLLAPSED STATE (default):
    White card, rounded-xl, p-4, shadow-sm, cursor-pointer
    onClick: setExpanded(true)
    
    Flex between items-center:
      Left:
        Large number: perf.averageCompleteness30d + "%"
          text-5xl font-bold, color: scoreColor(perf.averageCompleteness30d)
        Small label: "Your average completeness (30 days)"
          text-xs text-muted mt-1
      Right:
        Chevron down icon (Lucide ChevronDown, 20px, text-muted)
  
  EXPANDED STATE:
    Same card, onClick: setExpanded(false), chevron up
    
    Score at top (same as collapsed)
    
    Divider line
    
    MONTH COMPARISON row:
      "This month: [X]%  |  Last month: [Y]%"
      Direction arrow after:
        If averageCompleteness30d > averageCompleteness30dPrev:
          Green ↑
        Else if equal (or prev is 0):
          Gray →
        Else:
          Amber ↓
    
    STREAK CARD (only when currentStreak >= 3):
      Amber background, rounded-lg, p-3, mt-3
      "🔥 [currentStreak]-report streak — above 85%"
      font-semibold, text-dark-teal
    
    BEST STREAK (always shown if bestStreak > 0):
      "Best streak: [bestStreak] reports" text-muted text-sm mt-2
    
    "View full analysis →" link → /staff/intelligence
      text-teal text-sm mt-3

POSITION: place Performance card at the bottom of the dashboard,
below assessments section. It is the last section before the tab bar.

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/10-STAFF-DASHBOARD.md` — performance card + analytics
- Document /api/staff/performance in `documentation/waik/03-API-REFERENCE.md`
- Create `plan/pilot_1/phase_3c/task-05d-DONE.md`


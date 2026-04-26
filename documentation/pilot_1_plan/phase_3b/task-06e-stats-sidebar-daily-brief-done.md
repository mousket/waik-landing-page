# Task 06e — Quick Stats Sidebar + Daily Brief
## Phase: 3b — Admin Dashboard
## Estimated Time: 2–3 hours
## Depends On: task-06d (all three tabs complete)

---

## Why This Task Exists

The quick stats sidebar and daily brief card are the ambient awareness
layer of the admin dashboard. They give the DON a sense of how the
community is performing without requiring her to actively query anything.

**Design pattern: Aggregation endpoint, not client-side computation.**
The stats — total incidents, average completeness, average days to close
— could theoretically be computed from the incidents already loaded in
the tabs. This is tempting but wrong. The tabs show filtered subsets
(phase_2_in_progress, closed last 30 days). The stats need the full
30-day picture across all phases. Computing stats from partial tab data
produces wrong numbers.

The correct pattern: a dedicated `GET /api/admin/dashboard-stats` endpoint
that runs MongoDB aggregation pipelines server-side and returns pre-computed
numbers. Aggregation is MongoDB's strength — letting the database compute
averages and counts is faster and more accurate than pulling all incidents
to the client and computing there.

**Infrastructure: Caching with Redis.**
Dashboard stats are expensive to compute (aggregation across many documents)
but do not need to be real-time. A 5-minute Redis cache is appropriate:
  Key: `waik:stats:{facilityId}`
  TTL: 300 seconds
  On cache miss: run MongoDB aggregation, store result, return
  On cache hit: return immediately

This pattern — cache expensive reads with short TTL — is fundamental to
building performant APIs. The DON does not need stats updated every second.
Every 5 minutes is more than sufficient.

**The daily brief is localStorage-gated.**
It appears once per calendar day. The dismiss state is stored in
`localStorage` with a date key, not in the database. Why localStorage
and not the server? Because the brief is cosmetic — it does not affect
any business logic. Storing it server-side would require an API call
and a database write just to remember that a user clicked X. For purely
presentational state: localStorage is correct.

---

## Context Files

- `app/admin/dashboard/page.tsx` — add sidebar + daily brief
- `app/api/admin/dashboard-stats/route.ts` — CREATE THIS
- `lib/redis.ts` — from task-03a
- `lib/permissions.ts` — withAdminAuth()

---

## Stats API Response Shape

```typescript
interface DashboardStats {
  totalIncidents30d: number
  avgCompleteness30d: number           // mean of completenessAtSignoff
  avgDaysToClose30d: number            // mean of daysToClose for closed incidents
  injuryFlagPercent30d: number         // % of all incidents with hasInjury: true
  totalIncidentsPrev30d: number        // same metrics for prior 30 days (for trend arrows)
  avgCompletenessPrev30d: number
  avgDaysToClosePrev30d: number
  upcomingAssessments7d: number        // assessments due within 7 days
  generatedAt: string                  // ISO timestamp
}
```

Trend direction:
  totalIncidents: up = amber (more incidents), down = green
  avgCompleteness: up = green, down = amber
  avgDaysToClose: up = amber (worse), down = green (faster)
  injuryFlagPercent: no trend arrow (context-dependent)

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `GET /api/admin/dashboard-stats` returns DashboardStats shape
- [ ] Stats computed from MongoDB aggregation (not client-side)
- [ ] Stats cached in Redis for 5 minutes (key: waik:stats:{facilityId})
- [ ] Cache miss: runs aggregation, stores in Redis, returns
- [ ] Cache hit: returns without touching MongoDB
- [ ] Stats sidebar visible on desktop (280px right column)
- [ ] Stats sidebar moves below tabs on mobile
- [ ] Four stat rows: Total Incidents, Avg Completeness, Avg Days to Close, Injury Flag %
- [ ] Trend arrows: green ↑ or ↓ depending on metric direction
- [ ] Daily brief card appears on first load of the day
- [ ] Daily brief dismissed by clicking X
- [ ] Daily brief does not reappear same calendar day after dismiss
- [ ] Daily brief reappears next calendar day
- [ ] Upcoming assessments list shows assessments due within 7 days
- [ ] Intelligence search input navigates to /admin/intelligence?q={query}

---

## Test Cases

```
TEST 1 — Dashboard stats API returns correct shape
  Action: GET /api/admin/dashboard-stats
  Expected: Response contains all DashboardStats fields
            totalIncidents30d: 10 (from seed data)
            avgCompleteness30d: approximately 80 (mean of seed scores)
  Pass/Fail: ___

TEST 2 — Stats cached in Redis
  Action: GET /api/admin/dashboard-stats twice within 5 minutes
  Expected: Second call returns without MongoDB aggregation
            Redis CLI: EXISTS waik:stats:{facilityId} → 1
            TTL waik:stats:{facilityId} → between 1 and 300
  Pass/Fail: ___

TEST 3 — Stats sidebar visible on desktop
  Action: Load /admin/dashboard at 1280px width
  Expected: Right sidebar (280px) visible with 4 stat rows
  Pass/Fail: ___

TEST 4 — Trend arrows correct direction
  Action: Load stats sidebar
          avgCompleteness30d > avgCompletenessPrev30d
  Expected: Green ↑ arrow next to Avg Completeness
  Pass/Fail: ___

TEST 5 — Daily brief appears on first load
  Action: Clear localStorage. Load /admin/dashboard.
  Expected: Daily brief card visible at top of page
  Pass/Fail: ___

TEST 6 — Daily brief dismisses for day
  Action: Click X on daily brief. Reload page (same day).
  Expected: Daily brief not visible.
  Pass/Fail: ___

TEST 7 — Daily brief reappears next day
  Action: In browser devtools, set localStorage key date to yesterday.
          Reload.
  Expected: Daily brief visible again.
  Pass/Fail: ___

TEST 8 — Intelligence search navigates
  Action: Type "how many falls" in intelligence search input, press Enter
  Expected: Navigate to /admin/intelligence?q=how+many+falls
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task adds the quick stats sidebar
and daily brief to the admin dashboard, plus the dashboard-stats API
with Redis caching.

PART A — CREATE GET /api/admin/dashboard-stats/route.ts

export const GET = withAdminAuth(async (req, { currentUser }) => {
  const facilityId = currentUser.facilityId
  const cacheKey = `waik:stats:${facilityId}`
  const CACHE_TTL = 300  // 5 minutes
  
  // Check Redis cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return Response.json(JSON.parse(cached))
    }
  } catch (cacheErr) {
    console.warn("[Stats] Redis cache miss — falling through to MongoDB:", cacheErr.message)
  }
  
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  
  // Run MongoDB aggregations for current 30 days
  const [current30, prev30, closedCurrent, closedPrev] = await Promise.all([
    // All incidents last 30 days
    IncidentModel.aggregate([
      { $match: { facilityId, startedAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        avgCompleteness: { $avg: "$completenessAtSignoff" },
        injuryCount: { $sum: { $cond: ["$hasInjury", 1, 0] } }
      }}
    ]),
    // All incidents prior 30 days (30-60 days ago)
    IncidentModel.aggregate([
      { $match: { facilityId, startedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        avgCompleteness: { $avg: "$completenessAtSignoff" }
      }}
    ]),
    // Closed incidents last 30 days — for days-to-close
    IncidentModel.aggregate([
      { $match: {
        facilityId,
        phase: "closed",
        "phaseTransitionTimestamps.phase2Locked": { $gte: thirtyDaysAgo }
      }},
      { $project: {
        daysToClose: {
          $divide: [
            { $subtract: [
              "$phaseTransitionTimestamps.phase2Locked",
              "$phaseTransitionTimestamps.phase1Signed"
            ]},
            86400000  // ms per day
          ]
        }
      }},
      { $group: { _id: null, avgDays: { $avg: "$daysToClose" } } }
    ]),
    // Closed prior 30 days — for trend
    IncidentModel.aggregate([
      { $match: {
        facilityId, phase: "closed",
        "phaseTransitionTimestamps.phase2Locked": { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
      }},
      { $project: {
        daysToClose: { $divide: [
          { $subtract: ["$phaseTransitionTimestamps.phase2Locked", "$phaseTransitionTimestamps.phase1Signed"] },
          86400000
        ]}
      }},
      { $group: { _id: null, avgDays: { $avg: "$daysToClose" } } }
    ])
  ])
  
  const c = current30[0] ?? { total: 0, avgCompleteness: 0, injuryCount: 0 }
  const p = prev30[0] ?? { total: 0, avgCompleteness: 0 }
  const cc = closedCurrent[0] ?? { avgDays: 0 }
  const cp = closedPrev[0] ?? { avgDays: 0 }
  
  const stats = {
    totalIncidents30d: c.total,
    avgCompleteness30d: Math.round(c.avgCompleteness ?? 0),
    avgDaysToClose30d: Math.round((cc.avgDays ?? 0) * 10) / 10,
    injuryFlagPercent30d: c.total > 0 ? Math.round((c.injuryCount / c.total) * 100) : 0,
    totalIncidentsPrev30d: p.total,
    avgCompletenessPrev30d: Math.round(p.avgCompleteness ?? 0),
    avgDaysToClosePrev30d: Math.round((cp.avgDays ?? 0) * 10) / 10,
    upcomingAssessments7d: 0,  // TODO: add assessment count when assessment model ready
    generatedAt: now.toISOString()
  }
  
  // Cache in Redis
  try {
    await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL)
  } catch (cacheErr) {
    console.warn("[Stats] Could not cache stats:", cacheErr.message)
  }
  
  return Response.json(stats)
})

PART B — DAILY BRIEF CLIENT COMPONENT

Create components/admin/daily-brief.tsx ("use client"):

interface DailyBriefProps {
  stats: DashboardStats
  userName: string
}

function DailyBrief({ stats, userName }: DailyBriefProps) {
  const today = new Date().toISOString().split("T")[0]
  const dismissKey = `waik-brief-dismissed-${today}`
  
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true
    return !localStorage.getItem(dismissKey)
  })
  
  function dismiss() {
    localStorage.setItem(dismissKey, "1")
    setVisible(false)
  }
  
  if (!visible) return null
  
  const firstName = userName.split(" ")[0]
  
  return (
    <div className="bg-light-bg border-l-4 border-teal rounded-xl p-4 mb-6 flex justify-between items-start">
      <div>
        <p className="font-semibold text-dark-teal">Good morning, {firstName}.</p>
        <p className="text-muted text-sm mt-1">
          {stats.totalIncidents30d} incidents this month —
          {" "}{/* open count would come from tab data — use placeholder for now */}
          {stats.avgCompleteness30d}% average completeness
        </p>
      </div>
      <button onClick={dismiss} className="text-muted hover:text-dark-teal ml-4 text-xl leading-none">
        ×
      </button>
    </div>
  )
}

PART C — STATS SIDEBAR COMPONENT

Create components/admin/stats-sidebar.tsx ("use client"):

Displays four stat rows. Each row:
  Large number (teal, text-3xl, font-bold) | label + trend arrow

Trend arrow logic:
  function TrendArrow({ current, prev, higherIsBetter }: ...) {
    if (prev === 0) return null
    const improved = higherIsBetter ? current > prev : current < prev
    if (improved) return <span className="text-green-600 ml-1">↑</span>
    if (current === prev) return <span className="text-gray-400 ml-1">→</span>
    return <span className="text-amber-500 ml-1">↓</span>
  }

Four rows:
  Total Incidents (30d): totalIncidents30d | higherIsBetter=false (more = amber)
  Avg Completeness: avgCompleteness30d% | higherIsBetter=true
  Avg Days to Close: avgDaysToClose30d days | higherIsBetter=false
  Injury Flag: injuryFlagPercent30d% | no trend arrow

Below stats: Intelligence shortcut
  <input placeholder="Ask your community..." onKeyDown enter → navigate />

PART D — WIRE INTO DASHBOARD PAGE

In app/admin/dashboard/page.tsx:

Layout on desktop (md+):
  <div className="flex gap-6">
    <div className="flex-1">           {/* main content: brief + tabs */}
      <DailyBrief stats={stats} userName={currentUser.name} />
      {/* tabs from 06b/06c/06d */}
    </div>
    <div className="w-70 shrink-0">   {/* sidebar: 280px */}
      <StatsSidebar stats={stats} />
    </div>
  </div>

Layout on mobile:
  Single column: brief → tabs → sidebar (stacked)

Fetch stats: useEffect on mount → GET /api/admin/dashboard-stats

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/11-ADMIN-DASHBOARD.md` — stats sidebar + caching
- Create `plan/pilot_1/phase_3b/task-06e-DONE.md`

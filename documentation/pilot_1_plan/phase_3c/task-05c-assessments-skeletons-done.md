# Task 05c — Assessments Strip + Skeleton States Audit
## Phase: 3c — Staff Dashboard
## Estimated Time: 1–2 hours
## Depends On: task-05b (hero + pending + recent complete)

---

## Why This Task Exists

The assessments strip is the smallest section of the staff dashboard but
it has an important behavioral property: it is conditionally rendered. If
no assessments are due within 7 days, the entire section is invisible. The
dashboard should never show an empty section heading — it wastes screen
real estate that a nurse on a phone does not have.

This task also does a skeleton state audit across the full dashboard. Each
data section has its own fetch timing — incidents load at one speed,
assessments at another. Every section must show a skeleton while its data
is loading, and the skeletons must have the same height as the real content
so the page does not jump when data arrives (this is called layout shift,
and it is a significant UX problem on mobile).

**Design pattern: Conditional rendering with invisible empty states.**
The pattern used here is: if loading → skeleton. If loaded and empty →
render nothing (not "No assessments" — just nothing). If loaded and has
data → render the section. The section heading appears only when there is
data to show. This keeps the dashboard clean.

**Infrastructure: /api/assessments/due.**
This route needs to exist and return assessments where `nextDueAt` is
within 7 days AND the assessment is assigned to the current staff member.
If the AssessmentModel does not exist yet, the route returns an empty array
with a warning — same graceful-skip pattern used in the badge-counts route.

---

## Context Files

- `app/staff/dashboard/page.tsx` — add assessments section
- `app/api/assessments/due/route.ts` — verify or create
- `backend/src/models/assessment.model.ts` — verify existence

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] GET /api/assessments/due returns assessments where nextDueAt is within 7 days
- [ ] GET /api/assessments/due only returns assessments for current user (conductedById === userId)
- [ ] GET /api/assessments/due returns 401 without auth
- [ ] If AssessmentModel does not exist: route returns [] with console.warn
- [ ] Assessments section renders when assessments are due
- [ ] Assessments section completely hidden when nothing due within 7 days
- [ ] Each assessment item shows: room, type, days remaining badge, Start button
- [ ] Days remaining badge: green ≤ 1 day, amber 2-3 days, gray 4-7 days
- [ ] "Start" button navigates to /staff/assessments/[type]?residentId=X
- [ ] Assessments section shows skeleton while loading
- [ ] Skeleton height matches real content height (no layout shift)
- [ ] AUDIT: all sections in dashboard have skeleton states during load
- [ ] AUDIT: no section shows an empty heading when data is empty

---

## Test Cases

```
TEST 1 — GET /api/assessments/due returns correct shape
  Action: Sign in as m.torres@sunrisemn.com
          GET /api/assessments/due
  Expected: ASSESS-003 returned (Room 204, activity, due tomorrow)
            ASSESS-001 NOT returned (due in 9 days — outside 7-day window)
  Pass/Fail: ___

TEST 2 — Assessments only for current user
  Action: Sign in as a.diallo@sunrisemn.com (Amara — dietician)
          GET /api/assessments/due
  Expected: ASSESS-002 returned if due within 7 days, no others
  Pass/Fail: ___

TEST 3 — Assessments section visible for Maria
  Action: Sign in as m.torres@sunrisemn.com, load dashboard
  Expected: "Assessments due this week" section visible
            ASSESS-003: "Room 204 — Activity Assessment — 1 day" visible
  Pass/Fail: ___

TEST 4 — Days remaining badge correct
  Action: View ASSESS-003 (due tomorrow)
  Expected: Green badge "1 day"
  Action: Find assessment due in 3 days (if exists in seed)
  Expected: Amber badge "3 days"
  Pass/Fail: ___

TEST 5 — Assessments section hidden when none due
  Action: Sign in as l.osei@sunrisemn.com (Linda — CNA, no assessments)
          Load dashboard
  Expected: No "Assessments due" section heading visible
  Pass/Fail: ___

TEST 6 — No layout shift on load
  Action: Load dashboard on Slow 3G. Watch page while data loads.
  Expected: Skeleton cards are same height as real cards.
            Page does not jump when data replaces skeletons.
  Pass/Fail: ___

TEST 7 — Start button navigates correctly
  Action: Click "Start" on ASSESS-003
  Expected: Navigate to /staff/assessments/activity?residentId=res-002
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. This task adds the assessments section
to the staff dashboard and audits all skeleton states.

PART A — VERIFY OR CREATE GET /api/assessments/due/route.ts

Check if this file exists. If it does: verify it handles these cases.
If it does not exist: create it.

export const GET = withAuth(async (req, { currentUser }) => {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  // Graceful skip if AssessmentModel not available
  let AssessmentModel: any = null
  try {
    const mod = await import("@/backend/src/models/assessment.model")
    AssessmentModel = mod.AssessmentModel ?? mod.default
  } catch {
    console.warn("[assessments/due] AssessmentModel not found — returning empty")
    return Response.json({ assessments: [], total: 0 })
  }
  
  const assessments = await AssessmentModel.find({
    facilityId: currentUser.facilityId,
    conductedById: currentUser.userId,    // only this nurse's assessments
    nextDueAt: { $gte: now, $lte: sevenDaysFromNow }
  }).sort({ nextDueAt: 1 }).limit(10)
  
  return Response.json({
    assessments: assessments.map(a => ({
      id: a.id,
      residentId: a.residentId,
      residentRoom: a.residentRoom,
      assessmentType: a.assessmentType,
      nextDueAt: a.nextDueAt?.toISOString() ?? null,
      daysUntilDue: Math.ceil(
        (new Date(a.nextDueAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    })),
    total: assessments.length
  })
})

PART B — ADD ASSESSMENTS SECTION TO DASHBOARD

In app/staff/dashboard/page.tsx, add a second fetch for assessments:

  const [assessments, setAssessments] = useState([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(true)
  
  useEffect(() => {
    async function loadAssessments() {
      try {
        const res = await fetch("/api/assessments/due")
        if (res.ok) {
          const data = await res.json()
          setAssessments(data.assessments)
        }
      } finally {
        setAssessmentsLoading(false)
      }
    }
    loadAssessments()
  }, [])

ASSESSMENTS SECTION (placed between Recent Reports and Performance card):

  // Only render section if loading OR has data — never show empty section
  if (!assessmentsLoading && assessments.length === 0) return null
  
  <section className="px-4 mt-6">
    
    {assessmentsLoading ? (
      // SKELETON: same height as 1 assessment item
      <div>
        <Skeleton className="h-5 w-40 mb-3" />  {/* heading */}
        <Skeleton className="h-16 w-full rounded-xl" />  {/* item */}
      </div>
    ) : (
      <>
        <h2 className="font-semibold text-dark-teal mb-3">
          Assessments due this week
        </h2>
        {assessments.map(a => (
          <AssessmentItem key={a.id} assessment={a} />
        ))}
      </>
    )}
    
  </section>

AssessmentItem (inline component):
  White card, border border-gray-200, rounded-xl, p-4, mb-2
  Row: flex between items-center
    Left:
      "Room [residentRoom]" font-medium text-sm
      "[assessmentType display] Assessment" text-muted text-xs
    Right:
      Days badge:
        daysUntilDue <= 1: green badge "1 day" (or "Today")
        daysUntilDue <= 3: amber badge "[N] days"
        else: gray badge "[N] days"
      "Start" button → /staff/assessments/[assessmentType]?residentId=[residentId]
        Small teal button, min-h-10, ml-3

PART C — SKELETON AUDIT

Review the entire dashboard page and ensure:

1. Hero card: no skeleton needed (always renders immediately)

2. Amber banner: no skeleton needed (derived from incidents state —
   shows only after incidents load, absent during loading)

3. Pending Questions section:
   CURRENT: shows skeletons while loading: true
   If missing: add 2 skeleton cards while incidents load

4. Recent Reports section:
   CURRENT: shows skeleton rows while loading: true
   If missing: add 3 skeleton rows

5. Assessments section: handled in PART B above

6. Performance card (task-05d): will add its own skeleton

Each skeleton must have the SAME HEIGHT as the real content it replaces.
Use shadcn <Skeleton className="..." /> for all skeletons.
Test by throttling to Slow 3G in Chrome DevTools → no layout shift.

PATTERN for layout-shift-free skeletons:
  If real card is h-[80px]: skeleton is h-[80px]
  If real list row is h-[48px]: skeleton is h-[48px]
  Use the same margin/padding as real content

Run npm run build. Fix all TypeScript errors.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Update `documentation/waik/10-STAFF-DASHBOARD.md` — assessments section
- Create `plan/pilot_1/phase_3c/task-05c-DONE.md`


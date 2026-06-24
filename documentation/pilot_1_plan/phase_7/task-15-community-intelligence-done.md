# Task 15 — Community WAiK Intelligence (All Users)
## Phase: 7 — Navigation, Intelligence & Imports
## Estimated Time: 4–5 hours
## Depends On: task-09, task-14

---

## Why This Task Exists

WAiK Intelligence at the community level is the most powerful demo moment in
the 15-minute script and the feature that makes WAiK feel categorically
different from any existing tool. This task builds both the staff-scoped and
admin-scoped versions, with the auto-generated insight cards that run without
any prompting.

---

## Success Criteria

- [ ] `app/staff/intelligence/page.tsx` exists with staff-scoped queries
- [ ] `app/admin/intelligence/page.tsx` has both search and auto-insight cards
- [ ] Staff queries only return data for current user's incidents
- [ ] Admin queries return full facility data
- [ ] Auto-insight cards (4 types) load and display on admin intelligence page
- [ ] Auto-insights cached in Redis for 1 hour per facility
- [ ] Suggested queries displayed on empty state for both staff and admin views
- [ ] All queries are facility-scoped — never cross-facility data

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK community intelligence pages for Next.js 14.

CREATE app/staff/intelligence/page.tsx — Staff Intelligence:
Header: "WAiK Intelligence" with subtitle "Ask questions about your reports and your residents"
Search bar: "Ask anything..."
On submit: POST /api/intelligence/query { query, facilityId, scope: "staff", userId }

Suggested questions (shown on empty state):
- "How have my report completeness scores changed this month?"
- "What questions am I most often missing in my reports?"
- "Show me all my reports for [resident name]"
- "What incidents have I reported in the last 30 days?"
- "Are there patterns in the incidents I've reported?"

Results: plain language paragraph + any linked incidentIds as clickable links

STAFF SCOPE ENFORCEMENT in /api/intelligence/query when scope === "staff":
All MongoDB queries in intelligence-tools.ts must filter to: staffId === userId OR residentId in user's assigned residents
Never return other staff members' incidents or cross-facility data

CREATE app/admin/intelligence/page.tsx — Admin Intelligence:
Two sections:

SECTION A — Ask Anything:
Same search interface, full facility scope
Suggested queries:
- "What are the most common fall locations this month?"
- "Which residents have had more than 2 incidents in the last 30 days?"
- "Show me all open investigations older than 48 hours"
- "What environmental factors appear most often in fall incidents?"
- "Which staff members have the highest average report completeness?"
- "Are there residents with both a fall incident and a declining dietary assessment?"
- "What is our average time to close an investigation this quarter?"
- "Which wing has the most incidents?"

SECTION B — Saved Insights (auto-generated, no prompt needed):
Four cards that load automatically on page open:

Card 1 — "This Week at a Glance":
  Incidents reported, investigations closed, assessments completed — vs. last week with arrows

Card 2 — "Completeness Trend":
  Simple bar chart (use recharts) showing avg completeness per week for last 8 weeks

Card 3 — "Attention Needed":
  LLM-generated anomaly: "3 falls in Wing B in 7 days — above your 30-day average of 1 per week"
  Or: "Mrs. Torres has had 3 incidents this month — consider care plan review"

Card 4 — "Staff Performance":
  Top 3 staff by completeness (labeled Staff A, B, C to admin — actual names visible with admin role)
  Any staff with completeness > 15 points below facility average flagged for coaching

CREATE GET /api/intelligence/saved-insights?facilityId=X:
Run the 4 queries and return results
Cache in Redis: "waik:insights:{facilityId}" with 1 hour TTL
Return cached if fresh; regenerate if stale or not cached

UPDATE lib/agents/intelligence-qa.ts and intelligence-tools.ts:
Add facilityId as required parameter to all tool calls
Add userId and scope parameters for staff filtering
Every MongoDB query must include { facilityId } — no exceptions
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_7/task-15-DONE.md`

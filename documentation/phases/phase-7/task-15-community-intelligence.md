# Task: Community WAiK Intelligence (All Users)
## Phase: 7
## Depends On: task-14-navigation-incident-history
## Estimated Time: 6 hours

## Context Files
- app/staff/intelligence/page.tsx (create)
- app/admin/intelligence/page.tsx (update with Saved Insights)
- app/api/intelligence/query (create)
- app/api/intelligence/saved-insights (create)
- lib/agents/intelligence-qa.ts (update)
- lib/agents/intelligence-tools.ts (update)

## Success Criteria
- [ ] Staff intelligence: scoped to own data; suggested staff questions; facilityId + staffId filter
- [ ] Admin intelligence: Ask Anything + Saved Insights (4 auto-cards: Weekly, Completeness Trend, Attention Needed, Staff Performance)
- [ ] POST /api/intelligence/query with scope full|staff; facilityId enforced
- [ ] GET /api/intelligence/saved-insights?facilityId=X; Redis cache 1hr; 4 queries
- [ ] intelligence-qa and intelligence-tools require facilityId; optional staffId for staff scope

## Test Cases
- Staff query returns only own/assigned data
- Admin saved insights load 4 cards; cache hit on repeat within 1hr
- Cross-facility query never returns data

## Implementation Prompt

```
I'm building WAiK on Next.js 14. I need to add community-level WAiK Intelligence accessible to all users — both staff and admins — but scoped appropriately by role.

CONTEXT:
There are two levels of WAiK Intelligence:
1. INCIDENT-LEVEL: Already exists at /admin/incidents/[id] — focused on one incident
2. COMMUNITY-LEVEL: New — queries across all incidents, assessments, and residents in a facility

WHAT I NEED:

1. Create app/staff/intelligence/page.tsx — Staff Intelligence View:

   Staff intelligence is scoped to data they have access to:
   - Their own incidents
   - Incidents for residents they've worked with
   - Community-level patterns (anonymized — no names for residents they haven't worked with)
   - Assessment trends

   Layout:
   Header: "WAiK Intelligence" with subtitle "Ask questions about your reports and your residents"
   
   Search bar: "Ask anything..."
   
   Suggested questions for staff:
   - "How have my report completeness scores changed this month?"
   - "What questions am I most often missing in my reports?"
   - "Show me all my reports for Mrs. Chen"
   - "What incidents have I reported in the last 30 days?"
   - "Are there patterns in the incidents I've reported?"
   
   Results display:
   - Plain language response
   - Any linked incident IDs are clickable
   - Data tables when relevant
   
   Staff scope enforcement: API must filter all queries to only return data
   where staffId === currentUser.userId OR residentId is in their assigned residents

2. Create app/admin/intelligence/page.tsx — Admin Intelligence View:

   Admin intelligence sees everything in the facility.
   
   Header: "WAiK Intelligence" with subtitle "Your community's institutional memory"
   
   TWO SECTIONS on the page:

   SECTION A — Ask Anything (RAG query interface):
   Same search bar as staff view but with full facility scope
   
   Suggested questions for admins:
   - "What are the most common fall locations this month?"
   - "Which residents have had more than 2 incidents in the last 30 days?"
   - "Show me all open investigations older than 48 hours"
   - "What environmental factors appear most often in fall incidents?"
   - "Which staff members have the highest average report completeness?"
   - "Are there any residents with both a fall incident and a declining dietary assessment?"
   - "What is our average time to close an investigation this quarter?"
   - "Which wing has the most incidents?"
   
   SECTION B — Saved Insights (persistent, no prompt required):
   These run automatically and refresh daily. Show as cards:
   
   Card 1: "This Week at a Glance"
   - X incidents reported, X investigations closed, X assessments completed
   - vs. last week (up/down arrows)
   
   Card 2: "Completeness Trend"
   - Simple sparkline of average completeness score per week for last 8 weeks
   
   Card 3: "Attention Needed"
   - Auto-generated: any pattern that looks like it needs attention
   - "3 falls in Wing B in the last 7 days — above your 30-day average"
   - "Mrs. Torres has had 3 incidents this month — consider care plan review"
   
   Card 4: "Staff Performance"
   - Top 3 staff by completeness score (anonymized label: "Staff A, B, C" unless admin)
   - Any staff with dramatically lower scores (coaching opportunity)

3. Create API route POST /api/intelligence/query:
   Body: { query: string, facilityId: string, scope: "full" | "staff", userId?: string }
   
   Calls lib/agents/intelligence-qa.ts (already built) with:
   - facilityId filter always enforced
   - If scope === "staff": additional filter on staffId or assigned residents
   - Returns: { response: string, relatedIncidentIds: string[], relatedResidentIds: string[], dataTable?: object }
   
   Never return cross-facility data regardless of scope.

4. Create API route GET /api/intelligence/saved-insights?facilityId=X:
   Runs the 4 auto-insight queries and returns results
   Cache results in Redis for 1 hour (key: "waik:insights:{facilityId}")
   Return cached if fresh, regenerate if stale
   
   The 4 queries to run:
   - Weekly summary: count incidents/assessments/closures vs prior week
   - Completeness trend: average score per week for last 8 weeks
   - Anomaly detection: any location/resident/shift with incident rate > 2x the 30-day average
   - Staff completeness: per-staff average scores, flag anyone > 15 points below facility average

5. Update existing lib/agents/intelligence-qa.ts and intelligence-tools.ts:
   Add facilityId as a required parameter to all tool calls
   Add staffId as an optional filter parameter
   Ensure every MongoDB query in the tools includes facilityId in the where clause
```

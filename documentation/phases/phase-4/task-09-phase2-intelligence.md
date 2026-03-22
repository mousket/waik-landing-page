# Task: Phase 2 Investigation + WAiK Intelligence
## Phase: 4
## Depends On: task-08-resident-story
## Estimated Time: 8 hours

## Context Files
- app/admin/incidents/[id]/page.tsx (rebuild)
- app/api/incidents/[id]/phase (create)
- app/api/incidents/[id]/tasks (create)
- app/api/incidents/[id]/close (create)
- app/api/incidents/[id]/report-pdf (create)
- app/admin/intelligence/page.tsx (create)
- app/api/intelligence/daily-brief (create)

## Success Criteria
- [ ] Admin incident page: Phase 1 summary, Investigation Status, IDT Tasks, Findings, Close (role-gated)
- [ ] PATCH phase, POST tasks, PATCH task complete, POST close with signature
- [ ] GET report-pdf returns closure report HTML
- [ ] Admin intelligence page: search bar, suggested queries, results with tables/links, facilityId enforced
- [ ] GET /api/intelligence/daily-brief returns 2-3 sentence summary

## Test Cases
- Claim Phase 2 → phase transitions; investigator assigned
- Complete all IDT tasks → Close section enabled; Sign & Close records signature
- Intelligence query returns facility-scoped results only
- Daily brief returns summary for facilityId

## Implementation Prompt

```
I'm building WAiK on Next.js 14. I need to complete the Phase 2 investigation workflow and add WAiK Intelligence.

PART A — Phase 2 Investigation Workflow

1. Rebuild app/admin/incidents/[id]/page.tsx as a full Phase 2 workspace:

   SECTION 1 — Phase 1 Summary (read-only)
   Show the nurse's original narrative (raw voice, preserved exactly)
   Show the clinical record (WAiK-generated)
   Show completeness score with filled/missing fields breakdown
   Show all Phase 1 questions and answers

   SECTION 2 — Investigation Status
   Phase badge: Phase 1 Complete → Investigation In Progress → Closed
   Assigned investigator (claim if unclaimed)
   Days open counter

   SECTION 3 — IDT Team Tasks
   For each assigned specialist (dietary, PT, physician, activities):
     - Their assigned question
     - Status: pending / completed
     - Their response (if completed)
     - "Send reminder" button (triggers push notification)
   "Assign new task" button: select role, type the question, assign

   SECTION 4 — Investigation Findings
   Contributing factors (multi-select: medication change, UTI, environmental, equipment, staffing)
   Root cause (free text, required to close)
   Permanent intervention / care plan update (free text)

   SECTION 5 — Close Investigation (DON/Admin only, role-gated)
   All tasks must be completed to enable this section
   Text declaration: "I certify that this investigation is complete and accurate."
   "Sign & Close" button
   On close: records signature, sets phase to "closed", sets completedAt

2. Create API routes:
   - PATCH /api/incidents/[id]/phase — transition phase with role check
   - POST /api/incidents/[id]/tasks — create IDT task
   - PATCH /api/incidents/[id]/tasks/[taskId] — complete task
   - POST /api/incidents/[id]/close — close with signature (DON/admin only)
   - GET /api/incidents/[id]/report-pdf — generate a closure report (returns HTML for now, PDF later)

PART B — WAiK Intelligence

3. Create app/admin/intelligence/page.tsx:
   
   Search bar: "Ask anything about your community..."
   Uses existing lib/agents/intelligence-qa.ts (already built)
   
   Suggested queries shown on empty state:
   - "What are the most common fall locations this month?"
   - "Which residents have had more than 2 incidents in the last 30 days?"
   - "Show me all open investigations older than 48 hours"
   - "What environmental factors appear most often in fall incidents?"
   - "Which staff members have the highest average report completeness?"
   - "Are there any residents with both a fall incident and a declining dietary assessment?"
   
   Results display:
   - Plain language response paragraph
   - Supporting data table (if applicable)
   - Linked incident or resident IDs (clickable)
   - "Save this query" button (stores to localStorage for quick re-run)
   
   Enforce facilityId filtering on all queries — never return cross-facility data

4. Add a Daily Brief generator:
   GET /api/intelligence/daily-brief?facilityId=X
   Returns a plain text summary (2-3 sentences) of the community status:
   "You have 3 open investigations. 2 incidents were reported overnight. 1 assessment is due today for Mrs. Chen."
   This is shown as the dismissible banner on the admin dashboard (Prompt 6).
```

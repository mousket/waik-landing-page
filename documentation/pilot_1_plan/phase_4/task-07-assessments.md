# Task 07 — Conversational Assessment System
## Phase: 4 — Core Features
## Estimated Time: 6–8 hours
## Depends On: task-01, task-02, task-03

---

## Why This Task Exists

Assessments are the second core product feature after incident reporting. They
replace clipboard-based forms with conversational voice interactions using the
same agentic pattern already proven in the incident flow. Assessments also
feed the Resident Story, MDS recommendations, and Community Intelligence —
making them a foundation for multiple other features.

---

## Context Files

Read these before starting:
- `app/staff/report/page.tsx` — mirror this voice UI pattern exactly
- `lib/agents/expert_investigator/graph.ts` — mirror this agent pattern
- `lib/gold_standards.ts` — follow this schema pattern for assessment standards
- `backend/src/models/incident.model.ts` — follow this model pattern

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `lib/assessment_standards.ts` exports ActivityAssessmentStandards and DietaryAssessmentStandards types
- [ ] `lib/agents/assessment_agent.ts` exports `startAssessmentConversation` and `answerAssessmentQuestion`
- [ ] Assessment sessions stored in Redis with key `waik:assessment-session:{sessionId}`
- [ ] `backend/src/models/assessment.model.ts` exists with all required fields
- [ ] `POST /api/assessments` creates an assessment record
- [ ] `POST /api/agent/assessment` with action "start" returns sessionId and first question
- [ ] `POST /api/agent/assessment` with action "answer" returns next question or completion
- [ ] `GET /api/assessments?residentId=X&facilityId=Y` returns filtered assessments
- [ ] `GET /api/assessments/due?facilityId=Y&days=7` returns assessments due within 7 days
- [ ] `app/staff/assessments/[type]/page.tsx` works for type "activity" and type "dietary"
- [ ] Voice flow for activity assessment completes start-to-finish with correct opening question
- [ ] Voice flow for dietary assessment completes start-to-finish with correct opening question
- [ ] On completion: structured output card shows all captured fields
- [ ] On completion: next_due_at is set to 90 days from completion date

---

## Test Cases

```
TEST 1 — Activity assessment start
  Action: POST /api/agent/assessment { action: "start", residentName: "Mrs. Chen", assessmentType: "activity", ... }
  Expected: Response includes sessionId, incidentId, first question about activities
  Pass/Fail: ___

TEST 2 — Assessment answer flow
  Action: POST /api/agent/assessment { action: "answer", sessionId, answerText: "She loves painting and music" }
  Expected: Response includes next question or { status: "completed" }
  Pass/Fail: ___

TEST 3 — Assessment completion saves record
  Action: Complete a full dietary assessment conversation
  Expected: Assessment record exists in MongoDB with status "completed" and structured_output populated
  Pass/Fail: ___

TEST 4 — next_due_at set correctly
  Action: Complete an assessment
  Expected: next_due_at in MongoDB is approximately 90 days from now (within 1 day)
  Pass/Fail: ___

TEST 5 — Due assessments endpoint
  Setup: Create assessment with next_due_at = 3 days from now
  Action: GET /api/assessments/due?facilityId=X&days=7
  Expected: That assessment appears in results
  Pass/Fail: ___

TEST 6 — Redis session survives across calls
  Action: Start assessment, get sessionId, answer question in separate API call
  Expected: Second call retrieves correct session state
  Pass/Fail: ___

TEST 7 — Voice UI opens for activity type
  Action: Navigate to /staff/assessments/activity?residentId=X&residentName=Mrs.Chen
  Expected: Page loads, voice UI starts, first question is about activities
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm building WAiK on Next.js 14. I need to add a conversational assessment system that mirrors the existing voice incident report flow.

PATTERN TO FOLLOW:
- app/staff/report/page.tsx — use this voice UI as the template
- lib/agents/expert_investigator/graph.ts — mirror this agent architecture
- lib/gold_standards.ts — follow this pattern for the standards schema

WHAT I NEED:

1. Create lib/assessment_standards.ts with two typed schemas:

ACTIVITY_ASSESSMENT_FIELDS:
- preferred_activities: string
- activity_participation_level: "high" | "moderate" | "low" | "declined"
- mobility_level: "independent" | "supervised" | "assisted" | "dependent"
- social_preferences: string
- barriers_to_participation: string
- recent_engagement_changes: string
- staff_observations: string
- resident_stated_preferences: string

DIETARY_ASSESSMENT_FIELDS:
- appetite_level: "good" | "fair" | "poor"
- food_preferences: string
- food_aversions: string
- texture_requirements: "regular" | "soft" | "minced" | "pureed" | "liquid"
- fluid_intake_level: "adequate" | "borderline" | "inadequate"
- recent_weight_changes: string
- meal_assistance_needed: boolean | null
- cultural_dietary_needs: string
- reported_GI_issues: string
- staff_observations: string

2. Create lib/agents/assessment_agent.ts:
   startAssessmentConversation({ residentId, residentName, assessmentType: "activity"|"dietary", conductedById, conductedByName, facilityId })
   answerAssessmentQuestion({ sessionId, questionId, answerText, answeredBy, method: "voice"|"text" })
   Store sessions in Redis: "waik:assessment-session:{sessionId}" with 2hr TTL
   Use gpt-4o-mini to generate 4-6 gap questions against the standards schema
   Score completeness same way as incident reports
   On completion: save to AssessmentModel, set next_due_at = new Date(Date.now() + 90*24*60*60*1000)

3. Create backend/src/models/assessment.model.ts following the incident model pattern:
   id: string (required, unique)
   facilityId: string (required, indexed)
   residentId: string (optional)
   residentName: string (required)
   type: "activity" | "dietary" (required)
   conductedById: string (required)
   conductedByName: string (required)
   narrative_raw: string (original voice, never modified)
   structured_output: Schema.Types.Mixed (JSON matching the standards)
   completeness_score: number (0-100)
   status: "in-progress" | "completed"
   next_due_at: Date
   createdAt: Date
   updatedAt: Date

4. Create API routes:
   POST /api/assessments — create assessment record
   POST /api/agent/assessment — handle { action: "start"|"answer", ...params } (mirror report-conversational)
   GET /api/assessments?residentId=X&facilityId=Y — list assessments
   GET /api/assessments/due?facilityId=Y&days=7 — assessments due within N days

5. Create app/staff/assessments/[type]/page.tsx:
   Accept query params: residentId, residentName
   Mirror the voice flow in app/staff/report/page.tsx exactly
   Opening question per type:
   - activity: "Tell me about [residentName]'s engagement with activities lately. What do they seem to enjoy?"
   - dietary: "How has [residentName] been eating lately? Walk me through their appetite and any preferences."
   WAiK guides the conversation from there using the assessment agent
   On completion: show a structured summary card listing all captured fields with their values

All routes must call getCurrentUser() and enforce facilityId filtering.
Do not modify any existing incident report code.
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `documentation/waik/15-ASSESSMENTS.md` documenting the assessment system
- Create `plan/pilot_1/phase_4/task-07-DONE.md`

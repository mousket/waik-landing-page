# Task: Conversational Assessment System
## Phase: 4
## Depends On: task-06-admin-dashboard
## Estimated Time: 6 hours

## Context Files
- lib/assessment_standards.ts (create)
- lib/agents/assessment_agent.ts (create)
- backend/src/models/assessment.model.ts (create)
- app/staff/assessments/[type]/page.tsx (create)
- app/api/assessments/* (create)
- app/api/agent/assessment/* (create)

## Success Criteria
- [ ] Activity and Dietary assessment schemas in lib/assessment_standards.ts
- [ ] assessment_agent: startAssessmentConversation, answerAssessmentQuestion; Redis sessions
- [ ] Assessment model with type, narrative_raw, structured_output, completeness_score, next_due_at
- [ ] POST/GET assessment API routes; POST /api/agent/assessment
- [ ] app/staff/assessments/[type]/page.tsx voice flow; completion shows summary card
- [ ] Staff dashboard shows due assessments (from task-05)

## Test Cases
- Start activity assessment → session in Redis; 4-6 questions; completion saves to Assessment, next_due_at +90 days
- GET /api/assessments/due returns assessments due in next 7 days

## Implementation Prompt

```
I'm building WAiK on Next.js 14. I need to add a conversational assessment system that mirrors the existing voice incident report flow. Assessments are structured conversations (activity assessment, dietary assessment) that replace clipboard-based forms.

EXISTING PATTERN TO FOLLOW:
- app/staff/report/page.tsx — use this voice UI as the template
- lib/agents/expert_investigator/graph.ts — mirror this conversational agent pattern

WHAT I NEED:

1. Create lib/assessment_standards.ts with two assessment schemas:

ACTIVITY ASSESSMENT:
- preferred_activities (string)
- activity_participation_level: "high" | "moderate" | "low" | "declined"
- mobility_level: "independent" | "supervised" | "assisted" | "dependent"
- social_preferences (string)
- barriers_to_participation (string)
- recent_engagement_changes (string)
- staff_observations (string)
- resident_stated_preferences (string)

DIETARY ASSESSMENT:
- appetite_level: "good" | "fair" | "poor"
- food_preferences (string)
- food_aversions (string)
- texture_requirements: "regular" | "soft" | "minced" | "pureed" | "liquid"
- fluid_intake_level: "adequate" | "borderline" | "inadequate"
- recent_weight_changes (string)
- meal_assistance_needed: boolean | null
- cultural_dietary_needs (string)
- reported_GI_issues (string)
- staff_observations (string)

2. Create lib/agents/assessment_agent.ts:
   - startAssessmentConversation({ residentId, residentName, assessmentType, conductedById, conductedByName, facilityId })
   - answerAssessmentQuestion({ sessionId, questionId, answerText, answeredBy, method })
   - Store sessions in Redis: key "waik:assessment-session:{sessionId}" with 2hr TTL
   - Generate 4-6 gap questions per assessment type using gpt-4o-mini
   - Score completeness against the standards schema
   - On completion: save to Assessment model and set next_due_at = now + 90 days

3. Create backend/src/models/assessment.model.ts:
   id, facilityId, residentId, residentName
   type: "activity" | "dietary"
   conductedById, conductedByName
   narrative_raw (original voice, preserved exactly as spoken)
   structured_output (JSON matching assessment standards)
   completeness_score (number 0-100)
   status: "in-progress" | "completed"
   next_due_at (Date)
   createdAt, updatedAt

4. Create API routes:
   - POST /api/assessments — create assessment record
   - POST /api/agent/assessment — start/answer assessment conversation
   - GET /api/assessments?residentId=X&facilityId=Y
   - GET /api/assessments/due?facilityId=Y&days=7

5. Create app/staff/assessments/[type]/page.tsx:
   Mirror app/staff/report/page.tsx voice flow
   Opening question varies by type:
   - Activity: "Tell me about [resident name]'s engagement with activities lately. What do they seem to enjoy?"
   - Dietary: "How has [resident name] been eating lately? Walk me through their appetite and any preferences or concerns."
   WAiK guides the rest conversationally
   On completion: show structured summary card with all captured fields

6. Add due assessment alerts to staff dashboard (already planned in Prompt 5)

Do not modify existing incident report logic.
```

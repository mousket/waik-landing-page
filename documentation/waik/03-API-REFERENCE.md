# WAiK API Reference

**Version**: 1.0  
**Last Updated**: December 2024  
**Base URL**: `/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Incidents API](#incidents-api)
4. [Questions & Answers API](#questions--answers-api)
5. [Reports API](#reports-api)
6. [Intelligence API](#intelligence-api)
7. [Agent API](#agent-api)
8. [Staff API](#staff-api)
9. [Users API](#users-api)
10. [Error Handling](#error-handling)

---

## Overview

WAiK uses Next.js API Routes (App Router) for all backend endpoints. The API follows RESTful conventions with JSON request/response bodies.

### Request Headers

```
Content-Type: application/json
```

### Response Format

All successful responses return JSON. Errors follow a consistent format:

```json
{
  "error": "Error message description"
}
```

### Authentication Model

API routes require a **Clerk session** (cookie-based in the browser). Unauthenticated requests receive **`401`** with `{ "error": "Unauthorized" }`. The server resolves the user via `getCurrentUser()` in `lib/auth.ts`, using Clerk **`publicMetadata`** for facility/org and WAiK role (`owner`, `administrator`, `rn`, etc.). Do not trust `userId` in request bodies for authorization.

---

## Authentication

### Clerk session

Sign in through the app at **`/sign-in`**. After sign-in, the browser sends the Clerk session cookie on same-origin API requests.

### Legacy demo login (removed)

The previous **`POST /api/auth/login`** route has been removed in favor of Clerk.

#### Request Body (historical reference only)

```json
{
  "username": "nurse.sarah",
  "password": "password123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | User's login username |
| `password` | string | ✅ | Plain text password (compared via bcrypt) |

#### Success Response (200)

```json
{
  "userId": "user-1",
  "username": "nurse.sarah",
  "role": "staff",
  "name": "Sarah Johnson, RN"
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `"Username and password are required"` | Missing credentials |
| 401 | `"Invalid credentials"` | Wrong username/password |
| 500 | `"Internal server error"` | Database error |

---

## Incidents API

### GET `/api/incidents`

Fetch all incidents (admin use).

#### Success Response (200)

```json
[
  {
    "id": "inc-1734567890123",
    "title": "Margaret Chen Incident Report",
    "description": "Resident found on floor...",
    "status": "open",
    "priority": "high",
    "staffId": "user-1",
    "staffName": "Sarah Johnson, RN",
    "residentName": "Margaret Chen",
    "residentRoom": "204A",
    "createdAt": "2024-12-14T10:30:00.000Z",
    "updatedAt": "2024-12-14T10:30:00.000Z",
    "questions": [...],
    "initialReport": {...},
    "investigation": {...}
  }
]
```

---

### POST `/api/incidents`

Create a new incident.

#### Request Body

```json
{
  "title": "Fall Incident - Room 204A",
  "description": "Resident found on floor near wheelchair...",
  "residentName": "Margaret Chen",
  "residentRoom": "204A",
  "staffId": "user-1",
  "staffName": "Sarah Johnson, RN",
  "priority": "high",
  "questions": [
    {
      "questionText": "What happened?",
      "answerText": "Found resident on floor..."
    }
  ]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | ✅ | — | Incident title |
| `description` | string | ✅ | — | Full description/narrative |
| `residentName` | string | ✅ | — | Affected resident |
| `residentRoom` | string | ❌ | — | Room number |
| `staffId` | string | ✅ | — | Reporter's user ID |
| `staffName` | string | ❌ | From DB | Reporter's name |
| `priority` | enum | ❌ | `"medium"` | `low`, `medium`, `high`, `urgent` |
| `questions` | array | ❌ | `[]` | Pre-answered Q&A pairs |

#### Success Response (201)

Returns the created incident object (same structure as GET response).

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `"Missing required fields..."` | Invalid payload |
| 500 | `"Failed to create incident"` | Database error |

---

### GET `/api/incidents/[id]`

Fetch a single incident by ID.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Incident ID (e.g., `inc-1734567890123`) |

#### Success Response (200)

```json
{
  "id": "inc-1734567890123",
  "title": "Margaret Chen Incident Report",
  "description": "...",
  "status": "in-progress",
  "priority": "high",
  "staffId": "user-1",
  "staffName": "Sarah Johnson, RN",
  "residentName": "Margaret Chen",
  "residentRoom": "204A",
  "subType": "fall-wheelchair",
  "createdAt": "2024-12-14T10:30:00.000Z",
  "updatedAt": "2024-12-14T11:45:00.000Z",
  "questions": [
    {
      "id": "q-1734567890123-0",
      "questionText": "Were brakes engaged?",
      "askedBy": "investigation-agent",
      "askedAt": "2024-12-14T10:35:00.000Z",
      "source": "ai-generated",
      "answer": {
        "id": "a-1734567891000-0",
        "answerText": "No, brakes were not locked.",
        "answeredBy": "user-1",
        "answeredAt": "2024-12-14T14:20:00.000Z",
        "method": "text"
      }
    }
  ],
  "initialReport": {
    "capturedAt": "2024-12-14T10:30:00.000Z",
    "narrative": "Found resident on floor near wheelchair...",
    "residentState": "Alert, complaining of hip pain",
    "environmentNotes": "Wheelchair nearby, brakes not engaged",
    "recordedById": "user-1",
    "recordedByName": "Sarah Johnson, RN",
    "recordedByRole": "staff"
  },
  "investigation": {
    "status": "in-progress",
    "subtype": "fall-wheelchair",
    "startedAt": "2024-12-14T10:35:00.000Z",
    "score": 72,
    "completenessScore": 68,
    "feedback": "Good initial details..."
  }
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 404 | `"Incident not found"` | Invalid ID |
| 500 | `"Failed to fetch incident"` | Database error |

---

### PATCH `/api/incidents/[id]`

Update an incident.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Incident ID |

#### Request Body

Any fields from the Incident schema. Common updates:

```json
{
  "status": "closed",
  "priority": "medium",
  "summary": "Updated summary text"
}
```

#### Success Response (200)

Returns the updated incident object.

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 404 | `"Incident not found"` | Invalid ID |
| 500 | `"Failed to update incident"` | Database error |

---

## Questions & Answers API

### POST `/api/incidents/[id]/questions`

Add a question to an incident.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Incident ID |

#### Request Body

```json
{
  "questionText": "Was the wheelchair cushion in place?",
  "askedBy": "user-admin-1",
  "assignedTo": ["user-1"],
  "source": "manual",
  "reporterId": "user-1",
  "reporterName": "Sarah Johnson, RN",
  "reporterRole": "staff"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `questionText` | string | ✅ | — | The question content |
| `askedBy` | string | ❌ | `"admin"` | User ID of asker |
| `assignedTo` | string[] | ❌ | — | Staff IDs to answer |
| `source` | enum | ❌ | `"manual"` | `manual`, `ai-generated`, `voice-report` |
| `generatedBy` | string | ❌ | — | Agent that generated |

#### Success Response (200)

```json
{
  "id": "q-1734567890123",
  "incidentId": "inc-1734567890123",
  "questionText": "Was the wheelchair cushion in place?",
  "askedBy": "user-admin-1",
  "askedAt": "2024-12-14T15:00:00.000Z",
  "assignedTo": ["user-1"],
  "source": "manual"
}
```

---

### DELETE `/api/incidents/[id]/questions/[questionId]`

Delete an unanswered question.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Incident ID |
| `questionId` | Question ID |

#### Success Response (200)

```json
{
  "success": true
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `"Cannot delete answered questions"` | Question has answer |
| 404 | `"Incident or question not found"` | Invalid IDs |

---

### POST `/api/incidents/[id]/answers`

Submit an answer to a question.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Incident ID |

#### Request Body

```json
{
  "questionId": "q-1734567890123",
  "answerText": "Yes, the cushion was properly positioned.",
  "answeredBy": "user-1",
  "method": "text"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `questionId` | string | ✅ | — | Question being answered |
| `answerText` | string | ✅ | — | The answer content |
| `answeredBy` | string | ✅ | — | User ID of answerer |
| `method` | enum | ❌ | `"text"` | `text` or `voice` |

#### Success Response (200)

```json
{
  "success": true,
  "answer": {
    "id": "a-1734567891000",
    "questionId": "q-1734567890123",
    "answerText": "Yes, the cushion was properly positioned.",
    "answeredBy": "user-1",
    "answeredAt": "2024-12-14T15:30:00.000Z",
    "method": "text"
  }
}
```

---

## Reports API

### GET `/api/incidents/[id]/ai-report`

Get the AI-generated report for an incident.

#### Success Response (200)

```json
{
  "summary": "On December 14, 2024, resident Margaret Chen...",
  "insights": "1. Wheelchair brakes were not engaged...",
  "recommendations": "1. Implement brake checks before transfers...",
  "actions": "1. Physical therapy to assess wheelchair fit...",
  "generatedAt": "2024-12-14T11:00:00.000Z",
  "model": "gpt-4o-mini",
  "confidence": 0.85
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 404 | `"No AI report generated yet"` | Report not created |
| 404 | `"Incident not found"` | Invalid incident ID |

---

### POST `/api/incidents/[id]/ai-report`

Generate an AI report for an incident.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Incident ID |

#### Request Body

None required.

#### Success Response (200)

```json
{
  "success": true,
  "aiReport": {
    "summary": "...",
    "insights": "...",
    "recommendations": "...",
    "actions": "...",
    "generatedAt": "2024-12-14T11:00:00.000Z",
    "model": "gpt-4o-mini",
    "confidence": 0.85
  }
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 404 | `"Incident not found"` | Invalid ID |
| 503 | `"OpenAI API key not configured..."` | Missing API key |
| 500 | `"Failed to generate AI report"` | OpenAI error |

---

### GET `/api/incidents/[id]/human-report`

Get the human-created report for an incident.

#### Success Response (200)

```json
{
  "summary": "Administrator's summary of the incident...",
  "insights": "Key observations and findings...",
  "recommendations": "Suggested improvements...",
  "actions": "Required follow-up actions...",
  "createdBy": "user-admin-1",
  "createdAt": "2024-12-14T12:00:00.000Z",
  "lastEditedBy": "user-admin-1",
  "lastEditedAt": "2024-12-14T14:00:00.000Z"
}
```

---

### PUT `/api/incidents/[id]/human-report`

Create or update a human report.

#### Request Body

```json
{
  "summary": "Summary text...",
  "insights": "Insights text...",
  "recommendations": "Recommendations text...",
  "actions": "Actions text...",
  "userId": "user-admin-1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `summary` | string | ✅ | Executive summary |
| `insights` | string | ✅ | Key findings |
| `recommendations` | string | ✅ | Suggested actions |
| `actions` | string | ✅ | Required follow-ups |
| `userId` | string | ✅ | Author's user ID |

#### Success Response (200)

```json
{
  "success": true,
  "humanReport": {...}
}
```

---

### DELETE `/api/incidents/[id]/human-report`

Delete a human report.

#### Success Response (200)

```json
{
  "success": true
}
```

---

### GET `/api/incidents/[id]/report-card`

Get the completeness score and analysis for an incident.

#### Success Response (200)

```json
{
  "score": 72,
  "completenessScore": 68,
  "feedback": "Good initial details. Consider adding more information about...",
  "strengths": [
    "resident_name",
    "room_number",
    "fall_witnessed",
    "immediate_injuries_observed"
  ],
  "gaps": [
    "vitals_taken_post_fall",
    "physician_notified",
    "was_care_plan_followed"
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `score` | number | Overall report score (0-100) |
| `completenessScore` | number | Percentage of required fields filled |
| `feedback` | string | AI-generated feedback |
| `strengths` | string[] | Fields that are well-documented |
| `gaps` | string[] | Missing or incomplete fields |

---

## Intelligence API

### POST `/api/incidents/[id]/intelligence`

Ask a question about an incident using RAG-powered AI.

#### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Incident ID |

#### Request Body

```json
{
  "question": "What caused the fall?",
  "userId": "user-admin-1",
  "useTools": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `question` | string | ✅ | — | Question to ask |
| `userId` | string | ❌ | — | User ID (enables agentic mode) |
| `useTools` | boolean | ❌ | `true` | Enable tool use (can queue questions) |

#### Success Response (200)

```json
{
  "success": true,
  "question": "What caused the fall?",
  "answer": "Based on the incident report, the fall appears to have occurred because the wheelchair brakes were not engaged...",
  "timestamp": "2024-12-14T15:45:00.000Z"
}
```

#### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `"Question is required"` | Empty question |
| 404 | `"Incident not found"` | Invalid ID |
| 503 | `"OpenAI API key not configured..."` | Missing API key |

---

## Agent API

### POST `/api/agent/report`

Run the Report Agent to create an incident from voice/narrative input.

#### Request Body

```json
{
  "residentName": "Margaret Chen",
  "roomNumber": "204A",
  "narrative": "I found the resident on the floor next to her wheelchair...",
  "residentState": "Alert, complaining of hip pain",
  "environmentNotes": "Wheelchair nearby, brakes not locked",
  "reportedBy": "user-1",
  "reportedByName": "Sarah Johnson, RN",
  "reportedByRole": "staff"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `residentName` | string | ✅ | Resident's name |
| `roomNumber` | string | ✅ | Room number |
| `narrative` | string | ✅ | Description of what happened |
| `residentState` | string | ❌ | Resident's current condition |
| `environmentNotes` | string | ❌ | Room/environment observations |
| `reportedBy` | string | ✅ | Reporter's user ID |
| `reportedByName` | string | ✅ | Reporter's name |
| `reportedByRole` | enum | ❌ | `staff` or `admin` |

#### Response (Streaming JSONL)

The endpoint streams events as newline-delimited JSON:

```
{"type":"log","node":"start_report","message":"Initializing reporter agent"}
{"type":"log","node":"capture_narrative","message":"Captured resident details..."}
{"type":"enhanced_narrative","node":"enhance_narrative","content":"<p>Professional summary...</p>"}
{"type":"incident_created","node":"create_incident_and_handoff","incidentId":"inc-1734567890123"}
{"type":"notification","node":"create_incident_and_handoff","notification":{...}}
{"type":"investigation_progress","node":"investigation:classify_subtype","message":"Subtype classified as fall-wheelchair"}
{"type":"investigation_progress","node":"investigation:queue_questions","message":"Queued 6 follow-up questions for staff"}
{"type":"complete","node":"node_exit_message","incidentId":"inc-1734567890123"}
```

#### Event Types

| Type | Description |
|------|-------------|
| `log` | Progress message |
| `enhanced_narrative` | AI-enhanced summary (HTML) |
| `incident_created` | Incident successfully created |
| `notification` | Admin notification sent |
| `investigation_progress` | Investigation agent status |
| `error` | Error occurred |
| `complete` | Process finished |

---

### POST `/api/agent/investigate`

Trigger the Investigation Agent for an existing incident.

#### Request Body

```json
{
  "incidentId": "inc-1734567890123"
}
```

#### Response (Streaming JSONL)

Similar event stream to `/api/agent/report`.

---

### POST `/api/agent/report-conversational`

Interactive Expert Investigator agent for gap-filling conversation.

#### Start Conversation

```json
{
  "action": "start",
  "incidentId": "inc-1734567890123",
  "narrative": "Optional initial narrative...",
  "investigatorId": "user-admin-1",
  "investigatorName": "Dr. Smith",
  "assignedStaffIds": ["user-1"],
  "reporterName": "Sarah Johnson"
}
```

#### Start Response (200)

```json
{
  "sessionId": "uuid-session-id",
  "incidentId": "inc-1734567890123",
  "score": 65,
  "completenessScore": 58,
  "feedback": "Initial report captures key facts but missing...",
  "strengths": ["resident_name", "location_of_fall"],
  "gaps": ["vitals_taken_post_fall", "physician_notified"],
  "questions": [
    {
      "id": "q-1734567890123-0",
      "text": "Were the wheelchair brakes engaged?",
      "askedAt": "2024-12-14T10:35:00.000Z"
    }
  ],
  "missingFieldLabels": ["vitals", "physician notification"],
  "subtypeLabel": "wheelchair fall"
}
```

#### Answer Question

```json
{
  "action": "answer",
  "sessionId": "uuid-session-id",
  "questionId": "q-1734567890123-0",
  "answerText": "No, the brakes were not locked.",
  "answeredBy": "user-1",
  "answeredByName": "Sarah Johnson, RN",
  "method": "text"
}
```

#### Answer Response (200)

```json
{
  "sessionId": "uuid-session-id",
  "incidentId": "inc-1734567890123",
  "status": "pending",
  "score": 72,
  "completenessScore": 65,
  "feedback": "Good progress. Still need...",
  "nextQuestions": [...],
  "updatedFields": ["brakes_locked"],
  "remainingMissing": ["vitals_taken_post_fall"],
  "details": {
    "strengths": [...],
    "gaps": [...]
  },
  "breakdown": {
    "completeness": 65
  }
}
```

When all gaps are filled, `status` becomes `"completed"`.

---

## Staff API

### GET `/api/staff/incidents`

Get incidents for a specific staff member.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staffId` | string | ✅ | Staff member's user ID |

#### Success Response (200)

```json
{
  "incidents": [
    {
      "id": "inc-1734567890123",
      "title": "Margaret Chen Incident Report",
      ...
    }
  ]
}
```

Returns incidents where the staff member:
- Is the reporter (`staffId` matches)
- Has assigned questions
- Is in `assignedStaffIds` metadata

---

### GET `/api/staff/notifications`

Get pending questions/notifications for a staff member.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staffId` | string | ✅ | Staff member's user ID |

#### Success Response (200)

```json
{
  "unansweredCount": 5,
  "notifications": [
    {
      "incidentId": "inc-1734567890123",
      "incidentTitle": "Margaret Chen Incident Report",
      "questionCount": 3
    },
    {
      "incidentId": "inc-1734567890456",
      "incidentTitle": "Robert Lee Incident Report",
      "questionCount": 2
    }
  ]
}
```

---

## Users API

### GET `/api/users`

Get all users (passwords excluded).

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | string | ❌ | Filter by role (`staff` or `admin`) |

#### Success Response (200)

```json
[
  {
    "id": "user-1",
    "username": "nurse.sarah",
    "role": "staff",
    "name": "Sarah Johnson, RN",
    "email": "sarah.johnson@facility.com",
    "createdAt": "2024-01-15T08:00:00.000Z"
  },
  {
    "id": "user-admin-1",
    "username": "admin.smith",
    "role": "admin",
    "name": "Dr. Smith",
    "email": "smith@facility.com",
    "createdAt": "2024-01-01T08:00:00.000Z"
  }
]
```

> **Security Note**: Password field is always excluded from response.

---

## Error Handling

### Standard Error Response

All errors return JSON with an `error` field:

```json
{
  "error": "Description of what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid/missing parameters |
| 401 | Unauthorized | Invalid credentials |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database/processing error |
| 503 | Service Unavailable | OpenAI not configured |

### OpenAI-Specific Errors

When AI features are unavailable:

```json
{
  "error": "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
}
```

**Status**: 503 Service Unavailable

### Rate Limiting

Currently no rate limiting is implemented. Production should add:
- Request rate limits per user
- OpenAI API usage monitoring
- Cost tracking

---

## API Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User authentication |
| GET | `/api/incidents` | List all incidents |
| POST | `/api/incidents` | Create incident |
| GET | `/api/incidents/[id]` | Get incident |
| PATCH | `/api/incidents/[id]` | Update incident |
| POST | `/api/incidents/[id]/questions` | Add question |
| DELETE | `/api/incidents/[id]/questions/[qId]` | Delete question |
| POST | `/api/incidents/[id]/answers` | Submit answer |
| GET | `/api/incidents/[id]/ai-report` | Get AI report |
| POST | `/api/incidents/[id]/ai-report` | Generate AI report |
| GET | `/api/incidents/[id]/human-report` | Get human report |
| PUT | `/api/incidents/[id]/human-report` | Save human report |
| DELETE | `/api/incidents/[id]/human-report` | Delete human report |
| GET | `/api/incidents/[id]/report-card` | Get completeness score |
| POST | `/api/incidents/[id]/intelligence` | Ask AI question |
| POST | `/api/agent/report` | Run Report Agent |
| POST | `/api/agent/investigate` | Run Investigation Agent |
| POST | `/api/agent/report-conversational` | Expert Investigator |
| GET | `/api/staff/incidents` | Staff's incidents |
| GET | `/api/staff/notifications` | Staff's notifications |
| GET | `/api/users` | List users |

---

## Related Documentation

- [01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md) - System architecture
- [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) - Data structures
- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - Agent system details

---

*For testing, use tools like `curl`, Postman, or the browser's Network tab.*


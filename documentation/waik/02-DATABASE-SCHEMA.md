# WAiK Database Schema

**Version**: 1.0  
**Last Updated**: December 2024  
**Database**: MongoDB with Mongoose ODM

---

## Table of Contents

1. [Overview](#overview)
2. [Collections](#collections)
3. [User Schema](#user-schema)
4. [Incident Schema](#incident-schema)
5. [Question Schema](#question-schema)
6. [Notification Schema](#notification-schema)
7. [Embedded Documents](#embedded-documents)
8. [Relationships](#relationships)
9. [Indexes](#indexes)
10. [Data Access Patterns](#data-access-patterns)

---

## Overview

WAiK uses MongoDB as its primary database, with Mongoose as the ODM (Object Document Mapper). The database is designed around incident reporting workflows with embedded documents for performance.

### Design Principles

1. **Embedded Documents**: Questions are embedded within Incidents for atomic operations
2. **Denormalization**: Staff names stored with incidents for query efficiency
3. **Flexible Schema**: Investigation metadata supports multiple incident subtypes
4. **Vector Support**: Question/answer data structured for embedding generation

### Connection Configuration

```typescript
// backend/src/lib/mongodb.ts
const connection = mongoose.connect(DATABASE_URL, {
  dbName: MONGODB_DB_NAME || "waik-demo",
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30_000,
})
```

---

## Collections

| Collection | Model | Purpose |
|------------|-------|---------|
| `users` | `UserModel` | Staff and admin accounts |
| `incidents` | `IncidentModel` | Incident reports with embedded questions |
| `notifications` | `NotificationModel` | System notifications for users |

> **Note**: Questions are embedded within Incidents, not stored as a separate collection.

---

## User Schema

**File**: `backend/src/models/user.model.ts`  
**Collection**: `users`

### Schema Definition

```typescript
interface UserDocument extends Document {
  id: string              // Custom ID (e.g., "user-1")
  username: string        // Login username
  password: string        // bcrypt hashed password
  role: "staff" | "admin" // User role
  name: string            // Display name
  email: string           // Email address
  createdAt: Date         // Account creation timestamp
}
```

### Field Details

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `id` | String | ✅ | ✅ Unique | Custom identifier (e.g., `user-1`, `user-admin-1`) |
| `username` | String | ✅ | ✅ Unique | Login username |
| `password` | String | ✅ | ❌ | bcrypt hashed (10 rounds) |
| `role` | Enum | ✅ | ❌ | `"staff"` or `"admin"` |
| `name` | String | ✅ | ❌ | Full display name |
| `email` | String | ✅ | ❌ | Contact email |
| `createdAt` | Date | ✅ | ❌ | Auto-set on creation |

### Example Document

```json
{
  "id": "user-1",
  "username": "nurse.sarah",
  "password": "$2a$10$...", 
  "role": "staff",
  "name": "Sarah Johnson, RN",
  "email": "sarah.johnson@facility.com",
  "createdAt": "2024-01-15T08:00:00.000Z"
}
```

### Mongoose Schema

```typescript
const UserSchema = new Schema<UserDocument>({
  id: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ["staff", "admin"] },
  name: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, required: true, default: () => new Date() },
}, { versionKey: false, timestamps: false })
```

---

## Incident Schema

**File**: `backend/src/models/incident.model.ts`  
**Collection**: `incidents`

### Schema Definition

```typescript
interface IncidentDocument extends Document {
  // Core Fields
  id: string
  companyId?: string
  title: string
  description: string
  status: "open" | "in-progress" | "pending-review" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  
  // People
  staffId: string
  staffName: string
  residentName: string
  residentRoom: string
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  
  // Optional Fields
  summary?: string | null
  subType?: string
  
  // Embedded Documents
  questions: QuestionDocument[]
  initialReport?: IncidentInitialReport
  investigation?: IncidentInvestigationMetadata
  humanReport?: HumanReport
  aiReport?: AIReport
}
```

### Field Details

#### Core Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | ✅ | — | Custom ID (e.g., `inc-1734567890123`) |
| `companyId` | String | ❌ | — | Multi-tenant support (future) |
| `title` | String | ✅ | — | Incident title |
| `description` | String | ✅ | — | Initial narrative/description |
| `status` | Enum | ✅ | `"open"` | Workflow status |
| `priority` | Enum | ✅ | `"medium"` | Urgency level |

#### Status Values

| Status | Description |
|--------|-------------|
| `open` | Newly created, awaiting investigation |
| `in-progress` | Investigation active, questions pending |
| `pending-review` | Investigation complete, awaiting admin review |
| `closed` | Fully resolved |

#### Priority Values

| Priority | Description |
|----------|-------------|
| `low` | Minor incident, no immediate action required |
| `medium` | Standard incident, normal processing |
| `high` | Significant incident, expedited processing |
| `urgent` | Critical incident, immediate attention required |

#### People Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `staffId` | String | ✅ | ID of reporting staff member |
| `staffName` | String | ✅ | Name of reporting staff (denormalized) |
| `residentName` | String | ✅ | Affected resident's name |
| `residentRoom` | String | ✅ | Resident's room number |

#### Subtype Field

| Field | Type | Values |
|-------|------|--------|
| `subType` | String | `fall-bed`, `fall-wheelchair`, `fall-slip`, `fall-lift`, `fall-unknown` |

### Example Document

```json
{
  "id": "inc-1734567890123",
  "title": "Margaret Chen Incident Report",
  "description": "Resident found on floor near wheelchair...",
  "status": "in-progress",
  "priority": "high",
  "staffId": "user-1",
  "staffName": "Sarah Johnson, RN",
  "residentName": "Margaret Chen",
  "residentRoom": "204A",
  "subType": "fall-wheelchair",
  "createdAt": "2024-12-14T10:30:00.000Z",
  "updatedAt": "2024-12-14T11:45:00.000Z",
  "questions": [...],
  "initialReport": {...},
  "investigation": {...}
}
```

---

## Question Schema

**File**: `backend/src/models/question.model.ts`  
**Embedded in**: `incidents.questions[]`

### Schema Definition

```typescript
interface QuestionDocument extends Document {
  id: string
  incidentId?: string
  questionText: string
  askedBy: string
  askedByName?: string
  askedAt: Date
  assignedTo?: string[]
  answer?: AnswerSubdocument
  source?: "voice-report" | "ai-generated" | "manual"
  generatedBy?: string
  vectorizedAt?: Date
  metadata?: QuestionMetadata
}
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Unique question ID (e.g., `q-1734567890123-0`) |
| `incidentId` | String | ❌ | Parent incident reference |
| `questionText` | String | ✅ | The question content |
| `askedBy` | String | ✅ | User ID who asked |
| `askedByName` | String | ❌ | Display name of asker |
| `askedAt` | Date | ✅ | When question was created |
| `assignedTo` | String[] | ❌ | User IDs assigned to answer |
| `answer` | Object | ❌ | Answer subdocument (if answered) |
| `source` | Enum | ❌ | Origin of the question |
| `generatedBy` | String | ❌ | Agent that generated (if AI) |
| `vectorizedAt` | Date | ❌ | When embedding was created |
| `metadata` | Object | ❌ | Additional context |

### Source Values

| Source | Description |
|--------|-------------|
| `voice-report` | Captured during initial voice report |
| `ai-generated` | Generated by Investigation Agent |
| `manual` | Manually added by admin |

### Answer Subdocument

```typescript
interface AnswerSubdocument {
  id: string              // Answer ID (e.g., "a-1734567890123-0")
  questionId: string      // Reference to parent question
  answerText: string      // The answer content
  answeredBy: string      // User ID who answered
  answeredAt: Date        // When answer was provided
  method: "text" | "voice" // How answer was captured
}
```

### Question Metadata

```typescript
interface QuestionMetadata {
  reporterId?: string           // Original reporter's ID
  reporterName?: string         // Original reporter's name
  reporterRole?: "staff" | "admin"
  assignedStaffIds?: string[]   // Explicit staff assignments
  createdVia?: "voice" | "text" | "system"
}
```

### Example Question Document

```json
{
  "id": "q-1734567890123-0",
  "incidentId": "inc-1734567890123",
  "questionText": "Were the wheelchair brakes engaged prior to the transfer attempt?",
  "askedBy": "investigation-agent",
  "askedByName": "WAiK Investigation Agent",
  "askedAt": "2024-12-14T10:35:00.000Z",
  "assignedTo": ["user-1"],
  "source": "ai-generated",
  "generatedBy": "investigation-agent",
  "vectorizedAt": "2024-12-14T10:35:01.000Z",
  "metadata": {
    "reporterId": "user-1",
    "reporterName": "Sarah Johnson, RN",
    "reporterRole": "staff",
    "assignedStaffIds": ["user-1"],
    "createdVia": "system"
  },
  "answer": {
    "id": "a-1734567891000-0",
    "questionId": "q-1734567890123-0",
    "answerText": "No, the brakes were not locked. I noticed this when I found her.",
    "answeredBy": "user-1",
    "answeredAt": "2024-12-14T14:20:00.000Z",
    "method": "text"
  }
}
```

---

## Notification Schema

**File**: `backend/src/models/notification.model.ts`  
**Collection**: `notifications`

### Schema Definition

```typescript
interface NotificationDocument extends Document {
  id: string
  incidentId: string
  type: "incident-created" | "investigation-started" | "follow-up-required" | "investigation-completed"
  message: string
  createdAt: Date
  readAt?: Date
  targetUserId: string
}
```

### Field Details

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `id` | String | ✅ | ✅ Unique | Notification ID |
| `incidentId` | String | ✅ | ✅ | Related incident |
| `type` | Enum | ✅ | ❌ | Notification type |
| `message` | String | ✅ | ❌ | Human-readable message |
| `createdAt` | Date | ✅ | ❌ | When notification was created |
| `readAt` | Date | ❌ | ❌ | When user read it (null = unread) |
| `targetUserId` | String | ✅ | ✅ | Recipient user ID |

### Notification Types

| Type | Trigger | Recipients |
|------|---------|------------|
| `incident-created` | New incident reported | All admins |
| `investigation-started` | Investigation agent activated | Reporting staff |
| `follow-up-required` | Questions queued | Assigned staff |
| `investigation-completed` | All questions answered | Admins + reporting staff |

### Example Document

```json
{
  "id": "notif-1734567890123",
  "incidentId": "inc-1734567890123",
  "type": "incident-created",
  "message": "New incident reported for Margaret Chen (Room 204A).",
  "createdAt": "2024-12-14T10:30:00.000Z",
  "readAt": null,
  "targetUserId": "user-admin-1"
}
```

---

## Embedded Documents

### Initial Report

Captures the at-the-scene report from staff.

```typescript
interface IncidentInitialReport {
  capturedAt: Date           // When report was captured
  narrative: string          // Staff's verbal narrative
  residentState?: string     // Resident's condition description
  environmentNotes?: string  // Room/environment observations
  enhancedNarrative?: string // AI-enhanced summary (HTML)
  recordedById: string       // Reporter's user ID
  recordedByName: string     // Reporter's name
  recordedByRole: "staff" | "admin"
}
```

### Investigation Metadata

Tracks the investigation agent's progress and findings.

```typescript
interface IncidentInvestigationMetadata {
  status: "not-started" | "in-progress" | "completed"
  subtype?: string           // fall-bed, fall-wheelchair, etc.
  startedAt?: Date           // Investigation start time
  completedAt?: Date         // Investigation completion time
  investigatorId?: string    // Admin who reviewed
  investigatorName?: string  // Admin's name
  goldStandard?: object      // Filled compliance fields
  subTypeData?: object       // Subtype-specific data
  score?: number             // Completeness score (0-100)
  completenessScore?: number // Alternative scoring
  feedback?: string          // AI feedback on report quality
}
```

### Human Report

Admin/staff-created analysis.

```typescript
interface HumanReport {
  summary: string            // Executive summary
  insights: string           // Key findings
  recommendations: string    // Suggested actions
  actions: string            // Required follow-ups
  createdBy: string          // Author user ID
  createdAt: Date            // Creation timestamp
  lastEditedBy?: string      // Last editor user ID
  lastEditedAt?: Date        // Last edit timestamp
}
```

### AI Report

AI-generated analysis.

```typescript
interface AIReport {
  summary: string            // AI-generated summary
  insights: string           // AI-identified patterns
  recommendations: string    // AI suggestions
  actions: string            // AI-recommended actions
  generatedAt: Date          // Generation timestamp
  model: string              // Model used (e.g., "gpt-4o-mini")
  confidence: number         // Confidence score (0-1)
  promptTokens?: number      // Tokens used (input)
  completionTokens?: number  // Tokens used (output)
}
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA RELATIONSHIPS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────┐                                                             │
│   │   Users   │                                                             │
│   │           │                                                             │
│   │  id ──────┼───────────────────────────────────────────────┐             │
│   │           │                                               │             │
│   └───────────┘                                               │             │
│        │                                                      │             │
│        │ 1:N (reporter)                                       │             │
│        ▼                                                      │             │
│   ┌───────────────────────────────────────────────────────────┼───────────┐ │
│   │                        Incidents                          │           │ │
│   │                                                           ▼           │ │
│   │   staffId ────────────────────────────────────────► User.id           │ │
│   │                                                                       │ │
│   │   ┌─────────────────────────────────────────────────────────────────┐ │ │
│   │   │                    questions[] (embedded)                       │ │ │
│   │   │                                                                 │ │ │
│   │   │   askedBy ──────────────────────────────────────► User.id       │ │ │
│   │   │   assignedTo[] ─────────────────────────────────► User.id[]     │ │ │
│   │   │   answer.answeredBy ────────────────────────────► User.id       │ │ │
│   │   │                                                                 │ │ │
│   │   └─────────────────────────────────────────────────────────────────┘ │ │
│   │                                                                       │ │
│   │   initialReport.recordedById ───────────────────────► User.id         │ │
│   │   investigation.investigatorId ─────────────────────► User.id         │ │
│   │   humanReport.createdBy ────────────────────────────► User.id         │ │
│   │   humanReport.lastEditedBy ─────────────────────────► User.id         │ │
│   │                                                                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────┐                                                         │
│   │ Notifications │                                                         │
│   │               │                                                         │
│   │ incidentId ───┼────────────────────────────────────► Incident.id        │
│   │ targetUserId ─┼────────────────────────────────────► User.id            │
│   │               │                                                         │
│   └───────────────┘                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

| From | To | Type | Description |
|------|-----|------|-------------|
| `Incident.staffId` | `User.id` | Many-to-One | Reporting staff member |
| `Incident.questions[].askedBy` | `User.id` | Many-to-One | Question author |
| `Incident.questions[].assignedTo[]` | `User.id` | Many-to-Many | Assigned responders |
| `Notification.incidentId` | `Incident.id` | Many-to-One | Related incident |
| `Notification.targetUserId` | `User.id` | Many-to-One | Notification recipient |

---

## Indexes

### User Collection

```javascript
// Unique indexes
{ id: 1 }        // unique: true
{ username: 1 }  // unique: true
```

### Incident Collection

```javascript
// Unique and query indexes
{ id: 1 }                          // unique: true
{ companyId: 1 }                   // for multi-tenant queries
{ staffId: 1 }                     // for staff's incidents
{ "questions.assignedTo": 1 }      // for assigned questions
{ "questions.metadata.assignedStaffIds": 1 }  // for assignments
```

### Notification Collection

```javascript
// Unique and query indexes
{ id: 1 }            // unique: true
{ incidentId: 1 }    // for incident notifications
{ targetUserId: 1 }  // for user's notifications
```

---

## Data Access Patterns

### Common Queries

#### Get All Incidents (Admin Dashboard)

```typescript
await IncidentModel.find({}).lean().exec()
```

#### Get Staff's Incidents (Staff Dashboard)

```typescript
await IncidentModel.find({
  $or: [
    { staffId },                                    // Reporter
    { "questions.assignedTo": staffId },            // Assigned questions
    { "questions.metadata.assignedStaffIds": staffId }
  ]
}).lean().exec()
```

#### Get Single Incident

```typescript
await IncidentModel.findOne({ id }).lean().exec()
```

#### Add Question to Incident

```typescript
await IncidentModel.findOneAndUpdate(
  { id: incidentId },
  {
    $push: { questions: questionDoc },
    $set: { updatedAt: new Date() }
  },
  { new: true, lean: true }
)
```

#### Answer a Question

```typescript
await IncidentModel.findOneAndUpdate(
  { id: incidentId, "questions.id": questionId },
  {
    $set: {
      "questions.$.answer": answerDoc,
      updatedAt: new Date()
    }
  },
  { new: true, lean: true }
)
```

#### Get User's Notifications

```typescript
await NotificationModel.find({ targetUserId: userId }).lean().exec()
```

### Helper Functions

All database operations are abstracted in `lib/db.ts`:

| Function | Purpose |
|----------|---------|
| `getUsers()` | Fetch all users |
| `getUserById(id)` | Fetch user by ID |
| `getUserByCredentials(username, password)` | Auth verification |
| `getIncidents()` | Fetch all incidents |
| `getIncidentById(id)` | Fetch single incident |
| `getIncidentsByStaffId(staffId)` | Fetch staff's incidents |
| `updateIncident(id, updates)` | Update incident |
| `addQuestionToIncident(incidentId, question)` | Add question |
| `answerQuestion(incidentId, questionId, answer)` | Submit answer |
| `deleteQuestion(incidentId, questionId)` | Remove unanswered question |
| `createIncidentFromReport(input)` | Create from voice report |
| `queueInvestigationQuestions(input)` | Bulk add AI questions |
| `markInvestigationComplete(incidentId, updates)` | Finalize investigation |
| `createNotification(input)` | Create notification |
| `getNotificationsForUser(userId)` | Fetch user notifications |
| `markNotificationRead(notificationId)` | Mark as read |

---

## Vector Embeddings Storage

While not in MongoDB, question/answer embeddings are stored in a JSON file:

**File**: `data/embeddings.json`

```typescript
interface EmbeddingEntry {
  incidentId: string
  questionId: string
  questionText: string
  askedBy: string
  askedAt: string
  answer?: {
    id: string
    text: string
    answeredBy: string
    answeredAt: string
  }
  metadata?: {
    assignedTo?: string[]
    reporterId?: string
    reporterName?: string
    reporterRole?: string
    source?: string
    generatedBy?: string
  }
  embedding: number[]  // 1536-dimension vector
  createdAt: string
}
```

---

## Migration Notes

### From lowdb to MongoDB

The system was migrated from file-based lowdb to MongoDB. Migration script:

```bash
npm run migrate
# Runs: backend/scripts/migrate-lowdb-to-mongo.ts
```

---

## Related Documentation

- [01-SYSTEM-OVERVIEW.md](./01-SYSTEM-OVERVIEW.md) - System architecture overview
- [03-API-REFERENCE.md](./03-API-REFERENCE.md) - API endpoints using this schema

---

*For schema changes, update both the Mongoose models in `backend/src/models/` and the TypeScript types in `lib/types.ts`.*


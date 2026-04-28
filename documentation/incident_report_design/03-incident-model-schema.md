## `IncidentModel` schema (Mongo / Mongoose)

Source of truth: `backend/src/models/incident.model.ts`.

This doc enumerates:

- every field, type, required flag, default, and inline indexes
- all subdocuments (`phase2Sections`, `idtTeam`, `signatures`, `auditTrail`, etc.)
- all schema indexes
- any pre/post hooks (none found)
- the `phase` enum values

---

## Phase enum values

`phase` is required and must be one of:

- `phase_1_in_progress`
- `phase_1_complete`
- `phase_2_in_progress`
- `closed`

These come from the exported `INCIDENT_PHASES` constant in the same file.

---

## Top-level fields (IncidentSchema)

Declared in `const IncidentSchema = new Schema<IncidentDocument>({ ... })`.

For each field: **type**, **required**, **default**, **indexes/uniques**.

- **`id`**: `String`, **required**, default: —, **unique**, **index**
- **`companyId`**: `String`, required: no, default: —, **index**
- **`organizationId`**: `String`, required: no, default: —, **index**
- **`facilityId`**: `String`, required: no, default: —, **index**
- **`title`**: `String`, **required**, default: —
- **`subType`**: `String`, required: no, default: —
- **`description`**: `String`, **required**, default: —
- **`incidentType`**: `String`, required: no, default: —
- **`location`**: `String`, required: no, default: —
- **`incidentDate`**: `Date`, required: no, default: —
- **`incidentTime`**: `String`, required: no, default: —
- **`witnessesPresent`**: `Boolean`, required: no, default: —
- **`hasInjury`**: `Boolean`, required: no, default: —
- **`injuryDescription`**: `String`, required: no, default: —
- **`residentId`**: `String`, required: no, default: —, **index**
- **`completenessScore`**: `Number`, required: no, **default `0`**
- **`investigatorId`**: `String`, required: no, default: —, **index**
- **`investigatorName`**: `String`, required: no, default: —
- **`idtTeam`**: `[IdtTeamEntrySchema]`, required: no, **default `[]`**

Counters / analytics:

- **`tier2QuestionsGenerated`**: `Number`, default `0`
- **`questionsAnswered`**: `Number`, default `0`
- **`questionsDeferred`**: `Number`, default `0`
- **`questionsMarkedUnknown`**: `Number`, default `0`
- **`activeDataCollectionSeconds`**: `Number`, default `0`
- **`completenessAtTier1Complete`**: `Number`, default `0`
- **`completenessAtSignoff`**: `Number`, default `0`
- **`dataPointsPerQuestion`**: `[DataPointRowSchema]`, default `[]`

Workflow timing:

- **`phaseTransitionTimestamps`**: `PhaseTransitionTimestampsSchema`, default `undefined`
- **`phase2NotificationFlags`**: `Phase2NotificationFlagsSchema`, default `undefined`

Phase 2 structured blocks:

- **`phase2Sections`**: `Phase2SectionsSchema`, default `undefined`

Audit:

- **`auditTrail`**: `[AuditTrailEntrySchema]`, default `[]`

Phase / status:

- **`phase`**: `String`, **required**, enum `INCIDENT_PHASES`, **default `phase_1_in_progress`**, **index**
- **`status`**: `String`, **required**, enum `open | in-progress | pending-review | closed`
- **`priority`**: `String`, **required**, enum `low | medium | high | urgent`, **default `medium`**

Reporter/resident identity:

- **`staffId`**: `String`, **required**
- **`staffName`**: `String`, **required**
- **`residentName`**: `String`, **required**
- **`residentRoom`**: `String`, **required**

Timestamps:

- **`createdAt`**: `Date`, **required**, default `new Date()`
- **`updatedAt`**: `Date`, **required**, default `new Date()`

Other embedded content:

- **`summary`**: `String`, default `null`
- **`questions`**: `[QuestionSchema]`, default `[]`
- **`initialReport`**: `InitialReportSchema`, default `undefined`
- **`investigation`**: `InvestigationSchema`, default `undefined`
- **`humanReport`**: `HumanReportSchema`, default `undefined`
- **`aiReport`**: `AIReportSchema`, default `undefined`

Red Alert engine:

- **`redFlags`** (subdocument):
  - `hasInjury: Boolean` default `false`
  - `carePlanViolated: Boolean` default `false`
  - `stateReportDueAt: Date` optional
  - `stateReportFiledAt: Date` optional
  - `notificationSentToAdmin: Boolean` default `false`

---

## Subdocuments

### `SignatureSchema` (reusable)

Used for Phase 1 nurse sign-off and Phase 2 DON/admin sign-offs.

- `signedBy: String` **required**
- `signedByName: String` **required**
- `signedAt: Date` **required**
- `role: String` **required**
- `ipAddress: String` optional
- `declaration: String` **required**
- `_id: false`

### Phase 1: `InitialReportSchema`

- `capturedAt: Date` **required**
- `narrative: String` **required**
- `residentState: String` optional
- `environmentNotes: String` optional
- `enhancedNarrative: String` optional
- `recordedById: String` **required**
- `recordedByName: String` **required**
- `recordedByRole: String` **required**
- `immediateIntervention.action: String` optional
- `immediateIntervention.timestamp: Date` optional
- `witnesses[]`:
  - `type: String` enum `staff | resident | visitor`
  - `name: String`
  - `userId: String`
  - `statement: String`
  - `statementAudioUrl: String`
- `signature: SignatureSchema` optional
- `_id: false`

### Phase 2: `InvestigationSchema`

Core:

- `status: String` **required**, enum `not-started | in-progress | completed`
- `subtype: String` optional
- `startedAt: Date` optional
- `completedAt: Date` optional
- `investigatorId: String` optional
- `investigatorName: String` optional

Gold standard payload (stored as JSON blobs):

- `goldStandard: Mixed` optional
- `subTypeData: Mixed` optional
- `score: Number` default `null`
- `completenessScore: Number` default `null`
- `feedback: String` default `null`

IDT & regulatory:

- `idtTeam[]`:
  - `role: String` enum `dietary | therapy | activities | nursing | admin`
  - `userId: String`
  - `status: String` enum `pending | completed`, default `pending`
  - `assignedQuestions: [String]`
  - `completedAt: Date`
- `contributingFactors: [String]`
- `rootCause: String`
- `permanentIntervention.carePlanUpdate: String`
- `permanentIntervention.ehrSyncStatus: String` enum `pending | synced`, default `pending`
- `signatures.don: SignatureSchema`
- `signatures.admin: SignatureSchema`

`_id: false`

### Top-level `idtTeam` (IdtTeamEntrySchema)

This is distinct from `investigation.idtTeam`.

- `userId: String` **required**
- `name: String` **required**
- `role: String` **required**
- `questionSent: String` optional
- `questionSentAt: Date` optional
- `response: String` optional
- `respondedAt: Date` optional
- `status: String` enum `pending | answered`, default `pending`
- `_id: false`

### `phase2Sections` (Phase2SectionsSchema)

Contains four blocks, each with its own schema + defaults:

- `contributingFactors: ContributingFactorsBlockSchema`
- `rootCause: RootCauseBlockSchema`
- `interventionReview: InterventionReviewBlockSchema`
- `newIntervention: NewInterventionBlockSchema`

Each block has:

- `status: String` enum `not_started | in_progress | complete` (default varies)

Additional fields per block:

- **ContributingFactorsBlockSchema**: `factors: [String]` (default `[]`), `notes`, `completedAt`, `completedBy`
- **RootCauseBlockSchema**: `description`, `completedAt`, `completedBy`
- **InterventionReviewBlockSchema**:
  - `reviewedInterventions: [ReviewedInterventionRowSchema]` default `[]`
  - `ReviewedInterventionRowSchema`:
    - `interventionId: String` **required**
    - `stillEffective: Boolean` **required**
    - `notes: String` optional
- **NewInterventionBlockSchema**:
  - `interventions: [NewInterventionItemSchema]` default `[]`
  - `NewInterventionItemSchema`: `description`, `department` enum, `type` enum, `startDate`, `notes`

### `auditTrail[]` (AuditTrailEntrySchema)

- `action: String` **required**, enum:
  - `locked | unlocked | relocked | phase_transitioned | signed | idt_roster_changed`
- `performedBy: String` **required**
- `performedByName: String` optional
- `timestamp: Date` **required**, default `new Date()`
- `reason: String` optional
- `previousValue: String` optional
- `newValue: String` optional
- `_id: false`

---

## Indexes (all)

Inline indexes:

- `id`: `unique: true`, `index: true`
- `companyId`: `index: true`
- `organizationId`: `index: true`
- `facilityId`: `index: true`
- `residentId`: `index: true`
- `investigatorId`: `index: true`
- `phase`: `index: true`

Schema-level indexes:

- `{ facilityId: 1, createdAt: -1 }`
- `{ facilityId: 1, phase: 1 }`
- `{ facilityId: 1, staffId: 1 }`
- `{ facilityId: 1, "phase2Sections.contributingFactors.status": 1 }`

---

## Hooks (pre/post)

No `pre(...)` / `post(...)` hooks are declared in this file.

---

## Schema options / serialization

- Schema options: `versionKey: false`, `timestamps: false`
- `toJSON` transform:
  - sets `ret.id = ret.id ?? ret._id`
  - deletes `ret._id`
  - `virtuals: true`


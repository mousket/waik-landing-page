## Goal

Inventory **all Gold Standards schema/type definitions** and how they relate to incident types, subtype-specific fields, and persistence.

This doc answers:

- **How many data points exist per incident type?**
- **Are they typed as an interface or stored as JSON?**
- **Do subtype-specific fields exist?**
- **Where are they loaded from (TS vs JSON vs Mongo)?**

---

## Repo-wide search results (files with matches)

Search term group: `gold_standard | goldStandard | GoldStandard | GOLD_STANDARD` (ts/tsx files)

Files found:

- `lib/gold_standards.ts`
- `lib/gold_standards_extended.ts`
- `lib/gold-standards-builtin.ts`
- `lib/types.ts`
- `backend/src/models/incident.model.ts`
- `backend/src/models/facility.model.ts`
- `backend/src/models/question.model.ts`
- `app/api/admin/facility/gold-standards/route.ts`
- `app/admin/settings/incidents/page.tsx`
- `lib/db.ts`
- `lib/agents/expert_investigator/*` (uses `AgentState` and persists results)
- `lib/agents/category_detector.ts` (uses extended category schema)
- plus various UI/test/API references (not new schemas)

Search term group: `fall_fields | fallFields | FALL_FIELDS | medication_error` (ts files)

Files found (relevant to schema/config):

- `lib/facility-builtin-incident-types.ts` (incident type IDs include `medication_error`)
- `lib/gold-standards-builtin.ts` (default gold standard items per incident type)
- `backend/src/models/facility.model.ts` (custom gold standards stored in Mongo)
- seed scripts (example incidents with `incidentType: "medication_error"` etc.)

---

## Canonical “Fall” Gold Standards schema (TypeScript)

### File: `lib/gold_standards.ts`

#### Global fall schema

`GoldStandardFallReport` is a TypeScript **interface** with **22** fields:

- Incident basics: 5
- Narrative: 3
- Resident state: 4
- Post-fall actions: 7
- Environment & care plan: 3

#### Subtype-specific fall schema

Subtype interfaces exist and are unioned into `FallSubtypeStandards`:

- `FallBedStandards` (**8** fields incl. `sub_type_id`)
- `FallWheelchairStandards` (**9** fields incl. `sub_type_id`)
- `FallSlipStandards` (**5** fields incl. `sub_type_id`)
- `FallLiftStandards` (**12** fields incl. `sub_type_id`)

#### Agent state wrapper

`AgentState` ties the above together:

- `global_standards: GoldStandardFallReport`
- `sub_type: FallSubtypeStandards["sub_type_id"] | null`
- `sub_type_data: FallSubtypeStandards | null`
- plus optional scoring/feedback fields

**Key point**: fall subtype-specific fields **do exist** and are strongly typed in TS via the `FallSubtypeStandards` union.

---

## Non-fall Gold Standards (TypeScript placeholders)

### File: `lib/gold_standards_extended.ts`

This file:

- Re-exports the fall standards (`export * from "./gold_standards"`).
- Adds type scaffolding for multiple categories.

#### Extended incident category detection config

- `IncidentCategory = "fall" | "medication" | "dietary" | "behavioral" | "other"`
- `CATEGORY_DETECTION_PATTERNS: Record<IncidentCategory, string[]>` (hardcoded keyword lists)

#### Placeholder gold standards

Interfaces + default states exist for:

- `GoldStandardMedicationReport` + `DEFAULT_MEDICATION_STATE`
- `GoldStandardDietaryReport` + `DEFAULT_DIETARY_STATE`
- `GoldStandardBehavioralReport` + `DEFAULT_BEHAVIORAL_STATE`

These are TypeScript-defined schemas (hardcoded), but (as of the current agent pipeline) they are **not wired** into the main `report_agent.ts` / `investigation_agent.ts` flows (those are fall-focused).

#### Final critical questions

`FINAL_CRITICAL_QUESTIONS` is a hardcoded list of 8 “always required” Phase 1 closing questions, with `goldStandardField` keys (string identifiers).

#### Unified agent state

`UnifiedAgentState` is a TS interface capable of holding:

- one of: `fallState` / `medicationState` / `dietaryState` / `behavioralState`
- plus universal completeness tracking and `finalCriticalAnswers`

**Important mismatch to note**: the product incident type ID is `"medication_error"` (see `lib/facility-builtin-incident-types.ts`), while `gold_standards_extended.ts` uses category `"medication"` in its category union and placeholder schema naming. Treat these as separate layers: **product incident type IDs** vs **category detection taxonomy**.

---

## Built-in Gold Standards per incident type (UI/config layer)

### File: `lib/facility-builtin-incident-types.ts`

Defines built-in incident type IDs:

- `fall`
- `medication_error`
- `resident_conflict`
- `wound_injury`
- `abuse_neglect`

### File: `lib/gold-standards-builtin.ts`

Defines non-removable default “Gold Standard lines” per built-in incident type (these are *UI/config checklist items*, not the structured fall schema).

Counts (data points as “default checklist rows”):

- `fall`: **5** items
- `medication_error`: **4** items
- `resident_conflict`: **4** items
- `wound_injury`: **3** items
- `abuse_neglect`: **3** items

These are hardcoded in TypeScript (`BY_TYPE` record).

---

## Gold Standards “custom fields” (MongoDB)

### File: `backend/src/models/facility.model.ts`

Facility supports per-incident-type custom gold-standard fields:

- `goldStandardCustom: Record<string, { customFields: GoldCustomField[] }> | null`
- Where `GoldCustomField` is a TS type:
  - `id: string`
  - `name: string`
  - `type: "text" | "yes_no" | "multi_select"`
  - `required: boolean`

In Mongo, `goldStandardCustom` is stored as **`Schema.Types.Mixed`**.

### File: `app/api/admin/facility/gold-standards/route.ts`

API that loads/saves custom Gold Standards:

- `GET`: returns `{ defaultFields, customFields }`
  - `defaultFields` from `getBuiltinGoldStandardItems(incidentType)`
  - `customFields` from `FacilityModel.goldStandardCustom[incidentType].customFields`

- `PATCH`: upserts `FacilityModel.goldStandardCustom[incidentType].customFields` and `fac.save()`

**Answer**: Custom gold standard “data points” are loaded from **MongoDB** (Facility document), not from JSON files.

### File: `app/admin/settings/incidents/page.tsx`

Admin UI:

- shows builtin default fields (checkbox list; immutable)
- edits `customFields` and saves via the above API

---

## Where the structured Gold Standard is stored on an Incident (MongoDB)

### File: `backend/src/models/incident.model.ts`

Incident investigation metadata includes:

- `goldStandard?: unknown` (Mongo `Schema.Types.Mixed`)
- `subTypeData?: unknown` (Mongo `Schema.Types.Mixed`)
- `subtype?: string` (string)
- `score?: number | null`
- `completenessScore?: number | null`
- `feedback?: string | null`

So, even though fall standards are strongly typed in TypeScript, they are persisted as **JSON blobs** (`Mixed`) in Mongo.

### File: `lib/types.ts`

Client/DTO typing narrows those Mixed fields for the fall flow:

- `goldStandard?: GoldStandardFallReport | null`
- `subTypeData?: FallSubtypeStandards | null`

This is a TypeScript “contract” used at the app layer; the database remains `Mixed`.

---

## Subtype-specific fields — do they exist?

Yes, for **fall** subtype:

- Schema: `FallBedStandards | FallWheelchairStandards | FallSlipStandards | FallLiftStandards` (TS union)
- Used by:
  - `lib/agents/expert_investigator/analyze.ts` (infer subtype, sanitize subtype fields)
  - `lib/agents/expert_investigator/gap_questions.ts` (adds subtype descriptors when subtype is known)
  - `lib/agents/expert_investigator/fill_gaps.ts` (type-map for subtype fields and coercion)
  - persisted into `incident.investigation.subTypeData` (Mongo Mixed)

No equivalent subtype unions exist for `medication_error`, `resident_conflict`, etc. in the built-in incident type list today; those types only have:

- builtin checklist “Gold Standards” items (`lib/gold-standards-builtin.ts`)
- optional facility custom fields (`Facility.goldStandardCustom` in Mongo)
- placeholder “extended” schemas under `gold_standards_extended.ts` (category-level, not yet clearly mapped to built-in incidentType IDs)

---

## How many data points exist per incident type?

There are **two different “counts”** depending on which layer you mean:

### 1) Structured fall Gold Standard fields (agent extraction)

From `lib/gold_standards.ts`:

- Fall global fields: **22**
- Plus subtype-specific fields:
  - bed: +7 (excluding `sub_type_id` already included in that object shape)
  - wheelchair: +8
  - slip: +4
  - lift: +11

These are typed as TS interfaces and stored as JSON (`Mixed`) in Mongo under `incident.investigation.goldStandard` and `incident.investigation.subTypeData`.

### 2) Built-in checklist “Gold Standards” items (admin config)

From `lib/gold-standards-builtin.ts`:

- fall: 5
- medication_error: 4
- resident_conflict: 4
- wound_injury: 3
- abuse_neglect: 3

Plus **customFields** loaded from Mongo per facility/type:

- `Facility.goldStandardCustom[incidentType].customFields[]`

**These checklist rows are not the same thing** as the structured fall schema: they are configuration items used in admin settings and completion thresholds.

---

## Are they typed as an interface or stored as a JSON object?

- **Typed as interfaces in TypeScript**:
  - `GoldStandardFallReport`, fall subtype interfaces, `AgentState` (`lib/gold_standards.ts`)
  - placeholder medication/dietary/behavioral interfaces (`lib/gold_standards_extended.ts`)
  - DTO types referencing fall gold standards (`lib/types.ts`)

- **Stored as JSON blobs in MongoDB**:
  - `incident.investigation.goldStandard` and `incident.investigation.subTypeData` are `Schema.Types.Mixed` (`backend/src/models/incident.model.ts`)
  - `facility.goldStandardCustom` is `Schema.Types.Mixed` (`backend/src/models/facility.model.ts`)

So the persistence layer is “JSON/Mixed”, while the application layer has TS typings (strongest for falls).

---

## Where are these loaded from?

- **Hardcoded in TypeScript**
  - fall schema + subtype schemas (`lib/gold_standards.ts`)
  - builtin checklist items (`lib/gold-standards-builtin.ts`)
  - incident type IDs (`lib/facility-builtin-incident-types.ts`)
  - extended placeholder schemas + patterns + final critical questions (`lib/gold_standards_extended.ts`)

- **Loaded from MongoDB**
  - facility-specific custom gold standard fields (`Facility.goldStandardCustom`) via `app/api/admin/facility/gold-standards/route.ts`
  - per-incident stored gold standard JSON (`Incident.investigation.goldStandard`, `subTypeData`) written by agents and read via DB layer

- **Not loaded from JSON files**
  - No JSON config file was found/used for these schemas in the examined paths.


# WAiK Gold Standards

**Version**: 1.0  
**Last Updated**: December 2024  
**File**: `lib/gold_standards.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Purpose of Gold Standards](#purpose-of-gold-standards)
3. [Global Fall Standards](#global-fall-standards)
4. [Subtype-Specific Standards](#subtype-specific-standards)
5. [Agent State](#agent-state)
6. [Field Categories](#field-categories)
7. [Scoring Algorithm](#scoring-algorithm)
8. [Gap Detection](#gap-detection)
9. [Usage in Agents](#usage-in-agents)

---

## Overview

**Gold Standards** are expert-defined compliance checklists that define what information should be captured for each type of incident. They serve as the "ground truth" against which incident reports are measured.

### Why Gold Standards?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE GOLD STANDARD APPROACH                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Traditional Approach:                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   Generic Form → Staff Fills In → Hope it's Complete                │   │
│   │                                                                     │   │
│   │   Problems:                                                         │   │
│   │   • Same form for wheelchair falls and bed falls                    │   │
│   │   • No guidance on what's actually required                         │   │
│   │   • Compliance gaps discovered during audits                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   WAiK Gold Standard Approach:                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   Expert Checklist → AI Analysis → Targeted Questions               │   │
│   │                                                                     │   │
│   │   Benefits:                                                         │   │
│   │   • Subtype-specific requirements                                   │   │
│   │   • Real-time gap detection                                         │   │
│   │   • Automated question generation                                   │   │
│   │   • Compliance scoring before audit                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Purpose of Gold Standards

### 1. Define Compliance Requirements

Each field in the Gold Standard represents information required for:
- Regulatory compliance (CMS, state regulations)
- Legal documentation
- Root cause analysis
- Prevention planning

### 2. Enable Automatic Gap Detection

The AI compares narratives against Gold Standards to find missing information:

```typescript
// Example gap detection
const narrative = "Found resident on floor near wheelchair"

// Gold Standard requires:
// - brakes_locked: boolean
// - cushion_in_place: boolean
// - footrests_position: string

// AI detects these are NOT mentioned → Generates questions
```

### 3. Drive Targeted Questions

Instead of generic questions, WAiK asks subtype-specific questions:

| Subtype | Example Question |
|---------|------------------|
| fall-wheelchair | "Were the wheelchair brakes locked?" |
| fall-bed | "Was the bed in lowered position?" |
| fall-slip | "What was the floor condition?" |
| fall-lift | "How many staff assisted with the transfer?" |

### 4. Calculate Compliance Scores

```
Score = (Documented Fields / Required Fields) × 100
```

---

## Global Fall Standards

All fall incidents require these fields regardless of subtype:

```typescript
interface GoldStandardFallReport {
  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: INCIDENT BASICS
  // ═══════════════════════════════════════════════════════════════
  resident_name: string       // Full name of resident
  room_number: string         // Room/bed identifier
  date_of_fall: string        // Date in YYYY-MM-DD format
  time_of_fall: string        // Time in HH:MM format
  location_of_fall: string    // Specific location (room, hallway, bathroom)

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: THE NARRATIVE
  // ═══════════════════════════════════════════════════════════════
  fall_witnessed: boolean | null    // Was the fall witnessed by staff?
  staff_narrative: string           // Staff's description of events
  resident_statement: string        // What did the resident say happened?

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: RESIDENT STATE (At Time of Fall)
  // ═══════════════════════════════════════════════════════════════
  activity_at_time: string              // What was resident doing?
  footwear: string                      // What footwear was worn?
  clothing_issue: boolean | null        // Clothing contributed to fall?
  reported_symptoms_pre_fall: string    // Dizziness, weakness, etc.

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: POST-FALL ACTIONS (72-Hour Protocol)
  // ═══════════════════════════════════════════════════════════════
  immediate_injuries_observed: string       // Visible injuries
  head_impact_suspected: boolean | null     // Head strike possible?
  vitals_taken_post_fall: boolean | null    // Vitals checked?
  neuro_checks_initiated: boolean | null    // Neuro checks started?
  physician_notified: boolean | null        // Doctor informed?
  family_notified: boolean | null           // Family contacted?
  immediate_intervention_in_place: string   // What was done immediately?

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: ENVIRONMENTAL & CARE PLAN
  // ═══════════════════════════════════════════════════════════════
  assistive_device_in_use: string       // Walker, cane, wheelchair?
  call_light_in_reach: boolean | null   // Could resident call for help?
  was_care_plan_followed: boolean | null // Was care plan followed?
}
```

### Field Count: 22 Global Fields

---

## Subtype-Specific Standards

### fall-wheelchair (9 additional fields)

```typescript
interface FallWheelchairStandards {
  sub_type_id: "fall-wheelchair"
  
  brakes_locked: boolean | null          // Were brakes engaged?
  anti_rollback_device: boolean | null   // Anti-rollback present?
  cushion_in_place: boolean | null       // Seat cushion in position?
  anti_slip_device_on_seat: boolean | null // Anti-slip mat on seat?
  footrests_position: string | null      // Footrests up/down/missing?
  armrests_present: boolean | null       // Armrests in place?
  chair_tipped_over: boolean | null      // Did chair tip?
  chair_rolled_or_turned: boolean | null // Did chair roll or spin?
  resident_position: string | null       // Where was resident seated?
}
```

**Key Questions**:
- "Were the wheelchair brakes engaged prior to the transfer attempt?"
- "Was the resident using any safety belt or lap buddy when seated?"
- "Was the cushion positioned correctly before the incident?"
- "Was the footrest raised or removed before the resident tried to stand?"

---

### fall-bed (8 additional fields)

```typescript
interface FallBedStandards {
  sub_type_id: "fall-bed"
  
  resident_position: string | null       // Lying, sitting, standing?
  bed_height: string | null              // Low, standard, high?
  bed_rails_status: string | null        // Up, down, partial?
  floor_mat_present: boolean | null      // Fall mat on floor?
  bolstered_mattress: boolean | null     // Low-profile mattress?
  obstructions_at_bedside: boolean | null // Clutter near bed?
  bed_sheets_on_bed: boolean | null      // Sheets in place?
  assistive_device_nearby: boolean | null // Walker/cane within reach?
}
```

**Key Questions**:
- "Was the bed in a lowered position when the fall occurred?"
- "Were side rails used or available for this resident?"
- "Were bed alarms or motion sensors active?"
- "Did the resident attempt to exit the bed without calling for assistance?"

---

### fall-slip (4 additional fields)

```typescript
interface FallSlipStandards {
  sub_type_id: "fall-slip"
  
  floor_condition: string | null         // Wet, dry, cluttered?
  spill_source: string | null            // Water, urine, food?
  lighting_level: string | null          // Adequate, dim, dark?
  obstructions_in_path: boolean | null   // Obstacles in walkway?
}
```

**Key Questions**:
- "What was the surface condition where the resident slipped?"
- "Was appropriate footwear being worn?"
- "Did housekeeping recently service the area?"
- "Was there adequate lighting in the area?"

---

### fall-lift (11 additional fields)

```typescript
interface FallLiftStandards {
  sub_type_id: "fall-lift"
  
  lift_type: string | null                 // Hoyer, sit-to-stand, etc.
  staff_assisting_count: number | null     // How many staff?
  policy_requires_two_staff: boolean | null // 2-person policy?
  was_policy_followed: boolean | null      // Policy compliance?
  sling_type_and_size: string | null       // Sling specifications
  sling_condition: string | null           // Good, worn, damaged?
  sling_attached_correctly: boolean | null // Proper attachment?
  resident_cooperation: string | null      // Cooperative, resistant?
  phase_of_transfer: string | null         // Lifting, lowering, etc.
  failure_point: string | null             // What failed?
  equipment_removed_from_service: boolean | null // Quarantined?
}
```

**Key Questions**:
- "What type of lift or transfer aid was used during the incident?"
- "Was a second staff member present during the transfer?"
- "Were lift slings inspected before the transfer?"
- "Were there any equipment malfunctions?"

---

## Agent State

The `AgentState` interface tracks the current state of documentation:

```typescript
interface AgentState {
  // The global standards with current values
  global_standards: GoldStandardFallReport
  
  // Detected subtype (or null if unknown)
  sub_type: "fall-bed" | "fall-wheelchair" | "fall-slip" | "fall-lift" | null
  
  // Subtype-specific data
  sub_type_data: FallSubtypeStandards | null
  
  // Scoring
  score?: number | null              // Weighted score (0-100)
  completenessScore?: number | null  // Simple percentage
  feedback?: string | null           // AI-generated feedback
  
  // Field tracking
  filledFields?: string[]    // Fields that have values
  missingFields?: string[]   // Fields that need values
}
```

### State Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   INITIAL   │────►│  ANALYZED   │────►│   FILLING   │────►│  COMPLETE   │
│             │     │             │     │             │     │             │
│ Empty state │     │ Narrative   │     │ Questions   │     │ All fields  │
│ sub_type:   │     │ parsed      │     │ answered    │     │ documented  │
│ null        │     │ gaps found  │     │ gaps reduce │     │ score: 90+  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Field Categories

### By Importance (Scoring Weight)

| Category | Weight | Examples |
|----------|--------|----------|
| **Critical** | 2.0 | immediate_injuries_observed, head_impact_suspected, physician_notified |
| **Required** | 1.5 | vitals_taken_post_fall, neuro_checks_initiated, family_notified |
| **Standard** | 1.0 | footwear, activity_at_time, assistive_device_in_use |
| **Contextual** | 0.5 | clothing_issue, resident_statement |

### By Section

```
INCIDENT BASICS (5 fields)
├── resident_name
├── room_number
├── date_of_fall
├── time_of_fall
└── location_of_fall

NARRATIVE (3 fields)
├── fall_witnessed
├── staff_narrative
└── resident_statement

RESIDENT STATE (4 fields)
├── activity_at_time
├── footwear
├── clothing_issue
└── reported_symptoms_pre_fall

POST-FALL ACTIONS (7 fields) ← MOST CRITICAL
├── immediate_injuries_observed
├── head_impact_suspected
├── vitals_taken_post_fall
├── neuro_checks_initiated
├── physician_notified
├── family_notified
└── immediate_intervention_in_place

ENVIRONMENT (3 fields)
├── assistive_device_in_use
├── call_light_in_reach
└── was_care_plan_followed

SUBTYPE-SPECIFIC (4-11 fields)
└── [Varies by subtype]
```

---

## Scoring Algorithm

### Basic Completeness Score

```typescript
function calculateCompleteness(state: AgentState): number {
  const globalFields = Object.keys(state.global_standards)
  const filledGlobal = globalFields.filter(
    key => state.global_standards[key] !== null && 
           state.global_standards[key] !== undefined &&
           state.global_standards[key] !== ""
  )
  
  let totalFields = globalFields.length
  let filledFields = filledGlobal.length
  
  if (state.sub_type_data) {
    const subtypeFields = Object.keys(state.sub_type_data).filter(k => k !== 'sub_type_id')
    const filledSubtype = subtypeFields.filter(
      key => state.sub_type_data[key] !== null
    )
    totalFields += subtypeFields.length
    filledFields += filledSubtype.length
  }
  
  return (filledFields / totalFields) * 100
}
```

### Weighted Score

```typescript
const FIELD_WEIGHTS: Record<string, number> = {
  // Critical fields (weight: 2.0)
  immediate_injuries_observed: 2.0,
  head_impact_suspected: 2.0,
  physician_notified: 2.0,
  vitals_taken_post_fall: 2.0,
  
  // Required fields (weight: 1.5)
  neuro_checks_initiated: 1.5,
  family_notified: 1.5,
  was_care_plan_followed: 1.5,
  
  // Standard fields (weight: 1.0)
  // ... all others default to 1.0
  
  // Contextual fields (weight: 0.5)
  clothing_issue: 0.5,
  resident_statement: 0.5,
}

function calculateWeightedScore(state: AgentState): number {
  let totalWeight = 0
  let earnedWeight = 0
  
  for (const [field, value] of Object.entries(state.global_standards)) {
    const weight = FIELD_WEIGHTS[field] || 1.0
    totalWeight += weight
    
    if (value !== null && value !== undefined && value !== "") {
      earnedWeight += weight
    }
  }
  
  // Include subtype fields with 1.5x weight
  if (state.sub_type_data) {
    for (const [field, value] of Object.entries(state.sub_type_data)) {
      if (field === 'sub_type_id') continue
      
      const weight = 1.5
      totalWeight += weight
      
      if (value !== null) {
        earnedWeight += weight
      }
    }
  }
  
  return (earnedWeight / totalWeight) * 100
}
```

### Score Interpretation

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Excellent | Comprehensive documentation, audit-ready |
| 75-89 | Good | Minor gaps, acceptable for most purposes |
| 60-74 | Adequate | Some important gaps, needs attention |
| 40-59 | Needs Work | Significant gaps, follow-up required |
| 0-39 | Incomplete | Major information missing, not compliant |

---

## Gap Detection

### Process

```typescript
function collectMissingFields(state: AgentState): MissingFieldDescriptor[] {
  const missing: MissingFieldDescriptor[] = []
  
  // Check global standards
  for (const [field, value] of Object.entries(state.global_standards)) {
    if (value === null || value === undefined || value === "") {
      missing.push({
        field,
        label: humanReadableLabel(field),
        category: getFieldCategory(field),
        weight: FIELD_WEIGHTS[field] || 1.0,
      })
    }
  }
  
  // Check subtype-specific fields
  if (state.sub_type_data) {
    for (const [field, value] of Object.entries(state.sub_type_data)) {
      if (field === 'sub_type_id') continue
      if (value === null) {
        missing.push({
          field,
          label: humanReadableLabel(field),
          category: "subtype",
          weight: 1.5,
        })
      }
    }
  }
  
  // Sort by weight (most important first)
  return missing.sort((a, b) => b.weight - a.weight)
}
```

### Human-Readable Labels

```typescript
const FIELD_LABELS: Record<string, string> = {
  // Global standards
  resident_name: "Resident Name",
  room_number: "Room Number",
  date_of_fall: "Date of Fall",
  time_of_fall: "Time of Fall",
  location_of_fall: "Fall Location",
  fall_witnessed: "Fall Witnessed",
  staff_narrative: "Staff Narrative",
  resident_statement: "Resident Statement",
  activity_at_time: "Activity at Time of Fall",
  footwear: "Footwear",
  clothing_issue: "Clothing Issue",
  reported_symptoms_pre_fall: "Pre-Fall Symptoms",
  immediate_injuries_observed: "Observed Injuries",
  head_impact_suspected: "Head Impact",
  vitals_taken_post_fall: "Post-Fall Vitals",
  neuro_checks_initiated: "Neuro Checks",
  physician_notified: "Physician Notification",
  family_notified: "Family Notification",
  immediate_intervention_in_place: "Immediate Intervention",
  assistive_device_in_use: "Assistive Device",
  call_light_in_reach: "Call Light Accessible",
  was_care_plan_followed: "Care Plan Followed",
  
  // Wheelchair subtype
  brakes_locked: "Brakes Locked",
  cushion_in_place: "Cushion in Place",
  footrests_position: "Footrests Position",
  
  // Bed subtype
  bed_height: "Bed Height",
  bed_rails_status: "Bed Rails",
  floor_mat_present: "Floor Mat",
  
  // Slip subtype
  floor_condition: "Floor Condition",
  lighting_level: "Lighting Level",
  
  // Lift subtype
  lift_type: "Lift Type",
  staff_assisting_count: "Staff Count",
  sling_condition: "Sling Condition",
}
```

---

## Usage in Agents

### Investigation Agent

Uses Gold Standards to select question templates:

```typescript
const INVESTIGATION_TEMPLATES: Record<string, string[]> = {
  "fall-wheelchair": [
    "Were the wheelchair brakes engaged?",        // → brakes_locked
    "Was the cushion positioned correctly?",      // → cushion_in_place
    // ...
  ],
  "fall-bed": [
    "Was the bed in lowered position?",           // → bed_height
    "Were side rails in use?",                    // → bed_rails_status
    // ...
  ],
  // ...
}

// Select template based on classified subtype
const templates = INVESTIGATION_TEMPLATES[subtype] || INVESTIGATION_TEMPLATES["fall-unknown"]
```

### Expert Investigator

Uses Gold Standards for gap analysis and scoring:

```typescript
// analyze.ts
const analysis = await analyzeNarrativeAndScore(narrative)

// Returns:
{
  state: AgentState,           // Parsed fields
  score: 65,                   // Weighted score
  completenessScore: 58,       // Simple percentage
  feedback: "Good initial details. Missing...",
  filledFields: ["resident_name", "room_number", ...],
  missingFields: ["vitals_taken_post_fall", ...],
}
```

### Question Generation

Generates questions for missing fields:

```typescript
// gap_questions.ts
const missing = collectMissingFields(state)

// Prioritize by weight
const topMissing = missing.slice(0, 6)

// Generate questions
const questions = topMissing.map(field => 
  generateQuestionForField(field, state)
)
```

---

## Extending Gold Standards

### Adding New Fields

1. Add to TypeScript interface:
```typescript
interface GoldStandardFallReport {
  // ... existing fields ...
  new_field: string | boolean | null
}
```

2. Add to FIELD_LABELS:
```typescript
const FIELD_LABELS = {
  // ... existing labels ...
  new_field: "Human Readable Label",
}
```

3. Add to FIELD_WEIGHTS (if not standard 1.0):
```typescript
const FIELD_WEIGHTS = {
  // ... existing weights ...
  new_field: 1.5,  // Or appropriate weight
}
```

4. Add to question templates:
```typescript
const INVESTIGATION_TEMPLATES = {
  "fall-unknown": [
    // ... existing questions ...
    "Question about new_field?",
  ],
}
```

### Adding New Subtypes

1. Create new interface:
```typescript
interface FallNewSubtypeStandards {
  sub_type_id: "fall-newsubtype"
  field1: string | null
  field2: boolean | null
  // ...
}
```

2. Add to union type:
```typescript
type FallSubtypeStandards =
  | FallBedStandards
  | FallWheelchairStandards
  | FallSlipStandards
  | FallLiftStandards
  | FallNewSubtypeStandards  // Add here
```

3. Add to SUBTYPE_OPTIONS in investigation agent:
```typescript
const SUBTYPE_OPTIONS = [
  "fall-wheelchair",
  "fall-bed",
  "fall-slip",
  "fall-lift",
  "fall-newsubtype",  // Add here
  "fall-unknown",
]
```

4. Add question templates:
```typescript
const INVESTIGATION_TEMPLATES = {
  // ... existing subtypes ...
  "fall-newsubtype": [
    "Question about field1?",
    "Question about field2?",
  ],
}
```

---

## Related Documentation

- [06-INVESTIGATION-AGENT.md](./06-INVESTIGATION-AGENT.md) - Uses Gold Standards for classification
- [07-EXPERT-INVESTIGATOR.md](./07-EXPERT-INVESTIGATOR.md) - Uses Gold Standards for scoring
- [08-AI-INTEGRATION.md](./08-AI-INTEGRATION.md) - AI powers gap detection

---

*Gold Standards are the foundation of WAiK's compliance intelligence. They define what "complete" looks like for each incident type.*


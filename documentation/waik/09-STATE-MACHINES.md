# State machines (WAiK)

## Staff report — `ReportPhase`

**File**: `app/staff/report/page.tsx` (exports `ReportPhase` and `ActiveQuestion`)

### Type: `ReportPhase`

```typescript
export type ReportPhase =
  | "splash"          // incident type + create incident
  | "tier1_board"     // Tier 1 question list (placeholder until task-04b)
  | "answering"       // VoiceInputScreen for one question
  | "gap_analysis"    // loading between Tier 1 and Tier 2 (simulated in dev)
  | "tier2_board"     // Tier 2 list (placeholder)
  | "closing"         // closing items (placeholder)
  | "signoff"         // sign-off (placeholder)
  | "reportcard"      // score & coaching (placeholder)
```

### Type: `ActiveQuestion`

```typescript
export type ActiveQuestion = {
  id: string
  text: string
  label: string
  areaHint?: string
  tier: "tier1" | "tier2" | "closing"
  allowDefer: boolean
}
```

### Valid transitions (intended)

| From | To | Trigger |
|------|-----|--------|
| `splash` | `tier1_board` | Incident created (POST /api/incidents) |
| `tier1_board` | `answering` | User opens a question (e.g. placeholder button) |
| `tier1_board` | `gap_analysis` | “All Tier 1 answered” / pipeline |
| `answering` | `tier1_board` | Done or Back (tier1) |
| `answering` | `tier2_board` | Done (tier2) |
| `answering` | `closing` | Done (closing) |
| `answering` | `tier2_board` | Defer (tier2, `onDefer`) |
| `gap_analysis` | `tier2_board` | AI step complete (timer/simulation today) |
| `tier2_board` | `closing` | Threshold / flow rules |
| `closing` | `signoff` | All closing items done |
| `signoff` | `reportcard` | User continues |
| `reportcard` | (exit) | Dashboard / navigation |

`ErrorBoundary` `onReset` should return the tree to `splash` and clear in-memory answer map.

### Where task-04b slots in

- Replace placeholder copy and single CTA buttons on **`tier1_board`**, **`tier2_board`**, and **`closing`** with the real **question board** (list/cards, deferred badges, navigation).
- **`answering`** and **`ActiveQuestion` stay the contract**; the board only chooses which `ActiveQuestion` to pass to `openQuestion()`.

---

## Related

- `documentation/waik/04-AGENTIC-ARCHITECTURE.md` — agent APIs and Redis.
- `documentation/waik/08-COMPONENTS.md` — `VoiceInputScreen` props.

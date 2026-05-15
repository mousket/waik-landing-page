# Task 5c1-02 — A1 Command Header Card (chips + shortcuts)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 2–3 hours
## Depends On: 5c1-01 layout rails

---

## Why This Task Exists

Admins need the “3-second orientation” surface: facility context + safety posture + quick jumps.
This is the admin equivalent of the staff Shift Header / ambient chips.

---

## Card Contents (A1)

### Top line
- Greeting (“Good morning, [Name]”) + facility scope (facility selector already exists elsewhere; this card should **reflect** effective facility context)

### Chip row (compact, tappable)
- **Critical open** (count)
- **Overdue docs** (count)
- **Incidents today** (count)
- **Protection state** pill: Protected / At risk / Exposed

Chip behavior:
- Tapping a chip scrolls to the corresponding card section (A2/A3/A4/A5) or opens the queue.

### Shortcuts
- “Criticals” → scroll/jump
- “Docs” → scroll/jump
- “Incidents” → scroll/jump
- “Risk residents” → scroll/jump
- “Staff” → scroll/jump

---

## Visual Requirements (Parity)

- Match staff dashboard chip/pill styling (rounded, border, subtle gradients).
- Use severity color sparingly:
  - Critical = destructive family
  - Warning = amber family
  - Normal = muted

---

## Success Criteria

- [ ] Card renders in A1 position.
- [ ] All chips show counts (with loading skeletons as needed).
- [ ] Chips are tappable and route to the right area.
- [ ] Protection state is visible without shouting (calm authority).


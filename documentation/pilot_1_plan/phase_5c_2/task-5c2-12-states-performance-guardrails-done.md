# Task 5c2-12 — Loading/Empty/Error States + Performance Guardrails (Done)
## Phase: 5c-2 — Admin/DON Executive View (Trends)

---

## Outcome

- **Single fetch**: `TrendsSnapshotProvider` loads `/api/admin/trends/snapshot` once per range/facility (replaces ~8 parallel card requests).
- **Shared states**: `admin-trends-card-states.tsx` — `TrendsCardSkeleton`, `TrendsCardNoFacility`, `TrendsSnapshotLoadError`.
- **Per-card**: skeletons with stable heights (`h-56`–`h-72`); global retry on snapshot failure; cards read via `useTrendsCardData`.
- **Empty copy**: E5 pattern insights — “No meaningful pattern detected in this range.”

---

## Success Criteria (verified)

- [x] Skeletons for each card preserving final height.
- [x] Calm empty states (E5 updated).
- [x] Localized/global error with Retry (`TrendsSnapshotLoadError`).
- [x] Performance: one snapshot endpoint; coarse bucketed timeseries unchanged in metrics.

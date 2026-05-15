# Task 5c1-11 — Loading / Empty / Error States (Daily Command) (Done)
## Phase: 5c-1 — Admin/DON Daily Command
## Estimated Time: 2–4 hours

---

## Outcome

- **Unified live-data notice** (`AdminDashboardLiveDataNotice`): one calm card for incidents and/or stats failures (muted border/gradient, `aria-live="polite"`), facility id hint, single **Retry** that refetches both pipelines with a spinner on the button.
- **No misleading “all clear”**: when incidents fail, cards receive `snapshotError` and render `DailyCommandSnapshotUnavailable` (dashed border, guidance to use Retry above) instead of empty-queue copy driven by an empty array.
- **Command header**: hides numeric chips when `snapshotError`; optional muted line when only `statsFetchError` (incidents OK).
- **Documentation health**: stats-only failures show an inline dashed note while incident tiles still render.
- **Skeletons**: `min-h-*` on Today card shells and stats sidebar loading blocks to reduce layout jump.
- **Empty copy**: warmer, action-forward language on hero, needs attention, pulse, high-risk residents, and staff throughput.
- **Stats sidebar**: split **error** vs **no facility** vs **success**; error card includes **Retry stats**; loading uses taller skeleton placeholders.
- **Scope check**: softer neutral styling; hidden when incidents or stats errors are present so the page is not stacked with warnings.
- **Refetch behavior**: `loadIncidents({ showLoading: true })` and `loadDashboardStats({ showLoading: true })` for manual retry; stats error clears only after a successful response (retry shows loading skeleton in the sidebar).

---

## Success Criteria (verified)

- [x] Reduced layout shift via skeleton `min-h` and unavailable panels sized near final content.
- [x] Empty states read as intentional reassurance, not missing product.
- [x] Errors are actionable, non-alarming, with Retry — no wall of red banners.

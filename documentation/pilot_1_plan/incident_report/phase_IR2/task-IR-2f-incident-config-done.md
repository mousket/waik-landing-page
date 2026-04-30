# Task IR-2f — Tier 1 Question Configuration API — DONE

## Endpoint
- GET /api/admin/incident-config?incidentType=fall
- PATCH /api/admin/incident-config (body: { incidentType, completionThreshold })

## What it returns
- tier1Questions: from lib/config/tier1-questions.ts
- closingQuestions: from lib/config/tier1-questions.ts
- goldStandardFields.defaultFields: from lib/gold-standards-builtin.ts
- goldStandardFields.customFields: from FacilityModel.goldStandardCustom[incidentType].customFields
- completionThreshold: from FacilityModel.completionThresholds[incidentType] (clamped 60–95)

## Notes
- Admin-only; facility resolved via resolveEffectiveAdminFacility.
- Intended as the canonical config contract for admin settings UI.

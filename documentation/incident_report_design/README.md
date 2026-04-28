# Incident report backend design docs

This folder holds design notes from code-reads of the current repo; the index below may be updated when new topics are added.

## Contents

- `01-agentic-pipeline.md`: end-to-end agentic pipeline map (report creation → investigation seeding → live expert investigator loop), including exports, LLM calls, storage IO, and call graph.
- `02-gold-standards-schema.md`: complete Gold Standards type/schema inventory and where it’s stored/loaded (TypeScript vs Mongo), including per-incident-type data-point counts and subtype fields.
- `03-incident-model-schema.md`: complete `IncidentModel` (Mongoose) schema inventory: fields, subdocuments, indexes, hooks, and phase enum values.
- `04-staff-report-page.md`: current state of `app/staff/report/page.tsx`: `useState` variables, `ReportPhase` steps, transitions, API calls, and `VoiceInputScreen` wiring.
- `05-agent-api-routes.md`: current behavior of agent API routes (`/api/agent/*`): methods, inputs/outputs, and Mongo/Redis side effects.
- `06-embeddings-rag.md`: embedding model defaults, in-memory vs Mongo storage, what text is embedded, cosine retrieval over incident Q&A, and the Intelligence Q&A API path.
- `07-design-tokens-and-shared-ui.md`: `lib/design-tokens` brand object, Tailwind v4 theming via `app/globals.css` (no `tailwind.config`), and inventories for `components/shared`, `ui`, `staff`, `admin`, including `ShiftHeader` full source.

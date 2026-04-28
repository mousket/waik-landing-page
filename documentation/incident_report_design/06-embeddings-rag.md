## Embeddings, vector search, and RAG — current behavior

This doc describes how **text embeddings**, **similarity search**, and **RAG-style** Q&A are implemented in this repo, based on a direct read of the relevant modules.

---

### Grep caveat

A naive search for `rag` as a substring matches unrelated words (`storage`, `paragraphs`, `encouragement`, …). For a **faithful** map, use **word boundaries** for `rag` / `RAG`, or search for concrete symbols: `generateEmbedding`, `searchSimilarQuestions`, `vectorizedAt`, `__embeddingStore`.

---

### Embedding model

| Source | Value |
| --- | --- |
| Config | `lib/openai.ts` → `AI_CONFIG.embeddingModel` |
| Env override | `OPENAI_TEXT_EMBEDDING_MODEL` |
| Default | `text-embedding-3-small` |

Embeddings are produced with `openai.embeddings.create({ model: AI_CONFIG.embeddingModel, input: text })`. Cosine similarity between two vectors is implemented in-process in `cosineSimilarity` in the same file.

**Note:** The **chat** model used by the Intelligence Q&A agent is `AI_CONFIG.model` (default `gpt-4o-mini`), which is separate from the embedding model.

---

### Where embeddings are stored

| Layer | What is persisted |
| --- | --- |
| **Runtime cache** | `lib/embeddings.ts` uses a **process-global** store on `globalThis` (`__embeddingStore`): per-incident caches of **question** embeddings (with rich metadata) and optional **incident-level** embedding. **Survives across requests in a long-lived Node process**; **not** shared across workers or restarts. |
| **MongoDB** | **No** embedding vectors are written to Mongo. `Question` documents may have **`vectorizedAt`** (`Date` in Mongoose / ISO string in serialized types) — a **timestamp** when an answer was recorded or vectorization was considered, **not** the vector itself. |

There is **no** MongoDB `$vectorSearch` (or similar) usage in this codebase.

---

### What text is embedded

| Function / path | Text passed to `generateEmbedding` |
| --- | --- |
| `getQuestionEmbedding` | `Question: {questionText}` and, if an answer exists, `\nAnswer: {answer.text}`. |
| `getIncidentEmbedding` / `createIncidentText` | Title, description, resident/room, status, priority, then each question and answer in the incident. |
| User query (retrieval) | The user’s natural-language question string (in `searchSimilarQuestions`). |

Background **warm-up** calls to `getQuestionEmbedding` are triggered from `lib/db.ts` and API routes when questions are created or answered (fire-and-forget `catch` handlers), and on incident creation / bulk paths in `app/api/incidents/route.ts`, so the in-memory cache is populated without blocking the HTTP response.

---

### How retrieval works

1. Embed the **query** with `generateEmbedding(query)`.
2. For each question on the **in-memory `Incident`** object, obtain a **question embedding** via `getQuestionEmbedding` (cache hit or new OpenAI call).
3. Score with **`cosineSimilarity(queryEmbedding, questionEmbedding)`**.
4. Sort by similarity and return **top-K** (default **3**).

This is **in-process** semantic ranking over the **current incident’s Q&A list**, not a separate vector database and not Mongo vector search.

---

### RAG-style Intelligence Q&A

`lib/agents/intelligence-qa.ts` implements **IntelligenceQAAgent**:

- **Stage 1:** `searchSimilarQuestions(incident, question, 3)` for retrieval-style context.
- **Stage 2:** LLM (`ChatOpenAI` with `AI_CONFIG.model`) answers using that context (and optional “enhancement” / tool paths as implemented in the file).

**API:** `POST /api/incidents/[id]/intelligence` (`app/api/incidents/[id]/intelligence/route.ts`)

- Body: `{ question, userId?, useTools? }`.
- Requires `OPENAI_API_KEY`; returns JSON `{ success, question, answer, timestamp }`.

---

### `lib/agents/*` — names matching `intel`

From `ls lib/agents | grep -i intel`:

| File | Role |
| --- | --- |
| `intelligence-qa.ts` | RAG-ish Q&A over incident Q&A + LLM; optional agentic behavior with tools. |
| `intelligence-tools.ts` | LangChain tools (e.g. staff search, send question to staff); **not** embedding retrieval. |

---

### Per-file reference (word-bounded embedding / vector / RAG-related hits)

| File | Role |
| --- | --- |
| `lib/openai.ts` | `AI_CONFIG.embeddingModel`, `generateEmbedding`, `cosineSimilarity`. |
| `lib/embeddings.ts` | Global cache, `getQuestionEmbedding`, `getIncidentEmbedding`, `searchSimilarQuestions`, `clearIncidentCache`. |
| `lib/db.ts` | Async `getQuestionEmbedding` after add/answer/seed/queue paths; Mongo `vectorizedAt` on answer. |
| `lib/types.ts` | `Question.vectorizedAt` in client types. |
| `lib/agents/intelligence-qa.ts` | Consumes `searchSimilarQuestions`; LLM answers. |
| `app/api/incidents/[id]/intelligence/route.ts` | HTTP entry for Intelligence Q&A. |
| `app/api/incidents/[id]/questions/route.ts` | POST new question → background `getQuestionEmbedding`. |
| `app/api/incidents/route.ts` | Incident create / legacy paths → background vectorization warm-up. |
| `backend/src/models/question.model.ts` | `vectorizedAt` field on schema. |
| `backend/src/services/incident.service.ts` | Sets `questions.$.vectorizedAt` on answer. |
| `backend/scripts/migrate-lowdb-to-mongo.ts` | Migrates `vectorizedAt` from legacy data if present. |

# WAiK AI Integration

**Version**: 1.0  
**Last Updated**: December 2024  
**Provider**: OpenAI

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [OpenAI Client](#openai-client)
4. [LLM Integration](#llm-integration)
5. [Embeddings & RAG](#embeddings--rag)
6. [AI Agents](#ai-agents)
7. [Cost Management](#cost-management)
8. [Error Handling](#error-handling)
9. [Performance Optimization](#performance-optimization)

---

## Overview

WAiK uses OpenAI's API for all AI capabilities:

| Feature | Model | Purpose |
|---------|-------|---------|
| **Chat Completions** | gpt-4o-mini | Narrative enhancement, classification, question generation, report generation |
| **Embeddings** | text-embedding-3-small | Vector embeddings for semantic search (RAG) |

### AI Capabilities in WAiK

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAiK AI CAPABILITIES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    NARRATIVE PROCESSING                             │   │
│   │   • Voice transcript → Professional summary                         │   │
│   │   • Raw notes → Clinical documentation                              │   │
│   │   • AI-enhanced narrative with HTML formatting                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    INCIDENT CLASSIFICATION                          │   │
│   │   • Subtype detection (wheelchair, bed, slip, lift)                 │   │
│   │   • Severity assessment                                             │   │
│   │   • Pattern recognition                                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    QUESTION GENERATION                              │   │
│   │   • Template customization for specific incidents                   │   │
│   │   • Gap-based question generation                                   │   │
│   │   • Follow-up question suggestions                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    REPORT GENERATION                                │   │
│   │   • Executive summary                                               │   │
│   │   • Key insights extraction                                         │   │
│   │   • Recommendations                                                 │   │
│   │   • Action items with assignments                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    INTELLIGENCE Q&A (RAG)                           │   │
│   │   • Semantic search across incident data                            │   │
│   │   • Context-aware answers                                           │   │
│   │   • Agentic mode with question routing                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    SCORING & ANALYSIS                               │   │
│   │   • Completeness scoring (0-100)                                    │   │
│   │   • Gap identification                                              │   │
│   │   • Field extraction from narratives                                │   │
│   │   • Feedback generation                                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...

# Optional (with defaults)
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_TEXT_EMBEDDING_MODEL=text-embedding-3-small
```

### AI Configuration Object

```typescript
// lib/openai.ts
export const AI_CONFIG = {
  model: process.env.OPENAI_LLM_MODEL || "gpt-4o-mini",
  embeddingModel: process.env.OPENAI_TEXT_EMBEDDING_MODEL || "text-embedding-3-small",
  temperature: 0.7,
  maxTokens: 2000,
}
```

### Model Selection Guide

| Model | Speed | Cost | Quality | Use Case |
|-------|-------|------|---------|----------|
| **gpt-4o-mini** | Fast | $0.15/1M input | Excellent | Default for all tasks |
| gpt-4o | Medium | $2.50/1M input | Best | High-stakes analysis |
| gpt-3.5-turbo | Fastest | $0.50/1M input | Good | Simple tasks only |

| Embedding Model | Dimensions | Cost | Quality |
|-----------------|------------|------|---------|
| **text-embedding-3-small** | 1536 | $0.02/1M | Excellent |
| text-embedding-3-large | 3072 | $0.13/1M | Best |
| text-embedding-ada-002 | 1536 | $0.10/1M | Good (legacy) |

---

## OpenAI Client

### File Location

`lib/openai.ts`

### Client Initialization

```typescript
import OpenAI from "openai"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})
```

### Configuration Check

```typescript
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}
```

This function is used throughout the application to gracefully handle missing API keys.

---

## LLM Integration

### Chat Completion Function

```typescript
export async function generateChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<typeof AI_CONFIG> & {
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
    tool_choice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption
    response_format?: OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"]
  }
) {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await openai.chat.completions.create({
    model: options?.model || AI_CONFIG.model,
    messages,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
    max_tokens: options?.maxTokens || AI_CONFIG.maxTokens,
    tools: options?.tools,
    tool_choice: options?.tool_choice,
    response_format: options?.response_format,
  })

  return response
}
```

### Usage Examples

#### Simple Completion

```typescript
const response = await generateChatCompletion([
  { role: "system", content: "You are a healthcare documentation assistant." },
  { role: "user", content: "Summarize this incident: ..." }
])

const answer = response.choices[0].message.content
```

#### With Custom Temperature

```typescript
const response = await generateChatCompletion(
  [
    { role: "system", content: "Classify this fall type." },
    { role: "user", content: narrative }
  ],
  { temperature: 0, maxTokens: 10 }  // Low temp for classification
)
```

#### With JSON Response Format

```typescript
const response = await generateChatCompletion(
  messages,
  { response_format: { type: "json_object" } }
)

const data = JSON.parse(response.choices[0].message.content)
```

### LangChain Integration

For complex chains, WAiK uses LangChain.js:

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"

const model = new ChatOpenAI({
  modelName: AI_CONFIG.model,
  temperature: 0.3,
  maxTokens: 500,
})

const prompt = PromptTemplate.fromTemplate(`
You are a healthcare assistant.
Question: {question}
Context: {context}
Answer:
`)

const chain = prompt.pipe(model)
const response = await chain.invoke({ question, context })
```

---

## Embeddings & RAG

### Overview

WAiK implements Retrieval-Augmented Generation (RAG) for the Intelligence Q&A feature:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RAG PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│   │   User      │     │  Embed      │     │   Search    │                   │
│   │  Question   │────►│   Query     │────►│   Similar   │                   │
│   │             │     │             │     │  Questions  │                   │
│   └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                  │                          │
│                                                  ▼                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│   │   Final     │◄────│   LLM       │◄────│   Build     │                   │
│   │   Answer    │     │  Generate   │     │   Context   │                   │
│   │             │     │             │     │             │                   │
│   └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Embedding Generation

```typescript
// lib/openai.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await openai.embeddings.create({
    model: AI_CONFIG.embeddingModel,
    input: text,
  })

  return response.data[0].embedding  // 1536-dimension vector
}
```

### Cosine Similarity

```typescript
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

### Embedding Cache

WAiK caches embeddings in memory for performance:

```typescript
// lib/embeddings.ts

// In-memory store structure
type EmbeddingStore = {
  incidents: Record<string, {
    incidentEmbedding: number[] | null
    incidentMetadata: IncidentEmbeddingMetadata | null
    questionEmbeddings: Record<string, QuestionEmbeddingMetadata>
    lastUpdated: string | null
  }>
}

// Global singleton
const getEmbeddingStore = (): EmbeddingStore => {
  const globalStore = globalThis as typeof globalThis & { __embeddingStore?: EmbeddingStore }
  if (!globalStore.__embeddingStore) {
    globalStore.__embeddingStore = { incidents: {} }
  }
  return globalStore.__embeddingStore
}
```

### Question Embedding with Metadata

```typescript
export async function getQuestionEmbedding(
  incidentId: string,
  questionId: string,
  questionText: string,
  askedBy: string,
  askedAt: string,
  answer?: {
    id: string
    text: string
    answeredBy: string
    answeredAt: string
  },
  context?: {
    assignedTo?: string[]
    reporterId?: string
    reporterName?: string
    reporterRole?: UserRole
    source?: string
    generatedBy?: string
  }
): Promise<number[]>
```

The embedding includes both question and answer text:
```typescript
const text = answer 
  ? `Question: ${questionText}\nAnswer: ${answer.text}` 
  : `Question: ${questionText}`
const embedding = await generateEmbedding(text)
```

### Semantic Search

```typescript
export async function searchSimilarQuestions(
  incident: Incident,
  query: string,
  topK: number = 3
): Promise<Array<{
  questionId: string
  questionText: string
  answer?: string
  similarity: number
  askedBy: string
  answeredBy?: string
}>>
```

**Process**:
1. Generate embedding for the query
2. Get/generate embeddings for all incident questions
3. Calculate cosine similarity for each
4. Sort by similarity descending
5. Return top K results

---

## AI Agents

### Incident Analyzer Agent

**File**: `lib/agents/incident-analyzer.ts`

Generates comprehensive AI reports:

```typescript
class IncidentAnalyzerAgent {
  async generateReport(incident: Incident): Promise<AIReport> {
    const context = this.buildIncidentContext(incident)
    
    // Generate all sections in parallel
    const [summary, insights, recommendations, actions] = await Promise.all([
      this.generateSummary(context),
      this.generateInsights(context),
      this.generateRecommendations(context),
      this.generateActions(context),
    ])

    return {
      summary,
      insights,
      recommendations,
      actions,
      generatedAt: new Date().toISOString(),
      model: AI_CONFIG.model,
      confidence: 0.9,
    }
  }
}
```

### Intelligence Q&A Agent

**File**: `lib/agents/intelligence-qa.ts`

Two modes of operation:

#### Standard Mode (RAG Only)

```typescript
async answerQuestion(incident: Incident, question: string): Promise<string> {
  // Stage 1: RAG - Retrieve relevant information
  const similarQuestions = await searchSimilarQuestions(incident, question, 3)
  const context = await this.buildContext(incident, similarQuestions)
  
  // Stage 2: Generate answer using context
  const ragResponse = await ragChain.invoke({ context, question })
  
  // Stage 3: Enhance answer
  const enhancedResponse = await enhancementChain.invoke({ 
    question, 
    ragAnswer: ragResponse 
  })
  
  return enhancedResponse
}
```

#### Agentic Mode (With Tools)

```typescript
async answerQuestionWithTools(
  incident: Incident, 
  question: string, 
  userId: string
): Promise<string> {
  // Can suggest sending questions to staff
  // Handles confirmation commands ("yes", "send it")
  // Routes questions to appropriate staff members
}
```

---

## Cost Management

### Estimated Costs Per Operation

| Operation | Input Tokens | Output Tokens | Cost (gpt-4o-mini) |
|-----------|--------------|---------------|---------------------|
| Narrative Enhancement | ~200 | ~300 | ~$0.00008 |
| Subtype Classification | ~300 | ~10 | ~$0.00005 |
| Question Generation | ~500 | ~300 | ~$0.00012 |
| AI Report (4 sections) | ~2000 | ~1500 | ~$0.0005 |
| Intelligence Q&A | ~500 | ~300 | ~$0.00012 |
| Embedding (1536-dim) | ~100 | — | ~$0.000002 |

### Cost Per Incident Flow

```
Create Incident (with Investigation)
├── Narrative Enhancement:     ~$0.00008
├── Subtype Classification:    ~$0.00005
├── Question Generation:       ~$0.00012
├── Vectorize 6 questions:     ~$0.000012
└── TOTAL:                     ~$0.00026 (~$0.0003)

Generate AI Report:            ~$0.0005

Intelligence Q&A (per query):  ~$0.00012 + embeddings

Full Incident Lifecycle:       ~$0.001 ($1 per 1000 incidents)
```

### Cost Optimization Strategies

1. **Use gpt-4o-mini** instead of gpt-4o (17x cheaper)
2. **Cache embeddings** in memory (don't regenerate)
3. **Parallel processing** to reduce wall-clock time
4. **Lower max_tokens** for classification tasks
5. **Lower temperature** for deterministic outputs

### Monitoring Recommendations

```typescript
// Track token usage per request
const response = await openai.chat.completions.create({ ... })

console.log({
  promptTokens: response.usage?.prompt_tokens,
  completionTokens: response.usage?.completion_tokens,
  totalTokens: response.usage?.total_tokens,
})
```

---

## Error Handling

### API Key Not Configured

```typescript
if (!isOpenAIConfigured()) {
  throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY environment variable.")
}
```

### Rate Limiting

```typescript
try {
  const response = await generateChatCompletion(messages)
} catch (error) {
  if (error.status === 429) {
    // Rate limited - implement exponential backoff
    await sleep(1000 * Math.pow(2, retryCount))
    return retry()
  }
  throw error
}
```

### Graceful Degradation

Throughout WAiK, AI features degrade gracefully:

```typescript
// Report Agent
if (isOpenAIConfigured()) {
  const enhanced = await generateEnhancedNarrative(...)
} else {
  yield { type: "log", message: "OpenAI not configured; skipping enhancement" }
}

// Investigation Agent
if (!isOpenAIConfigured()) {
  return incident.investigation?.subtype || "fall-unknown"  // Use existing or default
}
```

### Error Events

Agents emit error events without stopping:

```typescript
try {
  const summary = await generateEnhancedNarrative(...)
} catch (enhancementError) {
  yield {
    type: "error",
    node: "enhance_narrative",
    error: `Failed to enhance narrative: ${String(enhancementError)}`,
  }
  // Continue without enhancement
}
```

---

## Performance Optimization

### Parallel Processing

AI Report generation runs 4 LLM calls in parallel:

```typescript
const [summary, insights, recommendations, actions] = await Promise.all([
  this.generateSummary(context),
  this.generateInsights(context),
  this.generateRecommendations(context),
  this.generateActions(context),
])
```

### Embedding Caching

```typescript
// Check cache first
if (cache.incidentEmbedding && cache.lastUpdated >= incident.updatedAt) {
  console.log("[Embeddings] Using cached incident embedding")
  return cache.incidentEmbedding
}

// Only generate if cache miss
const embedding = await generateEmbedding(text)
cache.incidentEmbedding = embedding
```

### Lazy Initialization

Agents use singleton pattern:

```typescript
let analyzerInstance: IncidentAnalyzerAgent | null = null

export function getIncidentAnalyzer(): IncidentAnalyzerAgent {
  if (!analyzerInstance) {
    analyzerInstance = new IncidentAnalyzerAgent()
  }
  return analyzerInstance
}
```

### Token Optimization

| Task | Temperature | Max Tokens | Reasoning |
|------|-------------|------------|-----------|
| Classification | 0 | 10 | Deterministic, single word |
| Question Generation | 0.3 | 500 | Some creativity, bounded |
| Report Generation | 0.7 | 2000 | More creativity needed |
| Intelligence Q&A | 0.3-0.5 | 500-600 | Factual with some flexibility |

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/openai.ts` | OpenAI client, config, core functions |
| `lib/embeddings.ts` | Embedding generation, caching, similarity search |
| `lib/agents/incident-analyzer.ts` | AI report generation |
| `lib/agents/intelligence-qa.ts` | RAG-based Q&A |
| `lib/agents/intelligence-tools.ts` | LangChain tools for agentic mode |
| `lib/agents/report_agent.ts` | Uses AI for narrative enhancement |
| `lib/agents/investigation_agent.ts` | Uses AI for classification, question generation |
| `lib/agents/expert_investigator/analyze.ts` | Uses AI for scoring, gap analysis |
| `lib/agents/expert_investigator/gap_questions.ts` | Uses AI for question generation |

---

## Related Documentation

- [04-AGENTIC-ARCHITECTURE.md](./04-AGENTIC-ARCHITECTURE.md) - Agent system overview
- [07-EXPERT-INVESTIGATOR.md](./07-EXPERT-INVESTIGATOR.md) - Expert Investigator AI usage
- [09-GOLD-STANDARDS.md](./09-GOLD-STANDARDS.md) - Compliance standards for scoring

---

*AI integration is the core of WAiK's intelligence. All AI features are designed to gracefully degrade when OpenAI is not configured.*


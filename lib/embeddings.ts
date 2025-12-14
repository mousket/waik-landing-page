import { generateEmbedding, cosineSimilarity } from "./openai"
import type { Incident, UserRole } from "./types"

interface QuestionEmbeddingMetadata {
  embedding: number[]
  questionText: string
  askedBy: string
  askedAt: string
  source?: string
  generatedBy?: string
  assignedTo?: string[]
  reporterId?: string
  reporterName?: string
  reporterRole?: UserRole
  answerId?: string
  answerText?: string
  answeredBy?: string
  answeredAt?: string
  hasAnswer: boolean
  vectorizedAt: string
}

interface IncidentEmbeddingMetadata {
  residentName: string
  residentRoom: string
  staffId: string
  staffName: string
  title: string
  vectorizedAt: string
}

type IncidentCacheEntry = {
  incidentEmbedding: number[] | null
  incidentMetadata: IncidentEmbeddingMetadata | null
  questionEmbeddings: Record<string, QuestionEmbeddingMetadata>
  lastUpdated: string | null
}

type EmbeddingStore = {
  incidents: Record<string, IncidentCacheEntry>
}

const getEmbeddingStore = (): EmbeddingStore => {
  const globalStore = globalThis as typeof globalThis & { __embeddingStore?: EmbeddingStore }
  if (!globalStore.__embeddingStore) {
    globalStore.__embeddingStore = {
      incidents: {},
    }
  }
  return globalStore.__embeddingStore
}

const embeddingStore = getEmbeddingStore()

function ensureIncidentCache(incidentId: string): IncidentCacheEntry {
  if (!embeddingStore.incidents[incidentId]) {
    embeddingStore.incidents[incidentId] = {
      incidentEmbedding: null,
      incidentMetadata: null,
      questionEmbeddings: {},
      lastUpdated: null,
    }
  }
  return embeddingStore.incidents[incidentId]
}

export async function getIncidentEmbedding(incident: Incident): Promise<number[]> {
  const cache = ensureIncidentCache(incident.id)

  if (cache.incidentEmbedding && cache.lastUpdated && incident.updatedAt && cache.lastUpdated >= incident.updatedAt) {
    console.log("[Embeddings] Using cached incident embedding for:", incident.id)
    return cache.incidentEmbedding
  }

  console.log("[Embeddings] Generating new incident embedding for:", incident.id)
  const text = createIncidentText(incident)
  const embedding = await generateEmbedding(text)

  cache.incidentEmbedding = embedding
  cache.incidentMetadata = {
    residentName: incident.residentName,
    residentRoom: incident.residentRoom,
    staffId: incident.staffId,
    staffName: incident.staffName,
    title: incident.title,
    vectorizedAt: new Date().toISOString(),
  }
  cache.lastUpdated = new Date().toISOString()

  return embedding
}

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
  },
): Promise<number[]> {
  const cache = ensureIncidentCache(incidentId)
  const questionCache = cache.questionEmbeddings[questionId]

  if (questionCache) {
    console.log("[Embeddings] Using cached question embedding:", questionId)
    return questionCache.embedding
  }

  console.log("[Embeddings] Generating new question embedding:", questionId)
  const text = answer ? `Question: ${questionText}\nAnswer: ${answer.text}` : `Question: ${questionText}`
  const embedding = await generateEmbedding(text)

  const metadata: QuestionEmbeddingMetadata = {
    embedding,
    questionText,
    askedBy,
    askedAt,
    source: context?.source,
    generatedBy: context?.generatedBy,
    assignedTo: context?.assignedTo,
    reporterId: context?.reporterId,
    reporterName: context?.reporterName,
    reporterRole: context?.reporterRole,
    answerId: answer?.id,
    answerText: answer?.text,
    answeredBy: answer?.answeredBy,
    answeredAt: answer?.answeredAt,
    hasAnswer: !!answer,
    vectorizedAt: new Date().toISOString(),
  }

  cache.questionEmbeddings[questionId] = metadata
  cache.lastUpdated = new Date().toISOString()

  return embedding
}

export async function searchSimilarQuestions(
  incident: Incident,
  query: string,
  topK: number = 3,
): Promise<
  Array<{
    questionId: string
    questionText: string
    answer?: string
    similarity: number
    askedBy: string
    answeredBy?: string
  }>
> {
  const queryEmbedding = await generateEmbedding(query)

  const results: Array<{
    questionId: string
    questionText: string
    answer?: string
    similarity: number
    askedBy: string
    answeredBy?: string
  }> = []

  for (const question of incident.questions) {
    const questionEmbedding = await getQuestionEmbedding(
      incident.id,
      question.id,
      question.questionText,
      question.askedBy,
      question.askedAt,
      question.answer
        ? {
            id: question.answer.id,
            text: question.answer.answerText,
            answeredBy: question.answer.answeredBy,
            answeredAt: question.answer.answeredAt,
          }
        : undefined,
    )

    const similarity = cosineSimilarity(queryEmbedding, questionEmbedding)

    results.push({
      questionId: question.id,
      questionText: question.questionText,
      answer: question.answer?.answerText,
      similarity,
      askedBy: question.askedBy,
      answeredBy: question.answer?.answeredBy,
    })
  }

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
}

export async function clearIncidentCache(incidentId: string): Promise<void> {
  delete embeddingStore.incidents[incidentId]
  console.log("[Embeddings] Cleared cache for:", incidentId)
}

function createIncidentText(incident: Incident): string {
  const parts = [
    `Title: ${incident.title}`,
    `Description: ${incident.description}`,
    `Resident: ${incident.residentName} in Room ${incident.residentRoom}`,
    `Status: ${incident.status}`,
    `Priority: ${incident.priority}`,
  ]

  for (const q of incident.questions) {
    parts.push(`Question: ${q.questionText}`)
    if (q.answer) {
      parts.push(`Answer: ${q.answer.answerText}`)
    }
  }

  return parts.join("\n")
}

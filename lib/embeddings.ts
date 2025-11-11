import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import path from "path"
import { generateEmbedding, cosineSimilarity } from "./openai"
import type { Incident, UserRole } from "./types"

// Embedding cache structure with full metadata for traceability
interface QuestionEmbeddingMetadata {
  embedding: number[]
  questionText: string
  askedBy: string  // Admin who asked
  askedAt: string
  source?: string
  generatedBy?: string
  assignedTo?: string[]
  reporterId?: string
  reporterName?: string
  reporterRole?: UserRole
  answerId?: string  // Link to answer
  answerText?: string
  answeredBy?: string  // Staff who answered
  answeredAt?: string
  hasAnswer: boolean
  vectorizedAt: string
}

interface IncidentEmbeddingMetadata {
  residentName: string
  residentRoom: string
  staffId: string  // Assigned staff
  staffName: string
  title: string
  vectorizedAt: string
}

interface EmbeddingCache {
  [incidentId: string]: {
    incidentEmbedding: number[]
    incidentMetadata: IncidentEmbeddingMetadata
    questionEmbeddings: {
      [questionId: string]: QuestionEmbeddingMetadata
    }
    lastUpdated: string
  }
}

// Initialize embedding cache
const embeddingsPath = path.join(process.cwd(), "data", "embeddings.json")
const adapter = new JSONFile<EmbeddingCache>(embeddingsPath)
const embeddingsDb = new Low<EmbeddingCache>(adapter, {})

let isInitialized = false

async function initializeEmbeddings() {
  if (!isInitialized) {
    await embeddingsDb.read()
    embeddingsDb.data ||= {}
    isInitialized = true
    console.log("[Embeddings] Cache initialized from:", embeddingsPath)
  }
}

initializeEmbeddings().catch((err) => console.error("[Embeddings] Init error:", err))

/**
 * Get or generate incident embedding with full metadata
 */
export async function getIncidentEmbedding(incident: Incident): Promise<number[]> {
  await initializeEmbeddings()

  const cache = embeddingsDb.data[incident.id]
  
  // Check if we have a valid cache
  if (cache && cache.lastUpdated >= incident.updatedAt) {
    console.log("[Embeddings] Using cached incident embedding for:", incident.id)
    return cache.incidentEmbedding
  }

  // Generate new embedding
  console.log("[Embeddings] Generating new incident embedding for:", incident.id)
  const text = createIncidentText(incident)
  const embedding = await generateEmbedding(text)

  // Cache it with FULL METADATA for traceability
  if (!embeddingsDb.data[incident.id]) {
    embeddingsDb.data[incident.id] = {
      incidentEmbedding: embedding,
      incidentMetadata: {
        residentName: incident.residentName,
        residentRoom: incident.residentRoom,
        staffId: incident.staffId,
        staffName: incident.staffName,
        title: incident.title,
        vectorizedAt: new Date().toISOString(),
      },
      questionEmbeddings: {},
      lastUpdated: new Date().toISOString(),
    }
  } else {
    embeddingsDb.data[incident.id].incidentEmbedding = embedding
    embeddingsDb.data[incident.id].incidentMetadata = {
      residentName: incident.residentName,
      residentRoom: incident.residentRoom,
      staffId: incident.staffId,
      staffName: incident.staffName,
      title: incident.title,
      vectorizedAt: new Date().toISOString(),
    }
    embeddingsDb.data[incident.id].lastUpdated = new Date().toISOString()
  }

  await embeddingsDb.write()
  return embedding
}

/**
 * Get or generate question embedding with FULL METADATA for traceability
 * This ensures we can trace back from embedding to:
 * - Question text and who asked it
 * - Answer text and who answered it
 * - Link to incident (via incidentId)
 */
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
  await initializeEmbeddings()

  const cache = embeddingsDb.data[incidentId]?.questionEmbeddings?.[questionId]
  
  if (cache) {
    console.log("[Embeddings] Using cached question embedding:", questionId)
    return cache.embedding
  }

  // Generate new embedding
  console.log("[Embeddings] Generating new question embedding:", questionId)
  const text = answer ? `Question: ${questionText}\nAnswer: ${answer.text}` : `Question: ${questionText}`
  const embedding = await generateEmbedding(text)

  // Cache it with FULL METADATA for complete traceability
  const metadata: QuestionEmbeddingMetadata = {
    embedding,
    questionText,
    askedBy,  // ✅ Link to admin who asked
    askedAt,
    source: context?.source,
    generatedBy: context?.generatedBy,
    assignedTo: context?.assignedTo,
    reporterId: context?.reporterId,
    reporterName: context?.reporterName,
    reporterRole: context?.reporterRole,
    answerId: answer?.id,  // ✅ Link to specific answer
    answerText: answer?.text,
    answeredBy: answer?.answeredBy,  // ✅ Link to staff who answered
    answeredAt: answer?.answeredAt,
    hasAnswer: !!answer,
    vectorizedAt: new Date().toISOString(),
  }

  // Ensure incident entry exists
  if (!embeddingsDb.data[incidentId]) {
    embeddingsDb.data[incidentId] = {
      incidentEmbedding: [],
      incidentMetadata: {
        residentName: "",
        residentRoom: "",
        staffId: "",
        staffName: "",
        title: "",
        vectorizedAt: new Date().toISOString(),
      },
      questionEmbeddings: {},
      lastUpdated: new Date().toISOString(),
    }
  }

  // Store metadata
  embeddingsDb.data[incidentId].questionEmbeddings ||= {}
  embeddingsDb.data[incidentId].questionEmbeddings[questionId] = metadata
  embeddingsDb.data[incidentId].lastUpdated = new Date().toISOString()

  await embeddingsDb.write()
  return embedding
}

/**
 * Search questions semantically using RAG with full metadata
 */
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
  await initializeEmbeddings()

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Get all question embeddings with metadata
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

  // Sort by similarity and return top K
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
}

/**
 * Clear cache for an incident (force regeneration)
 */
export async function clearIncidentCache(incidentId: string): Promise<void> {
  await initializeEmbeddings()
  
  delete embeddingsDb.data[incidentId]
  await embeddingsDb.write()
  
  console.log("[Embeddings] Cleared cache for:", incidentId)
}

/**
 * Helper: Create searchable text from incident
 */
function createIncidentText(incident: Incident): string {
  const parts = [
    `Title: ${incident.title}`,
    `Description: ${incident.description}`,
    `Resident: ${incident.residentName} in Room ${incident.residentRoom}`,
    `Status: ${incident.status}`,
    `Priority: ${incident.priority}`,
  ]

  // Add all questions and answers
  for (const q of incident.questions) {
    parts.push(`Question: ${q.questionText}`)
    if (q.answer) {
      parts.push(`Answer: ${q.answer.answerText}`)
    }
  }

  return parts.join("\n")
}


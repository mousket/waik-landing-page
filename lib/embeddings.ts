import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import path from "path"
import { generateEmbedding, cosineSimilarity } from "./openai"
import type { Incident } from "./types"

// Embedding cache structure
interface EmbeddingCache {
  [incidentId: string]: {
    incidentEmbedding: number[]
    questionEmbeddings: {
      [questionId: string]: number[]
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
 * Get or generate incident embedding
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

  // Cache it
  if (!embeddingsDb.data[incident.id]) {
    embeddingsDb.data[incident.id] = {
      incidentEmbedding: embedding,
      questionEmbeddings: {},
      lastUpdated: new Date().toISOString(),
    }
  } else {
    embeddingsDb.data[incident.id].incidentEmbedding = embedding
    embeddingsDb.data[incident.id].lastUpdated = new Date().toISOString()
  }

  await embeddingsDb.write()
  return embedding
}

/**
 * Get or generate question embedding
 */
export async function getQuestionEmbedding(
  incidentId: string,
  questionId: string,
  questionText: string,
  answer?: string,
): Promise<number[]> {
  await initializeEmbeddings()

  const cache = embeddingsDb.data[incidentId]?.questionEmbeddings?.[questionId]
  
  if (cache) {
    console.log("[Embeddings] Using cached question embedding:", questionId)
    return cache
  }

  // Generate new embedding
  console.log("[Embeddings] Generating new question embedding:", questionId)
  const text = answer ? `Question: ${questionText}\nAnswer: ${answer}` : `Question: ${questionText}`
  const embedding = await generateEmbedding(text)

  // Cache it
  if (!embeddingsDb.data[incidentId]) {
    embeddingsDb.data[incidentId] = {
      incidentEmbedding: [],
      questionEmbeddings: { [questionId]: embedding },
      lastUpdated: new Date().toISOString(),
    }
  } else {
    embeddingsDb.data[incidentId].questionEmbeddings ||= {}
    embeddingsDb.data[incidentId].questionEmbeddings[questionId] = embedding
  }

  await embeddingsDb.write()
  return embedding
}

/**
 * Search questions semantically using RAG
 */
export async function searchSimilarQuestions(
  incident: Incident,
  query: string,
  topK: number = 3,
): Promise<Array<{ questionId: string; questionText: string; answer?: string; similarity: number }>> {
  await initializeEmbeddings()

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Get all question embeddings
  const results: Array<{ questionId: string; questionText: string; answer?: string; similarity: number }> = []

  for (const question of incident.questions) {
    const questionEmbedding = await getQuestionEmbedding(
      incident.id,
      question.id,
      question.questionText,
      question.answer?.answerText,
    )

    const similarity = cosineSimilarity(queryEmbedding, questionEmbedding)

    results.push({
      questionId: question.id,
      questionText: question.questionText,
      answer: question.answer?.answerText,
      similarity,
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


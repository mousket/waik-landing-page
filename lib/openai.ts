import OpenAI from "openai"

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Model configuration from environment variables with smart defaults
export const AI_CONFIG = {
  model: process.env.OPENAI_LLM_MODEL || "gpt-4o-mini",
  embeddingModel: process.env.OPENAI_TEXT_EMBEDDING_MODEL || "text-embedding-3-small",
  temperature: 0.7,
  maxTokens: 2000,
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/**
 * Generate a chat completion
 */
export async function generateChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<typeof AI_CONFIG>,
) {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await openai.chat.completions.create({
    model: options?.model || AI_CONFIG.model,
    messages,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
    max_tokens: options?.maxTokens || AI_CONFIG.maxTokens,
  })

  return response
}

/**
 * Generate text embedding for semantic search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await openai.embeddings.create({
    model: AI_CONFIG.embeddingModel,
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Calculate cosine similarity between two vectors
 */
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

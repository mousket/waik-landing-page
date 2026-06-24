import type OpenAI from "openai"
import {
  AI_CONFIG,
  modelForTask,
  resolveAiConfig,
  tierForTask,
  type AiConfig,
  type AiTask,
} from "@/lib/ai-config"
import {
  createChatCompletion,
  createEmbedding,
  createLangChainChatModel,
  getOpenAI,
  isEmbeddingConfigured,
  isLlmConfigured,
  openai,
} from "@/lib/llm"

export {
  AI_CONFIG,
  modelForTask,
  resolveAiConfig,
  tierForTask,
  createLangChainChatModel,
  getOpenAI,
  isEmbeddingConfigured,
  isLlmConfigured,
  openai,
}

export type { AiConfig, AiTask }

/** @deprecated Use isLlmConfigured — kept for existing call sites. */
export function isOpenAIConfigured(): boolean {
  return isLlmConfigured()
}

export type { ChatCompletionOptions } from "@/lib/llm/types"

/**
 * Generate a chat completion via the configured LLM provider facade.
 */
export async function generateChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Parameters<typeof createChatCompletion>[1],
) {
  if (!isLlmConfigured()) {
    throw new Error("LLM provider is not configured")
  }
  return createChatCompletion(messages, options)
}

/**
 * Generate text embedding via the configured embedding provider facade.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!isEmbeddingConfigured()) {
    throw new Error("Embedding provider is not configured")
  }
  return createEmbedding(text)
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

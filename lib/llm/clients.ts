import OpenAI from "openai"
import type { EmbeddingProviderConfig, LlmProviderConfig } from "./types"
import { resolveEmbeddingProviderConfig, resolveLlmProviderConfig } from "./provider-registry"

const openAiClients = new Map<string, OpenAI>()

function clientCacheKey(prefix: string, config: { id: string; baseURL?: string }): string {
  return `${prefix}:${config.id}:${config.baseURL ?? "default"}`
}

export function getOpenAiCompatibleClient(config: LlmProviderConfig | EmbeddingProviderConfig): OpenAI {
  const cacheKey = clientCacheKey("chat", config)
  const existing = openAiClients.get(cacheKey)
  if (existing) return existing

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })
  openAiClients.set(cacheKey, client)
  return client
}

export function getLlmOpenAiClient(env: Record<string, string | undefined> = process.env): OpenAI {
  const provider = resolveLlmProviderConfig(env)
  if (provider.id === "CLAUDE") {
    throw new Error("getLlmOpenAiClient() is only valid for OPEN_AI and DEEPSEEK providers")
  }
  return getOpenAiCompatibleClient(provider)
}

export function getEmbeddingOpenAiClient(env: Record<string, string | undefined> = process.env): OpenAI {
  return getOpenAiCompatibleClient(resolveEmbeddingProviderConfig(env))
}

/** Legacy export — OpenAI-compatible client for the active LLM provider when applicable. */
export function getOpenAI(env: Record<string, string | undefined> = process.env): OpenAI {
  const provider = resolveLlmProviderConfig(env)
  if (provider.id === "CLAUDE") {
    return getOpenAiCompatibleClient(resolveEmbeddingProviderConfig(env))
  }
  return getOpenAiCompatibleClient(provider)
}

/** Legacy singleton — lazily uses env at import time. */
export const openai = getOpenAI()

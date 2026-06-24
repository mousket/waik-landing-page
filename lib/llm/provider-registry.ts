import type { EmbeddingProviderConfig, EmbeddingProviderId, LlmProviderConfig, LlmProviderId } from "./types"

const LLM_PROVIDER_ALIASES: Record<string, LlmProviderId> = {
  OPEN_AI: "OPEN_AI",
  OPENAI: "OPEN_AI",
  CLAUDE: "CLAUDE",
  ANTHROPIC: "CLAUDE",
  DEEPSEEK: "DEEPSEEK",
}

const EMBEDDING_PROVIDER_ALIASES: Record<string, EmbeddingProviderId> = {
  OPEN_AI: "OPEN_AI",
  OPENAI: "OPEN_AI",
  DEEPSEEK: "DEEPSEEK",
}

export function normalizeLlmProviderId(raw: string | undefined, fallback: LlmProviderId = "OPEN_AI"): LlmProviderId {
  const key = (raw || fallback).trim().toUpperCase().replace(/-/g, "_")
  return LLM_PROVIDER_ALIASES[key] ?? fallback
}

export function normalizeEmbeddingProviderId(
  raw: string | undefined,
  fallback: EmbeddingProviderId = "OPEN_AI",
): EmbeddingProviderId {
  const key = (raw || fallback).trim().toUpperCase().replace(/-/g, "_")
  if (key === "CLAUDE" || key === "ANTHROPIC") {
    throw new Error(
      "TEXT_EMBEDDING_PROVIDER cannot be CLAUDE — Anthropic has no embeddings API. Use OPEN_AI or DEEPSEEK.",
    )
  }
  return EMBEDDING_PROVIDER_ALIASES[key] ?? fallback
}

function llmApiKey(id: LlmProviderId, env: Record<string, string | undefined>): string {
  switch (id) {
    case "OPEN_AI":
      return String(env.OPENAI_API_KEY ?? "").trim()
    case "DEEPSEEK":
      return String(env.DEEPSEEK_API_KEY ?? "").trim()
    case "CLAUDE":
      return String(env.ANTHROPIC_API_KEY ?? env.CLAUDE_API_KEY ?? "").trim()
    default:
      return ""
  }
}

function embeddingApiKey(id: EmbeddingProviderId, env: Record<string, string | undefined>): string {
  switch (id) {
    case "OPEN_AI":
      return String(env.OPENAI_API_KEY ?? "").trim()
    case "DEEPSEEK":
      return String(env.DEEPSEEK_API_KEY ?? "").trim()
    default:
      return ""
  }
}

export function resolveLlmProviderConfig(
  env: Record<string, string | undefined> = process.env,
): LlmProviderConfig {
  const id = normalizeLlmProviderId(env.LLM_PROVIDER)
  const apiKey = llmApiKey(id, env)
  if (id === "DEEPSEEK") {
    return { id, apiKey, baseURL: "https://api.deepseek.com" }
  }
  return { id, apiKey }
}

export function resolveEmbeddingProviderConfig(
  env: Record<string, string | undefined> = process.env,
): EmbeddingProviderConfig {
  const id = normalizeEmbeddingProviderId(env.TEXT_EMBEDDING_PROVIDER)
  const apiKey = embeddingApiKey(id, env)
  if (id === "DEEPSEEK") {
    return { id, apiKey, baseURL: "https://api.deepseek.com" }
  }
  return { id, apiKey }
}

export function isLlmConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const { id, apiKey } = resolveLlmProviderConfig(env)
  return Boolean(apiKey) && ["OPEN_AI", "CLAUDE", "DEEPSEEK"].includes(id)
}

export function isEmbeddingConfigured(env: Record<string, string | undefined> = process.env): boolean {
  try {
    const { apiKey } = resolveEmbeddingProviderConfig(env)
    return Boolean(apiKey)
  } catch {
    return false
  }
}

import {
  normalizeEmbeddingProviderId,
  normalizeLlmProviderId,
  type EmbeddingProviderId,
  type LlmProviderId,
} from "@/lib/llm/provider-registry"

export type AiConfig = {
  llmProvider: LlmProviderId
  embeddingProvider: EmbeddingProviderId
  model: string
  reasoningModel: string
  embeddingModel: string
  temperature: number
  maxTokens: number
}

/** Maps product activities to flash vs reasoning model tiers. */
export const AI_TASK_MODEL_TIER = {
  extract: "reasoning",
  gapFill: "reasoning",
  gapQuestions: "reasoning",
  clinicalRecord: "reasoning",
  verify: "reasoning",
  previewInsights: "reasoning",
  investigationQuestions: "reasoning",
  rootCause: "reasoning",
  incidentAnalyzer: "reasoning",
  classify: "flash",
  narrativePolish: "flash",
  coaching: "flash",
  ragAnswer: "flash",
  assessmentTurn: "flash",
  communityIntelligence: "flash",
  mdsRecommendations: "flash",
} as const

export type AiTask = keyof typeof AI_TASK_MODEL_TIER
export type AiModelTier = (typeof AI_TASK_MODEL_TIER)[AiTask]

/** Resolve LLM + embedding model ids from environment. */
export function resolveAiConfig(
  env: Record<string, string | undefined> = process.env,
): AiConfig {
  const model = env.LLM_MODEL || "gpt-4o-mini"
  return {
    llmProvider: normalizeLlmProviderId(env.LLM_PROVIDER),
    embeddingProvider: normalizeEmbeddingProviderId(env.TEXT_EMBEDDING_PROVIDER),
    model,
    reasoningModel: env.LLM_MODEL_REASONING || model,
    embeddingModel: env.TEXT_EMBEDDING_MODEL || "text-embedding-3-small",
    temperature: 0.7,
    maxTokens: 2000,
  }
}

export const AI_CONFIG = resolveAiConfig()

export function modelForTask(task: AiTask, config: AiConfig = AI_CONFIG): string {
  return AI_TASK_MODEL_TIER[task] === "reasoning" ? config.reasoningModel : config.model
}

export function tierForTask(task: AiTask): AiModelTier {
  return AI_TASK_MODEL_TIER[task]
}

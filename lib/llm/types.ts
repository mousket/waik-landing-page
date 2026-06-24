import type OpenAI from "openai"
import type { AiConfig } from "@/lib/ai-config"

export type LlmProviderId = "OPEN_AI" | "CLAUDE" | "DEEPSEEK"
export type EmbeddingProviderId = "OPEN_AI" | "DEEPSEEK"

export type LlmProviderConfig = {
  id: LlmProviderId
  apiKey: string
  baseURL?: string
}

export type EmbeddingProviderConfig = {
  id: EmbeddingProviderId
  apiKey: string
  baseURL?: string
}

export type ChatCompletionOptions = Partial<AiConfig> &
  Pick<OpenAI.Chat.Completions.ChatCompletionCreateParams, "tools" | "tool_choice" | "response_format">

export type ChatCompletionResult = OpenAI.Chat.ChatCompletion

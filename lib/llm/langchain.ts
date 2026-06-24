import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { ChatAnthropic } from "@langchain/anthropic"
import { ChatOpenAI } from "@langchain/openai"
import { resolveLlmProviderConfig } from "./provider-registry"

export function createLangChainChatModel(options: {
  modelName: string
  temperature?: number
  maxTokens?: number
  env?: Record<string, string | undefined>
}): BaseChatModel {
  const env = options.env ?? process.env
  const provider = resolveLlmProviderConfig(env)

  if (!provider.apiKey) {
    throw new Error(`LLM provider ${provider.id} is not configured (missing API key)`)
  }

  if (provider.id === "CLAUDE") {
    return new ChatAnthropic({
      anthropicApiKey: provider.apiKey,
      modelName: options.modelName,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
  }

  return new ChatOpenAI({
    modelName: options.modelName,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    apiKey: provider.apiKey,
    configuration: provider.baseURL ? { baseURL: provider.baseURL } : undefined,
  })
}

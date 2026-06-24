import { describe, expect, it } from "vitest"
import { modelForTask, resolveAiConfig, tierForTask } from "@/lib/ai-config"
import {
  isEmbeddingConfigured,
  isLlmConfigured,
  normalizeEmbeddingProviderId,
  normalizeLlmProviderId,
  resolveEmbeddingProviderConfig,
  resolveLlmProviderConfig,
} from "@/lib/llm/provider-registry"

describe("resolveAiConfig", () => {
  it("uses LLM_MODEL, LLM_MODEL_REASONING, and TEXT_EMBEDDING_MODEL", () => {
    expect(
      resolveAiConfig({
        LLM_PROVIDER: "DEEPSEEK",
        TEXT_EMBEDDING_PROVIDER: "OPEN_AI",
        LLM_MODEL: "deepseek-v4-flash",
        LLM_MODEL_REASONING: "deepseek-v4-pro",
        TEXT_EMBEDDING_MODEL: "text-embedding-3-small",
      }),
    ).toEqual({
      llmProvider: "DEEPSEEK",
      embeddingProvider: "OPEN_AI",
      model: "deepseek-v4-flash",
      reasoningModel: "deepseek-v4-pro",
      embeddingModel: "text-embedding-3-small",
      temperature: 0.7,
      maxTokens: 2000,
    })
  })

  it("falls back reasoning model to LLM_MODEL when unset", () => {
    expect(resolveAiConfig({ LLM_MODEL: "gpt-4o-mini" }).reasoningModel).toBe("gpt-4o-mini")
  })
})

describe("modelForTask", () => {
  it("maps reasoning tasks to reasoning model", () => {
    const config = resolveAiConfig({
      LLM_MODEL: "flash-model",
      LLM_MODEL_REASONING: "pro-model",
    })
    expect(modelForTask("extract", config)).toBe("pro-model")
    expect(modelForTask("classify", config)).toBe("flash-model")
    expect(tierForTask("gapFill")).toBe("reasoning")
    expect(tierForTask("coaching")).toBe("flash")
  })
})

describe("provider registry", () => {
  it("normalizes provider aliases", () => {
    expect(normalizeLlmProviderId("openai")).toBe("OPEN_AI")
    expect(normalizeLlmProviderId("anthropic")).toBe("CLAUDE")
    expect(normalizeEmbeddingProviderId("open_ai")).toBe("OPEN_AI")
  })

  it("resolves DeepSeek LLM base URL", () => {
    expect(
      resolveLlmProviderConfig({
        LLM_PROVIDER: "DEEPSEEK",
        DEEPSEEK_API_KEY: "ds-key",
      }),
    ).toEqual({
      id: "DEEPSEEK",
      apiKey: "ds-key",
      baseURL: "https://api.deepseek.com",
    })
  })

  it("checks configured keys per provider", () => {
    expect(
      isLlmConfigured({
        LLM_PROVIDER: "OPEN_AI",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toBe(true)
    expect(
      isEmbeddingConfigured({
        TEXT_EMBEDDING_PROVIDER: "OPEN_AI",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toBe(true)
    expect(
      isLlmConfigured({
        LLM_PROVIDER: "CLAUDE",
        ANTHROPIC_API_KEY: "ant-test",
      }),
    ).toBe(true)
  })

  it("rejects Claude as embedding provider", () => {
    expect(() => normalizeEmbeddingProviderId("CLAUDE")).toThrow(/cannot be CLAUDE/)
    expect(() =>
      resolveEmbeddingProviderConfig({
        TEXT_EMBEDDING_PROVIDER: "CLAUDE",
        ANTHROPIC_API_KEY: "ant-test",
      }),
    ).toThrow()
  })
})

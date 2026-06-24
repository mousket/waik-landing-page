import { resolveAiConfig } from "@/lib/ai-config"
import { getEmbeddingOpenAiClient } from "./clients"
import { isEmbeddingConfigured, resolveEmbeddingProviderConfig } from "./provider-registry"

export async function createEmbedding(
  text: string,
  env: Record<string, string | undefined> = process.env,
): Promise<number[]> {
  if (!isEmbeddingConfigured(env)) {
    const provider = resolveEmbeddingProviderConfig(env)
    throw new Error(`Embedding provider ${provider.id} is not configured (missing API key)`)
  }

  const client = getEmbeddingOpenAiClient(env)
  const config = resolveAiConfig(env)
  const response = await client.embeddings.create({
    model: config.embeddingModel,
    input: text,
  })

  return response.data[0].embedding
}

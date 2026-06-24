import type OpenAI from "openai"
import type { ChatCompletionOptions, ChatCompletionResult } from "./types"
import { resolveAiConfig } from "@/lib/ai-config"
import { resolveLlmProviderConfig } from "./provider-registry"
import { getOpenAiCompatibleClient } from "./clients"

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }

type AnthropicMessage = {
  role: "user" | "assistant"
  content: string | AnthropicContentBlock[]
}

function toAnthropicMessages(messages: OpenAI.Chat.ChatCompletionMessageParam[]): {
  system?: string
  messages: AnthropicMessage[]
} {
  let system: string | undefined
  const out: AnthropicMessage[] = []

  for (const message of messages) {
    if (message.role === "system") {
      const text = typeof message.content === "string" ? message.content : JSON.stringify(message.content)
      system = system ? `${system}\n\n${text}` : text
      continue
    }
    if (message.role === "user" || message.role === "assistant") {
      const text =
        typeof message.content === "string"
          ? message.content
          : Array.isArray(message.content)
            ? message.content
                .map((part) => ("text" in part && part.text ? part.text : ""))
                .filter(Boolean)
                .join("\n")
            : ""
      if (text) {
        out.push({ role: message.role, content: text })
      }
    }
  }

  return { system, messages: out }
}

function mapOpenAiToolsToAnthropic(
  tools: OpenAI.Chat.Completions.ChatCompletionCreateParams["tools"],
): Array<{ name: string; description?: string; input_schema: Record<string, unknown> }> {
  if (!tools?.length) return []
  return tools
    .filter((tool): tool is OpenAI.Chat.ChatCompletionTool => tool.type === "function")
    .map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: (tool.function.parameters ?? { type: "object", properties: {} }) as Record<
        string,
        unknown
      >,
    }))
}

function mapAnthropicResponseToOpenAi(
  model: string,
  payload: {
    content: AnthropicContentBlock[]
    stop_reason?: string | null
  },
): ChatCompletionResult {
  const toolUses = payload.content.filter(
    (block): block is Extract<AnthropicContentBlock, { type: "tool_use" }> => block.type === "tool_use",
  )
  const text = payload.content
    .filter((block): block is Extract<AnthropicContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("")

  const message: OpenAI.Chat.ChatCompletionMessage = {
    role: "assistant",
    content: text || null,
    refusal: null,
  }

  if (toolUses.length > 0) {
    message.tool_calls = toolUses.map((tool) => ({
      id: tool.id,
      type: "function" as const,
      function: {
        name: tool.name,
        arguments: JSON.stringify(tool.input ?? {}),
      },
    }))
  }

  return {
    id: `claude-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: payload.stop_reason === "tool_use" ? "tool_calls" : "stop",
        logprobs: null,
      },
    ],
  }
}

async function createClaudeChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: ChatCompletionOptions | undefined,
  apiKey: string,
  env: Record<string, string | undefined>,
): Promise<ChatCompletionResult> {
  const config = resolveAiConfig(env)
  const model = options?.model || config.model
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages)
  const tools = mapOpenAiToolsToAnthropic(options?.tools)

  const body: Record<string, unknown> = {
    model,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    temperature: options?.temperature ?? config.temperature,
    messages: anthropicMessages,
  }
  if (system) body.system = system
  if (tools.length > 0) body.tools = tools

  if (options?.tool_choice && typeof options.tool_choice === "object" && "function" in options.tool_choice) {
    body.tool_choice = { type: "tool", name: options.tool_choice.function.name }
  }

  if (options?.response_format?.type === "json_object") {
    body.system = [system, "Respond with valid JSON only."].filter(Boolean).join("\n\n")
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Claude chat completion failed (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as {
    content: AnthropicContentBlock[]
    stop_reason?: string | null
  }
  return mapAnthropicResponseToOpenAi(model, data)
}

async function createOpenAiCompatibleChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: ChatCompletionOptions | undefined,
  provider: ReturnType<typeof resolveLlmProviderConfig>,
  env: Record<string, string | undefined>,
): Promise<ChatCompletionResult> {
  const config = resolveAiConfig(env)
  const client = getOpenAiCompatibleClient(provider)
  return client.chat.completions.create({
    model: options?.model || config.model,
    messages,
    temperature: options?.temperature ?? config.temperature,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    tools: options?.tools,
    tool_choice: options?.tool_choice,
    response_format: options?.response_format,
  })
}

export async function createChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: ChatCompletionOptions,
  env: Record<string, string | undefined> = process.env,
): Promise<ChatCompletionResult> {
  const provider = resolveLlmProviderConfig(env)
  if (!provider.apiKey) {
    throw new Error(`LLM provider ${provider.id} is not configured (missing API key)`)
  }

  if (provider.id === "CLAUDE") {
    return createClaudeChatCompletion(messages, options, provider.apiKey, env)
  }

  return createOpenAiCompatibleChatCompletion(messages, options, provider, env)
}

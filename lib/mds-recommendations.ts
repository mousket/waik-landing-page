import { getRedis } from "@/lib/redis"
import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import { AI_CONFIG } from "@/lib/openai"

const PREFIX = "waik:mds:"
const TTL_SEC = 24 * 60 * 60

function key(residentId: string) {
  return `${PREFIX}${residentId}`
}

export type MdsCachePayload = { recommendations: string; generatedAt: string }

export async function getMdsCached(residentId: string): Promise<MdsCachePayload | null> {
  try {
    const r = getRedis()
    const raw = await r.get(key(residentId))
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as MdsCachePayload
  } catch {
    return null
  }
}

export async function setMdsCache(residentId: string, payload: MdsCachePayload): Promise<void> {
  await getRedis().set(key(residentId), JSON.stringify(payload), "EX", TTL_SEC)
}

export async function buildMdsRecommendationsText(ctx: {
  residentName: string
  lastAssessments: Array<Record<string, unknown>>
  lastIncidents: Array<Record<string, unknown>>
}): Promise<string> {
  if (!isOpenAIConfigured()) {
    return [
      "MDS review suggestions (OpenAI not configured in this environment):",
      "• Review pain (Section J) if recent injury or med changes appear in the record.",
      "• Review function and mobility (Section G) for recent falls or mobility changes.",
      "This is a placeholder — add OPENAI_API_KEY to generate tailored recommendations.",
    ].join(" ")
  }

  const a = ctx.lastAssessments.slice(0, 2)
  const i = ctx.lastIncidents.slice(0, 3)
  const sys = `You are a skilled nursing MDS reference assistant. Given resident clinical text from WAiK (not a certified coding), suggest which MDS 3.0 *sections* may deserve coordinator review for accuracy or reimbursement. Be specific, cite section letters when possible. Plain text only, no markdown. This is for review only — not a final coding determination.`

  const user = `Resident: ${ctx.residentName}

Last assessments (up to 2) as JSON: ${JSON.stringify(a)}
Last incidents (up to 3) as JSON: ${JSON.stringify(i)}

List actionable MDS follow-ups in short paragraphs.`

  const res = await generateChatCompletion(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    { model: AI_CONFIG.model, maxTokens: 1200 },
  )
  return res.choices[0]?.message?.content?.trim() ?? ""
}

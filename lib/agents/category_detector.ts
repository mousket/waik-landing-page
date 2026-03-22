/**
 * Incident Category Detection Agent
 * 
 * Analyzes narrative text to determine incident category (fall, medication, dietary, behavioral)
 * and suggests appropriate subtype for further investigation.
 */

import { generateChatCompletion, isOpenAIConfigured } from "@/lib/openai"
import {
  IncidentCategory,
  IncidentCategoryResult,
  CATEGORY_DETECTION_PATTERNS,
} from "@/lib/gold_standards_extended"

/**
 * Simple keyword-based detection (fallback when OpenAI not available)
 */
function detectCategoryByKeywords(narrative: string): IncidentCategoryResult {
  const lowerNarrative = narrative.toLowerCase()
  
  const scores: Record<IncidentCategory, number> = {
    fall: 0,
    medication: 0,
    dietary: 0,
    behavioral: 0,
    other: 0,
  }
  
  // Score each category based on keyword matches
  for (const [category, patterns] of Object.entries(CATEGORY_DETECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerNarrative.includes(pattern.toLowerCase())) {
        scores[category as IncidentCategory] += 1
      }
    }
  }
  
  // Find the category with highest score
  let maxCategory: IncidentCategory = "other"
  let maxScore = 0
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      maxCategory = category as IncidentCategory
    }
  }
  
  // Calculate confidence (normalize to 0-1)
  const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0)
  const confidence = totalMatches > 0 ? maxScore / totalMatches : 0.5
  
  return {
    category: maxCategory,
    confidence: Math.min(confidence, 1),
    reasoning: maxScore > 0 
      ? `Detected ${maxScore} keyword matches for ${maxCategory} category`
      : "No specific incident keywords detected, defaulting to 'other'",
  }
}

/**
 * AI-powered category detection with subtype suggestion
 */
async function detectCategoryWithAI(narrative: string): Promise<IncidentCategoryResult> {
  const systemPrompt = `You are a clinical incident classifier. Analyze the narrative and determine:
1. The incident category (fall, medication, dietary, behavioral, or other)
2. Your confidence level (0-1)
3. A brief reasoning
4. If it's a fall, suggest the subtype (fall-bed, fall-wheelchair, fall-slip, fall-lift)

Respond in JSON format:
{
  "category": "fall" | "medication" | "dietary" | "behavioral" | "other",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "suggestedSubtype": "fall-bed" | "fall-wheelchair" | "fall-slip" | "fall-lift" | null
}`

  const response = await generateChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Classify this incident narrative:\n\n${narrative}` },
    ],
    { temperature: 0.1, maxTokens: 200 }
  )

  const content = response.choices[0]?.message?.content || ""
  
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        category: parsed.category || "other",
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || "AI classification",
        suggestedSubtype: parsed.suggestedSubtype || undefined,
      }
    }
  } catch (error) {
    console.warn("[CategoryDetector] Failed to parse AI response:", error)
  }
  
  // Fallback to keyword detection if AI parsing fails
  return detectCategoryByKeywords(narrative)
}

/**
 * Main entry point: Detect incident category from narrative
 */
export async function detectIncidentCategory(
  narrative: string
): Promise<IncidentCategoryResult> {
  if (!narrative || narrative.trim().length === 0) {
    return {
      category: "other",
      confidence: 0,
      reasoning: "No narrative provided",
    }
  }

  // Use AI if available, otherwise fall back to keyword detection
  if (isOpenAIConfigured()) {
    try {
      return await detectCategoryWithAI(narrative)
    } catch (error) {
      console.warn("[CategoryDetector] AI detection failed, using keyword fallback:", error)
      return detectCategoryByKeywords(narrative)
    }
  }
  
  return detectCategoryByKeywords(narrative)
}

/**
 * Get fall subtype from narrative (for falls specifically)
 */
export async function detectFallSubtype(
  narrative: string
): Promise<string | null> {
  const result = await detectIncidentCategory(narrative)
  
  if (result.category === "fall" && result.suggestedSubtype) {
    return result.suggestedSubtype
  }
  
  // Keyword-based fallback for fall subtype
  const lowerNarrative = narrative.toLowerCase()
  
  if (lowerNarrative.includes("bed") || lowerNarrative.includes("mattress")) {
    return "fall-bed"
  }
  if (lowerNarrative.includes("wheelchair") || lowerNarrative.includes("wheel chair")) {
    return "fall-wheelchair"
  }
  if (lowerNarrative.includes("slip") || lowerNarrative.includes("wet floor") || lowerNarrative.includes("spill")) {
    return "fall-slip"
  }
  if (lowerNarrative.includes("lift") || lowerNarrative.includes("hoyer") || lowerNarrative.includes("transfer")) {
    return "fall-lift"
  }
  
  return null
}


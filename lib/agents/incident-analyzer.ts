import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import type { Incident, AIReport } from "../types"
import { AI_CONFIG, isOpenAIConfigured } from "../openai"

/**
 * Incident Analyzer Agent
 * Generates comprehensive AI reports from incident data
 */
export class IncidentAnalyzerAgent {
  private model: ChatOpenAI

  constructor() {
    if (!isOpenAIConfigured()) {
      throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY environment variable.")
    }

    this.model = new ChatOpenAI({
      modelName: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      maxTokens: AI_CONFIG.maxTokens,
    })
  }

  /**
   * Generate complete AI report for an incident
   */
  async generateReport(incident: Incident): Promise<AIReport> {
    console.log("[IncidentAnalyzer] Generating AI report for incident:", incident.id)

    const incidentContext = this.buildIncidentContext(incident)
    
    // Generate all four sections in parallel for speed
    const [summary, insights, recommendations, actions] = await Promise.all([
      this.generateSummary(incidentContext),
      this.generateInsights(incidentContext),
      this.generateRecommendations(incidentContext),
      this.generateActions(incidentContext),
    ])

    const report: AIReport = {
      summary,
      insights,
      recommendations,
      actions,
      generatedAt: new Date().toISOString(),
      model: AI_CONFIG.model,
      confidence: 0.9, // You can implement confidence scoring later
    }

    console.log("[IncidentAnalyzer] Report generated successfully")
    return report
  }

  /**
   * Generate incident summary
   */
  private async generateSummary(context: string): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are a healthcare incident documentation expert. Analyze the following incident and provide a concise, professional summary.

{context}

Generate a clear, factual summary (2-3 sentences) that captures the key facts of what happened. Focus on: who, what, when, where.

Summary:`)

    const chain = prompt.pipe(this.model)
    const response = await chain.invoke({ context })

    return response.content.toString().trim()
  }

  /**
   * Generate incident insights
   */
  private async generateInsights(context: string): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are a healthcare incident analysis expert. Analyze the following incident and provide key insights.

{context}

Answer these four critical questions:
1. What happened?
2. What happened to the resident?
3. How could we have prevented this incident?
4. What should we do to stop incidents like this in the future?

Provide clear, actionable insights for each question. Format as a bulleted list.

Insights:`)

    const chain = prompt.pipe(this.model)
    const response = await chain.invoke({ context })

    return response.content.toString().trim()
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(context: string): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are a healthcare compliance and safety expert. Based on the following incident, provide specific, actionable recommendations.

{context}

Generate 3-5 specific recommendations for:
- Staff training improvements
- Environmental/equipment changes
- Policy or protocol updates
- Monitoring or documentation enhancements

Format as a numbered list with clear, actionable items.

Recommendations:`)

    const chain = prompt.pipe(this.model)
    const response = await chain.invoke({ context })

    return response.content.toString().trim()
  }

  /**
   * Generate action items
   */
  private async generateActions(context: string): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
You are a healthcare operations manager. Based on the following incident, create specific action items.

{context}

Generate 3-5 immediate action items that should be taken. Each action should be:
- Specific and measurable
- Assigned to a role (e.g., "Nursing Director", "Facility Manager", "CNA Team")
- Time-bound when possible

Format as a checklist with responsible parties.

Action Items:`)

    const chain = prompt.pipe(this.model)
    const response = await chain.invoke({ context })

    return response.content.toString().trim()
  }

  /**
   * Build context string from incident for AI analysis
   */
  private buildIncidentContext(incident: Incident): string {
    const parts = [
      `INCIDENT DETAILS:`,
      `Title: ${incident.title}`,
      `Description: ${incident.description}`,
      `Resident: ${incident.residentName} (Room ${incident.residentRoom})`,
      `Priority: ${incident.priority.toUpperCase()}`,
      `Status: ${incident.status}`,
      `Reported by: ${incident.staffName}`,
      `Date: ${new Date(incident.createdAt).toLocaleDateString()}`,
      ``,
      `QUESTIONS & ANSWERS:`,
    ]

    if (incident.questions.length === 0) {
      parts.push("No questions have been asked yet.")
    } else {
      incident.questions.forEach((q, index) => {
        parts.push(`\nQ${index + 1}: ${q.questionText}`)
        if (q.answer) {
          parts.push(`A${index + 1}: ${q.answer.answerText}`)
          parts.push(`(Answered by ${q.answer.method} on ${new Date(q.answer.answeredAt).toLocaleDateString()})`)
        } else {
          parts.push(`A${index + 1}: [Awaiting response]`)
        }
      })
    }

    return parts.join("\n")
  }
}

// Singleton instance
let analyzerInstance: IncidentAnalyzerAgent | null = null

export function getIncidentAnalyzer(): IncidentAnalyzerAgent {
  if (!analyzerInstance) {
    analyzerInstance = new IncidentAnalyzerAgent()
  }
  return analyzerInstance
}


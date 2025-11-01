import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate } from "@langchain/core/prompts"
import type { Incident } from "../types"
import { AI_CONFIG, isOpenAIConfigured } from "../openai"
import { searchSimilarQuestions } from "../embeddings"

/**
 * Intelligence Q&A Agent
 * Answers questions about incidents using RAG
 */
export class IntelligenceQAAgent {
  private model: ChatOpenAI

  constructor() {
    if (!isOpenAIConfigured()) {
      throw new Error("OpenAI API key not configured")
    }

    this.model = new ChatOpenAI({
      modelName: AI_CONFIG.model,
      temperature: 0.3, // Lower temperature for more factual answers
      maxTokens: 500,
    })
  }

  /**
   * Answer a question about an incident using RAG
   */
  async answerQuestion(incident: Incident, question: string): Promise<string> {
    console.log("[IntelligenceQA] Answering question for incident:", incident.id)

    // Step 1: Find relevant Q&A using semantic search
    const similarQuestions = await searchSimilarQuestions(incident, question, 3)

    // Step 2: Build context with incident details and relevant Q&A
    const context = this.buildContext(incident, similarQuestions)

    // Step 3: Generate answer using LLM
    const prompt = PromptTemplate.fromTemplate(`
You are a healthcare incident analysis assistant. Answer the user's question based ONLY on the provided incident information.

INCIDENT CONTEXT:
{context}

USER QUESTION:
{question}

Provide a clear, factual answer based on the incident details. If the information isn't available in the context, say so. Be concise but thorough.

Answer:`)

    const chain = prompt.pipe(this.model)
    const response = await chain.invoke({ context, question })

    return response.content.toString().trim()
  }

  /**
   * Build context from incident and similar questions
   */
  private buildContext(
    incident: Incident,
    similarQuestions: Array<{ questionText: string; answer?: string; similarity: number }>,
  ): string {
    const parts = [
      `Incident: ${incident.title}`,
      `Description: ${incident.description}`,
      `Resident: ${incident.residentName} (Room ${incident.residentRoom})`,
      `Priority: ${incident.priority}`,
      `Status: ${incident.status}`,
      ``,
      `RELEVANT QUESTIONS & ANSWERS:`,
    ]

    if (similarQuestions.length === 0) {
      parts.push("No answered questions available yet.")
    } else {
      similarQuestions.forEach((sq, index) => {
        parts.push(`\n${index + 1}. ${sq.questionText}`)
        if (sq.answer) {
          parts.push(`   Answer: ${sq.answer}`)
        } else {
          parts.push(`   Answer: Not yet answered`)
        }
        parts.push(`   (Relevance: ${(sq.similarity * 100).toFixed(1)}%)`)
      })
    }

    return parts.join("\n")
  }
}

// Singleton instance
let qaInstance: IntelligenceQAAgent | null = null

export function getIntelligenceQA(): IntelligenceQAAgent {
  if (!qaInstance) {
    qaInstance = new IntelligenceQAAgent()
  }
  return qaInstance
}

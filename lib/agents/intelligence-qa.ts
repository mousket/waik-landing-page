import { ChatOpenAI } from "@langchain/openai"
import { PromptTemplate, ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import type { Incident } from "../types"
import { AI_CONFIG, generateChatCompletion, isOpenAIConfigured } from "../openai"
import { queryFacilityIncidentStats, searchFacilityIncidents } from "./vector-search"
import type { SearchResponse } from "./vector-search"
import { searchSimilarQuestions } from "../embeddings"
import { getUserById } from "../db"

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
   * Answer a question WITH TOOLS (can suggest and send questions to staff)
   * This is a SIMPLIFIED AGENTIC version using function calling
   */
  async answerQuestionWithTools(
    incident: Incident, 
    question: string, 
    userId: string
  ): Promise<string> {
    console.log("[IntelligenceQA] Using AGENTIC mode for:", incident.id)

    // Build context
    const similarQuestions = await searchSimilarQuestions(incident, question, 3)
    const context = await this.buildContext(incident, similarQuestions)

    // Check if this looks like a confirmation to send a question
    const isConfirmation = /^(yes|sure|ok|send|do it|go ahead|yeah)/i.test(question.trim())
    const mentionsStaff = /(to|ask) (sarah|james|emily|martinez|johnson|davis)/i.test(question)

    // Simple agentic prompt that can suggest actions
    const agenticPrompt = PromptTemplate.fromTemplate(`
You are an intelligent healthcare assistant that can answer questions AND proactively suggest sending new questions to staff.

INCIDENT DATA:
{context}

USER QUESTION:
{question}

CRITICAL RULES:
1. If you CAN answer from the data: Give a SHORT answer (2-3 sentences), then ALWAYS ask if they want more details from staff
2. If you CANNOT answer from the data: IMMEDIATELY offer to send the question to staff

WHEN INFO IS MISSING OR INCOMPLETE - Use this EXACT format:
"[Brief answer if any]. However, I don't have complete information about [specific missing detail].

💡 Would you like me to send this question to {staffName} (assigned staff)?
📋 I can ask: '[refined, specific question for staff]'

Reply 'yes' to send, or name a specific staff member (Sarah Johnson, James Martinez, Emily Davis)."

ASSIGNED STAFF: {staffName}
CURRENT USER: {userId}

Guidelines:
- ALWAYS offer to send questions when info is incomplete
- Be proactive - don't just say "info not available"
- Keep base answers SHORT (2-3 sentences)
- Make suggested questions clear and specific
- Be helpful and actionable

Answer:`)

    const response = await agenticPrompt.pipe(this.model).invoke({
      context,
      question,
      staffName: incident.staffName,
      userId,
    })

    let answer = response.content.toString().trim()

    // If user confirmed, try to extract and send
    if (isConfirmation || mentionsStaff) {
      const sendResult = await this.tryToSendQuestion(question, incident, userId, context)
      if (sendResult) {
        answer = sendResult
      }
    }

    console.log("[IntelligenceQA] Agentic answer generated")
    return answer
  }

  /**
   * Helper: Try to send a question based on user's confirmation
   */
  private async tryToSendQuestion(
    userMessage: string,
    incident: Incident,
    userId: string,
    previousContext: string
  ): Promise<string | null> {
    // Extract staff name from message
    const staffNameMatch = userMessage.match(/(sarah|james|emily|martinez|johnson|davis)/i)
    
    if (!staffNameMatch && !/^(yes|sure|ok|send|do it)/i.test(userMessage.trim())) {
      return null // Not a confirmation
    }

    try {
      const { getUsers } = await import("../db")
      const { searchStaffTool, sendQuestionToStaffTool } = await import("./intelligence-tools")
      
      const users = await getUsers()
      const staff = users.filter(u => u.role === "staff")
      
      // Find staff by name or use assigned staff
      let targetStaff = incident.staffId
      let targetStaffName = incident.staffName
      
      if (staffNameMatch) {
        const searchName = staffNameMatch[1]
        const found = staff.find(s => 
          s.name.toLowerCase().includes(searchName.toLowerCase())
        )
        if (found) {
          targetStaff = found.id
          targetStaffName = found.name
        }
      }
      
      // Look for a question in chat history (simplified - would need message history)
      // For now, use a generic follow-up question
      const questionText = `Follow-up question: Please provide additional details about this incident.`
      
      // Send the question
      const { addQuestionToIncident } = await import("../db")
      if (!incident.facilityId) {
        return null
      }
      const created = await addQuestionToIncident(incident.id, incident.facilityId, {
        questionText,
        askedBy: userId,
        assignedTo: [targetStaff],
      })

      if (created) {
        return `✅ Question sent to ${targetStaffName}! They'll be notified and can respond in the Q&A section. You can check back later for their answer.`
      }
      
      return `❌ Failed to send question. Please try again or create it manually in the Q&A tab.`
    } catch (error) {
      console.error("[IntelligenceQA] Error sending question:", error)
      return null
    }
  }

  /**
   * Answer a question about an incident using HYBRID RAG + General Knowledge
   * 
   * Two-stage process:
   * 1. RAG Agent: Retrieves relevant information from incident data
   * 2. Enhancement Agent: Adds helpful context using general knowledge (without contradicting RAG)
   */
  async answerQuestion(incident: Incident, question: string): Promise<string> {
    console.log("[IntelligenceQA] Answering question for incident:", incident.id)

    // STAGE 1: RAG - Retrieve relevant information
    const similarQuestions = await searchSimilarQuestions(incident, question, 3)
    const context = await this.buildContext(incident, similarQuestions)

    // RAG Agent Prompt (Extract key facts)
    const ragPrompt = PromptTemplate.fromTemplate(`
You are a healthcare incident assistant. Answer the question using ONLY the provided incident data.

INCIDENT DATA:
{context}

USER QUESTION:
{question}

Instructions:
- Answer directly and conversationally
- Use 2-3 sentences maximum
- Include relevant staff names and specifics
- If information is missing, say so briefly
- Be professional but natural

Answer:`)

    const ragChain = ragPrompt.pipe(this.model)
    const ragResponse = await ragChain.invoke({ context, question })
    const ragAnswer = ragResponse.content.toString().trim()

    console.log("[IntelligenceQA] RAG answer generated")

    // STAGE 2: Enhancement Agent (Add helpful context)
    const enhancementPrompt = PromptTemplate.fromTemplate(`
You are a helpful healthcare assistant. Make the following answer more useful by adding relevant context.

USER QUESTION:
{question}

FACTUAL ANSWER (from incident data):
{ragAnswer}

Instructions:
- Keep the answer SHORT (3-4 sentences maximum)
- Keep ALL facts from the original answer
- Add helpful context or clarification ONLY if needed
- Be conversational and professional
- If the factual answer is already good, use it as-is
- Never contradict the facts
- Never add speculation

Enhanced Answer:`)

    const enhancementChain = enhancementPrompt.pipe(
      new ChatOpenAI({
        modelName: AI_CONFIG.model,
        temperature: 0.5, // Slightly higher for more helpful responses
        maxTokens: 600,
      })
    )
    
    const enhancedResponse = await enhancementChain.invoke({ 
      question, 
      ragAnswer 
    })

    console.log("[IntelligenceQA] Enhanced answer generated")

    return enhancedResponse.content.toString().trim()
  }

  /**
   * Build context from incident and similar questions WITH FULL METADATA including names
   */
  private async buildContext(
    incident: Incident,
    similarQuestions: Array<{ 
      questionText: string
      answer?: string
      similarity: number
      askedBy: string
      answeredBy?: string
    }>,
  ): Promise<string> {
    // Helper to get user name (with caching for performance)
    const userCache = new Map<string, string>()
    const getUserName = async (userId: string): Promise<string> => {
      if (userCache.has(userId)) {
        return userCache.get(userId)!
      }
      
      const user = await getUserById(userId)
      const name = user ? `${user.name} (${user.role})` : userId
      userCache.set(userId, name)
      return name
    }

    const parts = [
      `Incident: ${incident.title}`,
      `Description: ${incident.description}`,
      `Resident: ${incident.residentName}, Room ${incident.residentRoom}`,
      `Assigned Staff: ${incident.staffName}`,
      `Status: ${incident.status}, Priority: ${incident.priority}`,
      ``,
      `Questions & Answers:`,
    ]

    // Include ALL questions (not just similar ones) for complete context
    const answeredQuestions = incident.questions.filter(q => q.answer)
    const unansweredQuestions = incident.questions.filter(q => !q.answer)

    if (answeredQuestions.length > 0) {
      for (let index = 0; index < answeredQuestions.length; index++) {
        const q = answeredQuestions[index]
        const askedByName = await getUserName(q.askedBy)
        const answeredByName = q.answer ? await getUserName(q.answer.answeredBy) : ""
        
        parts.push(`\nQ: ${q.questionText}`)
        if (q.answer) {
          parts.push(`A: ${q.answer.answerText}`)
          parts.push(`(Asked by ${askedByName}, answered by ${answeredByName})`)
        }
      }
    }

    if (unansweredQuestions.length > 0) {
      parts.push(`\nPending Questions:`)
      for (const q of unansweredQuestions) {
        const askedByName = await getUserName(q.askedBy)
        parts.push(`- ${q.questionText} (asked by ${askedByName}, awaiting response)`)
      }
    }

    return parts.join("\n")
  }
}

/** Cross-incident Q&A (`Incident.staffId` matches WAiK `userId` for personal scope). */
export type FacilityIntelligenceScope = "personal" | "facility"

export type FacilityCitation = {
  incidentId: string
  residentName: string
  incidentDate: string
  snippet: string
  similarityScore: number
}

export type CrossFacilityIntelligenceResult = {
  answer: string
  citations: FacilityCitation[]
  scope: FacilityIntelligenceScope
  timestamp: string
  searchMethod: "atlas_vector" | "in_process_cosine"
}

/**
 * Facility-wide semantic Q&A plus 30‑day rollup stats — single LLM synthesis.
 */
export async function answerCrossFacilityIntelligence(opts: {
  facilityId: string
  queryingUserId: string
  question: string
  scope: FacilityIntelligenceScope
  /** Max retrieved incidents wired into citations + prompt context */
  searchLimit?: number
}): Promise<CrossFacilityIntelligenceResult> {
  const trimmed = opts.question.trim()
  const timestamp = new Date().toISOString()
  const staffOnly = opts.scope === "personal"

  const searchFilters = staffOnly ? { staffId: opts.queryingUserId } : undefined

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const statsOpts = staffOnly ? { staffId: opts.queryingUserId } : undefined

  const statsPromise = queryFacilityIncidentStats(opts.facilityId, thirtyDaysAgo, now, undefined, statsOpts)

  let searchResults: SearchResponse = {
    results: [],
    totalSearched: 0,
    searchMethod: "in_process_cosine",
  }

  if (trimmed && isOpenAIConfigured()) {
    try {
      searchResults = await searchFacilityIncidents(
        opts.facilityId,
        trimmed,
        opts.searchLimit ?? 10,
        searchFilters,
      )
    } catch (e) {
      console.warn("[IntelligenceQA] Facility vector search failed:", e)
    }
  }

  const stats = await statsPromise

  const incidentContext =
    trimmed && searchResults.results.length === 0
      ? ""
      : searchResults.results
          .map((r, i) =>
            [
              `[Incident ${i + 1}] ${r.incidentType} — ${r.residentName} (Room ${r.residentRoom})`,
              `Date: ${r.incidentDate ? r.incidentDate.split("T")[0] : "unknown"} | Location: ${r.location}`,
              `Completeness score: ${r.completenessScore}% | Phase: ${r.phase}`,
              `Clinical snippet: ${r.snippet}`,
            ].join("\n"),
          )
          .join("\n\n")

  const statsLabel =
    opts.scope === "personal"
      ? "YOUR STATS (reports you filed — last 30 days)"
      : "FACILITY STATS (last 30 days)"
  const topResidents = stats.byResident.slice(0, 3)

  const statsContext = [
    `${statsLabel}:`,
    `Total incidents (signed phases): ${stats.total}`,
    `By type: ${Object.entries(stats.byType)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "(none)"}`,
    `By location: ${Object.entries(stats.byLocation)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "(none)"}`,
    `Average completeness score: ${stats.avgCompleteness}%`,
    `Residents with most incidents: ${topResidents.map((x) => `${x.residentName} (${x.count})`).join(", ") || "none"}`,
  ].join("\n")

  if (!trimmed) {
    return {
      answer: "Please enter a question.",
      citations: [],
      scope: opts.scope,
      timestamp,
      searchMethod: searchResults.searchMethod,
    }
  }

  if (!isOpenAIConfigured()) {
    const parts = [
      "OpenAI API is not configured, so semantic search is unavailable.",
      statsContext.replace(/\n/g, " • "),
    ]
    return {
      answer: parts.join(" "),
      citations: [],
      scope: opts.scope,
      timestamp,
      searchMethod: searchResults.searchMethod,
    }
  }

  const systemPrompt = [
    "You are WAiK Intelligence — an institutional memory system for one senior-care facility.",
    "Answer ONLY from the retrieved incident excerpts and aggregate statistics supplied below.",
    "If nothing relevant is present, say so clearly.",
    "Do not invent residents, incidents, or metrics.",
    "Use plain-language, professional wording. When referencing details, cite by resident name and date when available.",
    opts.scope === "personal"
      ? "SCOPE: You may only rely on excerpts from this staff member's own incident reports plus their personal rollup stats."
      : "SCOPE: You may summarize across all incidents in this facility.",
  ].join("\n")

  const userPrompt = [
    `QUESTION: ${trimmed}`,
    "",
    "═══ RELEVANT INCIDENT EXCERPTS (semantic retrieval) ═══",
    incidentContext.trim() ? incidentContext : "No sufficiently similar incident embeddings were retrieved.",
    "",
    "═══ ROLL‑UP STATISTICS ═══",
    statsContext,
    "",
    "Answer concisely.",
  ].join("\n")

  const res = await generateChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      temperature: 0.3,
      maxTokens: 900,
      model: AI_CONFIG.model,
    },
  )
  const answer = res.choices[0]?.message?.content?.trim() ?? ""

  const citations: FacilityCitation[] = searchResults.results.slice(0, 5).map((r) => ({
    incidentId: r.incidentId,
    residentName: r.residentName,
    incidentDate: r.incidentDate,
    snippet: r.snippet.slice(0, 400),
    similarityScore: r.similarityScore,
  }))

  return {
    answer,
    citations,
    scope: opts.scope,
    timestamp,
    searchMethod: searchResults.searchMethod,
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


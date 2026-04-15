import { answerQuestion } from "@/lib/db"
import type { AgentState } from "@/lib/gold_standards"
import type { Answer, Question } from "@/lib/types"

export interface AgentQuestionState {
  id: string
  questionText: string
  askedAt: string
  askedBy: string
  answer?: AgentAnswerState
}

export interface AgentAnswerState {
  id: string
  answerText: string
  answeredBy: string
  answeredAt: string
  method: Answer["method"]
}

export interface InvestigatorAgentContext {
  incidentId: string
  facilityId: string
  agentState: AgentState
  questions: AgentQuestionState[]
}

export interface RecordAnswerInput {
  context: InvestigatorAgentContext
  questionId: string
  answerText: string
  answeredBy: string
  method?: Answer["method"]
}

export interface RecordAnswerResult {
  context: InvestigatorAgentContext
  question: AgentQuestionState
}

function mapQuestionToState(question: Question): AgentQuestionState {
  const answerState = question.answer
    ? {
        id: question.answer.id,
        answerText: question.answer.answerText,
        answeredBy: question.answer.answeredBy,
        answeredAt: question.answer.answeredAt,
        method: question.answer.method,
      }
    : undefined

  return {
    id: question.id,
    questionText: question.questionText,
    askedAt: question.askedAt,
    askedBy: question.askedBy,
    answer: answerState,
  }
}

export async function recordAnswerAndSync({
  context,
  questionId,
  answerText,
  answeredBy,
  method = "text",
}: RecordAnswerInput): Promise<RecordAnswerResult> {
  const answer: Answer = {
    id: `a-${Date.now()}`,
    questionId,
    answerText,
    answeredBy,
    answeredAt: new Date().toISOString(),
    method,
  }

  const updatedQuestion = await answerQuestion(context.incidentId, context.facilityId, questionId, answer)
  if (!updatedQuestion) {
    throw new Error(`Failed to persist answer for question ${questionId}`)
  }

  const mappedQuestion = mapQuestionToState(updatedQuestion)
  const updatedQuestions = context.questions.some((q) => q.id === mappedQuestion.id)
    ? context.questions.map((q) => (q.id === mappedQuestion.id ? mappedQuestion : q))
    : [...context.questions, mappedQuestion]

  return {
    context: {
      ...context,
      questions: updatedQuestions,
    },
    question: mappedQuestion,
  }
}

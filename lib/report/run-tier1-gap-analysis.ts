import {
  analyzeNarrativeAndScore,
  computeCompleteness,
  type AnalyzerNodeResult,
} from "@/lib/agents/expert_investigator/analyze"
import {
  generateGapQuestions,
  type GapQuestionOptions,
  type GapQuestionResult,
} from "@/lib/agents/expert_investigator/gap_questions"
import { normalizeExtractionFromNarrative } from "@/lib/agents/expert_investigator/extraction-normalizer"
import type { AgentState } from "@/lib/gold_standards"

export type Tier1GapAnalysisResult = {
  analysisResult: AnalyzerNodeResult
  gapResult: GapQuestionResult
  preparedState: AgentState
}

/** Tier 1 narrative → analyze → normalize → gap questions (shared by complete + retry). */
export async function runTier1GapAnalysis(
  narrative: string,
  seedState: AgentState,
  gapOptions: GapQuestionOptions,
): Promise<Tier1GapAnalysisResult> {
  const analysisResult = await analyzeNarrativeAndScore(narrative, seedState)
  let preparedState = normalizeExtractionFromNarrative(narrative, analysisResult.state)
  const tracked = computeCompleteness(preparedState)
  preparedState = {
    ...preparedState,
    score: tracked.completenessScore,
    completenessScore: tracked.completenessScore,
    filledFields: tracked.filled,
    missingFields: tracked.missing,
  }
  const gapResult = await generateGapQuestions(preparedState, gapOptions)
  return {
    analysisResult: {
      ...analysisResult,
      state: preparedState,
      completenessScore: tracked.completenessScore,
      filledFields: tracked.filled,
      missingFields: tracked.missing,
    },
    gapResult,
    preparedState,
  }
}

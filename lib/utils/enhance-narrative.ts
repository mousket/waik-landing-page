/**
 * Mock enhanced narrative generator
 * This simulates AI-powered narrative enhancement until the agentic AI is integrated
 *
 * Enhancements:
 * - Removes filler words (um, uh, like, you know)
 * - Adds proper punctuation and capitalization
 * - Structures sentences more professionally
 * - Removes repetition and rambling
 */
export function enhanceNarrative(rawTranscript: string): string {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return ""
  }

  // Remove common filler words
  let enhanced = rawTranscript
    .replace(/\b(um|uh|like|you know|I mean|sort of|kind of)\b/gi, "")
    .replace(/\s+/g, " ") // Remove extra spaces
    .trim()

  // Capitalize first letter
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1)

  // Ensure it ends with proper punctuation
  if (!/[.!?]$/.test(enhanced)) {
    enhanced += "."
  }

  // Add professional structure (mock AI enhancement)
  // In production, this would be replaced with actual AI processing
  enhanced = enhanced
    .replace(/\s+and\s+and\s+/gi, " and ")
    .replace(/\s+the\s+the\s+/gi, " the ")
    .replace(/\.\s+and\s+/gi, ". Additionally, ")
    .replace(/\s+so\s+/gi, " therefore ")

  return enhanced
}

/**
 * Get the best available narrative for display
 * Prefers enhanced narrative, falls back to raw narrative or legacy description
 */
export function getDisplayNarrative(incident: {
  initialReport?: { enhancedNarrative?: string; narrative?: string }
  description?: string
}): string {
  return (
    incident.initialReport?.enhancedNarrative ||
    incident.initialReport?.narrative ||
    incident.description ||
    "No description available"
  )
}

/**
 * Get the raw narrative for reference
 */
export function getRawNarrative(incident: {
  initialReport?: { narrative?: string }
  description?: string
}): string | null {
  return incident.initialReport?.narrative || incident.description || null
}

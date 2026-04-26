/**
 * Trend glyph for dashboard stats: green when “better”, amber when “worse”, neutral when flat.
 * prev === 0 → no arrow (insufficient baseline).
 */

export function trendGlyph(
  current: number,
  prev: number,
  higherIsBetter: boolean,
): { symbol: "↑" | "↓" | "→"; tone: "good" | "bad" | "neutral" } | null {
  if (prev === 0) return null
  if (current === prev) return { symbol: "→", tone: "neutral" }
  const improved = higherIsBetter ? current > prev : current < prev
  const symbol: "↑" | "↓" = current > prev ? "↑" : "↓"
  return { symbol, tone: improved ? "good" : "bad" }
}

export function getEmailAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://waik-demo.vercel.app"
  ).replace(/\/$/, "")
}

/** Matches lib/design-tokens + app shell (teal, muted surfaces) */
export const emailBrand = {
  /** primary teal */
  primary: "#0D7377",
  primaryDeep: "#0A5A5D",
  foreground: "#0f172a",
  muted: "#64748b",
  border: "rgba(15, 23, 42, 0.08)",
  borderStrong: "rgba(13, 115, 119, 0.22)",
  /** subtle card gradient, TabsList-adjacent */
  shellGradient: "linear-gradient(180deg, #f3f4f6 0%, #fafbfc 100%)",
  /** credential panel */
  panelGradient: "linear-gradient(180deg, rgba(13, 115, 119, 0.07) 0%, rgba(13, 115, 119, 0.02) 100%)",
  noteBg: "#fffbeb",
  noteBorder: "rgba(245, 158, 11, 0.35)",
} as const

export const emailFont =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

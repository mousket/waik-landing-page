import fs from "fs"
import path from "path"

/** Public path for the WAiK wordmark (same asset as marketing header). */
export const WAIK_LOGO_PATH = "/waik-logo.png"

/**
 * Absolute HTTPS URL for the logo — used when a remote Image `src` is required.
 */
export function getWaikLogoAbsoluteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, "")}${WAIK_LOGO_PATH}`
  }
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}${WAIK_LOGO_PATH}`
  }
  return `http://localhost:3000${WAIK_LOGO_PATH}`
}

let cachedPdfDataUrl: string | null = null

/**
 * Embedded PNG for `@react-pdf/renderer` — avoids fetch/CORS issues in serverless PDF generation.
 */
export function getWaikLogoDataUrlForPdf(): string {
  if (cachedPdfDataUrl) return cachedPdfDataUrl
  const filePath = path.join(process.cwd(), "public", "waik-logo.png")
  const buf = fs.readFileSync(filePath)
  cachedPdfDataUrl = `data:image/png;base64,${buf.toString("base64")}`
  return cachedPdfDataUrl
}

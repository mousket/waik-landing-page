import { escapeHtml } from "../utils"

const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i
const decodeEntities = (html: string) =>
  html
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")

const LABEL_PATTERNS = [
  { regex: /^observations:?$/i, label: "Observations" },
  { regex: /^next steps:?$/i, label: "Next Steps" },
  { regex: /^recommendations:?$/i, label: "Recommendations" },
  { regex: /^actions:?$/i, label: "Actions" },
]

const applyInlineFormatting = (html: string) =>
  html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")

const applyCustomHeadings = (html: string) =>
  html
    .replace(/<p>\s*####\s*(.+?)\s*####\s*<\/p>/gi, "<h4>$1</h4>")
    .replace(/<p>\s*###\s*(.+?)\s*###\s*<\/p>/gi, "<h3>$1</h3>")
    .replace(/<p>\s*##\s*(.+?)\s*##\s*<\/p>/gi, "<h2>$1</h2>")
    .replace(/<p>\s*#\s*(.+?)\s*#\s*<\/p>/gi, "<h1>$1</h1>")
    .replace(/####\s*([^#<][^#]*?)\s*####/g, "<h4>$1</h4>")
    .replace(/###\s*([^#<][^#]*?)\s*###/g, "<h3>$1</h3>")
    .replace(/##\s*([^#<][^#]*?)\s*##/g, "<h2>$1</h2>")
    .replace(/#\s*([^#<][^#]*?)\s*#/g, "<h1>$1</h1>")

const tidyStructure = (html: string) =>
  html
    .replace(/<p>\s*<ul>/g, "<ul>")
    .replace(/<\/ul>\s*<\/p>/g, "</ul>")
    .replace(/<p>\s*<ol>/g, "<ol>")
    .replace(/<\/ol>\s*<\/p>/g, "</ol>")
    .replace(/<p>\s*<li>/g, "<li>")
    .replace(/<\/li>\s*<\/p>/g, "</li>")

const applyListLabels = (html: string) =>
  html.replace(/(<p>\s*([A-Z][^:<]{0,80})\s*:?)\s*<\/p>\s*(<ul>[\s\S]*?<\/ul>)/gi, (match, paragraph, labelText, listHtml) => {
    const normalized = labelText.trim()
    const labelEntry = LABEL_PATTERNS.find(({ regex }) => regex.test(normalized))
    if (labelEntry) {
      return `<p><strong>${labelEntry.label}:</strong></p>${listHtml}`
    }
    return match
  })

const postProcessHtml = (html: string) => applyListLabels(tidyStructure(applyCustomHeadings(applyInlineFormatting(html))))

/**
 * Converts markdown-style formatting to HTML
 * Supports: headers (#, ##, ###, ####), custom wrapped headers (##text##), bold (**text**), italic (*text*), lists, line breaks
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""

  const normalized = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/^(#{1,4})\s*(.+?)\s*\1$/gm, (_, hashes, content) => `${hashes} ${content}`)

  const lines = normalized.split("\n")

  const htmlParts: string[] = []
  let listBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length > 0) {
      htmlParts.push(`<ul>${listBuffer.join("")}</ul>`)
      listBuffer = []
    }
  }

  const formatInline = (value: string) => {
    const escaped = escapeHtml(value)
    const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    const withItalics = withBold.replace(/\*(.+?)\*/g, "<em>$1</em>")
    return withItalics
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushList()
      continue
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/)
    if (listMatch) {
      const content = formatInline(listMatch[1])
      listBuffer.push(`<li>${content}</li>`)
      continue
    }

    flushList()

    const headingMatch = line.match(/^(#{1,4})\s*(.+?)(?:\s*#{1,4})?$/)
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 4)
      const content = formatInline(headingMatch[2])
      htmlParts.push(`<h${level}>${content}</h${level}>`)
      continue
    }

    htmlParts.push(`<p>${formatInline(line)}</p>`)
  }

  flushList()

  return htmlParts.join("")
}

export function renderMarkdownOrHtml(value?: string | null): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (HTML_TAG_PATTERN.test(trimmed)) {
    return decodeEntities(postProcessHtml(trimmed))
  }

  const html = markdownToHtml(trimmed)
  const processed = decodeEntities(postProcessHtml(html))
  const cleaned = processed.trim()
  return cleaned.length > 0 ? cleaned : null
}
  
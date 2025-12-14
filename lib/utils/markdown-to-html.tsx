/**
 * Converts markdown-style formatting to HTML
 * Supports: headers (#, ##, ###, ####), bold (**text**), italic (*text*), lists, line breaks
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""

  let html = markdown
    // Decode HTML entities first
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")

  // Convert headers (must be at start of line)
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>")
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>")
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>")

  // Convert bold text
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

  // Convert italic text (single asterisk, not already part of bold)
  html = html.replace(/\*([^*]+?)\*/g, "<em>$1</em>")

  // Convert bullet lists
  const lines = html.split("\n")
  const processedLines: string[] = []
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith("- ")) {
      if (!inList) {
        processedLines.push("<ul>")
        inList = true
      }
      processedLines.push(`<li>${line.substring(2)}</li>`)
    } else {
      if (inList) {
        processedLines.push("</ul>")
        inList = false
      }
      if (line) {
        // Wrap non-empty lines that aren't headers or lists in paragraphs
        if (!line.startsWith("<h") && !line.startsWith("<ul") && !line.startsWith("<li")) {
          processedLines.push(`<p>${line}</p>`)
        } else {
          processedLines.push(line)
        }
      }
    }
  }

  if (inList) {
    processedLines.push("</ul>")
  }

  return processedLines.join("")
}

export { markdownToHtml as markdownTohtml }

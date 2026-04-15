/** Minimal RFC4180-style CSV parse for staff import (quoted fields supported). */
export function parseStaffCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i]!
    if (c === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        cur += '"'
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && c === "\n") {
      lines.push(cur)
      cur = ""
      continue
    }
    cur += c
  }
  if (cur.length || lines.length === 0) lines.push(cur)

  const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0)
  if (nonEmpty.length < 2) return { headers: [], rows: [] }

  function parseLine(line: string): string[] {
    const out: string[] = []
    let field = ""
    let q = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          field += '"'
          i++
          continue
        }
        q = !q
        continue
      }
      if (!q && c === ",") {
        out.push(field.trim())
        field = ""
        continue
      }
      field += c
    }
    out.push(field.trim())
    return out
  }

  const headers = parseLine(nonEmpty[0]!).map((h) =>
    h.toLowerCase().replace(/^\ufeff/, "").trim(),
  )
  const rows: Record<string, string>[] = []
  for (let i = 1; i < nonEmpty.length; i++) {
    const vals = parseLine(nonEmpty[i]!)
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      row[h] = vals[j] ?? ""
    })
    rows.push(row)
  }
  return { headers, rows }
}

export const STAFF_CSV_TEMPLATE_HEADERS = "first_name,last_name,email,role_slug"

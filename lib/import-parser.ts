/**
 * Shared CSV / Excel parsing for facility bulk import (staff + residents).
 * Normalizes header keys to lowercase snake_case and trims string values.
 */

export type ParsedImportTable = {
  headers: string[]
  rows: Record<string, string>[]
}

function normalizeHeaderKey(key: string): string {
  return key
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
}

function normalizeRow(raw: Record<string, unknown>): Record<string, string> {
  const row: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = normalizeHeaderKey(String(k))
    if (!key) continue
    if (v == null) {
      row[key] = ""
    } else {
      row[key] = String(v).trim()
    }
  }
  return row
}

/** RFC4180-style CSV parse (quoted fields supported). */
export function parseCsvText(text: string): ParsedImportTable {
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
  if (nonEmpty.length < 1) return { headers: [], rows: [] }

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

  const headers = parseLine(nonEmpty[0]!).map((h) => normalizeHeaderKey(h))
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

export async function parseImportFile(file: Blob, fileName: string): Promise<ParsedImportTable> {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer()
    const XLSX = await import("xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return { headers: [], rows: [] }
    const sheet = wb.Sheets[sheetName]
    if (!sheet) return { headers: [], rows: [] }
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
    const rows = json.map(normalizeRow)
    const headers = rows.length > 0 ? Object.keys(rows[0]!) : []
    return { headers, rows }
  }

  const text = await file.text()
  return parseCsvText(text)
}

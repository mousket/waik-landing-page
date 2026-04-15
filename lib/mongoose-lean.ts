/** Normalizes Mongoose `.lean()` results for strict TypeScript (avoids spurious array unions). */
export function leanOne<T>(doc: unknown): T | null {
  if (doc == null || Array.isArray(doc)) return null
  return doc as T
}

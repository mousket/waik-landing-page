import { redirect } from "next/navigation"

/**
 * @deprecated Use `/residents/[id]` (unified staff + admin profile). Query preserved for facility scope.
 */
export default async function AdminResidentProfileRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      v.forEach((x) => u.append(k, x))
    } else {
      u.set(k, v)
    }
  }
  const q = u.toString()
  redirect(q ? `/residents/${encodeURIComponent(id)}?${q}` : `/residents/${encodeURIComponent(id)}`)
}

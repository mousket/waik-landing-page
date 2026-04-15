import Link from "next/link"
import { brand } from "@/lib/design-tokens"

export type BreadcrumbItem = { label: string; href?: string }

/**
 * Muted trail for nested admin / super-admin pages (below top bar).
 */
export function AdminBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm" style={{ color: brand.muted }}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <Link href={item.href} className="hover:underline" style={{ color: brand.muted }}>
                {item.label}
              </Link>
            ) : (
              <span className="font-medium" style={{ color: brand.body }}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

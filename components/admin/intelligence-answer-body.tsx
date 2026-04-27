"use client"

import { Fragment, useMemo } from "react"
import Link from "next/link"
import { buildAdminPathWithContext } from "@/lib/admin-nav-context"

const INCID = /\b(inc-[\w-]+)\b/gi

type Props = {
  text: string
  searchParams: URLSearchParams
}

/**
 * Renders a plain-text community intelligence answer; turns `inc-…` incident ids into
 * in-app links that preserve `facilityId` / `organizationId` from the current admin bar.
 */
export function IntelligenceAnswerBody({ text, searchParams }: Props) {
  const nodes = useMemo(() => {
    const out: Array<{ type: "t"; v: string } | { type: "l"; id: string; href: string }> = []
    let m: RegExpExecArray | null
    const re = new RegExp(INCID)
    let last = 0
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) {
        out.push({ type: "t", v: text.slice(last, m.index) })
      }
      const id = m[1]
      const href = buildAdminPathWithContext(`/admin/incidents/${id}`, searchParams)
      out.push({ type: "l", id, href })
      last = m.index + m[0].length
    }
    if (last < text.length) {
      out.push({ type: "t", v: text.slice(last) })
    }
    if (out.length === 0) {
      return [{ type: "t" as const, v: text }]
    }
    return out
  }, [text, searchParams])

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <p className="m-0 whitespace-pre-wrap break-words text-foreground/90">
        {nodes.map((n, i) => {
          if (n.type === "t") {
            return <Fragment key={i}>{n.v}</Fragment>
          }
          return (
            <Link
              key={i}
              href={n.href}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {n.id}
            </Link>
          )
        })}
      </p>
    </div>
  )
}

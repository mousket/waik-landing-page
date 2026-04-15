"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
import { brand } from "@/lib/design-tokens"

export function StaffDashboardPerformance() {
  const [open, setOpen] = useState(false)

  return (
    <section className="px-4 pb-8">
      <div className="rounded-xl bg-white p-4 shadow-sm" style={{ color: brand.body }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative w-full text-left"
          aria-expanded={open}
        >
          <div className="flex flex-col items-center pr-8">
            <p className="text-5xl font-bold" style={{ color: brand.teal }}>
              82%
            </p>
            <p className="mt-1 text-center text-sm" style={{ color: brand.muted }}>
              Your average completeness (30 days)
            </p>
          </div>
          <span className="absolute bottom-0 right-0 flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center text-brand-muted">
            {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </button>

        {open ? (
          <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: `${brand.midGray}99` }}>
            <p className="text-center text-sm text-brand-body">
              This month: 82% | Last month: 76%{" "}
              <span className="font-medium text-emerald-600" aria-hidden>
                ↑
              </span>
            </p>
            <div
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ backgroundColor: brand.warnBg, color: brand.darkTeal }}
            >
              🔥 4-report streak — above 85%
            </div>
            <div className="text-center">
              <Link href="/staff/intelligence" className="text-sm font-semibold" style={{ color: brand.teal }}>
                View full analysis →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

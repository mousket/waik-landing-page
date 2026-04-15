import { brand } from "@/lib/design-tokens"
import { Input } from "@/components/ui/input"

export default function AdminIntelligencePlaceholderPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-2xl border border-brand-mid-gray bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-brand-dark-teal">WAiK Intelligence</h1>
        <p className="mt-3 text-sm" style={{ color: brand.muted }}>
          Ask anything about your community.
        </p>
        <Input
          readOnly
          className="mt-8 min-h-[52px] text-base"
          placeholder="Search your community data…"
          aria-readonly
        />
      </div>
    </div>
  )
}

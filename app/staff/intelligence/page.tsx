import { brand } from "@/lib/design-tokens"
import { Input } from "@/components/ui/input"

export default function StaffIntelligencePlaceholderPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-brand-dark-teal">WAiK Intelligence</h1>
        <p className="mt-3 text-sm" style={{ color: brand.muted }}>
          Ask anything about your reports...
        </p>
        <Input
          type="search"
          placeholder="Search reports…"
          className="mt-6 min-h-[48px]"
          readOnly
          aria-readonly
        />
      </div>
    </div>
  )
}

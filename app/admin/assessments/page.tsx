import { brand } from "@/lib/design-tokens"

export default function AdminAssessmentsPlaceholderPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-2xl border border-brand-mid-gray bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-brand-dark-teal">Assessments</h1>
        <p className="mt-3 text-sm" style={{ color: brand.muted }}>
          All assessments across your community.
        </p>
      </div>
    </div>
  )
}

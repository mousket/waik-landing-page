import Link from "next/link"
import { Button } from "@/components/ui/button"
import { brand } from "@/lib/design-tokens"

export default function StaffIncidentsPlaceholderPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-brand-dark-teal">My Incidents</h1>
        <p className="mt-3 text-sm" style={{ color: brand.muted }}>
          Your incident reports will appear here.
        </p>
        <Button
          asChild
          className="mt-6 min-h-[48px] w-full font-semibold text-white"
          style={{ backgroundColor: brand.teal }}
        >
          <Link href="/staff/report">New Report</Link>
        </Button>
      </div>
    </div>
  )
}

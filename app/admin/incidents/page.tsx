import { brand } from "@/lib/design-tokens"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function RingPct({ pct }: { pct: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold"
      style={{ borderColor: brand.teal, color: brand.teal }}
    >
      {pct}
    </div>
  )
}

export default function AdminIncidentsPlaceholderPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-brand-dark-teal">All Incidents</h1>
        <p className="mt-2 text-sm text-brand-muted">The complete incident pipeline for your community.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-mid-gray bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-mid-gray bg-brand-light-bg/50">
              <th className="p-3 font-semibold">Room</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Phase</th>
              <th className="p-3 font-semibold">Completeness</th>
              <th className="p-3 font-semibold">48hr Clock</th>
              <th className="p-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brand-mid-gray/80">
              <td className="p-3">204</td>
              <td className="p-3">Fall</td>
              <td className="p-3">
                <Badge className="bg-sky-600 text-white">Phase 2</Badge>
              </td>
              <td className="p-3">
                <RingPct pct="82%" />
              </td>
              <td className="p-3 text-sm font-medium text-[#E8A838]">28h remaining</td>
              <td className="p-3">
                <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                  View
                </Button>
              </td>
            </tr>
            <tr className="border-b border-brand-mid-gray/80">
              <td className="p-3">306</td>
              <td className="p-3">Medication</td>
              <td className="p-3">
                <Badge className="bg-sky-600 text-white">Phase 2</Badge>
              </td>
              <td className="p-3">
                <RingPct pct="76%" />
              </td>
              <td className="p-3 text-sm font-bold text-[#C0392B]">5h remaining</td>
              <td className="p-3">
                <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                  View
                </Button>
              </td>
            </tr>
            <tr className="border-b border-brand-mid-gray/80">
              <td className="p-3">411</td>
              <td className="p-3">Conflict</td>
              <td className="p-3">
                <Badge className="bg-amber-400 text-brand-dark-teal">Phase 1 Complete</Badge>
              </td>
              <td className="p-3">
                <RingPct pct="91%" />
              </td>
              <td className="p-3 text-sm text-brand-muted">44h remaining</td>
              <td className="p-3">
                <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                  View
                </Button>
              </td>
            </tr>
            <tr>
              <td className="p-3">102</td>
              <td className="p-3">Fall</td>
              <td className="p-3">
                <Badge className="bg-amber-500/90 text-white">Phase 1 In Progress</Badge>
              </td>
              <td className="p-3">
                <RingPct pct="45%" />
              </td>
              <td className="p-3 text-sm text-brand-muted">47h remaining</td>
              <td className="p-3">
                <Button size="sm" variant="outline" className="min-h-[40px] border-brand-teal text-brand-teal">
                  View
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

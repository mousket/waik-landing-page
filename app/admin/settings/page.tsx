import Link from "next/link"
import { brand } from "@/lib/design-tokens"
import { Users } from "lucide-react"

export default function AdminSettingsIndexPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand-dark-teal">Settings</h1>
      <p className="mt-2 text-sm text-brand-muted">Manage your facility and team.</p>

      <ul className="mt-8 space-y-3">
        <li>
          <Link
            href="/admin/settings/staff"
            className="flex min-h-[56px] items-center gap-3 rounded-xl border border-brand-mid-gray bg-white p-4 shadow-sm transition-colors hover:bg-brand-light-bg/60"
          >
            <Users className="h-6 w-6 shrink-0 text-brand-teal" />
            <div>
              <p className="font-semibold text-brand-body">Staff</p>
              <p className="text-xs text-brand-muted">Invite and manage staff accounts</p>
            </div>
          </Link>
        </li>
      </ul>
    </div>
  )
}

import Link from "next/link"
import { WifiOff } from "lucide-react"

import { OfflineQueueList } from "@/components/offline-queue-list"
import { brand } from "@/lib/design-tokens"

export const metadata = {
  title: "Offline | WAiK",
  description: "You are offline. Saved reports will sync when you reconnect.",
}

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #0A3D40 0%, #063032 100%)" }}
    >
      <div className="max-w-md text-center text-white">
        <WifiOff className="mx-auto mb-4 h-14 w-14 opacity-90" aria-hidden />
        <h1 className="mb-3 text-2xl font-semibold">You&apos;re offline</h1>
        <p className="mb-2 text-balance text-white/90">
          Any reports you started have been saved on this device and will sync when you reconnect.
        </p>
        <p className="mb-8 text-sm text-white/70">Check your network, then return to the dashboard.</p>
        <OfflineQueueList />
        <Link
          href="/staff/dashboard"
          className="mt-8 inline-block rounded-xl bg-[#0D7377] px-6 py-3 text-sm font-medium text-white no-underline shadow-sm hover:bg-[#0a5c5f]"
          style={{ color: "white" }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

import Link from "next/link"
import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OfflineQueueList } from "@/components/offline-queue-list"

export const metadata = {
  title: "Offline | WAiK",
  description: "You are offline. Saved reports will sync when you reconnect.",
}

export default function OfflinePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5"
        aria-hidden
      />
      <div className="w-full max-w-md text-center">
        <WifiOff className="mx-auto mb-4 h-14 w-14 text-muted-foreground" aria-hidden />
        <h1 className="mb-3 text-2xl font-semibold text-foreground">You&apos;re offline</h1>
        <p className="mb-2 text-balance text-foreground/90">
          Any reports you started have been saved on this device and will sync when you reconnect.
        </p>
        <p className="mb-8 text-sm text-muted-foreground">
          Check your network, then return to the dashboard.
        </p>
        <OfflineQueueList />
        <Button
          asChild
          className="mt-8 min-h-12 px-6 text-base font-semibold shadow-sm"
          size="lg"
        >
          <Link href="/staff/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

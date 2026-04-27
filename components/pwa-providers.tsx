"use client"

import { useEffect } from "react"
import { Toaster } from "sonner"

import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { initOfflineQueueListeners } from "@/lib/offline-queue"

export function PwaProviders() {
  useEffect(() => {
    initOfflineQueueListeners()
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    if (!("serviceWorker" in navigator)) return

    // If a service worker was previously registered (e.g. after a prod build),
    // it can keep controlling localhost and serve stale precache entries.
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      } catch {
        // best effort
      }

      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch {
        // best effort
      }
    })()
  }, [])

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <PwaInstallPrompt />
    </>
  )
}

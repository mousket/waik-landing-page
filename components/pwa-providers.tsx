"use client"

import { useEffect } from "react"
import { Toaster } from "sonner"

import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { initOfflineQueueListeners } from "@/lib/offline-queue"

export function PwaProviders() {
  useEffect(() => {
    initOfflineQueueListeners()
  }, [])

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <PwaInstallPrompt />
    </>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RedirectLoading } from "@/components/ui/redirect-loading"

/**
 * Navigates in an effect so we never call `redirect()` from the server page.
 * Server `redirect()` throws a special value that can interrupt the client tree mid-render
 * during Clerk sign-in, producing "Rendered more hooks than during the previous render"
 * in dev with the App Router.
 */
export function PostAuthRedirectClient({ to }: { to: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(to)
  }, [router, to])
  return <RedirectLoading />
}

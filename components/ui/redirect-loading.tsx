import { WaikLogo } from "@/components/waik-logo"
import { AuthBackground } from "@/components/ui/auth-background"

/**
 * Full-screen WAiK-branded loading shell for post-auth redirects and transitions.
 */
export function RedirectLoading({ message = "Loading your dashboard..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-background">
      <AuthBackground />
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 overflow-hidden bg-[#0D7377]/20"
        aria-hidden
      >
        <div className="waik-redirect-indeterminate h-full w-1/3 rounded-full bg-[#0D7377]" />
      </div>
      <div className="relative z-10 text-center">
        <div className="flex justify-center">
          <WaikLogo size="xl" />
        </div>
        <p className="mt-3 text-sm text-[#0D7377]/85">{message}</p>
        <div className="mt-8 flex justify-center gap-1.5" aria-hidden>
          <span className="waik-redirect-dot h-2 w-2 rounded-full bg-[#0D7377]" />
          <span className="waik-redirect-dot waik-redirect-dot-delay-1 h-2 w-2 rounded-full bg-[#0D7377]" />
          <span className="waik-redirect-dot waik-redirect-dot-delay-2 h-2 w-2 rounded-full bg-[#0D7377]" />
        </div>
      </div>
    </div>
  )
}

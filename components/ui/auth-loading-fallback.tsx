"use client"

import { AuthPageFrame } from "@/components/ui/auth-background"

export function AuthLoadingFallback({ message }: { message: string }) {
  return (
    <AuthPageFrame>
      <p className="text-sm text-muted-foreground">{message}</p>
    </AuthPageFrame>
  )
}

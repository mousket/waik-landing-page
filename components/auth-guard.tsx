"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWaikUser } from "@/hooks/use-waik-user"
import type { UserRole } from "@/lib/types"

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()
  const { isLoaded, isSignedIn, role } = useWaikUser()

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !role) {
      router.replace("/sign-in")
      return
    }

    if (!allowedRoles.includes(role)) {
      router.replace("/sign-in")
    }
  }, [isLoaded, isSignedIn, role, allowedRoles, router])

  if (!isLoaded || !isSignedIn || !role || !allowedRoles.includes(role)) {
    return null
  }

  return <>{children}</>
}

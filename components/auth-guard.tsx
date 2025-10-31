"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import type { UserRole } from "@/lib/types"

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/waik-demo-start/login")
      return
    }

    if (role && !allowedRoles.includes(role)) {
      router.push("/waik-demo-start/login")
    }
  }, [isAuthenticated, role, allowedRoles, router])

  if (!isAuthenticated || (role && !allowedRoles.includes(role))) {
    return null
  }

  return <>{children}</>
}

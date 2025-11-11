"use client"

import type React from "react"
import { useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut, LayoutDashboard, Plus, Menu, X } from "lucide-react"
import Image from "next/image"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { name, logout } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/waik-demo-start/login")
  }

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-lg border-b border-border/50 z-50 lg:hidden">
          <div className="flex items-center justify-between h-full px-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center">
              <Image src="/waik-logo.png" alt="WAiK" width={80} height={32} className="h-8 w-auto" />
            </div>
            <div className="w-10" /> {/* Spacer for balance */}
          </div>
        </div>

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed left-0 top-0 h-full w-72 border-r bg-gradient-to-b from-sidebar to-sidebar/95 shadow-2xl z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-border/50 p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="flex items-center gap-3 mb-3">
                <Image src="/waik-logo.png" alt="WAiK" width={100} height={40} className="h-10 w-auto" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-sidebar-foreground">Admin Portal</h2>
                <p className="text-sm text-sidebar-foreground/70">{name}</p>
              </div>
            </div>

            <nav className="flex-1 space-y-2 p-4">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => {
                  router.push("/admin/dashboard")
                  setIsMobileMenuOpen(false)
                }}
              >
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Dashboard
              </Button>
              <Button
                className="w-full justify-start bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  router.push("/incidents/create")
                  setIsMobileMenuOpen(false)
                }}
              >
                <Plus className="mr-3 h-5 w-5" />
                New Incident
              </Button>
            </nav>

            <div className="border-t border-border/50 p-4 bg-gradient-to-br from-accent/5 to-primary/5">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <main className="lg:ml-72 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">{children}</main>
      </div>
    </AuthGuard>
  )
}

"use client"

import type React from "react"
import { useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { AuthGuard } from "@/components/auth-guard"
import { useWaikUser } from "@/hooks/use-waik-user"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut, Home, LayoutDashboard, Menu, X, ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function IncidentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { signOut } = useClerk()
  const { name, role } = useWaikUser()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    void signOut({ redirectUrl: "/sign-in" })
  }

  const handleBackToDashboard = () => {
    if (role === "admin") {
      router.push("/admin/dashboard")
    } else {
      router.push("/staff/dashboard")
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "staff"]}>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
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
            <div className="w-10" />
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 h-full w-72 border-r bg-gradient-to-b from-sidebar to-sidebar/95 shadow-2xl z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-border/50 p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="flex items-center gap-3 mb-3">
                <Image src="/waik-logo.png" alt="WAiK" width={100} height={40} className="h-10 w-auto" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-sidebar-foreground">
                  {role === "admin" ? "Admin Portal" : "Staff Portal"}
                </h2>
                <p className="text-sm text-sidebar-foreground/70">{name}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 p-4">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => {
                  handleBackToDashboard()
                  setIsMobileMenuOpen(false)
                }}
              >
                {role === "admin" ? (
                  <>
                    <LayoutDashboard className="mr-3 h-5 w-5" />
                    Dashboard
                  </>
                ) : (
                  <>
                    <Home className="mr-3 h-5 w-5" />
                    Dashboard
                  </>
                )}
              </Button>
            </nav>

            {/* Logout */}
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

        {/* Desktop Back Button */}
        <div className="fixed top-4 left-80 z-50 hidden lg:block">
          <Button variant="outline" size="sm" className="bg-background shadow-lg" onClick={handleBackToDashboard}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Main Content */}
        <main className="lg:ml-72 pt-20 lg:pt-8">{children}</main>
      </div>
    </AuthGuard>
  )
}

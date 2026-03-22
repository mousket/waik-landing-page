"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { LogOut, Home, Menu, X, Bell, Plus, MessageSquare, Volume2, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { name, userId, logout } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [notifications, setNotifications] = useState<
    Array<{ incidentId: string; incidentTitle: string; questionCount: number }>
  >([])

  useEffect(() => {
    if (userId) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

  const fetchNotifications = async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/staff/notifications?staffId=${userId}`)
      if (!response.ok) throw new Error("Failed to fetch notifications")
      const data = await response.json()
      setNotificationCount(data.unansweredCount)
      setNotifications(data.notifications)
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/waik-demo-start/login")
  }

  return (
    <AuthGuard allowedRoles={["staff"]}>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No pending questions</div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.incidentId}
                      className="cursor-pointer"
                      onClick={() => {
                        router.push(`/staff/incidents/${notification.incidentId}`)
                      }}
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <p className="font-medium text-sm">{notification.incidentTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {notification.questionCount} unanswered question{notification.questionCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
            <div className="border-b border-border/50 p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="flex items-center gap-3 mb-3">
                <Image src="/waik-logo.png" alt="WAiK" width={100} height={40} className="h-10 w-auto" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-sidebar-foreground">Staff Portal</h2>
                <p className="text-sm text-sidebar-foreground/70">{name}</p>
              </div>
            </div>

            <nav className="flex-1 space-y-2 p-4">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => {
                  router.push("/staff/dashboard")
                  setIsMobileMenuOpen(false)
                }}
              >
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </Button>
              <Button
                className="w-full justify-start bg-gradient-to-r from-primary via-primary to-accent hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  router.push("/incidents/create")
                  setIsMobileMenuOpen(false)
                }}
              >
                <Plus className="mr-3 h-5 w-5" />
                New Incident
              </Button>
              <Button
                className="w-full justify-start bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  router.push("/incidents/conversational/create")
                  setIsMobileMenuOpen(false)
                }}
              >
                <MessageSquare className="mr-3 h-5 w-5" />
                Conversational Reporting
              </Button>
              <Button
                className="w-full justify-start bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  router.push("/incidents/companion/create")
                  setIsMobileMenuOpen(false)
                }}
              >
                <Volume2 className="mr-3 h-5 w-5" />
                AI Companion
              </Button>
              <Button
                className="w-full justify-start bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  router.push("/incidents/beta/create")
                  setIsMobileMenuOpen(false)
                }}
              >
                <Sparkles className="mr-3 h-5 w-5" />
                New Incident (Beta)
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

        <div className="fixed top-4 right-4 z-50 hidden lg:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative bg-background shadow-lg">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No pending questions</div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.incidentId}
                    className="cursor-pointer"
                    onClick={() => {
                      router.push(`/staff/incidents/${notification.incidentId}`)
                    }}
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <p className="font-medium text-sm">{notification.incidentTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {notification.questionCount} unanswered question{notification.questionCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <main className="lg:ml-72 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">{children}</main>
      </div>
    </AuthGuard>
  )
}

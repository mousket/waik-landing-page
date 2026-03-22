"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { LoginWaveAnimation } from "@/components/login-wave-animation"

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Format username: remove all whitespace
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "") // Remove all whitespace
    setUsername(value)
    setErrorMessage(null) // Clear error when user types
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setErrorMessage(null) // Clear error when user types
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    // Trim username one more time before submission (in case of paste)
    const trimmedUsername = username.trim().replace(/\s/g, "")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Set specific error messages based on status code
        if (response.status === 401) {
          setErrorMessage("Invalid username or password. Please check your credentials and try again.")
        } else if (response.status === 400) {
          setErrorMessage(data.error || "Please enter both username and password.")
        } else {
          setErrorMessage(data.error || "Login failed. Please try again.")
        }
        toast.error(data.error || "Login failed")
        setIsLoading(false)
        return
      }

      login(data.userId, data.username, data.role, data.name)
      toast.success(`Welcome back, ${data.name}!`)

      if (data.role === "staff") {
        router.push("/staff/dashboard")
      } else if (data.role === "admin") {
        router.push("/admin/dashboard")
      }
    } catch (error) {
      console.error("[v0] Login error:", error)
      setErrorMessage("Unable to connect to the server. Please check your connection and try again.")
      toast.error("An error occurred during login")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4">
      {/* Animated wave background */}
      <div className="absolute inset-0 z-0">
        <LoginWaveAnimation />
      </div>

      {/* Subtle grid pattern overlay for tech feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] z-[1]" />

      {/* Login card - clean, no frosted glass */}
      <Card className="w-full max-w-md relative z-10 bg-white border-border shadow-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">WAiK Demo Login</CardTitle>
          <CardDescription className="text-center">Enter your credentials to access the demo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message Display */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="waik-demo-staff"
                value={username}
                onChange={handleUsernameChange}
                required
                disabled={isLoading}
                className={errorMessage ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
              />
              <p className="text-xs text-muted-foreground">Whitespace is automatically removed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                required
                disabled={isLoading}
                className={errorMessage ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-muted rounded-lg space-y-2 text-sm">
            <p className="font-semibold">Demo Credentials:</p>
            <div className="space-y-1">
              <p className="text-muted-foreground">
                <span className="font-medium">Staff:</span> waik-demo-staff / waik1+demo-staff!@#
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium">Admin:</span> waik-demo-admin / waik1+demo-admin!@#
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

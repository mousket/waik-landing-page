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
import { Loader2 } from "lucide-react"
import { LoginWaveAnimation } from "@/components/login-wave-animation"
import { apiUrl } from "@/lib/api-config"

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("[v0] Attempting login to:", apiUrl("/api/auth/login"))

      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        mode: "cors",
        credentials: "include",
      })

      console.log("[v0] Response received, status:", response.status)
      console.log("[v0] Response content-type:", response.headers.get("content-type"))

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("[v0] Non-JSON response received:", textResponse.substring(0, 200))
        toast.error("Server returned an unexpected response format")
        setIsLoading(false)
        return
      }

      const data = await response.json()
      console.log("[v0] Parsed JSON data:", data)

      if (!response.ok) {
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
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error(
          "Unable to connect to server. This may be a CORS issue - the API needs to allow requests from this domain.",
        )
        console.error("[v0] CORS or network error. The server at waik-demo-vercel.app may need to add CORS headers.")
      } else {
        toast.error(`Login error: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
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
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="waik-demo-staff"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
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

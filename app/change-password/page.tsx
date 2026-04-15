"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useWaikUser } from "@/hooks/use-waik-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RedirectLoading } from "@/components/ui/redirect-loading"

function strengthScore(password: string): number {
  let s = 0
  if (password.length >= 8) s += 25
  if (password.length >= 12) s += 15
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s += 25
  if (/\d/.test(password)) s += 20
  if (/[^A-Za-z0-9]/.test(password)) s += 15
  return Math.min(100, s)
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user } = useUser()
  const { isLoaded, mustChangePassword, role } = useWaikUser()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const score = useMemo(() => strengthScore(password), [password])
  const label = score < 40 ? "Weak" : score < 70 ? "Medium" : "Strong"

  useEffect(() => {
    if (!isLoaded) return
    if (!mustChangePassword) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/staff/dashboard")
    }
  }, [isLoaded, mustChangePassword, role, router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password, confirmPassword: confirm }),
      })
      const data = (await res.json()) as { error?: string; redirect?: string }
      if (!res.ok) {
        setError(data.error ?? "Could not update password.")
        return
      }
      const dest = typeof data.redirect === "string" ? data.redirect : "/staff/dashboard"
      await user?.reload()
      router.replace(dest)
      router.refresh()
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded) {
    return <RedirectLoading message="Loading…" />
  }

  if (!mustChangePassword) {
    return null
  }

  if (submitting) {
    return <RedirectLoading message="Updating your password…" />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-lg">
        <div className="flex justify-center">
          <Image src="/waik-logo.png" alt="WAiK" width={140} height={56} className="h-12 w-auto" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Create your password</h1>
          <p className="text-sm text-muted-foreground">Please set a new password to get started with WAiK.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Strength</span>
                <span>{label}</span>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting ? "Saving…" : "Set password"}
          </Button>
        </form>
      </div>
    </div>
  )
}

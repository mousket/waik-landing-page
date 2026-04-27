"use client"

import { use, useCallback, useState, useEffect } from "react"
import Link from "next/link"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString, buildAdminPathWithContext } from "@/lib/admin-nav-context"
import { canAccessPhase2 } from "@/lib/waik-roles"
import { useWaikUser } from "@/hooks/use-waik-user"
import type { Incident } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { CheckCircle2, Lock, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Params = { id: string }

export default function AdminIncidentSignoffPage({ params: paramsProp }: { params: Promise<Params> }) {
  const params = use(paramsProp)
  const incidentId = String(params.id ?? "")
  const sp = useAdminUrlSearchParams()
  const { waikRole, isLoaded, isSignedIn, isWaikSuperAdmin, name, userId } = useWaikUser()
  const canP2 = isWaikSuperAdmin || canAccessPhase2(waikRole ?? "")

  const [incident, setIncident] = useState<Incident | null>(null)
  const [load, setLoad] = useState(true)
  const [donName, setDonName] = useState("")
  const [admName, setAdmName] = useState("")
  const [saving, setSaving] = useState<"don" | "admin" | "lock" | null>(null)

  const refetch = useCallback(async () => {
    const res = await fetch(
      `/api/incidents/${encodeURIComponent(incidentId)}${getAdminContextQueryString(sp)}`,
      { credentials: "include" },
    )
    if (!res.ok) {
      return
    }
    setIncident((await res.json()) as Incident)
  }, [incidentId, sp])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return
    }
    void refetch().finally(() => setLoad(false))
  }, [isLoaded, isSignedIn, refetch])

  const inv = incident?.investigation
  const sig = inv?.signatures

  const postSign = async (role: "don" | "administrator", sigName: string) => {
    if (!incident) {
      return
    }
    if (sigName.trim().length < 2) {
      toast.error("Type your name to sign")
      return
    }
    setSaving(role === "don" ? "don" : "admin")
    try {
      const res = await fetch(
        `/api/incidents/${encodeURIComponent(incidentId)}/signoff${getAdminContextQueryString(sp)}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, signatureName: sigName.trim() }),
        },
      )
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not sign")
        return
      }
      setIncident(j as Incident)
      toast.success("Signature recorded")
    } finally {
      setSaving(null)
    }
  }

  const doLock = async () => {
    if (!incident) {
      return
    }
    if (!window.confirm("Lock this investigation permanently? The record will be closed for editing.")) {
      return
    }
    setSaving("lock")
    try {
      const res = await fetch(
        `/api/incidents/${encodeURIComponent(incidentId)}/lock${getAdminContextQueryString(sp)}`,
        {
        method: "POST",
        credentials: "include",
        },
      )
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Lock failed")
        return
      }
      setIncident(j as unknown as Incident)
      toast.success("Investigation locked and closed")
    } finally {
      setSaving(null)
    }
  }

  if (load || !isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canP2) {
    return <p className="p-6 text-sm">You do not have access to this page.</p>
  }

  if (!incident) {
    return <p className="p-6 text-sm">Loading…</p>
  }

  const canLock = Boolean(sig?.don && sig?.admin) && saving !== "lock"
  const slug = (waikRole ?? "").toLowerCase()
  const isDon = isWaikSuperAdmin || slug === "director_of_nursing"
  const isAdmin = isWaikSuperAdmin || slug === "administrator" || slug === "owner"

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Button asChild variant="ghost" className="w-fit">
        <Link href={buildAdminPathWithContext(`/admin/incidents/${incidentId}`, sp)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to investigation
        </Link>
      </Button>

      <h1 className="text-lg font-semibold">Phase 2 sign-off</h1>
      <p className="text-sm text-muted-foreground">Both Director of Nursing and an administrator must sign, then a single user with permission runs Lock.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <WaikCard>
          <WaikCardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium">Director of Nursing</p>
            {sig?.don ? (
              <div className="flex items-center gap-2 text-teal-800">
                <CheckCircle2 className="h-4 w-4" />
                {sig.don.signedByName} · {new Date(sig.don.signedAt).toLocaleString()}
              </div>
            ) : isDon ? (
              <>
                <Input value={donName} onChange={(e) => setDonName(e.target.value)} placeholder="Type full name" />
                <Button type="button" onClick={() => void postSign("don", donName || (name ?? ""))} disabled={saving === "don"}>
                  Sign as Director of Nursing
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for DON to sign (sign in as DON to complete).</p>
            )}
          </WaikCardContent>
        </WaikCard>

        <WaikCard>
          <WaikCardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium">Administrator</p>
            {sig?.admin ? (
              <div className="flex items-center gap-2 text-teal-800">
                <CheckCircle2 className="h-4 w-4" />
                {sig.admin.signedByName} · {new Date(sig.admin.signedAt).toLocaleString()}
              </div>
            ) : isAdmin ? (
              <>
                <Input value={admName} onChange={(e) => setAdmName(e.target.value)} placeholder="Type full name" />
                <Button type="button" onClick={() => void postSign("administrator", admName || (name ?? ""))} disabled={saving === "admin"}>
                  Sign as Administrator
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for administrator to sign</p>
            )}
          </WaikCardContent>
        </WaikCard>
      </div>

      <div className="pt-2">
        <Button className="w-full max-w-md" onClick={() => void doLock()} disabled={!canLock || !userId} size="lg">
          <Lock className="mr-2 h-4 w-4" />
          {saving === "lock" ? "Locking…" : "Lock investigation (closes record)"}
        </Button>
        {!canLock && <p className="mt-1 text-xs text-amber-700">Both signatures must be present before the lock is enabled.</p>}
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CardDescription, CardTitle } from "@/components/ui/card"

const ACTIONS = [
  { value: "", label: "All types" },
  { value: "login", label: "Login" },
  { value: "incident_created", label: "Incident created" },
  { value: "phase2_claimed", label: "Phase 2 claimed" },
  { value: "investigation_closed", label: "Investigation closed" },
  { value: "user_invited", label: "User invited" },
  { value: "role_changed", label: "Role changed" },
  { value: "user_deactivated", label: "User deactivated" },
  { value: "assessment_completed", label: "Assessment completed" },
] as const

type LogRow = {
  id: string
  userId: string
  userName: string
  role: string
  action: string
  resourceType?: string
  resourceId?: string
  createdAt: string | null
}

type StaffSelect = { id: string; label: string }

export default function AdminActivityLogPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const [entries, setEntries] = useState<LogRow[]>([])
  const [staff, setStaff] = useState<StaffSelect[]>([])
  const [actionFilter, setActionFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams((apiCtx || "?").replace(/^\?/, ""))
      if (actionFilter) p.set("action", actionFilter)
      if (userFilter) p.set("userId", userFilter)
      const actQs = p.toString()
      const [logRes, staffRes] = await Promise.all([
        fetch(actQs ? `/api/admin/activity?${actQs}` : "/api/admin/activity"),
        fetch(`/api/admin/staff${apiCtx}`),
      ])
      if (logRes.ok) {
        const j = (await logRes.json()) as { entries: LogRow[] }
        setEntries(j.entries ?? [])
      }
      if (staffRes.ok) {
        const s = (await staffRes.json()) as {
          active?: { id: string; firstName: string; lastName: string; email: string }[]
        }
        const a = s.active ?? []
        setStaff(
          a.map((m) => ({
            id: m.id,
            label: `${m.firstName} ${m.lastName}`.trim() || m.email,
          })),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [actionFilter, userFilter, apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:space-y-8 md:py-8">
        <PageHeader
          title="Activity"
          description="The last 100 events for this facility, with optional filters. Entries are read-only."
        />

        <WaikCard>
          <WaikCardContent className="space-y-2">
            <div className="space-y-1">
              <CardTitle>Filters</CardTitle>
              <CardDescription>By staff member and action type (optional).</CardDescription>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="space-y-2 sm:w-56">
                <Label htmlFor="u">User</Label>
                <Select
                  value={userFilter || "_all"}
                  onValueChange={(v) => setUserFilter(v === "_all" ? "" : v)}
                >
                  <SelectTrigger className="h-10" id="u">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All users</SelectItem>
                    {staff.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:w-64">
                <Label htmlFor="a">Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-10" id="a">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => (
                      <SelectItem key={a.value || "all"} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </WaikCardContent>
        </WaikCard>

        <WaikCard>
          <WaikCardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">Resource</TableHead>
                    <TableHead className="text-right font-semibold">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No activity yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.userName || e.userId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.role}</TableCell>
                        <TableCell className="text-sm">{e.action}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {e.resourceType
                            ? `${e.resourceType}${e.resourceId ? ` · ${e.resourceId}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </WaikCardContent>
        </WaikCard>
      </div>
    </div>
  )
}

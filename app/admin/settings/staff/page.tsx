"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BulkImportDialog } from "@/components/admin/bulk-import-dialog"
import {
  STAFF_IMPORT_EXAMPLE_ROW,
  STAFF_IMPORT_TEMPLATE_HEADERS,
  type StaffImportPreviewRow,
} from "@/lib/import/staff-rows"
import { isAdminTierRole, isClinicalStaffRole } from "@/lib/role-assignment-permissions"
import { Loader2, Search, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type RoleOpt = { id: string; name: string; slug: string }
type StaffMember = {
  id: string
  firstName: string
  lastName: string
  email: string
  roleSlug: string
  roleName: string
  isActive: boolean
  lastLoginAt: string | null
  invitedByName?: string
  dateSent?: string | null
}

const ROLE_HELP =
  "owner, administrator, director_of_nursing, head_nurse, rn, lpn, cna, staff, physical_therapist, dietician"

const staffPillTabTriggerClass =
  "shrink-0 grow rounded-xl border border-transparent px-2.5 py-2.5 text-xs font-semibold transition-all data-[state=active]:border-primary/25 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:sm:shadow-lg sm:px-4 sm:text-sm"

const staffSubTabListClass =
  "mb-0 flex h-auto min-h-10 w-full max-w-full flex-wrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:gap-1.5 sm:p-1.5"

export default function AdminStaffSettingsPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const [roles, setRoles] = useState<RoleOpt[]>([])
  const [pending, setPending] = useState<StaffMember[]>([])
  const [active, setActive] = useState<StaffMember[]>([])
  const [deactivated, setDeactivated] = useState<StaffMember[]>([])
  const [canInviteStaff, setCanInviteStaff] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("")
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  const [importOpen, setImportOpen] = useState(false)

  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [viewTab, setViewTab] = useState<"signed-in" | "awaiting" | "inactive">("signed-in")
  const [roleSegment, setRoleSegment] = useState<"all" | "admin" | "clinical">("all")
  const [editRole, setEditRole] = useState<StaffMember | null>(null)
  const [editRoleValue, setEditRoleValue] = useState("")
  const [cancelId, setCancelId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, staffRes] = await Promise.all([
        fetch("/api/admin/roles?assignable=1"),
        fetch(`/api/admin/staff${apiCtx}`),
      ])
      if (rRes.ok) {
        const rj = (await rRes.json()) as { roles: RoleOpt[] }
        setRoles(rj.roles ?? [])
      }
      if (staffRes.ok) {
        const sj = (await staffRes.json()) as {
          pending: StaffMember[]
          active: StaffMember[]
          deactivated: StaffMember[]
          currentUser?: { canInviteStaff?: boolean }
        }
        setPending(sj.pending ?? [])
        setActive(sj.active ?? [])
        setDeactivated(sj.deactivated ?? [])
        setCanInviteStaff(Boolean(sj.currentUser?.canInviteStaff))
      }
    } finally {
      setLoading(false)
    }
  }, [apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  const matchesSearch = (m: StaffMember) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    )
  }

  const filteredActive = useMemo(() => active.filter(matchesSearch), [active, search])
  const filteredPending = useMemo(() => pending.filter(matchesSearch), [pending, search])
  const filteredDeactivated = useMemo(() => deactivated.filter(matchesSearch), [deactivated, search])

  const signedInRows = useMemo(() => {
    const pred =
      roleSegment === "all"
        ? () => true
        : roleSegment === "admin"
          ? (m: StaffMember) => isAdminTierRole(m.roleSlug)
          : (m: StaffMember) => isClinicalStaffRole(m.roleSlug)
    return filteredActive.filter(pred)
  }, [roleSegment, filteredActive])

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg(null)
    setInviteBusy(true)
    try {
      const res = await fetch(`/api/admin/staff/invite${apiCtx}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          roleSlug: inviteRole,
        }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        const err = j.error ?? "Invite failed"
        if (res.status === 409 && /already exists/i.test(err)) {
          setInviteMsg(
            `${err} If they were already added, open the Awaiting sign-in tab to resend the welcome email.`,
          )
        } else {
          setInviteMsg(err)
        }
        return
      }
      setFirstName("")
      setLastName("")
      setEmail("")
      setInviteRole("")
      setInviteMsg("Invitation sent.")
      await load()
    } finally {
      setInviteBusy(false)
    }
  }

  async function patchDeactivate(id: string) {
    setDeactivateId(null)
    await fetch(`/api/admin/staff/${encodeURIComponent(id)}/deactivate${apiCtx}`, { method: "PATCH" })
    await load()
  }

  async function patchReactivate(id: string) {
    await fetch(`/api/admin/staff/${encodeURIComponent(id)}/reactivate${apiCtx}`, { method: "PATCH" })
    await load()
  }

  async function patchRole(id: string, roleSlug: string) {
    await fetch(`/api/admin/staff/${encodeURIComponent(id)}/role${apiCtx}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleSlug }),
    })
    await load()
  }

  async function cancelPending(userId: string) {
    setCancelId(null)
    const res = await fetch(
      `/api/admin/staff/invitations/${encodeURIComponent(userId)}${apiCtx}`,
      { method: "DELETE" },
    )
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      setInviteMsg(j.error ?? "Could not cancel invitation")
      return
    }
    setInviteMsg(null)
    await load()
  }

  function openEditRole(m: StaffMember) {
    setEditRoleValue(m.roleSlug)
    setEditRole(m)
  }

  async function resendInvite(id: string) {
    setInviteMsg(null)
    const res = await fetch(`/api/admin/staff/${encodeURIComponent(id)}/resend-invite${apiCtx}`, {
      method: "POST",
    })
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      setInviteMsg(j.error ?? "Could not resend the welcome email.")
      return
    }
    setInviteMsg("Invite email resent.")
    await load()
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:space-y-8 md:py-8">
        <PageHeader
          title="Staff"
          description="Invite and manage staff for your facility."
        />

        {canInviteStaff ? (
          <WaikCard>
            <WaikCardContent>
              <div className="space-y-1">
                <CardTitle>Invite new staff</CardTitle>
                <CardDescription>Send an email invitation with a temporary password.</CardDescription>
              </div>
            </WaikCardContent>
            <WaikCardContent className="border-t border-border/50 pt-4">
              <form onSubmit={submitInvite} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="fn">First name (optional)</Label>
                  <Input
                    id="fn"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ln">Last name (optional)</Label>
                  <Input
                    id="ln"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="em">Email</Label>
                  <Input
                    id="em"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole} required>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.slug} value={r.slug}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center lg:col-span-4">
                  <Button
                    type="submit"
                    className="min-h-12 w-full sm:w-auto"
                    disabled={inviteBusy || !inviteRole}
                  >
                    {inviteBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send invitation"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full sm:w-auto"
                    onClick={() => setImportOpen(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV / Excel
                  </Button>
                  {inviteMsg ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <span className="text-sm text-muted-foreground">{inviteMsg}</span>
                      {/Awaiting sign-in tab/i.test(inviteMsg) ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 w-fit shrink-0"
                          onClick={() => {
                            setViewTab("awaiting")
                            setInviteMsg(null)
                          }}
                        >
                          Open Awaiting sign-in
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </form>
            </WaikCardContent>
          </WaikCard>
        ) : (
          <WaikCard className="border-dashed border-border/60">
            <WaikCardContent className="py-8 text-center text-muted-foreground">
              Contact your organization administrator to add staff members.
            </WaikCardContent>
          </WaikCard>
        )}

        <WaikCard>
          <WaikCardContent className="min-w-0 space-y-0 p-0">
            <div className="flex flex-col gap-4 border-b border-border/50 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle>Staff directory</CardTitle>
                <CardDescription>
                  {viewTab === "inactive"
                    ? "Deactivated accounts cannot sign in until reactivated."
                    : viewTab === "awaiting"
                      ? "Account exists but the person has not completed first sign-in. Resend the welcome email with a new temporary password, or remove the account to invite a different person."
                      : "Filter by team segment, search by name or email, and update roles with explicit confirmation."}
                </CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 min-h-12 pl-9"
                />
              </div>
            </div>

            <Tabs
              value={viewTab}
              onValueChange={(v) => setViewTab(v as "signed-in" | "awaiting" | "inactive")}
              className="w-full gap-0"
            >
              <div className="border-b border-border/50 px-4 py-3 sm:px-6">
                <TabsList className="mb-0 flex h-auto min-h-11 w-full max-w-full flex-wrap items-stretch justify-start gap-1.5 rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/5 p-1.5 sm:min-h-12 sm:gap-2 sm:p-2">
                  <TabsTrigger value="signed-in" className={staffPillTabTriggerClass}>
                    Signed in
                  </TabsTrigger>
                  <TabsTrigger value="awaiting" className={staffPillTabTriggerClass}>
                    <span className="flex w-full min-w-0 items-center justify-center gap-1.5 sm:gap-2.5">
                      Awaiting sign-in
                      <Badge
                        className="rounded-full bg-amber-600/90 px-1.5 text-xs tabular-nums text-white dark:bg-amber-600/85"
                        variant="secondary"
                      >
                        {pending.length}
                      </Badge>
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className={staffPillTabTriggerClass}>
                    <span className="flex w-full min-w-0 items-center justify-center gap-1.5 sm:gap-2.5">
                      Inactive
                      <Badge
                        className="rounded-full bg-muted-foreground/25 px-1.5 text-xs font-medium tabular-nums text-foreground/90"
                        variant="secondary"
                      >
                        {deactivated.length}
                      </Badge>
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="signed-in"
                className="mt-0 min-h-0 w-full p-0 outline-none data-[state=inactive]:hidden"
              >
                <Tabs
                  value={roleSegment}
                  onValueChange={(v) => setRoleSegment(v as "all" | "admin" | "clinical")}
                  className="w-full gap-0"
                >
                  <div className="border-b border-border/50 px-4 py-2 sm:px-6 sm:py-2.5">
                    <TabsList className={staffSubTabListClass}>
                      <TabsTrigger value="all" className={cn(staffPillTabTriggerClass, "shrink-0 sm:grow-0")}>
                        All
                      </TabsTrigger>
                      <TabsTrigger value="admin" className={cn(staffPillTabTriggerClass, "shrink-0 sm:grow-0")}>
                        Admin tier
                      </TabsTrigger>
                      <TabsTrigger value="clinical" className={cn(staffPillTabTriggerClass, "shrink-0 sm:grow-0")}>
                        Clinical
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </Tabs>
                <div className="w-full p-0">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Role</TableHead>
                          <TableHead className="font-semibold">Email</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Last active</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {signedInRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                              {active.length === 0
                                ? "No staff have signed in yet. Check Awaiting sign-in for new invites."
                                : "No staff in this view"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          signedInRows.map((m) => (
                            <TableRow key={m.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">
                                {m.firstName} {m.lastName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-normal">
                                  {m.roleName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{m.email}</TableCell>
                              <TableCell className="text-sm">Active</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {canInviteStaff ? (
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="min-h-10"
                                      onClick={() => openEditRole(m)}
                                    >
                                      Edit role
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="min-h-10"
                                      onClick={() => setDeactivateId(m.id)}
                                    >
                                      Deactivate
                                    </Button>
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="awaiting"
                className="mt-0 min-h-0 w-full p-0 outline-none data-[state=inactive]:hidden"
              >
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Invited by</TableHead>
                        <TableHead className="font-semibold">Added</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            {pending.length === 0
                              ? "No one is waiting to sign in. New invites land here if email delivery was delayed or they have not used their account yet."
                              : "No matches in this list — try a different search."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPending.map((m) => (
                          <TableRow key={m.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {m.firstName} {m.lastName}
                            </TableCell>
                            <TableCell className="text-sm">{m.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {m.roleName}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="max-w-full whitespace-normal text-left font-normal"
                              >
                                Awaiting first sign-in
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {m.invitedByName || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {m.dateSent ? new Date(m.dateSent).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {canInviteStaff ? (
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-h-10"
                                    onClick={() => resendInvite(m.id)}
                                  >
                                    Resend welcome email
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="min-h-10"
                                    onClick={() => setCancelId(m.id)}
                                  >
                                    Remove account
                                  </Button>
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent
                value="inactive"
                className="mt-0 min-h-0 w-full p-0 outline-none data-[state=inactive]:hidden"
              >
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeactivated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                            {deactivated.length === 0 ? "No inactive staff" : "No matches in this list — try a different search."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDeactivated.map((m) => (
                          <TableRow key={m.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {m.firstName} {m.lastName}
                            </TableCell>
                            <TableCell className="text-sm">{m.email}</TableCell>
                            <TableCell className="text-right">
                              {canInviteStaff ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="min-h-10"
                                  onClick={() => void patchReactivate(m.id)}
                                >
                                  Reactivate
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </WaikCardContent>
        </WaikCard>

        <Dialog
          open={Boolean(editRole)}
          onOpenChange={(o) => {
            if (!o) {
              setEditRole(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit role</DialogTitle>
            </DialogHeader>
            {editRole ? (
              <p className="text-sm text-muted-foreground">
                {editRole.firstName} {editRole.lastName} ({editRole.email})
              </p>
            ) : null}
            <div className="space-y-2 py-2">
              <Label>Role</Label>
              <Select value={editRoleValue} onValueChange={setEditRoleValue}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.slug} value={r.slug}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditRole(null)
                }}
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  if (editRole) {
                    void patchRole(editRole.id, editRoleValue)
                  }
                  setEditRole(null)
                }}
              >
                Save role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(deactivateId)} onOpenChange={() => setDeactivateId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate staff member?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              They will not be able to sign in until reactivated.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivateId(null)}>
                Back
              </Button>
              <Button variant="destructive" onClick={() => deactivateId && void patchDeactivate(deactivateId)}>
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(cancelId)} onOpenChange={() => setCancelId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove this account?</DialogTitle>
              <DialogDescription>
                The sign-in is deleted from Clerk and this facility. You can add the same email again later with
                a fresh invite.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelId(null)}>
                Back
              </Button>
              <Button variant="destructive" onClick={() => cancelId && void cancelPending(cancelId)}>
                Remove account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BulkImportDialog<StaffImportPreviewRow>
          open={importOpen}
          onOpenChange={setImportOpen}
          title="Import staff"
          description={
            <>
              Required columns:{" "}
              <code className="rounded bg-muted px-1 text-xs">{STAFF_IMPORT_TEMPLATE_HEADERS}</code>. Valid{" "}
              <code className="rounded bg-muted px-1 text-xs">role_slug</code> values: {ROLE_HELP}. Optional:{" "}
              <code className="rounded bg-muted px-1 text-xs">phone</code>,{" "}
              <code className="rounded bg-muted px-1 text-xs">device_type</code> (personal|work),{" "}
              <code className="rounded bg-muted px-1 text-xs">unit</code>.
            </>
          }
          templateHeaders={STAFF_IMPORT_TEMPLATE_HEADERS}
          templateExampleRow={STAFF_IMPORT_EXAMPLE_ROW}
          templateFilename="waik-staff-template.csv"
          parseUrl={`/api/admin/staff/import${apiCtx}`}
          confirmUrl={`/api/admin/staff/import/confirm${apiCtx}`}
          columns={[
            { header: "Email", cell: (r) => r.email },
            { header: "Name", cell: (r) => `${r.first_name} ${r.last_name}` },
            { header: "Role", cell: (r) => r.role_slug },
          ]}
          rowKey={(r, i) => `${r.email}-${i}`}
          isImportable={(r) => r.status === "valid"}
          hasBlockingErrors={(rows) => rows.some((r) => r.status === "error")}
          statusLabel={(r) => {
            if (r.status === "valid") return { text: "Valid", className: "text-green-600" }
            if (r.status === "duplicate") return { text: "Exists", className: "text-amber-600" }
            return { text: "Error", className: "text-destructive" }
          }}
          confirmButtonLabel={(n) => `Import ${n} staff`}
          onComplete={() => void load()}
          mapConfirmPayload={(rows) => ({ rows })}
        />
      </div>
    </div>
  )
}

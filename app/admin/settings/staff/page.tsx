"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { STAFF_CSV_TEMPLATE_HEADERS } from "@/lib/csv-staff"
import { Download, Loader2, Search, Upload } from "lucide-react"

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
}

type ImportRow = {
  first_name: string
  last_name: string
  email: string
  role_slug: string
  phone?: string
  status: "valid" | "error" | "duplicate"
  error?: string
}

const ROLE_HELP =
  "owner, administrator, director_of_nursing, head_nurse, rn, lpn, cna, staff, physical_therapist, dietician"

export default function AdminStaffSettingsPage() {
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
  const [importStep, setImportStep] = useState(1)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importBusy, setImportBusy] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<Array<{ email: string; status: string; error?: string }>>([])

  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, staffRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/staff"),
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
  }, [])

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

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg(null)
    setInviteBusy(true)
    try {
      const res = await fetch("/api/admin/staff/invite", {
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
        setInviteMsg(j.error ?? "Invite failed")
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
    await fetch(`/api/admin/staff/${encodeURIComponent(id)}/deactivate`, { method: "PATCH" })
    await load()
  }

  async function patchReactivate(id: string) {
    await fetch(`/api/admin/staff/${encodeURIComponent(id)}/reactivate`, { method: "PATCH" })
    await load()
  }

  async function patchRole(id: string, roleSlug: string) {
    await fetch(`/api/admin/staff/${encodeURIComponent(id)}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleSlug }),
    })
    await load()
  }

  async function resendInvite(id: string) {
    await fetch(`/api/admin/staff/${encodeURIComponent(id)}/resend-invite`, { method: "POST" })
    setInviteMsg("Invite email resent.")
    await load()
  }

  function downloadTemplate() {
    const blob = new Blob([`${STAFF_CSV_TEMPLATE_HEADERS}\nJane,Doe,jane.doe@example.com,rn\n`], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "waik-staff-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onImportFile(file: File) {
    setImportBusy(true)
    setImportRows([])
    try {
      const fd = new FormData()
      fd.set("file", file)
      const res = await fetch("/api/admin/staff/import", { method: "POST", body: fd })
      const j = (await res.json()) as { rows?: ImportRow[]; error?: string }
      if (!res.ok) {
        setImportRows([])
        return
      }
      setImportRows(j.rows ?? [])
      setImportStep(2)
    } finally {
      setImportBusy(false)
    }
  }

  const hasImportErrors = importRows.some((r) => r.status === "error")
  const validImportRows = importRows.filter((r) => r.status === "valid")

  async function runImportConfirm() {
    setImportBusy(true)
    setImportStep(3)
    setImportProgress(0)
    setImportResults([])
    try {
      const res = await fetch("/api/admin/staff/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validImportRows }),
      })
      const j = (await res.json()) as {
        results?: Array<{ email: string; status: string; error?: string }>
      }
      setImportResults(j.results ?? [])
      setImportProgress(100)
      await load()
    } finally {
      setImportBusy(false)
    }
  }

  function closeImport() {
    setImportOpen(false)
    setImportStep(1)
    setImportRows([])
    setImportResults([])
    setImportProgress(0)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1">Invite and manage staff for your facility.</p>
        </div>

        {canInviteStaff ? (
          <Card>
            <CardHeader>
              <CardTitle>Invite new staff</CardTitle>
              <CardDescription>Send an email invitation with a temporary password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitInvite} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="fn">First name</Label>
                  <Input
                    id="fn"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ln">Last name</Label>
                  <Input
                    id="ln"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
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
                <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={inviteBusy || !inviteRole}>
                    {inviteBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send invitation"
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import from CSV
                  </Button>
                  {inviteMsg ? <span className="text-sm text-muted-foreground">{inviteMsg}</span> : null}
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Contact your organization administrator to add staff members.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Active staff</CardTitle>
              <CardDescription>Team members who have signed in at least once.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActive.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No active staff yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActive.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.firstName} {m.lastName}
                        </TableCell>
                        <TableCell>
                          {canInviteStaff ? (
                            <Select
                              value={m.roleSlug}
                              onValueChange={(v) => {
                                void patchRole(m.id, v)
                              }}
                            >
                              <SelectTrigger className="h-8 w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map((r) => (
                                  <SelectItem key={r.slug} value={r.slug}>
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            m.roleName
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{m.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {canInviteStaff ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => resendInvite(m.id)}>
                                Resend invite
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => setDeactivateId(m.id)}>
                                Deactivate
                              </Button>
                            </>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Invited users who have not completed first sign-in yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPending.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.firstName} {m.lastName}
                      </TableCell>
                      <TableCell>{m.roleName}</TableCell>
                      <TableCell className="text-sm">{m.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Never</TableCell>
                      <TableCell className="text-right">
                        {canInviteStaff ? (
                          <Button variant="outline" size="sm" onClick={() => resendInvite(m.id)}>
                            Resend invite
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {deactivated.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Deactivated</CardTitle>
              <CardDescription>Former team members who can no longer sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeactivated.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.firstName} {m.lastName}
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell className="text-right">
                        {canInviteStaff ? (
                          <Button variant="outline" size="sm" onClick={() => void patchReactivate(m.id)}>
                            Reactivate
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

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
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deactivateId && void patchDeactivate(deactivateId)}>
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importOpen} onOpenChange={(o) => !o && closeImport()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import from CSV</DialogTitle>
            </DialogHeader>

            {importStep === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Required columns: <code className="text-xs bg-muted px-1 rounded">{STAFF_CSV_TEMPLATE_HEADERS}</code>
                  . Optional: <code className="text-xs bg-muted px-1 rounded">phone</code>
                </p>
                <p className="text-xs text-muted-foreground">Valid role values: {ROLE_HELP}</p>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download template
                </Button>
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 cursor-pointer hover:bg-muted/50 transition">
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Drop CSV here or click to upload</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void onImportFile(f)
                      e.target.value = ""
                    }}
                  />
                </label>
                {importBusy ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing…
                  </div>
                ) : null}
              </div>
            ) : null}

            {importStep === 2 ? (
              <div className="space-y-4">
                <p className="text-sm">
                  <strong>{validImportRows.length}</strong> will be created,{" "}
                  <span className="text-destructive">{importRows.filter((r) => r.status === "error").length}</span> have
                  errors,{" "}
                  <span className="text-amber-600">{importRows.filter((r) => r.status === "duplicate").length}</span>{" "}
                  already exist.
                </p>
                <div className="rounded-md border max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((r, i) => (
                        <TableRow key={`${r.email}-${i}`}>
                          <TableCell className="text-sm">{r.email}</TableCell>
                          <TableCell className="text-sm">
                            {r.first_name} {r.last_name}
                          </TableCell>
                          <TableCell className="text-sm">{r.role_slug}</TableCell>
                          <TableCell
                            className={
                              r.status === "valid"
                                ? "text-green-600 text-sm"
                                : r.status === "duplicate"
                                  ? "text-amber-600 text-sm"
                                  : "text-destructive text-sm"
                            }
                          >
                            {r.status === "valid" ? "Valid" : r.status === "duplicate" ? "Exists" : r.error ?? "Error"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setImportStep(1)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={hasImportErrors || validImportRows.length === 0 || importBusy}
                    onClick={() => void runImportConfirm()}
                  >
                    Import {validImportRows.length} staff
                  </Button>
                </DialogFooter>
              </div>
            ) : null}

            {importStep === 3 ? (
              <div className="space-y-4">
                <Progress value={importProgress} className="h-2" />
                <p className="text-sm font-medium">Results</p>
                <ul className="text-sm space-y-1 max-h-48 overflow-auto">
                  {importResults.map((r, i) => (
                    <li key={`${r.email}-${i}`} className={r.status === "failed" ? "text-destructive" : "text-green-600"}>
                      {r.email} — {r.status}
                      {r.error ? ` (${r.error})` : ""}
                    </li>
                  ))}
                </ul>
                <DialogFooter>
                  <Button type="button" onClick={closeImport}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { WaikCard, WaikCardContent } from "@/components/ui/waik-card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Loader2, Plus, Search } from "lucide-react"

type Resident = {
  id: string
  firstName: string
  lastName: string
  roomNumber: string
  careLevel: string
}

const CARE_OPTIONS = [
  { value: "independent", label: "Independent" },
  { value: "assisted", label: "Assisted" },
  { value: "memory_care", label: "Memory care" },
  { value: "skilled_nursing", label: "Skilled nursing" },
]

export default function AdminResidentsPage() {
  const searchParams = useAdminUrlSearchParams()
  const apiCtx = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [careLevel, setCareLevel] = useState("assisted")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/residents${apiCtx}`)
      if (!res.ok) {
        setResidents([])
        return
      }
      const j = (await res.json()) as { residents: Resident[] }
      setResidents(j.residents ?? [])
    } finally {
      setLoading(false)
    }
  }, [apiCtx])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return residents
    const q = search.toLowerCase()
    return residents.filter(
      (r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.roomNumber.toLowerCase().includes(q),
    )
  }, [residents, search])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/residents${apiCtx}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, roomNumber, careLevel }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(j.error ?? "Could not create resident")
        return
      }
      setFirstName("")
      setLastName("")
      setRoomNumber("")
      setCareLevel("assisted")
      setOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 md:space-y-8 md:py-8">
        <PageHeader
          title="Residents"
          description="Residents at your facility."
          actions={
            <Button className="min-h-12 shadow-lg shadow-primary/20" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add resident
            </Button>
          }
        />

        <WaikCard>
          <WaikCardContent className="space-y-0 p-0">
            <div className="flex flex-col gap-4 border-b border-border/50 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Directory</CardTitle>
                <CardDescription>Search by name or room.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 min-h-12 pl-9"
                />
              </div>
            </div>
            <div className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Room</TableHead>
                      <TableHead className="font-semibold">Care level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                          No residents yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((r) => (
                        <TableRow key={r.id} className="border-border transition-colors hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {r.firstName} {r.lastName}
                          </TableCell>
                          <TableCell>{r.roomNumber || "—"}</TableCell>
                          <TableCell className="capitalize">{r.careLevel.replace(/_/g, " ")}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </WaikCardContent>
        </WaikCard>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add resident</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rfn">First name</Label>
                <Input id="rfn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rln">Last name</Label>
                <Input id="rln" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Room number</Label>
              <Input id="room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Care level</Label>
              <Select value={careLevel} onValueChange={setCareLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getAdminContextQueryString } from "@/lib/admin-nav-context"
import { filterIdtQuestions, idtOpenQuestionCountForUser, isIdtQuestionOverdueForReminder } from "@/lib/idt-question-helpers"
import type { Incident, Question } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, UserMinus, Send } from "lucide-react"
import { toast } from "sonner"

type StaffRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  roleName: string
  isActive: boolean
}

type Props = {
  incident: Incident
  incidentId: string
  searchParams: URLSearchParams
  onRefresh: () => Promise<void>
}

function pickStaffList(data: {
  active: StaffRow[]
  pending: StaffRow[]
}): StaffRow[] {
  return [...data.active, ...data.pending].filter((u) => u.isActive)
}

export function Phase2IdtTab({ incident, incidentId, searchParams, onRefresh }: Props) {
  const apiQ = useMemo(() => getAdminContextQueryString(searchParams), [searchParams])
  const canEdit = incident.phase === "phase_2_in_progress"
  const isClosed = incident.phase === "closed"
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [staffLoad, setStaffLoad] = useState<"idle" | "loading" | "error">("idle")
  const [q, setQ] = useState("")

  const [addUserId, setAddUserId] = useState("")
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [remindBusy, setRemindBusy] = useState<string | null>(null)
  const [remindOnce, setRemindOnce] = useState<Record<string, boolean>>({})

  const [composeTarget, setComposeTarget] = useState<string>("")
  const [composeText, setComposeText] = useState("")

  const idtTeam = incident.idtTeam ?? []
  const idtQuestions = useMemo(
    () => filterIdtQuestions(incident.questions ?? []),
    [incident.questions],
  )
  const idtUserSet = useMemo(() => new Set(idtTeam.map((m) => m.userId)), [idtTeam])

  const loadStaff = useCallback(async () => {
    setStaffLoad("loading")
    try {
      const res = await fetch(`/api/admin/staff${apiQ}`, { credentials: "include" })
      const j = (await res.json().catch(() => ({}))) as {
        error?: string
        active?: StaffRow[]
        pending?: StaffRow[]
      }
      if (!res.ok) {
        setStaff([])
        setStaffLoad("error")
        return
      }
      setStaff(pickStaffList({ active: j.active ?? [], pending: j.pending ?? [] }))
      setStaffLoad("idle")
    } catch {
      setStaffLoad("error")
    }
  }, [apiQ])

  useEffect(() => {
    if (!canEdit) {
      return
    }
    void loadStaff()
  }, [loadStaff, canEdit])

  const filteredStaff = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) {
      return staff
    }
    return staff.filter((u) => {
      const n = `${u.firstName} ${u.lastName} ${u.email} ${u.roleName}`.toLowerCase()
      return n.includes(t)
    })
  }, [staff, q])

  const addable = useMemo(
    () => filteredStaff.filter((u) => !idtUserSet.has(u.id)),
    [filteredStaff, idtUserSet],
  )

  const onAdd = useCallback(async () => {
    if (!addUserId) {
      return
    }
    setAdding(true)
    try {
      const res = await fetch(
        `/api/incidents/${encodeURIComponent(incidentId)}/idt-team${apiQ}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: addUserId }),
        },
      )
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not add to IDT list")
        return
      }
      setAddUserId("")
      await onRefresh()
      toast.success("Team member added.")
    } finally {
      setAdding(false)
    }
  }, [addUserId, apiQ, incidentId, onRefresh])

  const onRemove = useCallback(
    async (userId: string) => {
      if (!confirm("Remove this person from the IDT list?")) {
        return
      }
      setRemoving(userId)
      try {
        const sp = new URLSearchParams(getAdminContextQueryString(searchParams).replace(/^\?/, ""))
        sp.set("userId", userId)
        const res = await fetch(
          `/api/incidents/${encodeURIComponent(incidentId)}/idt-team?${sp.toString()}`,
          { method: "DELETE", credentials: "include" },
        )
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(typeof j.error === "string" ? j.error : "Could not remove from IDT list")
          return
        }
        if (composeTarget === userId) {
          setComposeTarget("")
        }
        await onRefresh()
        toast.success("Removed from IDT list.")
      } finally {
        setRemoving(null)
      }
    },
    [composeTarget, incidentId, onRefresh, searchParams],
  )

  const onSendQuestion = useCallback(async () => {
    const t = composeText.trim()
    if (!composeTarget || t.length < 3) {
      toast.error("Pick a team member and enter a question (at least 3 characters).")
      return
    }
    setSending(true)
    try {
      const res = await fetch(
        `/api/incidents/${encodeURIComponent(incidentId)}/idt-questions${apiQ}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ targetUserId: composeTarget, questionText: t }),
        },
      )
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not send question")
        return
      }
      setComposeText("")
      await onRefresh()
      toast.success("Question sent. It appears in this tab and in Phase 1 Q&A when answered.")
    } finally {
      setSending(false)
    }
  }, [apiQ, composeTarget, composeText, incidentId, onRefresh])

  const sendRemind = useCallback(
    async (question: Question) => {
      const uid = question.metadata?.idtTargetUserId ?? question.assignedTo?.[0]
      if (!uid) {
        toast.error("No assignee for this question.")
        return
      }
      if (remindOnce[question.id]) {
        toast.info("A reminder was already sent this session. Refresh the page to send again.")
        return
      }
      setRemindBusy(question.id)
      try {
        const res = await fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            targetUserId: uid,
            payload: {
              title: "Reminder — IDT input needed",
              body: `You have a pending IDT question on the Room ${incident.residentRoom} investigation (${incident.incidentType ?? "incident"}). Please respond in WAiK.`,
              url: `/staff/incidents/${encodeURIComponent(incidentId)}`,
            },
          }),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          toast.error(typeof j.error === "string" ? j.error : "Could not send reminder (push).")
          return
        }
        setRemindOnce((prev) => ({ ...prev, [question.id]: true }))
        toast.success("Reminder queued.")
      } catch {
        toast.error("Network error sending reminder.")
      } finally {
        setRemindBusy(null)
      }
    },
    [incident.incidentType, incident.residentRoom, incidentId, remindOnce],
  )

  if (isClosed) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">This investigation is closed. IDT roster and questions are read only.</p>
        {idtTeam.length > 0 ? (
          <ul className="space-y-1.5 text-xs">
            {idtTeam.map((m) => (
              <li key={m.userId} className="rounded border p-2">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground"> — {m.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No team members on record.</p>
        )}
        {idtQuestions.length > 0 ? (
          <ul className="space-y-2 text-xs">
            {idtQuestions.map((q) => {
              const assignee =
                q.assignedTo?.[0] !== undefined
                  ? (idtTeam.find((m) => m.userId === q.assignedTo?.[0])?.name ?? q.assignedTo[0])
                  : "—"
              return (
                <li key={q.id} className="rounded border p-2">
                  <p className="font-medium">{q.questionText}</p>
                  <p className="text-muted-foreground">To: {assignee}</p>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    )
  }

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        Claim the investigation to manage the inter-disciplinary team and questions.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium">IDT roster</p>
        <p className="text-xs text-muted-foreground">
          Add facility staff. Questions are stored on this incident; answers appear in the Phase 1 Q&A list when
          provided.
        </p>
        {staffLoad === "error" && (
          <p className="text-xs text-destructive">Could not load the facility roster. Check facility context in the URL.</p>
        )}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <Input
              placeholder="Search by name, email, or role"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-1">
              <select
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                aria-label="Add staff to IDT"
                disabled={staffLoad === "loading" || addable.length === 0}
              >
                <option value="">{addable.length === 0 ? "No staff to add" : "Select a staff member to add…"}</option>
                {addable.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} — {u.roleName}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={() => void onAdd()}
                disabled={!addUserId || adding}
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {idtTeam.length === 0 ? (
        <p className="text-xs text-muted-foreground">No team members yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {idtTeam.map((m) => {
            const openN = idtOpenQuestionCountForUser(incident.questions, m.userId)
            return (
              <li
                key={m.userId}
                className="flex flex-col gap-1 rounded border p-2 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-1 text-muted-foreground">{m.role}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {openN > 0 && (
                    <Badge variant="secondary" className="text-[0.7rem]">
                      {openN} open {openN === 1 ? "question" : "questions"}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">Status: {m.status === "answered" ? "Answered" : "Pending"}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Remove from IDT (blocked if they have an open IDT question)"
                    disabled={removing === m.userId}
                    onClick={() => void onRemove(m.userId)}
                    aria-label={`Remove ${m.name} from team`}
                  >
                    {removing === m.userId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-sm font-medium">Send a question to an IDT member</p>
        <select
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={composeTarget}
          onChange={(e) => setComposeTarget(e.target.value)}
        >
          <option value="">{idtTeam.length === 0 ? "Add team members first" : "Select assignee…"}</option>
          {idtTeam.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>
        <Textarea
          className="min-h-[80px] text-sm"
          placeholder="Your question to this person…"
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void onSendQuestion()}
          disabled={!composeTarget || sending || !composeText.trim()}
        >
          {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
          Send question
        </Button>
        <p className="text-[0.7rem] text-muted-foreground">
          AI-suggested follow-ups: optional, planned in phase 4b-02/section workspaces.
        </p>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-sm font-medium">IDT questions (Phase 2)</p>
        {idtQuestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No IDT questions sent yet.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {idtQuestions
              .slice()
              .sort(
                (a, b) =>
                  (b.askedAt ? new Date(b.askedAt).getTime() : 0) -
                  (a.askedAt ? new Date(a.askedAt).getTime() : 0),
              )
              .map((q) => {
                const assignee =
                  q.assignedTo?.[0] !== undefined
                    ? (idtTeam.find((m) => m.userId === q.assignedTo?.[0])?.name ?? q.assignedTo[0])
                    : "—"
                const pending = !q.answer
                const overdue = pending && isIdtQuestionOverdueForReminder(q.askedAt)
                return (
                  <li key={q.id} className="rounded border border-border/50 p-2">
                    <p className="font-medium text-foreground">{q.questionText}</p>
                    <p className="mt-0.5 text-muted-foreground">To: {assignee}</p>
                    <p className="text-[0.7rem] text-muted-foreground">Sent: {new Date(q.askedAt).toLocaleString()}</p>
                    {q.answer ? (
                      <p className="mt-0.5 text-primary">
                        {q.answer.answerText} — {q.answer.answeredBy} · {new Date(q.answer.answeredAt).toLocaleString()}
                      </p>
                    ) : (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-amber-700">Pending</span>
                        {overdue && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7"
                            disabled={remindBusy === q.id}
                            onClick={() => void sendRemind(q)}
                          >
                            {remindBusy === q.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Send reminder"
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
          </ul>
        )}
      </div>
    </div>
  )
}

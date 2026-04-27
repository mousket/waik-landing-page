"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const DEBOUNCE_MS = 300

export type StaffResidentSearchOption = {
  id: string
  firstName: string
  lastName: string
  roomNumber: string
  careLevel: string
}

function careLevelLabel(care: string): string {
  const map: Record<string, string> = {
    independent: "Independent",
    assisted: "Assisted",
    memory_care: "Memory care",
    skilled_nursing: "Skilled nursing",
  }
  return map[care] || care
}

type ApiResident = {
  id: string
  firstName: string
  lastName: string
  roomNumber: string
  careLevel: string
}

export function formatResidentResultLine(r: Pick<StaffResidentSearchOption, "roomNumber" | "firstName" | "lastName">) {
  const name = [r.firstName, r.lastName].filter(Boolean).join(" ")
  return `Room ${r.roomNumber} — ${name}`
}

export function StaffResidentSearch({
  value,
  onChange,
  disabled,
  placeholder = "Search resident by name or room…",
  className,
  inputId: inputIdProp,
}: {
  value: StaffResidentSearchOption | null
  onChange: (r: StaffResidentSearchOption | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  inputId?: string
}) {
  const genId = useId()
  const listboxId = `${genId}-listbox`
  const inputId = inputIdProp ?? `${genId}-input`
  const [q, setQ] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<StaffResidentSearchOption[]>([])
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebounced(q.trim())
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  const fetchList = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const u = new URL("/api/residents", window.location.origin)
      u.searchParams.set("search", search)
      const res = await fetch(u.toString(), { credentials: "same-origin" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || "Search failed")
      }
      const data = (await res.json()) as { residents?: ApiResident[] }
      const rows = data.residents ?? []
      setResults(
        rows.map((r) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          roomNumber: r.roomNumber,
          careLevel: r.careLevel,
        })),
      )
    } catch (e) {
      setResults([])
      setError(e instanceof Error ? e.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (value) {
      setQ("")
      setOpen(false)
      return
    }
    if (debounced.length < 1) {
      setResults([])
      setOpen(false)
      return
    }
    void fetchList(debounced)
    setOpen(true)
  }, [debounced, value, fetchList])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = wrapRef.current
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const chipLabel = useMemo(() => {
    if (!value) return null
    const name = [value.firstName, value.lastName].filter(Boolean).join(" ")
    return `✓ ${name} — Room ${value.roomNumber}`
  }, [value])

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      {value ? (
        <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-left text-sm">
          <span className="min-w-0 flex-1 font-medium text-foreground" title={chipLabel ?? ""}>
            {chipLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Clear selected resident"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <Input
            id={inputId}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (results.length > 0 && q.trim().length > 0) setOpen(true)
            }}
            placeholder={placeholder}
            autoComplete="off"
            disabled={disabled}
            className="min-h-12 rounded-xl"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
          {error ? <p className="mt-1.5 text-sm text-destructive">{error}</p> : null}
          {open && !value ? (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover py-1 shadow-md"
            >
              {loading ? (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">Searching…</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">No residents match that search.</li>
              ) : (
                results.map((r) => {
                  const line = formatResidentResultLine(r)
                  const sub = careLevelLabel(r.careLevel)
                  return (
                    <li key={r.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        className="min-h-12 w-full cursor-pointer px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted/60"
                        onClick={() => {
                          onChange(r)
                          setQ("")
                          setOpen(false)
                        }}
                      >
                        <div className="font-medium">{line}</div>
                        <div className="text-xs text-muted-foreground">{sub}</div>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          ) : null}
        </>
      )}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAdminUrlSearchParams } from "@/hooks/use-admin-url-search-params"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

type FacilityOption = { id: string; name: string; organizationId: string }

const STORAGE_KEY = "waik:admin:facilityId"

function applyFacilityToUrl(
  router: { replace: (url: string) => void },
  pathname: string,
  current: URLSearchParams,
  facilityId: string | null,
) {
  const sp = new URLSearchParams(current.toString())
  if (facilityId) sp.set("facilityId", facilityId)
  else sp.delete("facilityId")
  const q = sp.toString()
  router.replace(q ? `${pathname}?${q}` : pathname)
}

/**
 * Top-of-layout facility picker: loads named facilities from the API, optionally scoped by organizationId.
 * Auto-selects when exactly one facility is available, or reuses a valid default / last selection.
 */
export function AdminFacilitySwitcher({ defaultFacilityId }: { defaultFacilityId?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useAdminUrlSearchParams()
  const organizationId = (searchParams.get("organizationId") || "").trim()

  const facilityIdInUrl = (searchParams.get("facilityId") || "").trim()
  const [options, setOptions] = useState<FacilityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const listUrl = useMemo(() => {
    if (organizationId) {
      return `/api/facilities?organizationId=${encodeURIComponent(organizationId)}`
    }
    return "/api/facilities"
  }, [organizationId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(listUrl, { credentials: "include" })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(typeof j.error === "string" ? j.error : "Could not load facilities")
        }
        const data = (await res.json()) as { facilities?: FacilityOption[] }
        if (!cancelled) setOptions(Array.isArray(data.facilities) ? data.facilities : [])
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load facilities"
        if (!cancelled) {
          setOptions([])
          setLoadError(msg)
          toast.error(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [listUrl])

  const inList = useCallback((id: string) => options.some((f) => f.id === id), [options])

  // Sync URL with a valid facility: auto-select when only one exists, or bootstrap from default / last pick.
  useEffect(() => {
    if (loading) return
    if (options.length === 0) return

    if (facilityIdInUrl && inList(facilityIdInUrl)) {
      try {
        localStorage.setItem(STORAGE_KEY, facilityIdInUrl)
      } catch {
        // ignore
      }
      return
    }

    // Exactly one facility in scope — always lock the URL to it.
    if (options.length === 1) {
      const only = options[0]!.id
      if (facilityIdInUrl !== only) {
        applyFacilityToUrl(router, pathname, searchParams, only)
        try {
          localStorage.setItem(STORAGE_KEY, only)
        } catch {
          // ignore
        }
      }
      return
    }

    if (facilityIdInUrl && !inList(facilityIdInUrl)) {
      return
    }

    let pick: string | undefined
    const def = (defaultFacilityId || "").trim()
    if (def && inList(def)) pick = def
    if (!pick) {
      try {
        const s = localStorage.getItem(STORAGE_KEY)?.trim()
        if (s && inList(s)) pick = s
      } catch {
        // ignore
      }
    }
    if (pick) {
      applyFacilityToUrl(router, pathname, searchParams, pick)
      try {
        localStorage.setItem(STORAGE_KEY, pick)
      } catch {
        // ignore
      }
    }
  }, [loading, options, facilityIdInUrl, defaultFacilityId, pathname, router, searchParams, inList])

  const value = facilityIdInUrl
  const invalidUrlId = Boolean(facilityIdInUrl && options.length > 0 && !inList(facilityIdInUrl))
  const labelFor = (id: string) => options.find((f) => f.id === id)?.name ?? id

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 md:px-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Facility</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {organizationId
                ? "Data below is scoped to the facility you select in this organization."
                : "Data below is scoped to the facility you select."}
            </p>
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-md sm:justify-end">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Loading facilities…
              </div>
            ) : (
              <div className="flex w-full min-w-0 flex-1 items-center gap-2">
                <label className="sr-only" htmlFor="admin-facility-select">
                  Select facility
                </label>
                <select
                  id="admin-facility-select"
                  className={cn(
                    "min-h-[44px] w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm",
                    !value && "text-muted-foreground",
                  )}
                  value={inList(value) ? value : ""}
                  disabled={options.length === 0}
                  onChange={(e) => {
                    const next = e.target.value.trim()
                    if (!next) {
                      applyFacilityToUrl(router, pathname, searchParams, null)
                      return
                    }
                    applyFacilityToUrl(router, pathname, searchParams, next)
                    try {
                      localStorage.setItem(STORAGE_KEY, next)
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <option value="">
                    {options.length === 0 ? (loadError ? "Could not load list" : "No facilities") : "Select a facility…"}
                  </option>
                  {options.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        {loadError && !loading ? <p className="mt-3 text-sm text-red-600">{loadError}</p> : null}
        {!loading && !loadError && options.length === 0 && organizationId ? (
          <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">
            <p className="font-medium">No facilities in this organization yet</p>
            <p className="mt-1 text-amber-900/90">
              Add a facility in Super Admin, then return here. Until then, admin analytics and tools need a facility to
              scope to.
            </p>
            <p className="mt-2">
              <a
                className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                href={`/waik-admin/organizations/${encodeURIComponent(organizationId)}/facilities/new`}
              >
                Add facility in Super Admin
              </a>
            </p>
          </div>
        ) : null}
        {!loading && !loadError && options.length === 0 && !organizationId ? (
          <p className="mt-3 text-sm text-amber-800">
            No active facilities are available for your account. If you are a super admin, open an organization from
            Super Admin to scope facilities, or add a facility in that org first.
          </p>
        ) : null}
        {invalidUrlId ? (
          <p className="mt-3 text-sm text-amber-800">
            The facility in the address bar is not in this list. Choose a valid facility to continue.
          </p>
        ) : null}
        {!loading && !value && options.length > 1 ? (
          <p className="mt-3 text-sm text-amber-800">Select a facility to load analytics and the rest of the admin tools.</p>
        ) : null}
        {value && inList(value) ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Current: <span className="font-medium text-foreground">{labelFor(value)}</span>
            <span className="tabular-nums text-muted-foreground"> · {value}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}

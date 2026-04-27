import { useCallback, useEffect, useRef, useState } from "react"

type SaveState = "idle" | "pending" | "saving" | "saved" | "error"

/**
 * 30s debounce after the last `schedule` call, then `save` runs with that payload.
 * Use `saveNow` to persist immediately. Clears the timer on unmount (no flush, to avoid duplicate posts).
 */
export function useDebouncedPhase2SectionSave(
  save: (body: Record<string, unknown>) => Promise<unknown>,
  options?: { debounceMs?: number },
) {
  const debounceMs = options?.debounceMs ?? 30_000
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<SaveState>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const saveNow = useCallback(
    async (body: Record<string, unknown>) => {
      clearTimer()
      setState("saving")
      try {
        await save(body)
        setState("saved")
        setLastSavedAt(new Date())
        return
      } catch {
        setState("error")
      }
    },
    [save, clearTimer],
  )

  const schedule = useCallback(
    (body: Record<string, unknown>) => {
      setState("pending")
      clearTimer()
      timerRef.current = setTimeout(() => {
        void saveNow(body)
        timerRef.current = null
      }, debounceMs)
    },
    [clearTimer, debounceMs, saveNow],
  )

  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  return { schedule, saveNow, clearTimer, state, lastSavedAt }
}

import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"

const DB_NAME = "waik-offline"
const STORE = "incident-post-queue"
const DB_VERSION = 1

export type QueuedIncident = { id: string; payload: object; queuedAt: string }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
  })
}

export async function addToQueue(payload: object): Promise<string> {
  const id = uuidv4()
  const entry: QueuedIncident = { id, payload, queuedAt: new Date().toISOString() }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(entry)
  })
}

export async function getQueue(): Promise<QueuedIncident[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as QueuedIncident[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).delete(id)
  })
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && e.name === "AbortError")
}

function postOne(payload: object): Promise<Response> {
  return fetch("/api/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  })
}

export async function flushQueue(): Promise<{ flushed: number; failed: number }> {
  const items = await getQueue()
  let flushed = 0
  let failed = 0
  for (const item of items) {
    try {
      const res = await postOne(item.payload)
      if (res.ok) {
        await removeFromQueue(item.id)
        flushed += 1
      } else {
        failed += 1
      }
    } catch (e) {
      if (isNetworkError(e)) {
        break
      }
      failed += 1
    }
  }
  return { flushed, failed }
}

let onlineListenerBound = false

function toastFlushResult(flushed: number, failed: number): void {
  if (flushed > 0) {
    toast.success(`${flushed} saved report${flushed === 1 ? "" : "s"} synced successfully`)
  }
  if (failed > 0) {
    toast.error("Some queued reports could not be synced. We'll retry when you're online.")
  }
}

async function flushWithToast(): Promise<void> {
  const { flushed, failed } = await flushQueue()
  toastFlushResult(flushed, failed)
}

function bindOnlineFlush(): void {
  if (typeof window === "undefined" || onlineListenerBound) return
  onlineListenerBound = true
  window.addEventListener("online", () => {
    void flushWithToast()
  })
}

/** Call once from a client component in the root layout so flushes run after reconnect. */
export function initOfflineQueueListeners(): void {
  bindOnlineFlush()
  if (typeof window !== "undefined" && navigator.onLine) {
    void flushWithToast()
  }
}

/**
 * Try POST /api/incidents; on real network failure, queue for later and show a calm offline toast.
 */
export async function postIncidentOrQueue(payload: object): Promise<
  | { ok: true; response: Response }
  | { ok: false; queued: true; queueId: string }
  | { ok: false; error: string }
> {
  initOfflineQueueListeners()
  try {
    const response = await postOne(payload)
    if (response.ok) {
      return { ok: true, response }
    }
    const errJson = (await response.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: errJson.error ?? "Request failed" }
  } catch (e) {
    if (isNetworkError(e) || (typeof navigator !== "undefined" && !navigator.onLine)) {
      const queueId = await addToQueue(payload)
      return { ok: false, queued: true, queueId }
    }
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" }
  }
}

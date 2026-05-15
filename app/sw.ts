/// <reference types="@serwist/next/typings" />
import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, RouteMatchCallbackOptions, RuntimeCaching, SerwistGlobalConfig } from "serwist"
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

self.addEventListener("push", (event: PushEvent) => {
  let title = "WAiK"
  let body = "You have a new notification."
  let urlPath = "/staff/dashboard"

  try {
    const txt = event.data?.text()
    const raw = txt ? JSON.parse(txt) : {}
    title = typeof raw.title === "string" ? raw.title : title
    body = typeof raw.body === "string" ? raw.body : body
    if (typeof raw.url === "string") {
      try {
        const u = new URL(raw.url)
        urlPath = u.pathname + u.search + u.hash
      } catch {
        urlPath = raw.url.startsWith("/") ? raw.url : `/${raw.url}`
      }
    }
  } catch {
    //
  }

  const abs = new URL(urlPath, self.location.origin).href

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      data: { url: abs },
    }),
  )
})

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close()

  let target = `${self.location.origin}/staff/dashboard`
  const rawUrl = event.notification?.data?.url as string | undefined

  try {
    if (rawUrl) {
      const u = new URL(rawUrl, self.location.origin)
      target = u.href
    }
  } catch {
    //
  }

  event.waitUntil(
    (async () => {
      if (typeof self.clients.openWindow === "function") {
        await self.clients.openWindow(target)
      }
    })(),
  )
})

const exp = (maxEntries: number) =>
  new ExpirationPlugin({
    maxEntries,
    maxAgeSeconds: 24 * 60 * 60,
    maxAgeFrom: "last-used",
  })

const apiMethods: Array<"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"> = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]

const customRuntimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url }: RouteMatchCallbackOptions) =>
      sameOrigin &&
      (url.pathname === "/staff/dashboard" ||
        url.pathname === "/admin/dashboard" ||
        url.pathname.startsWith("/staff/dashboard/") ||
        url.pathname.startsWith("/admin/dashboard/")),
    handler: new StaleWhileRevalidate({
      cacheName: "waik-dashboards",
      plugins: [exp(16)],
    }),
  },
  {
    matcher: /\/_next\/static\//i,
    handler: new CacheFirst({
      cacheName: "waik-next-static-all",
      plugins: [exp(128)],
    }),
  },
  ...apiMethods.map((method) => ({
    method,
    matcher: ({ sameOrigin, url }: RouteMatchCallbackOptions) => sameOrigin && url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "waik-apis",
      networkTimeoutSeconds: 10,
      plugins: [exp(48)],
    }),
  })),
  ...defaultCache,
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customRuntimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()

/// <reference types="@serwist/next/typings" />
import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist"
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

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
    matcher: ({ sameOrigin, url: { pathname } }) =>
      sameOrigin &&
      (pathname === "/staff/dashboard" ||
        pathname === "/admin/dashboard" ||
        pathname.startsWith("/staff/dashboard/") ||
        pathname.startsWith("/admin/dashboard/")),
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
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/"),
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

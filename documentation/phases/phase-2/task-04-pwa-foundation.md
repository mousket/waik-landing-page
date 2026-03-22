# Task: PWA Foundation
## Phase: 2
## Depends On: task-03-production-bugs
## Estimated Time: 4 hours

## Context Files
- package.json (add @serwist/next, serwist)
- next.config.js (serwist config)
- public/manifest.json (create)
- app/offline/page.tsx (create)
- lib/offline-queue.ts (create)
- components/pwa-install-prompt.tsx (create)
- app/layout.tsx (manifest, theme-color)
- public/icons/* (create placeholders)

## Success Criteria
- [ ] manifest.json exists with name, icons, shortcuts, theme_color
- [ ] Serwist configured with NetworkFirst (api), StaleWhileRevalidate (dashboards), CacheFirst (static)
- [ ] Offline page shows when offline; lists queued reports from IndexedDB
- [ ] lib/offline-queue.ts: addToQueue, getQueue, removeFromQueue, flushQueue
- [ ] PWA install prompt component; iOS instructions when applicable
- [ ] Placeholder icons in public/icons/

## Test Cases
- Load app → manifest linked, theme-color meta present
- Go offline → offline page appears
- POST incident while offline → queued; flush on online
- Install prompt shows once per device (localStorage)

## Implementation Prompt

```
I'm adding PWA support to my Next.js 14 app called WAiK. The app is deployed on Vercel.

WHAT I NEED:

1. Install @serwist/next and serwist (the maintained App Router fork of next-pwa):
   npm install @serwist/next serwist

2. Create public/manifest.json:
{
  "name": "WAiK — Conversations not Checkboxes",
  "short_name": "WAiK",
  "description": "Voice-first clinical documentation for senior care",
  "start_url": "/staff/dashboard",
  "display": "standalone",
  "background_color": "#0A3D40",
  "theme_color": "#0D7377",
  "orientation": "portrait-primary",
  "categories": ["medical", "productivity"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [],
  "shortcuts": [
    {
      "name": "Report Incident",
      "url": "/staff/report",
      "icons": [{ "src": "/icons/shortcut-report.png", "sizes": "96x96" }]
    }
  ]
}

3. Configure serwist in next.config.js with these caching strategies:
   - NetworkFirst for all /api/* routes (fresh data, graceful offline)
   - StaleWhileRevalidate for /staff/dashboard and /admin/dashboard
   - CacheFirst for static assets (/_next/static/*)
   - Precache the offline fallback page

4. Create app/offline/page.tsx:
   Simple page showing:
   "You're offline. Any reports you started have been saved and will sync when you reconnect."
   Show a list of any queued offline reports (from IndexedDB)

5. Create lib/offline-queue.ts:
   Uses IndexedDB to store pending incident payloads when POST /api/incidents fails due to network
   - addToQueue(payload: CreateIncidentPayload): Promise<string> — returns a local ID
   - getQueue(): Promise<QueuedIncident[]>
   - removeFromQueue(id: string): Promise<void>
   - flushQueue(): Promise<void> — called on 'online' event, retries all queued posts
   Show a toast when queued reports sync successfully

6. Create components/pwa-install-prompt.tsx:
   Listens for beforeinstallprompt event
   Shows a subtle bottom banner: "Add WAiK to your home screen for the best experience"
   Has "Add" and "Not now" buttons
   Only shows once per device (dismissed state in localStorage key "waik-pwa-prompt-dismissed")
   Works on iOS too: detect iOS and show manual instructions ("Tap Share → Add to Home Screen")

7. Create placeholder teal (#0D7377) square PNG icons at:
   public/icons/icon-192.png (192x192)
   public/icons/icon-512.png (512x512)
   public/icons/icon-512-maskable.png (512x512)
   public/icons/shortcut-report.png (96x96)
   Generate these programmatically using the canvas API in a setup script.

8. Add <link rel="manifest"> and <meta name="theme-color"> to app/layout.tsx
```

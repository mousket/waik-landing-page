# Task 04 — PWA Foundation
## Phase: 2 — Core Hardening
## Estimated Time: 3–4 hours
## Depends On: task-01, task-02, task-03

---

## Why This Task Exists

WAiK is marketed as a mobile-first tool for nurses to use on their phones during
a shift. Without PWA support, it is a website that requires a browser address
bar, cannot be pinned to the home screen, and has no offline capability. When a
nurse is in a wing with poor WiFi, a single failed request breaks her entire
report session.

This task makes WAiK feel like a real app and ensures reports survive spotty
hospital-grade WiFi.

---

## Context Files

Read these before starting:
- `app/layout.tsx` — needs manifest link and theme-color meta
- `next.config.js` — needs serwist configuration
- `public/` — icons and manifest.json go here

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `public/manifest.json` exists with correct WAiK metadata
- [ ] On Chrome Android: "Add to Home Screen" prompt appears or is accessible via browser menu
- [ ] On iOS Safari: app can be added to home screen via Share → Add to Home Screen
- [ ] App opens in standalone mode (no browser chrome) when launched from home screen
- [ ] When the network is offline: navigating to any cached route shows the page, not an error
- [ ] When the network is offline: navigating to an uncached route shows `app/offline/page.tsx`
- [ ] `lib/offline-queue.ts` exists with `addToQueue`, `getQueue`, `removeFromQueue`, `flushQueue`
- [ ] When `POST /api/incidents` fails due to network error, the payload is saved to IndexedDB queue
- [ ] When connectivity returns, queued reports are automatically retried and a success toast appears
- [ ] PWA install prompt banner appears once on first visit (not on subsequent visits)
- [ ] Icons exist at `public/icons/icon-192.png` and `public/icons/icon-512.png`

---

## Test Cases

```
TEST 1 — Manifest is served
  Action: Navigate to /manifest.json in browser
  Expected: Valid JSON with name "WAiK — Conversations not Checkboxes"
  Pass/Fail: ___

TEST 2 — App installs on Android
  Action: Open app in Chrome on Android device
  Expected: Browser shows install prompt or install option in menu
  Pass/Fail: ___

TEST 3 — Standalone mode
  Action: Install app to home screen, launch from home screen
  Expected: No browser address bar visible
  Pass/Fail: ___

TEST 4 — Offline cached route
  Action: Load /staff/dashboard, then toggle airplane mode, then refresh
  Expected: Page loads from cache (stale content, no error)
  Pass/Fail: ___

TEST 5 — Offline uncached route
  Action: With airplane mode on, navigate to a route not yet visited
  Expected: /offline page appears with the sync message
  Pass/Fail: ___

TEST 6 — Offline queue
  Action: With airplane mode on, submit an incident report
  Expected: No error shown to user; a "saved offline" toast appears
           IndexedDB contains the queued payload
  Pass/Fail: ___

TEST 7 — Queue flushes on reconnect
  Action: After TEST 6, turn airplane mode off
  Expected: Queued incident is automatically posted; success toast appears
  Pass/Fail: ___

TEST 8 — Install prompt shown once
  Action: Visit app twice in the same browser
  Expected: Install prompt banner only appears on first visit
  Pass/Fail: ___
```

---

## Implementation Prompt

Paste this into Cursor Agent mode:

```
I'm adding PWA support to my Next.js 14 app called WAiK. The app is deployed on Vercel.

WHAT I NEED:

1. Install serwist for App Router PWA support:
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
  "shortcuts": [
    {
      "name": "Report Incident",
      "url": "/staff/report",
      "icons": [{ "src": "/icons/shortcut-report.png", "sizes": "96x96" }]
    }
  ]
}

3. Configure serwist in next.config.js:
   - NetworkFirst strategy for /api/* routes
   - StaleWhileRevalidate for /staff/dashboard and /admin/dashboard
   - CacheFirst for /_next/static/* assets
   - Precache /offline as the fallback page

4. Create app/offline/page.tsx:
   Message: "You're offline. Any reports you started have been saved and will sync when you reconnect."
   Show a list of queued reports from IndexedDB if any exist.

5. Create lib/offline-queue.ts using IndexedDB:
   - addToQueue(payload: object): Promise<string> — stores payload, returns local ID
   - getQueue(): Promise<Array<{ id: string, payload: object, queuedAt: string }>>
   - removeFromQueue(id: string): Promise<void>
   - flushQueue(): Promise<{ flushed: number, failed: number }> — retries all queued POST /api/incidents

   Call flushQueue() automatically when the 'online' event fires on window.
   Show a toast: "X saved report(s) synced successfully" when flush completes.
   If a queued report fails during flush, keep it in the queue and show an error toast.

6. Create components/pwa-install-prompt.tsx:
   - Listen for beforeinstallprompt event, store the deferredPrompt
   - Show a bottom banner: "Add WAiK to your home screen for the best experience"
   - "Add" button triggers deferredPrompt.prompt()
   - "Not now" dismisses and sets localStorage key "waik-pwa-dismissed" to "true"
   - Check this key on mount — if present, never show the banner
   - For iOS: detect iOS user agent and show manual instructions instead of the prompt

7. Create placeholder icons using a Node.js script scripts/generate-icons.js:
   - Uses the canvas package to draw a solid teal (#0D7377) square
   - Generates: public/icons/icon-192.png, icon-512.png, icon-512-maskable.png, shortcut-report.png
   - Run it once: node scripts/generate-icons.js

8. Add to app/layout.tsx <head>:
   <link rel="manifest" href="/manifest.json" />
   <meta name="theme-color" content="#0D7377" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

---

## Post-Task Documentation Update

After passing all test cases:
- Create `plan/pilot_1/phase_2/task-04-DONE.md`

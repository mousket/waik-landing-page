# AGENTS.md

## Cursor Cloud specific instructions

WAiK is a Next.js 15 marketing landing page + authenticated staff/admin PWA for voice-first
healthcare incident reporting and AI-assisted investigation. Product docs live under
`documentation/`; standard scripts are in `package.json`. The notes below only cover non-obvious
caveats.

### Package manager
- Use **npm with `--legacy-peer-deps`** (`npm install --legacy-peer-deps`), per
  `documentation/agentic_documentation/PROJECT_SETUP.md`. Both `package-lock.json` and
  `pnpm-lock.yaml` are committed (Vercel deploys with pnpm); avoid letting them drift. The startup
  update script runs `npm install --legacy-peer-deps`.

### Running
- `npm run dev` boots with **no env vars** (port 3000; `predev` deletes `.next` first). The
  landing page `/` is public; most routes are protected by Clerk `middleware.ts` and return a
  `307` redirect to `/sign-in` when unauthenticated.
- `npm test` runs 159 Vitest unit tests (incident/investigation logic, PDF templates, etc.) and
  needs **no external services**.
- `server.js` is only used by `npm start` (production hosting); use `npm run dev` for development.
- `npm run typecheck` has pre-existing errors, and `next build` ignores TS/ESLint errors by config.

### External services for the full authenticated flow
The staff/admin incident-reporting flow requires external credentials that are **not** provisioned
in this VM:
- **Clerk** auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (+ sign-in/up URL vars).
- **MongoDB**: `DATABASE_URL` (+ `MONGODB_DB_NAME`). MongoDB is **not installed** in the VM —
  point at Atlas or a local mongo you start yourself. `lib/db.ts` throws if Mongo is touched
  without `DATABASE_URL`.
- **Redis**: `REDIS_URL`. Redis **is** installed in the VM; start it with
  `sudo redis-server /etc/redis/redis.conf --daemonize yes` and set
  `REDIS_URL=redis://localhost:6379/0`.
- **OpenAI**: `OPENAI_API_KEY` for AI features.
- Put these in `.env.local`. Note `.env.example` contains what look like real
  Mongo/Clerk/Resend credentials — treat them as compromised and use your own.

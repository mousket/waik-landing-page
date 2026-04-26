import { spawnSync } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import withSerwistInit from "@serwist/next"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, "public")
const swDestBase = "sw.js"

function getOfflineRevision() {
  const g = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" })
  if (g.status === 0 && g.stdout) return g.stdout.trim()
  return process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID()
}

/** Recursive file list under `root`, relative paths with forward slashes. */
function listFilesRecursive(root, prefix = "") {
  if (!fs.existsSync(root)) return []
  const out = []
  for (const name of fs.readdirSync(root)) {
    if (name === ".DS_Store") continue
    const rel = prefix ? `${prefix}/${name}` : name
    const full = path.join(root, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      out.push(...listFilesRecursive(full, rel))
    } else {
      out.push(rel)
    }
  }
  return out
}

/** Matches @serwist/next default public scan + /offline (fallback must be precached). */
function buildAdditionalPrecacheEntries() {
  const allFiles = listFilesRecursive(publicDir)
  const publicFiles = allFiles.filter(
    (f) =>
      !/^swe-worker-.*\.js$/.test(path.basename(f)) && f !== swDestBase && f !== `${swDestBase}.map`,
  )
  const fromPublic = publicFiles.map((f) => {
    const url = `/${f.replace(/\\/g, "/")}`
    const full = path.join(publicDir, f)
    const revision = createHash("md5").update(fs.readFileSync(full)).digest("hex")
    return { url, revision }
  })
  return [{ url: "/offline", revision: getOfflineRevision() }, ...fromPublic]
}

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: false,
  additionalPrecacheEntries: buildAdditionalPrecacheEntries(),
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withSerwist(nextConfig)

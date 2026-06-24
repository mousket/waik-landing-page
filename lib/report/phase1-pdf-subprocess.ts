import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { IncidentDocument } from "@/backend/src/models/incident.model"

function renderScriptPath(): string {
  return join(process.cwd(), "scripts", "render-phase1-pdf.ts")
}

function pdfRenderCommand(inputPath: string, outputPath: string): {
  command: string
  args: string[]
} {
  const scriptPath = renderScriptPath()
  const localTsxCli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs")
  if (existsSync(localTsxCli)) {
    return {
      command: process.execPath,
      args: [localTsxCli, scriptPath, inputPath, outputPath],
    }
  }
  return {
    command: "npx",
    args: ["tsx", scriptPath, inputPath, outputPath],
  }
}

/**
 * Render PDF in a child Node process so @react-pdf uses an unbundled React tree.
 * Required when called from Next.js API routes (webpack duplicates React).
 */
export async function renderPhase1PdfBufferSubprocess(
  incident: IncidentDocument,
  facilityName: string,
): Promise<Buffer> {
  const id = randomUUID()
  const inputPath = join(tmpdir(), `waik-phase1-in-${id}.json`)
  const outputPath = join(tmpdir(), `waik-phase1-out-${id}.pdf`)

  await writeFile(inputPath, JSON.stringify({ incident, facilityName }))

  try {
    const { command, args } = pdfRenderCommand(inputPath, outputPath)

    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      })

      let stderr = ""
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      child.on("error", reject)
      child.on("close", (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr.trim() || `PDF render subprocess exited with code ${code}`))
      })
    })

    return await readFile(outputPath)
  } finally {
    await Promise.allSettled([unlink(inputPath), unlink(outputPath)])
  }
}

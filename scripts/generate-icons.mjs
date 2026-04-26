/**
 * Generates PWA icon PNGs (teal #0D7377) for local dev and CI.
 * Uses `sharp` instead of `canvas` for portable binary installs.
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "../public/icons")
const TEAL = "#0D7377"

async function makeSquarePng(size, destName) {
  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: TEAL,
    },
  })
    .png()
    .toBuffer()
  await fs.writeFile(path.join(outDir, destName), buf)
  console.log("Wrote", destName, `${size}x${size}`)
}

async function makeShortcutPng() {
  const size = 96
  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: TEAL,
    },
  })
    .png()
    .toBuffer()
  await fs.writeFile(path.join(outDir, "shortcut-report.png"), buf)
  console.log("Wrote shortcut-report.png", `${size}x${size}`)
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  await makeSquarePng(192, "icon-192.png")
  await makeSquarePng(512, "icon-512.png")
  await makeSquarePng(512, "icon-512-maskable.png")
  await makeShortcutPng()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

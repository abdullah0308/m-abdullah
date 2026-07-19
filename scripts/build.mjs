/**
 * Build script for static export (Cloudflare Pages).
 *
 * Moves Payload CMS, dynamic API, and admin directories out of the Next.js
 * app directory before building, then restores them after. This ensures the
 * static export never encounters Node.js-only or force-dynamic routes.
 *
 * Directories hidden during build:
 *   - app/(payload)           — Payload CMS admin + REST API (Node.js only)
 *   - app/(portfolio)/api     — Content editing API (force-dynamic, needs cookies)
 *   - app/(portfolio)/admin   — Edit mode page (uses cookies, needs Payload)
 */
import { rename, access, readdir, readFile, writeFile } from 'fs/promises'
import { execSync } from 'child_process'
import { resolve, extname } from 'path'

const root = process.cwd()

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

/**
 * Cloudflare Pages silently drops deployed files whose paths contain
 * parentheses, so the chunks Next.js emits under
 * `_next/static/chunks/app/(portfolio)/` 404 in production and the page
 * never hydrates. Rename that directory to a parenthesis-free name and
 * rewrite every reference (HTML script tags, webpack runtime maps, RSC
 * flight payloads) to match.
 */
async function fixParenChunkPaths() {
  const outDir  = resolve(root, 'out')
  const badDir  = resolve(outDir, '_next/static/chunks/app/(portfolio)')
  const goodDir = resolve(outDir, '_next/static/chunks/app/portfolio')
  if (!(await exists(badDir))) return

  await rename(badDir, goodDir)

  const textExts = new Set(['.html', '.js', '.txt', '.json'])
  let patched = 0
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(p)
      } else if (textExts.has(extname(entry.name))) {
        const content = await readFile(p, 'utf8')
        if (content.includes('app/(portfolio)/')) {
          await writeFile(p, content.replaceAll('app/(portfolio)/', 'app/portfolio/'))
          patched++
        }
      }
    }
  }
  await walk(outDir)
  console.log(`[build] Renamed (portfolio) chunk dir and patched ${patched} file(s) — Cloudflare Pages drops paths with parentheses`)
}

const moves = [
  { from: resolve(root, 'app/(payload)'),         to: resolve(root, 'app/_payload_bak') },
  { from: resolve(root, 'app/(portfolio)/api'),   to: resolve(root, 'app/_api_bak') },
  { from: resolve(root, 'app/(portfolio)/admin'), to: resolve(root, 'app/_admin_bak') },
]

const moved = []
let failed = false

try {
  for (const { from, to } of moves) {
    if (await exists(from)) {
      await rename(from, to)
      moved.push({ from, to })
      console.log(`[build] Moved ${from.replace(root, '.')} out of build path`)
    }
  }

  execSync('next build', { stdio: 'inherit' })
  await fixParenChunkPaths()
} catch (err) {
  failed = true
  console.error('[build] Build failed:', err.message ?? err)
} finally {
  for (const { from, to } of moved) {
    if (await exists(to)) {
      await rename(to, from)
      console.log(`[build] Restored ${from.replace(root, '.')}`)
    }
  }
  if (failed) process.exit(1)
}

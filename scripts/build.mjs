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
import { rename, access } from 'fs/promises'
import { execSync } from 'child_process'
import { resolve } from 'path'

const root = process.cwd()

async function exists(p) {
  try { await access(p); return true } catch { return false }
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

/**
 * Unified build script.
 *
 * When STATIC_BUILD=true (Cloudflare Pages), temporarily moves directories
 * that contain dynamic/Node.js-only routes out of the Next.js app directory
 * so the static export never sees them. Both directories are always restored
 * in the finally block, even if the build fails.
 *
 * Directories hidden during static export:
 *   - app/(payload)          — Payload CMS admin + REST API (Node.js only)
 *   - app/(portfolio)/api    — Content editing API (force-dynamic, needs cookies)
 *
 * In all other environments, runs `next build` normally.
 */
import { rename, access } from 'fs/promises'
import { execSync } from 'child_process'
import { resolve } from 'path'

const root = process.cwd()

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

if (process.env.STATIC_BUILD === 'true') {
  const moves = [
    { from: resolve(root, 'app/(payload)'),        to: resolve(root, 'app/_payload_bak') },
    { from: resolve(root, 'app/(portfolio)/api'),  to: resolve(root, 'app/_api_bak') },
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

    execSync('next build', {
      stdio: 'inherit',
      env: { ...process.env, STATIC_BUILD: 'true' },
    })
  } catch (err) {
    failed = true
    console.error('[build] Static build failed:', err.message ?? err)
  } finally {
    for (const { from, to } of moved) {
      if (await exists(to)) {
        await rename(to, from)
        console.log(`[build] Restored ${from.replace(root, '.')}`)
      }
    }
    if (failed) process.exit(1)
  }
} else {
  execSync('next build', { stdio: 'inherit' })
}

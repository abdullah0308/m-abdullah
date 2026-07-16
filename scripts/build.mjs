/**
 * Unified build script.
 *
 * When STATIC_BUILD=true (Cloudflare Pages), it:
 *   1. Temporarily moves app/(payload) out of the app directory so Next.js
 *      static export never encounters Payload's dynamic route handlers.
 *   2. Runs `next build` with STATIC_BUILD=true to enable output:export mode.
 *   3. Restores app/(payload) in a finally block regardless of build outcome.
 *
 * In all other environments, it runs `next build` normally.
 */
import { rename, access } from 'fs/promises'
import { execSync } from 'child_process'
import { resolve } from 'path'

const root = process.cwd()

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

if (process.env.STATIC_BUILD === 'true') {
  const payloadDir = resolve(root, 'app/(payload)')
  const payloadBak = resolve(root, 'app/_payload_bak')
  let moved = false
  let failed = false

  try {
    if (await exists(payloadDir)) {
      await rename(payloadDir, payloadBak)
      moved = true
      console.log('[build] Moved app/(payload) out of static export path')
    }
    execSync('next build', {
      stdio: 'inherit',
      env: { ...process.env, STATIC_BUILD: 'true' },
    })
  } catch (err) {
    failed = true
    console.error('[build] Static build failed:', err.message ?? err)
  } finally {
    if (moved && await exists(payloadBak)) {
      await rename(payloadBak, payloadDir)
      console.log('[build] Restored app/(payload)')
    }
    if (failed) process.exit(1)
  }
} else {
  execSync('next build', { stdio: 'inherit' })
}

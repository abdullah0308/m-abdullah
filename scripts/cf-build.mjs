/**
 * Cloudflare Pages build script.
 *
 * Temporarily moves app/(payload) out of the Next.js app directory so the
 * static export (output: 'export') never sees Payload's dynamic route
 * handlers, which can't be statically generated. The directory is always
 * restored in the finally block, even if the build fails.
 */
import { rename, access } from 'fs/promises'
import { execSync } from 'child_process'
import { resolve } from 'path'

const root = process.cwd()
const payloadDir = resolve(root, 'app/(payload)')
const payloadBak = resolve(root, 'app/_payload_bak')

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

let moved = false
let buildFailed = false

try {
  if (await exists(payloadDir)) {
    await rename(payloadDir, payloadBak)
    moved = true
    console.log('[cf-build] Moved app/(payload) out of build path')
  }

  execSync('next build', {
    stdio: 'inherit',
    env: { ...process.env, STATIC_BUILD: 'true' },
  })
} catch (err) {
  buildFailed = true
  console.error('[cf-build] Build failed:', err.message ?? err)
} finally {
  if (moved && await exists(payloadBak)) {
    await rename(payloadBak, payloadDir)
    console.log('[cf-build] Restored app/(payload)')
  }
  if (buildFailed) process.exit(1)
}

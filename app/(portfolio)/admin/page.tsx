import { cookies } from 'next/headers'
import { mergeContent } from '@/lib/mergeContent'
import EditModePage from './EditModePage'
import LoginForm from './LoginForm'
import type { ContentData } from '@/lib/defaultContent'
import { getPayload } from 'payload'
import config from '@payload-config'

async function getAuthUser(token: string) {
  try {
    const payload = await getPayload({ config })
    // Use Payload's own JWT strategy, same logic as internal auth
    const { jwtVerify } = await import('jose')
    const secretKey = new TextEncoder().encode(payload.secret)
    const { payload: decoded } = await jwtVerify(token, secretKey)
    if (!decoded.id || !decoded.collection) return null
    const user = await payload.findByID({
      collection: decoded.collection as 'users',
      id: decoded.id as string,
      depth: 0,
    })
    return user ?? null
  } catch {
    return null
  }
}

async function getContent(): Promise<ContentData> {
  try {
    const payload = await getPayload({ config })
    const global = await payload.findGlobal({ slug: 'site-content' })
    // Merged over the defaults, like the public page, so keys added since
    // the content was last saved (Flocon, the companion lines) are editable.
    return mergeContent(global.data)
  } catch {
    return mergeContent(undefined)
  }
}

export default async function AdminPage() {
  // cookies() is not available in static export (Cloudflare Pages build)
  if (process.env.STATIC_BUILD === 'true') return null;

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (token) {
    const user = await getAuthUser(token)
    if (user) {
      const content = await getContent()
      return <EditModePage initialContent={content} />
    }
  }

  return <LoginForm />
}

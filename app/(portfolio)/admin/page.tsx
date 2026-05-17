import { cookies } from 'next/headers'
import { defaultContent } from '@/lib/defaultContent'
import EditModePage from './EditModePage'
import LoginForm from './LoginForm'
import type { ContentData } from '@/lib/defaultContent'
import { getPayload } from 'payload'
import config from '@payload-config'

async function getAuthUser(token: string) {
  try {
    const payload = await getPayload({ config })
    // Use Payload's own JWT strategy — same logic as internal auth
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
    return (global.data as ContentData) ?? defaultContent
  } catch {
    return defaultContent
  }
}

export default async function AdminPage() {
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

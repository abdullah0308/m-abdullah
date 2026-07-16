import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'
import { setPath } from '@/lib/contentUtils'
import { defaultContent } from '@/lib/defaultContent'

export const dynamic = 'force-dynamic'

async function verifyToken(token: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const { jwtVerify } = await import('jose')
    const secretKey = new TextEncoder().encode(payload.secret)
    const { payload: decoded } = await jwtVerify(token, secretKey)
    if (!decoded.id || !decoded.collection) return false
    const user = await payload.findByID({
      collection: decoded.collection as 'users',
      id: decoded.id as string,
      depth: 0,
    })
    return !!user
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const global = await payload.findGlobal({ slug: 'site-content' })
    return NextResponse.json(global.data ?? defaultContent)
  } catch {
    return NextResponse.json(defaultContent)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const valid = await verifyToken(token)
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { path, value } = await req.json()
    const payload = await getPayload({ config })
    const current = await payload.findGlobal({ slug: 'site-content' })
    const currentData = (current.data as Record<string, unknown>) ?? defaultContent
    const updatedData = setPath(currentData, path, value)

    await payload.updateGlobal({
      slug: 'site-content',
      data: { data: updatedData },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('PATCH /api/content error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

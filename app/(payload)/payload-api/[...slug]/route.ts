import {
  REST_DELETE,
  REST_GET,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'
import config from '@payload-config'

// Required for next output: export (Cloudflare Pages static build)
export const dynamic = 'force-static'

const notAvailable = () => new Response(null, { status: 404 })
const isStatic = process.env.STATIC_BUILD === 'true'

export const GET    = isStatic ? notAvailable : REST_GET(config)
export const POST   = isStatic ? notAvailable : REST_POST(config)
export const DELETE = isStatic ? notAvailable : REST_DELETE(config)
export const PATCH  = isStatic ? notAvailable : REST_PATCH(config)
export const PUT    = isStatic ? notAvailable : REST_PUT(config)

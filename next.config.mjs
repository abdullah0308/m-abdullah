import { withPayload } from '@payloadcms/next/withPayload'

const isStaticBuild = process.env.STATIC_BUILD === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticBuild && { output: 'export' }),
  images: {
    formats: ['image/avif', 'image/webp'],
    ...(isStaticBuild && { unoptimized: true }),
  },
}

export default withPayload(nextConfig)

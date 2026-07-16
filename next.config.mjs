import { withPayload } from '@payloadcms/next/withPayload'

const isStaticBuild = process.env.STATIC_BUILD === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticBuild && { output: 'export' }),
  images: {
    formats: ['image/avif', 'image/webp'],
    ...(isStaticBuild && { unoptimized: true }),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/devicons/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default withPayload(nextConfig)

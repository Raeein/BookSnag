import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'goldenaudiobook.com' },
      { protocol: 'https', hostname: '**.goldenaudiobook.com' },
      { protocol: 'https', hostname: 'goldenaudiobooks.com' },
      { protocol: 'https', hostname: '**.goldenaudiobooks.com' },
      { protocol: 'https', hostname: 'dailyaudiobooks.com' },
      { protocol: 'https', hostname: '**.dailyaudiobooks.com' },
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
  },
}

export default nextConfig

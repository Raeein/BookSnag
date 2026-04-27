import { NextRequest, NextResponse } from 'next/server'
import { assertAllowedUrl, UrlRejectedError } from '@/lib/allowlist'
import { rateLimit } from '@/lib/rate-limit'

const MAX_AUDIO_BYTES = 500 * 1024 * 1024

function isSameOriginRequest(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site')
  if (site) return site === 'same-origin' || site === 'same-site'

  const selfOrigin = req.nextUrl.origin
  const origin = req.headers.get('origin')
  if (origin) return origin === selfOrigin
  const referer = req.headers.get('referer')
  if (referer) {
    try { return new URL(referer).origin === selfOrigin } catch { return false }
  }
  return false
}

export async function GET(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const rl = rateLimit(req, 120)
  if (!rl.ok) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  const raw = req.nextUrl.searchParams.get('url')
  let parsed: URL
  try {
    parsed = assertAllowedUrl(raw)
  } catch (err) {
    const e = err as UrlRejectedError
    return new NextResponse(e.message, { status: e.status ?? 400 })
  }

  const range = req.headers.get('range')
  const upstreamHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'audio/*,*/*;q=0.8',
    'Referer': parsed.origin + '/',
  }
  if (range) upstreamHeaders['Range'] = range

  let upstream: Response
  try {
    upstream = await fetch(parsed.href, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return new NextResponse('Failed to fetch audio', { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse('Upstream error', { status: upstream.status })
  }

  const upstreamLen = upstream.headers.get('content-length')
  if (upstreamLen && Number(upstreamLen) > MAX_AUDIO_BYTES) {
    return new NextResponse('Upstream payload too large', { status: 502 })
  }

  const headers: Record<string, string> = {
    'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/mpeg',
    'Cache-Control': 'private, max-age=3600',
  }
  const pass = ['Content-Length', 'Accept-Ranges', 'Content-Range']
  for (const h of pass) {
    const v = upstream.headers.get(h)
    if (v) headers[h] = v
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers })
}

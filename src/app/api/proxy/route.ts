import { NextRequest, NextResponse } from 'next/server'
import { assertAllowedUrl, UrlRejectedError } from '@/lib/allowlist'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
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
    upstream = await fetch(parsed.href, { headers: upstreamHeaders })
  } catch {
    return new NextResponse('Failed to fetch audio', { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse('Upstream error', { status: upstream.status })
  }

  const headers: Record<string, string> = {
    'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/mpeg',
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  }
  const pass = ['Content-Length', 'Accept-Ranges', 'Content-Range']
  for (const h of pass) {
    const v = upstream.headers.get(h)
    if (v) headers[h] = v
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers })
}

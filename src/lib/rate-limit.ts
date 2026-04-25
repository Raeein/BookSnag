import type { NextRequest } from 'next/server'

type Bucket = { tokens: number; updatedAt: number }

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 60_000
const MAX_KEYS = 5_000

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'anon'
}

export function rateLimit(req: NextRequest, limitPerMinute: number): { ok: true } | { ok: false; retryAfter: number } {
  const key = clientKey(req)
  const now = Date.now()
  const b = buckets.get(key)

  if (!b) {
    if (buckets.size >= MAX_KEYS) buckets.clear()
    buckets.set(key, { tokens: limitPerMinute - 1, updatedAt: now })
    return { ok: true }
  }

  const elapsed = now - b.updatedAt
  const refill = (elapsed / WINDOW_MS) * limitPerMinute
  const tokens = Math.min(limitPerMinute, b.tokens + refill)

  if (tokens < 1) {
    const retryAfter = Math.ceil(((1 - tokens) / limitPerMinute) * (WINDOW_MS / 1000))
    b.tokens = tokens
    b.updatedAt = now
    return { ok: false, retryAfter }
  }

  b.tokens = tokens - 1
  b.updatedAt = now
  return { ok: true }
}

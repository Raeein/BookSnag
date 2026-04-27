import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { assertAllowedUrl, UrlRejectedError } from '@/lib/allowlist'
import { rateLimit } from '@/lib/rate-limit'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 30)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  let url: string
  try {
    const body = await req.json()
    url = body.url
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  let pageURL: URL
  try {
    pageURL = assertAllowedUrl(url)
  } catch (err) {
    const e = err as UrlRejectedError
    return NextResponse.json({ error: e.message }, { status: e.status ?? 400 })
  }

  const MAX_HTML_BYTES = 5 * 1024 * 1024
  let html: string
  try {
    const response = await fetch(pageURL.href, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      return NextResponse.json({ error: 'The page could not be loaded from the website.' }, { status: 502 })
    }
    const len = response.headers.get('content-length')
    if (len && Number(len) > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'Upstream page is too large.' }, { status: 502 })
    }
    html = await response.text()
    if (html.length > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'Upstream page is too large.' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'The website could not be reached.' }, { status: 502 })
  }

  const $ = cheerio.load(html)
  const title = extractTitle($, pageURL)
  const chapters = extractChapters($, pageURL)

  if (chapters.length === 0) {
    return NextResponse.json({ error: 'No audio files were found on this page.' }, { status: 404 })
  }

  return NextResponse.json({ title, chapters })
}

function extractTitle($: ReturnType<typeof cheerio.load>, pageURL: URL): string {
  const selectors = ['h1.entry-title', 'h1.title-post', '.entry-title', '.post-title', 'title']
  for (const sel of selectors) {
    const text = $(sel).first().text().trim()
    if (text) return cleanTitle(text)
  }
  const slug = pageURL.pathname.split('/').filter(Boolean).pop() ?? ''
  return slug.replace(/-/g, ' ').trim() || 'Unknown Book'
}

function cleanTitle(raw: string): string {
  let title = raw
  for (const sep of ['|', '–', '—']) {
    const idx = title.indexOf(sep)
    if (idx !== -1) { title = title.slice(0, idx); break }
  }
  return title.replace(/[/\\?%*:|"<>]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Book'
}

function extractChapters($: ReturnType<typeof cheerio.load>, pageURL: URL): { name: string; url: string }[] {
  const seen = new Set<string>()
  const chapters: { name: string; url: string }[] = []

  $('.wp-audio-shortcode, .wp-audio-shortcode audio, .wp-audio-shortcode source, audio, audio source').each((_, el) => {
    for (const attr of ['src', 'data-src', 'href']) {
      const raw = $(el).attr(attr)?.trim()
      if (!raw) continue
      const resolved = resolveURL(raw, pageURL)
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved)
        const urlObj = new URL(resolved)
        const filename = decodeURIComponent(urlObj.pathname.split('/').pop() ?? '')
        const name = filename.replace(/\.\w+$/, '').replace(/-/g, ' ').trim() || `Part ${chapters.length + 1}`
        chapters.push({ name, url: resolved })
        break
      }
    }
  })

  const digits = Math.max(2, String(chapters.length).length)
  return chapters.map((ch, i) => ({
    name: `${String(i + 1).padStart(digits, '0')} - ${ch.name}`,
    url: ch.url,
  }))
}

function resolveURL(raw: string, baseURL: URL): string | null {
  try {
    if (/^https?:\/\//i.test(raw)) return raw
    return new URL(raw, baseURL).href
  } catch {
    return null
  }
}

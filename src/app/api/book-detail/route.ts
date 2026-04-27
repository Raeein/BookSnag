import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { assertAllowedUrl, UrlRejectedError } from '@/lib/allowlist'
import { rateLimit } from '@/lib/rate-limit'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 30)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const raw = req.nextUrl.searchParams.get('url')
  let pageURL: URL
  try {
    pageURL = assertAllowedUrl(raw)
  } catch (err) {
    const e = err as UrlRejectedError
    return NextResponse.json({ error: e.message }, { status: e.status ?? 400 })
  }

  const MAX_HTML_BYTES = 5 * 1024 * 1024
  let html: string
  try {
    const response = await fetch(pageURL.href, {
      headers: FETCH_HEADERS,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Page could not be loaded.' }, { status: 502 })
    const len = response.headers.get('content-length')
    if (len && Number(len) > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'Upstream page is too large.' }, { status: 502 })
    }
    html = await response.text()
    if (html.length > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'Upstream page is too large.' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Site could not be reached.' }, { status: 502 })
  }

  const $ = cheerio.load(html)

  // Synopsis: collect <p> elements from the content area
  const synopsisParts: string[] = []
  $('.entry-content, .post-content, article').first().find('p').each(function () {
    const text = $(this).text().trim()
    if (text.length > 30) {
      synopsisParts.push(text)
      if (synopsisParts.join('').length > 700) return false
    }
  })

  // Post date
  let postDate: string | null = null
  const $dateEl = $('time.entry-date, time.published, .entry-date time, time[datetime]').first()
  if ($dateEl.length) {
    const dt = $dateEl.attr('datetime') ?? ''
    if (dt) {
      const d = new Date(dt)
      if (!isNaN(d.getTime())) {
        postDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }
    if (!postDate) postDate = $dateEl.text().trim() || null
  }

  // Categories
  const categories: string[] = []
  $('.cat-links a, .entry-categories a, .post-categories a').each(function () {
    const text = $(this).text().trim()
    if (text) categories.push(text)
  })

  // Cover: og:image preferred, then featured image
  let cover: string | null = $('meta[property="og:image"]').attr('content') ?? null
  if (!cover) {
    const $img = $('.entry-featured-image img, .post-thumbnail img, .wp-post-image').first()
    cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || null
  }

  // Chapters with labels
  const seen = new Set<string>()
  const chapters: { label: string; url: string }[] = []
  let idx = 0

  $('.wp-audio-shortcode, .wp-audio-shortcode audio, .wp-audio-shortcode source, audio, audio source').each(function () {
    for (const attr of ['src', 'data-src', 'href']) {
      const raw = $(this).attr(attr)?.trim()
      if (!raw) continue
      const resolved = resolveURL(raw, pageURL)
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved)
        idx++
        // Walk up the DOM to find a nearby heading
        let label = `Part ${idx}`
        let node = $(this).parent()
        for (let i = 0; i < 6; i++) {
          if (!node.length) break
          const text = node.find('h1,h2,h3,h4,strong').first().text().trim()
          if (text) { label = text; break }
          node = node.parent()
        }
        chapters.push({ label, url: resolved })
        break
      }
    }
  })

  return NextResponse.json(
    { synopsis: synopsisParts.join('\n\n'), chapters, postDate, categories, cover },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
  )
}

function resolveURL(raw: string, baseURL: URL): string | null {
  try {
    if (/^https?:\/\//i.test(raw)) return raw
    return new URL(raw, baseURL).href
  } catch {
    return null
  }
}

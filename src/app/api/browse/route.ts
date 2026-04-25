import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { rateLimit } from '@/lib/rate-limit'

const SITES: Record<string, string> = {
  golden: 'https://goldenaudiobook.com',
  daily:  'https://dailyaudiobooks.com',
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 60)
  if (!rl.ok) {
    return NextResponse.json(
      { books: [], hasMore: false, error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const siteName = req.nextUrl.searchParams.get('site') ?? 'golden'
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))

  const baseURL = SITES[siteName] ?? SITES.golden
  const pageURL = page === 1 ? baseURL : `${baseURL}/page/${page}/`

  let html: string
  try {
    const response = await fetch(pageURL, {
      headers: FETCH_HEADERS,
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return NextResponse.json({ books: [], hasMore: false, error: 'Browse page could not be loaded.' }, { status: 502 })
    }
    html = await response.text()
  } catch {
    return NextResponse.json({ books: [], hasMore: false, error: 'The browse site could not be reached.' }, { status: 502 })
  }

  const $ = cheerio.load(html)
  const books: { title: string; url: string; cover?: string }[] = []

  $('.pt-cv-content-item').each((_, item) => {
    const anchor = $(item).find('.pt-cv-title a').first()
    const href = anchor.attr('href')?.trim()
    const title = anchor.text().trim()
    if (!href || !title) return

    let url: string
    try { url = new URL(href, baseURL).href } catch { return }

    const cover = resolveCoverURL($, item, baseURL)
    books.push({ title, url, cover })
  })

  return NextResponse.json(
    { books, hasMore: books.length > 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } },
  )
}

function resolveCoverURL(
  $: ReturnType<typeof cheerio.load>,
  item: Parameters<ReturnType<typeof cheerio.load>>[0],
  baseURL: string,
): string | undefined {
  const attrs = ['data-lazy-src', 'data-src', 'data-lazy-srcset', 'data-srcset', 'src', 'srcset']
  const images = $(item).find('.pt-cv-thumbnail img, img.pt-cv-thumbnail')

  for (const img of images.toArray()) {
    for (const attr of attrs) {
      const raw = $(img).attr(attr)?.trim()
      if (!raw || raw.startsWith('data:')) continue
      const first = raw.split(',')[0].split(' ')[0].trim()
      if (!first) continue
      try { return new URL(first, baseURL).href } catch { continue }
    }
  }
}

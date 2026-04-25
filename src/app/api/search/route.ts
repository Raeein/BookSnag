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
      { error: 'Too many requests.', results: [] },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  const siteName = req.nextUrl.searchParams.get('site') ?? 'golden'

  if (!q) return NextResponse.json({ error: 'Query required.' }, { status: 400 })

  const baseURL = SITES[siteName] ?? SITES.golden
  const searchURL = `${baseURL}/?s=${encodeURIComponent(q)}`

  let html: string
  try {
    const response = await fetch(searchURL, {
      headers: FETCH_HEADERS,
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return NextResponse.json({ error: 'Search page could not be loaded.', results: [] }, { status: 502 })
    }
    html = await response.text()
  } catch {
    return NextResponse.json({ error: 'The search site could not be reached.', results: [] }, { status: 502 })
  }

  const $ = cheerio.load(html)
  const results: { title: string; url: string; cover?: string; site: string }[] = []
  const siteDomain = new URL(baseURL).hostname

  $('article[id^=post-]').each((_, article) => {
    const anchor = $(article).find('h2.title-post a, h1.title-post a, .entry-title a').first()
    const href = anchor.attr('href')?.trim()
    const title = anchor.text().trim()
    if (!href || !title) return

    let url: string
    try { url = new URL(href, baseURL).href } catch { return }

    const cover = resolveCoverURL($, article, baseURL)
    results.push({ title, url, cover, site: siteDomain })
  })

  return NextResponse.json(
    { results },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } },
  )
}

function resolveCoverURL(
  $: ReturnType<typeof cheerio.load>,
  article: Parameters<ReturnType<typeof cheerio.load>>[0],
  baseURL: string,
): string | undefined {
  const attrs = ['data-lazy-src', 'data-src', 'data-lazy-srcset', 'data-srcset', 'src', 'srcset']
  const images = $(article).find('.post-cover img, img')

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

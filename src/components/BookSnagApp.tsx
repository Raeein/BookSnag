'use client'

import { useState, useRef, useEffect, useMemo, type ReactElement } from 'react'
import Image from 'next/image'

type Tab        = 'download' | 'search' | 'browse' | 'settings'
type ScrapeState = 'idle' | 'scraping' | 'downloading' | 'merging' | 'done' | 'error'
type SearchState = 'empty' | 'loading' | 'results' | 'noresults' | 'error'
type BrowseState = 'idle' | 'loading' | 'loaded'
type SiteName   = 'Golden' | 'Daily'
type DetailPhase = 'loading' | 'done' | 'error'
type Theme      = 'light' | 'dark'

interface Chapter    { name: string; url: string }
interface FileItem   { id: number; name: string; pct: number; done: boolean; error?: string }
interface SearchResult { title: string; url: string; cover?: string; site: string }
interface BrowseBook { title: string; url: string; cover?: string }
interface ChapterDetail { label: string; url: string }
interface BookDetailData {
  synopsis: string
  chapters: ChapterDetail[]
  postDate: string | null
  categories: string[]
  cover: string | null
}

const CIRCUMFERENCE = 2 * Math.PI * 38

// ── Icons ──────────────────────────────────────────────────────────────────

const IconDownload = () => (
  <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2v9.5M5.5 8l3.5 3.5L12.5 8M3 14.5h12" />
  </svg>
)

const IconSearch = () => (
  <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="8" cy="8" r="5.5" /><path d="M14.5 14.5l-3.2-3.2" />
  </svg>
)

const IconBrowse = () => (
  <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2"    y="2"    width="5.5" height="5.5" rx="1.2" />
    <rect x="10.5" y="2"    width="5.5" height="5.5" rx="1.2" />
    <rect x="2"    y="10.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.2" />
  </svg>
)

const IconSettings = () => (
  <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="9" cy="9" r="2.5" />
    <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4.1 4.1l1.1 1.1M12.8 12.8l1.1 1.1M13.9 4.1l-1.1 1.1M5.2 12.8l-1.1 1.1" />
  </svg>
)

const IconSun = () => (
  <svg className="theme-toggle-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2" />
  </svg>
)

const IconMoon = () => (
  <svg className="theme-toggle-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" />
  </svg>
)

const NAV_TABS: { tab: Tab; label: string; Icon: () => ReactElement }[] = [
  { tab: 'download', label: 'Download', Icon: IconDownload },
  { tab: 'search',   label: 'Search',   Icon: IconSearch   },
  { tab: 'browse',   label: 'Browse',   Icon: IconBrowse   },
  { tab: 'settings', label: 'Settings', Icon: IconSettings },
]

// ── Component ──────────────────────────────────────────────────────────────

export default function BookSnagApp() {
  const [activeTab, setActiveTab]       = useState<Tab>('download')
  const [indicatorTop, setIndicatorTop] = useState(0)
  const itemRefs = useRef<Partial<Record<Tab, HTMLButtonElement>>>({})

  // Download
  const [urlInput, setUrlInput]             = useState('')
  const [scrapeState, setScrapeState]       = useState<ScrapeState>('idle')
  const [scrapeError, setScrapeError]       = useState<string | null>(null)
  const [overallPct, setOverallPct]         = useState(0)
  const [progressStatus, setProgressStatus] = useState('Preparing…')
  const [progressDetail, setProgressDetail] = useState('')
  const [files, setFiles]                   = useState<FileItem[]>([])
  const [bookTitle, setBookTitle]           = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const mergeBufRef = useRef<(Blob | null)[]>([])

  // Search
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchState, setSearchState]     = useState<SearchState>('empty')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Browse
  const [browseState, setBrowseState]         = useState<BrowseState>('loading')
  const [browseBooks, setBrowseBooks]         = useState<BrowseBook[]>([])
  const [browsePage, setBrowsePage]           = useState(1)
  const [browseHasMore, setBrowseHasMore]     = useState(false)
  const [browseLoadingMore, setBrowseLoadingMore] = useState(false)
  const [browseFilter, setBrowseFilter]       = useState('')
  const browseObserverRef = useRef<IntersectionObserver | null>(null)
  const browseSentinelRef = useRef<HTMLDivElement | null>(null)

  // Settings (persisted to localStorage)
  const [mergeFile, setMergeFile]     = useState(true)
  const [deleteOrig, setDeleteOrig]   = useState(false)
  const [site, setSite]               = useState<SiteName>('Golden')
  const [theme, setTheme]             = useState<Theme>('light')

  // Book detail
  const [selectedBook, setSelectedBook] = useState<{ title: string; url: string; cover?: string } | null>(null)
  const [detailPhase, setDetailPhase]   = useState<DetailPhase>('loading')
  const [detailData, setDetailData]     = useState<BookDetailData | null>(null)
  const [playingChapter, setPlayingChapter] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Completion toast
  const [showToast, setShowToast]   = useState(false)
  const [toastFailed, setToastFailed] = useState(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // iOS-deferred saves (iOS blocks programmatic blob downloads, so collect
  // files and let the user invoke the share sheet via a tap)
  const [pendingFiles, setPendingFiles] = useState<{ blob: Blob; filename: string }[]>([])
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOSDevice(ios)
  }, [])

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem('booksnag_settings')
      if (s) {
        const p = JSON.parse(s)
        if (typeof p.mergeFile === 'boolean') setMergeFile(p.mergeFile)
        if (typeof p.deleteOrig === 'boolean') setDeleteOrig(p.deleteOrig)
        if (p.site === 'Golden' || p.site === 'Daily') setSite(p.site)
      }
    } catch {}
    const applied = document.documentElement.dataset.theme
    if (applied === 'light' || applied === 'dark') setTheme(applied)
  }, [])

  function applyTheme(next: Theme) {
    setTheme(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('booksnag_theme', next) } catch {}
  }

  // Preload browse in the background so the tab is instant when clicked,
  // and refresh when site changes.
  useEffect(() => {
    loadBrowse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site])

  // Persist settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('booksnag_settings', JSON.stringify({ mergeFile, deleteOrig, site }))
    } catch {}
  }, [mergeFile, deleteOrig, site])

  // Sync indicator
  useEffect(() => {
    const el = itemRefs.current[activeTab]
    if (el) setIndicatorTop(el.offsetTop)
  }, [activeTab])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      abortRef.current?.abort()
      audioRef.current?.pause()
      browseObserverRef.current?.disconnect()
    }
  }, [])

  function switchTab(tab: Tab) {
    if (selectedBook) closeDetail()
    setActiveTab(tab)
  }

  function resetDownload() {
    abortRef.current?.abort()
    mergeBufRef.current = []
    setUrlInput('')
    setFiles([])
    setOverallPct(0)
    setBookTitle('')
    setScrapeError(null)
    setProgressStatus('')
    setProgressDetail('')
    setScrapeState('idle')
    setShowToast(false)
    setPendingFiles([])
    setShareError(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }

  // ── Download ───────────────────────────────────────────────────────────

  async function startScrape() {
    const trimmedURL = urlInput.trim()
    if (!trimmedURL || scrapeState === 'scraping' || scrapeState === 'downloading' || scrapeState === 'merging') return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setFiles([])
    setOverallPct(0)
    setScrapeError(null)
    setBookTitle('')
    setPendingFiles([])
    setShareError(null)
    setScrapeState('scraping')
    setProgressStatus('Scraping page…')
    setProgressDetail('Fetching chapter URLs')

    let chapters: Chapter[]
    let title: string

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedURL }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) {
        setScrapeState('error')
        setScrapeError(data.error ?? 'Failed to scrape page.')
        return
      }
      chapters = data.chapters as Chapter[]
      title = data.title as string
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      setScrapeState('error')
      setScrapeError('Could not reach the scraper. Check your connection.')
      return
    }

    setBookTitle(title)
    setFiles(chapters.map((ch, i) => ({ id: i, name: ch.name + '.mp3', pct: 0, done: false })))
    mergeBufRef.current = new Array(chapters.length).fill(null)
    setScrapeState('downloading')
    setProgressStatus('Downloading')
    setProgressDetail(`0 of ${chapters.length} complete`)

    let doneCount = 0
    let failCount = 0
    let index = 0
    let active = 0
    const MAX_CONCURRENT = 3

    await new Promise<void>((resolve) => {
      if (controller.signal.aborted) { resolve(); return }

      const startNext = () => {
        while (active < MAX_CONCURRENT && index < chapters.length) {
          const i = index++
          active++

          downloadChapter(chapters[i], i, controller.signal, (pct) => {
            setFiles(prev => prev.map(f => f.id === i ? { ...f, pct } : f))
          })
            .then(() => {
              doneCount++
              setFiles(prev => prev.map(f => f.id === i ? { ...f, pct: 100, done: true } : f))
              const overall = (doneCount / chapters.length) * 100
              setOverallPct(overall)
              setProgressDetail(`${doneCount} of ${chapters.length} complete`)
            })
            .catch((err: unknown) => {
              if ((err as Error).name === 'AbortError') return
              failCount++
              setFiles(prev => prev.map(f => f.id === i ? { ...f, pct: 0, error: 'Failed' } : f))
            })
            .finally(() => {
              active--
              startNext()
              if (active === 0 && index >= chapters.length) resolve()
            })
        }
        if (active === 0 && index >= chapters.length) resolve()
      }

      startNext()
    })

    if (controller.signal.aborted) return

    if (doneCount === 0) {
      setScrapeState('error')
      setScrapeError(
        chapters.length === 1
          ? 'The chapter could not be downloaded. The source server may be blocking the request.'
          : `All ${chapters.length} chapters failed to download. The source server may be blocking the request.`,
      )
      setProgressStatus('')
      setProgressDetail('')
      mergeBufRef.current = []
      return
    }

    if (mergeFile && doneCount > 1) {
      setScrapeState('merging')
      setProgressStatus('Merging…')
      setProgressDetail('Combining chapters into one file')

      const parts = mergeBufRef.current.filter((b): b is Blob => b !== null)
      if (parts.length > 0) {
        const safeTitle = title.replace(/[/\\?%*:|"<>]/g, ' ').replace(/\s+/g, ' ').trim() || 'audiobook'
        const merged = new Blob(parts, { type: 'audio/mpeg' })
        triggerDownload(merged, `${safeTitle}.mp3`)
      }
      mergeBufRef.current = []
    }

    setOverallPct(100)
    const partial = failCount > 0
    setProgressStatus(partial ? 'Completed with errors' : 'Complete!')
    setProgressDetail(
      partial
        ? `${doneCount} of ${chapters.length} downloaded · ${failCount} failed`
        : mergeFile && doneCount > 1
          ? `${doneCount} chapters merged`
          : `${doneCount} chapters downloaded`,
    )
    setScrapeState('done')

    setToastFailed(failCount)
    setShowToast(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setShowToast(false), 6000)
  }

  async function downloadChapter(
    chapter: Chapter,
    id: number,
    signal: AbortSignal,
    onProgress: (pct: number) => void,
  ): Promise<void> {
    const proxyURL = `/api/proxy?url=${encodeURIComponent(chapter.url)}`
    const response = await fetch(proxyURL, { signal })
    if (!response.ok) throw new Error('Download failed')

    const contentLength = response.headers.get('Content-Length')
    const total = contentLength ? parseInt(contentLength, 10) : null
    const reader = response.body!.getReader()
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let received = 0

    const IDLE_TIMEOUT_MS = 30000
    while (true) {
      const idle = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Stalled')), IDLE_TIMEOUT_MS),
      )
      let result: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>
      try {
        result = await Promise.race([reader.read(), idle])
      } catch {
        reader.cancel().catch(() => {})
        throw new Error('Download stalled')
      }
      if (result.done) break
      if (signal.aborted) {
        reader.cancel()
        throw new DOMException('Aborted', 'AbortError')
      }
      chunks.push(result.value)
      received += result.value.length
      if (total) onProgress((received / total) * 100)
    }

    const blob = new Blob(chunks, { type: 'audio/mpeg' })
    if (mergeFile) {
      mergeBufRef.current[id] = blob
      if (deleteOrig) triggerDownload(blob, chapter.name + '.mp3')
    } else {
      triggerDownload(blob, chapter.name + '.mp3')
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    if (isIOSDevice) {
      setPendingFiles(prev => [...prev, { blob, filename }])
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function savePendingFiles() {
    if (pendingFiles.length === 0) return
    setShareError(null)
    const files = pendingFiles.map(
      p => new File([p.blob], p.filename, { type: p.blob.type || 'audio/mpeg' }),
    )
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
    if (nav.canShare && nav.canShare({ files })) {
      try {
        await nav.share({ files } as ShareData)
        setPendingFiles([])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setShareError('Sharing failed. Long-press a file to save it instead.')
        }
      }
      return
    }
    for (const p of pendingFiles) {
      const url = URL.createObjectURL(p.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = p.filename
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    setPendingFiles([])
  }

  function cancelScrape() {
    abortRef.current?.abort()
    setScrapeState('idle')
    setProgressStatus('')
    setProgressDetail('')
  }

  // ── Search ─────────────────────────────────────────────────────────────

  function handleSearch(val: string) {
    setSearchQuery(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)

    if (!val.trim()) { setSearchState('empty'); return }

    setSearchState('loading')
    searchTimer.current = setTimeout(async () => {
      try {
        const siteParam = site === 'Daily' ? 'daily' : 'golden'
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}&site=${siteParam}`)
        const data = await res.json()

        if (!res.ok || !data.results || data.results.length === 0) {
          setSearchState('noresults')
          return
        }

        setSearchResults(data.results as SearchResult[])
        setSearchState('results')
      } catch {
        setSearchState('error')
      }
    }, 260)
  }

  // ── Browse ─────────────────────────────────────────────────────────────

  async function loadBrowse() {
    setBrowseState('loading')
    setBrowseFilter('')
    setBrowsePage(1)
    setBrowseHasMore(false)
    try {
      const siteParam = site === 'Daily' ? 'daily' : 'golden'
      const res = await fetch(`/api/browse?site=${siteParam}&page=1`)
      const data = await res.json()
      setBrowseBooks(data.books ?? [])
      setBrowseHasMore(data.hasMore ?? false)
      setBrowseState('loaded')
    } catch {
      setBrowseBooks([])
      setBrowseState('loaded')
    }
  }

  async function loadMoreBrowse() {
    if (browseLoadingMore || !browseHasMore) return
    setBrowseLoadingMore(true)
    try {
      const siteParam = site === 'Daily' ? 'daily' : 'golden'
      const nextPage = browsePage + 1
      const res = await fetch(`/api/browse?site=${siteParam}&page=${nextPage}`)
      const data = await res.json()
      const newBooks = (data.books ?? []) as BrowseBook[]
      setBrowseBooks(prev => {
        const seen = new Set(prev.map(b => b.url))
        const deduped = newBooks.filter(b => !seen.has(b.url))
        // If the site returned no new books, treat as end of pagination.
        if (deduped.length === 0) setBrowseHasMore(false)
        else setBrowseHasMore(data.hasMore ?? false)
        return [...prev, ...deduped]
      })
      setBrowsePage(nextPage)
    } catch {
      // silently fail
    } finally {
      setBrowseLoadingMore(false)
    }
  }

  useEffect(() => {
    browseObserverRef.current?.disconnect()
    // Pause infinite scroll while a filter is active — pagination loads more
    // from the server, but the filter is purely client-side, so loading more
    // pages won't help and would loop forever as the sentinel stays in view.
    if (!browseHasMore || browseLoadingMore || browseFilter.trim()) return
    browseObserverRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreBrowse() },
      { rootMargin: '200px' },
    )
    if (browseSentinelRef.current) browseObserverRef.current.observe(browseSentinelRef.current)
    return () => browseObserverRef.current?.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseHasMore, browseLoadingMore, browsePage, site, browseFilter])

  function openInDownload(url: string) {
    setUrlInput(url)
    switchTab('download')
  }

  // ── Book detail ────────────────────────────────────────────────────────

  async function openDetail(book: { title: string; url: string; cover?: string }) {
    stopAudio()
    setSelectedBook(book)
    setDetailPhase('loading')
    setDetailData(null)
    try {
      const res = await fetch(`/api/book-detail?url=${encodeURIComponent(book.url)}`)
      const data = await res.json()
      if (!res.ok) { setDetailPhase('error'); return }
      setDetailData(data as BookDetailData)
      setDetailPhase('done')
    } catch {
      setDetailPhase('error')
    }
  }

  function closeDetail() {
    stopAudio()
    setSelectedBook(null)
  }

  function stopAudio() {
    audioRef.current?.pause()
    setPlayingChapter(null)
  }

  function toggleChapter(url: string) {
    if (playingChapter === url) {
      audioRef.current?.pause()
      setPlayingChapter(null)
      return
    }
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.pause()
    audioRef.current.src = `/api/proxy?url=${encodeURIComponent(url)}`
    audioRef.current.play().catch(() => {})
    audioRef.current.onended = () => setPlayingChapter(null)
    setPlayingChapter(url)
  }

  function downloadFromDetail() {
    const url = selectedBook!.url
    closeDetail()
    openInDownload(url)
  }

  // ── Derived ────────────────────────────────────────────────────────────

  const displayedBrowseBooks = useMemo(() => {
    if (!browseFilter.trim()) return browseBooks
    const q = browseFilter.trim().toLowerCase()
    return browseBooks.filter(b => b.title.toLowerCase().includes(q))
  }, [browseBooks, browseFilter])

  const ringOffset   = CIRCUMFERENCE - (overallPct / 100) * CIRCUMFERENCE
  const showProgress = scrapeState !== 'idle'

  const scrapeBtnText =
    scrapeState === 'scraping'    ? 'Scraping…'   :
    scrapeState === 'downloading' ? 'Downloading' :
    scrapeState === 'merging'     ? 'Merging…'    : 'Scrape'

  const isWorking = scrapeState === 'scraping' || scrapeState === 'downloading' || scrapeState === 'merging'

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">⬇</div>
          <div className="logo-text">BookSnag</div>
        </div>

        <div className="nav-container">
          <div className="nav-indicator" style={{ top: indicatorTop }} />

          {NAV_TABS.map(({ tab, label, Icon }) => (
            <button
              key={tab}
              ref={el => { if (el) itemRefs.current[tab] = el }}
              className={`nav-item${activeTab === tab ? ' active' : ''}`}
              onClick={() => switchTab(tab)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="theme-toggle" role="group" aria-label="Theme">
            <button
              type="button"
              className={`theme-toggle-btn${theme === 'light' ? ' active' : ''}`}
              aria-pressed={theme === 'light'}
              onClick={() => applyTheme('light')}
            >
              <IconSun />
              Light
            </button>
            <button
              type="button"
              className={`theme-toggle-btn${theme === 'dark' ? ' active' : ''}`}
              aria-pressed={theme === 'dark'}
              onClick={() => applyTheme('dark')}
            >
              <IconMoon />
              Dark
            </button>
          </div>
          <div className="version-tag">v1.0.0</div>
          <div className="sidebar-footer-links">
            <a href="/disclaimer">Disclaimer</a>
            <span className="dot">·</span>
            <a href="https://github.com/raeeinbagheri/BookSnag" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className="dot">·</span>
            <span>MIT</span>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="main">

        {/* Download Tab */}
        <div className={`tab-panel${activeTab === 'download' ? ' active' : ''}`}>
          <div className="tab-header">
            <div className="tab-title">Download</div>
            <div className="tab-subtitle">Paste a book URL to scrape and download chapters</div>
          </div>

          <div className="url-row">
            <input
              className="url-input"
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startScrape()}
              placeholder="https://goldenaudiobook.com/book/..."
            />
            <div className="scrape-wrapper">
              {isWorking ? (
                <button className="scrape-btn loading" onClick={cancelScrape}>
                  Cancel
                </button>
              ) : scrapeState === 'done' ? (
                <button className="scrape-btn" onClick={resetDownload}>
                  Start Over
                </button>
              ) : (
                <button
                  className="scrape-btn"
                  onClick={startScrape}
                  disabled={!urlInput.trim()}
                >
                  {scrapeBtnText}
                </button>
              )}
            </div>
          </div>

          {pendingFiles.length > 0 && (
            <div className="save-banner">
              <div className="save-banner-text">
                <div className="save-banner-title">
                  {pendingFiles.length === 1
                    ? 'Audiobook ready to save'
                    : `${pendingFiles.length} files ready to save`}
                </div>
                <div className="save-banner-sub">
                  Tap Save to open the share sheet — choose &quot;Save to Files&quot; to keep on your device.
                </div>
                {shareError && (
                  <div className="save-banner-err">{shareError}</div>
                )}
              </div>
              <button className="scrape-btn save-banner-btn" onClick={savePendingFiles}>
                Save
              </button>
            </div>
          )}

          {scrapeState === 'error' && scrapeError && (
            <div className="glass-card" style={{ marginBottom: 14, padding: '12px 16px', color: '#ff6b6b', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span>{scrapeError}</span>
              <button
                className="scrape-btn"
                style={{ fontSize: 12, padding: '6px 14px', minHeight: 'auto' }}
                onClick={startScrape}
                disabled={!urlInput.trim()}
              >
                Retry
              </button>
            </div>
          )}

          {mergeFile && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Merging runs in your browser. Large audiobooks may take a few minutes and use your device&apos;s memory.
            </div>
          )}

          {showProgress && scrapeState !== 'error' && (
            <div className="glass-card progress-card" style={{ marginBottom: 14 }}>
              <div className="ring-wrap">
                <svg width="82" height="82" viewBox="0 0 82 82">
                  <defs>
                    <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d4aa" />
                      <stop offset="100%" stopColor="#7c6fff" />
                    </linearGradient>
                  </defs>
                  <circle className="ring-bg" cx="41" cy="41" r="38" />
                  <circle className="ring-fill" cx="41" cy="41" r="38" style={{ strokeDashoffset: ringOffset }} />
                </svg>
                <div className="ring-label">
                  <div className="ring-pct">{Math.round(overallPct)}%</div>
                  <div className="ring-sub">done</div>
                </div>
              </div>
              <div>
                <div className="ring-info-title">{progressStatus}</div>
                {bookTitle && <div className="ring-info-sub" style={{ color: 'var(--accent-teal)', marginBottom: 2 }}>{bookTitle}</div>}
                <div className="ring-info-sub">{progressDetail}</div>
              </div>
            </div>
          )}

          <div className="file-list">
            {files.map((f, i) => (
              <div
                key={f.id}
                className={`file-row${f.done ? ' done-dl' : f.error ? '' : ' active-dl'}`}
                style={{ animationDelay: `${Math.min(i, 10) * 0.015}s` }}
              >
                <div className="file-icon">{f.done ? '✅' : f.error ? '❌' : '🎵'}</div>
                <div className="file-meta">
                  <div className="file-name">{f.name}</div>
                  {!f.error && (
                    <div className="file-bar">
                      <div className="file-bar-fill" style={{ width: `${f.pct}%` }} />
                    </div>
                  )}
                  {f.error && <div style={{ fontSize: 11, color: '#ff6b6b', marginTop: 2 }}>{f.error}</div>}
                </div>
                <div className={`file-pct${f.done ? ' done' : ''}`}>
                  {f.done ? '✓' : f.error ? '' : `${Math.round(f.pct)}%`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search Tab */}
        <div className={`tab-panel${activeTab === 'search' ? ' active' : ''}`}>
          <div className="tab-header">
            <div className="tab-title">Search</div>
            <div className="tab-subtitle">Find audiobooks across supported sites</div>
          </div>

          <div className="search-wrap">
            <svg className="search-ico" width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8" cy="8" r="5.5" /><path d="M14.5 14.5l-3.2-3.2" />
            </svg>
            <input
              className="search-input"
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search for audiobooks…"
            />
          </div>

          <div className="results-grid">
            {searchState === 'empty' && (
              <div className="empty" style={{ gridColumn: '1/-1' }}>
                <div className="empty-emoji">🎧</div>
                <div className="empty-msg">Type to search for audiobooks</div>
              </div>
            )}
            {searchState === 'loading' && [0,1,2,3].map(i => (
              <div key={i} className="skel-card">
                <div className="skel skel-cover" style={{ aspectRatio: '1' }} />
                <div className="skel-body">
                  <div className="skel skel-line" />
                  <div className="skel skel-line short" />
                </div>
              </div>
            ))}
            {(searchState === 'noresults' || searchState === 'error') && (
              <div className="empty" style={{ gridColumn: '1/-1' }}>
                <div className="empty-emoji">😶</div>
                <div className="empty-msg">
                  {searchState === 'error' ? 'Search failed. Try again.' : `No results for "${searchQuery}"`}
                </div>
              </div>
            )}
            {searchState === 'results' && searchResults.map((b, i) => (
              <div
                key={b.url}
                className="result-card"
                style={{ animationDelay: `${Math.min(i, 10) * 0.02}s` }}
                onClick={() => openDetail(b)}
              >
                <div
                  className="result-thumb"
                  style={b.cover
                    ? { padding: 0, position: 'relative', overflow: 'hidden' }
                    : { background: '#1a1a3e' }}
                >
                  {b.cover
                    ? <Image
                        src={b.cover}
                        alt={b.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 220px"
                        style={{ objectFit: 'cover' }}
                        loading={i < 6 ? 'eager' : 'lazy'}
                      />
                    : <span style={{ fontSize: 46 }}>🎧</span>
                  }
                </div>
                <div className="result-body">
                  <div className="result-title">{b.title}</div>
                  <div className="result-site">{b.site}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Browse Tab */}
        <div className={`tab-panel${activeTab === 'browse' ? ' active' : ''}`}>
          <div className="browse-header">
            <div>
              <div className="tab-title">Browse</div>
              <div className="tab-subtitle" style={{ marginTop: 5 }}>Recently added audiobooks</div>
            </div>
            <div className="browse-controls">
              <input
                className="browse-filter-input"
                type="text"
                placeholder="Filter titles…"
                value={browseFilter}
                onChange={e => setBrowseFilter(e.target.value)}
              />
              <button className="refresh-btn" onClick={loadBrowse}>↻ Refresh</button>
            </div>
          </div>

          <div className="browse-grid">
            {browseState === 'idle' && (
              <div className="empty" style={{ gridColumn: '1/-1' }}>
                <div className="empty-emoji">📚</div>
                <div className="empty-msg">Loading books…</div>
              </div>
            )}
            {browseState === 'loading' && Array(10).fill(0).map((_, i) => (
              <div key={i} className="skel-card">
                <div className="skel skel-cover" style={{ aspectRatio: '3/4' }} />
                <div className="skel-body">
                  <div className="skel skel-line" />
                  <div className="skel skel-line short" />
                </div>
              </div>
            ))}
            {browseState === 'loaded' && browseBooks.length === 0 && (
              <div className="empty" style={{ gridColumn: '1/-1' }}>
                <div className="empty-emoji">😶</div>
                <div className="empty-msg">No books found. Try refreshing.</div>
              </div>
            )}
            {browseState === 'loaded' && displayedBrowseBooks.map((b, i) => (
              <div
                key={b.url}
                className="book-card"
                style={{ animation: `cardUp 0.32s ease ${Math.min(i, 10) * 0.018}s forwards`, opacity: 0 }}
                onClick={() => openDetail(b)}
              >
                <div
                  className="book-cover"
                  style={b.cover ? { position: 'relative', overflow: 'hidden' } : { background: 'linear-gradient(135deg,#1a1a3e,#2d1b69)' }}
                >
                  {b.cover
                    ? <Image
                        src={b.cover}
                        alt={b.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 180px"
                        style={{ objectFit: 'cover' }}
                        loading={i < 8 ? 'eager' : 'lazy'}
                      />
                    : <span style={{ fontSize: 50 }}>📚</span>
                  }
                  <div className="book-cover-fade" />
                </div>
                <div className="book-body">
                  <div className="book-title">{b.title}</div>
                  <div className="book-author">Audiobook</div>
                </div>
              </div>
            ))}

            <div ref={browseSentinelRef} style={{ height: 1, gridColumn: '1/-1' }} />

            {browseLoadingMore && Array(4).fill(0).map((_, i) => (
              <div key={`more-${i}`} className="skel-card">
                <div className="skel skel-cover" style={{ aspectRatio: '3/4' }} />
                <div className="skel-body">
                  <div className="skel skel-line" />
                  <div className="skel skel-line short" />
                </div>
              </div>
            ))}

            {browseState === 'loaded' && !browseHasMore && browseBooks.length > 0 && !browseFilter && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '12px 0' }}>
                All books loaded
              </div>
            )}
          </div>
        </div>

        {/* Settings Tab */}
        <div className={`tab-panel${activeTab === 'settings' ? ' active' : ''}`}>
          <div className="tab-header">
            <div className="tab-title">Settings</div>
            <div className="tab-subtitle">Configure your preferences</div>
          </div>

          <div className="settings-section">
            <div className="section-label">Download</div>
            <div className="settings-group">
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Save location</div>
                  <div className="s-desc">Your browser&apos;s default downloads folder</div>
                </div>
                <div className="folder-pill">
                  <span>📁</span>
                  <span className="folder-path">~/Downloads</span>
                </div>
              </div>
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Merge into single file</div>
                  <div className="s-desc">Concatenate chapters and download as one .mp3</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={mergeFile} onChange={e => setMergeFile(e.target.checked)} />
                  <div className="t-track" />
                  <div className="t-thumb" />
                </label>
              </div>
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Download individual chapters</div>
                  <div className="s-desc">Also save each chapter separately when merging</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={deleteOrig} onChange={e => setDeleteOrig(e.target.checked)} />
                  <div className="t-track" />
                  <div className="t-thumb" />
                </label>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-label">Appearance</div>
            <div className="settings-group">
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Theme</div>
                  <div className="s-desc">Light is welcoming for daytime; dark for late-night reading</div>
                </div>
                <div className="segmented">
                  {(['light', 'dark'] as Theme[]).map(t => (
                    <div key={t} className={`seg${theme === t ? ' active' : ''}`} onClick={() => applyTheme(t)}>
                      {t === 'light' ? 'Light' : 'Dark'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-label">Source</div>
            <div className="settings-group">
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Default site</div>
                  <div className="s-desc">Used for search and browse</div>
                </div>
                <div className="segmented">
                  {(['Golden', 'Daily'] as SiteName[]).map(s => (
                    <div key={s} className={`seg${site === s ? ' active' : ''}`} onClick={() => setSite(s)}>{s}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Book Detail Overlay ── */}
        <div className={`detail-overlay${selectedBook ? ' visible' : ''}`}>
          <div className="detail-header">
            <button className="detail-back-btn" onClick={closeDetail}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M8 1L3 6l5 5" />
              </svg>
              Back
            </button>
            <div className="detail-title-bar">{selectedBook?.title}</div>
            <div style={{ width: 48 }} />
          </div>

          <div className="detail-body">
            {/* Cover panel */}
            <div className="detail-cover-panel">
              {(detailData?.cover ?? selectedBook?.cover) ? (
                <Image
                  className="detail-cover-img"
                  src={(detailData?.cover ?? selectedBook?.cover)!}
                  alt={selectedBook?.title ?? ''}
                  width={164}
                  height={220}
                  priority
                />
              ) : (
                <div className="detail-cover-fallback">🎧</div>
              )}
            </div>

            {/* Info panel */}
            <div className="detail-info-panel">
              {detailPhase === 'loading' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="skel" style={{ height: 24, width: '70%', borderRadius: 6 }} />
                  <div className="skel" style={{ height: 14, width: '40%', borderRadius: 4 }} />
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,0.9,0.85,0.7].map((w, i) => (
                      <div key={i} className="skel" style={{ height: 12, width: `${w * 100}%`, borderRadius: 4 }} />
                    ))}
                  </div>
                </div>
              )}

              {detailPhase === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#ff6b6b', fontSize: 13 }}>Could not load book details.</span>
                  <button
                    className="scrape-btn"
                    style={{ fontSize: 12, padding: '6px 14px', minHeight: 'auto' }}
                    onClick={() => selectedBook && openDetail(selectedBook)}
                  >
                    Retry
                  </button>
                </div>
              )}

              {detailPhase === 'done' && detailData && (
                <>
                  <div className="detail-book-title">{selectedBook?.title}</div>

                  {(detailData.postDate || detailData.categories.length > 0) && (
                    <div className="detail-meta">
                      {detailData.postDate && (
                        <span className="detail-date">📅 {detailData.postDate}</span>
                      )}
                      {detailData.categories.slice(0, 3).map(cat => (
                        <span key={cat} className="detail-cat">{cat}</span>
                      ))}
                    </div>
                  )}

                  {detailData.synopsis && (
                    <div style={{ marginBottom: 28 }}>
                      <div className="detail-section-label">About</div>
                      <div className="detail-synopsis">{detailData.synopsis}</div>
                    </div>
                  )}

                  {detailData.chapters.length > 0 && (
                    <div>
                      <div className="detail-section-label">
                        {detailData.chapters.length} {detailData.chapters.length === 1 ? 'Part' : 'Parts'}
                      </div>
                      <div className="detail-chapters">
                        {detailData.chapters.map(ch => (
                          <button
                            key={ch.url}
                            className={`chapter-row${playingChapter === ch.url ? ' playing' : ''}`}
                            onClick={() => toggleChapter(ch.url)}
                          >
                            <div className="chapter-play-btn">
                              {playingChapter === ch.url ? '⏸' : '▶'}
                            </div>
                            <span className="chapter-label">{ch.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="detail-footer">
            <button className="detail-download-btn" onClick={downloadFromDetail}>
              ↓ Download
            </button>
          </div>
        </div>

        {/* ── Completion toast ── */}
        <div
          className={`toast${showToast ? ' visible' : ''}`}
          role="status"
          aria-live="polite"
          onClick={() => setShowToast(false)}
        >
          <div className="toast-icon">{toastFailed > 0 ? '⚠️' : '✅'}</div>
          <div className="toast-body">
            <div className="toast-title">
              {toastFailed > 0 ? `Completed with ${toastFailed} failed` : 'Download complete'}
            </div>
            {bookTitle && <div className="toast-sub">{bookTitle}</div>}
          </div>
          <button
            className="toast-close"
            aria-label="Dismiss"
            onClick={(e) => { e.stopPropagation(); setShowToast(false) }}
          >
            ×
          </button>
        </div>

      </main>
    </div>
  )
}

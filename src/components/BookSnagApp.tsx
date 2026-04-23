'use client'

import { useState, useRef, useEffect, type ReactElement } from 'react'

type Tab = 'download' | 'search' | 'browse' | 'settings'
type ScrapeState = 'idle' | 'scraping' | 'downloading' | 'done'
type SearchState = 'empty' | 'loading' | 'results' | 'noresults'
type BrowseState = 'idle' | 'loading' | 'loaded'
type SiteName = 'Golden' | 'Daily' | 'Both'

interface FileItem { id: number; name: string; pct: number; done: boolean }
interface BookResult { title: string; site: string; bg: string; emoji: string; queued: boolean }
interface BrowseBook { title: string; bg: string; emoji: string }

const CHAPTERS = [
  'Chapter 1 — The Beginning',
  'Chapter 2 — Into the Unknown',
  'Chapter 3 — A New World',
  'Chapter 4 — The Revelation',
  'Chapter 5 — Rising Action',
  'Chapter 6 — The Conflict',
  'Chapter 7 — Dark Waters',
  'Chapter 8 — The Climax',
  'Chapter 9 — Resolution',
  'Chapter 10 — Epilogue',
]

const ALL_BOOKS: Omit<BookResult, 'queued'>[] = [
  { title: 'The Great Gatsby', site: 'goldenaudiobook.com', bg: '#1a1a3e', emoji: '📗' },
  { title: 'To Kill a Mockingbird', site: 'dailyaudiobooks.com', bg: '#1a2e1a', emoji: '📘' },
  { title: '1984', site: 'goldenaudiobook.com', bg: '#3e1a1a', emoji: '📕' },
  { title: 'Brave New World', site: 'dailyaudiobooks.com', bg: '#2e1a2e', emoji: '📙' },
  { title: 'The Alchemist', site: 'goldenaudiobook.com', bg: '#2e2e1a', emoji: '📒' },
  { title: 'Dune', site: 'dailyaudiobooks.com', bg: '#1a2e2e', emoji: '📓' },
  { title: 'The Hobbit', site: 'goldenaudiobook.com', bg: '#1e1e2e', emoji: '📔' },
  { title: 'Pride and Prejudice', site: 'dailyaudiobooks.com', bg: '#2e1e1e', emoji: '📗' },
]

const BROWSE_BOOKS: BrowseBook[] = [
  { title: 'Animal Farm', bg: 'linear-gradient(135deg,#1a1a3e,#2d1b69)', emoji: '🐷' },
  { title: 'The Odyssey', bg: 'linear-gradient(135deg,#0d2e1a,#0d4d2d)', emoji: '⚓' },
  { title: 'Fahrenheit 451', bg: 'linear-gradient(135deg,#3e1a1a,#6d2020)', emoji: '🔥' },
  { title: 'The Count of Monte Cristo', bg: 'linear-gradient(135deg,#2e1a2e,#5d2d5d)', emoji: '⚔️' },
  { title: 'Jane Eyre', bg: 'linear-gradient(135deg,#2e2e1a,#5d5d20)', emoji: '🌹' },
  { title: 'Crime and Punishment', bg: 'linear-gradient(135deg,#1a2e2e,#1a5d5d)', emoji: '🔍' },
  { title: 'Wuthering Heights', bg: 'linear-gradient(135deg,#1e1e2e,#2d2d5a)', emoji: '🌪️' },
  { title: 'Moby Dick', bg: 'linear-gradient(135deg,#1a1e2e,#1a3d5d)', emoji: '🐋' },
  { title: 'Don Quixote', bg: 'linear-gradient(135deg,#2e1a1e,#5d1a2d)', emoji: '🏇' },
  { title: 'The Divine Comedy', bg: 'linear-gradient(135deg,#1e2e1a,#2d5d1a)', emoji: '🌀' },
]

const CIRCUMFERENCE = 2 * Math.PI * 38
const SAVE_PATHS = ['~/Downloads', '~/Music/Audiobooks', '~/Desktop/Books']

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
    <rect x="2" y="2" width="5.5" height="5.5" rx="1.2" />
    <rect x="10.5" y="2" width="5.5" height="5.5" rx="1.2" />
    <rect x="2" y="10.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.2" />
  </svg>
)

const IconSettings = () => (
  <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="9" cy="9" r="2.5" />
    <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4.1 4.1l1.1 1.1M12.8 12.8l1.1 1.1M13.9 4.1l-1.1 1.1M5.2 12.8l-1.1 1.1" />
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
  const [urlInput, setUrlInput]         = useState('')
  const [scrapeState, setScrapeState]   = useState<ScrapeState>('idle')
  const [overallPct, setOverallPct]     = useState(0)
  const [progressStatus, setProgressStatus] = useState('Preparing…')
  const [progressDetail, setProgressDetail] = useState('Fetching chapter list')
  const [files, setFiles]               = useState<FileItem[]>([])
  const generationRef = useRef(0)

  // Search
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchState, setSearchState]   = useState<SearchState>('empty')
  const [searchResults, setSearchResults] = useState<BookResult[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Browse
  const [browseState, setBrowseState]   = useState<BrowseState>('idle')
  const [browseBooks, setBrowseBooks]   = useState<BrowseBook[]>([])

  // Settings
  const [mergeFile, setMergeFile]       = useState(true)
  const [deleteOrig, setDeleteOrig]     = useState(false)
  const [checkUpdates, setCheckUpdates] = useState(true)
  const [notifs, setNotifs]             = useState(true)
  const [site, setSite]                 = useState<SiteName>('Golden')
  const [pathIdx, setPathIdx]           = useState(0)

  // Sync indicator with active tab
  useEffect(() => {
    const el = itemRefs.current[activeTab]
    if (el) setIndicatorTop(el.offsetTop)
  }, [activeTab])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [])

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    if (tab === 'browse' && browseState === 'idle') loadBrowse()
  }

  // ── Download simulation ────────────────────────────────────────────────

  function startScrape() {
    if (scrapeState === 'scraping' || scrapeState === 'downloading') return
    const gen = ++generationRef.current

    setFiles([])
    setOverallPct(0)
    setScrapeState('scraping')
    setProgressStatus('Scraping page…')
    setProgressDetail('Fetching chapter URLs')

    setTimeout(() => {
      if (generationRef.current !== gen) return
      setScrapeState('downloading')
      setProgressStatus('Downloading')
      setProgressDetail('0 of ' + CHAPTERS.length + ' complete')

      CHAPTERS.forEach((ch, i) => {
        setTimeout(() => {
          if (generationRef.current !== gen) return
          setFiles(prev => [...prev, { id: i, name: ch + '.mp3', pct: 0, done: false }])

          let v = 0
          const iv = setInterval(() => {
            if (generationRef.current !== gen) { clearInterval(iv); return }
            v += Math.random() * 14 + 4
            if (v >= 100) {
              clearInterval(iv)
              setFiles(prev => prev.map(f => f.id === i ? { ...f, pct: 100, done: true } : f))
            } else {
              setFiles(prev => prev.map(f => f.id === i ? { ...f, pct: v } : f))
            }
          }, 320 + i * 40)
        }, i * 280)
      })

      let v = 0
      const ov = setInterval(() => {
        if (generationRef.current !== gen) { clearInterval(ov); return }
        v += 1.4
        if (v >= 100) {
          clearInterval(ov)
          setOverallPct(100)
          setProgressStatus('Complete!')
          setProgressDetail(CHAPTERS.length + ' chapters downloaded')
          setScrapeState('done')
        } else {
          setOverallPct(v)
          const done = Math.floor(v / 100 * CHAPTERS.length)
          setProgressDetail(done + ' of ' + CHAPTERS.length + ' complete')
        }
      }, 190)
    }, 1400)
  }

  // ── Search ─────────────────────────────────────────────────────────────

  function handleSearch(val: string) {
    setSearchQuery(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)

    if (!val.trim()) { setSearchState('empty'); return }

    setSearchState('loading')
    searchTimer.current = setTimeout(() => {
      const hits = ALL_BOOKS.filter(b => b.title.toLowerCase().includes(val.toLowerCase()))
      if (!hits.length) {
        setSearchState('noresults')
      } else {
        setSearchResults(hits.map(h => ({ ...h, queued: false })))
        setSearchState('results')
      }
    }, 580)
  }

  function queueBook(title: string) {
    setSearchResults(prev => prev.map(r => r.title === title ? { ...r, queued: true } : r))
  }

  // ── Browse ─────────────────────────────────────────────────────────────

  function loadBrowse() {
    setBrowseState('loading')
    setTimeout(() => {
      setBrowseBooks(BROWSE_BOOKS)
      setBrowseState('loaded')
    }, 1100)
  }

  function openInDownload(title: string) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    setUrlInput('https://goldenaudiobook.com/book/' + slug)
    switchTab('download')
  }

  // ── Derived ────────────────────────────────────────────────────────────

  const ringOffset    = CIRCUMFERENCE - (overallPct / 100) * CIRCUMFERENCE
  const showProgress  = scrapeState !== 'idle'
  const scrapeBtnText =
    scrapeState === 'scraping'    ? 'Scraping…'   :
    scrapeState === 'downloading' ? 'Downloading' : 'Scrape'

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
          <div className="version-tag">v1.0.0</div>
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
              placeholder="https://goldenaudiobook.com/book/..."
            />
            <div className="scrape-wrapper">
              <button
                className={`scrape-btn${scrapeState === 'scraping' || scrapeState === 'downloading' ? ' loading' : ''}`}
                onClick={startScrape}
              >
                {scrapeBtnText}
              </button>
            </div>
          </div>

          {showProgress && (
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
                <div className="ring-info-sub">{progressDetail}</div>
              </div>
            </div>
          )}

          <div className="file-list">
            {files.map((f, i) => (
              <div
                key={f.id}
                className={`file-row${f.done ? ' done-dl' : ' active-dl'}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="file-icon">{f.done ? '✅' : '🎵'}</div>
                <div className="file-meta">
                  <div className="file-name">{f.name}</div>
                  <div className="file-bar">
                    <div className="file-bar-fill" style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
                <div className={`file-pct${f.done ? ' done' : ''}`}>
                  {f.done ? '✓' : `${Math.round(f.pct)}%`}
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
            {searchState === 'noresults' && (
              <div className="empty" style={{ gridColumn: '1/-1' }}>
                <div className="empty-emoji">😶</div>
                <div className="empty-msg">No results for &ldquo;{searchQuery}&rdquo;</div>
              </div>
            )}
            {searchState === 'results' && searchResults.map((b, i) => (
              <div key={b.title} className="result-card" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="result-thumb" style={{ background: b.bg }}>
                  <span style={{ fontSize: 46 }}>{b.emoji}</span>
                </div>
                <div className="result-body">
                  <div className="result-title">{b.title}</div>
                  <div className="result-site">{b.site}</div>
                  <button
                    className={`result-btn${b.queued ? ' queued' : ''}`}
                    onClick={() => queueBook(b.title)}
                  >
                    {b.queued ? 'Queued ✓' : 'Download'}
                  </button>
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
            <button className="refresh-btn" onClick={loadBrowse}>↻ Refresh</button>
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
            {browseState === 'loaded' && browseBooks.map((b, i) => (
              <div
                key={b.title}
                className="book-card"
                style={{ animation: `cardUp 0.38s ease ${i * 0.05}s forwards`, opacity: 0 }}
                onClick={() => openInDownload(b.title)}
              >
                <div className="book-cover" style={{ background: b.bg }}>
                  <span style={{ fontSize: 50 }}>{b.emoji}</span>
                  <div className="book-cover-fade" />
                </div>
                <div className="book-body">
                  <div className="book-title">{b.title}</div>
                  <div className="book-author">Classic Literature</div>
                </div>
              </div>
            ))}
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
                  <div className="s-desc">Where downloaded files are stored</div>
                </div>
                <div className="folder-pill" onClick={() => setPathIdx(i => (i + 1) % SAVE_PATHS.length)}>
                  <span>📁</span>
                  <span className="folder-path">{SAVE_PATHS[pathIdx]}</span>
                </div>
              </div>
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Merge into single file</div>
                  <div className="s-desc">Combine chapters via AVFoundation → .m4a</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={mergeFile} onChange={e => setMergeFile(e.target.checked)} />
                  <div className="t-track" />
                  <div className="t-thumb" />
                </label>
              </div>
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Delete originals after merge</div>
                  <div className="s-desc">Remove individual chapter files post-merge</div>
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
            <div className="section-label">Source</div>
            <div className="settings-group">
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Default site</div>
                  <div className="s-desc">Used for search and browse</div>
                </div>
                <div className="segmented">
                  {(['Golden', 'Daily', 'Both'] as SiteName[]).map(s => (
                    <div key={s} className={`seg${site === s ? ' active' : ''}`} onClick={() => setSite(s)}>{s}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-label">App</div>
            <div className="settings-group">
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Check for updates on launch</div>
                  <div className="s-desc">Auto-fetch latest version info at startup</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={checkUpdates} onChange={e => setCheckUpdates(e.target.checked)} />
                  <div className="t-track" />
                  <div className="t-thumb" />
                </label>
              </div>
              <div className="s-row">
                <div className="s-left">
                  <div className="s-title">Notifications</div>
                  <div className="s-desc">Alert when a download finishes</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={notifs} onChange={e => setNotifs(e.target.checked)} />
                  <div className="t-track" />
                  <div className="t-thumb" />
                </label>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}

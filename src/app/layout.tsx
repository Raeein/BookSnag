import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const siteUrl = 'https://book-snag.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BookSnag — Free Audiobook Downloader',
    template: '%s | BookSnag',
  },
  description:
    'Download audiobooks from goldenaudiobook.com and dailyaudiobooks.com. Scrape chapters, track progress, and auto-merge into a single file. Free and open-source.',
  keywords: [
    'audiobook downloader',
    'free audiobooks',
    'goldenaudiobook downloader',
    'dailyaudiobooks downloader',
    'download audiobooks online',
    'audiobook chapter downloader',
    'macOS audiobook app',
  ],
  authors: [{ name: 'Raeein Bagheri' }],
  openGraph: {
    title: 'BookSnag — Free Audiobook Downloader',
    description:
      'Download audiobooks from goldenaudiobook.com and dailyaudiobooks.com. Scrape chapters, track progress, auto-merge.',
    type: 'website',
    url: siteUrl,
    siteName: 'BookSnag',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BookSnag — Free Audiobook Downloader',
    description:
      'Download audiobooks from goldenaudiobook.com and dailyaudiobooks.com.',
    creator: '@raeein',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: siteUrl,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf6ec' },
    { media: '(prefers-color-scheme: dark)', color: '#07070e' },
  ],
}

const themeBootScript = `(function(){try{var t=localStorage.getItem('booksnag_theme');if(t!=='light'&&t!=='dark')t='light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${fraunces.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

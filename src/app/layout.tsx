import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}

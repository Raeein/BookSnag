import { ImageResponse } from 'next/og'

export const alt = 'BookSnag — Free Audiobook Downloader'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 96px',
          background: '#07070e',
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 15% 40%, rgba(124, 111, 255, 0.25) 0%, transparent 100%),' +
            'radial-gradient(ellipse 50% 40% at 85% 15%, rgba(0, 212, 170, 0.2) 0%, transparent 100%)',
          color: '#e8e8f2',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: 4,
            color: '#00d4aa',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          BookSnag
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -3,
            maxWidth: 960,
            background: 'linear-gradient(135deg, #e8e8f2 0%, #a9a9c7 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Free audiobook downloader.
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 28,
            color: '#a9a9c7',
            maxWidth: 900,
          }}
        >
          Paste a URL. Grab the chapters. Merge into one file. Free and open source.
        </div>
      </div>
    ),
    size,
  )
}

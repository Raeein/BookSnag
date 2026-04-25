import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07070e',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00d4aa, #7c6fff)',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: -4,
          }}
        >
          BS
        </div>
      </div>
    ),
    size,
  )
}

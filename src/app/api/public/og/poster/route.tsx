import { ImageResponse } from 'next/og'

// Note: This route generates OG images and should have caching headers.
// However, ImageResponse doesn't support custom headers directly.
// Consider implementing caching at the CDN level or using a different approach.
// For Vercel deployment, the CDN will cache these responses based on the URL.

// Load Montserrat via Google Fonts dynamically (ensures availability on edge)
async function loadGoogleFont(fontQuery: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontQuery}&text=${encodeURIComponent(text)}`
    const css = await (await fetch(cssUrl)).text()
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(opentype|truetype|woff2)'\)/)
    if (match && match[1]) {
      const res = await fetch(match[1])
      if (res.ok) return res.arrayBuffer()
    }
  } catch {}
  return null
}

// Keep runtime default for now for maximum compatibility

export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get('title') || 'Event Title').slice(0, 120)
  const description = (searchParams.get('description') || searchParams.get('summary') || '').slice(0, 220)
  const date = (searchParams.get('date') || '').slice(0, 60)
  const time = (searchParams.get('time') || '').slice(0, 60)
  const location = (searchParams.get('location') || '').slice(0, 80)
  const organizer = (searchParams.get('organizer') || '').slice(0, 80)
  const phone = (searchParams.get('phone') || '').slice(0, 40)
  const email = (searchParams.get('email') || '').slice(0, 80)
  const close = (searchParams.get('close') || searchParams.get('close_date') || '').slice(0, 80)
  const targetUrl = searchParams.get('url') || siteUrl
  const mapUrl = (searchParams.get('mapUrl') || searchParams.get('map') || '').slice(0, 200)
  const qrApi = `${siteUrl}/api/public/og/qr?url=${encodeURIComponent(targetUrl)}`
  const qrMapApi = mapUrl ? `${siteUrl}/api/public/og/qr?url=${encodeURIComponent(mapUrl)}` : ''
  const fontText = `${title} ${description} ${date} ${time} ${location} ${organizer} ${phone} ${email} ${close} Scan to view Registration closes 0123456789@.-:+()`
  const [regularFont, boldFont] = await Promise.all([
    loadGoogleFont('Montserrat:wght@400', fontText),
    loadGoogleFont('Montserrat:wght@800', fontText),
  ])

  return new ImageResponse(
    (
      <div
        tw="relative flex h-[630px] w-[1200px] flex-col gap-6 p-12 text-white"
        style={{
          backgroundColor: '#0b1220',
          backgroundImage: `url(${siteUrl}/og/template1.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div tw="flex w-full items-start justify-between gap-8 flex-1">
          <div tw="flex flex-col gap-6 max-w-[68%]">
            <div tw="text-[56px] leading-tight font-extrabold">{title}</div>
            {description && (
              <div tw="text-[24px] leading-relaxed text-slate-200 max-w-[900px]">{description}</div>
            )}
            <div tw="flex gap-6 mt-2 text-[24px] items-stretch flex-nowrap">
              {date && (
                <div
                  tw="flex flex-col rounded-2xl px-4 py-3 mr-2"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <div tw="text-[12px] uppercase tracking-widest text-slate-300">Date</div>
                  <div tw="text-[24px] text-white font-semibold">{date}</div>
                </div>
              )}
              {time && (
                <div
                  tw="flex flex-col rounded-2xl px-4 py-3 mr-2"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <div tw="text-[12px] uppercase tracking-widest text-slate-300">Time</div>
                  <div tw="text-[24px] text-white font-semibold">{time}</div>
                </div>
              )}
              {location && (
                <div
                  tw="flex flex-col rounded-2xl px-4 py-3  min-w-0"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <div tw="text-[12px] uppercase tracking-widest text-slate-300">Location</div>
                  <div tw="text-[24px] text-white font-semibold leading-snug" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{location}</div>
                </div>
              )}
            
            </div>
            {close && (
                <div
                  tw="flex flex-col rounded-2xl px-4 py-3 max-w-[80%] min-w-0 mt-5 w-full"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <div tw="text-[12px] uppercase tracking-widest text-slate-300">Registration closes</div>
                  <div tw="text-[24px] text-white font-extrabold leading-snug" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{close}</div>
                </div>
              )}
          </div>
          <div tw="flex flex-col items-center">
            {/* Using <img> intentionally in OG image rendering context; Next Image is not supported here. */}
            <img src={qrApi} alt="QR" height={260} width={260} style={{ borderRadius: 12, background: '#ffffff', padding: 12 }} />
            <div tw="text-slate-300 mt-3 text-[16px]">Scan to view</div>
            {qrMapApi && (
              <div tw="flex flex-col items-center mt-6">
                {/* Using <img> intentionally in OG image rendering context; Next Image is not supported here. */}
                <img src={qrMapApi} alt="Map QR" height={220} width={220} style={{ borderRadius: 12, background: '#ffffff', padding: 10 }} />
                <div tw="text-slate-300 mt-2 text-[16px]">Directions</div>
              </div>
            )}
          </div>
        </div>
        <div tw="absolute left-12 right-12 bottom-12 flex items-center justify-between text-slate-200">
          <div tw="flex items-center gap-12 flex-wrap">
            {organizer && (
              <div tw="text-[28px] font-extrabold text-white mr-3">{organizer}</div>
            )}
            {phone && (
              <div tw="flex items-center gap-3 mr-3">
                <div>📞</div>
                <div tw="text-[18px]">{phone}</div>
              </div>
            )}
            {email && (
              <div tw="flex items-center gap-3 mr-3">
                <div>✉️</div>
                <div tw="text-[18px]">{email}</div>
              </div>
            )}
          </div>
          <div />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        ...(regularFont ? [{ name: 'Montserrat', data: regularFont, style: 'normal' as const }] : []),
        ...(boldFont ? [{ name: 'Montserrat', data: boldFont, style: 'normal' as const }] : []),
      ],
    },
  )
}



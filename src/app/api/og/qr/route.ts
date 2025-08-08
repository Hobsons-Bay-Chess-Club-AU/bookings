import QRCode from 'qrcode'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const urlParam = searchParams.get('url')
    if (!urlParam) {
      return new Response('Missing url parameter', { status: 400 })
    }

    // Basic validation: must be http/https absolute URL
    let target: URL
    try {
      target = new URL(urlParam)
      if (!/^https?:$/i.test(target.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return new Response('Invalid url parameter', { status: 400 })
    }

    const widthParam = Number(searchParams.get('w') || 1200)
    const width = Number.isFinite(widthParam) && widthParam > 0 && widthParam <= 2000 ? widthParam : 1200

    const buffer = await QRCode.toBuffer(target.toString(), {
      type: 'png',
      width,
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    const emptyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
      'base64'
    )
    return new Response(emptyPng, {
      headers: { 'Content-Type': 'image/png' },
      status: 200,
    })
  }
}



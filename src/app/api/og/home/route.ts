import QRCode from 'qrcode'

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    // Generate a high-resolution QR code PNG for better preview quality
    const buffer = await QRCode.toBuffer(siteUrl, {
      type: 'png',
      width: 1200, // Suitable for large previews
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
    // Fallback 1x1 PNG if generation fails
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



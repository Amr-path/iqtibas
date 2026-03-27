import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const VISION_KEY = process.env.GOOGLE_VISION_API_KEY

export async function POST(req: NextRequest) {
  if (!VISION_KEY) {
    return NextResponse.json({ error: 'GOOGLE_VISION_API_KEY not set' }, { status: 500 })
  }

  let base64: string
  let mimeType = 'image/jpeg'
  try {
    const body = await req.json() as { base64?: string; url?: string }

    if (body.url) {
      // Server-side fetch — no CORS restrictions
      const imgRes = await fetch(body.url)
      if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status} — ${body.url}`)
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      mimeType = contentType.split(';')[0].trim()
      const arrayBuf = await imgRes.arrayBuffer()
      base64 = Buffer.from(arrayBuf).toString('base64')
    } else {
      base64 = body.base64 ?? ''
      mimeType = 'image/jpeg'
    }
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
    return NextResponse.json({ error: 'Failed to load image', detail: msg }, { status: 400 })
  }

  if (!base64) {
    return NextResponse.json({ error: 'Missing base64 or url field' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          }],
        }),
      }
    )

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Vision API ${res.status}: ${errBody.slice(0, 300)}`)
    }

    const data = await res.json() as {
      responses: Array<{
        fullTextAnnotation?: { text: string }
        error?: { message: string }
      }>
    }

    const response = data.responses?.[0]
    if (response?.error) throw new Error(response.error.message)
    const text = (response?.fullTextAnnotation?.text ?? '').trim()

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Vision OCR failed', detail: message }, { status: 500 })
  }
}

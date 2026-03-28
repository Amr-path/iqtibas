import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'

const GEMINI_KEY = process.env.GEMINI_API_KEY

const OCR_PROMPT = 'Extract all the text from this image exactly as it appears. Maintain the paragraph structure. Do not summarize, do not translate, and do not add any external commentary. Only output the text. Preserve line breaks. If the image contains Arabic text, return it as-is.'

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
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
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      { text: OCR_PROMPT },
    ])
    const text = result.response.text().trim()

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Gemini OCR failed', detail: message }, { status: 500 })
  }
}

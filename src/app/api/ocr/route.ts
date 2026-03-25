import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'

const GEMINI_KEY = process.env.GEMINI_API_KEY

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  let base64: string
  try {
    const body = await req.json() as { base64?: string }
    base64 = body.base64 ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!base64) {
    return NextResponse.json({ error: 'Missing base64 field' }, { status: 400 })
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64,
        },
      },
      {
        text: 'Extract all text from this image exactly as written. Return only the raw text with no commentary, formatting, or explanation. Preserve line breaks. If the image contains Arabic text, return it as-is.',
      },
    ])

    const text = result.response.text().trim()
    return NextResponse.json({ text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Gemini OCR failed', detail: message }, { status: 500 })
  }
}

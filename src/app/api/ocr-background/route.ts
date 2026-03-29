import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const GEMINI_KEY   = process.env.GEMINI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const MODEL = 'gemini-3.1-flash-lite-preview'
const OCR_PROMPT = 'Extract all the text from this image exactly as it appears. Maintain the paragraph structure. Do not summarize, do not translate, and do not add any external commentary. Only output the text. Preserve line breaks. If the image contains Arabic text, return it as-is.'

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  let imageId: string, storagePath: string
  try {
    const body = await req.json() as { imageId?: string; storagePath?: string }
    imageId     = body.imageId     ?? ''
    storagePath = body.storagePath ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!imageId || !storagePath) {
    return NextResponse.json({ error: 'Missing imageId or storagePath' }, { status: 400 })
  }

  try {
    // Skip if text was already extracted (e.g. client-side OCR finished first)
    if (SERVICE_KEY) {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY)
      const { data: existing } = await sb
        .from('extracted_texts')
        .select('image_id')
        .eq('image_id', imageId)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ text: '', skipped: true })
      }
    }

    // Build public URL directly — works for any public bucket without RLS
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${storagePath}`
    const imgRes = await fetch(publicUrl)
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status} — ${publicUrl}`)

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const mimeType    = contentType.split(';')[0].trim()
    const arrayBuf    = await imgRes.arrayBuffer()
    const base64      = Buffer.from(arrayBuf).toString('base64')

    // Run Gemini OCR via REST API
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: OCR_PROMPT },
            ],
          }],
        }),
      }
    )
    clearTimeout(timeout)

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      throw new Error(`Gemini API ${geminiRes.status}: ${errBody.slice(0, 300)}`)
    }

    const data = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()

    // Save to DB server-side (bypasses RLS)
    if (SERVICE_KEY) {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY)
      const { error: dbErr } = await sb.from('extracted_texts').upsert({
        image_id:     imageId,
        full_text:    text,
        ocr_provider: 'gemini',
        extracted_at: new Date().toISOString(),
      }, { onConflict: 'image_id' })
      if (dbErr) console.error('DB upsert error (service role):', dbErr.message)
    }

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Background OCR failed', detail: msg }, { status: 500 })
  }
}

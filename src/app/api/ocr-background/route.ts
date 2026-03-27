import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const GEMINI_KEY   = process.env.GEMINI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Service-role key bypasses RLS so we can write extracted_texts from server
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    // Use service-role or anon key to download from storage
    const sb = SERVICE_KEY
      ? createClient(SUPABASE_URL, SERVICE_KEY)
      : createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data: blob, error: dlErr } = await sb.storage
      .from('book-images').download(storagePath)
    if (dlErr || !blob) throw new Error('Storage download failed: ' + (dlErr?.message ?? 'empty'))

    // Convert to base64
    const arrayBuf = await blob.arrayBuffer()
    const base64   = Buffer.from(arrayBuf).toString('base64')
    const mimeType = blob.type || 'image/jpeg'

    // Run Gemini OCR
    const genAI  = new GoogleGenerativeAI(GEMINI_KEY)
    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      { text: 'Extract all the text from this image exactly as it appears. Maintain the paragraph structure. Do not summarize, do not translate, and do not add any external commentary. Only output the text. Preserve line breaks.' },
    ])
    const text = result.response.text().trim()

    // Save to extracted_texts (upsert in case it already exists)
    const { error: dbErr } = await sb.from('extracted_texts').upsert({
      image_id:     imageId,
      full_text:    text,
      ocr_provider: 'gemini',
      extracted_at: new Date().toISOString(),
    }, { onConflict: 'image_id' })

    if (dbErr) throw new Error('DB upsert failed: ' + dbErr.message)

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Background OCR failed', detail: msg }, { status: 500 })
  }
}

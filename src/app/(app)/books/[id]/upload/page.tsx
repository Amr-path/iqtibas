'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import toast from 'react-hot-toast'
import { dispatchStatsChanged } from '@/lib/sidebarEvents'

type OcrStatus    = 'idle' | 'scanning' | 'done' | 'error'
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface ImageItem {
  id:            string
  file?:         File        // absent for pre-loaded images from DB
  preview:       string      // local blob URL or public storage URL
  ocrStatus:     OcrStatus
  uploadStatus:  UploadStatus
  uploadError?:  string      // human-readable error message when uploadStatus='error'
  dbImageId?:    string
  ocrText:       string
  pending:       string[]
  savedCount:    number
  isExisting?:   boolean     // true = loaded from DB, not newly uploaded
}

/* ── Compress + base64 ── */
function imageToBase64(file: File, maxPx = 1600, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round((height / width) * maxPx); width = maxPx }
        else                 { width  = Math.round((width  / height) * maxPx); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
    }
    img.onerror = reject; img.src = url
  })
}

async function serverOcr(base64: string): Promise<string> {
  const res  = await fetch('/api/ocr', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64 }),
  })
  const json = await res.json() as { text?: string; error?: string; detail?: string }
  if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`)
  return json.text ?? ''
}

export default function UploadPage() {
  const { id: bookId } = useParams<{ id: string }>()
  const { user }       = useAuthStore()
  const { lang }       = useSettings()
  const t              = useT(lang)
  const router         = useRouter()
  const fileRef        = useRef<HTMLInputElement>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [images, setImages]       = useState<ImageItem[]>([])
  const [dragging, setDragging]   = useState(false)

  useEffect(() => {
    if (user && bookId)
      supabase.from('books').select('title').eq('id', bookId).single()
        .then(({ data }) => { if (data) setBookTitle(data.title) })
  }, [user, bookId])

  /* ── Load existing unprocessed images for this book from DB ── */
  useEffect(() => {
    if (!user || !bookId) return
    async function loadExisting() {
      // Images for this book that aren't dismissed
      const { data: imgs } = await supabase
        .from('images')
        .select('id, public_url, storage_path, file_name')
        .eq('book_id', bookId).eq('user_id', user!.id)
        .neq('status', 'dismissed')
      if (!imgs || imgs.length === 0) return

      const imgIds = imgs.map(i => i.id)

      // Fetch extracted_texts and quoted images in parallel (extracted is optional)
      const [{ data: extracted }, { data: quoted }] = await Promise.all([
        supabase.from('extracted_texts').select('image_id, full_text').in('image_id', imgIds),
        supabase.from('quotes').select('image_id').in('image_id', imgIds),
      ])

      const quotedSet   = new Set((quoted   || []).map(q => q.image_id).filter(Boolean))
      const extractedMap = new Map((extracted || []).map(e => [e.image_id, e.full_text]))

      const pending: ImageItem[] = []
      for (const img of imgs) {
        // Skip images that have already been fully quoted
        if (quotedSet.has(img.id)) continue
        // If public_url is missing but storage_path exists, regenerate the URL
        let previewUrl = img.public_url ?? ''
        if (!previewUrl && img.storage_path) {
          const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(img.storage_path)
          previewUrl = urlData.publicUrl
          supabase.from('images').update({ public_url: previewUrl, status: 'uploaded' })
            .eq('id', img.id).then(() => {})
        }
        // Use 'done' if there's an extracted_texts row (even if text is empty/null)
        // Use 'idle' only when no OCR has been run at all for this image
        const hasExtracted = extractedMap.has(img.id)
        const ocrText      = extractedMap.get(img.id) ?? ''
        pending.push({
          id:           `existing_${img.id}`,
          preview:      previewUrl,
          ocrStatus:    hasExtracted ? 'done' : 'idle',
          uploadStatus: 'done',
          dbImageId:    img.id,
          ocrText,
          pending:      [],
          savedCount:   0,
          isExisting:   true,
        })
      }
      if (pending.length > 0) {
        setImages(prev => {
          const existingDbIds = new Set(prev.map(i => i.dbImageId).filter(Boolean))
          return [...prev, ...pending.filter(p => !existingDbIds.has(p.dbImageId))]
        })
        // Auto-trigger OCR for any image that has no extracted text yet
        for (const item of pending) {
          if (item.ocrStatus === 'idle' && item.preview) {
            // Small stagger to avoid hitting the API simultaneously
            setTimeout(() => runOcrFromUrl(item.id, item.preview, item.dbImageId), 300)
          }
        }
      }
    }
    loadExisting()
  }, [user, bookId])

  /* ── OCR core — accepts base64, saves to DB, updates state ── */
  async function runOcrBase64(itemId: string, base64: string, dbImageId?: string) {
    const text = await serverOcr(base64)
    const imgId = dbImageId ?? images.find(i => i.id === itemId)?.dbImageId
    if (imgId) {
      // Upsert so re-runs overwrite the old row rather than error on duplicate
      const { error: etErr } = await supabase.from('extracted_texts').upsert({
        image_id:     imgId,
        full_text:    text,
        ocr_provider: 'google-vision',
        extracted_at: new Date().toISOString(),
      }, { onConflict: 'image_id' })
      if (etErr) console.error('extracted_text upsert error:', JSON.stringify(etErr))
    }
    setImages(prev => prev.map(i =>
      i.id === itemId ? { ...i, ocrStatus: 'done', ocrText: text } : i
    ))
    return text
  }

  /* ── OCR from File (newly uploaded images) ── */
  async function runOcr(itemId: string, file: File | undefined, dbImageId?: string) {
    if (!file) return
    setImages(prev => prev.map(i => i.id === itemId ? { ...i, ocrStatus: 'scanning' } : i))
    try {
      const base64 = await imageToBase64(file)
      await runOcrBase64(itemId, base64, dbImageId)
    } catch (err) {
      console.error('OCR:', err)
      setImages(prev => prev.map(i => i.id === itemId ? { ...i, ocrStatus: 'error' } : i))
    }
  }

  /* ── OCR from URL — server fetches the image to avoid browser CORS ── */
  async function runOcrFromUrl(itemId: string, url: string, dbImageId?: string) {
    if (!url) return
    setImages(prev => prev.map(i => i.id === itemId ? { ...i, ocrStatus: 'scanning' } : i))
    try {
      const res  = await fetch('/api/ocr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const json = await res.json() as { text?: string; error?: string; detail?: string }
      if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`)
      const text = json.text ?? ''
      if (dbImageId) {
        await supabase.from('extracted_texts').upsert({
          image_id:     dbImageId,
          full_text:    text,
          ocr_provider: 'google-vision',
          extracted_at: new Date().toISOString(),
        }, { onConflict: 'image_id' })
      }
      setImages(prev => prev.map(i =>
        i.id === itemId ? { ...i, ocrStatus: 'done', ocrText: text } : i
      ))
    } catch (err) {
      console.error('OCR from URL:', err)
      setImages(prev => prev.map(i => i.id === itemId ? { ...i, ocrStatus: 'error' } : i))
    }
  }

  /* ── Storage upload — updates existing image record ── */
  async function tryUpload(itemId: string, file: File | undefined, dbImageId?: string) {
    if (!file) return
    setImages(prev => prev.map(i => i.id === itemId ? { ...i, uploadStatus: 'uploading' } : i))
    try {
      // Sanitize filename — Arabic chars and spaces break Supabase Storage paths
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user!.id}/${bookId}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage
        .from('book-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(path)
      const imgId = dbImageId ?? images.find(i => i.id === itemId)?.dbImageId
      if (imgId) {
        await supabase.from('images').update({
          storage_path: path, public_url: urlData.publicUrl, status: 'uploaded',
        }).eq('id', imgId)
      }
      setImages(prev => prev.map(i =>
        i.id === itemId ? { ...i, uploadStatus: 'done' } : i
      ))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message: unknown }).message)
          : lang === 'ar' ? 'فشل الرفع' : 'Upload failed'
      setImages(prev => prev.map(i =>
        i.id === itemId ? { ...i, uploadStatus: 'error', uploadError: msg } : i
      ))
    }
  }

  /* ── Add files: create DB record first, then OCR + upload in parallel ── */
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!valid.length) { toast.error(lang === 'ar' ? 'يرجى اختيار صور فقط' : 'Images only'); return }

    for (const file of valid) {
      const itemId = Math.random().toString(36).slice(2)

      // Create image record in DB first — so OCR text can be linked to it
      let dbImageId: string | undefined
      try {
        const { data, error: insertErr } = await supabase.from('images').insert({
          user_id:      user!.id,
          book_id:      bookId,
          file_name:    file.name,
          status:       'processing',
          storage_path: '',
          public_url:   '',
        }).select('id').single()
        if (insertErr) console.error('images insert error:', JSON.stringify(insertErr))
        dbImageId = data?.id ?? undefined
      } catch (e) { console.error('images insert exception:', e) }

      const item: ImageItem = {
        id: itemId, file,
        preview:       URL.createObjectURL(file),
        ocrStatus:     'idle',
        uploadStatus:  'idle',
        dbImageId,
        ocrText:  '',
        pending:  [],
        savedCount: 0,
      }
      setImages(prev => [...prev, item])

      // Fire OCR + upload simultaneously
      runOcr(itemId, file, dbImageId)
      tryUpload(itemId, file, dbImageId)
    }
  }, [lang, user, bookId]) // eslint-disable-line

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files)
  }, [addFiles])

  /* Add to pending list (for display) */
  const addPending = (imgId: string, text: string) => {
    const clean = text.trim().replace(/\s+/g, ' ')
    if (!clean) return
    setImages(prev => prev.map(i =>
      i.id === imgId && !i.pending.includes(clean)
        ? { ...i, pending: [...i.pending, clean] } : i
    ))
  }
  const removePending = (imgId: string, idx: number) =>
    setImages(prev => prev.map(i =>
      i.id === imgId ? { ...i, pending: i.pending.filter((_, j) => j !== idx) } : i
    ))

  /* ── Save a single quote immediately (auto-save on select) ── */
  async function saveQuoteNow(imgId: string, rawText: string) {
    const clean = rawText.trim().replace(/\s+/g, ' ')
    if (!clean) return
    const img = images.find(i => i.id === imgId)
    if (!img) return

    // Optimistic: add to pending list first so it appears instantly
    addPending(imgId, clean)

    const payload: Record<string, unknown> = {
      user_id: user!.id, book_id: bookId,
      text: clean, tags: [], is_favorite: false,
    }
    if (img.dbImageId) payload.image_id = img.dbImageId
    const { error } = await supabase.from('quotes').insert(payload)
    if (error) {
      console.error('Quote insert error:', JSON.stringify(error))
      // Remove optimistic entry
      setImages(prev => prev.map(i =>
        i.id === imgId ? { ...i, pending: i.pending.filter(p => p !== clean) } : i
      ))
      toast.error(lang === 'ar' ? 'تعذّر حفظ الاقتباس' : 'Failed to save')
      return
    }
    await supabase.rpc('increment_quotes_count', { p_user_id: user!.id, p_book_id: bookId })
    dispatchStatsChanged()
    // Move from pending to savedCount
    setImages(prev => prev.map(i =>
      i.id === imgId
        ? { ...i, pending: i.pending.filter(p => p !== clean), savedCount: i.savedCount + 1 }
        : i
    ))
  }

  // Split images into: newly uploaded (not from DB) vs existing (from DB/inbox for processing)
  const newImages      = images.filter(i => !i.isExisting)
  const existingImages = images.filter(i => i.isExisting)

  const totalSaved     = images.reduce((s, i) => s + i.savedCount, 0)
  // New images are "busy" until both upload AND ocr finish
  const newUploading   = newImages.some(i =>
    i.uploadStatus === 'uploading' || i.uploadStatus === 'idle' ||
    i.ocrStatus    === 'scanning'  || i.ocrStatus    === 'idle'
  )
  const newUploadDone  = newImages.length > 0 && newImages.every(i =>
    (i.uploadStatus === 'done' || i.uploadStatus === 'error') &&
    (i.ocrStatus    === 'done' || i.ocrStatus    === 'error')
  )
  const ocrInProgress  = existingImages.some(i => i.ocrStatus === 'scanning')

  return (
    <>
      <Link href={`/books/${bookId}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem', color: 'var(--text-3)', marginBottom: 24 }}>
        ← {bookTitle || t('backToBook')}
      </Link>


      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)} onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 'var(--r-xl)', padding: '32px 24px', textAlign: 'center',
          cursor: 'pointer', background: dragging ? 'var(--gold-bg)' : 'var(--surface)',
          transition: 'all var(--t)', marginBottom: 24,
        }}>
        <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🖼️</div>
        <div style={{ fontWeight: 500, marginBottom: 3, color: dragging ? 'var(--gold)' : 'var(--text)' }}>
          {dragging ? t('dropHere') : t('dropOrClick')}
        </div>
        <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>{t('dropFormat')}</div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
      </div>

      {/* ── Newly uploaded images (simple status view — no processing UI) ── */}
      {newImages.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          {/* Upload progress bar */}
          {newUploading && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--r-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--gold)', flexShrink: 0 }} />
                <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--gold)' }}>
                  {lang === 'ar' ? 'جارٍ رفع الصور...' : 'Uploading images...'}
                </span>
              </div>
            </div>
          )}

          {/* Success banner after all uploaded */}
          {newUploadDone && (
            <div style={{
              marginBottom: 12, padding: '12px 16px',
              background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
              borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--gold)' }}>
                ✓ {lang === 'ar'
                  ? `${newImages.length} صورة محفوظة — يمكنك الخروج والمعالجة لاحقًا من الصندوق`
                  : `${newImages.length} image${newImages.length > 1 ? 's' : ''} saved — you can leave and process later from Inbox`}
              </span>
            </div>
          )}

          {/* Thumbnail grid for new uploads */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {newImages.map(img => (
              <UploadThumb key={img.id} img={img} lang={lang}
                onRemove={async () => {
                  const target = images.find(i => i.id === img.id)
                  URL.revokeObjectURL(target?.preview || '')
                  if (target?.dbImageId)
                    await supabase.from('images').update({ status: 'dismissed' }).eq('id', target.dbImageId)
                  setImages(prev => prev.filter(i => i.id !== img.id))
                }}
                onRetry={() => {
                  setImages(prev => prev.map(i => i.id === img.id ? { ...i, uploadStatus: 'idle', uploadError: undefined } : i))
                  tryUpload(img.id, img.file, img.dbImageId)
                }}
              />
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ fontSize: '.88rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              + {t('addMoreImgs')}
            </button>
            <button onClick={() => router.push(`/books/${bookId}`)} className="btn btn-gold">
              {t('doneBtn')}
            </button>
          </div>
        </div>
      )}

      {/* ── Existing unprocessed images (full processing UI — from Inbox) ── */}
      {existingImages.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 2 }}>
              {lang === 'ar' ? 'الصور بانتظار الاستخلاص' : 'Images pending extraction'}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
              {lang === 'ar' ? 'ظلّل النص ثم اضغط إضافة لحفظ اقتباس' : 'Highlight text then press Add to save a quote'}
            </div>
          </div>

          {ocrInProgress && (
            <div style={{ marginBottom: 12, height: 3, background: 'var(--border-light)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--gold)', width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {existingImages.map(img => (
              <ImageCard key={img.id} img={img} lang={lang}
                onRemove={async () => {
                  // Mark dismissed in DB so it never reappears
                  if (img.dbImageId)
                    await supabase.from('images').update({ status: 'dismissed' }).eq('id', img.dbImageId)
                  setImages(prev => prev.filter(i => i.id !== img.id))
                }}
                onAddPending={text => saveQuoteNow(img.id, text)}
                onRemovePending={idx => removePending(img.id, idx)}
                onRetryOcr={() => img.file
                  ? runOcr(img.id, img.file, img.dbImageId)
                  : runOcrFromUrl(img.id, img.preview, img.dbImageId)}
                onTextEdit={newText => setImages(prev => prev.map(i => i.id === img.id ? { ...i, ocrText: newText } : i))}
              />
            ))}
          </div>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>
              {totalSaved > 0 && (lang === 'ar' ? `${totalSaved} اقتباس محفوظ` : `${totalSaved} quote${totalSaved > 1 ? 's' : ''} saved`)}
            </span>
            <button onClick={() => router.push(`/books/${bookId}`)} className="btn btn-gold">
              {t('doneBtn')}
            </button>
          </div>
        </>
      )}
    </>
  )
}

/* ═══════════════════════════════════════ */
/* Simple thumbnail for newly uploaded images (no OCR/quote UI) */
function UploadThumb({ img, lang, onRemove, onRetry }: {
  img: ImageItem; lang: string; onRemove: () => void; onRetry: () => void
}) {
  const uploading = img.uploadStatus === 'uploading' || img.uploadStatus === 'idle'
  const error     = img.uploadStatus === 'error'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface-2)', aspectRatio: '1', border: `1px solid ${error ? 'var(--red)' : 'var(--border-light)'}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: uploading || error ? 0.45 : 1, transition: 'opacity .3s' }} />

        {/* Overlay while uploading */}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="spinner" style={{ width: 20, height: 20, borderTopColor: 'var(--gold)' }} />
          </div>
        )}

        {/* Done checkmark */}
        {!uploading && !error && (
          <div style={{ position: 'absolute', bottom: 6, insetInlineStart: 6, background: 'rgba(0,0,0,.5)', borderRadius: 99, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', color: '#fff' }}>✓</div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(0,0,0,.45)' }}>
            <span style={{ fontSize: '.85rem' }}>⚠️</span>
            <button onClick={onRetry} style={{
              background: 'var(--gold)', color: '#fff', border: 'none',
              borderRadius: 'var(--r-full)', padding: '3px 10px',
              fontSize: '.62rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {lang === 'ar' ? 'إعادة' : 'Retry'}
            </button>
          </div>
        )}

        {/* Remove button */}
        <button onClick={onRemove} style={{
          position: 'absolute', top: 5, insetInlineEnd: 5,
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(0,0,0,.5)', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: '.7rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* Error reason below thumbnail */}
      {error && img.uploadError && (
        <div style={{ fontSize: '.6rem', color: 'var(--red)', lineHeight: 1.3, paddingInline: 2 }}
          title={img.uploadError}>
          {img.uploadError.length > 40 ? img.uploadError.slice(0, 40) + '…' : img.uploadError}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════ */
function ImageCard({ img, lang, onRemove, onAddPending, onRemovePending, onRetryOcr, onTextEdit }: {
  img: ImageItem; lang: string
  onRemove: () => void
  onAddPending: (t: string) => void
  onRemovePending: (i: number) => void
  onRetryOcr: () => void
  onTextEdit: (text: string) => void
}) {
  const [sel, setSel] = useState('')
  const textareaRef   = useRef<HTMLTextAreaElement>(null)

  const handleMouseUp = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const s = el.value.slice(el.selectionStart, el.selectionEnd).trim()
    setSel(s)
  }, [])

  // Auto-save on selection: add immediately when user lifts mouse/key
  const handleAddSel = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const s = el.value.slice(el.selectionStart, el.selectionEnd).trim()
    if (!s) return
    onAddPending(s)
    setSel('')
    // Clear textarea selection
    el.selectionStart = el.selectionEnd
  }, [onAddPending])

  const isScanning = img.ocrStatus === 'scanning'
  const hasText    = img.ocrText.length > 0

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Layout: image right, text left (RTL side-by-side) */}
      <div style={{ display: 'flex', flexDirection: 'row', minHeight: 220 }}>

        {/* Preview — right side (first child = right in RTL) */}
        <div style={{ position: 'relative', width: 190, flexShrink: 0, background: 'var(--surface-2)' }}>
          {img.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: 'var(--surface-2)' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '2rem' }}>🖼️</div>
          )}
          {isScanning && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="spinner" style={{ borderTopColor: 'var(--gold)', width: 28, height: 28 }} />
              <span style={{ fontSize: '.75rem', color: 'var(--gold)', fontWeight: 600 }}>{lang === 'ar' ? 'جارٍ القراءة...' : 'Scanning...'}</span>
            </div>
          )}
          {img.savedCount > 0 && (
            <div style={{ position: 'absolute', bottom: 10, insetInlineStart: 10, background: 'var(--green)', color: '#fff', borderRadius: 'var(--r-full)', fontSize: '.7rem', fontWeight: 700, padding: '4px 10px' }}>
              ✓ {img.savedCount} {lang === 'ar' ? 'محفوظ' : 'saved'}
            </div>
          )}
          {/* Remove button */}
          <button onClick={onRemove} style={{
            position: 'absolute', top: 10, insetInlineEnd: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(0,0,0,.45)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: '.8rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Status */}
          <div style={{ fontSize: '.72rem', fontWeight: 500 }}>
            {img.ocrStatus === 'idle' && <span style={{ color: 'var(--gold)' }}>⟳ {lang === 'ar' ? 'جارٍ تحضير النص...' : 'Preparing text...'}</span>}
            {isScanning && <span style={{ color: 'var(--gold)' }}>⟳ {lang === 'ar' ? 'جارٍ الاستخراج...' : 'Extracting...'}</span>}
            {img.ocrStatus === 'done' && hasText && <span style={{ color: 'var(--green)' }}>✓ {lang === 'ar' ? 'تم استخراج النص — ظلّل لإضافة اقتباس' : 'Text ready — highlight to add quote'}</span>}
            {img.ocrStatus === 'done' && !hasText && <span style={{ color: 'var(--text-3)' }}>○ {lang === 'ar' ? 'لا نص في الصورة' : 'No text found'}</span>}
            {img.ocrStatus === 'error' && (
              <span style={{ color: 'var(--text-3)' }}>✗ {lang === 'ar' ? 'فشل الاستخراج' : 'Extraction failed'} &nbsp;
                <button onClick={onRetryOcr} style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.68rem', textDecoration: 'underline' }}>
                  {lang === 'ar' ? 'إعادة المسح' : 'Retry scan'}
                </button>
              </span>
            )}
          </div>

          {/* OCR textarea + always-visible add button */}
          {(hasText || img.ocrStatus === 'error') && (
            <div style={{ position: 'relative', paddingBottom: 36 }}>
              <textarea
                ref={textareaRef}
                value={img.ocrText}
                onChange={e => onTextEdit(e.target.value)}
                onMouseUp={handleMouseUp}
                onKeyUp={handleMouseUp}
                style={{
                  padding: '12px 14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  fontSize: '.88rem', lineHeight: 1.9,
                  color: 'var(--text)', direction: 'rtl',
                  resize: 'vertical', minHeight: 140,
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: 'inherit', outline: 'none',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              {/* Always-visible add button — active only when text selected */}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={handleAddSel}
                disabled={!sel}
                style={{
                  position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                  background: sel ? 'var(--gold)' : 'var(--border)',
                  color: sel ? '#fff' : 'var(--text-3)',
                  border: 'none', borderRadius: 'var(--r-full)',
                  padding: '5px 20px', fontSize: '.75rem', fontWeight: 700,
                  cursor: sel ? 'pointer' : 'default',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  boxShadow: sel ? '0 2px 10px rgba(0,0,0,.15)' : 'none',
                  transition: 'all .15s ease',
                }}
              >
                + {lang === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
          )}

          {/* Saved quotes list */}
          {img.pending.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-3)', fontWeight: 600 }}>
                {img.pending.length} {lang === 'ar' ? 'اقتباس مضاف' : 'added'}
              </div>
              {img.pending.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 12px',
                  background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
                  borderRadius: 'var(--r-md)', fontSize: '.84rem', lineHeight: 1.7,
                }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>❝</span>
                  <span style={{ flex: 1, color: 'var(--text)', direction: 'rtl' }}>{q}</span>
                  <button onClick={() => onRemovePending(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '.75rem', padding: 0, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {img.savedCount > 0 && img.pending.length === 0 && (
            <div style={{ fontSize: '.75rem', color: 'var(--green)', fontWeight: 500 }}>
              ✓ {lang === 'ar' ? `${img.savedCount} اقتباس محفوظ` : `${img.savedCount} quote${img.savedCount > 1 ? 's' : ''} saved`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
        .select('id, public_url, file_name')
        .eq('book_id', bookId).eq('user_id', user!.id)
        .neq('status', 'dismissed')
      if (!imgs || imgs.length === 0) return

      const imgIds = imgs.map(i => i.id)

      // Extracted text for those images
      const { data: extracted } = await supabase
        .from('extracted_texts').select('image_id, full_text').in('image_id', imgIds)
      if (!extracted || extracted.length === 0) return

      const extractedIds = extracted.map(e => e.image_id)

      // Which ones already have quotes?
      const { data: quoted } = await supabase
        .from('quotes').select('image_id').in('image_id', extractedIds)
      const quotedSet = new Set((quoted || []).map(q => q.image_id).filter(Boolean))

      const pending: ImageItem[] = []
      for (const ex of extracted) {
        if (quotedSet.has(ex.image_id)) continue
        const img = imgs.find(i => i.id === ex.image_id)
        if (!img) continue
        pending.push({
          id:           `existing_${img.id}`,
          preview:      img.public_url ?? '',
          ocrStatus:    'done',
          uploadStatus: 'done',
          dbImageId:    img.id,
          ocrText:      ex.full_text ?? '',
          pending:      [],
          savedCount:   0,
          isExisting:   true,
        })
      }
      if (pending.length > 0)
        setImages(prev => {
          const existingDbIds = new Set(prev.map(i => i.dbImageId).filter(Boolean))
          return [...prev, ...pending.filter(p => !existingDbIds.has(p.dbImageId))]
        })
    }
    loadExisting()
  }, [user, bookId])

  /* ── OCR — saves text to DB after success ── */
  async function runOcr(itemId: string, file: File | undefined, dbImageId?: string) {
    if (!file) return
    setImages(prev => prev.map(i => i.id === itemId ? { ...i, ocrStatus: 'scanning' } : i))
    try {
      const base64 = await imageToBase64(file)
      const text   = await serverOcr(base64)

      // Save extracted text to DB so unprocessed images appear in inbox
      const imgId = dbImageId ?? images.find(i => i.id === itemId)?.dbImageId
      if (imgId && text) {
        const { error: etErr } = await supabase.from('extracted_texts').insert({
          image_id:     imgId,
          full_text:    text,
          ocr_provider: 'google-vision',
          extracted_at: new Date().toISOString(),
        })
        if (etErr) console.error('extracted_text insert error:', JSON.stringify(etErr))
      }

      setImages(prev => prev.map(i =>
        i.id === itemId ? { ...i, ocrStatus: 'done', ocrText: text } : i
      ))
    } catch (err) {
      console.error('OCR:', err)
      setImages(prev => prev.map(i => i.id === itemId ? { ...i, ocrStatus: 'error' } : i))
    }
  }

  /* ── Storage upload — updates existing image record ── */
  async function tryUpload(itemId: string, file: File | undefined, dbImageId?: string) {
    if (!file) return
    setImages(prev => prev.map(i => i.id === itemId ? { ...i, uploadStatus: 'uploading' } : i))
    try {
      const path = `${user!.id}/${bookId}/${Date.now()}_${file.name}`
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
    } catch {
      setImages(prev => prev.map(i => i.id === itemId ? { ...i, uploadStatus: 'error' } : i))
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

  /* ── Save all pending quotes for one image ── */
  async function saveAll(imgId: string) {
    const img = images.find(i => i.id === imgId)
    if (!img || img.pending.length === 0) return

    let saved = 0
    for (const text of img.pending) {
      const payload: Record<string, unknown> = {
        user_id: user!.id, book_id: bookId,
        text, tags: [], is_favorite: false,
      }
      if (img.dbImageId) payload.image_id = img.dbImageId
      const { error } = await supabase.from('quotes').insert(payload)
      if (!error) {
        await supabase.rpc('increment_quotes_count', { p_user_id: user!.id, p_book_id: bookId })
        saved++
      } else {
        console.error('Quote insert error:', JSON.stringify(error))
      }
    }
    if (saved === 0) { toast.error(lang === 'ar' ? 'تعذّر حفظ الاقتباسات' : 'Failed to save'); return }
    toast.success(lang === 'ar' ? `✓ حُفظ ${saved} اقتباس` : `✓ ${saved} saved`)
    dispatchStatsChanged()
    setImages(prev => prev.map(i =>
      i.id === imgId ? { ...i, pending: [], savedCount: i.savedCount + saved } : i
    ))
  }

  const totalPending   = images.reduce((s, i) => s + i.pending.length, 0)
  const totalSaved     = images.reduce((s, i) => s + i.savedCount, 0)
  const unprocessed    = images.filter(i => i.savedCount === 0 && i.ocrStatus !== 'scanning').length
  const ocrDone        = images.filter(i => i.ocrStatus === 'done' || i.ocrStatus === 'error').length
  const ocrInProgress  = images.some(i => i.ocrStatus === 'scanning' || i.ocrStatus === 'idle')
  const ocrPct         = images.length > 0 ? Math.round((ocrDone / images.length) * 100) : 0

  return (
    <>
      <Link href={`/books/${bookId}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem', color: 'var(--text-3)', marginBottom: 24 }}>
        ← {bookTitle || t('backToBook')}
      </Link>

      <div style={{ marginBottom: 24 }}>
        <div className="page-title">{t('uploadTitle')}</div>
        <div className="page-sub">{t('uploadSub')}</div>
      </div>

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

      {images.length > 0 && (
        <>
          {/* Summary + Progress */}
          <div style={{
            marginBottom: 16, padding: '12px 16px',
            background: 'var(--surface)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--r-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ocrInProgress ? 8 : 0 }}>
              <div style={{ display: 'flex', gap: 14, fontSize: '.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* OCR counter */}
                <span style={{ fontWeight: 600, color: ocrInProgress ? 'var(--gold)' : 'var(--green)' }}>
                  {ocrInProgress
                    ? (lang === 'ar' ? `⟳ ${ocrDone}/${images.length} تمت معالجتها` : `⟳ ${ocrDone}/${images.length} processed`)
                    : (lang === 'ar' ? `✓ ${ocrDone}/${images.length} تمت المعالجة` : `✓ ${ocrDone}/${images.length} processed`)}
                </span>
                {totalSaved > 0 && <span style={{ color: 'var(--green)' }}>· {totalSaved} {lang === 'ar' ? 'محفوظ' : 'saved'}</span>}
                {totalPending > 0 && <span style={{ color: 'var(--gold)' }}>· {totalPending} {lang === 'ar' ? 'انتظار' : 'pending'}</span>}
              </div>
              <button onClick={() => setImages([])}
                style={{ fontSize: '.75rem', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('removeAll')}
              </button>
            </div>
            {/* Progress bar — only while processing */}
            {ocrInProgress && (
              <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: 'var(--gold)',
                  width: `${ocrPct}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {images.map(img => (
              <ImageCard key={img.id} img={img} lang={lang}
                onRemove={() => setImages(prev => {
                  URL.revokeObjectURL(prev.find(i => i.id === img.id)?.preview || '')
                  return prev.filter(i => i.id !== img.id)
                })}
                onAddPending={text => addPending(img.id, text)}
                onRemovePending={idx => removePending(img.id, idx)}
                onSaveAll={() => saveAll(img.id)}
                onRetryOcr={() => runOcr(img.id, img.file, img.dbImageId)}
                onTextEdit={newText => setImages(prev => prev.map(i => i.id === img.id ? { ...i, ocrText: newText } : i))}
              />
            ))}
          </div>

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ fontSize: '.88rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              + {t('addMoreImgs')}
            </button>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {unprocessed > 0 && (
                <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>
                  {lang === 'ar' ? `${unprocessed} صورة ستُحفظ في الصندوق` : `${unprocessed} saved to inbox`}
                </span>
              )}
              <button onClick={() => router.push(`/books/${bookId}`)} className="btn btn-gold">
                {t('doneBtn')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ═══════════════════════════════════════ */
function ImageCard({ img, lang, onRemove, onAddPending, onRemovePending, onSaveAll, onRetryOcr, onTextEdit }: {
  img: ImageItem; lang: string
  onRemove: () => void
  onAddPending: (t: string) => void
  onRemovePending: (i: number) => void
  onSaveAll: () => void
  onRetryOcr: () => void
  onTextEdit: (text: string) => void
}) {
  const [sel, setSel] = useState('')
  const textareaRef   = useRef<HTMLTextAreaElement>(null)

  // Capture selected text from textarea for quote adding
  const handleMouseUp = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const s = el.value.slice(el.selectionStart, el.selectionEnd).trim()
    setSel(s)
  }, [])

  const handleAddSel = () => {
    if (!sel) return
    onAddPending(sel)
    setSel('')
  }

  const isScanning = img.ocrStatus === 'scanning'
  const hasText    = img.ocrText.length > 0

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>

        {/* Preview */}
        <div style={{ position: 'relative', minHeight: 200, background: 'var(--surface-2)' }}>
          {img.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '1.6rem' }}>🖼️</div>
          )}
          {isScanning && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="spinner" style={{ borderTopColor: 'var(--gold)', width: 24, height: 24 }} />
              <span style={{ fontSize: '.68rem', color: 'var(--gold)', fontWeight: 600 }}>{lang === 'ar' ? 'قراءة...' : 'Scanning...'}</span>
            </div>
          )}
          {img.savedCount > 0 && (
            <div style={{ position: 'absolute', bottom: 8, insetInlineStart: 8, background: 'var(--green)', color: '#fff', borderRadius: 'var(--r-full)', fontSize: '.65rem', fontWeight: 700, padding: '3px 8px' }}>
              ✓ {img.savedCount}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Status + remove */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '.72rem', fontWeight: 500 }}>
              {isScanning && <span style={{ color: 'var(--gold)' }}>⟳ {lang === 'ar' ? 'جارٍ الاستخراج...' : 'Extracting...'}</span>}
              {img.ocrStatus === 'done' && hasText && <span style={{ color: 'var(--green)' }}>✓ {lang === 'ar' ? 'تم استخراج النص' : 'Text ready'}</span>}
              {img.ocrStatus === 'done' && !hasText && <span style={{ color: 'var(--text-3)' }}>○ {lang === 'ar' ? 'لا نص في الصورة' : 'No text found'}</span>}
              {img.ocrStatus === 'error' && (
                <span style={{ color: 'var(--text-3)' }}>✗ {lang === 'ar' ? 'فشل' : 'Failed'} &nbsp;
                  {!img.isExisting && (
                    <button onClick={onRetryOcr} style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.68rem', textDecoration: 'underline' }}>
                      {lang === 'ar' ? 'إعادة' : 'Retry'}
                    </button>
                  )}
                </span>
              )}
            </span>
            <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', color: 'var(--text-3)', fontFamily: 'inherit' }}>✕</button>
          </div>

          {/* OCR text — always editable textarea, select text to add as quote */}
          {(hasText || img.ocrStatus === 'error') && (
            <div style={{ position: 'relative' }}>
              <>
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
                    resize: 'vertical', minHeight: 120,
                    width: '100%', boxSizing: 'border-box',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
                {sel && (
                  <button onMouseDown={e => e.preventDefault()} onClick={handleAddSel} style={{
                    position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--gold)', color: '#fff', border: 'none',
                    borderRadius: 'var(--r-full)', padding: '4px 16px',
                    fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                    boxShadow: '0 2px 10px rgba(0,0,0,.2)',
                  }}>
                    + {lang === 'ar' ? 'أضف كاقتباس' : 'Add as quote'}
                  </button>
                )}
              </>
            </div>
          )}

          {/* Hint */}
          {hasText && img.pending.length === 0 && img.savedCount === 0 && !isScanning && (
            <p style={{ fontSize: '.72rem', color: 'var(--text-3)', margin: 0 }}>
              {lang === 'ar' ? '💡 ظلّل أي جزء من النص لإضافته كاقتباس' : '💡 Highlight text to add as a quote'}
            </p>
          )}

          {/* Pending quotes */}
          {img.pending.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-3)', fontWeight: 600 }}>
                {img.pending.length} {lang === 'ar' ? 'اقتباس محدد' : 'selected'}
              </div>
              {img.pending.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 12px',
                  background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
                  borderRadius: 'var(--r-md)', fontSize: '.84rem', lineHeight: 1.7,
                }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>❝</span>
                  <span style={{ flex: 1, color: 'var(--text)' }}>{q}</span>
                  <button onClick={() => onRemovePending(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '.75rem', padding: 0, flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onSaveAll} className="btn btn-gold" style={{ fontSize: '.82rem' }}>
                  {lang === 'ar' ? `حفظ ${img.pending.length} اقتباس` : `Save ${img.pending.length}`}
                </button>
              </div>
            </div>
          )}

          {img.savedCount > 0 && img.pending.length === 0 && (
            <div style={{ fontSize: '.75rem', color: 'var(--green)', fontWeight: 500 }}>
              ✓ {lang === 'ar' ? `${img.savedCount} اقتباس محفوظ من هذه الصورة` : `${img.savedCount} quote${img.savedCount > 1 ? 's' : ''} saved`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

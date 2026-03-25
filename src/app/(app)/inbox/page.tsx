'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DynamicCover from '@/components/DynamicCover'
import { InboxSkeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'

interface InboxItem {
  imageId:      string
  bookId:       string
  bookTitle:    string
  bookAuthor:   string
  bookCoverUrl: string | null
  publicUrl:    string
  ocrPreview:   string
}

export default function InboxPage() {
  const { user }   = useAuthStore()
  const { lang }   = useSettings()
  const t          = useT(lang)
  const router     = useRouter()
  const [items, setItems]     = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    try {
      // 1. All user images with book info (exclude dismissed)
      const { data: userImages } = await supabase
        .from('images')
        .select('id, book_id, public_url, file_name, books(title, author, cover_url)')
        .eq('user_id', user!.id)
        .neq('status', 'dismissed')
      if (!userImages || userImages.length === 0) { setItems([]); return }

      const imageIds = userImages.map(i => i.id)

      // 2. Images that have extracted text
      const { data: extracted } = await supabase
        .from('extracted_texts')
        .select('image_id, full_text')
        .in('image_id', imageIds)
      if (!extracted || extracted.length === 0) { setItems([]); return }

      const extractedIds = extracted.map(e => e.image_id)

      // 3. Images that already have quotes saved
      const { data: quoted } = await supabase
        .from('quotes').select('image_id').in('image_id', extractedIds)
      const quotedSet = new Set((quoted || []).map(q => q.image_id).filter(Boolean))

      // 4. Build InboxItem list — only unquoted images
      const result: InboxItem[] = []
      for (const ex of extracted) {
        if (quotedSet.has(ex.image_id)) continue
        const img = userImages.find(i => i.id === ex.image_id)
        if (!img) continue
        const book = img.books as unknown as { title: string; author: string; cover_url: string | null }
        result.push({
          imageId:      img.id,
          bookId:       img.book_id,
          bookTitle:    book?.title     ?? '',
          bookAuthor:   book?.author    ?? '',
          bookCoverUrl: book?.cover_url ?? null,
          publicUrl:    img.public_url  ?? '',
          ocrPreview:   (ex.full_text ?? '').slice(0, 120).trim(),
        })
      }
      setItems(result)
    } finally { setLoading(false) }
  }

  async function dismiss(imageId: string) {
    setDeleting(imageId)
    const { error } = await supabase
      .from('images').update({ status: 'dismissed' }).eq('id', imageId)
    if (error) {
      console.error('dismiss error:', JSON.stringify(error))
    }
    // Remove from UI regardless — optimistic
    setItems(prev => prev.filter(i => i.imageId !== imageId))
    setDeleting(null)
  }

  if (loading) return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div className="page-title">{t('inboxTitle')}</div>
      </div>
      <InboxSkeleton count={4} />
    </>
  )

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div className="page-title">{t('inboxTitle')}</div>
        <div className="page-sub">
          {items.length === 0
            ? t('inboxEmpty')
            : lang === 'ar' ? `${items.length} صورة بانتظار الاستخلاص` : `${items.length} image${items.length !== 1 ? 's' : ''} pending`}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-title">{t('inboxEmpty')}</div>
            <div className="empty-sub">{t('inboxEmptySub')}</div>
          </div>
        </div>
      ) : (
        <div className="quotes-list">
          {items.map(item => (
            <div key={item.imageId}
              style={{
                padding: '16px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--border-light)',
                borderInlineStart: '3px solid var(--gold)',
                borderRadius: 'var(--r-lg)',
                transition: 'border-color var(--t), box-shadow var(--t)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.boxShadow = 'var(--sh-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {/* Top row: cover + meta + actions */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {/* Cover — library style */}
                <div style={{
                  width: 44, flexShrink: 0,
                  aspectRatio: '2/3',
                  borderRadius: '3px 6px 6px 3px',
                  overflow: 'hidden',
                  background: 'var(--surface-2)',
                  position: 'relative',
                  boxShadow: '-2px 2px 0 -1px #c8a96a33, -4px 4px 0 -2px #b8912e22, 0 4px 12px rgba(27,24,21,.15)',
                }}>
                  {item.bookCoverUrl ? (
                    <Image src={item.bookCoverUrl} alt={item.bookTitle} fill sizes="44px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <DynamicCover title={item.bookTitle} />
                  )}
                  <div style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(to right, rgba(0,0,0,.18) 0%, transparent 100%)', pointerEvents: 'none' }} />
                </div>

                {/* Book info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.bookTitle}
                  </div>
                  {item.bookAuthor && (
                    <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.bookAuthor}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => router.push(`/books/${item.bookId}/upload`)}
                    style={{
                      padding: '5px 14px',
                      background: 'var(--gold)', color: '#fff',
                      border: 'none', borderRadius: 'var(--r-md)',
                      fontSize: '.76rem', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}>
                    {lang === 'ar' ? 'استخلاص' : 'Extract'}
                  </button>
                  <button
                    onClick={() => dismiss(item.imageId)}
                    disabled={deleting === item.imageId}
                    title={lang === 'ar' ? 'حذف من الصندوق' : 'Dismiss'}
                    style={{
                      width: 28, height: 28,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)', cursor: 'pointer', color: 'var(--text-3)',
                      fontSize: '.76rem', opacity: deleting === item.imageId ? 0.4 : 1,
                      transition: 'all var(--t)',
                    }}
                    onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = '#ef4444'; b.style.color = '#ef4444'; b.style.background = '#fef2f2' }}
                    onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-3)'; b.style.background = 'none' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* OCR preview — quote-style text */}
              {item.ocrPreview && (
                <div style={{
                  fontSize: '.92rem', lineHeight: 1.85, fontWeight: 300,
                  color: 'var(--text)', direction: 'rtl',
                  marginTop: 12, paddingTop: 12,
                  borderTop: '1px solid var(--border-light)',
                  overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
                }}>
                  {item.ocrPreview}…
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

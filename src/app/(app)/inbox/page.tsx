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

interface InboxBook {
  bookId:       string
  bookTitle:    string
  bookAuthor:   string
  bookCoverUrl: string | null
  imageCount:   number
}

export default function InboxPage() {
  const { user }   = useAuthStore()
  const { lang }   = useSettings()
  const t          = useT(lang)
  const router     = useRouter()
  const [books, setBooks]     = useState<InboxBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user]) // eslint-disable-line

  async function load() {
    setLoading(true)
    try {
      // 1. All user images with book info (exclude dismissed)
      const { data: userImages } = await supabase
        .from('images')
        .select('id, book_id, books(title, author, cover_url)')
        .eq('user_id', user!.id)
        .neq('status', 'dismissed')
      if (!userImages || userImages.length === 0) { setBooks([]); return }

      const imageIds = userImages.map(i => i.id)

      // 2. Only need quoted images — OCR text is optional (may have failed/pending)
      const { data: quoted } = await supabase
        .from('quotes').select('image_id').in('image_id', imageIds)

      const quotedSet = new Set((quoted || []).map(q => q.image_id).filter(Boolean))

      // 3. Unprocessed = no quotes yet (regardless of OCR status)
      const unprocessed = userImages.filter(img => !quotedSet.has(img.id))

      // 5. Group by book
      const map = new Map<string, InboxBook>()
      for (const img of unprocessed) {
        const book = img.books as unknown as { title: string; author: string; cover_url: string | null }
        if (!book) continue
        const existing = map.get(img.book_id)
        if (existing) {
          existing.imageCount++
        } else {
          map.set(img.book_id, {
            bookId:       img.book_id,
            bookTitle:    book.title     ?? '',
            bookAuthor:   book.author    ?? '',
            bookCoverUrl: book.cover_url ?? null,
            imageCount:   1,
          })
        }
      }

      setBooks([...map.values()])
    } finally { setLoading(false) }
  }

  if (loading) return (
    <>
      <InboxSkeleton count={4} />
    </>
  )

  return (
    <>

      {books.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-title">{t('inboxEmpty')}</div>
            <div className="empty-sub">{t('inboxEmptySub')}</div>
          </div>
        </div>
      ) : (
        /* Same grid layout as Library */
        <div className="lib-grid">
          {books.map(book => (
            <button
              key={book.bookId}
              onClick={() => router.push(`/books/${book.bookId}/upload`)}
              className="lib-book-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'inherit', padding: 0 }}
            >
              <div className="lib-book-card">
                {/* Cover */}
                <div className="lib-book-cover">
                  <div className="lib-book-spine" />
                  {book.bookCoverUrl ? (
                    <Image
                      src={book.bookCoverUrl}
                      alt={book.bookTitle}
                      fill sizes="(max-width:600px) 120px, 160px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <DynamicCover title={book.bookTitle} />
                  )}
                  {/* Pending badge */}
                  <div className="lib-book-badge">
                    {book.imageCount} {lang === 'ar' ? 'صورة' : 'img'}
                  </div>
                </div>
                {/* Info — shown explicitly (lib-book-info is hidden globally) */}
                <div style={{ padding: '8px 4px 2px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 2,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {book.bookTitle}
                  </div>
                  <div style={{ fontSize: '.63rem', color: 'var(--gold)', fontWeight: 600 }}>
                    {lang === 'ar' ? 'استخلاص ←' : 'Extract →'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

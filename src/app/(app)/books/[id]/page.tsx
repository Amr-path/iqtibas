'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import DynamicCover from '@/components/DynamicCover'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Skeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import toast from 'react-hot-toast'
import { dispatchStatsChanged } from '@/lib/sidebarEvents'
import type { UserBook, Quote } from '@/types'


const BOOK_COLORS = [
  'linear-gradient(150deg,#8B4513,#D2691E)',
  'linear-gradient(150deg,#2E5C8A,#4A90D9)',
  'linear-gradient(150deg,#5B4A6B,#9B7DB8)',
  'linear-gradient(150deg,#3D7A5A,#6EBA8E)',
  'linear-gradient(150deg,#7A3D3D,#C4706E)',
  'linear-gradient(150deg,#4A6B7A,#6EA8BA)',
]

type QuoteWithBook = Quote & { books?: { title: string; author: string } }

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const { lang } = useSettings()
  const t = useT(lang)
  const router = useRouter()

  const [ub, setUb]               = useState<UserBook | null>(null)
  const [quotes, setQuotes]       = useState<QuoteWithBook[]>([])
  const [loading, setLoading]     = useState(true)
  const [deleteBook, setDeleteBook] = useState(false)
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null)
  const [favLoading, setFavLoading] = useState<string | null>(null)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [editBuffer, setEditBuffer] = useState('')

  useEffect(() => { if (user && id) load() }, [user, id])

  async function load() {
    setLoading(true)
    const [{ data: ubData }, { data: qData }] = await Promise.all([
      supabase.from('user_books').select('*, books(*)')
        .eq('user_id', user!.id).eq('book_id', id).single(),
      supabase.from('quotes').select('*, books(title, author)')
        .eq('user_id', user!.id).eq('book_id', id)
        .order('created_at', { ascending: false }),
    ])
    const actualQuotes = (qData as QuoteWithBook[]) || []
    setUb(ubData)
    setQuotes(actualQuotes)
    // Resync quotes_count if it's stale
    if (ubData && ubData.quotes_count !== actualQuotes.length) {
      supabase.from('user_books')
        .update({ quotes_count: actualQuotes.length })
        .eq('id', ubData.id)
        .then(() => {})
    }
    setLoading(false)
  }

  async function handleDeleteBook() {
    if (!ub) return
    const { error } = await supabase.from('user_books').delete().eq('id', ub.id)
    if (error) { toast.error(lang === 'ar' ? 'تعذّر حذف الكتاب' : 'Failed to delete book'); return }
    toast.success(lang === 'ar' ? 'تم حذف الكتاب' : 'Book deleted')
    router.push('/library')
  }

  async function handleDeleteQuote(quoteId: string) {
    const { error } = await supabase.from('quotes').delete().eq('id', quoteId)
    if (error) { toast.error(lang === 'ar' ? 'تعذّر حذف الاقتباس' : 'Failed to delete'); return }
    const newQuotes = quotes.filter(q => q.id !== quoteId)
    setQuotes(newQuotes)
    // Keep quotes_count in sync with actual count
    if (ub) {
      await supabase.from('user_books').update({ quotes_count: newQuotes.length }).eq('id', ub.id)
      setUb(prev => prev ? { ...prev, quotes_count: newQuotes.length } : null)
    }
    toast.success(lang === 'ar' ? 'تم حذف الاقتباس' : 'Quote deleted')
    dispatchStatsChanged()
  }

  async function toggleFavorite(quote: QuoteWithBook) {
    setFavLoading(quote.id)
    const newVal = !quote.is_favorite
    const { error } = await supabase.from('quotes').update({ is_favorite: newVal }).eq('id', quote.id)
    if (!error) { setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, is_favorite: newVal } : q)); dispatchStatsChanged() }
    setFavLoading(null)
  }

  async function handleEditQuote(quoteId: string) {
    const trimmed = editBuffer.trim()
    if (!trimmed) return
    const { error } = await supabase.from('quotes').update({ text: trimmed }).eq('id', quoteId)
    if (error) { toast.error(lang === 'ar' ? 'تعذّر حفظ التعديل' : 'Failed to save'); return }
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, text: trimmed } : q))
    setEditingQuoteId(null)
    toast.success(lang === 'ar' ? 'تم حفظ التعديل' : 'Saved')
  }

  if (loading) return <BookDetailSkeleton lang={lang} />

  if (!ub) return (
    <div className="card" style={{ marginTop: 20, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>📚</div>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>{lang === 'ar' ? 'الكتاب غير موجود' : 'Book not found'}</div>
      <Link href="/library" className="btn btn-gold" style={{ marginTop: 16 }}>
        {lang === 'ar' ? '← المكتبة' : '← Library'}
      </Link>
    </div>
  )

  const book = ub.books

  return (
    <>
      {/* ── Back ── */}
      <Link href="/library" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem', color: 'var(--text-3)', marginBottom: 24, transition: 'color var(--t)' }}
        className="back-link">
        {lang === 'ar' ? '← المكتبة' : '← Library'}
      </Link>

      {/* ── Book header ── */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap' }}>
        {/* Cover */}
        <div style={{ width: 110, flexShrink: 0, borderRadius: '4px 10px 10px 4px', overflow: 'hidden', boxShadow: 'var(--sh-lg)', position: 'relative', aspectRatio: '2/3' }}>
          {book.cover_url
            ? <Image src={book.cover_url} alt={book.title} fill sizes="110px" style={{ objectFit: 'cover' }} />
            : <DynamicCover title={book.title} />
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{book.title}</div>
          <div style={{ fontSize: '1rem', color: 'var(--text-2)', marginBottom: 16 }}>{book.author}</div>

          {/* Stats chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatChip icon="❝" label={`${quotes.length} ${lang === 'ar' ? 'اقتباس' : 'quotes'}`} gold />
            {book.published_year && <StatChip icon="📅" label={String(book.published_year)} />}
            {book.page_count && <StatChip icon="📄" label={`${book.page_count} ${lang === 'ar' ? 'صفحة' : 'pages'}`} />}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => router.push(`/books/${id}/upload`)} className="btn btn-gold" style={{ fontSize: '.88rem' }}>
              {lang === 'ar' ? '+ رفع صور' : '+ Upload Images'}
            </button>
            <button onClick={() => setDeleteBook(true)}
              style={{ padding: '9px 16px', borderRadius: 'var(--r-md)', border: '1px solid rgba(139,58,58,.25)', background: 'rgba(139,58,58,.06)', color: '#8B3A3A', fontSize: '.85rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--t)' }}>
              {lang === 'ar' ? 'حذف الكتاب' : 'Delete Book'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {book.description && (
        <div className="card" style={{ padding: '18px 22px', marginBottom: 28, fontSize: '.88rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
          <div style={{ fontSize: '.75rem', color: 'var(--text-3)', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {lang === 'ar' ? 'نبذة' : 'About'}
          </div>
          {book.description}
        </div>
      )}

      {/* ── Quotes section ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: '1rem' }}>
          {lang === 'ar' ? 'الاقتباسات' : 'Quotes'}
          {quotes.length > 0 && <span style={{ marginInlineStart: 8, fontSize: '.8rem', color: 'var(--text-3)', fontWeight: 400 }}>({quotes.length})</span>}
        </div>
        {quotes.length > 0 && (
          <button onClick={() => router.push(`/books/${id}/upload`)} style={{ fontSize: '.82rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            + {lang === 'ar' ? 'إضافة اقتباس' : 'Add quote'}
          </button>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="card" style={{ padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>❝</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>{lang === 'ar' ? 'لا توجد اقتباسات بعد' : 'No quotes yet'}</div>
          <div style={{ fontSize: '.85rem', color: 'var(--text-3)', marginBottom: 20 }}>
            {lang === 'ar' ? 'ارفع صور الصفحات لاستخراج اقتباساتك' : 'Upload page images to extract quotes'}
          </div>
          <button onClick={() => router.push(`/books/${id}/upload`)} className="btn btn-gold">
            {lang === 'ar' ? '+ رفع صور' : '+ Upload Images'}
          </button>
        </div>
      ) : (
        <div className="quotes-list">
          {quotes.map((quote, idx) => {
            const isEditing = editingQuoteId === quote.id
            return (
              <div key={quote.id} style={{
                padding: '16px 20px', background: 'var(--surface)',
                border: '1px solid var(--border-light)',
                borderInlineStart: `3px solid ${BOOK_COLORS[idx % BOOK_COLORS.length].split(',')[1]?.trim().slice(0, -1) || 'var(--gold)'}`,
                borderRadius: 'var(--r-lg)',
                display: 'flex', gap: 14, alignItems: 'flex-start',
                transition: 'border-color var(--t), box-shadow var(--t)',
              }}
                onMouseEnter={e => { if (!isEditing) { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.boxShadow = 'var(--sh-sm)' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {/* Text / Edit area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={editBuffer}
                        onChange={e => setEditBuffer(e.target.value)}
                        autoFocus
                        rows={Math.max(3, editBuffer.split('\n').length)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '10px 12px',
                          background: 'var(--surface-2)',
                          border: '1.5px solid var(--gold)',
                          borderRadius: 'var(--r-md)',
                          fontSize: '.92rem', lineHeight: 1.85, fontWeight: 300,
                          color: 'var(--text)', direction: 'rtl',
                          fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingQuoteId(null)}
                          style={{ padding: '5px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '.76rem', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-3)' }}>
                          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button onClick={() => handleEditQuote(quote.id)}
                          style={{ padding: '5px 14px', background: 'var(--gold)', border: 'none', borderRadius: 'var(--r-md)', fontSize: '.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>
                          {lang === 'ar' ? 'حفظ' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => { setEditingQuoteId(quote.id); setEditBuffer(quote.text) }}
                        title={lang === 'ar' ? 'انقر للتعديل' : 'Click to edit'}
                        style={{ fontSize: '.92rem', lineHeight: 1.85, fontWeight: 300, color: 'var(--text)', direction: 'rtl', marginBottom: quote.page_number ? 8 : 0, cursor: 'text', borderRadius: 'var(--r-sm)', padding: '2px 4px', margin: '-2px -4px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        {quote.text}
                      </div>
                      {quote.page_number && (
                        <div style={{ fontSize: '.73rem', color: 'var(--text-3)', marginTop: quote.page_number ? 8 : 0 }}>
                          {lang === 'ar' ? `صفحة ${quote.page_number}` : `Page ${quote.page_number}`}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                  {!isEditing && (
                    <>
                      <button onClick={() => toggleFavorite(quote)} disabled={favLoading === quote.id}
                        title={quote.is_favorite ? t('removeFav') : t('addFav')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: favLoading === quote.id ? .5 : 1, transition: 'opacity var(--t)' }}>
                        {quote.is_favorite ? '★' : '☆'}
                      </button>
                      <button onClick={() => setDeleteQuoteId(quote.id)}
                        title={t('deleteQuote')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem', color: 'var(--text-3)', transition: 'color var(--t)' }}>
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        open={deleteBook}
        danger
        title={lang === 'ar' ? 'حذف الكتاب' : 'Delete Book'}
        message={lang === 'ar'
          ? `هل أنت متأكد من حذف "${book.title}"؟ سيتم حذف جميع اقتباساته أيضاً.`
          : `Are you sure you want to delete "${book.title}"? All its quotes will be deleted too.`}
        confirmLabel={lang === 'ar' ? 'نعم، احذف' : 'Yes, Delete'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        onConfirm={handleDeleteBook}
        onCancel={() => setDeleteBook(false)}
      />
      <ConfirmDialog
        open={!!deleteQuoteId}
        danger
        title={lang === 'ar' ? 'حذف الاقتباس' : 'Delete Quote'}
        message={lang === 'ar' ? 'هل أنت متأكد من حذف هذا الاقتباس؟' : 'Are you sure you want to delete this quote?'}
        confirmLabel={lang === 'ar' ? 'نعم، احذف' : 'Yes, Delete'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        onConfirm={() => { if (deleteQuoteId) handleDeleteQuote(deleteQuoteId); setDeleteQuoteId(null) }}
        onCancel={() => setDeleteQuoteId(null)}
      />
    </>
  )
}

function StatChip({ icon, label, gold }: { icon: string; label: string; gold?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 12px', borderRadius: 'var(--r-full)',
      background: gold ? 'var(--gold-bg)' : 'var(--surface-2)',
      border: `1px solid ${gold ? 'var(--gold-border)' : 'var(--border)'}`,
      fontSize: '.78rem', color: gold ? 'var(--gold)' : 'var(--text-2)', fontWeight: gold ? 600 : 400,
    }}>
      <span>{icon}</span>{label}
    </div>
  )
}

function BookDetailSkeleton({ lang }: { lang: string }) {
  return (
    <>
      <Skeleton height={14} borderRadius={6} width={80} style={{ marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: 36 }}>
        <div className="skeleton" style={{ width: 110, aspectRatio: '2/3', borderRadius: '4px 10px 10px 4px' }} />
        <div style={{ flex: 1 }}>
          <Skeleton height={28} borderRadius={8} width="70%" style={{ marginBottom: 10 }} />
          <Skeleton height={16} borderRadius={6} width="40%" style={{ marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[0,1,2].map(i => <Skeleton key={i} height={28} borderRadius={99} width={90} />)}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Skeleton height={38} borderRadius={12} width={120} />
            <Skeleton height={38} borderRadius={12} width={100} />
          </div>
        </div>
      </div>
    </>
  )
}

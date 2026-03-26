'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import DynamicCover from '@/components/DynamicCover'
import ConfirmDialog from '@/components/ConfirmDialog'
import { LibrarySkeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import toast from 'react-hot-toast'
import type { UserBook } from '@/types'

type SortKey = 'date' | 'name' | 'quotes'

export default function LibraryPage() {
  const { user } = useAuthStore()
  const { lang } = useSettings()
  const t = useT(lang)
  const [books, setBooks]     = useState<UserBook[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [sort, setSort]       = useState<SortKey>('date')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      // Both queries are independent — fire in parallel
      const [{ data }, { data: quotesData }] = await Promise.all([
        supabase.from('user_books').select('*, books(*)')
          .eq('user_id', user!.id).order('added_at', { ascending: false }),
        supabase.from('quotes').select('book_id').eq('user_id', user!.id),
      ])
      if (!data) { setLoading(false); return }

      const countMap = new Map<string, number>()
      for (const q of quotesData || []) {
        if (q.book_id) countMap.set(q.book_id, (countMap.get(q.book_id) ?? 0) + 1)
      }

      const booksWithCount = data.map(ub => ({
        ...ub,
        quotes_count: countMap.get(ub.book_id) ?? 0,
      }))
      setBooks(booksWithCount)
      setLoading(false)
    }
    load()
  }, [user])

  async function handleDelete(ubId: string) {
    const { error } = await supabase.from('user_books').delete().eq('id', ubId)
    if (error) { toast.error(lang === 'ar' ? 'تعذّر حذف الكتاب' : 'Failed to delete'); return }
    setBooks(prev => prev.filter(b => b.id !== ubId))
    toast.success(lang === 'ar' ? 'تم حذف الكتاب' : 'Book deleted')
  }

  const filtered = useMemo(() => {
    let list = books
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.books.title.toLowerCase().includes(q) ||
        b.books.author?.toLowerCase().includes(q)
      )
    }
    if (sort === 'name')   list = [...list].sort((a, b) => a.books.title.localeCompare(b.books.title))
    if (sort === 'quotes') list = [...list].sort((a, b) => b.quotes_count - a.quotes_count)
    return list
  }, [books, search, sort])

  const deleteTarget = books.find(b => b.id === deleteId)

  return (
    <>
      {/* ── Header ── */}
      <div className="topbar" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-title">{t('myLibraryTitle')}</div>
          <div className="page-sub">
            {books.length > 0
              ? `${books.length} ${lang === 'ar' ? 'كتاب في مكتبتك' : 'books in your library'}`
              : (lang === 'ar' ? 'مكتبتك الشخصية' : 'Your personal library')}
          </div>
        </div>
        <Link href="/search" className="btn btn-gold">{t('addBook')}</Link>
      </div>

      {/* ── Filter bar ── */}
      {!loading && books.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 180 }}>
            <svg style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', opacity: .4, pointerEvents: 'none' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث في مكتبتك...' : 'Search your library...'}
              style={{
                width: '100%', padding: '9px 12px 9px 34px', borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)', background: 'var(--surface)',
                fontSize: '.88rem', fontFamily: 'inherit', color: 'var(--text)',
                outline: 'none', transition: 'border-color var(--t)',
              }}
            />
          </div>
          {/* Sort */}
          {([['date', lang === 'ar' ? 'الأحدث' : 'Latest'],
             ['name', lang === 'ar' ? 'الاسم' : 'Name'],
             ['quotes', lang === 'ar' ? 'الأكثر اقتباسات' : 'Most Quotes']] as [SortKey, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setSort(key)} style={{
              padding: '8px 14px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)',
              background: sort === key ? 'var(--gold)' : 'var(--surface)',
              color: sort === key ? '#fff' : 'var(--text-2)',
              fontSize: '.82rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--t)',
              fontWeight: sort === key ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? <LibrarySkeleton count={8} /> : books.length === 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">{t('emptyLib')}</div>
            <div className="empty-sub" style={{ marginBottom: 24 }}>{t('emptyLibSub')}</div>
            <Link href="/search" className="btn btn-gold">{t('emptyLibBtn')}</Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔍</div>
          <div>{lang === 'ar' ? `لا نتائج لـ "${search}"` : `No results for "${search}"`}</div>
        </div>
      ) : (
        <div className="lib-grid">
          {filtered.map((ub, idx) => (
            <BookCard key={ub.id} ub={ub} lang={lang} idx={idx}
              onDelete={() => setDeleteId(ub.id)} />
          ))}
        </div>
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!deleteId}
        danger
        title={lang === 'ar' ? 'حذف الكتاب' : 'Delete Book'}
        message={lang === 'ar'
          ? `هل أنت متأكد من حذف "${deleteTarget?.books.title}"؟`
          : `Delete "${deleteTarget?.books.title}"?`}
        confirmLabel={lang === 'ar' ? 'نعم، احذف' : 'Yes, Delete'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}

/* ── Single book card ── */
function BookCard({ ub, lang, idx, onDelete }: {
  ub: UserBook; lang: string; idx: number; onDelete: () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link href={`/books/${ub.book_id}`} className="lib-book-link">
        <div className="lib-book-card">
          {/* Cover */}
          <div className="lib-book-cover">
            {ub.books.cover_url
              ? <Image src={ub.books.cover_url} alt={ub.books.title} fill sizes="145px" style={{ objectFit: 'cover' }} />
              : <DynamicCover title={ub.books.title} />
            }
            <div className="lib-book-spine" />
            {ub.quotes_count > 0 && (
              <div className="lib-book-badge">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M1 9c2 0 4-.5 4-4V2a1 1 0 00-1-1H2a1 1 0 00-1 1v3a1 1 0 001 1h.5c0 1-.5 2-1.5 2v1zm6 0c2 0 4-.5 4-4V2a1 1 0 00-1-1H8a1 1 0 00-1 1v3a1 1 0 001 1h.5c0 1-.5 2-1.5 2v1z"/>
                </svg>
                {ub.quotes_count}
              </div>
            )}
          </div>
          {/* Info */}
          <div className="lib-book-info">
            <div className="lib-book-title">{ub.books.title}</div>
            <div className="lib-book-author">{ub.books.author}</div>
          </div>
        </div>
      </Link>

      {/* Delete button on hover */}
      <button onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete() }}
        title={lang === 'ar' ? 'حذف الكتاب' : 'Delete book'}
        style={{
          position: 'absolute', top: 6, insetInlineEnd: 6,
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hover ? 1 : 0, transition: 'opacity .18s ease',
          color: '#fff', fontSize: '.75rem',
        }}>✕</button>
    </div>
  )
}

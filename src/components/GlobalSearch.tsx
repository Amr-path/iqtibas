'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'

interface QuoteResult {
  id: string; text: string; book_id: string
  books: { title: string; author: string } | null
}
interface BookResult {
  book_id: string
  books: { id: string; title: string; author: string; cover_url: string | null } | null
}

export default function GlobalSearch() {
  const { user } = useAuthStore()
  const { lang } = useSettings()
  const t = useT(lang)
  const router = useRouter()

  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes]   = useState<QuoteResult[]>([])
  const [books, setBooks]     = useState<BookResult[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onPD = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPD)
    return () => document.removeEventListener('pointerdown', onPD)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!user || q.trim().length < 2) {
      setQuotes([]); setBooks([]); setOpen(q.trim().length >= 2); setLoading(false); return
    }
    setLoading(true); setOpen(true)
    const term = `%${q.trim()}%`
    const [qr, br] = await Promise.all([
      supabase.from('quotes').select('id, text, book_id, books(title, author)')
        .eq('user_id', user.id).ilike('text', term).limit(5),
      supabase.from('user_books').select('book_id, books(id, title, author, cover_url)')
        .eq('user_id', user.id)
        .or(`title.ilike.${term},author.ilike.${term}`, { foreignTable: 'books' }).limit(5),
    ])
    setQuotes((qr.data as unknown as QuoteResult[]) || [])
    setBooks((br.data as unknown as BookResult[]) || [])
    setLoading(false)
  }, [user])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value; setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setQuotes([]); setBooks([]); setOpen(false); return }
    setLoading(true); setOpen(true)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  function goTo(path: string) { setOpen(false); setQuery(''); router.push(path) }
  function goSearch() {
    if (query.trim().length < 2) return
    goTo(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const hasResults = quotes.length > 0 || books.length > 0
  const isEmpty    = !loading && query.trim().length >= 2 && !hasResults

  return (
    <div ref={containerRef} className="global-search" style={{ position: 'relative' }}>
      <div className="global-search-bar">
        <svg className="global-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input ref={inputRef} type="text" className="global-search-input"
          placeholder={t('globalSearchPH')} value={query}
          onChange={handleChange} onFocus={() => { if (query.trim().length >= 2) setOpen(true) }}
          onKeyDown={e => { if (e.key === 'Enter') goSearch() }}
          autoComplete="off" dir="auto"
        />
        {query && (
          <button className="global-search-clear"
            onPointerDown={e => { e.preventDefault(); setQuery(''); setOpen(false); inputRef.current?.focus() }}>×</button>
        )}
      </div>
      {open && (
        <div className="global-search-dropdown">
          {loading && <div className="global-search-empty"><div className="spinner" style={{ width: 18, height: 18 }} /></div>}
          {!loading && isEmpty && <div className="global-search-empty">{t('globalSearchNoResults')}</div>}
          {!loading && books.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-label">{t('globalSearchBooks')}</div>
              {books.map(b => b.books && (
                <button key={b.book_id} className="global-search-item"
                  onPointerDown={e => { e.preventDefault(); goTo(`/books/${b.book_id}`) }}>
                  <span className="global-search-item-icon">📖</span>
                  <div className="global-search-item-body">
                    <div className="global-search-item-title">{b.books.title}</div>
                    <div className="global-search-item-sub">{b.books.author}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && quotes.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-label">{t('globalSearchQuotes')}</div>
              {quotes.map(q => (
                <button key={q.id} className="global-search-item"
                  onPointerDown={e => { e.preventDefault(); goSearch() }}>
                  <span className="global-search-item-icon" style={{ color: 'var(--gold)', fontFamily: 'Georgia, serif' }}>❝</span>
                  <div className="global-search-item-body">
                    <div className="global-search-item-title" style={{
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    } as React.CSSProperties}>{q.text}</div>
                    {q.books && <div className="global-search-item-sub">{q.books.title}</div>}
                  </div>
                </button>
              ))}
              <button className="global-search-item"
                onPointerDown={e => { e.preventDefault(); goSearch() }}
                style={{ justifyContent: 'center', color: 'var(--gold)', fontWeight: 600, fontSize: '.78rem', gap: 4 }}>
                {lang === 'ar' ? `عرض كل النتائج ←` : `View all results →`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

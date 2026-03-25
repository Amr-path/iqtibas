'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import { QuotesSkeleton } from '@/components/Skeleton'
import type { Quote } from '@/types'

const BOOK_COLORS = [
  'linear-gradient(150deg,#8B4513,#D2691E)',
  'linear-gradient(150deg,#2E5C8A,#4A90D9)',
  'linear-gradient(150deg,#5B4A6B,#9B7DB8)',
  'linear-gradient(150deg,#3D7A5A,#6EBA8E)',
  'linear-gradient(150deg,#7A3D3D,#C4706E)',
  'linear-gradient(150deg,#4A6B7A,#6EA8BA)',
]

const PAGE_SIZE = 15

interface QuoteWithBook extends Omit<Quote, 'books'> {
  books: { title: string; author: string; cover_url: string | null } | null
}

export default function DashboardPage() {
  const { user }  = useAuthStore()
  const { lang }  = useSettings()
  const t         = useT(lang)
  const router    = useRouter()

  const [quotes, setQuotes]             = useState<QuoteWithBook[]>([])
  const [displayQuotes, setDisplayQuotes] = useState<QuoteWithBook[]>([])
  const [loading, setLoading]           = useState(true)
  const [mode, setMode]                 = useState<'newest' | 'random'>('random')
  const [page, setPage]                 = useState(0)
  const [hasMore, setHasMore]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (user) { loadQuotes(0, true) } }, [user])

  async function loadQuotes(pageNum: number, reset = false) {
    if (reset) setLoading(true); else setLoadingMore(true)
    const from = pageNum * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    const { data } = await supabase
      .from('quotes').select('*, books(title, author, cover_url)')
      .eq('user_id', user!.id).order('created_at', { ascending: false })
      .range(from, to)
    const items = (data as QuoteWithBook[]) || []
    if (reset) {
      setQuotes(items)
      setDisplayQuotes([...items].sort(() => Math.random() - 0.5))
    } else {
      setQuotes(prev => [...prev, ...items])
      setDisplayQuotes(prev => [...prev, ...items])
    }
    setHasMore(items.length === PAGE_SIZE)
    setPage(pageNum)
    if (reset) setLoading(false); else setLoadingMore(false)
  }

  /* ── Infinite scroll observer ── */
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasMore && !loadingMore && mode === 'newest') {
      loadQuotes(page + 1)
    }
  }, [hasMore, loadingMore, mode, page])

  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [handleObserver])

  const handleModeChange = (newMode: 'newest' | 'random') => {
    setMode(newMode)
    setDisplayQuotes(newMode === 'newest' ? [...quotes] : [...quotes].sort(() => Math.random() - 0.5))
  }

  return (
    <>
      {/* ── Feed wrapper — comfortable reading width ── */}
      <div style={{ maxWidth: 720 }}>

        {/* ── Mode toggle ── */}
        {!loading && displayQuotes.length > 0 && (
          <div style={{ display: 'flex', gap: 7, marginBottom: 22 }}>
            {(['random', 'newest'] as const).map(m => (
              <button key={m} onClick={() => handleModeChange(m)}
                style={{
                  padding: '6px 16px', borderRadius: 'var(--r-full)',
                  border: `1.5px solid ${mode === m ? 'var(--gold)' : 'var(--border)'}`,
                  fontSize: '.82rem', fontWeight: mode === m ? 600 : 400,
                  cursor: 'pointer', transition: 'all var(--t)', fontFamily: 'inherit',
                  background: mode === m ? 'var(--gold-bg)' : 'transparent',
                  color: mode === m ? 'var(--gold)' : 'var(--text-3)',
                }}>
                {m === 'newest' ? t('newestFeed') : t('randomFeed')}
              </button>
            ))}
          </div>
        )}

        {/* ── Quotes ── */}
        {loading ? <QuotesSkeleton count={5} /> : displayQuotes.length === 0 ? (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="empty-state">
              <div className="empty-icon">❝</div>
              <div className="empty-title">{lang === 'ar' ? 'لا توجد اقتباسات بعد' : 'No quotes yet'}</div>
              <div className="empty-sub">{lang === 'ar' ? 'ابدأ بإضافة كتاب واستخراج اقتباساتك المفضلة' : 'Start adding books and extract your favorite quotes'}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="quotes-list">
              {displayQuotes.map((quote, idx) => {
                const accentColor = BOOK_COLORS[idx % BOOK_COLORS.length].split(',')[1]?.trim().slice(0, -1) || 'var(--gold)'
                return (
                  <button key={quote.id} onClick={() => router.push(`/books/${quote.book_id}`)}
                    style={{
                      display: 'block', width: '100%', textAlign: lang === 'ar' ? 'right' : 'left',
                      padding: '16px 20px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-light)',
                      borderInlineStart: `3px solid ${accentColor}`,
                      borderRadius: 'var(--r-lg)',
                      cursor: 'pointer', transition: 'border-color var(--t), box-shadow var(--t)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.boxShadow = 'var(--sh-sm)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {/* Quote text */}
                    <div style={{ fontSize: '.92rem', lineHeight: 1.85, fontWeight: 300, color: 'var(--text)', direction: 'rtl', marginBottom: 10 }}>
                      {quote.text}
                    </div>
                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: '.73rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 500 }}>{quote.books?.title}</span>
                        {quote.books?.author && <span style={{ color: 'var(--text-3)' }}>{' '}· {quote.books.author}</span>}
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {new Date(quote.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Infinite scroll sentinel */}
            {mode === 'newest' && <div ref={observerRef} style={{ height: 1 }} />}
            {loadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>
                <span className="spinner" />
              </div>
            )}
            {!hasMore && displayQuotes.length > PAGE_SIZE && mode === 'newest' && (
              <div style={{ textAlign: 'center', padding: '14px 0', fontSize: '.78rem', color: 'var(--text-3)' }}>
                {lang === 'ar' ? '· تم تحميل جميع الاقتباسات ·' : '· All quotes loaded ·'}
              </div>
            )}
          </>
        )}

      </div>{/* end maxWidth wrapper */}
    </>
  )
}


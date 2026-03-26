'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import { QuotesSkeleton } from '@/components/Skeleton'
import { dispatchStatsChanged } from '@/lib/sidebarEvents'
import toast from 'react-hot-toast'

const BOOK_COLORS = [
  'linear-gradient(150deg,#8B4513,#D2691E)',
  'linear-gradient(150deg,#2E5C8A,#4A90D9)',
  'linear-gradient(150deg,#5B4A6B,#9B7DB8)',
  'linear-gradient(150deg,#3D7A5A,#6EBA8E)',
  'linear-gradient(150deg,#7A3D3D,#C4706E)',
  'linear-gradient(150deg,#4A6B7A,#6EA8BA)',
]

interface FavQuote {
  id: string
  text: string
  book_id: string
  created_at: string
  is_favorite: boolean
  books: { title: string; author: string } | null
}

export default function FavoritesPage() {
  const { user }   = useAuthStore()
  const { lang }   = useSettings()
  const t          = useT(lang)
  const router     = useRouter()
  const [quotes, setQuotes]   = useState<FavQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [unfavLoading, setUnfavLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user) load()
    // Refresh when a favorite is toggled from another page
    const onRefresh = () => load()
    window.addEventListener('iqtibas:statsChanged', onRefresh)
    return () => window.removeEventListener('iqtibas:statsChanged', onRefresh)
  }, [user]) // eslint-disable-line

  async function load() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('id, text, book_id, created_at, is_favorite, books(title, author)')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false })
    setQuotes((data as unknown as FavQuote[]) || [])
    setLoading(false)
  }

  async function removeFavorite(quote: FavQuote) {
    setUnfavLoading(quote.id)
    const { error } = await supabase
      .from('quotes')
      .update({ is_favorite: false })
      .eq('id', quote.id)
    if (!error) {
      setQuotes(prev => prev.filter(q => q.id !== quote.id))
      dispatchStatsChanged()
      toast.success(lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites')
    }
    setUnfavLoading(null)
  }

  return (
    <>

      {loading ? (
        <QuotesSkeleton count={5} />
      ) : quotes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">♥</div>
            <div className="empty-title">
              {lang === 'ar' ? 'لا توجد مفضلة بعد' : 'No favorites yet'}
            </div>
            <div className="empty-sub">
              {lang === 'ar'
                ? 'اضغط ★ على أي اقتباس لإضافته هنا'
                : 'Tap ★ on any quote to add it here'}
            </div>
          </div>
        </div>
      ) : (
        <div className="quotes-list">
          {quotes.map((quote, idx) => {
            const accentColor =
              BOOK_COLORS[idx % BOOK_COLORS.length].split(',')[1]?.trim().slice(0, -1) ||
              'var(--gold)'
            return (
              <div
                key={quote.id}
                style={{
                  padding: '16px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderInlineStart: `3px solid ${accentColor}`,
                  borderRadius: 'var(--r-lg)',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  transition: 'border-color var(--t), box-shadow var(--t)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.boxShadow = 'var(--sh-sm)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none' }}
                onClick={() => router.push(`/books/${quote.book_id}`)}
              >
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '.92rem', lineHeight: 1.85, fontWeight: 300,
                    color: 'var(--text)', direction: 'rtl', marginBottom: 10,
                  }}>
                    {quote.text}
                  </div>
                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: '.73rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 500 }}>
                        {quote.books?.title}
                      </span>
                      {quote.books?.author && (
                        <span style={{ color: 'var(--text-3)' }}>{' '}· {quote.books.author}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {new Date(quote.created_at).toLocaleDateString(
                        lang === 'ar' ? 'ar-SA' : 'en-US',
                        { month: 'short', day: 'numeric' }
                      )}
                    </div>
                  </div>
                </div>

                {/* Unfavorite button */}
                <button
                  onClick={e => { e.stopPropagation(); removeFavorite(quote) }}
                  disabled={unfavLoading === quote.id}
                  title={lang === 'ar' ? 'إزالة من المفضلة' : 'Remove from favorites'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '1.1rem', color: '#e0526a',
                    opacity: unfavLoading === quote.id ? 0.4 : 1,
                    transition: 'opacity var(--t), transform var(--t)',
                    flexShrink: 0, lineHeight: 1, padding: 2,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  ♥
                </button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

'use client'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'

interface QuoteResult {
  id: string
  text: string
  book_id: string
  books: { title: string; author: string } | null
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--gold-bg)', color: 'var(--gold)', borderRadius: 2, padding: '0 1px', fontWeight: 700 }}>
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  )
}

export default function SearchResultsPage() {
  const { user }    = useAuthStore()
  const { lang }    = useSettings()
  const t           = useT(lang)
  const router      = useRouter()
  const params      = useSearchParams()
  const inputRef    = useRef<HTMLInputElement>(null)

  const [query,   setQuery]   = useState(params.get('q') ?? '')
  const [results, setResults] = useState<QuoteResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState('')

  useEffect(() => {
    const q = params.get('q') ?? ''
    setQuery(q)
    if (q.trim().length >= 2) runSearch(q)
  }, [params]) // eslint-disable-line

  async function runSearch(q: string) {
    if (!user || q.trim().length < 2) return
    setLoading(true)
    setSearched(q.trim())
    const { data } = await supabase
      .from('quotes')
      .select('id, text, book_id, books(title, author)')
      .eq('user_id', user.id)
      .ilike('text', `%${q.trim()}%`)
      .order('created_at', { ascending: false })
    setResults((data as unknown as QuoteResult[]) || [])
    setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 2) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 14px', height: 42,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', transition: 'border-color var(--t)',
          }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث في اقتباساتك...' : 'Search your quotes...'}
              dir="auto"
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: '.9rem', color: 'var(--text)', fontFamily: 'inherit',
              }}
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setResults([]); setSearched('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem', padding: 0, lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-gold" style={{ height: 42, paddingInline: 20 }}>
            {lang === 'ar' ? 'بحث' : 'Search'}
          </button>
        </form>
      </div>

      {/* Status */}
      {!loading && searched && (
        <div style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 20 }}>
          {results.length === 0
            ? (lang === 'ar' ? `لا توجد نتائج لـ "${searched}"` : `No results for "${searched}"`)
            : (lang === 'ar'
                ? `${results.length} اقتباس يحوي "${searched}"`
                : `${results.length} quote${results.length !== 1 ? 's' : ''} matching "${searched}"`)}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <span className="spinner" style={{ width: 24, height: 24, borderTopColor: 'var(--gold)' }} />
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="quotes-list">
          {results.map(q => (
            <Link key={q.id} href={`/books/${q.book_id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  padding: '16px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderInlineStart: '3px solid var(--gold)',
                  borderRadius: 'var(--r-lg)',
                  transition: 'border-color var(--t), box-shadow var(--t)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-border)'; e.currentTarget.style.boxShadow = 'var(--sh-sm)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {/* Quote text with highlight */}
                <div style={{ fontSize: '.92rem', lineHeight: 1.85, fontWeight: 300, color: 'var(--text)', direction: 'rtl', marginBottom: 8 }}>
                  {highlight(q.text, searched)}
                </div>
                {/* Meta */}
                {q.books && (
                  <div style={{ fontSize: '.73rem', color: 'var(--text-3)' }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 500 }}>{q.books.title}</span>
                    {q.books.author && <span> · {q.books.author}</span>}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && results.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">
              {lang === 'ar' ? 'لا توجد نتائج' : 'No results'}
            </div>
            <div className="empty-sub">
              {lang === 'ar' ? 'جرّب كلمة مختلفة' : 'Try a different term'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

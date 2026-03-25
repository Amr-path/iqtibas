'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import DynamicCover from './DynamicCover'
import type { UserBook } from '@/types'

interface Props { open: boolean; onClose: () => void }

export default function AddKnowledgeModal({ open, onClose }: Props) {
  const { user } = useAuthStore()
  const { lang } = useSettings()
  const t = useT(lang)
  const router = useRouter()

  const [recentBooks, setRecentBooks] = useState<UserBook[]>([])
  const [allBooks, setAllBooks]       = useState<UserBook[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading]         = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => { if (open && user) loadBooks() }, [open, user])

  async function loadBooks() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('user_books').select('*, books(*)')
        .eq('user_id', user!.id).order('added_at', { ascending: false }).limit(100)
      setAllBooks(data || [])
      setRecentBooks((data || []).slice(0, 3))
    } finally { setLoading(false) }
  }

  const filteredBooks = searchQuery.trim()
    ? allBooks.filter(ub => ub.books.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const handleBookClick = (bookId: string) => { router.push(`/books/${bookId}/upload`); onClose() }
  const handleCreateNew  = ()               => { router.push('/books/add');              onClose() }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: -8, [lang === 'ar' ? 'left' : 'right']: -8,
            width: 32, height: 32, borderRadius: '99px',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.1rem',
          }}>✕</button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-.01em' }}>
            {t('addKnowledge')}
          </h2>
        </div>

        {/* Recent Books */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: '.75rem', fontWeight: 700, letterSpacing: '.12em',
            color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 14,
          }}>{t('recentBooks_modal')}</div>
          {recentBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 16px', fontSize: '.85rem', color: 'var(--text-3)' }}>
              {lang === 'ar' ? 'لا توجد كتب مضافة بعد' : 'No books added yet'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {recentBooks.map(ub => (
                <button key={ub.id} onClick={() => handleBookClick(ub.book_id)}
                  style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)', padding: 12, cursor: 'pointer',
                    transition: 'all var(--t)', textAlign: lang === 'ar' ? 'right' : 'left',
                  }}>
                  <div style={{ marginBottom: 10 }}><DynamicCover title={ub.books.title} size={56} /></div>
                  <div style={{ fontSize: '.85rem', fontWeight: 500, marginBottom: 2 }}>{ub.books.title}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{ub.books.author}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <input type="text" placeholder={t('searchBooks_modal')} value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowDropdown(e.target.value.trim().length > 0) }}
            onFocus={() => setShowDropdown(searchQuery.trim().length > 0)}
            style={{
              width: '100%', padding: '10px 14px', fontSize: '.875rem',
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'inherit',
            }}
          />
          {showDropdown && filteredBooks.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', maxHeight: 300, overflowY: 'auto',
              zIndex: 10, boxShadow: 'var(--sh-md)',
            }}>
              {filteredBooks.slice(0, 5).map(ub => (
                <button key={ub.id}
                  onClick={() => { handleBookClick(ub.book_id); setSearchQuery(''); setShowDropdown(false) }}
                  style={{
                    width: '100%', padding: '12px 14px',
                    textAlign: lang === 'ar' ? 'right' : 'left',
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <div style={{ fontSize: '.875rem', fontWeight: 500 }}>{ub.books.title}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{ub.books.author}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create New */}
        <button onClick={handleCreateNew}
          style={{
            width: '100%', padding: '11px 16px', background: 'var(--surface-2)',
            border: '1.5px dashed var(--border)', borderRadius: 'var(--r-md)',
            fontSize: '.9rem', fontWeight: 500, color: 'var(--text)',
            cursor: 'pointer', transition: 'all var(--t)', fontFamily: 'inherit',
          }}>
          {t('createNewBook')}
        </button>
      </div>
    </div>
  )
}

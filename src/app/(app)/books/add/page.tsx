'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { dispatchStatsChanged } from '@/lib/sidebarEvents'
import DynamicCover from '@/components/DynamicCover'
import toast from 'react-hot-toast'
import type { UserBook } from '@/types'

export default function AddBookPage() {
  const { user } = useAuthStore()
  const { lang } = useSettings()
  const router   = useRouter()
  const ar = lang === 'ar'

  /* ── Recent books ── */
  const [recentBooks,  setRecentBooks]  = useState<UserBook[]>([])
  const [allBooks,     setAllBooks]     = useState<UserBook[]>([])
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showDrop,     setShowDrop]     = useState(false)

  /* ── Form ── */
  const [title,   setTitle]   = useState('')
  const [author,  setAuthor]  = useState('')
  const [year,    setYear]    = useState('')
  const [pages,   setPages]   = useState('')
  const [saving,  setSaving]  = useState(false)

  /* ── Cover upload ── */
  const coverInputRef               = useRef<HTMLInputElement>(null)
  const [coverFile,    setCoverFile]    = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)

  useEffect(() => {
    if (user) loadBooks()
  }, [user]) // eslint-disable-line

  async function loadBooks() {
    const { data } = await supabase
      .from('user_books').select('*, books(*)')
      .eq('user_id', user!.id).order('added_at', { ascending: false }).limit(100)
    setAllBooks(data || [])
    setRecentBooks((data || []).slice(0, 4))
  }

  const filteredBooks = searchQuery.trim()
    ? allBooks.filter(ub => ub.books.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error(ar ? 'عنوان الكتاب مطلوب' : 'Title is required'); return }
    if (!user) return
    setSaving(true)
    try {
      /* 1. Upload cover image if selected */
      let finalCoverUrl: string | null = null
      if (coverFile) {
        setCoverUploading(true)
        const safeName = coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${user.id}/covers/${Date.now()}_${safeName}`
        const { error: upErr } = await supabase.storage
          .from('book-images').upload(path, coverFile, { cacheControl: '3600', upsert: false })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(path)
          finalCoverUrl = urlData.publicUrl
        }
        setCoverUploading(false)
      }

      /* 2. Insert book */
      const { data: book, error: bookErr } = await supabase
        .from('books')
        .insert({
          title:          title.trim(),
          author:         author.trim() || null,
          cover_url:      finalCoverUrl,
          published_year: year  ? Number(year)  : null,
          page_count:     pages ? Number(pages) : null,
        })
        .select('id').single()

      if (bookErr || !book) throw bookErr || new Error('No book returned')

      /* 3. Link to user */
      const { error: ubErr } = await supabase
        .from('user_books')
        .insert({ user_id: user.id, book_id: book.id, quotes_count: 0, images_count: 0 })
      if (ubErr) throw ubErr

      dispatchStatsChanged()
      router.push(`/books/${book.id}/upload`)
    } catch (err: unknown) {
      console.error(err)
      toast.error(ar ? 'تعذّر إضافة الكتاب' : 'Failed to add book')
      setSaving(false)
      setCoverUploading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)', fontSize: '.9rem', color: 'var(--text)',
    fontFamily: 'inherit', outline: 'none', transition: 'border-color var(--t)', direction: 'rtl',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ maxWidth: 560 }}>

      {/* ── Recent books + Search ── */}
      {(recentBooks.length > 0 || allBooks.length > 0) && (
        <div className="card" style={{ padding: '16px 18px', marginBottom: 20 }}>
          {/* Label */}
          <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            {ar ? 'كتبك الأخيرة' : 'Recent Books'}
          </div>

          {/* Recent grid */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {recentBooks.map(ub => (
              <button key={ub.id}
                onClick={() => router.push(`/books/${ub.book_id}/upload`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--t)',
                  maxWidth: 180,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)' }}
              >
                <div style={{ width: 28, height: 42, flexShrink: 0, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                  {ub.books.cover_url
                    ? <Image src={ub.books.cover_url} alt={ub.books.title} fill sizes="28px" style={{ objectFit: 'cover' }} />
                    : <DynamicCover title={ub.books.title} size={28} />
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                    {ub.books.title}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDrop(e.target.value.trim().length > 0) }}
              onFocus={() => setShowDrop(searchQuery.trim().length > 0)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              placeholder={ar ? 'ابحث في كتبك...' : 'Search your books...'}
              dir="rtl"
              style={{
                ...inputStyle, padding: '8px 12px', fontSize: '.82rem',
              }}
            />
            {showDrop && filteredBooks.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', insetInlineStart: 0, insetInlineEnd: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', maxHeight: 220, overflowY: 'auto',
                zIndex: 20, boxShadow: 'var(--sh-md)',
              }}>
                {filteredBooks.slice(0, 6).map(ub => (
                  <button key={ub.id}
                    onMouseDown={() => { router.push(`/books/${ub.book_id}/upload`) }}
                    style={{
                      width: '100%', padding: '10px 14px', textAlign: ar ? 'right' : 'left',
                      background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: '.85rem', fontWeight: 500 }}>{ub.books.title}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{ub.books.author}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Book Form ── */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Cover upload + Title row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Cover picker */}
            <div>
              <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={handleCoverSelect} />
              <button type="button" onClick={() => coverInputRef.current?.click()}
                style={{
                  width: 72, height: 108, borderRadius: '4px 8px 8px 4px',
                  border: `2px dashed ${coverPreview ? 'transparent' : 'var(--border)'}`,
                  background: coverPreview ? 'transparent' : 'var(--surface-2)',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color var(--t)',
                }}
                onMouseEnter={e => { if (!coverPreview) e.currentTarget.style.borderColor = 'var(--gold)' }}
                onMouseLeave={e => { if (!coverPreview) e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {coverPreview
                  ? <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> // eslint-disable-line
                  : <div style={{ textAlign: 'center', padding: 4 }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🖼️</div>
                      <div style={{ fontSize: '.55rem', color: 'var(--text-3)', lineHeight: 1.3 }}>
                        {ar ? 'رفع غلاف' : 'Upload cover'}
                      </div>
                    </div>
                }
              </button>
              {coverPreview && (
                <button type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview('') }}
                  style={{ display: 'block', width: '100%', marginTop: 4, background: 'none', border: 'none', fontSize: '.6rem', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {ar ? 'إزالة' : 'Remove'}
                </button>
              )}
            </div>

            {/* Title + Author */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>{ar ? 'عنوان الكتاب' : 'Book Title'} <span style={{ color: '#e0526a' }}>*</span></label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={ar ? 'مثال: مئة عام من العزلة' : 'e.g. One Hundred Years of Solitude'}
                  style={inputStyle} required
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label style={labelStyle}>{ar ? 'المؤلف' : 'Author'}</label>
                <input value={author} onChange={e => setAuthor(e.target.value)}
                  placeholder={ar ? 'اسم المؤلف' : 'Author name'}
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>
          </div>

          {/* Year + Pages */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>{ar ? 'سنة النشر' : 'Year'}</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)}
                placeholder="2024"
                style={{ ...inputStyle, direction: 'ltr' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>{ar ? 'عدد الصفحات' : 'Pages'}</label>
              <input type="number" value={pages} onChange={e => setPages(e.target.value)}
                placeholder="320"
                style={{ ...inputStyle, direction: 'ltr' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={saving} className="btn btn-gold"
            style={{ opacity: saving ? 0.7 : 1, marginTop: 4 }}>
            {saving
              ? (ar ? (coverUploading ? 'جارٍ رفع الغلاف...' : 'جارٍ الحفظ...') : (coverUploading ? 'Uploading cover...' : 'Saving...'))
              : (ar ? '+ إضافة الكتاب ورفع الصور' : '+ Add Book & Upload Images')}
          </button>
        </div>
      </form>
    </div>
  )
}

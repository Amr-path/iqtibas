'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { dispatchStatsChanged } from '@/lib/sidebarEvents'
import toast from 'react-hot-toast'

export default function AddBookPage() {
  const { user } = useAuthStore()
  const { lang } = useSettings()
  const router   = useRouter()

  const [title,     setTitle]     = useState('')
  const [author,    setAuthor]    = useState('')
  const [coverUrl,  setCoverUrl]  = useState('')
  const [year,      setYear]      = useState('')
  const [pages,     setPages]     = useState('')
  const [desc,      setDesc]      = useState('')
  const [saving,    setSaving]    = useState(false)

  const ar = lang === 'ar'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error(ar ? 'عنوان الكتاب مطلوب' : 'Title is required'); return }
    if (!user) return
    setSaving(true)
    try {
      // 1. Insert into books
      const { data: book, error: bookErr } = await supabase
        .from('books')
        .insert({
          title:          title.trim(),
          author:         author.trim() || null,
          cover_url:      coverUrl.trim() || null,
          published_year: year  ? Number(year)  : null,
          page_count:     pages ? Number(pages) : null,
          description:    desc.trim() || null,
        })
        .select('id')
        .single()

      if (bookErr || !book) throw bookErr || new Error('No book returned')

      // 2. Link book to user
      const { error: ubErr } = await supabase
        .from('user_books')
        .insert({ user_id: user.id, book_id: book.id, quotes_count: 0, images_count: 0 })

      if (ubErr) throw ubErr

      dispatchStatsChanged()
      toast.success(ar ? '✓ تمت إضافة الكتاب' : '✓ Book added')
      router.push(`/books/${book.id}/upload`)
    } catch (err: unknown) {
      console.error(err)
      toast.error(ar ? 'تعذّر إضافة الكتاب' : 'Failed to add book')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    fontSize: '.9rem', color: 'var(--text)',
    fontFamily: 'inherit', outline: 'none',
    transition: 'border-color var(--t)',
    direction: 'rtl',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '.78rem', fontWeight: 600,
    color: 'var(--text-2)', marginBottom: 6, display: 'block',
  }

  return (
    <>
      <Link href="/library" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem', color: 'var(--text-3)', marginBottom: 24 }}>
        ← {ar ? 'المكتبة' : 'Library'}
      </Link>


      <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
        <div className="card" style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Title — required */}
          <div>
            <label style={labelStyle}>
              {ar ? 'عنوان الكتاب' : 'Book Title'} <span style={{ color: '#e0526a' }}>*</span>
            </label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={ar ? 'مثال: مئة عام من العزلة' : 'e.g. One Hundred Years of Solitude'}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              required
            />
          </div>

          {/* Author */}
          <div>
            <label style={labelStyle}>{ar ? 'المؤلف' : 'Author'}</label>
            <input
              value={author} onChange={e => setAuthor(e.target.value)}
              placeholder={ar ? 'اسم المؤلف' : 'Author name'}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Cover URL */}
          <div>
            <label style={labelStyle}>{ar ? 'رابط صورة الغلاف (اختياري)' : 'Cover Image URL (optional)'}</label>
            <input
              value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://..."
              style={{ ...inputStyle, direction: 'ltr' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Year + Pages row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>{ar ? 'سنة النشر' : 'Year'}</label>
              <input
                type="number" value={year} onChange={e => setYear(e.target.value)}
                placeholder="2024"
                style={{ ...inputStyle, direction: 'ltr' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>{ar ? 'عدد الصفحات' : 'Pages'}</label>
              <input
                type="number" value={pages} onChange={e => setPages(e.target.value)}
                placeholder="320"
                style={{ ...inputStyle, direction: 'ltr' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>{ar ? 'نبذة (اختياري)' : 'Description (optional)'}</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder={ar ? 'نبذة مختصرة عن الكتاب...' : 'Brief description...'}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <Link href="/library"
              style={{
                padding: '9px 20px', borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)', fontSize: '.88rem',
                color: 'var(--text-2)', background: 'none',
              }}>
              {ar ? 'إلغاء' : 'Cancel'}
            </Link>
            <button type="submit" disabled={saving} className="btn btn-gold" style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : (ar ? '+ إضافة الكتاب' : '+ Add Book')}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import toast from 'react-hot-toast'

const QUOTES = [
  { ar: { text: 'من قرأ ازداد علماً، ومن ازداد علماً ازداد حكمةً', source: '— حكمة عربية' }, en: { text: 'The more that you read, the more things you will know', source: '— Dr. Seuss' } },
  { ar: { text: 'إنّ كتاباً لا تودّ الاقتباس منه ليس جديراً بالقراءة', source: '— مارك توين' }, en: { text: 'A book worth reading is worth quoting', source: '— Mark Twain' } },
  { ar: { text: 'الكتاب هدية يمكنك فتحها مرات لا تعدّ ولا تحصى', source: '— غاريسون كيلور' }, en: { text: 'A book is a gift you can open again and again', source: '— Garrison Keillor' } },
]

export default function SignupPage() {
  const { signUp } = useAuthStore()
  const { lang, toggleLang } = useSettings()
  const t = useT(lang)
  const router = useRouter()

  const [form,    setForm]    = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [qIndex,  setQIndex]  = useState(0)
  const [animKey, setAnimKey] = useState(0)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const id = setInterval(() => { setQIndex(i => (i + 1) % QUOTES.length); setAnimKey(k => k + 1) }, 6000)
    return () => clearInterval(id)
  }, [])

  const currentQ = QUOTES[qIndex][lang]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) { toast.error(t('passwordMinErr')); return }
    setLoading(true)
    try { await signUp(form.email, form.password, form.firstName, form.lastName); toast.success(t('accountCreatedToast')); router.push('/dashboard') }
    catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <div className="auth-visual-bottom-line" />
        <Link href="/" className="auth-visual-logo">
          {lang === 'ar' ? <>اقت<span>باس</span></> : <>Iqt<span>ibas</span></>}
        </Link>
        <div className="auth-quote-wrap">
          <div key={animKey} className="auth-quote-animate">
            <blockquote className="auth-quote-text">«{currentQ.text}»</blockquote>
            <cite className="auth-quote-source">{currentQ.source}</cite>
          </div>
          <div className="auth-quote-dots">
            {QUOTES.map((_, i) => (
              <div key={i} className={`auth-quote-dot${i === qIndex ? ' active' : ''}`}
                onClick={() => { setQIndex(i); setAnimKey(k => k + 1) }} />
            ))}
          </div>
        </div>
        <button onClick={toggleLang} style={{
          position: 'absolute', top: 52, insetInlineEnd: 52,
          padding: '5px 14px', borderRadius: '999px',
          border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.07)',
          color: 'rgba(255,255,255,.7)', fontSize: '.73rem', fontWeight: 600,
          cursor: 'pointer', backdropFilter: 'blur(8px)', zIndex: 2,
        }}>{lang === 'ar' ? 'EN' : 'ع'}</button>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <Link href="/" className="back-link">{t('backHome')}</Link>
          <div className="auth-box-title">{t('signupTitle' as any)}</div>
          <div className="auth-box-sub">{t('signupSub' as any)}</div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{t('firstName')}</label>
                <input className="input" value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{t('lastName')}</label>
                <input className="input" value={form.lastName} onChange={set('lastName')} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">{t('email')}</label>
              <input className="input" type="email" value={form.email} onChange={set('email')}
                placeholder="you@example.com" dir="ltr" required autoComplete="email" />
            </div>
            <div className="input-group">
              <label className="input-label">{t('password' as any)}</label>
              <input className="input" type="password" value={form.password} onChange={set('password' as any)}
                placeholder="••••••••" dir="ltr" required autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-gold w-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> {t('creating' as any)}</> : t('signupBtn' as any)}
            </button>
          </form>
          <div className="auth-switch">
            {t('haveAccount' as any)}{' '}
            <Link href="/login" className="auth-link">{t('loginLink' as any)}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

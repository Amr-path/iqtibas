'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import toast from 'react-hot-toast'

const QUOTES = [
  { ar: { text: 'اقرأ باسم ربك الذي خلق', source: 'القرآن الكريم، سورة العلق' }, en: { text: 'Read in the name of your Lord who created', source: 'Quran · Surah Al-Alaq' } },
  { ar: { text: 'لا يوجد صديق أوفى من كتاب', source: '— إرنست همنغواي' }, en: { text: 'There is no friend as loyal as a book', source: '— Ernest Hemingway' } },
  { ar: { text: 'القارئ يعيش ألف حياة قبل أن يموت', source: '— جورج ر.ر. مارتن' }, en: { text: 'A reader lives a thousand lives before he dies', source: '— George R.R. Martin' } },
  { ar: { text: 'الكتب مرايا: لا ترى فيها إلا ما تحمله بداخلك', source: '— كارلوس زافون' }, en: { text: 'Books are mirrors: you only see in them what you carry inside', source: '— Carlos Ruiz Zafón' } },
]

export default function LoginPage() {
  const { signIn } = useAuthStore()
  const { lang, toggleLang } = useSettings()
  const t = useT(lang)
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [qIndex,   setQIndex]   = useState(0)
  const [animKey,  setAnimKey]  = useState(0)

  useEffect(() => {
    const id = setInterval(() => { setQIndex(i => (i + 1) % QUOTES.length); setAnimKey(k => k + 1) }, 6000)
    return () => clearInterval(id)
  }, [])

  const currentQ = QUOTES[qIndex][lang]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try { await signIn(email, password); toast.success(t('welcomeBackToast')); router.push('/dashboard') }
    catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-layout">
      {/* Visual side */}
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
          letterSpacing: '.05em', cursor: 'pointer', backdropFilter: 'blur(8px)', zIndex: 2,
        }}>{lang === 'ar' ? 'EN' : 'ع'}</button>
      </div>

      {/* Form side */}
      <div className="auth-form-side">
        <div className="auth-box">
          <Link href="/" className="back-link">{t('backHome')}</Link>
          <div className="auth-box-title">{t('loginTitle' as any)}</div>
          <div className="auth-box-sub">{t('loginSub' as any)}</div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">{t('email')}</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" dir="ltr" required autoComplete="email" />
            </div>
            <div className="input-group">
              <label className="input-label">{t('password' as any)}</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" dir="ltr" required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-gold w-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> {t('loggingIn' as any)}</> : t('loginBtn')}
            </button>
          </form>
          <div className="auth-switch">
            {t('noAccount' as any)}{' '}
            <Link href="/signup" className="auth-link">{t('signupLink' as any)}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

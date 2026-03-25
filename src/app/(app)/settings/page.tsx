'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, signOut } = useAuthStore()
  const { theme, lang, toggleTheme, toggleLang } = useSettings()
  const t = useT(lang)
  const router = useRouter()

  const [newPassword, setNewPassword] = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [savingPw,    setSavingPw]    = useState(false)
  const [firstName,   setFirstName]   = useState(user?.user_metadata?.first_name || '')
  const [lastName,    setLastName]    = useState(user?.user_metadata?.last_name  || '')
  const [savingName,  setSavingName]  = useState(false)

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) return
    setSavingName(true)
    const { error } = await supabase.auth.updateUser({ data: { first_name: firstName.trim(), last_name: lastName.trim() } })
    setSavingName(false)
    if (error) toast.error(lang === 'ar' ? 'تعذّر تحديث الاسم' : 'Failed to update name')
    else toast.success(lang === 'ar' ? 'تم تحديث الاسم ✓' : 'Name updated ✓')
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error(lang === 'ar' ? 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' : 'Password must be at least 6 characters'); return }
    if (newPassword !== confirm) { toast.error(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPw(false)
    if (error) toast.error(lang === 'ar' ? 'تعذّر تغيير كلمة المرور' : 'Failed to change password')
    else { toast.success(lang === 'ar' ? 'تم تغيير كلمة المرور ✓' : 'Password changed ✓'); setNewPassword(''); setConfirm('') }
  }

  return (
    <>
      <div className="page-title" style={{ marginBottom: 32 }}>{t('settingsTitle')}</div>
      <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Appearance */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontWeight: 600, marginBottom: 22, fontSize: '1rem' }}>{t('appearanceTitle')}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18, borderBottom: '1px solid var(--border-light)', marginBottom: 18 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '.9rem' }}>{theme === 'dark' ? t('darkMode') : t('lightMode')}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginTop: 3 }}>
                {theme === 'dark' ? (lang === 'ar' ? 'الوضع الداكن مفعّل' : 'Dark mode is on') : (lang === 'ar' ? 'الوضع الفاتح مفعّل' : 'Light mode is on')}
              </div>
            </div>
            <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 'var(--r-full)', border: '1.5px solid var(--border)', background: theme === 'dark' ? 'var(--gold-bg)' : 'var(--surface-2)', cursor: 'pointer', fontSize: '.85rem', fontFamily: 'inherit', color: theme === 'dark' ? 'var(--gold)' : 'var(--text-2)', transition: 'all var(--t)' }}>
              {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? (lang === 'ar' ? 'تفعيل الداكن' : 'Enable Dark') : (lang === 'ar' ? 'تفعيل الفاتح' : 'Enable Light')}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '.9rem' }}>{t('language')}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginTop: 3 }}>{lang === 'ar' ? 'العربية' : 'English'}</div>
            </div>
            <button onClick={toggleLang} style={{ padding: '10px 18px', borderRadius: 'var(--r-full)', border: '1.5px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: '.85rem', fontFamily: 'inherit', color: 'var(--text-2)' }}>
              {lang === 'ar' ? '🇺🇸 English' : '🇸🇦 العربية'}
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontWeight: 600, marginBottom: 22, fontSize: '1rem' }}>{t('accountInfo')}</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginBottom: 4 }}>{t('email')}</div>
            <div style={{ padding: '11px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', fontSize: '.9rem', color: 'var(--text-2)', direction: 'ltr', textAlign: 'right', border: '1px solid var(--border)' }}>{user?.email}</div>
          </div>
          <form onSubmit={handleUpdateName}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">{t('firstName')}</label>
                <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">{t('lastName')}</label>
                <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingName}>
              {savingName ? <><span className="spinner spinner-sm" /> {t('saving')}</> : t('saveName')}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontWeight: 600, marginBottom: 22, fontSize: '1rem' }}>{t('changePassword')}</div>
          <form onSubmit={handleUpdatePassword}>
            <div className="input-group">
              <label className="input-label">{t('newPassword')}</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} dir="ltr" autoComplete="new-password" placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label className="input-label">{t('confirmPassword')}</label>
              <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} dir="ltr" autoComplete="new-password" placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingPw}>
              {savingPw ? <><span className="spinner spinner-sm" /> {t('changing')}</> : t('changeBtn')}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div className="card" style={{ padding: 28, border: '1px solid rgba(139,58,58,.2)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '1rem', color: '#C0392B' }}>{t('signoutTitle')}</div>
          <div style={{ fontSize: '.85rem', color: 'var(--text-2)', marginBottom: 18 }}>{t('signoutDesc')}</div>
          <button className="btn btn-sm"
            style={{ background: 'rgba(192,57,43,.08)', color: '#C0392B', border: '1px solid rgba(192,57,43,.18)' }}
            onClick={async () => { await signOut(); router.push('/') }}>
            {t('signout')}
          </button>
        </div>

      </div>
    </>
  )
}

'use client'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'

export default function HelpPage() {
  const { lang } = useSettings()
  const t = useT(lang)

  return (
    <>
      <div className="page-title" style={{ marginBottom: 32 }}>
        {lang === 'ar' ? 'المساعدة' : 'Help'}
      </div>
      <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📘</div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>
            {lang === 'ar' ? 'قريباً' : 'Coming Soon'}
          </div>
          <div style={{ fontSize: '.875rem', color: 'var(--text-3)', lineHeight: 1.7 }}>
            {lang === 'ar'
              ? 'صفحة المساعدة قيد الإنشاء. للتواصل أرسل بريداً إلى alshahedamr1@gmail.com'
              : 'Help page is under construction. Contact alshahedamr1@gmail.com'}
          </div>
        </div>
      </div>
    </>
  )
}

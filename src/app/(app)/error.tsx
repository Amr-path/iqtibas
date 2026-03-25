'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  useEffect(() => { console.error(error) }, [error])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: '0 16px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>حدث خطأ غير متوقع</div>
        <div style={{ fontSize: '.88rem', color: 'var(--text-3)', marginBottom: 28, lineHeight: 1.6 }}>
          تعذّر تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى أو العودة للرئيسية.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={reset} className="btn btn-gold">حاول مجدداً</button>
          <button onClick={() => router.push('/dashboard')}
            style={{ padding: '9px 18px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.88rem' }}>
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#F5F1EB', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 20 }}>حدث خطأ في التطبيق</div>
          <button onClick={reset} style={{ padding: '10px 22px', background: '#B8912E', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: '1rem' }}>
            حاول مجدداً
          </button>
        </div>
      </body>
    </html>
  )
}

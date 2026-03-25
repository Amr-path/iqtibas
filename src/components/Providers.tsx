'use client'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'

export default function Providers({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init)
  const { theme, lang } = useSettings()

  useEffect(() => { init() }, [init])

  // Apply theme/lang on mount (SSR safe)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [theme, lang])

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            borderRadius: '10px',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </>
  )
}

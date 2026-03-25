'use client'
import { useState, useEffect, useRef } from 'react'

const SECRET = process.env.NEXT_PUBLIC_GATE_PIN || '0999'
const SESSION_KEY = 'iqtibas_access'

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue]       = useState('')
  const [shake, setShake]       = useState(false)
  const [dots, setDots]         = useState<boolean[]>([false, false, false, false])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true)
    else setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  useEffect(() => {
    setDots([value.length > 0, value.length > 1, value.length > 2, value.length > 3])
  }, [value])

  useEffect(() => {
    if (value.length === 4) {
      if (value === SECRET) {
        sessionStorage.setItem(SESSION_KEY, '1')
        setTimeout(() => setUnlocked(true), 300)
      } else {
        setShake(true)
        setTimeout(() => { setValue(''); setShake(false) }, 600)
      }
    }
  }, [value])

  if (unlocked) return <>{children}</>

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      direction: 'rtl', fontFamily: 'IBM Plex Sans Arabic, sans-serif',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(184,145,46,.03) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }} />
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(ellipse, rgba(184,145,46,.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-2xl)', padding: '52px 48px 44px',
        width: '100%', maxWidth: 360,
        boxShadow: 'var(--sh-xl)', textAlign: 'center', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: .7,
        }} />
        <div style={{ fontSize: '1.7rem', fontWeight: 300, letterSpacing: '-.03em', marginBottom: 28 }}>
          اقت<span style={{ color: 'var(--gold)', fontWeight: 500 }}>باس</span>
        </div>
        <div style={{
          width: 52, height: 52, background: 'var(--gold-bg)',
          border: '1px solid var(--gold-border)', borderRadius: 'var(--r-xl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '1.4rem',
          boxShadow: '0 4px 16px rgba(184,145,46,.12)',
        }}>🔒</div>
        <div style={{ fontSize: '.95rem', fontWeight: 400, marginBottom: 6 }}>أدخل كلمة المرور</div>
        <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginBottom: 32, lineHeight: 1.6 }}>
          هذا الموقع محمي بكلمة مرور
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24,
          animation: shake ? 'gateShake .5s ease' : 'none',
        }}>
          {dots.map((filled, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: filled ? 'var(--gold)' : 'var(--border)',
              border: `2px solid ${filled ? 'var(--gold)' : 'var(--border)'}`,
              transition: 'all .2s',
              boxShadow: filled ? '0 0 8px rgba(184,145,46,.35)' : 'none',
            }} />
          ))}
        </div>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={value}
          onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 4) setValue(v) }}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1, top: 0, left: 0 }}
          autoComplete="off"
          aria-label="Password"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n}
              onClick={() => { if (value.length < 4) setValue(v => v + n) }}
              style={{
                height: 52, borderRadius: 'var(--r-md)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)',
                cursor: 'pointer', transition: 'all var(--t)', fontFamily: 'inherit',
              }}
            >{n}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div />
          <button onClick={() => { if (value.length < 4) setValue(v => v + '0') }}
            style={{
              height: 52, borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>0</button>
          <button onClick={() => setValue(v => v.slice(0, -1))}
            style={{
              height: 52, borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: '1rem', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit',
            }}>⌫</button>
        </div>
      </div>
      <style>{`
        @keyframes gateShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

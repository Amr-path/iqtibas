'use client'
import { useEffect } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'تأكيد', cancelLabel = 'إلغاء',
  danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter')  onConfirm()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px',
      animation: 'fadeIn .18s ease both',
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '32px 28px',
        width: '100%', maxWidth: 400,
        boxShadow: 'var(--sh-xl)',
        animation: 'fadeUp .2s cubic-bezier(.4,0,.2,1) both',
      }} onClick={e => e.stopPropagation()}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--r-lg)',
          background: danger ? 'rgba(139,58,58,.1)' : 'var(--gold-bg)',
          border: `1px solid ${danger ? 'rgba(139,58,58,.2)' : 'var(--gold-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', marginBottom: 18,
        }}>
          {danger ? '🗑️' : '⚠️'}
        </div>
        <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: '.88rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '9px 20px', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            fontSize: '.88rem', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all var(--t)',
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding: '9px 20px', borderRadius: 'var(--r-md)',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '.88rem', fontWeight: 500, transition: 'all var(--t)',
            background: danger ? '#8B3A3A' : 'var(--gold)',
            color: '#fff',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

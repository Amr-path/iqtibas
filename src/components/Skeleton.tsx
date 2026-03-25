'use client'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div className="skeleton" style={{
      width, height,
      borderRadius,
      ...style,
    }} />
  )
}

/** شبكة بطاقات كتب skeleton */
export function LibrarySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="lib-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div className="skeleton" style={{ width: '100%', aspectRatio: '2/3', borderRadius: '4px 8px 8px 4px' }} />
          <Skeleton height={11} borderRadius={5} width="88%" />
          <Skeleton height={9}  borderRadius={5} width="60%" />
        </div>
      ))}
    </div>
  )
}

/** قائمة اقتباسات skeleton */
export function QuotesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          padding: '20px 24px', background: 'var(--surface)',
          border: '1px solid var(--border-light)', borderRadius: 'var(--r-lg)',
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'start',
        }}>
          <div className="skeleton" style={{ width: 4, height: 60, borderRadius: 99 }} />
          <div>
            <Skeleton height={14} borderRadius={6} width={`${70 + (i % 3) * 10}%`} style={{ marginBottom: 8 }} />
            <Skeleton height={14} borderRadius={6} width={`${50 + (i % 4) * 8}%`} style={{ marginBottom: 12 }} />
            <Skeleton height={11} borderRadius={5} width="35%" />
          </div>
          <Skeleton height={10} borderRadius={5} width={60} />
        </div>
      ))}
    </div>
  )
}

/** قائمة كتب الـ Inbox skeleton */
export function InboxSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 16,
          padding: '16px 20px', background: 'var(--surface)',
          border: '1px solid var(--border-light)', borderRadius: 'var(--r-lg)',
          alignItems: 'center',
        }}>
          <div className="skeleton" style={{ width: 48, height: 64, borderRadius: 8 }} />
          <div>
            <Skeleton height={13} borderRadius={6} width="65%" style={{ marginBottom: 8 }} />
            <Skeleton height={10} borderRadius={5} width="45%" />
          </div>
          <Skeleton height={28} borderRadius={99} width={90} />
          <Skeleton height={34} borderRadius={12} width={110} />
        </div>
      ))}
    </div>
  )
}

/** إحصاء skeleton */
export function StatsSkeleton() {
  const widths = [28, 24, 20]
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-light)', marginBottom: 26, paddingBottom: 20 }}>
      {[0,1,2].map((i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Skeleton height={i === 0 ? 28 : 22} borderRadius={5} width={widths[i]} />
          <Skeleton height={9} borderRadius={4} width={32} />
          {i < 2 && <div style={{ display: 'none' }} />}
        </div>
      )).reduce((acc: React.ReactNode[], el, i) => {
        acc.push(el)
        if (i < 2) acc.push(<div key={`sep-${i}`} style={{ width: 1, background: 'var(--border-light)', margin: '4px 24px' }} />)
        return acc
      }, [])}
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'
import toast from 'react-hot-toast'
import GlobalSearch from '@/components/GlobalSearch'
import AddKnowledgeModal from '@/components/AddKnowledgeModal'
import { supabase } from '@/lib/supabase/client'

/* ── SVG Icons ── */
const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
)
const IconInbox = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
)
const IconLibrary = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
)
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
const IconHelp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconSignout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

function MobileNav({ t }: { t: (k: any) => string }) {
  const pathname = usePathname()
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {NAV_ITEMS_DEF.map(({ href, icon, labelKey }) => (
          <Link key={href} href={href} className={`mobile-nav-item${pathname === href ? ' active' : ''}`}>
            <span className="mobile-nav-icon">{icon}</span>
            <span className="mobile-nav-label">{t(labelKey)}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

const NAV_ITEMS_DEF = [
  { href: '/dashboard', icon: <IconHome />,    labelKey: 'homeNav'    },
  { href: '/inbox',     icon: <IconInbox />,   labelKey: 'inboxNav'   },
  { href: '/library',   icon: <IconLibrary />, labelKey: 'libraryNav' },
]

const NAV_ITEMS = [
  { href: '/dashboard', icon: <IconHome />,    labelKey: 'homeNav'    },
  { href: '/inbox',     icon: <IconInbox />,   labelKey: 'inboxNav'   },
  { href: '/library',   icon: <IconLibrary />, labelKey: 'libraryNav' },
]

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href} className={`nav-item-new${isActive ? ' active' : ''}`}>
      <span className="nav-item-icon">{icon}</span>
      <span className="nav-item-label">{label}</span>
    </Link>
  )
}
function NavItemBtn({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <Link href={href} className={`nav-item-new secondary${isActive ? ' active' : ''}`}>
      <span className="nav-item-icon">{icon}</span>
      <span className="nav-item-label">{label}</span>
    </Link>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthStore()
  const { lang } = useSettings()
  const t = useT(lang)
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const name    = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'م'
  const initial = name.charAt(0).toUpperCase()
  const email   = user?.email || ''

  const handleSignOut = async () => {
    await signOut()
    toast.success(lang === 'ar' ? 'تم تسجيل الخروج' : 'Signed out')
    router.push('/')
  }

  return (
    <div className="app-layout-new">
      {/* TOPBAR */}
      <header className="app-topbar">
        <div className="app-topbar-logo">
          {lang === 'ar' ? <>اقت<span>باس</span></> : <>Iqt<span>ibas</span></>}
        </div>
        <div className="app-topbar-search">
          <GlobalSearch />
        </div>
      </header>

      {/* BODY */}
      <div className="app-body">
        {/* SIDEBAR */}
        <aside className="sidebar-new">
          <button className="btn-add-knowledge" onClick={() => setModalOpen(true)}>
            <span className="btn-add-icon"><IconPlus /></span>
            <span>{t('addKnowledge')}</span>
          </button>

          <nav className="sidebar-nav-list">
            {NAV_ITEMS.map(({ href, icon, labelKey }) => (
              <NavItem key={href} href={href} icon={icon} label={t(labelKey as any)} />
            ))}
          </nav>

          {/* Stats card */}
          <SidebarStats lang={lang} user={user} />

          <div className="sidebar-divider" />

          <div className="sidebar-bottom-links">
            <NavItemBtn href="/settings" icon={<IconSettings />} label={t('settings')} />
            <NavItemBtn href="/help"     icon={<IconHelp />}     label={t('help')}     />
            <button className="nav-item-new secondary signout-btn" onClick={handleSignOut}>
              <span className="nav-item-icon"><IconSignout /></span>
              <span className="nav-item-label">{t('signout')}</span>
            </button>
          </div>

          {/* User card */}
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">{initial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{name}</div>
              <div className="sidebar-user-email">{email}</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content-new">{children}</main>
      </div>

      {/* MOBILE NAV */}
      <MobileNav t={t} />

      <AddKnowledgeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

/* ══════════════════════════════════════
   Sidebar Stats Card
══════════════════════════════════════ */
function SidebarStats({ lang, user }: { lang: string; user: { id: string } | null }) {
  const [stats, setStats] = useState({ quotes: 0, books: 0 })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    load()
    const onRefresh = () => load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('iqtibas:statsChanged', onRefresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('iqtibas:statsChanged', onRefresh)
      document.removeEventListener('visibilitychange', onVisible)
    }

    async function load() {
      const [{ count: q }, { count: b }] = await Promise.all([
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('user_books').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      ])
      setStats({ quotes: q || 0, books: b || 0 })
      setLoaded(true)
    }
  }, [user]) // eslint-disable-line

  if (!loaded && stats.quotes === 0 && stats.books === 0) return null

  return (
    <div style={{
      margin: '6px 12px 4px',
      padding: '0',
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid rgba(180,130,40,.16)',
      background: 'linear-gradient(160deg, rgba(180,130,40,.09) 0%, rgba(180,130,40,.03) 100%)',
    }}>
      {/* Header strip */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(180,130,40,.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '.6rem', fontWeight: 700, color: 'rgba(180,130,40,.7)',
          letterSpacing: '.12em', textTransform: 'uppercase',
        }}>
          {lang === 'ar' ? 'مكتبتك' : 'Your Library'}
        </span>
        <span style={{ fontSize: '.85rem', color: 'rgba(180,130,40,.4)', lineHeight: 1 }}>❝</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Quotes */}
        <div style={{
          padding: '12px 14px',
          borderInlineEnd: '1px solid rgba(180,130,40,.10)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontSize: '2rem', fontWeight: 800, lineHeight: 1,
              letterSpacing: '-.04em', color: 'var(--gold)',
            }}>
              {stats.quotes.toLocaleString()}
            </span>
          </div>
          <div style={{
            fontSize: '.63rem', color: 'var(--text-3)', marginTop: 5,
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: 'rgba(180,130,40,.5)', fontSize: '.7rem' }}>❝</span>
            {lang === 'ar' ? 'اقتباس' : 'Quotes'}
          </div>
        </div>

        {/* Books */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontSize: '2rem', fontWeight: 800, lineHeight: 1,
              letterSpacing: '-.04em', color: 'var(--text-2)',
            }}>
              {stats.books.toLocaleString()}
            </span>
          </div>
          <div style={{
            fontSize: '.63rem', color: 'var(--text-3)', marginTop: 5,
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: '.7rem', opacity: .5 }}>📚</span>
            {lang === 'ar' ? 'كتاب' : 'Books'}
          </div>
        </div>
      </div>
    </div>
  )
}

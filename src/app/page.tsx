'use client'
import Link from 'next/link'
import { useSettings } from '@/stores/settings'
import { useT } from '@/lib/translations'

const FEATURES_AR = [
  { icon: '📷', title: 'رفع الصور',             desc: 'ارفع صور صفحات الكتب مباشرةً من هاتفك أو جهازك بكل سهولة.' },
  { icon: '✨', title: 'استخراج النص تلقائياً', desc: 'تقنية OCR تستخرج النص من الصور بدقة عالية مع دعم كامل للعربية.' },
  { icon: '📚', title: 'قاعدة بيانات الكتب',   desc: 'ابحث عن أي كتاب بالعنوان أو المؤلف عبر ملايين الكتب.' },
  { icon: '🎯', title: 'تحديد الاقتباس',        desc: 'ظلّل الجملة التي تريدها وسيُحفظ الاقتباس في مكتبتك فوراً.' },
  { icon: '🗂️', title: 'مكتبة منظّمة',          desc: 'كل اقتباس مرتبط بكتابه مع الصورة الأصلية والنص الكامل.' },
  { icon: '📤', title: 'تصدير ومشاركة',         desc: 'صدّر اقتباساتك وشاركها بسهولة في أي وقت ومن أي مكان.' },
]
const FEATURES_EN = [
  { icon: '📷', title: 'Upload Images',        desc: 'Upload photos of book pages directly from your phone or device.' },
  { icon: '✨', title: 'Auto Extract Text',    desc: 'OCR technology extracts text from images with high accuracy and full Arabic support.' },
  { icon: '📚', title: 'Book Database',        desc: 'Search for any book by title or author across millions of books.' },
  { icon: '🎯', title: 'Select Your Quote',    desc: 'Highlight the sentence you want and it saves instantly to your library.' },
  { icon: '🗂️', title: 'Organized Library',   desc: 'Every quote is linked to its book with the original image and full text.' },
  { icon: '📤', title: 'Export & Share',       desc: 'Export your quotes and share them easily anytime, anywhere.' },
]

const STEPS_AR = [
  { n: '١', t: 'ابحث عن الكتاب',  d: 'ابحث بالعنوان أو المؤلف وأضف الكتاب لمكتبتك الشخصية.' },
  { n: '٢', t: 'صوّر الصفحة',     d: 'ارفع صورة الصفحة التي تحتوي على الاقتباس الذي يعجبك.' },
  { n: '٣', t: 'استخرج النص',     d: 'يستخرج النظام تلقائياً النص من الصورة في ثوانٍ معدودة.' },
  { n: '٤', t: 'احفظ اقتباسك',    d: 'ظلّل الجملة وسيُحفظ فوراً في مكتبتك مع بيانات الكتاب.' },
]
const STEPS_EN = [
  { n: '1', t: 'Find the Book',    d: 'Search by title or author and add the book to your personal library.' },
  { n: '2', t: 'Capture the Page', d: 'Upload a clear photo of the page that contains the quote you love.' },
  { n: '3', t: 'Extract Text',     d: 'The system automatically extracts text from the image in seconds.' },
  { n: '4', t: 'Save Your Quote',  d: 'Highlight the sentence and it saves instantly to your library.' },
]

const MOCKUP_QUOTES = [
  { text: 'الأيام تمرّ كما يمرّ الغيم، وما تتركه من أثر هو ذكرى تنقشها في قلبك إلى الأبد.', book: 'أولاد حارتنا', author: 'نجيب محفوظ', c: 'linear-gradient(150deg,#8B4513,#D2691E)' },
  { text: 'كنتُ أقرأ لأفهم الآخرين، فاكتشفتُ أنني كنتُ أقرأ لأفهم نفسي.', book: 'موسم الهجرة إلى الشمال', author: 'الطيب صالح', c: 'linear-gradient(150deg,#2E5C8A,#4A90D9)' },
  { text: 'الحكمة ليست في معرفة كل شيء، بل في معرفة ما يستحق أن يُعرف.', book: 'عزازيل', author: 'يوسف زيدان', c: 'linear-gradient(150deg,#5B4A6B,#9B7DB8)' },
]

export default function Landing() {
  const { theme, lang, toggleTheme, toggleLang } = useSettings()
  const t = useT(lang)
  const features = lang === 'ar' ? FEATURES_AR : FEATURES_EN
  const steps    = lang === 'ar' ? STEPS_AR    : STEPS_EN

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav className="landing-nav">
        <div className="logo">
          {lang === 'ar' ? <>اقت<span>باس</span></> : <>Iqt<span>ibas</span></>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="floating-btn" onClick={toggleTheme}
            style={{ position: 'static', width: 34, height: 34, boxShadow: 'none', fontSize: '.85rem' }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="lang-toggle" onClick={toggleLang}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <Link href="/login"  className="btn btn-ghost btn-sm">{t('login')}</Link>
          <Link href="/signup" className="btn btn-gold btn-sm">{t('signup')}</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero" style={{ paddingBottom: 80 }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(184,145,46,.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(184,145,46,.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none', opacity: .5,
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="gold-pill fade-up" style={{ marginBottom: 32 }}>
            <span className="gold-pill-dot" />
            {t('tagline')}
          </div>

          <h1 className="fade-up delay-1" style={{
            fontSize: 'clamp(2.2rem, 6vw, 4.2rem)',
            fontWeight: 200, lineHeight: 1.15,
            letterSpacing: '-.03em', maxWidth: 740,
            marginBottom: 24, textAlign: 'center',
          }}>
            {t('heroLine1')}<br />
            {t('heroLine2')}{' '}
            <em style={{
              fontStyle: 'normal', fontWeight: 500,
              background: 'linear-gradient(135deg, #B8912E 0%, #E8C46A 45%, #B8912E 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 4s ease infinite',
            }}>
              {t('heroGold')}
            </em>
          </h1>

          <p className="fade-up delay-2" style={{
            fontSize: '1.05rem', color: 'var(--text-2)',
            lineHeight: 2, maxWidth: 500, marginBottom: 44, textAlign: 'center',
          }}>
            {t('heroSub')}
          </p>

          <div className="fade-up delay-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}>
            <Link href="/signup" className="btn btn-gold btn-lg" style={{ paddingInline: 36 }}>{t('startFree')}</Link>
            <Link href="/login"  className="btn btn-outline btn-lg">{t('loginBtn')}</Link>
          </div>

          {/* Mockup */}
          <div style={{ width: '100%', maxWidth: 860, position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -40, zIndex: 0,
              background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(184,145,46,.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'relative', zIndex: 1,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl)',
              boxShadow: '0 32px 80px rgba(0,0,0,.1), 0 0 0 1px rgba(184,145,46,.07)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 18px', background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', gap: 7, alignItems: 'center',
              }}>
                {['#FF5F57','#FEBC2E','#28C840'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: .7 }} />
                ))}
                <div style={{ flex: 1, height: 18, borderRadius: 'var(--r-full)', background: 'var(--border-light)', margin: '0 20px', maxWidth: 280 }} />
              </div>
              <div className="landing-mockup-grid" style={{ padding: 20, gap: 14 }}>
                {MOCKUP_QUOTES.map((q, i) => (
                  <div key={i} style={{
                    background: 'var(--bg)', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--r-lg)', padding: '16px 18px',
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 3, height: 40, borderRadius: 99, background: q.c, flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: '.78rem', lineHeight: 1.85, color: 'var(--text-2)', fontStyle: 'italic', margin: 0, direction: 'rtl' }}>
                        {q.text}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingInlineStart: 13 }}>
                      <div style={{ width: 18, height: 25, borderRadius: 2, background: q.c, flexShrink: 0, opacity: .8 }} />
                      <span style={{ fontSize: '.66rem', color: 'var(--text-3)' }}>{q.book} · {q.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 clamp(20px,6vw,80px)', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        <div style={{ color: 'var(--gold)', fontSize: '1rem', opacity: .35, letterSpacing: 6 }}>✦ ✦ ✦</div>
        <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
      </div>

      {/* ── FEATURES ── */}
      <section className="landing-section" style={{ paddingTop: 72 }}>
        <div style={{ marginBottom: 56, maxWidth: 500 }}>
          <div className="section-label">{t('featuresLabel')}</div>
          <h2 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 200, letterSpacing: '-.03em', marginBottom: 12, lineHeight: 1.2 }}>
            {t('featuresTitle')}
          </h2>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.9, fontSize: '.92rem' }}>
            {t('featuresSub')}
          </p>
        </div>

        <div className="grid-3" style={{ gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: '26px 24px',
              background: 'var(--surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--r-xl)',
              transition: 'all .2s ease',
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--gold-border)'
                el.style.transform = 'translateY(-3px)'
                el.style.boxShadow = '0 12px 32px rgba(184,145,46,.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border-light)'
                el.style.transform = ''
                el.style.boxShadow = ''
              }}
            >
              <div style={{
                position: 'absolute', top: 0, insetInlineEnd: 0,
                width: 80, height: 80,
                background: 'radial-gradient(circle at top right, rgba(184,145,46,.06), transparent 70%)',
                pointerEvents: 'none',
              }} />
              <div style={{
                width: 42, height: 42, borderRadius: 'var(--r-md)',
                background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', marginBottom: 16,
              }}>{f.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 7, fontSize: '.9rem', letterSpacing: '-.01em' }}>{f.title}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.8 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS — timeline ── */}
      <div style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        padding: 'clamp(60px,7vw,88px) clamp(20px,5vw,60px)',
        margin: '60px 0',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div className="section-label">{t('stepsLabel')}</div>
            <h2 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 200, letterSpacing: '-.03em' }}>
              {t('stepsTitle')}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute', top: 17, left: '12%', right: '12%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, var(--gold-border) 15%, var(--gold-border) 85%, transparent)',
              zIndex: 0,
            }} />
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 20px', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '2px solid var(--gold)',
                  color: 'var(--gold)', fontWeight: 700, fontSize: '.88rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 0 5px var(--surface)',
                }}>{s.n}</div>
                <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 8 }}>{s.t}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-2)', lineHeight: 1.8 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURED QUOTE ── */}
      <section className="landing-section" style={{ paddingTop: 20, paddingBottom: 80 }}>
        <div style={{
          maxWidth: 640, margin: '0 auto',
          padding: 'clamp(44px, 6vw, 64px) clamp(28px, 5vw, 56px)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-2xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,.05)',
          position: 'relative', textAlign: 'center', overflow: 'hidden',
        }}>
          {/* Faint background quote mark */}
          <div style={{
            position: 'absolute', top: '-0.1em', left: '50%', transform: 'translateX(-50%)',
            fontSize: '10rem', lineHeight: 1, fontFamily: 'Georgia, serif',
            color: 'var(--gold)', opacity: .04,
            pointerEvents: 'none', userSelect: 'none', fontWeight: 900,
          }}>❝</div>

          {/* Stars */}
          <div style={{ color: 'var(--gold)', fontSize: '.85rem', letterSpacing: 4, marginBottom: 24, opacity: .7 }}>
            ★ ★ ★ ★ ★
          </div>

          <blockquote style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.18rem)',
            fontWeight: 300, lineHeight: 2,
            color: 'var(--text)', marginBottom: 28,
            fontStyle: 'italic', position: 'relative', zIndex: 1,
            direction: 'rtl',
          }}>
            {t('testimonial')}
          </blockquote>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 24, height: 1, background: 'var(--gold-border)' }} />
            <cite style={{ fontSize: '.8rem', color: 'var(--text-3)', fontStyle: 'normal', fontWeight: 500 }}>
              {t('testimonialAuthor')}
            </cite>
            <div style={{ width: 24, height: 1, background: 'var(--gold-border)' }} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="landing-cta">
        <div style={{
          background: 'linear-gradient(150deg, #16130f 0%, #22190f 50%, #17140f 100%)',
          borderRadius: 'var(--r-2xl)',
          padding: 'clamp(60px, 8vw, 92px) clamp(28px, 6vw, 60px)',
          textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-60%)',
            width: 800, height: 400,
            background: 'radial-gradient(ellipse, rgba(184,145,46,.2) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(184,145,46,.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px', opacity: .25, pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 48, height: 2,
              background: 'linear-gradient(90deg, transparent, #D4A843, transparent)',
              margin: '0 auto 28px',
            }} />
            <h2 style={{
              fontSize: 'clamp(1.9rem,4.5vw,3rem)',
              fontWeight: 200, color: '#fff',
              letterSpacing: '-.035em', marginBottom: 14, lineHeight: 1.2,
            }}>
              {t('ctaTitle')}
            </h2>
            <p style={{
              fontSize: '.98rem', color: 'rgba(255,255,255,.38)',
              margin: '0 auto 44px', maxWidth: 380, lineHeight: 2,
            }}>
              {t('ctaSub')}
            </p>
            <Link href="/signup" className="btn btn-gold btn-lg" style={{ paddingInline: 52 }}>
              {t('ctaBtn')}
            </Link>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="logo" style={{ fontSize: '1rem' }}>
          {lang === 'ar' ? <>اقت<span>باس</span></> : <>Iqt<span>ibas</span></>}
        </div>
        <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>
          {t('footerRights')}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/login"  style={{ fontSize: '.75rem', color: 'var(--text-3)', textDecoration: 'none' }}>{t('login')}</Link>
          <Link href="/signup" style={{ fontSize: '.75rem', color: 'var(--text-3)', textDecoration: 'none' }}>{t('signup')}</Link>
        </div>
      </footer>

    </div>
  )
}

'use client'
import { create } from 'zustand'

export type Theme = 'light' | 'dark'
export type Lang  = 'ar' | 'en'

interface SettingsStore {
  theme: Theme
  lang:  Lang
  setTheme:    (t: Theme) => void
  setLang:     (l: Lang)  => void
  toggleTheme: () => void
  toggleLang:  () => void
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}
function applyLang(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('lang', lang)
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}
function detectDeviceLang(): Lang {
  try {
    if (typeof navigator === 'undefined') return 'ar'
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const l of langs) { if (l.startsWith('ar')) return 'ar' }
    return 'en'
  } catch { return 'ar' }
}
function loadSaved(): { theme: Theme; lang: Lang } {
  try {
    if (typeof localStorage === 'undefined') return { theme: 'light', lang: detectDeviceLang() }
    const savedTheme = localStorage.getItem('iq_theme') as Theme | null
    const savedLang  = localStorage.getItem('iq_lang')  as Lang  | null
    return { theme: savedTheme || 'light', lang: savedLang || detectDeviceLang() }
  } catch { return { theme: 'light', lang: detectDeviceLang() } }
}

const saved = loadSaved()
applyTheme(saved.theme)
applyLang(saved.lang)

export const useSettings = create<SettingsStore>((set, get) => ({
  theme: saved.theme,
  lang:  saved.lang,

  setTheme: (theme) => {
    applyTheme(theme)
    try { localStorage.setItem('iq_theme', theme) } catch { /* */ }
    set({ theme })
  },
  setLang: (lang) => {
    applyLang(lang)
    try { localStorage.setItem('iq_lang', lang) } catch { /* */ }
    set({ lang })
  },
  toggleTheme: () => { const next: Theme = get().theme === 'light' ? 'dark' : 'light'; get().setTheme(next) },
  toggleLang:  () => { const next: Lang  = get().lang  === 'ar'    ? 'en'   : 'ar';    get().setLang(next)  },
}))

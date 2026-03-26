import type { Metadata } from 'next'
import '@fontsource/ibm-plex-sans-arabic/200.css'
import '@fontsource/ibm-plex-sans-arabic/300.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@/styles/globals.css'
import Providers from '@/components/Providers'
import PasswordGate from '@/components/PasswordGate'

export const metadata: Metadata = {
  title: 'اقتباس',
  description: 'مكتبتك الشخصية من الاقتباسات والمعرفة',
  icons: { icon: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>
          <PasswordGate>
            {children}
          </PasswordGate>
        </Providers>
      </body>
    </html>
  )
}

import { Montserrat, Poppins } from 'next/font/google'
import '../styles/globals.css'
import { StoreProvider } from '@/context/StoreContext'
import { WishlistProvider } from '@/context/WishlistContext'
import ThemeProvider from '@/components/ThemeProvider'
import { Toaster } from 'react-hot-toast'
import ScrollToTop from '@/components/ui/ScrollToTop'

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300','400','500','600','700','800','900'],
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400','500','600','700','800','900'],
})

export const metadata = {
  title: 'Ghazi Attire — Premium Fashion',
  description: 'Curated fashion for those who define their own style.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }
}

const themeInitScript = `try{var t=JSON.parse(localStorage.getItem('gz-theme'));if(t&&t.primary){var r=document.documentElement;r.style.setProperty('--color-primary',t.primary);r.style.setProperty('--color-primary-dark',t.primaryDark);r.style.setProperty('--color-primary-light',t.primaryLight)}}catch(e){}`

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${montserrat.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body text-ink antialiased leading-relaxed">
        <StoreProvider>
          <WishlistProvider>
            <ThemeProvider>
              {children}
              <ScrollToTop />
              <Toaster position="bottom-right" toastOptions={{
                style:{ background:'#fff', color:'#111', border:'1px solid #E5E0D8', fontFamily:'var(--font-body)', fontSize:'15px', borderRadius:'8px' },
                success:{ iconTheme:{ primary:'var(--color-primary)', secondary:'#fff' } },
              }}/>
            </ThemeProvider>
          </WishlistProvider>
        </StoreProvider>
      </body>
    </html>
  )
}

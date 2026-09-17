'use client'
import Header from './Header'
import Footer from './Footer'
import AnnouncementBar from './AnnouncementBar'
import MobileBottomNav from './MobileBottomNav'
export default function MainLayout({ children, hideFooter=false }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <AnnouncementBar/>
      <Header/>
      <main className="fade-up pb-[72px] lg:pb-0">{children}</main>
      {!hideFooter && <Footer/>}
      <MobileBottomNav />
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Instagram,
  Linkedin,
  Twitter,
  MessageCircle,
} from 'lucide-react'
import { catalogApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function Footer() {
  const staticCols = {
    Company: [
      ['About-Us', '#'],
      ['Blog', '#'],
      ['Privacy Policy', '#'],
      ['Terms & Conditions', '#'],
      ['Work With Us', '#'],
    ],
    Customers: [
      ['Contact Us', '#'],
      ['FAQs', '#'],
      ['Shipping Policy', '#'],
      ['Refund Policy', '#'],
    ],
  }
  const socials = [
    ['Instagram', Instagram],
    ['LinkedIn', Linkedin],
    ['Twitter', Twitter],
    ['WhatsApp', MessageCircle],
  ]
  const [marqueeMessage, setMarqueeMessage] = useState('Free shipping on orders above Rs. 999')
  const [categories, setCategories] = useState([])
  const [branding, setBranding] = useState({})
  const [content, setContent] = useState({})

  useEffect(() => {
    catalogApi.home()
      .then(data => {
        setMarqueeMessage(data.footerMarquee?.message || `Free shipping on orders above ₹${data.shipping?.freeThreshold ?? 999}`)
        setCategories(data.categories || [])
        setBranding(data.branding || {})
        setContent(data.content || {})
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="site-footer bg-primary text-white mt-16">
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 pt-10 pb-6">
        <div className="mb-10">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <Link href="/" className="shrink-0 inline-block">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Ghazi Attire" className="h-12 max-w-[180px] object-contain" />
                ) : (
                  <span className="font-display text-2xl font-black tracking-wider text-white">GHAZI ATTIRE</span>
                )}
              </Link>
              <div className="hidden sm:block h-10 w-[1px] bg-white/25" />
              <p className="max-w-xl text-[13px] sm:text-sm text-white/80 leading-relaxed font-medium">
                Premium contemporary & modest attire crafted with timeless elegance, superior fabric craftsmanship, and unmatched comfort. Designed for the modern wardrobe.
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-white">Spot Us On</p>
            <div className="footer-socials grid grid-cols-4 border border-white/35">
              {socials.map(([label, Icon]) => (
                <a
                  key={label}
                  href={content.social?.[label.toLowerCase().replace('twitter', 'twitter').replace('whatsapp', 'whatsapp')] || '#'}
                  aria-label={label}
                  className="group flex min-h-16 items-center justify-center gap-2 border-r border-white/35 px-2 text-white transition-colors hover:bg-white/15 last:border-r-0 sm:gap-4 sm:px-5"
                >
                  <Icon size={24} strokeWidth={2.4} className="transition-transform group-hover:scale-110" />
                  <span className="hidden text-sm font-extrabold uppercase tracking-wide sm:inline">{label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries({
              Categories: categories.map(category => [category.name, `/plp?category=${category.slug}`]),
              ...staticCols
            }).map(([h, links]) => (
              <div key={h}>
                <p className="mb-5 text-sm font-extrabold uppercase tracking-wide text-white">{h}</p>
              <ul className="space-y-1.5">
                {links.map(([l, href]) => (
                  <li key={l}>
                    <Link href={href} className="text-[13px] font-bold uppercase tracking-wide text-white/75 transition-colors hover:text-white">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="relative left-1/2 w-screen -translate-x-1/2 mb-8">
          <div className="marquee bg-primary py-6">
            <div className="marquee__track" aria-hidden>
              <span className="marquee__item font-extrabold text-white">{marqueeMessage}</span><span className="marquee__item font-extrabold text-white">{marqueeMessage}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-5 border-t border-white/10">
          <p className="text-[12px] text-white/55">&copy; 2026 Ghazi Attire. All rights reserved.</p>
          {/* Payment icons removed from the footer bottom. */}
        </div>
      </div>
    </footer>
  )
}

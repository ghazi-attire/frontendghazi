'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { catalogApi } from '@/lib/api'

function formatValidUntil(value) {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function PromoBanner() {
  const [shippingConfig, setShippingConfig] = useState({ fee: 149, freeThreshold: 999, validUntil: '', imageUrl: '', bannerTitle: '', bannerSubtitle: '' })

  useEffect(() => {
    catalogApi.home().then(data => setShippingConfig(data.shipping || { fee: 149, freeThreshold: 999, validUntil: '', imageUrl: '', bannerTitle: '', bannerSubtitle: '' })).catch(() => {})
  }, [])

  const validUntilText = useMemo(() => formatValidUntil(shippingConfig.validUntil), [shippingConfig.validUntil])
  const bannerImage = shippingConfig.imageUrl || shippingConfig.bannerImage || ''
  const bannerTitle = shippingConfig.bannerTitle?.trim() || `FREE SHIPPING ON ₹${shippingConfig.freeThreshold}+`
  const bannerSubtitle = shippingConfig.bannerSubtitle?.trim() || `Use code FREESHIP at checkout`

  return (
    <section className="mx-4 md:mx-6 my-2 md:my-4 rounded-2xl overflow-hidden relative text-white py-8 md:py-10 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6"
      style={{background:'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))'}}>
      <div className="absolute inset-0 opacity-10"
        style={{backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 12px)'}}/>
      <div className="relative flex flex-col md:flex-row items-center gap-5 md:gap-8 text-center md:text-left w-full md:w-auto">
        {bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage} alt="Free shipping" className="h-48 w-48 md:h-56 md:w-56 rounded-xl object-cover flex-shrink-0 shadow-lg border border-white/20 bg-white/10" loading="lazy" />
        )}
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-80 mb-1">Limited Time</p>
          <h2 className="font-display text-[clamp(28px,5vw,48px)] font-bold leading-tight">{bannerTitle}</h2>
          <p className="text-[13px] opacity-85 mt-1">{bannerSubtitle}{validUntilText ? ` · Valid till ${validUntilText}` : ''}</p>
        </div>
      </div>
      <Link href="/plp" className="group relative inline-flex flex-shrink-0 items-center gap-2 bg-white text-primary font-bold text-[13px] px-8 py-3.5 rounded-xl hover:bg-surface-alt transition-colors shadow-lg">
        Shop Now
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  )
}

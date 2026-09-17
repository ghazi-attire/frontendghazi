'use client'
import { useEffect, useState } from 'react'
import { Truck, RefreshCw, ShieldCheck, Headphones } from 'lucide-react'
import { catalogApi } from '@/lib/api'

export default function UspStrip() {
  const [shippingThreshold, setShippingThreshold] = useState(999)

  useEffect(() => {
    catalogApi.home()
      .then(data => setShippingThreshold(Number(data.shipping?.freeThreshold ?? 999)))
      .catch(() => setShippingThreshold(999))
  }, [])

  const usps = [
    { Icon:Truck, title:'Free Delivery', desc:`On orders above ₹${shippingThreshold}` },
    { Icon:RefreshCw, title:'Easy Exchange', desc:'Size swaps made simple' },
    { Icon:ShieldCheck, title:'Secure Payments', desc:'100% safe via Razorpay' },
    { Icon:Headphones, title:'24/7 Support', desc:'Always here for you' },
  ]
  return (
    <section className="bg-surface-alt border-t border-line py-7 md:py-9">
      <div className="max-w-[1360px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {usps.map(({Icon,title,desc})=>(
            <div key={title} className="flex flex-col items-center gap-2">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                <Icon size={22} className="text-primary"/>
              </div>
              <p className="text-[13px] font-semibold text-ink">{title}</p>
              <p className="text-[12px] text-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

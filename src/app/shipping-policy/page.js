'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Truck, ShieldCheck, Clock, ArrowRight } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { catalogApi } from '@/lib/api'

export default function ShippingPolicyPage() {
  const [shippingConfig, setShippingConfig] = useState({ fee: 149, freeThreshold: 999, infoText: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    catalogApi.home()
      .then(data => setShippingConfig(data.shipping || { fee: 149, freeThreshold: 999, infoText: '' }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <MainLayout>
      <main className="overflow-x-hidden bg-white">
        <section className="bg-[#faf8f5] px-5 py-16 text-center sm:px-8 md:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.25em] text-primary">Store Policies</p>
            <h1 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
              Shipping & Delivery Policy
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg font-bold text-ink-muted">
              Fast, dependable shipping across India with end-to-end order tracking and secure packaging.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-14">
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Truck size={24} />
              </div>
              <h2 className="text-lg font-black text-ink mb-2">Free Delivery</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Enjoy free standard shipping across all serviceable pin codes on orders above ₹{shippingConfig.freeThreshold ?? 999}.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Clock size={24} />
              </div>
              <h2 className="text-lg font-black text-ink mb-2">Delivery Timelines</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Standard orders are delivered within 3 to 5 business days. Express shipping delivers within 1 to 2 business days.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-lg font-black text-ink mb-2">Secure & Tracked</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                All dispatches are accompanied by real-time tracking links provided directly via your orders page and notifications.
              </p>
            </div>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-line bg-[#faf8f5] p-6 sm:p-8">
              <h2 className="text-xl font-black text-ink mb-3">Order Processing & Dispatch</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Orders are processed and packed within 24 to 48 hours of confirmation (excluding Sundays and national holidays).
                Once your order is handed over to our courier partner, tracking details are automatically updated in your customer portal.
              </p>
              {shippingConfig.infoText && (
                <div className="mt-4 rounded-xl bg-white p-4 border border-line/60 text-sm font-medium text-ink">
                  {shippingConfig.infoText}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
              <h2 className="text-xl font-black text-ink mb-3">Shipping Charges</h2>
              <p className="text-sm text-ink-muted leading-relaxed mb-4">
                Shipping rates are calculated dynamically during checkout based on your destination pincode and cart value:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-ink-muted leading-relaxed">
                <li>Orders above ₹{shippingConfig.freeThreshold ?? 999}: <strong className="text-ink">Free Delivery</strong></li>
                <li>Standard delivery for orders below threshold: <strong className="text-ink">₹{shippingConfig.fee ?? 149}</strong></li>
                <li>Cash on Delivery (COD) availability depends on local courier serviceability for your pin code.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
              <h2 className="text-xl font-black text-ink mb-3">Questions & Support</h2>
              <p className="text-sm text-ink-muted leading-relaxed mb-5">
                Have questions regarding your shipment or need to update your delivery address? Reach out to our customer care team.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-dark transition-colors">
                  Contact Support <ArrowRight size={14} />
                </Link>
                <Link href="/profile?tab=orders" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-ink hover:border-primary hover:text-primary transition-colors">
                  Track My Orders
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MainLayout>
  )
}

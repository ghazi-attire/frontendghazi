'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RotateCcw, ShieldCheck, Video, TicketPercent, ArrowRight, MessageCircle } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { api } from '@/lib/api'

export default function RefundPolicyPage() {
  const [settings, setSettings] = useState({ windowDays: 10, returnsEnabled: true, exchangesEnabled: true, whatsappNumber: '919676083143' })

  useEffect(() => {
    api('/api/orders/return-exchange-settings')
      .then(data => {
        if (data) setSettings(data)
      })
      .catch(() => {})
  }, [])

  return (
    <MainLayout>
      <main className="overflow-x-hidden bg-white">
        <section className="bg-[#faf8f5] px-5 py-16 text-center sm:px-8 md:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.25em] text-primary">Store Policies</p>
            <h1 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
              Returns, Exchanges & Refunds
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg font-bold text-ink-muted">
              We stand behind the quality and craftsmanship of our attire. Here is how our hassle-free return and exchange process works.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-14">
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <RotateCcw size={24} />
              </div>
              <h2 className="text-lg font-black text-ink mb-2">{settings.windowDays || 10}-Day Window</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Eligible items can be requested for return or exchange within {settings.windowDays || 10} days from the date of delivery.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Video size={24} />
              </div>
              <h2 className="text-lg font-black text-ink mb-2">Unboxing Video</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                To protect both parties against damage in transit or missing items, an opening/unboxing video is required for claims.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <TicketPercent size={24} />
              </div>
              <h2 className="text-lg font-black text-ink mb-2">Instant Store Coupons</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Approved exchanges issue an instant store credit coupon directly to your account to order the replacement size/style immediately.
              </p>
            </div>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-line bg-[#faf8f5] p-6 sm:p-8">
              <h2 className="text-xl font-black text-ink mb-3">Eligibility Guidelines</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-ink-muted leading-relaxed">
                <li>Items must be unworn, unwashed, and in their original packaging with all tags attached.</li>
                <li>Requests must be initiated from your customer portal within {settings.windowDays || 10} days of delivery.</li>
                <li>Clear photos of the item and/or an unboxing video link must be provided with the request.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
              <h2 className="text-xl font-black text-ink mb-3">How to Initiate a Return or Exchange</h2>
              <ol className="list-decimal list-inside space-y-3 text-sm text-ink-muted leading-relaxed">
                <li>Go to <strong className="text-ink">My Orders</strong> in your account profile.</li>
                <li>Find the relevant delivered order and click <strong className="text-ink">Return / Exchange</strong> on the item.</li>
                <li>Select the reason, attach evidence images or video link, and submit your request.</li>
                <li>You can also click the WhatsApp button on the confirmation modal to share unboxing media with our team directly.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
              <h2 className="text-xl font-black text-ink mb-3">Refund & Processing Timeline</h2>
              <p className="text-sm text-ink-muted leading-relaxed mb-4">
                Once approved by our team:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-ink-muted leading-relaxed">
                <li><strong className="text-ink">Exchanges:</strong> An exchange coupon code matching the item value is immediately generated in your profile under <em>Returns & Exchanges &gt; Exchange Coupons</em>.</li>
                <li><strong className="text-ink">Returns / Refunds:</strong> Refunds are processed to the original payment method or bank account within 5–7 business days following pickup and quality check.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
              <h2 className="text-xl font-black text-ink mb-3">Need Assistance?</h2>
              <p className="text-sm text-ink-muted leading-relaxed mb-5">
                Our support team is always available to help ensure your complete satisfaction.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/profile?tab=returns" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-dark transition-colors">
                  View My Return Requests <ArrowRight size={14} />
                </Link>
                {settings.whatsappNumber && (
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-ink hover:border-primary hover:text-primary transition-colors"
                  >
                    <MessageCircle size={16} className="text-green-600" /> WhatsApp Support
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </MainLayout>
  )
}

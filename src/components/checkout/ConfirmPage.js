'use client'
import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, ArrowRight } from 'lucide-react'

function ConfirmContent() {
  const sp = useSearchParams()
  const order = sp.get('order')
  return (
    <div className="max-w-[600px] mx-auto px-6 py-20 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-7">
        <CheckCircle2 size={42} className="text-green-600"/>
      </div>
      <h1 className="font-display text-6xl font-bold tracking-wide mb-4">ORDER PLACED!</h1>
      <p className="text-[15px] text-ink-muted leading-relaxed mb-7">
        Thank you for shopping with Ghazi Attire! Your order is confirmed and will be shipped within 1–2 business days.
      </p>
      <div className="inline-block bg-surface-alt border border-line rounded-2xl px-10 py-4 font-display text-[24px] font-bold tracking-widest mb-5">
        {order || 'ORDER CONFIRMED'}
      </div>
      <p className="text-[13px] text-ink-muted mb-10">
        Confirmation has been saved to your account.
      </p>
      <div className="flex gap-3 justify-center flex-wrap mb-12">
        <Link href="/profile" className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-xl font-bold text-[13px] transition-all shadow-lg shadow-primary/25">View My Orders</Link>
        <Link href="/" className="group inline-flex items-center justify-center gap-2 border-2 border-line hover:border-primary text-ink-mid hover:text-primary px-8 py-3.5 rounded-xl font-semibold text-[13px] transition-all">
          Continue Shopping
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
      <div className="bg-surface-alt border border-line rounded-2xl p-6 text-left">
        <p className="text-[12px] uppercase tracking-[0.15em] text-ink-muted font-semibold mb-4">What happens next?</p>
        {[
          {icon:'✅',text:'Order confirmed',  done:true},
          {icon:'📦',text:'Preparing your order',done:false},
          {icon:'🚚',text:'Dispatched from warehouse', done:false},
          {icon:'🏠',text:'Out for delivery',done:false},
        ].map((s,i)=>(
          <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
            <span className="text-[17px] mt-0.5">{s.icon}</span>
            <p className={`text-[13px] leading-relaxed ${s.done?'text-green-600 font-medium':'text-ink-muted'}`}>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return <Suspense fallback={null}><ConfirmContent /></Suspense>
}

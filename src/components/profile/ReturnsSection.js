'use client'
import { useEffect, useState } from 'react'
import { Package, RefreshCw, TicketPercent } from 'lucide-react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

function formatDate(d) {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return String(d) }
}

export default function ReturnsSection() {
  const [requests, setRequests] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [reqData, coupData] = await Promise.all([
          api('/api/orders/return-exchange-requests').catch(()=>({ items: [] })),
          api('/api/orders/exchange-coupons').catch(()=>({ items: [] })),
        ])
        if (cancelled) return
        setRequests(reqData.items || reqData || [])
        setCoupons(coupData.items || coupData || [])
      } catch {
        if (!cancelled) { setRequests([]); setCoupons([]) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="space-y-4"><div className="h-32 animate-pulse rounded-2xl bg-surface-alt"/><div className="h-32 animate-pulse rounded-2xl bg-surface-alt"/></div>

  return (
    <div>
      <h2 className="font-display text-4xl font-bold tracking-wide mb-7">RETURNS & EXCHANGES</h2>

      <div className="mb-8">
        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-ink-muted mb-3 flex items-center gap-2"><Package size={16}/> Requests</h3>
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <p className="font-bold text-ink">No return/exchange requests</p>
            <p className="text-sm text-ink-muted mt-1">Requests you create from your orders will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {r.image ? (
                      <img src={r.image} alt="" className="h-16 w-16 rounded-xl object-cover border border-line flex-shrink-0 bg-white" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-surface-alt border border-line/60 flex items-center justify-center text-xs text-ink-muted flex-shrink-0">
                        <Package size={22} className="text-ink-faint" />
                      </div>
                    )}
                    <div>
                      {r.brand && <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{r.brand}</p>}
                      <p className="text-sm font-black text-ink">
                        {r.productName || r.product_name || 'Product'} 
                        <span className="ml-2 rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">{r.type}</span>
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">Order #{r.orderNumber || r.order_number || r.order_id} {r.created_at ? `· ${formatDate(r.created_at)}` : ''}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-ink-muted">
                        <span>Size: <strong className="text-ink">{r.size || '-'}</strong></span>
                        {r.color && <span>Color: <strong className="text-ink">{r.color}</strong></span>}
                        {r.height && <span>Height: <strong className="text-ink">{r.height}</strong></span>}
                        <span>Qty: <strong className="text-ink">{r.quantity || 1}</strong></span>
                        {r.sku && <span>SKU: <strong className="text-ink font-mono">{r.sku}</strong></span>}
                      </div>
                      <p className="text-xs text-ink-muted mt-1.5">Reason: <span className="font-semibold text-ink">{r.reason_category}</span> {r.reason_notes ? `— ${r.reason_notes}` : ''}</p>
                      {r.admin_remarks && <p className="mt-2 text-xs font-semibold text-ink">Admin remarks: <span className="font-normal">{r.admin_remarks}</span></p>}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${r.request_status==='approved'?'bg-green-100 text-green-700': r.request_status==='rejected'?'bg-red-100 text-red-700': r.request_status==='refunded'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{r.request_status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-ink-muted mb-3 flex items-center gap-2"><TicketPercent size={16}/> Exchange Coupons</h3>
        {coupons.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <p className="font-bold text-ink">No exchange coupons</p>
            <p className="text-sm text-ink-muted mt-1">Coupons from approved exchanges will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {coupons.map(c => (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-5">
                <p className="font-mono text-sm font-black tracking-widest text-ink">{c.code}</p>
                <p className="mt-1 text-2xl font-black text-primary">{formatPrice(c.value)}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  {c.couponStatus || c.coupon_status} · Expires: {formatDate(c.expiresAt || c.expires_at)}
                </p>
                {c.usedOrderId && <p className="text-xs text-ink-muted">Used: {c.usedOrderId}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

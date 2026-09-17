'use client'
import { useState, useEffect } from 'react'
import { X, Upload, MessageCircle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

const REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
]

function buildWhatsAppMessage({ order, item, type }) {
  const address = order.shippingAddress || {}
  const addressLines = []
  const line1 = address.addressLine1 || address.address_line1 || address.street
  const line2 = address.addressLine2 || address.address_line2
  const cityState = [address.city, address.state].filter(Boolean).join(', ')
  const pincode = address.pincode ? `PIN: ${address.pincode}` : ''
  if (line1) addressLines.push(line1)
  if (line2) addressLines.push(line2)
  if (cityState) addressLines.push(cityState)
  if (pincode) addressLines.push(pincode)

  const reqType = type === 'exchange' ? 'Exchange' : 'Return'

  return [
    'Ghazi Attire',
    '',
    `Ghazi Attire - Order ${order.orderNumber || order.id || ''}`,
    '',
    'Customer:',
    `Name: ${order.customerName || address.fullName || '-'}`,
    `Phone: ${order.customerPhone || address.phone || '-'}`,
    '',
    'Address:',
    addressLines.length > 0 ? addressLines.join('\n') : '-',
    '',
    'Product:',
    item.name || item.productName || 'Product',
    `Size: ${item.size || '-'}`,
    `Color: ${item.color || '-'}`,
    `Height: ${item.height || '-'}`,
    `SKU: ${item.sku || '-'}`,
    `Quantity: ${item.qty || item.quantity || 1}`,
    '',
    'Request:',
    reqType,
    '',
    'Please send the opening/unboxing video in this WhatsApp chat.'
  ].join('\n')
}

export default function ReturnExchangeModal({ order, item, onClose, onSubmitted, initialType, returnSettings }) {
  const [settings, setSettings] = useState(returnSettings || null)
  const exchangesAllowed = settings?.exchangesEnabled !== false
  const returnsAllowed = settings?.returnsEnabled !== false

  // If exchanges are disabled, force return
  const determinedInitialType = (!exchangesAllowed && (initialType === 'exchange')) ? 'return' : (initialType || 'return')
  const [type, setType] = useState(determinedInitialType)
  const [reasonCategory, setReasonCategory] = useState('damaged')
  const [reasonNotes, setReasonNotes] = useState('')
  const [images, setImages] = useState([])
  const [driveLink, setDriveLink] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdRequest, setCreatedRequest] = useState(null)
  const [whatsappNumber, setWhatsappNumber] = useState(settings?.whatsappNumber || '919676083143')

  useEffect(() => {
    if (!settings) {
      api('/api/orders/return-exchange-settings')
        .then(s => {
          if (s) {
            setSettings(s)
            if (s.whatsappNumber) setWhatsappNumber(s.whatsappNumber)
            if (s.exchangesEnabled === false && type === 'exchange') {
              setType('return')
            }
          }
        })
        .catch(() => {})
    } else if (settings.whatsappNumber) {
      setWhatsappNumber(settings.whatsappNumber)
    }
  }, [settings, type])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 evidence images allowed')
      return
    }
    setUploading(true)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/uploads/evidence`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        })
        const payload = await res.json().catch(() => ({ success: false }))
        if (!res.ok || payload.success === false) throw new Error(payload.message || 'Upload failed')
        const url = payload.data?.url || payload.data
        setImages(prev => [...prev, url].slice(0, 5))
        toast.success('Image uploaded')
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async () => {
    if (type === 'exchange' && !exchangesAllowed) {
      return toast.error('Exchanges are currently disabled')
    }
    if (type === 'return' && !returnsAllowed) {
      return toast.error('Returns are currently disabled')
    }
    if (!reasonCategory) return toast.error('Select a reason')
    if (reasonNotes && reasonNotes.length > 1000) return toast.error('Notes must be <= 1000 characters')
    if (images.length === 0 && !driveLink.trim()) return toast.error('Provide at least one evidence image or Drive link')
    if (images.length > 5) return toast.error('Maximum 5 images')
    if (driveLink.trim()) {
      try {
        const url = new URL(driveLink.trim())
        if (url.protocol !== 'https:' || (!url.hostname.includes('drive.google.com') && !url.hostname.includes('docs.google.com'))) {
          throw new Error('Invalid')
        }
      } catch {
        return toast.error('Invalid Drive link — must be https://drive.google.com/...')
      }
    }
    setSubmitting(true)
    try {
      const data = await api(`/api/orders/${order.id}/items/${item.id || item.productId}/return-exchange-requests`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          reasonCategory,
          reasonNotes: reasonNotes.trim() || null,
          images,
          driveLink: driveLink.trim() || null,
        }),
      })
      setCreatedRequest(data)
      toast.success(`${type === 'return' ? 'Return' : 'Exchange'} request created`)
      onSubmitted && onSubmitted(data)
    } catch (err) {
      toast.error(err.message || 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWhatsApp = () => {
    const msg = buildWhatsAppMessage({ order, item, type })
    const encoded = encodeURIComponent(msg)
    const ADMIN_WHATSAPP = '919676083143'
    let phone = String(whatsappNumber || '').replace(/\D/g, '')
    if (phone.length === 10) phone = `91${phone}`
    if (phone.length < 10) phone = ADMIN_WHATSAPP
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
  }

  const productImage = item.image || item.imageUrl

  if (createdRequest) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <h3 className="font-display text-2xl font-black text-ink">{type === 'return' ? 'Return' : 'Exchange'} Request Created</h3>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:border-primary"><X size={18}/></button>
          </div>
          <p className="mt-2 text-sm text-ink-muted">Your request has been submitted. Please send your opening/unboxing video on WhatsApp.</p>
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-bold text-green-700 flex items-center gap-2"><MessageCircle size={16}/> Opening / Unboxing Video</p>
            <p className="mt-1 text-xs text-green-700">Please send your opening/unboxing video on WhatsApp for verification.</p>
            <button onClick={handleWhatsApp} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-black text-white hover:bg-[#128C7E] transition shadow-sm">
              <MessageCircle size={16}/> Send Video on WhatsApp
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-line py-3 text-sm font-bold hover:border-primary">Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <h3 className="font-display text-2xl font-black text-ink">Request Return / Exchange</h3>
            <p className="text-sm text-ink-muted">Order #{order.orderNumber || order.id}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:border-primary"><X size={18}/></button>
        </div>

        {/* Structured Product Card */}
        <div className="mt-4 rounded-xl border border-line bg-surface-alt/60 p-3.5 flex gap-3.5 items-start">
          {productImage ? (
            <img 
              src={productImage} 
              alt={item.name || item.productName || 'Product'} 
              className="h-20 w-20 rounded-lg object-cover border border-line flex-shrink-0 bg-white"
            />
          ) : (
            <div className="h-20 w-20 rounded-lg border border-line bg-white flex flex-col items-center justify-center text-xs text-ink-muted flex-shrink-0">
              <Package size={22} className="text-ink-faint mb-1"/>
              <span>No Image</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {item.brand && <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{item.brand}</p>}
            <h4 className="font-bold text-sm text-ink truncate">{item.name || item.productName || 'Product'}</h4>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
              <span>Size: <strong className="text-ink">{item.size || '-'}</strong></span>
              {item.color && <span>Color: <strong className="text-ink">{item.color}</strong></span>}
              {item.height && <span>Height: <strong className="text-ink">{item.height}</strong></span>}
              <span>Qty: <strong className="text-ink">{item.qty || item.quantity || 1}</strong></span>
              {item.sku && <span>SKU: <strong className="text-ink font-mono">{item.sku}</strong></span>}
            </div>
          </div>
        </div>

        {!returnsAllowed && !exchangesAllowed ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="font-bold text-amber-900">Returns & Exchanges Unavailable</p>
            <p className="text-xs text-amber-700 mt-1">Both returns and exchanges are currently disabled by the store.</p>
            <button onClick={onClose} className="mt-4 rounded-xl border border-line px-5 py-2 text-sm font-bold bg-white">Close</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Request Type</p>
              <div className={`grid gap-2 ${returnsAllowed && exchangesAllowed ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {returnsAllowed && (
                  <button 
                    type="button"
                    onClick={()=>setType('return')} 
                    className={`h-11 rounded-xl border-2 font-bold text-sm transition ${type==='return'?'border-primary bg-primary text-white':'border-line bg-white text-ink hover:border-ink-muted'}`}
                  >
                    Return
                  </button>
                )}
                {exchangesAllowed && (
                  <button 
                    type="button"
                    onClick={()=>setType('exchange')} 
                    className={`h-11 rounded-xl border-2 font-bold text-sm transition ${type==='exchange'?'border-primary bg-primary text-white':'border-line bg-white text-ink hover:border-ink-muted'}`}
                  >
                    Exchange
                  </button>
                )}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Reason</span>
              <select value={reasonCategory} onChange={e=>setReasonCategory(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold">
                {REASONS.map(r=> <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Additional Notes (optional, max 1000)</span>
              <textarea value={reasonNotes} onChange={e=>setReasonNotes(e.target.value)} maxLength={1000} rows={3} placeholder="Describe the issue..." className="mt-1.5 w-full rounded-xl border border-line bg-surface-alt p-3 text-sm outline-none focus:border-primary resize-none"/>
              <span className="text-xs text-ink-faint">{reasonNotes.length}/1000</span>
            </label>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Evidence Images (max 5)</p>
              {images.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {images.map((url,i)=> (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-24 w-full object-cover"/>
                      <button onClick={()=>setImages(images.filter((_,idx)=>idx!==i))} className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold hover:border-primary cursor-pointer">
                <Upload size={16}/>{uploading ? 'Uploading...' : 'Upload images'}
                <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading}/>
              </label>
              <p className="mt-1 text-xs text-ink-faint">You can upload up to 5 photos showing the condition of the item.</p>
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Google Drive Video Link (optional)</span>
              <input value={driveLink} onChange={e=>setDriveLink(e.target.value)} placeholder="https://drive.google.com/..." className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-primary"/>
            </label>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-2">📹 Opening / Unboxing Video</p>
              <p className="mt-1 text-xs text-amber-700">Please send your opening/unboxing video directly to Ghazi Attire on WhatsApp for verification.</p>
              <button onClick={handleWhatsApp} type="button" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-black text-white hover:bg-[#128C7E] transition shadow-sm">
                <MessageCircle size={16}/> Send Video on WhatsApp
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-line py-3 text-sm font-bold hover:border-primary">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl bg-primary py-3 text-sm font-black text-white hover:bg-primary-dark disabled:opacity-60 transition">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

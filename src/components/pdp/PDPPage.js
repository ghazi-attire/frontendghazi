'use client'
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, Star, Truck, RefreshCw, ShieldCheck, X, Heart, ShoppingCart, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { catalogApi } from '@/lib/api'
import { useStore } from '@/context/StoreContext'
import { useWishlist } from '@/context/WishlistContext'
import { colorSwatchClass, formatPrice } from '@/lib/utils'
import Breadcrumb from '@/components/ui/Breadcrumb'
import ProductCard from '@/components/ui/ProductCard'

const titleCase = value =>
  value
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase()) || 'Regular'

const topwear = ['t-shirts', 'blazers', 'sweaters', 'tops', 'jackets']
const bottomwear = ['jeans', 'trousers', 'skirts', 'joggers']

function getHighlightCategory(product) {
  if (topwear.includes(product.subcategory)) return 'Topwear'
  if (bottomwear.includes(product.subcategory)) return 'Bottomwear'
  if (product.category === 'dresses') return 'Dress'
  if (product.subcategory === 'co-ords') return 'Co-ord Set'
  return titleCase(product.category)
}

function getProductType(product) {
  if (product.subcategory === 't-shirts') return product.name.includes('Oversized') ? 'Oversized Tshirt' : 'Tshirt'
  return titleCase(product.subcategory)
}

function getFit(product) {
  const text = `${product.name} ${product.description}`.toLowerCase()
  if (text.includes('oversized')) return 'Oversized Fit'
  if (text.includes('slim')) return 'Slim Fit'
  if (text.includes('wide leg')) return 'Wide Leg Fit'
  if (text.includes('relaxed')) return 'Relaxed Fit'
  if (text.includes('flowy')) return 'Flowy Fit'
  return 'Regular Fit'
}

function getClosure(product) {
  const text = `${product.name} ${product.description}`.toLowerCase()
  if (text.includes('zip')) return 'Zip Closure'
  if (text.includes('button')) return 'Button Closure'
  if (text.includes('drawstring')) return 'Drawstring Closure'
  if (text.includes('tie')) return 'Tie Closure'
  return 'No Closure'
}

function getLength(product) {
  const text = `${product.name} ${product.description}`.toLowerCase()
  if (text.includes('cropped')) return 'Cropped'
  if (text.includes('midi')) return 'Midi'
  if (text.includes('maxi')) return 'Maxi'
  if (text.includes('ankle')) return 'Ankle Length'
  return 'Regular'
}

function getFabric(product) {
  return product.material?.split(' ').slice(0, 3).join(' ') || 'Regular Fabric'
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const TAG_CYCLE_MS = 3200
const getTouchDistance = (touches) => {
  const [a, b] = touches
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function highResImage(src) {
  if (!src) return ''
  if (src.includes('images.unsplash.com')) {
    return src.replace(/([?&])w=\d+/i, '$1w=1800').replace(/([?&])q=\d+/i, '$1q=90')
  }
  return src
}

function getSizesForColor(product, color) {
  if (!product || !color) return product?.sizes || []
  if (product.variants?.length) {
    // Dedupe sizes per color (ignore height for size list, but keep height-aware variants for height selector)
    const seen = new Set()
    return product.variants
      .filter(variant => variant.color === color.name && variant.hex === color.hex)
      .filter(v => {
        if (seen.has(v.size)) return false
        seen.add(v.size)
        return true
      })
      .map(variant => ({ size: variant.size, stock: Number(variant.stock || 0), mrp: Number(variant.mrp || 0), sellPrice: Number(variant.sellPrice || 0) }))
  }
  return product.sizes || []
}

function getVariantForSelection(product, color, size) {
  if (!product?.variants?.length) return null
  return product.variants.find(v => v.color === color?.name && v.hex === color?.hex && v.size === size) || null
}

function getColorImageIndex(product, color) {
  if (!product?.images?.length || !color) return 0

  const colorImages = (product.colorImages || []).filter(img => img.colorName === color.name && img.colorHex === color.hex)
  if (colorImages[0]?.imageUrl && product.images.includes(colorImages[0].imageUrl)) {
    return product.images.indexOf(colorImages[0].imageUrl)
  }

  if (Number.isInteger(color.imageIndex) && product.images[color.imageIndex]) {
    return color.imageIndex
  }

  if (color.image && product.images.includes(color.image)) {
    return product.images.indexOf(color.image)
  }

  const colorPosition = product.colors?.findIndex(c => c.hex === color.hex || c.name === color.name)
  if (colorPosition >= 0 && product.images[colorPosition]) {
    return colorPosition
  }

  return 0
}

function getProductTags(product) {
  const tags = [
    ...(Array.isArray(product.tags) ? product.tags : []),
    product.offerTag,
    product.tag,
  ]
    .filter(Boolean)
    .map((tag) => String(tag).trim())
    .filter(Boolean)

  return [...new Set(tags)]
}

function ProductGallery({ product, mainImg, setMainImg, isOOS }) {
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 })
  const [viewerOpen, setViewerOpen] = useState(false)
  const [tagIdx, setTagIdx] = useState(0)
  const swipeRef = useRef({ active: false, startX: 0, startY: 0, didSwipe: false })
  const productTags = useMemo(() => getProductTags(product), [product])

  const isFinePointer = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches

  const openViewer = () => {
    if (swipeRef.current.didSwipe) {
      swipeRef.current.didSwipe = false
      return
    }
    if (!isFinePointer()) setViewerOpen(true)
  }

  const goToImage = useCallback((index) => {
    if (product.images.length <= 1) return
    setMainImg((index + product.images.length) % product.images.length)
  }, [product.images.length, setMainImg])

  useEffect(() => {
    setTagIdx(0)
    if (productTags.length <= 1) return undefined

    const timer = setInterval(() => {
      setTagIdx((i) => (i + 1) % productTags.length)
    }, TAG_CYCLE_MS)

    return () => clearInterval(timer)
  }, [productTags.length])

  const handleMouseMove = (event) => {
    if (!isFinePointer()) return
    const rect = event.currentTarget.getBoundingClientRect()
    setZoom({
      active: true,
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    })
  }

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1 || product.images.length <= 1) return
    const touch = event.touches[0]
    swipeRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      didSwipe: false,
    }
  }

  const handleTouchMove = (event) => {
    if (!swipeRef.current.active || event.touches.length !== 1) return
    const touch = event.touches[0]
    const dx = touch.clientX - swipeRef.current.startX
    const dy = touch.clientY - swipeRef.current.startY

    if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      event.preventDefault()
    }
  }

  const handleTouchEnd = (event) => {
    if (!swipeRef.current.active) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - swipeRef.current.startX
    const dy = touch.clientY - swipeRef.current.startY
    swipeRef.current.active = false

    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      swipeRef.current.didSwipe = true
      goToImage(mainImg + (dx < 0 ? 1 : -1))
    }
  }

  return (
    <>
      <div
        className="group/gallery relative mb-3 aspect-[3/4] cursor-zoom-in overflow-hidden rounded-2xl bg-surface-alt shadow-card md:cursor-crosshair"
        onClick={openViewer}
        onMouseEnter={() => isFinePointer() && setZoom((z) => ({ ...z, active: true }))}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={product.images[mainImg]}
          alt={product.name}
          fill
          priority
          sizes="(max-width:768px)100vw,50vw"
          className="object-cover transition-transform duration-500 ease-out md:group-hover/gallery:scale-[1.015]"
        />

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-10 hidden bg-no-repeat opacity-0 transition-opacity duration-200 ease-out md:block ${zoom.active ? 'opacity-100' : ''}`}
          style={{
            backgroundImage: `url(${highResImage(product.images[mainImg])})`,
            backgroundPosition: `${zoom.x}% ${zoom.y}%`,
            backgroundSize: '230%',
          }}
        />

        {isOOS && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <span className="rounded-full bg-black px-6 py-2 text-[13px] font-black tracking-widest text-white shadow-lg">SOLD OUT</span>
          </div>
        )}
        {productTags.length > 0 && (
          <div className="absolute left-4 top-4 z-30 h-[38px] max-w-[calc(100%-2rem)] overflow-hidden pointer-events-none">
            <span
              key={productTags[tagIdx]}
              className={`${productTags.length > 1 ? 'product-card-tag-slide' : ''} inline-flex max-w-full items-center rounded-md bg-white px-3 py-2 text-[11px] font-extrabold uppercase leading-none tracking-normal text-green-700 shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/5 sm:text-xs`}
            >
              <span className="truncate">{productTags[tagIdx]}</span>
            </span>
          </div>
        )}

        {product.images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center gap-1.5 md:hidden" aria-label={`Image ${mainImg + 1} of ${product.images.length}`}>
            {product.images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${
                  i === mainImg ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {product.images.length > 1 && (
        <div className="flex gap-2.5">
          {product.images.map((img, i) => (
            <button key={i} onClick={() => setMainImg(i)} aria-label={`View ${i+1}`}
              className={`relative h-[88px] w-[72px] overflow-hidden rounded-xl border-2 bg-surface-alt transition-all ${mainImg===i?'border-primary':'border-transparent hover:border-line-dark'}`}>
              <Image src={img} alt="" fill sizes="72px" className="object-cover"/>
            </button>
          ))}
        </div>
      )}

      {viewerOpen && (
        <MobileImageViewer
          images={product.images}
          productName={product.name}
          index={mainImg}
          setIndex={setMainImg}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}

function MobileImageViewer({ images, productName, index, setIndex, onClose }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [closing, setClosing] = useState(false)
  const gesture = useRef({})
  const lastTap = useRef(0)

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    window.setTimeout(onClose, 180)
  }, [onClose])

  const goTo = useCallback((nextIndex) => {
    setIndex((nextIndex + images.length) % images.length)
    resetZoom()
  }, [images.length, resetZoom, setIndex])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') goTo(index - 1)
      if (event.key === 'ArrowRight') goTo(index + 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [close, goTo, index])

  const handleTouchStart = (event) => {
    if (event.touches.length === 2) {
      gesture.current = {
        mode: 'pinch',
        startDistance: getTouchDistance(event.touches),
        startScale: scale,
      }
      return
    }

    const touch = event.touches[0]
    gesture.current = {
      mode: scale > 1 ? 'pan' : 'swipe',
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: offset,
    }
  }

  const handleTouchMove = (event) => {
    if (event.touches.length === 2 && gesture.current.mode === 'pinch') {
      event.preventDefault()
      const nextScale = clamp((getTouchDistance(event.touches) / gesture.current.startDistance) * gesture.current.startScale, 1, 4)
      setScale(nextScale)
      if (nextScale === 1) setOffset({ x: 0, y: 0 })
      return
    }

    if (event.touches.length !== 1) return
    const touch = event.touches[0]
    const dx = touch.clientX - gesture.current.startX
    const dy = touch.clientY - gesture.current.startY

    if (gesture.current.mode === 'pan') {
      event.preventDefault()
      const limit = 130 * scale
      setOffset({
        x: clamp(gesture.current.startOffset.x + dx, -limit, limit),
        y: clamp(gesture.current.startOffset.y + dy, -limit, limit),
      })
    }
  }

  const handleTouchEnd = (event) => {
    const now = Date.now()
    const wasDoubleTap = now - lastTap.current < 280
    const dx = (event.changedTouches[0]?.clientX || 0) - (gesture.current.startX || 0)
    const dy = (event.changedTouches[0]?.clientY || 0) - (gesture.current.startY || 0)

    if (wasDoubleTap && Math.abs(dx) < 28 && Math.abs(dy) < 28) {
      if (scale > 1) resetZoom()
      else setScale(2.5)
      lastTap.current = 0
      return
    }

    lastTap.current = now
    if (gesture.current.mode === 'swipe' && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      goTo(index + (dx < 0 ? 1 : -1))
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex touch-none flex-col bg-black transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute right-4 top-4 z-20">
        <button onClick={close} aria-label="Close image viewer" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.12] text-white backdrop-blur-md transition-colors hover:bg-white/20">
          <X size={22} />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button onClick={() => goTo(index - 1)} aria-label="Previous image" className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.12] text-white backdrop-blur-md sm:flex">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => goTo(index + 1)} aria-label="Next image" className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.12] text-white backdrop-blur-md sm:flex">
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <Image
          src={images[index]}
          alt={productName}
          fill
          sizes="100vw"
          className="object-contain transition-transform duration-200 ease-out"
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }}
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`View image ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/45'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function PDPContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const id = sp?.get?.('id')
  const { addToCart } = useStore()
  const { isWishlisted, toggleWishlist, pendingIds } = useWishlist()
  const wished = isWishlisted(id)
  const wishlistPending = pendingIds?.has?.(id)
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])

  const [selColor, setSelColor] = useState({ name: 'Unknown', hex: '#000000' })
  const [selSize,  setSelSize]  = useState({ size: 'One Size', stock: 1, mrp: 0, sellPrice: 0 })
  const [selHeight, setSelHeight] = useState('')
  const [globalHeights, setGlobalHeights] = useState([])
  const [heightError, setHeightError] = useState(false)
  const heightSelectRef = useRef(null)
  const [qty,      setQty]      = useState(1)
  const [mainImg,  setMainImg]  = useState(0)
  const [tab,      setTab]      = useState('desc')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [shippingConfig, setShippingConfig] = useState({ fee: 149, freeThreshold: 999, validUntil: '' })

  const productColors = useMemo(() => {
    const seen = new Set()
    return (product?.colors || []).filter(color => {
      const key = `${color.name}::${color.hex}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [product?.colors])
  const sizesForColor = useMemo(() => getSizesForColor(product, selColor), [product, selColor])
  const selectedVariant = useMemo(() => getVariantForSelection(product, selColor, selSize?.size), [product, selColor, selSize])
  const isOOS     = !product || product.stock === 0 || product.isInStock === false
  const sizeStock = selectedVariant?.stock ?? selSize?.stock ?? 0

  useEffect(() => {
    catalogApi.home()
      .then(data => setShippingConfig(data.shipping || { fee: 149, freeThreshold: 999, validUntil: '' }))
      .catch(() => setShippingConfig({ fee: 149, freeThreshold: 999, validUntil: '' }))
    catalogApi.heights()
      .then(data => setGlobalHeights(Array.isArray(data) ? data : []))
      .catch(() => setGlobalHeights([]))
  }, [])

  useEffect(() => {
    if (!id) return
    catalogApi.product(id).then(setProduct).catch(() => setProduct(null))
  }, [id])

  useEffect(() => {
    if (!product) return
    const firstColor = product?.colors?.[0] || { name: 'Unknown', hex: '#000000' }
    setSelColor(firstColor)
    const initialSizes = getSizesForColor(product, firstColor)
    const firstSize = initialSizes.find(s => s?.stock > 0) || initialSizes[0] || { size: 'One Size', stock: 1 }
    setSelSize(firstSize)
    setQty(1)
    setMainImg(getColorImageIndex(product, firstColor))
    catalogApi.products({ category: product.category, limit: 6 }).then(data => {
      setRelated((data.items || []).filter(p => p.id !== product.id))
    }).catch(() => setRelated([]))
  }, [product])

  const handleColorSelect = (color) => {
    setSelColor(color)
    const nextSizes = getSizesForColor(product, color)
    const nextSize = nextSizes.find(s => s?.stock > 0) || nextSizes[0] || { size: 'One Size', stock: 0, mrp: product.mrp, sellPrice: product.sellPrice }
    setSelSize(nextSize)
    setQty(1)
    setMainImg(getColorImageIndex(product, color))
  }

  const handleSizeSelect = (sizeObj) => {
    setSelSize(sizeObj)
    setQty(1)
  }

  const getSelectedVariantPrices = () => {
    if (selectedVariant?.mrp && selectedVariant?.sellPrice) {
      return { mrp: Number(selectedVariant.mrp) || 0, sellPrice: Number(selectedVariant.sellPrice) || 0 }
    }
    if (selSize?.mrp && selSize?.sellPrice) {
      return { mrp: Number(selSize.mrp) || product?.mrp || 0, sellPrice: Number(selSize.sellPrice) || product?.sellPrice || 0 }
    }
    return { mrp: Number(product?.mrp) || 0, sellPrice: Number(product?.sellPrice) || 0 }
  }

  const variantPrices = getSelectedVariantPrices()
  const discount = variantPrices.mrp > 0 ? Math.round(((variantPrices.mrp - variantPrices.sellPrice) / variantPrices.mrp) * 100) : 0

  const validateHeight = () => {
    const trimmed = String(selHeight || '').trim()
    if (!trimmed) {
      setHeightError(true)
      toast.error('Please select your height')
      if (heightSelectRef.current) {
        heightSelectRef.current.focus()
      }
      return false
    }
    setHeightError(false)
    return true
  }

  const handleCart = () => {
    if (isOOS || sizeStock === 0) return
    if (!validateHeight()) return
    addToCart({ ...product, sellPrice: variantPrices.sellPrice, mrp: variantPrices.mrp }, selSize.size, selColor, qty, selHeight, null)
  }
  const handleBuyNow = () => {
    if (isOOS || sizeStock === 0) return
    if (!validateHeight()) return
    addToCart({ ...product, sellPrice: variantPrices.sellPrice, mrp: variantPrices.mrp }, selSize.size, selColor, qty, selHeight, null)
    router.push('/checkout')
  }

  if (!product) return <div className="py-20 text-center text-ink-muted">Loading product...</div>
  const ph = product.highlights || {}
  const highlights = [
    ['Product Category', ph.category || getHighlightCategory(product)],
    ['Product Type', ph.type || getProductType(product)],
    ['Fit', ph.fit || getFit(product)],
    ['Closure', ph.closure || getClosure(product)],
    ['Length', ph.length || getLength(product)],
    ['Fabric', ph.fabric || getFabric(product)],
  ]

  const crumbs = [
    { label: 'Home', href: '/' },
    { label: product.category.charAt(0).toUpperCase() + product.category.slice(1), href: `/plp?category=${product.category}` },
    { label: product.name },
  ]

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 pb-16">
      <Breadcrumb crumbs={crumbs} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14">
        {/* ── GALLERY ── */}
        <div className="md:sticky md:top-20 self-start">
          <ProductGallery product={product} mainImg={mainImg} setMainImg={setMainImg} isOOS={isOOS} />
        </div>

        {/* ── INFO ── */}
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-ink-faint font-medium mb-1">{product.brand}</p>
          <h1 className="font-display text-[clamp(24px,3.5vw,38px)] font-bold leading-tight text-ink mb-3">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex text-primary">
              {[1,2,3,4,5].map(n => <Star key={n} size={14} fill={n<=Math.round(product.rating)?'currentColor':'none'} strokeWidth={1.5}/>)}
            </div>
            <span className="text-[13px] text-ink-muted font-medium">{product.rating} · {product.reviews} reviews</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-[30px] font-bold text-ink">{formatPrice(variantPrices.sellPrice)}</span>
            <span className="text-[16px] text-ink-faint line-through">{formatPrice(variantPrices.mrp)}</span>
            <span className="text-[13px] font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-lg">{discount}% OFF</span>
          </div>
          <p className="text-[12px] text-ink-faint mb-6">Inclusive of all taxes</p>

          {/* Color */}
          <div className="mb-5">
            <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-ink-mid mb-2.5">
              Colour — <span className="text-ink font-semibold">{selColor.name}</span>
            </p>
            <div className="flex gap-2.5">
              {productColors.map(c => (
                <button key={`${c.name}-${c.hex}`} title={c.name} onClick={() => handleColorSelect(c)} aria-label={`Select ${c.name}`}
                  style={{ background: c.hex }}
                  className={`h-9 w-9 ${colorSwatchClass(c.hex, selColor.hex === c.hex && selColor.name === c.name)}`}/>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-ink-mid">
                Size — <span className="text-ink font-semibold">{selSize?.size}</span>
              </p>
              <button 
                type="button"
                onClick={() => product.sizeGuideImage && setSizeGuideOpen(true)} 
                className="text-[12px] text-primary font-semibold hover:underline disabled:text-ink-faint disabled:no-underline cursor-pointer disabled:cursor-not-allowed" 
                disabled={!product.sizeGuideImage}
                title={product.sizeGuideImage ? "View size guide" : "Size guide not available for this item"}
              >
                Size Guide
              </button>
            </div>
            {sizeGuideOpen && product.sizeGuideImage && (
              <div 
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs" 
                onClick={() => setSizeGuideOpen(false)}
              >
                <div 
                  className="relative max-w-2xl w-full bg-white rounded-2xl p-5 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150" 
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
                    <h3 className="font-display text-lg font-bold text-ink truncate pr-3">Size Guide — {product.name}</h3>
                    <button 
                      type="button"
                      onClick={() => setSizeGuideOpen(false)} 
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-line text-ink-muted hover:text-ink hover:border-primary transition-colors flex-shrink-0"
                      aria-label="Close size guide"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {/\.pdf($|\?)/i.test(product.sizeGuideImage) ? (
                    <div className="w-full">
                      <iframe src={product.sizeGuideImage} className="w-full h-[65vh] rounded-xl border border-line" title="Size Guide PDF" />
                      <div className="mt-3 text-center">
                        <a href={product.sizeGuideImage} target="_blank" rel="noreferrer" className="text-xs text-primary font-bold underline hover:text-primary-dark">
                          Open PDF in full screen
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-surface-alt/40 rounded-xl p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={product.sizeGuideImage} 
                        alt="Size guide" 
                        className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-xs" 
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {sizesForColor.map(s => (
                <button key={s.size} onClick={() => s.stock>0 && handleSizeSelect(s)} disabled={s.stock===0}
                  className={`min-w-[46px] h-11 px-3 rounded-xl text-[13px] font-semibold border-2 transition-all flex items-center justify-center ${
                    s.stock===0 ? 'border-line text-ink-faint line-through cursor-not-allowed bg-surface-alt'
                    : selSize?.size===s.size ? 'border-primary bg-primary text-white shadow-md'
                    : 'border-line text-ink-mid hover:border-primary hover:text-primary'
                  }`}>
                  <span>{s.size}</span>
                </button>
              ))}
            </div>
            {/* Height — Mandatory selection from global heights */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="height-select" className="text-[12px] uppercase tracking-[0.12em] font-semibold text-ink-mid">
                  Height <span className="text-red-500 font-bold">*</span>
                </label>
                {selHeight ? (
                  <span className="text-[12px] font-bold text-primary">{selHeight}</span>
                ) : (
                  <span className="text-[11px] font-medium text-ink-muted">Required</span>
                )}
              </div>
              <div className="relative">
                <select
                  id="height-select"
                  ref={heightSelectRef}
                  value={selHeight || ''}
                  onChange={(e) => {
                    setSelHeight(e.target.value || '')
                    if (e.target.value) setHeightError(false)
                  }}
                  className={`w-full h-11 px-3.5 pr-10 rounded-xl border-2 bg-surface-alt text-[13px] font-semibold text-ink outline-none transition-all appearance-none cursor-pointer ${
                    heightError ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' : 'border-line hover:border-primary/50 focus:border-primary'
                  }`}
                >
                  <option value="">Select Height</option>
                  {globalHeights.map(h => (
                    <option key={h.id || h.height} value={h.height}>{h.height}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted">
                  <ChevronDown size={16} />
                </div>
              </div>
              {heightError && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">Please select your height</p>
              )}
            </div>
          </div>

          {/* Qty */}
          <div className="mb-6">
            <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-ink-mid mb-2.5">Quantity</p>
            <div className="inline-flex items-center border-2 border-line rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q-1))} className="w-11 h-11 text-ink-mid hover:text-primary hover:bg-surface-alt transition-all text-xl font-light">−</button>
              <span className="w-12 h-11 flex items-center justify-center text-[15px] font-bold border-x-2 border-line">{qty}</span>
              <button onClick={() => setQty(q => Math.min(sizeStock||99, q+1))} className="w-11 h-11 text-ink-mid hover:text-primary hover:bg-surface-alt transition-all text-xl font-light">+</button>
            </div>
          </div>

          {/* CTAs - text buttons + wishlist heart */}
          {product.isInStock === false && <p className="text-center text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg py-2 mb-3">This product is currently sold out</p>}
          <div className="flex gap-2 mb-6">
            <button onClick={handleCart} disabled={isOOS || sizeStock===0}
              className="flex-1 h-11 flex items-center justify-center rounded-xl border-2 border-primary px-3 text-[13px] font-bold text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Add to Cart
            </button>
            <button onClick={handleBuyNow} disabled={isOOS || sizeStock===0}
              className="flex-1 h-11 flex items-center justify-center rounded-xl bg-primary px-3 text-[13px] font-bold text-white hover:bg-primary-dark transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Buy Now
            </button>
            <button
              onClick={() => toggleWishlist(product)}
              disabled={wishlistPending}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} title={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`h-11 w-11 flex shrink-0 items-center justify-center rounded-xl border-2 transition-all disabled:opacity-60 ${wished ? 'border-red-200 bg-red-50 text-red-500' : 'border-line bg-white text-ink-muted hover:border-red-200 hover:text-red-500'}`}
            >
              <Heart size={18} fill={wished ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 py-5 border-t border-b border-line text-[12px] text-ink-muted mb-6">
            <span className="flex items-center gap-1.5"><Truck size={15} className="text-primary"/> Free delivery above ₹{shippingConfig.freeThreshold ?? 999}</span>
            <span className="flex items-center gap-1.5"><RefreshCw size={15} className="text-primary"/> 30-day returns</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-primary"/> Authentic product</span>
          </div>

          {/* Key Highlights */}
          <div className="bg-surface-alt border border-line rounded-xl p-5 md:p-6 mb-6">
            <h2 className="text-[15px] font-bold uppercase tracking-wide text-ink mb-6">Key Highlights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {highlights.map(([label, value]) => (
                <div key={label} className="border-b border-line pb-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
                  <p className="text-[14px] text-ink-muted mb-1">{label}</p>
                  <p className="text-[15px] font-semibold text-ink leading-snug">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="border border-line rounded-xl overflow-hidden">
            <div className="flex border-b border-line">
              {[['desc','Description'],['care','Care'],['shipping','Shipping']].map(([id,label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex-1 py-3 text-[12px] font-semibold transition-all ${tab===id?'bg-primary text-white':'text-ink-mid hover:text-primary hover:bg-surface-alt'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="p-5 text-[14px] text-ink-mid leading-relaxed">
              {tab==='desc'     && <p>{product.description}<br/><br/><strong className="text-ink">Material:</strong> {product.material}</p>}
              {tab==='care'     && <p>{product.care}</p>}
              {tab==='shipping' && (
                <div className="space-y-2">
                  {shippingConfig?.infoText ? (
                    <div className="whitespace-pre-line text-[14px] text-ink-mid leading-relaxed">
                      {shippingConfig.infoText}
                    </div>
                  ) : (
                    <>
                      <p>Standard: 3–5 business days (Free above ₹{shippingConfig.freeThreshold ?? 999})</p>
                      <p>Express: 1–2 business days (₹{shippingConfig.fee ?? 149})</p>
                      <p>Easy 30-day returns from delivery date</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-[32px] font-bold tracking-wide mb-7">YOU MAY ALSO LIKE</h2>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
            {related.map(p => (
              <div key={p.id} className="flex-none w-[220px]"><ProductCard product={p}/></div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function PDPPage() {
  return <Suspense fallback={<div className="py-20 text-center text-ink-muted">Loading product…</div>}><PDPContent/></Suspense>
}

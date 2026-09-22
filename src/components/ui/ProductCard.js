'use client'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import SafeImage from '@/components/ui/SafeImage'
import Link from 'next/link'
import { Star, Heart, ShoppingCart, Zap } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { useWishlist } from '@/context/WishlistContext'
import { formatPrice } from '@/lib/utils'

const HOVER_DELAY_MS = 550
const CYCLE_MS = 1300
const TAG_CYCLE_MS = 3200

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

export default function ProductCard({ product, hideCartActions = true }) {
  const { addToCart, cart } = useStore()
  const { isWishlisted, toggleWishlist, pendingIds } = useWishlist()
  const wished = isWishlisted(product.id)
  const pending = pendingIds?.has?.(product.id)
  const isOOS = product.stock === 0 || product.isInStock === false
  const defaultColor = product.colors?.[0] || { name: 'Default', hex: '#111111' }
  const defaultSize = product.sizes?.find((s) => s.stock > 0)?.size || product.sizes?.[0]?.size || 'Free Size'
  const variantStockForDefault = (() => {
    if (product.variants?.length) {
      const v = product.variants.find(x => x.size === defaultSize && x.color === defaultColor.name && x.hex === defaultColor.hex)
      if (v) return Number(v.stock ?? 0)
    }
    const sz = product.sizes?.find(s => s.size === defaultSize)
    return sz ? Number(sz.stock ?? 0) : Number(product.stock ?? 0)
  })()
  const cartQtyForDefault = (() => {
    const found = cart.find(c => c.product.id === product.id && String(c.size).trim().toLowerCase() === String(defaultSize).trim().toLowerCase() && String(c.color?.hex || c.color?.name || c.color).trim().toLowerCase() === String(defaultColor.hex || defaultColor.name).trim().toLowerCase())
    return found ? Number(found.qty || 0) : 0
  })()
  const isAtMax = variantStockForDefault > 0 && cartQtyForDefault >= variantStockForDefault
  const hideCart = hideCartActions || isOOS || isAtMax
  const images = product.images?.length ? product.images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80']
  const variantPrices = (product.variants || []).map(v => Number(v.sellPrice || 0)).filter(Boolean)
  const hasMultipleVariantPrices = variantPrices.length > 1
  const minVariantPrice = variantPrices.length ? Math.min(...variantPrices) : null
  const displayPrice = hasMultipleVariantPrices && minVariantPrice != null ? minVariantPrice : Number(product.sellPrice || 0)

  const [imgIdx, setImgIdx] = useState(0)
  const [tagIdx, setTagIdx] = useState(0)
  const hoverStartRef = useRef(null)
  const cycleRef = useRef(null)
  const nImg = images.length
  const multi = nImg > 1
  const productTags = useMemo(() => getProductTags(product), [product])

  const clearTimers = useCallback(() => {
    if (hoverStartRef.current) {
      clearTimeout(hoverStartRef.current)
      hoverStartRef.current = null
    }
    if (cycleRef.current) {
      clearInterval(cycleRef.current)
      cycleRef.current = null
    }
  }, [])

  const onImgEnter = useCallback(() => {
    if (!multi || isOOS) return
    clearTimers()
    hoverStartRef.current = setTimeout(() => {
      hoverStartRef.current = null
      cycleRef.current = setInterval(() => {
        setImgIdx((i) => (i + 1) % nImg)
      }, CYCLE_MS)
    }, HOVER_DELAY_MS)
  }, [clearTimers, multi, isOOS, nImg])

  const onImgLeave = useCallback(() => {
    clearTimers()
    setImgIdx(0)
  }, [clearTimers])

  useEffect(() => () => clearTimers(), [clearTimers])

  useEffect(() => {
    setTagIdx(0)
    if (productTags.length <= 1) return undefined

    const timer = setInterval(() => {
      setTagIdx((i) => (i + 1) % productTags.length)
    }, TAG_CYCLE_MS)

    return () => clearInterval(timer)
  }, [productTags.length])

  const onCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart({ ...product, sellPrice: displayPrice }, defaultSize, defaultColor)
  }
  const onBuyNow = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart({ ...product, sellPrice: displayPrice }, defaultSize, defaultColor)
    // Navigate to checkout after adding — use window location to preserve existing flow
    window.location.href = '/checkout'
  }
  const onWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }
  return (
    <Link
      href={`/pdp?id=${product.id}`}
      className="product-card group flex h-full flex-col bg-white rounded-xl overflow-hidden border border-line hover:shadow-hover transition-all duration-300"
    >
      <div
        className="relative aspect-[3/4] bg-surface-alt overflow-hidden"
        onMouseEnter={onImgEnter}
        onMouseLeave={onImgLeave}
      >
        {images.map((src, i) => (
          <SafeImage
            key={src}
            src={src}
            alt={i === 0 ? product.name : ''}
            fill
            sizes="(max-width:640px)50vw,(max-width:1024px)33vw,25vw"
            className={`object-cover transition-[opacity,transform] duration-500 ease-out ${
              i === imgIdx ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
            } ${!isOOS && i === imgIdx ? 'group-hover:scale-[1.03]' : ''}`}
          />
        ))}

        {multi && !isOOS && (
          <div className="absolute bottom-2 left-1/2 z-[5] flex -translate-x-1/2 gap-1 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-0.5 rounded-full transition-all duration-300 ${
                  i === imgIdx ? 'w-3 bg-white shadow-sm' : 'w-1 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {productTags.length > 0 && (
          <div className="absolute left-2 top-2 z-10 h-[34px] max-w-[calc(100%-1rem)] overflow-hidden pointer-events-none sm:left-3 sm:top-3 sm:h-[38px] sm:max-w-[calc(100%-1.5rem)]">
            <span
              key={productTags[tagIdx]}
              className={`${productTags.length > 1 ? 'product-card-tag-slide' : ''} inline-flex max-w-full items-center rounded-md bg-white px-2.5 py-1.5 text-[9px] font-extrabold uppercase leading-none tracking-normal text-green-700 shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/5 sm:px-3 sm:py-2 sm:text-xs`}
            >
              <span className="truncate">{productTags[tagIdx]}</span>
            </span>
          </div>
        )}

        <button
          onClick={onWishlist}
          disabled={pending}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition-all hover:scale-105 disabled:opacity-60 sm:right-3 sm:top-3 ${wished ? 'text-red-500' : 'text-ink-muted hover:text-red-500'}`}
        >
          <Heart size={16} fill={wished ? 'currentColor' : 'none'} strokeWidth={wished ? 0 : 1.6} className={wished ? 'text-red-500' : ''} />
        </button>

        {(product.reviews !== undefined || product.colors?.length > 0) && (
          <div className="absolute bottom-3 left-2 right-2 z-10 flex items-center justify-between gap-1.5 sm:left-3 sm:right-3">
            {product.reviews !== undefined && (
              <div className="flex min-w-0 items-center gap-1 rounded-full bg-white/[0.92] px-2 py-1 shadow-sm backdrop-blur-sm sm:gap-1.5 sm:px-2.5">
                <Star size={13} fill={product.rating ? 'currentColor' : 'none'} strokeWidth={1.5} className="shrink-0 text-primary sm:size-3.5" />
                <span className="text-[11px] font-semibold leading-none text-ink sm:text-xs">{product.rating ? (Math.round(product.rating * 10) / 10).toFixed(1) : '0.0'}</span>
                <span className="hidden text-[11px] leading-none text-ink-faint min-[390px]:inline sm:text-xs">|</span>
                <span className="hidden truncate text-[11px] leading-none text-ink-faint min-[390px]:inline sm:text-xs">{product.reviews}</span>
              </div>
            )}

            {product.colors?.length > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.92] px-1.5 py-1 shadow-sm backdrop-blur-sm sm:gap-1.5 sm:px-2">
                <div className="flex -space-x-1.5">
                  {product.colors.slice(0, 3).map((c) => (
                    <span
                      key={`${c.name}-${c.hex}`}
                      title={c.name}
                      style={{ background: c.hex }}
                      className="h-3.5 w-3.5 rounded-full border border-ink/20 shadow-sm ring-1 ring-black/15 sm:h-4 sm:w-4"
                    />
                  ))}
                </div>
                {product.colors.length > 3 && (
                  <span className="text-[10px] font-semibold leading-none text-ink-muted sm:text-[11px]">+{product.colors.length - 3}</span>
                )}
              </div>
            )}
          </div>
        )}

        {isOOS && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="bg-black text-white text-sm font-black px-5 py-2 rounded-full shadow-lg tracking-widest">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint sm:text-xs sm:tracking-[0.16em]">{product.brand}</p>
        <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap sm:gap-2">
          {hasMultipleVariantPrices && <span className="shrink-0 text-[clamp(10px,2.5vw,12px)] font-bold leading-tight text-ink-muted/70">From</span>}
          <span className="shrink-0 text-[clamp(13px,3.7vw,17px)] font-black leading-tight text-ink sm:text-lg">{formatPrice(displayPrice)}</span>
          <span className="shrink-0 text-[clamp(9px,2.7vw,12px)] leading-tight text-ink-faint line-through sm:text-sm">{formatPrice(product.mrp)}</span>
          <span className="shrink-0 text-[clamp(9px,2.5vw,11px)] font-bold uppercase leading-tight text-green-600 sm:text-xs">{product.off}% off</span>
        </div>
        <h3 className="mt-2 truncate text-[13px] sm:text-[14px] font-bold leading-5 text-ink sm:leading-6">{product.name}</h3>
      </div>

      {!hideCart ? (
        <div className="mt-auto flex gap-2 p-2 border-t border-line bg-white">
          <button
            onClick={onCart}
            aria-label="Add to cart"
            title="Add to Cart"
            className="flex-1 h-8 flex items-center justify-center rounded-lg border border-line bg-white px-2 text-[12px] font-bold text-ink hover:bg-primary hover:text-white hover:border-primary transition-colors"
          >
            Add to Cart
          </button>
          <button
            onClick={onBuyNow}
            aria-label="Buy now"
            title="Buy Now"
            className="flex-1 h-8 flex items-center justify-center rounded-lg bg-primary px-2 text-[12px] font-bold text-white hover:bg-primary-dark transition-colors shadow-sm"
          >
            Buy Now
          </button>
        </div>
      ) : null}
    </Link>
  )
}

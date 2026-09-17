'use client'
import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { useWishlist } from '@/context/WishlistContext'
import ProductCard from '@/components/ui/ProductCard'

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {[1,2,3,4,5,6].map(i => <div key={i} className="h-[380px] animate-pulse rounded-xl bg-surface-alt" />)}
    </div>
  )
}

export default function WishlistPage() {
  const { wishlist, loading, wishlistCount } = useWishlist()

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-10">
        <h1 className="font-display text-4xl font-bold tracking-wide mb-2">MY WISHLIST</h1>
        <p className="text-sm text-ink-muted mb-8">{wishlistCount} saved items</p>
        <WishlistSkeleton />
      </div>
    )
  }

  if (!wishlist.length) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-10">
        <h1 className="font-display text-4xl font-bold tracking-wide mb-2">MY WISHLIST</h1>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Heart size={32} className="text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Your Wishlist is Empty</h2>
          <p className="text-sm text-ink-muted mb-6 max-w-md">Save your favorite styles here and come back to them anytime.</p>
          <Link href="/plp" className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
            <ShoppingBag size={16}/> Shop Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-6 py-10">
      <h1 className="font-display text-4xl font-bold tracking-wide mb-2">MY WISHLIST</h1>
      <p className="text-sm text-ink-muted mb-8">{wishlistCount} saved {wishlistCount===1?'item':'items'}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {wishlist.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const router = useRouter()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingIds, setPendingIds] = useState(new Set())

  const fetchWishlist = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/wishlist')
      // api returns data directly (array of products)
      const items = Array.isArray(data) ? data : data.items || []
      setWishlist(items)
    } catch (e) {
      // 401 = not logged in, keep empty
      if (!String(e.message).toLowerCase().includes('unauthorized') && !String(e.message).toLowerCase().includes('auth')) {
        // silent for guest
      }
      setWishlist([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWishlist()
    const handler = () => fetchWishlist()
    window.addEventListener('staffarc-auth', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('staffarc-auth', handler)
      window.removeEventListener('storage', handler)
    }
  }, [fetchWishlist])

  const isWishlisted = useCallback((productId) => {
    if (!productId) return false
    return wishlist.some(p => p.id === productId || p.productId === productId)
  }, [wishlist])

  const toggleWishlist = useCallback(async (product) => {
    const productId = product?.id || product?.productId
    if (!productId) {
      toast.error('Invalid product')
      return false
    }
    if (pendingIds.has(productId)) return false

    // Check auth via quick probe? Use optimistic then handle 401
    const currently = isWishlisted(productId)

    // Optimistic update
    setPendingIds(prev => new Set(prev).add(productId))
    if (currently) {
      setWishlist(prev => prev.filter(p => (p.id !== productId && p.productId !== productId)))
    } else {
      // Optimistic add — push minimal product; will be replaced by fetch or keep optimistic
      setWishlist(prev => [...prev, { ...product, id: productId }])
    }

    try {
      if (currently) {
        await api(`/api/wishlist/${productId}`, { method: 'DELETE' })
        toast.success('Removed from wishlist')
      } else {
        try {
          await api('/api/wishlist', { method: 'POST', body: JSON.stringify({ productId }) })
          toast.success('Added to wishlist')
        } catch (err) {
          // Duplicate handling: if 409, treat as success
          if (String(err.message).toLowerCase().includes('already in wishlist') || String(err.message).includes('409')) {
            toast.success('Already in wishlist')
          } else throw err
        }
      }
      // Re-sync from server to ensure correct product shape (images/prices)
      await fetchWishlist()
      return !currently
    } catch (err) {
      // Rollback optimistic
      if (currently) {
        setWishlist(prev => [...prev, { ...product, id: productId }])
      } else {
        setWishlist(prev => prev.filter(p => (p.id !== productId && p.productId !== productId)))
      }
      const msg = err.message || 'Wishlist update failed'
      if (String(msg).toLowerCase().includes('unauthorized') || String(msg).toLowerCase().includes('auth') || err.status === 401) {
        toast.error('Please sign in to use wishlist')
        router.push('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search))
      } else {
        toast.error(msg)
      }
      return currently
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }, [isWishlisted, pendingIds, fetchWishlist, router])

  const wishlistCount = wishlist.length

  return (
    <WishlistContext.Provider value={{ wishlist, loading, wishlistCount, isWishlisted, toggleWishlist, fetchWishlist, pendingIds }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const c = useContext(WishlistContext)
  if (!c) throw new Error('no WishlistProvider')
  return c
}

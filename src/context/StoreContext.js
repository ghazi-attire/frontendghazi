'use client'
import { createContext, useContext, useReducer, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const StoreContext = createContext(null)

function colorKey(color) {
  if (!color) return 'default'
  if (typeof color === 'string') return color.trim().toLowerCase() || 'default'
  return String(color.hex || color.name || 'default').trim().toLowerCase()
}

function cartKey(product, size, color, height) {
  return `${product?.id || product}|${String(size || 'Free Size').trim().toLowerCase()}|${colorKey(color)}|${String(height || '').trim().toLowerCase()}`
}

function normalizeCart(cart = []) {
  return Object.values(cart.reduce((acc, item) => {
    if (!item?.product?.id) return acc
    const height = item.height || item.Height || ''
    const key = cartKey(item.product, item.size, item.color, height)
    const qty = Math.max(1, Number(item.qty) || Number(item.quantity) || 1)
    const stock = item.product.stock ?? 99
    const normalized = { ...item, height: height || null, sku: item.sku || null, key }
    acc[key] = acc[key]
      ? { ...acc[key], qty: Math.min((acc[key].qty || 1) + qty, stock) }
      : { ...normalized, qty: Math.min(qty, stock) }
    return acc
  }, {}))
}

function reducer(state, action) {
  switch(action.type) {
    case 'ADD': {
      const { product, size, color, height, sku, qty=1 } = action.payload
      const key = cartKey(product, size, color, height)
      const ex = state.cart.find(i => i.key === key)
      const availableStock = product.stock ?? 99
      const cart = ex
        ? state.cart.map(i => i.key===key ? {...i, qty: Math.min(i.qty+qty, availableStock)} : i)
        : [...state.cart, {key,product,size,color,height: height || null, sku: sku || null, qty}]
      return { ...state, cart: normalizeCart(cart) }
    }
    case 'REMOVE': return { ...state, cart: normalizeCart(state.cart.filter(i => i.key !== action.payload)) }
    case 'QTY':   return { ...state, cart: normalizeCart(state.cart.map(i => i.key===action.payload.key ? {...i,qty:Math.max(1,Math.min(action.payload.qty,i.product.stock ?? 99))} : i)) }
    case 'CLEAR': return { ...state, cart: [] }
    case 'LOAD':  return { ...state, ...action.payload, cart: normalizeCart(action.payload.cart || []) }
    default: return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { cart:[] })
  const [hydrated, setHydrated] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem('sv2')
      if (s) {
        const saved = JSON.parse(s)
        dispatch({ type:'LOAD', payload:{ cart: saved.cart || [] } })
        setAppliedPromo(saved.appliedPromo || null)
      }
    } catch(_){
    } finally {
      setHydrated(true)
    }
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem('sv2', JSON.stringify({ cart:normalizeCart(state.cart), appliedPromo })) } catch(_){}
  }, [state.cart, appliedPromo, hydrated])

  const addToCart = (product, size, color, qty=1, height=null, sku=null) => {
    if (product.isInStock === false) { toast.error('This product is currently sold out'); return }
    if (product.stock === 0) { toast.error('This product is currently sold out'); return }
    if (typeof height === 'object' && height !== null && sku === null) sku = null
    // Check variant stock limit
    const targetSize = String(size || '').trim()
    const targetHeight = String(height || '').trim()
    const targetColor = color
    // Find variant stock
    let variantStock = null
    if (product.variants?.length) {
      const v = product.variants.find(x => x.size === targetSize && String(x.height||'').trim() === targetHeight && String(x.color||'').trim().toLowerCase() === String(targetColor?.name || targetColor).trim().toLowerCase() && String(x.hex||'').toLowerCase() === String(targetColor?.hex||'').toLowerCase())
      if (v) variantStock = Number(v.stock ?? v.sellPrice ? v.stock : null)
      else {
        const vs = product.variants.filter(x => x.size === targetSize)
        if (vs.length) variantStock = Math.max(...vs.map(x=>Number(x.stock||0)))
      }
    } else if (product.sizes?.length) {
      const s = product.sizes.find(x => x.size === targetSize)
      if (s) variantStock = Number(s.stock ?? 0)
    }
    if (variantStock !== null && variantStock >= 0) {
      const key = cartKey(product, size, color, height)
      const currentCart = normalizeCart(state.cart)
      const existing = currentCart.find(c => c.key === key)
      const currentQty = existing ? Number(existing.qty||0) : 0
      if (currentQty >= variantStock) {
        toast.error(`Only ${variantStock} in stock — no items to add in the cart`)
        return
      }
      if (currentQty + Number(qty||1) > variantStock) {
        const canAdd = variantStock - currentQty
        if (canAdd <= 0) { toast.error(`Only ${variantStock} in stock — no items to add in the cart`); return }
        dispatch({type:'ADD',payload:{product,size,color,height: height || null, sku: sku || null, qty: canAdd}})
        toast.success(`Only ${variantStock} in stock — added ${canAdd} to cart`)
        return
      }
    }
    dispatch({type:'ADD',payload:{product,size,color,height: height || null, sku: sku || null, qty}})
    toast.success('Added to cart!')
  }
  const removeFromCart = key => { dispatch({type:'REMOVE',payload:key}); toast.success('Removed') }
  const updateQty = (key,qty) => dispatch({type:'QTY',payload:{key,qty}})
  const clearCart = () => {
    dispatch({type:'CLEAR'})
    setAppliedPromo(null)
  }

  const cart = normalizeCart(state.cart)
  const cartTotal = cart.reduce((s,i)=>s+Number(i.product.sellPrice || 0)*i.qty,0)
  const cartCount = cart.reduce((s,i)=>s+i.qty,0)

  return (
    <StoreContext.Provider value={{
      ...state,
      cart,
      hydrated,
      cartTotal,
      cartCount,
      appliedPromo,
      setAppliedPromo,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart
    }}>
      {children}
    </StoreContext.Provider>
  )
}
export const useStore = () => { const c=useContext(StoreContext); if(!c) throw new Error('no StoreProvider'); return c }

'use client'
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3, Box, CheckCircle2, CheckSquare, ChevronRight, Download, Eye, ImageIcon, LayoutDashboard, LogOut,
  Megaphone, PackageSearch, Palette, Plus, RefreshCw, Save, Search, ShoppingBag, Table2, Trash2, Truck, Upload,
  UserCog, Users, X, TicketPercent, Star, Instagram, Facebook, Youtube, Twitter, Linkedin, MessageCircle,
  MapPin, Edit
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, authApi } from '@/lib/api'
import { downloadBlob } from '@/lib/csv'
import { downloadInvoice } from '@/lib/invoice'
import { applyTheme, buildThemeFromPrimary, DEFAULT_THEME, normalizeTheme, THEME_PRESETS } from '@/lib/theme'
import { computeDiscountPercent, formatPrice } from '@/lib/utils'
import { DEFAULT_ABOUT, DEFAULT_CONTACT } from '@/lib/pageContent'
import ProductCatalogTable from '@/components/admin/ProductCatalogTable'

const patchAbout = (settings, patch) => ({ ...settings, content: { ...settings.content, about: { ...(settings.content?.about || {}), ...patch } } })
const patchContact = (settings, patch) => ({ ...settings, content: { ...settings.content, contact: { ...(settings.content?.contact || {}), ...patch } } })

// Keep empty rows while they are being edited, but remove rows the user deleted.
const updateIndexedAboutList = (about, items, maxItems, fields) => {
  const nextAbout = { ...(about || {}) }
  const normalizedItems = Array.isArray(items) ? items.slice(0, maxItems) : []

  for (let index = 1; index <= maxItems; index += 1) {
    const item = normalizedItems[index - 1]
    for (const field of fields) {
      const key = field.key(index)
      if (item === undefined) delete nextAbout[key]
      else nextAbout[key] = field.value(item) ?? ''
    }
  }

  return nextAbout
}

const money = (value) => formatPrice(Number(value || 0))
const emptyColorVariant = { name: 'Black', hex: '#111111', images: [''], sizes: [{ size: 'M', height: '', stock: 10, mrp: 0, sellPrice: 0 }] }
const emptyProduct = {
  name: '', slug: '', sku: '', category: '', brand: 'Ghazi Attire', subcategory: '',
  sellPrice: 0, mrp: 0, off: 0, tag: '', offerTag: '', stock: 10,
  rating: 0, reviews: 0,
  material: '', care: '', description: '', isFeatured: false, status: 'active', isActive: true, isInStock: true, sizeGuideImage: '',
  highlights: {},
  colorVariants: [emptyColorVariant]
}
const emptyHeight = { height: '', sortOrder: 0, status: 'active', isActive: true }
const emptyHero = { title: '', kicker: '', subtitle: '', ctaLabel: 'Shop Now', ctaLink: '/plp', imageUrl: '', videoUrl: '', sortOrder: 0, status: 'active', isActive: true }
const emptyCategory = { name: '', slug: '', imageUrl: '', sortOrder: 0, status: 'active', isActive: true, subcategories: [{ name: '', slug: '', sortOrder: 0 }] }
const emptyCatalogColor = { name: '', hex: '#111111', sortOrder: 0, status: 'active', isActive: true }
const emptyCatalogSize = { size: '', sortOrder: 0, status: 'active', isActive: true }
const emptyCoupon = { code: '', type: 'percentage', value: 10, minCart: 0, description: '', startsAt: '', endsAt: '', status: 'active', isActive: true }
const ORDER_STATUS_OPTIONS = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled']
const PAYMENT_STATUS_OPTIONS = ['pending', 'paid', 'failed', 'refunded']
const DATE_PRESETS = [
  ['', 'All time'],
  ['2', 'Last 2 days'],
  ['4', 'Last 4 days'],
  ['7', 'Last 7 days'],
  ['14', 'Last 2 weeks'],
  ['30', 'Last month'],
]

const NAV = [
  ['products', 'Products', Box],
  ['orders', 'Orders', ShoppingBag],
  ['returns', 'Returns and exchanges', RefreshCw],
  ['storefront', 'Store Design', ImageIcon],
  ['content', 'Page Content', Megaphone],
  ['settings', 'Store Settings', UserCog],
  ['users', 'Users', Users],
  ['coupons', 'Coupons', TicketPercent],
]
const SOCIAL_FIELDS = [['instagram', 'Instagram', Instagram], ['facebook', 'Facebook', Facebook], ['youtube', 'YouTube', Youtube], ['twitter', 'Twitter / X', Twitter], ['linkedin', 'LinkedIn', Linkedin], ['whatsapp', 'WhatsApp', MessageCircle]]

function toProductForm(product) {
  const colorVariants = product.colorVariants?.length
    ? product.colorVariants.map(color => ({
      name: color.name || '',
      hex: color.hex || '#111111',
      images: (color.images || []).map(item => item.url || item).filter(Boolean).length
        ? (color.images || []).map(item => item.url || item).filter(Boolean)
        : [''],
      sizes: color.sizes?.length ? color.sizes.map(size => ({ size: size.size || '', height: size.height || '', stock: Number(size.stock || 0), mrp: size.mrp !== undefined && size.mrp !== null ? Number(size.mrp) : undefined, sellPrice: size.sellPrice !== undefined && size.sellPrice !== null ? Number(size.sellPrice) : undefined })) : [{ size: 'M', height: '', stock: 0, mrp: undefined, sellPrice: undefined }]
    }))
    : buildLegacyColorVariants(product)
  const totalStock = colorVariants.reduce((sum, color) => sum + color.sizes.reduce((inner, size) => inner + Number(size.stock || 0), 0), 0)
  const hasStockInVariants = colorVariants.some(c => c.sizes?.some(s => Number(s.stock||0) > 0))
  let isInStockValue = product.isInStock !== false && product.is_in_stock !== false
  if (colorVariants.length > 0 && !hasStockInVariants) isInStockValue = false
  return {
    ...emptyProduct,
    ...product,
    sku: product.sku || '',
    sizeGuideImage: product.sizeGuideImage || product.size_guide_image || '',
    sellPrice: Number(product.sellPrice || 0),
    mrp: Number(product.mrp || 0),
    off: Number(product.off || 0),
    stock: Number(product.stock || totalStock || 0),
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    isFeatured: Boolean(product.isFeatured),
    isActive: product.isActive !== false,
    isInStock: isInStockValue,
    colorVariants: colorVariants.length ? colorVariants : [emptyColorVariant],
  }
}

function buildLegacyColorVariants(product) {
  const images = (product.images || []).map(item => item.url || item).filter(Boolean)
  const colors = product.colors || []
  const sizes = (product.sizes || []).map(size => ({ size: size.size || '', stock: Number(size.stock || 0) }))
  if (!colors.length) return [emptyColorVariant]
  return colors.map(color => ({
    name: color.name,
    hex: color.hex,
    images: [images[Number(color.imageIndex || 0)] || images[0] || ''].filter(Boolean).length
      ? [images[Number(color.imageIndex || 0)] || images[0] || ''].filter(Boolean)
      : [''],
    sizes: sizes.length ? sizes.map(s => ({ ...s, height: '', sku: '' })) : [{ size: 'One Size', height: '', sku: '', stock: Number(product.stock || 0) }]
  }))
}

function buildVariantRows(colorVariants = []) {
  return colorVariants.flatMap(color => (color.sizes || [])
    .filter(size => size?.size)
    .map(size => ({
      color: color.name,
      hex: color.hex,
      size: size.size,
      height: String(size.height || '').trim(),
      sku: String(size.sku || '').trim(),
      stock: Number(size.stock || 0),
      mrp: Number(size.mrp || 0),
      sellPrice: Number(size.sellPrice || 0),
      images: (color.images || []).filter(Boolean).length
    })))
}

export default function AdminPage() {
  const router = useRouter()
  const [authState, setAuthState] = useState('checking')
  const [tab, setTab] = useState('products')
  const [dashboard, setDashboard] = useState({})
  const [orders, setOrders] = useState({ items: [], total: 0, summary: { revenue: 0, orders: 0, dispatched: 0 } })
  const [returnRequests, setReturnRequests] = useState({ items: [], total: 0 })
  const [returnFilters, setReturnFilters] = useState({ search: '', type: '', status: '' })
  const [returnSettings, setReturnSettings] = useState({ windowDays: 10, returnsEnabled: true, exchangesEnabled: true, whatsappNumber: '' })
  const [products, setProducts] = useState({ items: [], total: 0 })
  const [users, setUsers] = useState({ items: [], total: 0 })
  const [coupons, setCoupons] = useState({ items: [], total: 0 })
  const [orderFilters, setOrderFilters] = useState({ search: '', status: '', paymentStatus: '', days: '', month: '', from: '', to: '' })
  const [selectedOrders, setSelectedOrders] = useState([])
  const [orderDetail, setOrderDetail] = useState(null)
  const [orderDetailLoading, setOrderDetailLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [catalogColors, setCatalogColors] = useState([])
  const [catalogSizes, setCatalogSizes] = useState([])
  const [catalogHeights, setCatalogHeights] = useState([])
  const [heroes, setHeroes] = useState([])
  const [shippingZones, setShippingZones] = useState([])
  const [shippingZonesLoading, setShippingZonesLoading] = useState(false)
  const [settings, setSettings] = useState({ marquee: '', announcements: [''], theme: DEFAULT_THEME, branding: {}, shipping: { fee: 149, freeThreshold: 999, validUntil: '', codEnabled: true, infoText: '', imageUrl: '', bannerTitle: '', bannerSubtitle: '' }, content: {} })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [modal, setModal] = useState(null)
  const [preview, setPreview] = useState(null)
  const [categoryDeleteImpact, setCategoryDeleteImpact] = useState(null)
  const [saving, setSaving] = useState(null)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [heroForm, setHeroForm] = useState(emptyHero)
  const [couponForm, setCouponForm] = useState(emptyCoupon)
  const [colorForm, setColorForm] = useState(emptyCatalogColor)
  const [sizeForm, setSizeForm] = useState(emptyCatalogSize)
  const [heightForm, setHeightForm] = useState(emptyHeight)
  const [shippingZoneForm, setShippingZoneForm] = useState({ name: '', states: [], fee: 99, freeThreshold: 999, estimatedDaysMin: 3, estimatedDaysMax: 5, isActive: true, sortOrder: 0 })
  const [editingShippingZoneId, setEditingShippingZoneId] = useState(null)
  const [variantMappingOpen, setVariantMappingOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingHeroId, setEditingHeroId] = useState(null)
  const [editingCouponId, setEditingCouponId] = useState(null)
  const [editingColorId, setEditingColorId] = useState(null)
  const [editingSizeId, setEditingSizeId] = useState(null)
  const [editingHeightId, setEditingHeightId] = useState(null)

  const loadOrders = useCallback(async (filters = orderFilters) => {
    const orderData = await adminApi.orders({ page: 1, limit: 50, ...filters })
    // Ensure summary always present for UI
    setOrders({ summary: { revenue: 0, orders: 0, dispatched: 0 }, ...orderData, summary: orderData.summary || { revenue: 0, orders: 0, dispatched: 0 } })
    setSelectedOrders([])
  }, [orderFilters])

  const loadReturnRequests = useCallback(async (filters = returnFilters) => {
    const data = await adminApi.returnExchangeRequests({ page: 1, limit: 20, ...filters })
    setReturnRequests(data)
  }, [returnFilters])

  const saveReturnSettings = async () => {
    setSaving('return-settings')
    try {
      const payload = {
        windowDays: Number(returnSettings.windowDays || 10),
        returnsEnabled: !!returnSettings.returnsEnabled,
        exchangesEnabled: !!returnSettings.exchangesEnabled,
        whatsappNumber: String(returnSettings.whatsappNumber || '').trim()
      }
      const updated = await adminApi.updateReturnSettings(payload)
      setReturnSettings(updated)
      toast.success('Return & exchange settings saved')
    } catch (e) { toast.error(e.message || 'Failed to save settings') } finally { setSaving(null) }
  }

  const load = useCallback(async () => {
    setAuthState(current => current === 'ready' ? 'refreshing' : 'checking')
    try {
      const me = await adminApi.me()
      if (me.role_name !== 'admin') throw new Error('Admin access only')
      const [dash, orderData, productData, userData, couponData, cats, colorData, sizeData, heightData, heroData, rawSettings, retReqData, retSet] = await Promise.all([
        adminApi.dashboard(),
        adminApi.orders({ page: 1, limit: 50 }),
        adminApi.products({ page: 1, limit: 20 }),
        adminApi.users({ page: 1, limit: 20 }),
        adminApi.coupons({ page: 1, limit: 20 }),
        adminApi.categories(),
        adminApi.colors(),
        adminApi.sizes(),
        adminApi.heights(),
        adminApi.heroBanners(),
        adminApi.settings(),
        adminApi.returnExchangeRequests({ page: 1, limit: 20 }).catch(()=>({ items: [], total: 0 })),
        adminApi.getReturnSettings().catch(()=>({ windowDays: 10, returnsEnabled: true, exchangesEnabled: true, whatsappNumber: '' })),
      ])
      setDashboard(dash || {})
      setOrders(orderData)
      setProducts(productData)
      setUsers(userData)
      setCoupons(couponData)
      setCategories(cats || [])
      setCatalogColors(colorData || [])
      setCatalogSizes(sizeData || [])
      setCatalogHeights(heightData || [])
      setHeroes(heroData || [])
      setSettings({
        marquee: rawSettings.footer_marquee?.message || '',
        announcements: rawSettings.announcement_bar?.messages?.length ? rawSettings.announcement_bar.messages : [''],
        theme: normalizeTheme(rawSettings.store_theme),
        branding: rawSettings.branding || {}
        ,shipping: rawSettings.shipping || { fee: 149, freeThreshold: 999, validUntil: '', codEnabled: true, infoText: '', imageUrl: '', bannerTitle: '', bannerSubtitle: '' }
        ,content: rawSettings.content || {}
      })
      setReturnRequests(retReqData || { items: [], total: 0 })
      setReturnSettings(retSet || { windowDays: 10, returnsEnabled: true, exchangesEnabled: true, whatsappNumber: '' })
      applyTheme(normalizeTheme(rawSettings.store_theme))
      setAuthState('ready')
      await loadShippingZones()
    } catch (_) {
      await adminApi.logout()
      router.replace('/admin/login')
    }
  }, [router])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => [
    ['Revenue', money(dashboard.revenue), BarChart3],
    ['Orders', dashboard.orders || 0, ShoppingBag],
    ['Products', dashboard.products || 0, Box],
    ['Customers', dashboard.customers || 0, Users],
  ], [dashboard])

  const openProduct = async (row = null) => {
    if (row?.id) {
      const product = await adminApi.product(row.id)
      setProductForm(toProductForm(product))
      setEditingProductId(row.id)
    } else {
      setProductForm(emptyProduct)
      setEditingProductId(null)
    }
    setModal('product')
  }

  const openProductPreview = async (row) => {
    try {
      const product = await adminApi.product(row.id)
      setProductForm(toProductForm(product))
      setEditingProductId(null)
      setModal('product-view')
    } catch (error) {
      toast.error(error.message || 'Could not load product details')
    }
  }

  const openCategory = (row = null) => {
    setCategoryForm(row ? { ...emptyCategory, ...row, subcategories: row.subcategories?.length ? row.subcategories : [{ name: '', slug: '', sortOrder: 0 }] } : emptyCategory)
    setEditingCategoryId(row?.id || null)
    setModal('category')
  }

  const openCategoryDelete = async (row) => {
    setSaving('category-impact')
    try {
      const impact = await adminApi.categoryDeleteImpact(row.id)
      setCategoryDeleteImpact(impact)
    } catch (error) {
      toast.error(error.message || 'Could not calculate category impact')
    } finally {
      setSaving(null)
    }
  }

  const openColor = (row = null) => {
    setColorForm(row ? { ...emptyCatalogColor, ...row } : emptyCatalogColor)
    setEditingColorId(row?.id || null)
    setModal('color')
  }

  const openSize = (row = null) => {
    setSizeForm(row ? { ...emptyCatalogSize, ...row } : emptyCatalogSize)
    setEditingSizeId(row?.id || null)
    setModal('size')
  }

  const openHeight = (row = null) => {
    setHeightForm(row ? { ...emptyHeight, ...row } : emptyHeight)
    setEditingHeightId(row?.id || null)
    setModal('height')
  }

  const openHero = (row = null) => {
    setHeroForm(row ? { ...emptyHero, ...row } : emptyHero)
    setEditingHeroId(row?.id || null)
    setModal('hero')
  }

  const openCoupon = (row = null) => {
    setCouponForm(row ? { ...emptyCoupon, ...row, startsAt: toDateInput(row.startsAt), endsAt: toDateInput(row.endsAt) } : emptyCoupon)
    setEditingCouponId(row?.id || null)
    setModal('coupon')
  }

  const closeModal = () => setModal(null)

  const saveProduct = async () => {
    const colorVariants = productForm.colorVariants
      .filter(color => color.name && color.hex)
      .map(color => ({
        ...color,
        images: (color.images || []).filter(Boolean),
        sizes: (color.sizes || []).filter(size => size.size)
      }))
    const mrp = Number(productForm.mrp) || 0
    const sellPrice = Number(productForm.sellPrice) || 0
    
    // Validate that no variant has selling price > MRP
    for (const color of colorVariants) {
      for (const size of color.sizes || []) {
        const variantMrp = Number(size.mrp || mrp) || 0
        const variantSellPrice = Number(size.sellPrice || sellPrice) || 0
        if (variantSellPrice > variantMrp) {
          return toast.error(`Variant "${color.name} - ${size.size}" has selling price (₹${variantSellPrice}) higher than MRP (₹${variantMrp}). Please correct this before saving.`)
        }
      }
    }
    
    const payload = {
      ...productForm,
      colorVariants,
      mrp: Math.max(mrp, sellPrice),
      sellPrice,
      off: computeDiscountPercent(Math.max(mrp, sellPrice), sellPrice),
      stock: colorVariants.reduce((sum, color) => sum + color.sizes.reduce((inner, size) => inner + Number(size.stock || 0), 0), 0)
    }
    if (!payload.name || !payload.slug) return toast.error('Product name and slug are required')
    if (!payload.category) return toast.error('Please select a category')
    if (!colorVariants.length) return toast.error('Add at least one color variant')
    if (!colorVariants.some(color => color.images.length)) return toast.error('Upload at least one image for a color')
    if (!colorVariants.some(color => color.sizes.length)) return toast.error('Add at least one size with stock')
    setSaving('product')
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
    try {
      if (editingProductId) await adminApi.updateProduct(editingProductId, payload)
      else await adminApi.createProduct(payload)
      toast.success(editingProductId ? 'Product updated' : 'Product created')
      closeModal()
      // Lightweight refresh: only products + variant masters, not full dashboard
      try {
        const [pData, colorData, sizeData, heightData] = await Promise.all([
          adminApi.products({ page: 1, limit: 20 }),
          adminApi.colors(),
          adminApi.sizes(),
          adminApi.heights(),
        ])
        setProducts(pData)
        setCatalogColors(colorData || [])
        setCatalogSizes(sizeData || [])
        setCatalogHeights(heightData || [])
      } catch { await load() }
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      console.log(`Product save ${editingProductId ? 'update' : 'create'} took ${Math.round(t1 - t0)}ms`)
    } finally {
      setSaving(null)
    }
  }

  const toggleProductAvailability = async (row) => {
    const current = row.isInStock !== undefined ? row.isInStock : row.is_in_stock !== undefined ? row.is_in_stock : true
    const next = !current
    const key = `availability-${row.id}`
    setSaving(key)
    // Optimistic update
    setProducts(prev => ({ ...prev, items: prev.items.map(p => p.id===row.id ? { ...p, isInStock: next, is_in_stock: next } : p)}))
    try {
      await adminApi.updateProductAvailability(row.id, next)
      toast.success(next ? 'Product marked In Stock' : 'Product marked Sold Out')
    } catch (e) {
      // Revert
      setProducts(prev => ({ ...prev, items: prev.items.map(p => p.id===row.id ? { ...p, isInStock: current, is_in_stock: current } : p)}))
      toast.error(e.message || 'Failed to update availability')
    } finally {
      setSaving(null)
    }
  }

  const saveCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) return toast.error('Category name and slug are required')
    setSaving('category')
    try {
      if (editingCategoryId) await adminApi.updateCategory(editingCategoryId, categoryForm)
      else await adminApi.createCategory(categoryForm)
      toast.success(editingCategoryId ? 'Category updated' : 'Category created')
      closeModal(); await load()
    } finally {
      setSaving(null)
    }
  }

  const confirmCategoryDelete = async () => {
    if (!categoryDeleteImpact?.category?.id) return
    setSaving('category-delete')
    try {
      const result = await adminApi.deleteCategory(categoryDeleteImpact.category.id)
      toast.success(`Category deleted with ${result.impact?.totalProducts || 0} product(s)`)
      setCategoryDeleteImpact(null)
      await load()
    } finally {
      setSaving(null)
    }
  }

  const saveColor = async () => {
    if (!colorForm.name || !colorForm.hex) return toast.error('Color name and swatch are required')
    setSaving('color')
    try {
      if (editingColorId) await adminApi.updateColor(editingColorId, colorForm)
      else await adminApi.createColor(colorForm)
      toast.success(editingColorId ? 'Color updated' : 'Color created')
      closeModal(); await load()
    } finally {
      setSaving(null)
    }
  }

  const saveSize = async () => {
    if (!sizeForm.size) return toast.error('Size is required')
    setSaving('size')
    try {
      if (editingSizeId) await adminApi.updateSize(editingSizeId, sizeForm)
      else await adminApi.createSize(sizeForm)
      toast.success(editingSizeId ? 'Size updated' : 'Size created')
      closeModal(); await load()
    } finally {
      setSaving(null)
    }
  }

  const saveHeight = async () => {
    if (!String(heightForm.height || '').trim()) return toast.error('Height is required')
    setSaving('height')
    try {
      if (editingHeightId) await adminApi.updateHeight(editingHeightId, heightForm)
      else await adminApi.createHeight(heightForm)
      toast.success(editingHeightId ? 'Height updated' : 'Height created')
      closeModal(); await load()
    } finally {
      setSaving(null)
    }
  }

  const saveHero = async () => {
    if (!heroForm.title || !heroForm.imageUrl) return toast.error('Hero title and image are required')
    setSaving('hero')
    try {
      if (editingHeroId) await adminApi.updateHeroBanner(editingHeroId, heroForm)
      else await adminApi.createHeroBanner(heroForm)
      toast.success(editingHeroId ? 'Hero updated' : 'Hero created')
      closeModal(); await load()
    } finally {
      setSaving(null)
    }
  }

  const saveCoupon = async () => {
    if (!couponForm.code) return toast.error('Coupon code is required')
    setSaving('coupon')
    try {
      if (editingCouponId) await adminApi.updateCoupon(editingCouponId, couponForm)
      else await adminApi.createCoupon(couponForm)
      toast.success(editingCouponId ? 'Coupon updated' : 'Coupon created')
      closeModal(); await load()
    } finally {
      setSaving(null)
    }
  }

  const saveSettings = async (savingKey = 'settings') => {
    setSaving(savingKey)
    try {
      const shippingPayload = {
        fee: Number(settings.shipping?.fee ?? 0),
        freeThreshold: Number(settings.shipping?.freeThreshold ?? 0),
        validUntil: String(settings.shipping?.validUntil || ''),
        codEnabled: settings.shipping?.codEnabled !== false,
        infoText: settings.shipping?.infoText || '',
        imageUrl: String(settings.shipping?.imageUrl || settings.shipping?.bannerImage || '').trim(),
        bannerTitle: String(settings.shipping?.bannerTitle || '').trim(),
        bannerSubtitle: String(settings.shipping?.bannerSubtitle || settings.shipping?.bannerText || '').trim()
      }
      await adminApi.updateFooterMarquee(settings.marquee || `Free shipping on orders above ₹${shippingPayload.freeThreshold}`)
      await adminApi.updateAnnouncementBar(settings.announcements.map(item => item.trim()).filter(Boolean))
      await adminApi.updateBranding(settings.branding || {})
      await adminApi.updateShipping(shippingPayload)
      await adminApi.updateContent(settings.content || {})
      const refreshed = await adminApi.settings()
      setSettings(current => ({ ...current, content: refreshed.content || {}, shipping: { ...(current.shipping || {}), ...(refreshed.shipping || {}) } }))
      toast.success('Storefront settings updated')
    } finally {
      setSaving(null)
    }
  }

  const savePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) return toast.error('Enter current and new password')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error('New passwords do not match')
    setSaving('password')
    try { await authApi.changeAdminPassword(passwordForm); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success('Password updated') } catch (error) { toast.error(error.message) } finally { setSaving(null) }
  }

  const saveTheme = async () => {
    setSaving('theme')
    try {
      const theme = normalizeTheme(settings.theme)
      await adminApi.updateTheme(theme)
      applyTheme(theme)
      setSettings(current => ({ ...current, theme }))
      window.dispatchEvent(new Event('staffarc-theme'))
      toast.success('Brand theme updated across storefront and admin')
    } finally {
      setSaving(null)
    }
  }

  const loadShippingZones = async () => {
    setShippingZonesLoading(true)
    try {
      const zones = await adminApi.shippingZones()
      setShippingZones(zones || [])
    } catch (error) {
      console.error('Failed to load shipping zones:', error)
      setShippingZones([])
    } finally {
      setShippingZonesLoading(false)
    }
  }

  const openShippingZone = (zone = null) => {
    if (zone) {
      setShippingZoneForm({
        name: zone.name,
        states: zone.states || [],
        fee: zone.fee,
        freeThreshold: zone.freeThreshold,
        estimatedDaysMin: zone.estimatedDaysMin,
        estimatedDaysMax: zone.estimatedDaysMax,
        isActive: zone.isActive,
        sortOrder: zone.sortOrder
      })
      setEditingShippingZoneId(zone.id)
    } else {
      setShippingZoneForm({ name: '', states: [], fee: 99, freeThreshold: 999, estimatedDaysMin: 3, estimatedDaysMax: 5, isActive: true, sortOrder: 0 })
      setEditingShippingZoneId(null)
    }
    setModal('shipping-zone')
  }

  const saveShippingZone = async () => {
    if (!shippingZoneForm.name || !shippingZoneForm.states?.length) return toast.error('Zone name and at least one state are required')
    setSaving('shipping-zone')
    try {
      if (editingShippingZoneId) await adminApi.updateShippingZone(editingShippingZoneId, shippingZoneForm)
      else await adminApi.createShippingZone(shippingZoneForm)
      toast.success(editingShippingZoneId ? 'Shipping zone updated' : 'Shipping zone created')
      closeModal(); await loadShippingZones()
    } catch (error) {
      toast.error(error.message || 'Failed to save shipping zone')
    } finally {
      setSaving(null)
    }
  }

  const exportOrdersCsv = async () => {
    try {
      const params = selectedOrders.length
        ? { ids: selectedOrders.join(',') }
        : { ...orderFilters, limit: 5000 }
      const blob = await adminApi.exportOrdersCsv(params)
      downloadBlob(blob, `staffarc-orders-${Date.now()}.csv`)
      toast.success(selectedOrders.length ? `Exported ${selectedOrders.length} selected order(s)` : 'Exported filtered orders')
    } catch (error) {
      toast.error(error.message || 'Could not export orders')
    }
  }

  if (authState !== 'ready' && authState !== 'refreshing') return <AdminLoading />

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-line bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-5">
            <div className="mb-8 rounded-lg border border-line bg-[#111318] p-4 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">StaffArc</p>
              <h1 className="mt-1 font-display text-2xl font-black">Admin Panel</h1>
            </div>
            <nav className="space-y-1">
              {NAV.map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)} className={`flex h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-bold transition ${tab === id ? 'bg-primary text-white shadow-sm' : 'text-ink-muted hover:bg-surface-alt hover:text-ink'}`}>
                  <span className="flex items-center gap-3"><Icon size={17}/>{label}</span>
                  {tab === id && <ChevronRight size={16}/>}
                </button>
              ))}
            </nav>
            <div className="mt-auto space-y-2">
              <button onClick={load} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-bold hover:border-primary hover:text-primary"><RefreshCw size={15}/>Refresh</button>
              <button onClick={async () => { await adminApi.logout(); router.push('/admin/login') }} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-bold text-white hover:bg-primary"><LogOut size={15}/>Logout</button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-line bg-white/90 px-4 py-4 backdrop-blur md:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Operations Console</p>
                <h2 className="font-display text-3xl font-black">{NAV.find(item => item[0] === tab)?.[1] || 'Dashboard'}</h2>
              </div>
              <div className="flex flex-wrap gap-2 lg:hidden">
                {NAV.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`h-9 rounded-lg px-3 text-xs font-black ${tab === id ? 'bg-ink text-white' : 'border border-line bg-white text-ink-muted'}`}>{label}</button>)}
              </div>
            </div>
          </header>

          <div className="px-4 py-6 md:px-7">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(([label, value, Icon]) => <StatCard key={label} label={label} value={value} Icon={Icon} />)}
            </section>

            {tab === 'products' && (
              <Panel title="Product Catalog" icon={PackageSearch} action={<ActionButton onClick={() => openProduct()} label="Add Product" />}>
                <ProductCatalogTable rows={products.items} actions={(row) => (
                  <div className="flex items-center gap-1.5">
                    <RowActions onView={() => openProductPreview(row)} onEdit={() => openProduct(row)} onDelete={async () => { await adminApi.deleteProduct(row.id); toast.success('Product deleted'); await load() }} />
                    <div className="flex items-center gap-1 rounded-full border border-line bg-surface-alt px-2 py-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-muted hidden xl:inline">Stock:</span>
                      <button
                        onClick={() => toggleProductAvailability(row)}
                        disabled={saving === `availability-${row.id}`}
                        aria-label={row.isInStock === false || row.is_in_stock === false ? 'Mark In Stock' : 'Mark Sold Out'}
                        title={row.isInStock === false || row.is_in_stock === false ? 'Sold Out — click to make In Stock' : 'In Stock — click to mark Sold Out'}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50 ${row.isInStock === false || row.is_in_stock === false ? 'bg-gray-300' : 'bg-green-500'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${row.isInStock === false || row.is_in_stock === false ? 'translate-x-1' : 'translate-x-4'}`} />
                      </button>
                      <span className="text-[10px] font-bold hidden sm:inline">{row.isInStock === false || row.is_in_stock === false ? 'Sold Out' : 'In Stock'}</span>
                    </div>
                  </div>
                )} />
              </Panel>
            )}

            {['storefront', 'content', 'settings'].includes(tab) && (
              <div className="mt-5 grid gap-5">
                {tab === 'storefront' && <Panel title="Brand Theme" icon={Palette} action={<button onClick={saveTheme} disabled={saving === 'theme'} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-75">{saving === 'theme' ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>} {saving === 'theme' ? 'Saving...' : 'Apply Theme'}</button>}>
                  <ThemeEditor theme={settings.theme} onChange={theme => { setSettings({ ...settings, theme }); applyTheme(theme) }} />
                </Panel>}
                <div className="grid gap-5 xl:grid-cols-2">
                {tab === 'storefront' && <Panel title="Branding & Messages" icon={Megaphone} action={<SettingsSaveButton onClick={() => saveSettings('branding')} saving={saving === 'branding'} label="Save" />}>
                  <FileUpload label="Upload logo" onUploaded={url => setSettings({ ...settings, branding: { ...(settings.branding || {}), logoUrl: url } })} />
                  {settings.branding?.logoUrl && <MediaGrid items={[settings.branding.logoUrl]} onPreview={(url) => setPreview({ type: 'image', url, title: 'Logo' })} onRemove={() => setSettings({ ...settings, branding: { ...(settings.branding || {}), logoUrl: '' } })} />}
                  <Field label="Footer scrolling text" value={settings.marquee} onChange={value => setSettings({ ...settings, marquee: value })} />
                  <AnnouncementEditor value={settings.announcements} onChange={announcements => setSettings({ ...settings, announcements })} />
                </Panel>}
                {shippingZonesLoading && <div className="text-center py-4 text-ink-muted">Loading shipping zones...</div>}
                {tab === 'settings' && <Panel title="Shipping settings" icon={ShoppingBag} action={<SettingsSaveButton onClick={() => saveSettings('shipping')} saving={saving === 'shipping'} label="Save shipping" />}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Default shipping fee (₹)" type="number" value={settings.shipping?.fee ?? 149} onChange={fee => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), fee: Number(fee || 0) } })} />
                    <Field label="Free shipping above (₹)" type="number" value={settings.shipping?.freeThreshold ?? 999} onChange={freeThreshold => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), freeThreshold: Number(freeThreshold || 0) } })} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Banner valid until" type="date" value={settings.shipping?.validUntil ?? ''} onChange={validUntil => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), validUntil } })} />
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.shipping?.codEnabled !== false} onChange={e => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), codEnabled: e.target.checked } })} className="w-4 h-4 rounded border-line text-primary focus:ring-primary" />
                      <span className="text-sm font-medium text-ink">Enable COD (Cash on Delivery)</span>
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 mt-3">
                    <Field label="Banner Title" value={settings.shipping?.bannerTitle ?? ''} onChange={bannerTitle => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), bannerTitle } })} placeholder="FREE SHIPPING ON ₹999+" />
                    <Field label="Banner Subtitle" value={settings.shipping?.bannerSubtitle ?? ''} onChange={bannerSubtitle => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), bannerSubtitle } })} placeholder="Use code FREESHIP at checkout" />
                  </div>
                  <div className="mt-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Shipping info text (shown on storefront)</span>
                      <textarea value={settings.shipping?.infoText ?? ''} onChange={e => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), infoText: e.target.value } })} className="h-24 w-full rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary resize-none" placeholder="Standard: 3–5 business days..." />
                    </label>
                  </div>
                  <div className="mt-4 rounded-xl border border-line bg-surface-alt p-4">
                    <SectionLabel label="Free Shipping Banner Image (optional)" />
                    <p className="mb-3 text-xs text-ink-muted">Optional image shown beside free-shipping text on homepage. If empty, text-only banner continues as before.</p>
                    <FileUpload label="Upload banner image" onUploaded={url => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), imageUrl: url } })} />
                    {(settings.shipping?.imageUrl || settings.shipping?.bannerImage) && (
                      <MediaGrid items={[settings.shipping.imageUrl || settings.shipping.bannerImage]} onPreview={(url) => setPreview({ type: 'image', url, title: 'Free shipping banner' })} onRemove={() => setSettings({ ...settings, shipping: { ...(settings.shipping || {}), imageUrl: '' } })} />
                    )}
                  </div>
                  <p className="mt-3 text-sm text-ink-muted">Default rates apply when no zone matches. Zones below override for specific states.</p>
                </Panel>}
                {tab === 'settings' && <Panel title="Return & Exchange Settings" icon={RefreshCw} action={<SettingsSaveButton onClick={saveReturnSettings} saving={saving==='return-settings'} label="Save" />}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Return/Exchange Window (days)" type="number" value={returnSettings.windowDays} onChange={v => setReturnSettings({...returnSettings, windowDays: Number(v||10)})} />
                    <Field label="Business WhatsApp Number" value={returnSettings.whatsappNumber} onChange={v => setReturnSettings({...returnSettings, whatsappNumber: v})} placeholder="e.g. 919876543210" />
                  </div>
                  <div className="mt-4 flex gap-4">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={returnSettings.returnsEnabled} onChange={e=>setReturnSettings({...returnSettings, returnsEnabled: e.target.checked})} className="h-4 w-4 rounded border-line" /><span className="text-sm font-bold">Returns Enabled</span></label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={returnSettings.exchangesEnabled} onChange={e=>setReturnSettings({...returnSettings, exchangesEnabled: e.target.checked})} className="h-4 w-4 rounded border-line" /><span className="text-sm font-bold">Exchanges Enabled</span></label>
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">Window defaults to 10 days if empty. WhatsApp number is used for opening/unboxing video (e.g. 9198...). Leave empty to use customer chat fallback.</p>
                </Panel>}

                {tab === 'settings' && <Panel title="Shipping Zones (Location-based rates)" icon={MapPin} action={<ActionButton onClick={() => openShippingZone()} label="Add Zone" />}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#f8f9fb] text-xs uppercase tracking-[0.12em] text-ink-muted">
                        <tr>
                          <th className="px-4 py-3 font-black">Zone Name</th>
                          <th className="px-4 py-3 font-black">States</th>
                          <th className="px-4 py-3 font-black">Fee (₹)</th>
                          <th className="px-4 py-3 font-black">Free Above (₹)</th>
                          <th className="px-4 py-3 font-black">Est. Days</th>
                          <th className="px-4 py-3 font-black">Status</th>
                          <th className="px-4 py-3 font-black">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {shippingZones.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-muted">No shipping zones configured. Click &quot;Add Zone&quot; to create one.</td></tr>
                        ) : (
                          shippingZones.map(zone => (
                            <tr key={zone.id} className={zone.isActive ? '' : 'opacity-50'}>
                              <td className="px-4 py-3 font-semibold text-ink">{zone.name}</td>
                              <td className="px-4 py-3 text-ink-muted max-w-xs truncate">{zone.states?.join(', ')}</td>
                              <td className="px-4 py-3 font-medium text-ink">₹{zone.fee}</td>
                              <td className="px-4 py-3 font-medium text-ink">₹{zone.freeThreshold}</td>
                              <td className="px-4 py-3 text-ink-muted">{zone.estimatedDaysMin}–{zone.estimatedDaysMax} days</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${zone.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${zone.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                  {zone.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openShippingZone(zone)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-primary hover:text-primary" aria-label="Edit zone"><Edit size={14}/></button>
                                  <button onClick={async () => { await adminApi.deleteShippingZone(zone.id); toast.success('Zone deleted'); await loadShippingZones() }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50" aria-label="Delete zone"><Trash2 size={14}/></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>}
                {tab === 'content' && <><Panel title="About Us content" icon={UserCog} action={<SettingsSaveButton onClick={() => saveSettings('about-content')} saving={saving === 'about-content'} label="Save About" />}>
                  <ContentSection title="Hero section">
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Section label" placeholder={DEFAULT_ABOUT.heroLabel} value={settings.content?.about?.heroLabel ?? ''} onChange={heroLabel => setSettings(patchAbout(settings, { heroLabel }))} /><Field label="Page title" placeholder={DEFAULT_ABOUT.title} value={settings.content?.about?.title ?? ''} onChange={title => setSettings(patchAbout(settings, { title }))} /></div>
                    <Field label="Subtitle (optional)" placeholder={DEFAULT_ABOUT.subtitle || 'Optional subtitle under the title'} value={settings.content?.about?.subtitle ?? ''} onChange={subtitle => setSettings(patchAbout(settings, { subtitle }))} />
                    <Area label="Hero description" value={settings.content?.about?.description ?? ''} onChange={description => setSettings(patchAbout(settings, { description }))} />
                    <FileUpload label="Upload about hero image" onUploaded={imageUrl => setSettings(patchAbout(settings, { imageUrl }))} />
                    {settings.content?.about?.imageUrl && <MediaGrid items={[settings.content.about.imageUrl]} onPreview={url => setPreview({ type: 'image', url, title: 'About hero image' })} onRemove={() => setSettings(patchAbout(settings, { imageUrl: '' }))} />}
                  </ContentSection>
                  <ContentSection title="Mission section">
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Section label" placeholder={DEFAULT_ABOUT.missionLabel} value={settings.content?.about?.missionLabel ?? ''} onChange={missionLabel => setSettings(patchAbout(settings, { missionLabel }))} /><Field label="Mission heading" placeholder={DEFAULT_ABOUT.missionHeading} value={settings.content?.about?.missionHeading ?? ''} onChange={missionHeading => setSettings(patchAbout(settings, { missionHeading }))} /></div>
                    <Area label="Mission statement" value={settings.content?.about?.mission ?? ''} onChange={mission => setSettings(patchAbout(settings, { mission }))} />
                    <Area label="Mission supporting text" value={settings.content?.about?.missionDescription ?? ''} onChange={missionDescription => setSettings(patchAbout(settings, { missionDescription }))} />
                  </ContentSection>
                  <ContentSection title="What we offer">
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Section label" placeholder={DEFAULT_ABOUT.offerLabel} value={settings.content?.about?.offerLabel ?? ''} onChange={offerLabel => setSettings(patchAbout(settings, { offerLabel }))} /><Field label="Section heading" placeholder={DEFAULT_ABOUT.offerHeading} value={settings.content?.about?.offerHeading ?? ''} onChange={offerHeading => setSettings(patchAbout(settings, { offerHeading }))} /></div>
                    {(() => {
                      const about = settings.content?.about || {}
                      const offers = [1,2,3,4,5,6].reduce((acc, index) => {
                        const title = about[`offer${index}Title`] ?? ''
                        const description = about[`offer${index}Description`] ?? ''
                        const hasData = title || description || Object.prototype.hasOwnProperty.call(about, `offer${index}Title`) || Object.prototype.hasOwnProperty.call(about, `offer${index}Description`)
                        if (hasData) {
                          acc.push({ title, description })
                        }
                        return acc
                      }, [])

                      const visibleOffers = offers

                      return <div className="mt-3"><DynamicOfferEditor items={visibleOffers} onChange={(nextItems) => {
                        setSettings(prev => {
                          const nextAbout = updateIndexedAboutList(prev.content?.about, nextItems, 4, [
                            { key: index => `offer${index}Title`, value: item => item?.title },
                            { key: index => `offer${index}Description`, value: item => item?.description },
                          ])
                          return { ...prev, content: { ...(prev.content || {}), about: nextAbout } }
                        })
                      }} addLabel="Add Offer" maxItems={4} /></div>
                    })()}
                  </ContentSection>
                  <ContentSection title="Quality commitment">
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Quality heading" placeholder={DEFAULT_ABOUT.qualityHeading} value={settings.content?.about?.qualityHeading ?? ''} onChange={qualityHeading => setSettings(patchAbout(settings, { qualityHeading }))} /><Area label="Quality description" value={settings.content?.about?.qualityDescription ?? ''} onChange={qualityDescription => setSettings(patchAbout(settings, { qualityDescription }))} /></div>
                    {(() => {
                      const about = settings.content?.about || {}
                      const promises = [1,2,3,4,5,6].reduce((acc, index) => {
                        const value = about[`promise${index}`] ?? ''
                        const hasData = value || Object.prototype.hasOwnProperty.call(about, `promise${index}`)
                        if (hasData) {
                          acc.push(value)
                        }
                        return acc
                      }, [])

                      const visiblePromises = promises

                      return <div className="mt-3"><DynamicTextListEditor items={visiblePromises} onChange={(nextItems) => {
                        setSettings(prev => {
                          const nextAbout = updateIndexedAboutList(prev.content?.about, nextItems, 6, [
                            { key: index => `promise${index}`, value: item => item },
                          ])
                          return { ...prev, content: { ...(prev.content || {}), about: nextAbout } }
                        })
                      }} label="Promise" addLabel="Add Promise" maxItems={6} placeholder="e.g. Premium quality materials" /></div>
                    })()}
                  </ContentSection>
                  <ContentSection title="Why customers choose us">
                    <Field label="Section label" placeholder={DEFAULT_ABOUT.valuesLabel} value={settings.content?.about?.valuesLabel ?? ''} onChange={valuesLabel => setSettings(patchAbout(settings, { valuesLabel }))} />
                    {(() => {
                      const about = settings.content?.about || {}
                      const values = [1,2,3,4].reduce((acc, index) => {
                        const legacyKey = ['One', 'Two', 'Three', 'Four'][index - 1]
                        const title = about[`value${index}Title`] ?? about[`value${legacyKey}Title`] ?? ''
                        const description = about[`value${index}`] ?? about[`value${legacyKey}`] ?? ''
                        const hasData = title || description || Object.prototype.hasOwnProperty.call(about, `value${index}Title`) || Object.prototype.hasOwnProperty.call(about, `value${index}`) || Object.prototype.hasOwnProperty.call(about, `value${legacyKey}Title`) || Object.prototype.hasOwnProperty.call(about, `value${legacyKey}`)
                        if (hasData) {
                          acc.push({ title, description })
                        }
                        return acc
                      }, [])

                      const visibleValues = values

                      return <div className="mt-3"><DynamicValueEditor items={visibleValues} onChange={(nextItems) => {
                        setSettings(prev => {
                          const nextAbout = updateIndexedAboutList(prev.content?.about, nextItems, 4, [
                            { key: index => `value${index}Title`, value: item => item?.title },
                            { key: index => `value${index}`, value: item => item?.description },
                          ])
                          for (const legacyKey of ['One', 'Two', 'Three', 'Four']) {
                            delete nextAbout[`value${legacyKey}Title`]
                            delete nextAbout[`value${legacyKey}`]
                          }
                          return { ...prev, content: { ...(prev.content || {}), about: nextAbout } }
                        })
                      }} addLabel="Add Reason" maxItems={4} /></div>
                    })()}
                  </ContentSection>
                  <ContentSection title="Vision & experience">
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Vision section label" placeholder={DEFAULT_ABOUT.visionLabel} value={settings.content?.about?.visionLabel ?? ''} onChange={visionLabel => setSettings(patchAbout(settings, { visionLabel }))} /><Area label="Vision text" value={settings.content?.about?.vision ?? ''} onChange={vision => setSettings(patchAbout(settings, { vision }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Experience section label" placeholder={DEFAULT_ABOUT.experienceLabel} value={settings.content?.about?.experienceLabel ?? ''} onChange={experienceLabel => setSettings(patchAbout(settings, { experienceLabel }))} /><Field label="CTA button text" placeholder={DEFAULT_ABOUT.experienceCtaText} value={settings.content?.about?.experienceCtaText ?? ''} onChange={experienceCtaText => setSettings(patchAbout(settings, { experienceCtaText }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Area label="Experience description" value={settings.content?.about?.experienceText ?? ''} onChange={experienceText => setSettings(patchAbout(settings, { experienceText }))} /><Field label="CTA button link" placeholder={DEFAULT_ABOUT.experienceCtaLink} value={settings.content?.about?.experienceCtaLink ?? ''} onChange={experienceCtaLink => setSettings(patchAbout(settings, { experienceCtaLink }))} /></div>
                  </ContentSection>
                </Panel><Panel title="Contact Us content" icon={MessageCircle} action={<SettingsSaveButton onClick={() => saveSettings('contact-content')} saving={saving === 'contact-content'} label="Save Contact" />}>
                  <ContentSection title="Hero section">
                    <Field label="Section label" placeholder={DEFAULT_CONTACT.heroLabel} value={settings.content?.contact?.heroLabel ?? ''} onChange={heroLabel => setSettings(patchContact(settings, { heroLabel }))} />
                    <Field label="Hero title" placeholder={DEFAULT_CONTACT.heroTitle} value={settings.content?.contact?.heroTitle ?? ''} onChange={heroTitle => setSettings(patchContact(settings, { heroTitle }))} />
                    <Area label="Hero description" value={settings.content?.contact?.heroDescription ?? ''} onChange={heroDescription => setSettings(patchContact(settings, { heroDescription }))} />
                  </ContentSection>
                  <ContentSection title="Contact details">
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Phone label" placeholder={DEFAULT_CONTACT.phoneLabel} value={settings.content?.contact?.phoneLabel ?? ''} onChange={phoneLabel => setSettings(patchContact(settings, { phoneLabel }))} /><Field label="Phone number" placeholder="e.g. +91 98765 43210" value={settings.content?.contact?.phone ?? ''} onChange={phone => setSettings(patchContact(settings, { phone }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Email label" placeholder={DEFAULT_CONTACT.emailLabel} value={settings.content?.contact?.emailLabel ?? ''} onChange={emailLabel => setSettings(patchContact(settings, { emailLabel }))} /><Field label="Email address" placeholder="e.g. hello@yourstore.com" value={settings.content?.contact?.email ?? ''} onChange={email => setSettings(patchContact(settings, { email }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Address label" placeholder={DEFAULT_CONTACT.addressLabel} value={settings.content?.contact?.addressLabel ?? ''} onChange={addressLabel => setSettings(patchContact(settings, { addressLabel }))} /><Field label="Business hours label" placeholder={DEFAULT_CONTACT.hoursLabel} value={settings.content?.contact?.hoursLabel ?? ''} onChange={hoursLabel => setSettings(patchContact(settings, { hoursLabel }))} /></div>
                    <Area label="Address" value={settings.content?.contact?.address ?? ''} onChange={address => setSettings(patchContact(settings, { address }))} />
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Working hours" placeholder="e.g. 9:00 AM – 6:00 PM, Monday to Saturday" value={settings.content?.contact?.workingHours ?? ''} onChange={workingHours => setSettings(patchContact(settings, { workingHours }))} /><Field label="WhatsApp link" placeholder="https://wa.me/..." value={settings.content?.contact?.whatsapp ?? ''} onChange={whatsapp => setSettings(patchContact(settings, { whatsapp }))} /></div>
                  </ContentSection>
                  <ContentSection title="Social & form">
                    <Field label="Social section heading" placeholder={DEFAULT_CONTACT.socialHeading} value={settings.content?.contact?.socialHeading ?? ''} onChange={socialHeading => setSettings(patchContact(settings, { socialHeading }))} />
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Form section label" placeholder={DEFAULT_CONTACT.formLabel} value={settings.content?.contact?.formLabel ?? ''} onChange={formLabel => setSettings(patchContact(settings, { formLabel }))} /><Field label="Form heading" placeholder={DEFAULT_CONTACT.formHeading} value={settings.content?.contact?.formHeading ?? ''} onChange={formHeading => setSettings(patchContact(settings, { formHeading }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Name field label" placeholder={DEFAULT_CONTACT.formNameLabel} value={settings.content?.contact?.formNameLabel ?? ''} onChange={formNameLabel => setSettings(patchContact(settings, { formNameLabel }))} /><Field label="Name placeholder" placeholder={DEFAULT_CONTACT.formNamePlaceholder} value={settings.content?.contact?.formNamePlaceholder ?? ''} onChange={formNamePlaceholder => setSettings(patchContact(settings, { formNamePlaceholder }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Phone field label" placeholder={DEFAULT_CONTACT.formPhoneLabel} value={settings.content?.contact?.formPhoneLabel ?? ''} onChange={formPhoneLabel => setSettings(patchContact(settings, { formPhoneLabel }))} /><Field label="Phone placeholder" placeholder={DEFAULT_CONTACT.formPhonePlaceholder} value={settings.content?.contact?.formPhonePlaceholder ?? ''} onChange={formPhonePlaceholder => setSettings(patchContact(settings, { formPhonePlaceholder }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Email field label" placeholder={DEFAULT_CONTACT.formEmailLabel} value={settings.content?.contact?.formEmailLabel ?? ''} onChange={formEmailLabel => setSettings(patchContact(settings, { formEmailLabel }))} /><Field label="Email placeholder" placeholder={DEFAULT_CONTACT.formEmailPlaceholder} value={settings.content?.contact?.formEmailPlaceholder ?? ''} onChange={formEmailPlaceholder => setSettings(patchContact(settings, { formEmailPlaceholder }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Message field label" placeholder={DEFAULT_CONTACT.formMessageLabel} value={settings.content?.contact?.formMessageLabel ?? ''} onChange={formMessageLabel => setSettings(patchContact(settings, { formMessageLabel }))} /><Field label="Message placeholder" placeholder={DEFAULT_CONTACT.formMessagePlaceholder} value={settings.content?.contact?.formMessagePlaceholder ?? ''} onChange={formMessagePlaceholder => setSettings(patchContact(settings, { formMessagePlaceholder }))} /></div>
                    <div className="grid gap-3 md:grid-cols-2"><Field label="Submit button text" placeholder={DEFAULT_CONTACT.formSubmitText} value={settings.content?.contact?.formSubmitText ?? ''} onChange={formSubmitText => setSettings(patchContact(settings, { formSubmitText }))} /><Field label="Success message" placeholder={DEFAULT_CONTACT.formSuccessMessage} value={settings.content?.contact?.formSuccessMessage ?? ''} onChange={formSuccessMessage => setSettings(patchContact(settings, { formSuccessMessage }))} /></div>
                  </ContentSection>
                </Panel><Panel title="Social media links" icon={Instagram} action={<SettingsSaveButton onClick={() => saveSettings('social-content')} saving={saving === 'social-content'} label="Save Socials" />}><p className="mb-4 text-sm text-ink-muted">Links appear on the Contact page and footer when filled in.</p><div className="grid gap-3 md:grid-cols-2">{SOCIAL_FIELDS.map(([key, label, Icon]) => <label key={key} className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-ink-muted"><Icon size={15} className="text-primary"/>{label}</span><input value={settings.content?.social?.[key] ?? ''} onChange={event => setSettings({ ...settings, content: { ...settings.content, social: { ...(settings.content?.social || {}), [key]: event.target.value } } })} placeholder={`Paste ${label} URL`} className="h-11 w-full rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary" /></label>)}</div></Panel></>}
                {tab === 'settings' && <Panel title="Change password" icon={UserCog} action={<button onClick={savePassword} disabled={saving === 'password'} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white disabled:opacity-75"><Save size={16}/> Update password</button>}><div className="grid gap-3 md:grid-cols-3">{[['Current password','currentPassword'],['New password','newPassword'],['Confirm password','confirmPassword']].map(([label,key]) => <Field key={key} label={label} type="password" value={passwordForm[key]} onChange={value => setPasswordForm({ ...passwordForm, [key]: value })} />)}</div></Panel>}
                {tab === 'storefront' && <Panel title="Categories" icon={Box} action={<ActionButton onClick={() => openCategory()} label="Add Category" />}>
                  <MiniList rows={categories} primary="name" secondary="slug" onEdit={openCategory} onDelete={openCategoryDelete} />
                </Panel>}
                {tab === 'storefront' && <Panel title="Colors" icon={Palette} action={<ActionButton onClick={() => openColor()} label="Add Color" />}>
                  <MiniList rows={catalogColors} primary="name" secondary="hex" onEdit={openColor} onDelete={async (row) => { await adminApi.deleteColor(row.id); toast.success('Color deleted'); await load() }} />
                </Panel>}
                {tab === 'storefront' && <Panel title="Sizes" icon={Box} action={<ActionButton onClick={() => openSize()} label="Add Size" />}>
                  <MiniList rows={catalogSizes} primary="size" secondary="status" onEdit={openSize} onDelete={async (row) => { await adminApi.deleteSize(row.id); toast.success('Size deleted'); await load() }} />
                </Panel>}
                {tab === 'storefront' && <Panel title="Heights" icon={Box} action={<ActionButton onClick={() => openHeight()} label="Add Height" />}>
                  <MiniList rows={catalogHeights} primary="height" secondary="status" onEdit={openHeight} onDelete={async (row) => { await adminApi.deleteHeight(row.id); toast.success('Height deleted'); await load() }} />
                </Panel>}
                {tab === 'storefront' && <Panel title="Hero Banners" icon={ImageIcon} action={<ActionButton onClick={() => openHero()} label="Add Hero" />}>
                  <MiniList rows={heroes} primary="title" secondary="ctaLink" onEdit={openHero} onDelete={async (row) => { await adminApi.deleteHeroBanner(row.id); toast.success('Hero deleted'); await load() }} />
                </Panel>}
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <OrdersPanel
                orders={orders.items}
                filters={orderFilters}
                selectedOrders={selectedOrders}
                onFiltersChange={setOrderFilters}
                onApplyFilters={loadOrders}
                onExportCsv={exportOrdersCsv}
                onToggleOrder={(id) => setSelectedOrders(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])}
                onToggleAll={(ids) => setSelectedOrders(current => current.length === ids.length ? [] : ids)}
                onOpenOrder={async (row) => {
                  setOrderDetailLoading(true)
                  try { setOrderDetail(await adminApi.order(row.id)) }
                  catch (error) { toast.error(error.message || 'Could not load order details') }
                  finally { setOrderDetailLoading(false) }
                }}
                onBulkUpdate={async (patch) => {
                  if (!selectedOrders.length) return toast.error('Select at least one order')
                  await adminApi.bulkUpdateOrders({ ids: selectedOrders, ...patch })
                  toast.success(`${selectedOrders.length} order(s) updated`)
                  await loadOrders()
                }}
                reload={() => loadOrders()}
                summary={orders.summary}
              />
            )}
            {tab === 'returns' && (
              <ReturnsAdminPanel
                requests={returnRequests}
                filters={returnFilters}
                onFiltersChange={setReturnFilters}
                onApply={() => loadReturnRequests(returnFilters)}
                onClear={() => { const c={search:'',type:'',status:''}; setReturnFilters(c); loadReturnRequests(c)}}
                onPreview={setPreview}
                onAction={async (action, row, remarks) => {
                  try {
                    if (action==='approve') await adminApi.approveReturnExchange(row.id, { adminRemarks: remarks })
                    else if (action==='reject') await adminApi.rejectReturnExchange(row.id, { adminRemarks: remarks })
                    else if (action==='refund') await adminApi.refundReturnExchange(row.id, { adminRemarks: remarks })
                    toast.success(`${action} successful`)
                    await loadReturnRequests()
                  } catch(e){ toast.error(e.message) }
                }}
              />
            )}
            {tab === 'users' && <Panel title="Users" icon={UserCog}><DataTable rows={users.items} columns={['name','email','phone','status','is_active','created_at']} actions={(row) => <UserActions row={row} reload={load} />} /></Panel>}
            {tab === 'coupons' && <Panel title="Coupons" icon={TicketPercent} action={<ActionButton onClick={() => openCoupon()} label="Add Coupon" />}><DataTable rows={coupons.items} columns={['code','type','value','minCart','status','startsAt','endsAt']} actions={(row) => <RowActions onEdit={() => openCoupon(row)} onDelete={async () => { await adminApi.deleteCoupon(row.id); toast.success('Coupon deleted'); await load() }} />} /></Panel>}
          </div>
        </section>
      </div>
      {modal === 'product-view' && <Modal title="View Product" onClose={closeModal}><ProductForm form={productForm} setForm={setProductForm} categories={categories} catalogColors={catalogColors} catalogSizes={catalogSizes} catalogHeights={catalogHeights} onPreview={setPreview} onCancel={closeModal} onShowMapping={() => setVariantMappingOpen(true)} readOnly /></Modal>}

      {modal === 'product' && <Modal title={editingProductId ? 'Edit Product' : 'Add Product'} onClose={closeModal}><ProductForm form={productForm} setForm={setProductForm} categories={categories} catalogColors={catalogColors} catalogSizes={catalogSizes} catalogHeights={catalogHeights} onPreview={setPreview} onSave={saveProduct} onCancel={closeModal} onShowMapping={() => setVariantMappingOpen(true)} saving={saving === 'product'} /></Modal>}
      {variantMappingOpen && <VariantMappingModal rows={buildVariantRows(productForm.colorVariants)} onClose={() => setVariantMappingOpen(false)} />}
      {modal === 'category' && <Modal title={editingCategoryId ? 'Edit Category' : 'Add Category'} onClose={closeModal}><CategoryForm form={categoryForm} setForm={setCategoryForm} onPreview={setPreview} onSave={saveCategory} onCancel={closeModal} saving={saving === 'category'} /></Modal>}
      {modal === 'color' && <Modal title={editingColorId ? 'Edit Color' : 'Add Color'} onClose={closeModal}><ColorForm form={colorForm} setForm={setColorForm} onSave={saveColor} onCancel={closeModal} saving={saving === 'color'} /></Modal>}
      {modal === 'size' && <Modal title={editingSizeId ? 'Edit Size' : 'Add Size'} onClose={closeModal}><SizeForm form={sizeForm} setForm={setSizeForm} onSave={saveSize} onCancel={closeModal} saving={saving === 'size'} /></Modal>}
      {modal === 'height' && <Modal title={editingHeightId ? 'Edit Height' : 'Add Height'} onClose={closeModal}><HeightForm form={heightForm} setForm={setHeightForm} onSave={saveHeight} onCancel={closeModal} saving={saving === 'height'} /></Modal>}
      {modal === 'hero' && <Modal title={editingHeroId ? 'Edit Hero Banner' : 'Add Hero Banner'} onClose={closeModal}><HeroForm form={heroForm} setForm={setHeroForm} onPreview={setPreview} onSave={saveHero} onCancel={closeModal} saving={saving === 'hero'} /></Modal>}
      {modal === 'coupon' && <Modal title={editingCouponId ? 'Edit Coupon' : 'Add Coupon'} onClose={closeModal}><CouponForm form={couponForm} setForm={setCouponForm} onSave={saveCoupon} onCancel={closeModal} saving={saving === 'coupon'} /></Modal>}
      {modal === 'shipping-zone' && <Modal title={editingShippingZoneId ? 'Edit Shipping Zone' : 'Add Shipping Zone'} onClose={closeModal}><ShippingZoneForm form={shippingZoneForm} setForm={setShippingZoneForm} onSave={saveShippingZone} onCancel={closeModal} saving={saving === 'shipping-zone'} /></Modal>}
      {preview && <PreviewModal preview={preview} onClose={() => setPreview(null)} />}
      {categoryDeleteImpact && <CategoryDeleteModal impact={categoryDeleteImpact} saving={saving === 'category-delete'} onCancel={() => setCategoryDeleteImpact(null)} onConfirm={confirmCategoryDelete} />}
      {orderDetailLoading && <LoadingOverlay message="Loading order details..." />}
      {orderDetail && <OrderDetailModal order={orderDetail} onClose={() => setOrderDetail(null)} onUpdated={async () => { await loadOrders(); setOrderDetail(null) }} />}
    </main>
  )
}

function toDateInput(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function slugifyClient(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function StatCard({ label, value, Icon }) {
  return <div className="rounded-lg border border-line bg-white p-4 shadow-sm"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={18}/></div><p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>
}

function Panel({ title, icon: Icon, children, action }) {
  return <section className="mt-5 rounded-lg border border-line bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div className="flex items-center gap-2"><Icon size={18} className="text-primary"/><h3 className="font-display text-xl font-black">{title}</h3></div>{action}</div><div className="p-5">{children}</div></section>
}

function SettingsSaveButton({ onClick, saving, label }) {
  return <button onClick={onClick} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-75">{saving ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>} {saving ? 'Saving...' : label}</button>
}

function ContentSection({ title, children }) {
  return <div className="mt-6 border-t border-line pt-5 first:mt-0 first:border-t-0 first:pt-0"><p className="mb-3 text-sm font-black text-ink">{title}</p>{children}</div>
}

function ActionButton({ onClick, label }) {
  return <button onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white hover:bg-primary"><Plus size={16}/>{label}</button>
}

function Modal({ title, children, onClose }) {
  return <div className="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6 backdrop-blur-sm"><div className="w-full max-w-4xl rounded-lg border border-line bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-line px-5 py-4"><h3 className="font-display text-2xl font-black">{title}</h3><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:border-primary hover:text-primary"><X size={18}/></button></div><div className="p-5">{children}</div></div></div>
}

function Field({ label, value, onChange, type = 'text', placeholder = '', readOnly = false }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">{label}</span><input type={type} value={value ?? ''} placeholder={placeholder || label} readOnly={readOnly} disabled={readOnly} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted" /></label>
}

function DynamicTextListEditor({ items = [], onChange, label, addLabel = 'Add item', maxItems = 6, placeholder = '' }) {
  const list = Array.isArray(items) ? items : []

  const updateItem = (index, value) => {
    const nextItems = [...list]
    nextItems[index] = value
    onChange(nextItems)
  }

  const addItem = () => {
    if (list.length >= maxItems) {
      toast.error(`You can add up to ${maxItems} items.`)
      return
    }
    onChange([...list, ''])
  }

  return <div className="space-y-3">
    {list.map((item, index) => (
      <div key={`${label}-${index}`} className="rounded-lg border border-line bg-surface-alt/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-ink">{label} {index + 1}</p>
          <button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="text-xs font-bold text-red-500">Delete</button>
        </div>
        <Field label={`${label} ${index + 1}`} placeholder={placeholder} value={item ?? ''} onChange={value => updateItem(index, value)} />
      </div>
    ))}
    {list.length < maxItems && (
      <button type="button" onClick={addItem} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink hover:border-primary hover:text-primary">
        <Plus size={16}/> {addLabel}
      </button>
    )}
  </div>
}

function DynamicOfferEditor({ items = [], onChange, addLabel = 'Add offer', maxItems = 4 }) {
  const list = Array.isArray(items) ? items : []

  const updateItem = (index, patch) => {
    const nextItems = [...list]
    nextItems[index] = { ...(nextItems[index] || {}), ...patch }
    onChange(nextItems)
  }

  const addItem = () => {
    if (list.length >= maxItems) {
      toast.error(`You can add up to ${maxItems} offers.`)
      return
    }
    onChange([...list, { title: '', description: '' }])
  }

  return <div className="space-y-3">
    {list.map((item, index) => (
      <div key={`offer-${index}`} className="rounded-lg border border-line bg-surface-alt/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-ink">Offer {index + 1}</p>
          <button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="text-xs font-bold text-red-500">Delete</button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label={`Offer ${index + 1} title`} placeholder="e.g. New arrivals" value={item?.title ?? ''} onChange={value => updateItem(index, { title: value })} />
          <Area label={`Offer ${index + 1} description`} value={item?.description ?? ''} onChange={value => updateItem(index, { description: value })} />
        </div>
      </div>
    ))}
    {list.length < maxItems && (
      <button type="button" onClick={addItem} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink hover:border-primary hover:text-primary">
        <Plus size={16}/> {addLabel}
      </button>
    )}
  </div>
}

function DynamicValueEditor({ items = [], onChange, addLabel = 'Add reason', maxItems = 4 }) {
  const list = Array.isArray(items) ? items : []

  const updateItem = (index, patch) => {
    const nextItems = [...list]
    nextItems[index] = { ...(nextItems[index] || {}), ...patch }
    onChange(nextItems)
  }

  const addItem = () => {
    if (list.length >= maxItems) {
      toast.error(`You can add up to ${maxItems} reasons.`)
      return
    }
    onChange([...list, { title: '', description: '' }])
  }

  return <div className="space-y-3">
    {list.map((item, index) => (
      <div key={`value-${index}`} className="rounded-lg border border-line bg-surface-alt/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-ink">Reason {index + 1}</p>
          <button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="text-xs font-bold text-red-500">Delete</button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label={`Reason ${index + 1} title`} placeholder="e.g. Premium quality" value={item?.title ?? ''} onChange={value => updateItem(index, { title: value })} />
          <Area label={`Reason ${index + 1} description`} value={item?.description ?? ''} onChange={value => updateItem(index, { description: value })} />
        </div>
      </div>
    ))}
    {list.length < maxItems && (
      <button type="button" onClick={addItem} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink hover:border-primary hover:text-primary">
        <Plus size={16}/> {addLabel}
      </button>
    )}
  </div>
}

function Area({ label, value, onChange, readOnly = false }) {
  return <label className="mt-4 block"><span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">{label}</span><textarea value={value ?? ''} readOnly={readOnly} disabled={readOnly} onChange={e => onChange(e.target.value)} rows={4} className="mt-1.5 w-full rounded-lg border border-line bg-surface-alt px-3 py-2 text-sm font-semibold outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted" /></label>
}

function SelectField({ label, value, onChange, children, readOnly = false }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">{label}</span><select value={value ?? ''} disabled={readOnly} onChange={e => onChange(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted">{children}</select></label>
}

function FileUpload({ label, kind = 'image', onUploaded }) {
  const [busy, setBusy] = useState(false)
  const recommended = /hero/i.test(label) ? '1920 × 700 px' : /logo/i.test(label) ? '300 × 120 px' : /category/i.test(label) ? '1200 × 400 px' : '1000 × 1000 px'
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const uploaded = await adminApi.uploadMedia(file, kind)
      onUploaded(uploaded.url)
      toast.success(`${kind === 'video' ? 'Video' : 'Image'} uploaded`)
    } catch (error) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }
  return <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface-alt px-4 py-5 text-center hover:border-primary"><Upload size={22} className="mb-2 text-primary"/><span className="text-sm font-black">{busy ? 'Uploading...' : label}</span><span className="mt-1 text-xs text-ink-muted">Recommended: {kind === 'video' ? '16:9 landscape' : recommended}. Choose from device; uploads are not restricted.</span><input disabled={busy} type="file" accept={kind === 'video' ? 'video/*' : 'image/*'} onChange={e => upload(e.target.files?.[0])} className="hidden" /></label>
}

function PremiumToggle({ label, checked, onChange, disabled = false }) {
  return <label className={`inline-flex w-fit items-center gap-3 rounded-full border px-3 py-2 text-sm font-black transition ${checked ? 'border-primary/30 bg-primary/10 text-primary' : 'border-line bg-white text-ink'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <span className="text-sm font-black">{label}</span>
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? 'bg-primary' : 'bg-line-dark'} disabled:cursor-not-allowed`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </label>
}

function updateProductPricing(form, patch) {
  const mrp = patch.mrp !== undefined ? patch.mrp : form.mrp
  const sellPrice = patch.sellPrice !== undefined ? patch.sellPrice : form.sellPrice
  const numMrp = Number(mrp) || 0
  const numSellPrice = Number(sellPrice) || 0
  return {
    ...form,
    ...patch,
    mrp,
    sellPrice,
    off: computeDiscountPercent(numMrp, numSellPrice)
  }
}

function ProductForm({ form, setForm, categories, catalogColors = [], catalogSizes = [], catalogHeights = [], onPreview, onSave, onCancel, onShowMapping, saving = false, readOnly = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  const setName = (value) => {
    const autoFromOld = slugifyClient(form.name)
    setForm({ ...form, name: value, slug: !form.slug || form.slug === autoFromOld ? slugifyClient(value) : form.slug })
  }
  const setPricing = (patch) => setForm(updateProductPricing(form, patch))
  const totalStock = buildVariantRows(form.colorVariants).reduce((sum, row) => sum + row.stock, 0)
  const hasStock = form.colorVariants?.some(c => c.sizes?.some(s => Number(s.stock||0) > 0))
  const selectedCategory = categories.find(cat => cat.slug === form.category) || categories[0]
  const subcategories = selectedCategory?.subcategories || []
  useEffect(() => {
    if (readOnly || !categories.length) return
    if (!categories.some(cat => cat.slug === form.category)) {
      setForm({ ...form, category: categories[0].slug, subcategory: categories[0].subcategories?.[0]?.slug || '' })
    }
  }, [categories])
  const setCategory = (slug) => {
    const nextCategory = categories.find(cat => cat.slug === slug)
    const nextSubcategory = nextCategory?.subcategories?.[0]?.slug || ''
    setForm({ ...form, category: slug, subcategory: nextSubcategory })
  }
  return <div className="grid gap-5">
    <div className="grid gap-3 md:grid-cols-2"><Field label="Name" value={form.name} onChange={setName} readOnly={readOnly} /><Field label="Slug" value={form.slug} onChange={v => set('slug', v)} readOnly={readOnly} /></div>
    <div className="grid gap-3 md:grid-cols-3">
      <SelectField label="Category" value={form.category} onChange={setCategory} readOnly={readOnly}>{categories.map(cat => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}</SelectField>
      <SelectField label="Subcategory" value={form.subcategory} onChange={v => set('subcategory', v)} readOnly={readOnly}>
        <option value="">Select subcategory</option>
        {subcategories.map(sub => <option key={sub.id || sub.slug} value={sub.slug}>{sub.name}</option>)}
      </SelectField>
      <Field label="Brand" value={form.brand} onChange={v => set('brand', v)} readOnly={readOnly} />
    </div>
    <Field label="SKU (product-level)" value={form.sku || ''} onChange={v => set('sku', v)} readOnly={readOnly} placeholder="e.g. GA-KURTA-001" />
    <div className="mt-3">
      <SectionLabel label="Size Guide (optional)" />
      <p className="mb-2 text-xs text-ink-muted">Upload size guide image shown on PDP when customer clicks Size Guide.</p>
      <FileUpload label="Upload size guide image" onUploaded={url => set('sizeGuideImage', url)} />
      {form.sizeGuideImage && <MediaGrid items={[form.sizeGuideImage]} onPreview={(url) => onPreview({ type: 'image', url, title: 'Size guide' })} onRemove={() => set('sizeGuideImage', '')} />}
    </div>
    <div className="grid gap-3 md:grid-cols-4"><Field label="Base selling price" placeholder="e.g. 999" type="number" value={form.sellPrice} onChange={v => setPricing({ sellPrice: v })} readOnly={readOnly} /><Field label="Base MRP" placeholder="e.g. 1299" type="number" value={form.mrp} onChange={v => setPricing({ mrp: v })} readOnly={readOnly} /><Field label="Discount %" type="number" value={form.off} onChange={() => {}} readOnly /><Field label="Total stock" type="number" value={totalStock} onChange={() => {}} readOnly /></div>
    {!readOnly && <p className="-mt-2 text-xs text-ink-muted">Discount % is calculated automatically from base MRP and base selling price.</p>}
    <div className="grid gap-3 md:grid-cols-2"><Field label="Rating" type="number" value={form.rating} onChange={v => set('rating', Math.min(5, Math.max(0, v)))} readOnly={readOnly} /><Field label="Reviews" type="number" value={form.reviews} onChange={v => set('reviews', Math.max(0, v))} readOnly={readOnly} /></div>
    {!readOnly && (
      <div className="rounded-xl border border-line bg-surface-alt p-4">
        <SectionLabel label="Product Availability" />
        <p className="mb-3 text-xs text-ink-muted">Controls purchaseability while keeping product visible in listings/PDP. Does not change actual stock numbers.</p>
        <div className="flex gap-2">
          <button type="button" disabled={readOnly} onClick={() => {
            if (readOnly) return
            if (!hasStock) {
              toast.error('This product has no available stock in any variant. Please add stock to at least one size/height variant before marking the product as In Stock.')
              return
            }
            set('isInStock', true)
          }} className={`flex-1 h-11 rounded-lg border-2 font-bold text-sm transition ${form.isInStock !== false ? 'border-green-600 bg-green-600 text-white shadow' : 'border-line bg-white text-ink-muted hover:border-green-300'} ${!hasStock ? 'opacity-60 cursor-not-allowed' : ''}`}>In Stock</button>
          <button type="button" disabled={readOnly} onClick={() => !readOnly && set('isInStock', false)} className={`flex-1 h-11 rounded-lg border-2 font-bold text-sm transition ${form.isInStock === false ? 'border-red-600 bg-red-600 text-white shadow' : 'border-line bg-white text-ink-muted hover:border-red-300'}`}>Sold Out</button>
        </div>
        {!hasStock && <p className="mt-2 text-xs font-semibold text-amber-600">No variant has stock — product will be Sold Out on save. Add stock to enable In Stock.</p>}
        {form.isInStock === false && <p className="mt-2 text-xs font-semibold text-red-600">This product is currently sold out</p>}
      </div>
    )}
    <Area label="Description" value={form.description} onChange={v => set('description', v)} readOnly={readOnly} />
    <div className="grid gap-3 md:grid-cols-2"><Field label="Material" value={form.material} onChange={v => set('material', v)} readOnly={readOnly} /><Field label="Care" value={form.care} onChange={v => set('care', v)} readOnly={readOnly} /></div>
    <div className="mt-3">
      <SectionLabel label="Highlights (optional)" />
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Product Category" value={form.highlights?.category || ''} onChange={v => set('highlights', { ...(form.highlights || {}), category: v })} readOnly={readOnly} />
        <Field label="Product Type" value={form.highlights?.type || ''} onChange={v => set('highlights', { ...(form.highlights || {}), type: v })} readOnly={readOnly} />
        <Field label="Fit" value={form.highlights?.fit || ''} onChange={v => set('highlights', { ...(form.highlights || {}), fit: v })} readOnly={readOnly} />
      </div>
      <div className="grid gap-3 md:grid-cols-3 mt-3">
        <Field label="Closure" value={form.highlights?.closure || ''} onChange={v => set('highlights', { ...(form.highlights || {}), closure: v })} readOnly={readOnly} />
        <Field label="Length" value={form.highlights?.length || ''} onChange={v => set('highlights', { ...(form.highlights || {}), length: v })} readOnly={readOnly} />
        <Field label="Fabric" value={form.highlights?.fabric || ''} onChange={v => set('highlights', { ...(form.highlights || {}), fabric: v })} readOnly={readOnly} />
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-2"><Field label="Tag" value={form.tag} onChange={v => set('tag', v)} readOnly={readOnly} /><Field label="Offer tag" value={form.offerTag} onChange={v => set('offerTag', v)} readOnly={readOnly} /></div>
    <PremiumToggle label="Featured product" checked={form.isFeatured} disabled={readOnly} onChange={checked => set('isFeatured', checked)} />
    <ColorVariantEditor rows={form.colorVariants} colors={catalogColors} sizes={catalogSizes} heights={catalogHeights} baseMrp={form.mrp} baseSellPrice={form.sellPrice} onChange={rows => set('colorVariants', rows)} onPreview={onPreview} readOnly={readOnly} />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-alt px-4 py-3">
      <div>
        <p className="text-sm font-black text-ink">Variant mapping</p>
        <p className="text-xs text-ink-muted">Review color, size, stock and image mapping before saving.</p>
      </div>
      <button type="button" onClick={onShowMapping} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black hover:border-primary hover:text-primary">
        <Table2 size={16}/> View mapping table
      </button>
    </div>
    <FormActions onSave={onSave} onCancel={onCancel} saving={saving} readOnly={readOnly} />
  </div>
}

function CategoryForm({ form, setForm, onPreview, onSave, onCancel, saving = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  const subcategories = form.subcategories?.length ? form.subcategories : [{ name: '', slug: '', sortOrder: 0 }]
  const setSubcategories = (rows) => set('subcategories', rows)
  return <div className="grid gap-4">
    <div className="grid gap-3 md:grid-cols-2"><Field label="Name" value={form.name} onChange={v => {
      const autoFromOld = slugifyClient(form.name)
      setForm({ ...form, name: v, slug: !form.slug || form.slug === autoFromOld ? slugifyClient(v) : form.slug })
    }} /><Field label="Slug" value={form.slug} onChange={v => set('slug', v)} /></div>
    <SubcategoryEditor rows={subcategories} onChange={setSubcategories} />
    <FileUpload label="Upload category image" onUploaded={url => set('imageUrl', url)} />
    {form.imageUrl && <MediaGrid items={[form.imageUrl]} onPreview={(url) => onPreview({ type: 'image', url, title: form.name || 'Category image' })} onRemove={() => set('imageUrl', '')} />}
    <div className="grid gap-3 md:grid-cols-2"><Field label="Sort order" type="number" value={form.sortOrder} onChange={v => set('sortOrder', v)} /><SelectField label="Status" value={form.status} onChange={v => set('status', v)}><option>active</option><option>draft</option><option>inactive</option></SelectField></div>
    <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
  </div>
}

function ColorForm({ form, setForm, onSave, onCancel, saving = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  return <div className="grid gap-4">
    <div className="grid gap-3 md:grid-cols-[1fr_5rem]"><Field label="Name" value={form.name} onChange={v => set('name', v)} /><label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Swatch</span><input type="color" value={form.hex} onChange={e => set('hex', e.target.value)} className="h-11 w-full rounded-lg border border-line bg-white p-1" /></label></div>
    <div className="grid gap-3 md:grid-cols-2"><Field label="Sort order" type="number" value={form.sortOrder} onChange={v => set('sortOrder', v)} /><SelectField label="Status" value={form.status} onChange={v => set('status', v)}><option>active</option><option>draft</option><option>inactive</option></SelectField></div>
    <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
  </div>
}

function SizeForm({ form, setForm, onSave, onCancel, saving = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  return <div className="grid gap-4">
    <Field label="Size" value={form.size} onChange={v => set('size', v)} />
    <div className="grid gap-3 md:grid-cols-2"><Field label="Sort order" type="number" value={form.sortOrder} onChange={v => set('sortOrder', v)} /><SelectField label="Status" value={form.status} onChange={v => set('status', v)}><option>active</option><option>draft</option><option>inactive</option></SelectField></div>
    <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
  </div>
}

function HeightForm({ form, setForm, onSave, onCancel, saving = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  return <div className="grid gap-4">
    <Field label="Height" placeholder="e.g. 5'8&quot;" value={form.height} onChange={v => set('height', v)} />
    <div className="grid gap-3 md:grid-cols-2"><Field label="Sort order" type="number" value={form.sortOrder} onChange={v => set('sortOrder', v)} /><SelectField label="Status" value={form.status} onChange={v => set('status', v)}><option>active</option><option>draft</option><option>inactive</option></SelectField></div>
    <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
  </div>
}

function SubcategoryEditor({ rows, onChange }) {
  const update = (index, patch) => onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row))
  return <div>
    <SectionLabel label="Subcategories" />
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_5rem_auto] gap-2">
          <input value={row.name || ''} onChange={e => update(index, { name: e.target.value, slug: !row.slug || row.slug === slugifyClient(row.name) ? slugifyClient(e.target.value) : row.slug })} placeholder="Subcategory name" className="h-10 rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary" />
          <input value={row.slug || ''} onChange={e => update(index, { slug: e.target.value })} placeholder="slug" className="h-10 rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary" />
          <input type="number" value={row.sortOrder ?? index} onChange={e => update(index, { sortOrder: Number(e.target.value) })} className="h-10 rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary" />
          <button onClick={() => onChange(rows.filter((_, i) => i !== index))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50" aria-label="Remove subcategory"><Trash2 size={14}/></button>
        </div>
      ))}
    </div>
    <button onClick={() => onChange([...rows, { name: '', slug: '', sortOrder: rows.length }])} className="mt-2 h-10 rounded-lg border border-line px-4 text-sm font-bold hover:border-primary hover:text-primary">Add subcategory</button>
  </div>
}

function HeroForm({ form, setForm, onPreview, onSave, onCancel, saving = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  return <div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={form.title} onChange={v => set('title', v)} /><Field label="Kicker" value={form.kicker} onChange={v => set('kicker', v)} /></div><Area label="Subtitle" value={form.subtitle} onChange={v => set('subtitle', v)} /><div className="grid gap-3 md:grid-cols-2"><Field label="CTA label" value={form.ctaLabel} onChange={v => set('ctaLabel', v)} /><Field label="CTA link" value={form.ctaLink} onChange={v => set('ctaLink', v)} /></div><div className="grid gap-3 md:grid-cols-2"><FileUpload label="Upload hero image" onUploaded={url => set('imageUrl', url)} /><FileUpload label="Upload hero video" kind="video" onUploaded={url => set('videoUrl', url)} /></div>{form.imageUrl && <MediaGrid items={[form.imageUrl]} onPreview={(url) => onPreview({ type: 'image', url, title: form.title || 'Hero image' })} onRemove={() => set('imageUrl', '')} />}{form.videoUrl && <MediaGrid items={[form.videoUrl]} type="video" onPreview={(url) => onPreview({ type: 'video', url, title: form.title || 'Hero video' })} onRemove={() => set('videoUrl', '')} />}<div className="grid gap-3 md:grid-cols-2"><Field label="Sort order" type="number" value={form.sortOrder} onChange={v => set('sortOrder', v)} /><SelectField label="Status" value={form.status} onChange={v => set('status', v)}><option>active</option><option>draft</option><option>inactive</option></SelectField></div><FormActions onSave={onSave} onCancel={onCancel} saving={saving} /></div>
}

function CouponForm({ form, setForm, onSave, onCancel, saving = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  return <div className="grid gap-4">
    <div className="grid gap-3 md:grid-cols-2"><Field label="Code" value={form.code} onChange={v => set('code', v.toUpperCase())} /><SelectField label="Type" value={form.type} onChange={v => set('type', v)}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option><option value="shipping">Free shipping</option></SelectField></div>
    <div className="grid gap-3 md:grid-cols-2"><Field label={form.type === 'percentage' ? 'Discount percent' : 'Value'} type="number" value={form.value} onChange={v => set('value', v)} /><Field label="Minimum cart" type="number" value={form.minCart} onChange={v => set('minCart', v)} /></div>
    <Area label="Description" value={form.description} onChange={v => set('description', v)} />
    <div className="grid gap-3 md:grid-cols-2"><Field label="Starts at" type="date" value={form.startsAt} onChange={v => set('startsAt', v)} /><Field label="Ends at" type="date" value={form.endsAt} onChange={v => set('endsAt', v)} /></div>
    <SelectField label="Status" value={form.status} onChange={v => set('status', v)}><option>active</option><option>draft</option><option>inactive</option></SelectField>
    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} /> Available to customers</label>
    <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
  </div>
}

function ShippingZoneForm({ form, setForm, onSave, onCancel, saving = false }) {
  const set = (key, value) => setForm({ ...form, [key]: value })
  const STATES = ['Delhi','Haryana','Punjab','Uttar Pradesh','Uttarakhand','Himachal Pradesh','Jammu & Kashmir','Ladakh','Chandigarh','Tamil Nadu','Karnataka','Kerala','Andhra Pradesh','Telangana','Puducherry','Lakshadweep','West Bengal','Odisha','Bihar','Jharkhand','Sikkim','Andaman & Nicobar','Maharashtra','Gujarat','Rajasthan','Goa','Dadra & Nagar Haveli','Daman & Diu','Madhya Pradesh','Chhattisgarh','Assam','Arunachal Pradesh','Manipur','Meghalaya','Mizoram','Nagaland','Tripura']
  return <div className="grid gap-4">
    <Field label="Zone Name" value={form.name} onChange={v => set('name', v)} placeholder="e.g. North India" />
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Fee (₹)" type="number" min="0" value={form.fee} onChange={v => set('fee', Number(v || 0))} />
      <Field label="Free Shipping Above (₹)" type="number" min="0" value={form.freeThreshold} onChange={v => set('freeThreshold', Number(v || 0))} />
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Est. Min Days" type="number" min="1" value={form.estimatedDaysMin} onChange={v => set('estimatedDaysMin', Number(v || 1))} />
      <Field label="Est. Max Days" type="number" min="1" value={form.estimatedDaysMax} onChange={v => set('estimatedDaysMax', Number(v || 1))} />
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Sort Order" type="number" value={form.sortOrder} onChange={v => set('sortOrder', Number(v || 0))} />
      <SelectField label="Status" value={form.isActive ? 'active' : 'inactive'} onChange={v => set('isActive', v === 'active')}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </SelectField>
    </div>
    <div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-ink-muted">States covered</span>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-auto p-3 border border-line rounded-lg bg-surface-alt">
          {STATES.map(state => (
            <label key={state} className="flex items-center gap-1.5 whitespace-nowrap">
              <input type="checkbox" checked={form.states?.includes(state)} onChange={e => set('states', e.target.checked ? [...(form.states || []), state] : (form.states || []).filter(s => s !== state))} className="w-4 h-4 rounded border-line text-primary" />
              <span className="text-sm text-ink">{state}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-muted">Select all states this zone applies to</p>
      </label>
    </div>
    <FormActions onSave={onSave} onCancel={onCancel} saving={saving} />
  </div>
}

function AnnouncementEditor({ value, onChange }) {
  const rows = value?.length ? value : ['']
  return <div className="mt-4">
    <SectionLabel label="Announcement bars" />
    <div className="space-y-2">
      {rows.map((message, index) => (
        <div key={index} className="flex gap-2">
          <input value={message} onChange={e => onChange(rows.map((item, i) => i === index ? e.target.value : item))} placeholder={`Announcement ${index + 1}`} className="h-10 flex-1 rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold outline-none focus:border-primary" />
          <button onClick={() => onChange(rows.filter((_, i) => i !== index))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50" aria-label="Remove announcement"><Trash2 size={15}/></button>
        </div>
      ))}
    </div>
    <button onClick={() => onChange([...rows, ''])} className="mt-2 h-10 rounded-lg border border-line px-4 text-sm font-bold hover:border-primary hover:text-primary">Add announcement</button>
  </div>
}

function MediaGrid({ items, type = 'image', onPreview, onRemove, readOnly = false }) {
  if (!items?.length) return null
  return <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
    {items.map((url, index) => (
      <div key={`${url}-${index}`} className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="relative aspect-[4/3] bg-surface-alt">
          {type === 'video' ? <video src={url} className="h-full w-full object-cover" muted /> : <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex items-center justify-between gap-2 p-2">
          <span className="truncate text-xs font-bold text-ink-muted">{type === 'video' ? 'Video' : `Image ${index + 1}`}</span>
          <div className="flex gap-1">
            <button onClick={() => onPreview(url)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-primary hover:text-primary" aria-label="Preview media"><Eye size={15}/></button>
            {!readOnly && <button onClick={() => onRemove(index)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50" aria-label="Remove media"><Trash2 size={14}/></button>}
          </div>
        </div>
      </div>
    ))}
  </div>
}

function ColorVariantEditor({ rows, colors = [], sizes = [], heights = [], baseMrp = 0, baseSellPrice = 0, onChange, onPreview, readOnly = false }) {
  const updateColor = (index, patch) => onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row))
  const updateSizes = (index, sizes) => updateColor(index, { sizes })
  const updateImages = (index, images) => updateColor(index, { images })

  return <div>
    <SectionLabel label="Colors, images & stock" />
    <p className="mb-3 text-xs text-ink-muted">New variants inherit base pricing; you can override each variant’s MRP and selling price. Add height per variant (e.g. 5&apos;8&quot;).</p>
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={index} className="rounded-xl border border-line bg-surface-alt p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_4rem]">
            <select value={row.name ?? ''} disabled={readOnly} onChange={e => {
              const color = colors.find(item => item.name === e.target.value)
              updateColor(index, { name: e.target.value, hex: color?.hex || row.hex || '#111111' })
            }} className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted">
              <option value="">Select color</option>
              {colors.map(color => <option key={color.id || `${color.name}-${color.hex}`} value={color.name}>{color.name}</option>)}
            </select>
            <input type="color" value={row.hex || '#111111'} disabled={readOnly} onChange={e => updateColor(index, { hex: e.target.value })} className="h-10 rounded-lg border border-line bg-white p-1 disabled:cursor-not-allowed disabled:opacity-70" title="Color swatch" />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-ink-muted">Images for {row.name || 'this color'}</p>
            {!readOnly && <FileUpload label={`Upload image for ${row.name || 'color'}`} onUploaded={url => updateImages(index, [...(row.images || []).filter(Boolean), url])} />}
            <MediaGrid items={(row.images || []).filter(Boolean)} onPreview={(url) => onPreview({ type: 'image', url, title: `${row.name || 'Color'} image` })} onRemove={(imageIndex) => updateImages(index, (row.images || []).filter(Boolean).filter((_, i) => i !== imageIndex))} readOnly={readOnly} />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-ink-muted">Sizes · Height & stock</p>
            <div className="space-y-2">
              <div className="hidden gap-2 px-1 text-[10px] font-black uppercase tracking-[0.1em] text-ink-muted md:grid" style={{ gridTemplateColumns: 'minmax(110px,1fr) minmax(110px,1fr) 100px 100px 80px 44px' }}>
                <span>Size</span><span>Height</span><span>Selling price</span><span>MRP</span><span>Stock</span><span />
              </div>
              {(row.sizes || []).map((size, sizeIndex) => (
                <div key={sizeIndex} className="grid gap-2 md:grid-cols-[minmax(110px,1fr)_minmax(110px,1fr)_100px_100px_80px_44px]">
                  <select value={size.size ?? ''} disabled={readOnly} onChange={e => updateSizes(index, row.sizes.map((item, i) => i === sizeIndex ? { ...item, size: e.target.value } : item))} className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted">
                    <option value="">Select size</option>
                    {sizes.map(option => <option key={option.id || option.size} value={option.size}>{option.size}</option>)}
                  </select>
                  {heights.length ? (
                    <select value={size.height ?? ''} disabled={readOnly} onChange={e => updateSizes(index, row.sizes.map((item, i) => i === sizeIndex ? { ...item, height: e.target.value } : item))} className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted">
                      <option value="">No height</option>
                      {heights.map(h => <option key={h.id || h.height} value={h.height}>{h.height}</option>)}
                    </select>
                  ) : (
                    <input aria-label="Height" value={size.height ?? ''} disabled={readOnly} onChange={e => updateSizes(index, row.sizes.map((item, i) => i === sizeIndex ? { ...item, height: e.target.value } : item))} placeholder="e.g. 5&apos;8&quot;" className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary" />
                  )}
                  <input aria-label="Selling price" type="number" min="0" value={size.sellPrice ?? (baseSellPrice > 0 ? baseSellPrice : '')} disabled={readOnly} onChange={e => updateSizes(index, row.sizes.map((item, i) => i === sizeIndex ? { ...item, sellPrice: Number(e.target.value) || undefined } : item))} placeholder="Selling price" className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary" />
                  <input aria-label="MRP" type="number" min="0" value={size.mrp ?? (baseMrp > 0 ? baseMrp : '')} disabled={readOnly} onChange={e => updateSizes(index, row.sizes.map((item, i) => i === sizeIndex ? { ...item, mrp: Number(e.target.value) || undefined } : item))} placeholder="MRP" className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary" />
                  <input aria-label="Stock" type="number" min="0" value={size.stock ?? 0} disabled={readOnly} onChange={e => updateSizes(index, row.sizes.map((item, i) => i === sizeIndex ? { ...item, stock: Number(e.target.value) } : item))} placeholder="Stock" className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted" />
                  {!readOnly && <button onClick={() => updateSizes(index, row.sizes.filter((_, i) => i !== sizeIndex))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50" aria-label="Remove size"><Trash2 size={14}/></button>}
                </div>
              ))}
            </div>
            {!readOnly && <button onClick={() => updateSizes(index, [...(row.sizes || []), { size: '', height: '', stock: 0, mrp: baseMrp > 0 ? baseMrp : undefined, sellPrice: baseSellPrice > 0 ? baseSellPrice : undefined }])} className="mt-2 h-9 rounded-lg border border-line px-3 text-xs font-bold hover:border-primary hover:text-primary">Add quantity</button>}
          </div>

          {!readOnly && rows.length > 1 && <button onClick={() => onChange(rows.filter((_, i) => i !== index))} className="mt-4 text-xs font-bold text-red-500">Remove color</button>}
        </div>
      ))}
    </div>
    {!readOnly && <button onClick={() => onChange([...rows, { name: '', hex: '#111111', images: [''], sizes: [{ size: '', height: '', stock: 0, mrp: baseMrp > 0 ? baseMrp : undefined, sellPrice: baseSellPrice > 0 ? baseSellPrice : undefined }] }])} className="mt-3 h-10 w-full rounded-lg border border-line text-sm font-bold hover:border-primary hover:text-primary">Add color</button>}
  </div>
}

function VariantMappingModal({ rows, onClose }) {
  return <div className="fixed inset-0 z-[960] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-4xl rounded-lg border border-line bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h3 className="font-display text-2xl font-black">Variant mapping</h3>
          <p className="text-xs text-ink-muted">Color + size + height combinations with stock and image count.</p>
        </div>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:border-primary hover:text-primary"><X size={18}/></button>
      </div>
      <div className="max-h-[70vh] overflow-auto p-5">
        {!rows.length ? <Empty /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8f9fb] text-xs uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                {['Color', 'Size', 'Height', 'Stock', 'Images'].map(label => <th key={label} className="px-4 py-3 font-black">{label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, index) => (
                <tr key={`${row.color}-${row.size}-${row.height}-${index}`}>
                  <td className="px-4 py-3 font-semibold"><span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-line" style={{ background: row.hex }} />{row.color}</span></td>
                  <td className="px-4 py-3 font-semibold">{row.size}</td>
                  <td className="px-4 py-3 font-semibold">{row.height || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{row.stock}</td>
                  <td className="px-4 py-3 font-semibold">{row.images}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
}

function PreviewModal({ preview, onClose }) {
  return <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"><div className="w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-line px-5 py-4"><h3 className="font-display text-xl font-black">{preview.title || 'Preview'}</h3><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:border-primary hover:text-primary"><X size={18}/></button></div><div className="bg-[#111318] p-4">{preview.type === 'product' ? <ProductPreview product={preview.product} /> : preview.type === 'video' ? <video src={preview.url} controls className="mx-auto max-h-[72vh] w-full rounded-lg object-contain" /> : <img src={preview.url} alt="" className="mx-auto max-h-[72vh] rounded-lg object-contain" />}</div></div></div>
}

function CategoryDeleteModal({ impact, saving, onCancel, onConfirm }) {
  const total = impact.totalProducts || 0
  const categoryName = impact.category?.name || 'this category'
  return <div className="fixed inset-0 z-[970] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-xl overflow-hidden rounded-lg border border-red-100 bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-500">Delete category</p>
          <h3 className="font-display text-2xl font-black">{categoryName}</h3>
        </div>
        <button onClick={onCancel} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:border-primary hover:text-primary" aria-label="Close delete warning"><X size={18}/></button>
      </div>
      <div className="p-5">
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm font-bold text-red-700">This will delete the category, its subcategories, and {total} related product{total === 1 ? '' : 's'}.</p>
          <p className="mt-1 text-xs font-semibold text-red-600">Products are removed from the storefront and admin catalog with this category.</p>
        </div>
        <div className="mt-4 rounded-lg border border-line">
          <div className="flex items-center justify-between border-b border-line bg-surface-alt px-4 py-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Subcategory</span>
            <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Products</span>
          </div>
          {(impact.subcategories || []).length ? impact.subcategories.map(item => (
            <div key={item.slug} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
              <span className="text-sm font-bold text-ink">{item.name}</span>
              <span className="rounded-lg bg-surface-alt px-2.5 py-1 text-xs font-black text-ink-mid">{item.productCount}</span>
            </div>
          )) : (
            <div className="px-4 py-6 text-center text-sm font-semibold text-ink-muted">No products are currently attached to this category.</div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button onClick={onCancel} disabled={saving} className="h-10 rounded-lg border border-line px-4 text-sm font-bold hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
          <button onClick={onConfirm} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70">{saving ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete category and products</button>
        </div>
      </div>
    </div>
  </div>
}

function ProductPreview({ product }) {
  const image = product.colorVariants?.[0]?.images?.[0] || product.images?.filter(Boolean)?.[0]
  const rating = Number(product.rating || 0)
  const variantRows = buildVariantRows(product.colorVariants || [])
  return <div className="mx-auto grid max-w-4xl overflow-hidden rounded-xl bg-white md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
    <div className="relative aspect-[3/4] bg-surface-alt">
      {image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-bold text-ink-muted">No image</div>}
    </div>
    <div className="p-6 md:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">{product.brand}</p>
      <h4 className="mt-2 font-display text-3xl font-black leading-tight text-ink">{product.name}</h4>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex text-primary">
          {[1, 2, 3, 4, 5].map(n => <Star key={n} size={15} fill={n <= Math.round(rating) ? 'currentColor' : 'none'} strokeWidth={1.6} />)}
        </div>
        <span className="text-sm font-semibold text-ink-muted">{rating.toFixed(1)} · {Number(product.reviews || 0)} reviews</span>
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <span className="text-3xl font-black text-ink">{money(product.sellPrice)}</span>
        <span className="text-base font-semibold text-ink-faint line-through">{money(product.mrp)}</span>
        <span className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-black text-green-700">{product.off}% OFF</span>
      </div>
      <p className="mt-5 text-sm leading-6 text-ink-mid">{product.description || 'No description added yet.'}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {variantRows.map(row => <span key={`${row.color}-${row.size}`} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-mid">{row.color} · {row.size} · {row.stock}</span>)}
      </div>
    </div>
  </div>
}

function ListEditor({ label, rows, onChange, columns, empty, readOnly = false }) {
  return <div><SectionLabel label={label} /><div className="space-y-2">{rows.map((row, index) => <div key={index} className="rounded-lg border border-line bg-surface-alt p-3"><div className="grid gap-2">{columns.map(([key, placeholder, type]) => <input key={key} type={type || 'text'} value={row[key] ?? ''} disabled={readOnly} onChange={e => onChange(rows.map((item, i) => i === index ? { ...item, [key]: type === 'number' ? Number(e.target.value) : e.target.value } : item))} placeholder={placeholder} className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-[#eef0f3] disabled:text-ink-muted" />)}</div>{!readOnly && <button onClick={() => onChange(rows.filter((_, i) => i !== index))} className="mt-2 text-xs font-bold text-red-500">Remove</button>}</div>)}</div>{!readOnly && <button onClick={() => onChange([...rows, empty])} className="mt-2 h-10 w-full rounded-lg border border-line text-sm font-bold">Add {label}</button>}</div>
}

function SectionLabel({ label }) {
  return <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-ink-muted">{label}</p>
}

function FormActions({ onSave, onCancel, saving = false, readOnly = false }) {
  return <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4"><button onClick={onCancel} disabled={saving} className="h-10 rounded-lg border border-line px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">{readOnly ? 'Close' : 'Cancel'}</button>{!readOnly && <button onClick={onSave} disabled={saving} className="inline-flex h-10 min-w-[105px] items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-75">{saving ? <RefreshCw size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {saving ? 'Saving...' : 'Save'}</button>}</div>
}

function MiniList({ rows, primary, secondary, onEdit, onDelete }) {
  if (!rows?.length) return <Empty />
  return <div className="divide-y divide-line rounded-lg border border-line">{rows.map(row => <div key={row.id} className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate font-bold">{row[primary]}</p><p className="truncate text-xs text-ink-muted">{row[secondary]}</p></div><RowActions onEdit={() => onEdit(row)} onDelete={onDelete ? () => onDelete(row) : null} /></div>)}</div>
}

function DataTable({ rows, columns, actions }) {
  if (!rows?.length) return <Empty />
  return <div className="overflow-x-auto rounded-lg border border-line"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#f8f9fb] text-xs uppercase tracking-[0.12em] text-ink-muted"><tr>{columns.map(col => <th key={col} className="px-3 py-2 font-black text-[11px]">{col.replace(/_/g, ' ')}</th>)}{actions && <th className="px-3 py-2 font-black text-[11px]">Actions</th>}</tr></thead><tbody className="divide-y divide-line bg-white">{rows.map(row => <tr key={row.id} className="hover:bg-surface-alt/70">{columns.map(col => <td key={col} className="px-3 py-2 text-xs font-semibold text-ink-mid truncate max-w-[160px]">{col.toLowerCase().includes('price') || col === 'total' ? money(row[col]) : String(row[col] ?? '-')}</td>)}{actions && <td className="px-3 py-2">{actions(row)}</td>}</tr>)}</tbody></table></div>
}

function RowActions({ onView, onEdit, onDelete }) {
  return <div className="flex gap-2">{onView && <button onClick={onView} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-primary hover:text-primary" aria-label="Preview product"><Eye size={14}/></button>}<button onClick={onEdit} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold hover:border-primary hover:text-primary">Edit</button>{onDelete && <button onClick={onDelete} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>}</div>
}

function ThemeEditor({ theme, onChange }) {
  const current = normalizeTheme(theme)
  const setPrimary = (primary, name) => onChange(buildThemeFromPrimary(primary, name || 'Custom'))
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Current theme</p>
      <div className="mt-3 rounded-xl border border-line bg-surface-alt p-4">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-xl border border-line shadow-sm" style={{ background: current.primary }} />
          <div>
            <p className="font-display text-xl font-black">{current.name}</p>
            <p className="text-xs font-semibold text-ink-muted">{current.primary} · {current.primaryDark} · {current.primaryLight}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg px-3 py-2 text-xs font-black text-white" style={{ background: current.primary }}>Primary button</span>
          <span className="rounded-lg border px-3 py-2 text-xs font-black" style={{ borderColor: current.primary, color: current.primary }}>Outline button</span>
          <span className="rounded-lg px-3 py-2 text-xs font-black" style={{ background: current.primaryLight, color: current.primaryDark }}>Accent badge</span>
        </div>
      </div>

      <p className="mt-5 mb-2 text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Custom brand color</p>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
        <input type="color" value={current.primary} onChange={e => setPrimary(e.target.value, 'Custom')} className="h-12 w-14 rounded-lg border border-line bg-white p-1" title="Pick brand color" />
        <input value={current.primary} onChange={e => setPrimary(e.target.value, 'Custom')} className="h-11 flex-1 rounded-lg border border-line bg-surface-alt px-3 text-sm font-semibold uppercase outline-none focus:border-primary" placeholder="#F97316" />
      </div>
    </div>

    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Premium presets</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {THEME_PRESETS.map(preset => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onChange(buildThemeFromPrimary(preset.primary, preset.name))}
            className={`rounded-xl border p-3 text-left transition ${current.primary === buildThemeFromPrimary(preset.primary).primary ? 'border-primary bg-primary/5 shadow-sm' : 'border-line bg-white hover:border-primary/40'}`}
          >
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full border border-line" style={{ background: preset.primary }} />
              <span className="text-sm font-black text-ink">{preset.name}</span>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-muted">Theme updates buttons, links, accents, and highlights across the customer storefront and this admin panel instantly after you click Apply Theme.</p>
    </div>
  </div>
}

function getISTToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function formatWhatsAppPhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  if (digits.startsWith('91') && digits.length === 12) return digits
  return digits
}

function parseEvidenceImages(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try { const parsed = JSON.parse(trimmed); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
    }
    // plain URL string like "http://loc..." - treat as single image
    if (trimmed.startsWith('http')) return [trimmed]
    try { const parsed = JSON.parse(trimmed); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }
  return []
}

function buildWhatsAppMessage(order) {
  const address = order.shippingAddress || {}
  const products = order.products || []
  const lines = []
  lines.push(`Ghazi Attire - Order ${order.orderNumber || order.id}`)
  lines.push('')
  lines.push('Customer:')
  lines.push(`Name: ${order.customerName || address.fullName || '-'}`)
  lines.push(`Phone: ${order.customerPhone || address.phone || '-'}`)
  lines.push('')
  lines.push('Address:')
  const addrParts = [
    address.addressLine1 || address.address_line1,
    address.addressLine2 || address.address_line2,
    [address.city, address.state].filter(Boolean).join(', '),
    address.pincode
  ].filter(Boolean)
  if (addrParts.length) lines.push(...addrParts)
  else lines.push('-')
  lines.push('')
  lines.push('Products:')
  if (!products.length) {
    lines.push('No product details available')
  } else {
    products.forEach((item, idx) => {
      lines.push('')
      lines.push(`${idx + 1}. ${item.name || 'Product'}`)
      if (item.color) lines.push(`Color: ${item.color}`)
      lines.push(`Size: ${item.size || '-'}`)
      if (item.height) lines.push(`Height: ${item.height}`)
      if (item.sku) lines.push(`SKU: ${item.sku}`)
      lines.push(`Price: ${formatPrice(item.unitPrice || 0)}`)
      lines.push(`Qty: ${item.qty || item.quantity || 1}`)
      if (item.image) lines.push(`Image: ${item.image}`)
    })
  }
  lines.push('')
  if (order.subtotal != null) lines.push(`Subtotal: ${formatPrice(order.subtotal)}`)
  if (order.discountAmount || order.discount_amount) {
    const disc = order.discountAmount ?? order.discount_amount
    if (Number(disc) > 0) lines.push(`Discount: -${formatPrice(disc)}`)
  }
  if (order.shippingAmount != null || order.shipping_amount != null) {
    const ship = order.shippingAmount ?? order.shipping_amount
    lines.push(`Shipping: ${Number(ship) === 0 ? 'FREE' : formatPrice(ship)}`)
  }
  lines.push(`Total: ${formatPrice(order.total || 0)}`)
  return lines.join('\n')
}

function openWhatsAppForOrder(order) {
  // Business WhatsApp (admin) — per requirements, admin orders WhatsApp goes to admin number
  const ADMIN_WHATSAPP = '919676083143'
  const phone = formatWhatsAppPhone(ADMIN_WHATSAPP)
  const message = buildWhatsAppMessage(order)
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
}

function OrdersPanel({ orders, filters, selectedOrders, onFiltersChange, onApplyFilters, onExportCsv, onToggleOrder, onToggleAll, onOpenOrder, onBulkUpdate, reload, summary }) {
  const allIds = orders.map(row => row.id)
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length
  const setFilter = (key, value) => onFiltersChange({ ...filters, [key]: value, ...(key === 'days' && value ? { month: '', from: '', to: '' } : {}), ...(key === 'month' && value ? { days: '', from: '', to: '' } : {}), ...(key === 'from' || key === 'to' ? { days: '', month: '' } : {}) })
  const handleToday = () => {
    const today = getISTToday()
    const next = { ...filters, from: today, to: today, days: '', month: '' }
    onFiltersChange(next)
    onApplyFilters(next)
  }
  const handleCustomApply = () => {
    if (filters.from && filters.to && filters.from > filters.to) {
      toast.error('From date cannot be after To date')
      return
    }
    onApplyFilters(filters)
  }
  const handleClear = () => {
    const cleared = { search: '', status: '', paymentStatus: '', days: '', month: '', from: '', to: '' }
    onFiltersChange(cleared)
    onApplyFilters(cleared)
  }

  return <Panel title="Orders" icon={ShoppingBag}>
    {/* Summary cards */}
    {summary && (
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink-muted"><BarChart3 size={16} className="text-primary"/>Revenue</div>
          <p className="mt-2 text-2xl font-black text-ink">{formatPrice(summary.revenue || 0)}</p>
          <p className="mt-1 text-xs text-ink-muted">Paid & confirmed orders in period</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink-muted"><ShoppingBag size={16} className="text-primary"/>Orders</div>
          <p className="mt-2 text-2xl font-black text-ink">{Number(summary.orders || 0)}</p>
          <p className="mt-1 text-xs text-ink-muted">Total orders in period</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink-muted"><Truck size={16} className="text-primary"/>Dispatched</div>
          <p className="mt-2 text-2xl font-black text-ink">{Number(summary.dispatched || 0)}</p>
          <p className="mt-1 text-xs text-ink-muted">Shipped orders in period</p>
        </div>
      </div>
    )}

    {/* Date filtering */}
    <div className="mb-5 space-y-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">Quick filter</span>
        <button onClick={handleToday} className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-black transition ${filters.from && filters.to && filters.from===filters.to && filters.from===getISTToday() ? 'bg-primary text-white' : 'border border-line bg-white text-ink-mid hover:border-primary hover:text-primary'}`}>Today</button>
        {(filters.from || filters.to) && <span className="text-xs text-ink-muted">{filters.from || '—'} → {filters.to || '—'}</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">From</span>
          <input type="date" value={filters.from || ''} onChange={e => setFilter('from', e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">To</span>
          <input type="date" value={filters.to || ''} onChange={e => setFilter('to', e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-primary" />
        </label>
        <div className="flex items-end gap-2">
          <button onClick={handleCustomApply} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white hover:bg-primary-dark"><Search size={15}/>Apply</button>
          <button onClick={handleClear} className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-bold hover:border-primary hover:text-primary">Clear dates</button>
        </div>
      </div>
      <p className="text-xs text-ink-muted">Dates are interpreted in India time (IST). A single-day range includes the entire business day (00:00 → 23:59 IST).</p>
    </div>

    <div className="mb-5 space-y-3 rounded-lg border border-line bg-surface-alt p-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Search name or mobile</span>
          <div className="relative mt-1.5">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Customer name or phone" className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary" />
          </div>
        </label>
        <SelectField label="Order status" value={filters.status} onChange={v => setFilter('status', v)}>
          <option value="">All statuses</option>
          {ORDER_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Payment status" value={filters.paymentStatus} onChange={v => setFilter('paymentStatus', v)}>
          <option value="">All payments</option>
          {PAYMENT_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Date range" value={filters.days} onChange={v => setFilter('days', v)}>
          {DATE_PRESETS.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}
        </SelectField>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[180px]">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Month</span>
          <input type="month" value={filters.month} onChange={e => setFilter('month', e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-primary" />
        </label>
        <button onClick={() => onApplyFilters(filters)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white hover:bg-primary"><Search size={15}/>Apply filters</button>
        <button onClick={onExportCsv} className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black hover:border-primary hover:text-primary"><Download size={15}/>{selectedOrders.length ? `Export ${selectedOrders.length} selected` : 'Export CSV'}</button>
        <button onClick={handleClear} className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-bold hover:border-primary hover:text-primary">Clear all</button>
      </div>
    </div>

    {selectedOrders.length > 0 && (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <span className="text-sm font-black text-primary">{selectedOrders.length} selected</span>
        {ORDER_STATUS_OPTIONS.map(status => (
          <button key={status} onClick={() => onBulkUpdate({ status })} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold capitalize hover:border-primary hover:text-primary">{status}</button>
        ))}
      </div>
    )}

    {!orders.length ? <Empty /> : (
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[#f8f9fb] text-xs uppercase tracking-[0.12em] text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-black">
                <button onClick={() => onToggleAll(allIds)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white hover:border-primary hover:text-primary" aria-label="Select all orders">
                  {allSelected ? <CheckSquare size={16}/> : <span className="h-4 w-4 rounded border-2 border-line" />}
                </button>
              </th>
              {['Order', 'Customer', 'Phone', 'Items', 'Total', 'Payment', 'Status', 'Actions'].map(label => <th key={label} className="px-4 py-3 font-black">{label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {orders.map(row => {
              const selected = selectedOrders.includes(row.id)
              return (
                <tr key={row.id} className={selected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-alt/70'}>
                  <td className="px-4 py-3">
                    <button onClick={() => onToggleOrder(row.id)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${selected ? 'border-primary bg-primary text-white' : 'border-line bg-white hover:border-primary hover:text-primary'}`} aria-label={`Select order ${row.orderNumber}`}>
                      {selected ? <CheckSquare size={16}/> : <span className="h-4 w-4 rounded border-2 border-line" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpenOrder(row)} className="font-black text-primary hover:underline">{row.orderNumber}</button>
                    <p className="text-xs text-ink-muted">{row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '-'}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-mid">
                    <p>{row.customerName}</p>
                    <p className="text-xs text-ink-muted">{row.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-mid">{row.customerPhone || '-'}</td>
                  <td className="px-4 py-3 font-semibold text-ink-mid">{row.itemCount || 0}</td>
                  <td className="px-4 py-3 font-semibold text-ink-mid">{money(row.total)}</td>
                  <td className="px-4 py-3 font-semibold text-ink-mid">{row.paymentStatus}</td>
                  <td className="px-4 py-3 font-semibold text-ink-mid">{row.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <OrderActions row={row} reload={reload} />
                      <button
                        onClick={async () => {
                          try {
                            const full = await adminApi.order(row.id)
                            openWhatsAppForOrder(full)
                          } catch (e) {
                            toast.error(e.message || 'Could not load order for WhatsApp')
                          }
                        }}
                        title="Send WhatsApp"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition"
                        aria-label={`WhatsApp order ${row.orderNumber}`}
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete order ${row.orderNumber}? This will hide it from dashboard.`)) return
                          try {
                            await adminApi.deleteOrder(row.id)
                            toast.success('Order deleted')
                            reload()
                          } catch (e) {
                            toast.error(e.message || 'Delete failed')
                          }
                        }}
                        title="Delete order"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition"
                        aria-label={`Delete order ${row.orderNumber}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
}

function ReturnsAdminPanel({ requests, filters, onFiltersChange, onApply, onClear, onAction, onPreview }) {
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [remarks, setRemarks] = useState('')
  const loadDetail = async (row) => {
    try {
      const data = await adminApi.returnExchangeRequest(row.id)
      setDetail(data)
      setSelected(row)
      setRemarks('')
    } catch(e){ toast.error(e.message) }
  }
  const handleAction = async (action) => {
    if (!detail) return
    await onAction(action, detail, remarks)
    setDetail(null); setSelected(null)
  }
  return <Panel title="Returns & Exchanges" icon={RefreshCw}>
    <div className="mb-4 grid gap-3 md:grid-cols-4">
      <Field label="Search order/customer/product" value={filters.search} onChange={v=>onFiltersChange({...filters, search:v})} />
      <SelectField label="Type" value={filters.type} onChange={v=>onFiltersChange({...filters, type:v})}><option value="">All</option><option value="return">Return</option><option value="exchange">Exchange</option></SelectField>
      <SelectField label="Status" value={filters.status} onChange={v=>onFiltersChange({...filters, status:v})}><option value="">All</option><option value="requested">Requested</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="refunded">Refunded</option></SelectField>
      <div className="flex items-end gap-2"><button onClick={onApply} className="h-11 rounded-lg bg-ink px-4 text-sm font-black text-white">Apply</button><button onClick={onClear} className="h-11 rounded-lg border border-line px-4 text-sm font-bold">Clear</button></div>
    </div>
    {!requests.items?.length ? <Empty /> : (
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f8f9fb] text-xs uppercase tracking-[0.12em] text-ink-muted">
            <tr>{['Order','Customer','Product','Type','Reason','Status','Date','Actions'].map(h=> <th key={h} className="px-3 py-3 font-black">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {requests.items.map(row=> (
              <tr key={row.id} className="hover:bg-surface-alt/50">
                <td className="px-3 py-3 font-bold text-primary">{row.orderNumber}</td>
                <td className="px-3 py-3"><p className="font-semibold">{row.customerName}</p><p className="text-xs text-ink-muted">{row.customerEmail}</p></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    {row.image ? (
                      <img src={row.image} alt="" className="h-10 w-10 rounded-lg object-cover border border-line flex-shrink-0 bg-white" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-surface-alt border border-line/60 flex items-center justify-center text-[10px] text-ink-muted flex-shrink-0 font-bold">
                        IMG
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate max-w-[180px] text-ink">{row.productName}</p>
                      <p className="text-xs text-ink-muted">Size: {row.size || '-'} {row.color ? `· ${row.color}` : ''} {row.sku ? `· SKU: ${row.sku}` : ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 uppercase text-xs font-bold">{row.type}</td>
                <td className="px-3 py-3 text-xs">{row.reason_category}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.request_status==='approved'?'bg-green-100 text-green-700':row.request_status==='rejected'?'bg-red-100 text-red-700':row.request_status==='refunded'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{row.request_status}</span></td>
                <td className="px-3 py-3 text-xs">{row.created_at? new Date(row.created_at).toLocaleDateString('en-IN'): '-'}</td>
                <td className="px-3 py-3"><button onClick={()=>loadDetail(row)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:border-primary">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {detail && (
      <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-white p-6">
          <div className="flex justify-between items-start"><h3 className="font-display text-xl font-black">Request {detail.id.slice(0,8)}</h3><button onClick={()=>setDetail(null)} className="h-9 w-9 rounded-lg border border-line flex items-center justify-center"><X size={18}/></button></div>
          <div className="mt-4 grid gap-3 text-sm">
            <p><span className="font-bold">Order:</span> {detail.orderNumber || detail.orderHeader?.order_number || detail.order_id} ({detail.type}) — {detail.request_status}</p>
            <p><span className="font-bold">Customer:</span> {detail.customerName || detail.orderHeader?.customerName || detail.item?.fullName || '-'} / {detail.customerEmail || detail.orderHeader?.customerEmail || '-'}</p>
            {/* Structured Product Card */}
            <div className="rounded-xl border border-line bg-surface-alt/60 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-ink-muted mb-2.5">Product Information</p>
              <div className="flex gap-4 items-start">
                {(detail.image || detail.item?.image) ? (
                  <img 
                    src={detail.image || detail.item?.image} 
                    alt={detail.productName || 'Product'} 
                    className="h-20 w-20 rounded-xl object-cover border border-line bg-white flex-shrink-0 cursor-pointer hover:opacity-90"
                    onClick={() => onPreview ? onPreview({ type: 'image', url: detail.image || detail.item?.image, title: detail.productName }) : window.open(detail.image || detail.item?.image, '_blank')}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-xl border border-line bg-white flex items-center justify-center text-xs text-ink-muted flex-shrink-0">
                    No Image
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {(detail.brand || detail.item?.brand_name) && (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{detail.brand || detail.item?.brand_name}</p>
                      )}
                      <h4 className="font-bold text-base text-ink leading-tight">{detail.productName || detail.item?.product_name || detail.item?.name || 'Product'}</h4>
                    </div>
                    {(detail.unitPrice || detail.item?.unit_price) && (
                      <span className="font-bold text-sm text-ink bg-white px-2.5 py-1 rounded-lg border border-line flex-shrink-0">
                        {formatPrice(detail.unitPrice || detail.item?.unit_price)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg bg-white p-2 border border-line/60">
                      <span className="block text-[10px] uppercase font-bold text-ink-muted">Size</span>
                      <span className="font-semibold text-ink">{detail.size || detail.item?.size || '-'}</span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-line/60">
                      <span className="block text-[10px] uppercase font-bold text-ink-muted">Color</span>
                      <span className="font-semibold text-ink">{detail.request_item_color || detail.color || detail.item?.color || '-'}</span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-line/60">
                      <span className="block text-[10px] uppercase font-bold text-ink-muted">Height</span>
                      <span className="font-semibold text-ink">{detail.height || detail.item?.height || '-'}</span>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-line/60">
                      <span className="block text-[10px] uppercase font-bold text-ink-muted">Quantity</span>
                      <span className="font-semibold text-ink">{detail.quantity || detail.item?.quantity || 1}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-line/60 text-ink-muted">
                      SKU: <strong className="text-ink font-semibold">{detail.sku || detail.item?.sku || 'N/A'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p><span className="font-bold">Reason:</span> {detail.reason_category} {detail.reason_notes? `— ${detail.reason_notes}`:''}</p>
            <p><span className="font-bold">Evidence:</span> {parseEvidenceImages(detail.evidence_images).length ? parseEvidenceImages(detail.evidence_images).length+' images' : 'No images'} {detail.drive_link && <a href={detail.drive_link} target="_blank" className="text-primary underline">Drive Link</a>}</p>
            {parseEvidenceImages(detail.evidence_images).length > 0 && (
              <div className="flex flex-wrap gap-2">{parseEvidenceImages(detail.evidence_images).map((url,i)=> <img key={i} src={url} alt="" className="h-20 w-20 rounded-lg object-cover border cursor-pointer hover:opacity-80" onClick={()=>onPreview ? onPreview({ type:'image', url, title: 'Evidence' }) : window.open(url,'_blank')} /> )}</div>
            )}
            <p><span className="font-bold">Submitted:</span> {detail.created_at? new Date(detail.created_at).toLocaleString('en-IN'): '-'}</p>
            {detail.coupon && <p className="font-mono text-sm bg-green-50 border border-green-200 rounded-lg p-3">Coupon: {detail.coupon.code} — {formatPrice(detail.coupon.value)} — Expires {detail.coupon.expires_at? new Date(detail.coupon.expires_at).toLocaleDateString('en-IN'): '-'}</p>}
            <label className="block"><span className="text-xs font-black uppercase">Admin Remarks</span><textarea value={remarks} onChange={e=>setRemarks(e.target.value)} rows={3} placeholder="Optional remarks" className="mt-1 w-full rounded-xl border border-line bg-surface-alt p-3 text-sm"/></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.request_status==='requested' && <><button onClick={()=>handleAction('approve')} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white">Approve</button><button onClick={()=>handleAction('reject')} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white">Reject</button></>}
            {detail.request_status==='approved' && detail.type==='return' && <button onClick={()=>handleAction('refund')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Mark Refunded</button>}
            <button onClick={()=>setDetail(null)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold">Close</button>
          </div>
        </div>
      </div>
    )}
  </Panel>
}

function OrderDetailModal({ order, onClose, onUpdated }) {
  const address = order.shippingAddress || {}
  const addressLines = formatAddressLines(address)
  return <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Order details</p>
          <h3 className="font-display text-2xl font-black">{order.orderNumber}</h3>
          <p className="text-sm text-ink-muted">{order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : ''}</p>
        </div>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:border-primary hover:text-primary"><X size={18}/></button>
      </div>
      <div className="max-h-[75vh] overflow-auto p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard title="Customer" lines={[order.customerName, order.customerEmail, order.customerPhone]} />
          <InfoCard title="Shipping" lines={addressLines} emptyText="Shipping address not available" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoCard title="Payment" lines={[order.paymentMethod, order.paymentStatus]} />
          <InfoCard title="Status" lines={[order.status]} />
          <InfoCard title="Total" lines={[money(order.total)]} />
        </div>

        <p className="mt-6 mb-3 text-xs font-black uppercase tracking-[0.12em] text-ink-muted">Ordered items</p>
        <div className="overflow-hidden rounded-lg border border-line">
          {(order.products || []).map((item, index) => (
            <div key={index} className="flex gap-4 border-b border-line p-4 last:border-0">
              {item.image ? <img src={item.image} alt="" className="h-16 w-14 rounded-lg object-cover" /> : <div className="flex h-16 w-14 items-center justify-center rounded-lg bg-surface-alt text-xs font-bold text-ink-muted">No img</div>}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{item.brand}</p>
                <p className="font-bold text-ink">{item.name}</p>
                <p className="text-xs text-ink-muted">Color: {item.color || '-'} · Size: {item.size}{item.height ? ` · Height: ${item.height}` : ''} · Qty: {item.qty} {item.sku ? `· SKU: ${item.sku}` : ''}</p>
              </div>
              <p className="font-black">{money((item.unitPrice || 0) * (item.qty || 0))}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <InvoiceDownloadMenu order={order} />
          <button
            onClick={() => openWhatsAppForOrder(order)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-black text-white hover:bg-[#128C7E] transition"
          >
            <MessageCircle size={16}/> WhatsApp
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <SelectField label="Update status" value={order.status} onChange={async status => { await adminApi.updateOrder(order.id, { status }); toast.success('Order updated'); onUpdated() }}>
            {ORDER_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </SelectField>
          <SelectField label="Payment status" value={order.paymentStatus} onChange={async paymentStatus => { await adminApi.updateOrder(order.id, { paymentStatus }); toast.success('Payment status updated'); onUpdated() }}>
            {PAYMENT_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </SelectField>
        </div>
      </div>
    </div>
  </div>
}

function formatAddressLines(address = {}) {
  return [
    address.fullName || address.full_name,
    address.phone,
    [address.addressLine1 || address.address_line1, address.addressLine2 || address.address_line2].filter(Boolean).join(', '),
    [address.city, address.state, address.pincode].filter(Boolean).join(', ')
  ].filter(Boolean)
}

function InvoiceDownloadMenu({ order }) {
  return <details className="relative">
    <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white hover:bg-primary">
      <Download size={15}/> Download Invoice
    </summary>
    <div className="absolute left-0 top-12 z-10 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-xl">
      <button type="button" onClick={() => downloadInvoice(order, 'a4')} className="block w-full px-4 py-2.5 text-left text-sm font-bold text-ink-mid hover:bg-surface-alt hover:text-primary">A4 invoice</button>
      <button type="button" onClick={() => downloadInvoice(order, 'thermal')} className="block w-full px-4 py-2.5 text-left text-sm font-bold text-ink-mid hover:bg-surface-alt hover:text-primary">Thermal invoice</button>
    </div>
  </details>
}

function InfoCard({ title, lines = [], emptyText = 'Not available' }) {
  const visibleLines = lines.filter(Boolean)
  return <div className="rounded-lg border border-line bg-surface-alt p-4">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">{title}</p>
    {visibleLines.length
      ? visibleLines.map((line, index) => <p key={index} className="mt-1 text-sm font-semibold text-ink-mid">{line}</p>)
      : <p className="mt-1 text-sm font-semibold text-ink-muted">{emptyText}</p>}
  </div>
}

function LoadingOverlay({ message }) {
  return <div className="fixed inset-0 z-[940] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
    <div className="rounded-lg bg-white px-6 py-5 text-center shadow-2xl">
      <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-primary" />
      <p className="text-sm font-semibold text-ink-muted">{message}</p>
    </div>
  </div>
}

function OrderActions({ row, reload }) {
  return <select defaultValue={row.status} onChange={async e => { await adminApi.updateOrder(row.id, { status: e.target.value }); toast.success('Order updated'); await reload() }} className="h-9 rounded-lg border border-line bg-white px-2 text-xs font-bold">{ORDER_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}</select>
}

function UserActions({ row, reload }) {
  return <button onClick={async () => { await adminApi.updateUser(row.id, { isActive: !row.is_active, status: row.is_active ? 'blocked' : 'active' }); toast.success('User updated'); await reload() }} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold hover:border-primary hover:text-primary">{row.is_active ? 'Block' : 'Activate'}</button>
}

function Empty() {
  return <div className="flex flex-col items-center justify-center py-14 text-center"><Search size={30} className="mb-3 text-ink-faint" /><p className="font-bold text-ink-muted">No records found</p></div>
}

function AdminLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] px-5 text-ink"><div className="admin-loading-card w-full max-w-sm rounded-2xl border border-line bg-white p-7 text-center shadow-xl"><div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><span className="admin-loading-ring absolute inset-0 rounded-2xl border-2 border-primary/15 border-t-primary" /><LayoutDashboard size={22}/></div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Checking Access</p><h1 className="mt-2 font-display text-2xl font-black">Loading admin panel</h1><p className="mt-2 text-sm text-ink-muted">Please wait while your admin session is verified.</p><div className="mt-5 flex justify-center gap-1.5"><span className="auth-loader-dot h-2 w-2 rounded-full bg-primary" /><span className="auth-loader-dot h-2 w-2 rounded-full bg-primary" /><span className="auth-loader-dot h-2 w-2 rounded-full bg-primary" /></div></div></main>
}

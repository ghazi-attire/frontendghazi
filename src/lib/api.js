function apiBase() {
  // Production: must use explicit backend URL from environment
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL
  }
  // Development only: localhost fallback
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `${window.location.protocol}//localhost:4000`
  }
  // Production fallback: log error to help debugging
  if (typeof window !== 'undefined') {
    console.error('[API Config Error] NEXT_PUBLIC_API_BASE_URL environment variable is not set. Frontend URL:', window.location.origin)
  }
  return 'http://localhost:4000'
}

function apiUrl(path) {
  return `${apiBase()}${path}`
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('staffarc-auth'))
}

export async function api(path, options = {}) {
  const url = apiUrl(path)
  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })
    const payload = await res.json().catch(() => ({ success: false, message: 'Invalid API response' }))
    if (!res.ok || payload.success === false) {
      const errorMsg = payload.message || 'Request failed'
      if (res.status === 0 || res.type === 'opaque') {
        console.error('[Network Error] Failed to reach backend:', { url, error: errorMsg })
      }
      throw new Error(errorMsg)
    }
    return payload.data
  } catch (error) {
    if (typeof window !== 'undefined' && error.message.includes('fetch')) {
      console.error('[API Connection Error] Could not connect to backend at:', { url, error: error.message })
    }
    throw error
  }
}

export const catalogApi = {
  home: () => api('/api/catalog/home'),
  filters: (params = {}) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return
      search.set(key, Array.isArray(value) ? value.join(',') : value)
    })
    return api(`/api/catalog/filters?${search.toString()}`)
  },
  categories: () => api('/api/catalog/categories'),
  products: (params = {}) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return
      search.set(key, Array.isArray(value) ? value.join(',') : value)
    })
    return api(`/api/catalog/products?${search.toString()}`)
  },
  product: (id) => api(`/api/catalog/products/${id}`),
  promos: () => api('/api/catalog/promos'),
  theme: () => api('/api/catalog/theme'),
  stockNotify: (body) => api('/api/catalog/stock-notifications', { method: 'POST', body: JSON.stringify(body) })
  ,
  newsletter: (body) => api('/api/catalog/newsletter-subscriptions', { method: 'POST', body: JSON.stringify(body) }),
  shippingZones: () => api('/api/catalog/shipping-zones'),
  shippingZoneForState: (state, pincode = '', city = '') => {
    const params = new URLSearchParams()
    if (state) params.set('state', state)
    if (pincode) params.set('pincode', pincode)
    if (city) params.set('city', city)
    return api(`/api/catalog/shipping-zones/state?${params.toString()}`)
  },
  shippingZoneForLocation: ({ state = '', pincode = '', city = '' } = {}) => {
    const params = new URLSearchParams()
    if (state) params.set('state', state)
    if (pincode) params.set('pincode', pincode)
    if (city) params.set('city', city)
    return api(`/api/catalog/shipping-zones/state?${params.toString()}`)
  },
  heights: () => api('/api/catalog/heights'),
}

export const authApi = {
  checkEmail: (email) => api(`/api/auth/check-email?email=${encodeURIComponent(email)}`),
  register: async (body) => {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('staffarc-auth'))
    }
    return data
  },
  login: async (body) => {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('staffarc-auth'))
    }
    return data
  },
  googleLogin: async (body) => {
    const data = await api('/api/auth/google', { method: 'POST', body: JSON.stringify(body) })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('staffarc-auth'))
    }
    return data
  },
  me: () => api('/api/auth/me'),
  forgotPassword: (body) => api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body) => api('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  changeAdminPassword: (body) => api('/api/auth/admin/change-password', { method: 'POST', body: JSON.stringify(body) }),
  logout: async () => {
    await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) })
    clearAuthSession()
  }
}

export function isAuthenticated() {
  return false
}

export const userApi = {
  updateMe: (body) => api('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  addresses: () => api('/api/users/me/addresses'),
  createAddress: (body) => api('/api/users/me/addresses', { method: 'POST', body: JSON.stringify(body) }),
  updateAddress: (id, body) => api(`/api/users/me/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAddress: (id) => api(`/api/users/me/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id) => api(`/api/users/me/addresses/${id}/default`, { method: 'POST' }),
  prefs: () => api('/api/users/me/preferences'),
  updatePrefs: (body) => api('/api/users/me/preferences', { method: 'PATCH', body: JSON.stringify(body) })
}

export const orderApi = {
  validatePromo: (body) => api('/api/cart/promos/validate', { method: 'POST', body: JSON.stringify(body) }),
  create: (body) => api('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  list: () => api('/api/orders'),
  get: (id) => api(`/api/orders/${id}`),
  cancel: (id) => api(`/api/orders/${id}/cancel`, { method: 'POST' }),
  getReturnExchangeSettings: () => api('/api/orders/return-exchange-settings'),
  getActiveItemRequest: (orderId, itemId) => api(`/api/orders/${orderId}/items/${itemId}/return-exchange-requests/active`),
}

export const paymentApi = {
  createOrder: (body) => api('/api/payments/orders', { method: 'POST', body: JSON.stringify(body) }),
  verify: (body) => api('/api/payments/verify', { method: 'POST', body: JSON.stringify(body) }),
  history: () => api('/api/payments/history')
}

export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export const adminApi = {
  login: (body) => api('/api/auth/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: async () => {
    try {
      await api('/api/auth/admin/logout', { method: 'POST', body: JSON.stringify({}) })
    } catch (_) {
    }
  },
  request: async (path, options = {}) => {
    const res = await fetch(apiUrl(path), {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })
    const payload = await res.json().catch(() => ({ success: false, message: 'Invalid API response' }))
    if (!res.ok || payload.success === false) {
      // Log auth errors for debugging
      if (res.status === 401) {
        console.warn('[Auth Debug]', {
          endpoint: path,
          status: res.status,
          message: payload.message,
          credentialsCookie: document.cookie.substring(0, 100)
        })
      }
      throw new Error(payload.message || 'Request failed')
    }
    return payload.data
  },
  me: () => adminApi.request('/api/auth/admin/me'),
  dashboard: () => adminApi.request('/api/admin/dashboard'),
  products: (params = {}) => adminApi.request(`/api/admin/products?${new URLSearchParams(params).toString()}`),
  product: (id) => adminApi.request(`/api/admin/products/${id}`),
  createProduct: (body) => adminApi.request('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => adminApi.request(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProduct: (id) => adminApi.request(`/api/admin/products/${id}`, { method: 'DELETE' }),
  categories: () => adminApi.request('/api/admin/categories'),
  createCategory: (body) => adminApi.request('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => adminApi.request(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  categoryDeleteImpact: (id) => adminApi.request(`/api/admin/categories/${id}/delete-impact`),
  deleteCategory: (id) => adminApi.request(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  colors: () => adminApi.request('/api/admin/colors'),
  createColor: (body) => adminApi.request('/api/admin/colors', { method: 'POST', body: JSON.stringify(body) }),
  updateColor: (id, body) => adminApi.request(`/api/admin/colors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteColor: (id) => adminApi.request('/api/admin/colors/${id}', { method: 'DELETE' }),
  sizes: () => adminApi.request('/api/admin/sizes'),
  createSize: (body) => adminApi.request('/api/admin/sizes', { method: 'POST', body: JSON.stringify(body) }),
  updateSize: (id, body) => adminApi.request(`/api/admin/sizes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSize: (id) => adminApi.request(`/api/admin/sizes/${id}`, { method: 'DELETE' }),
  heroBanners: () => adminApi.request('/api/admin/hero-banners'),
  createHeroBanner: (body) => adminApi.request('/api/admin/hero-banners', { method: 'POST', body: JSON.stringify(body) }),
  updateHeroBanner: (id, body) => adminApi.request(`/api/admin/hero-banners/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteHeroBanner: (id) => adminApi.request(`/api/admin/hero-banners/${id}`, { method: 'DELETE' }),
  users: (params = {}) => adminApi.request(`/api/admin/users?${new URLSearchParams(params).toString()}`),
  updateUser: (id, body) => adminApi.request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  orders: (params = {}) => adminApi.request(`/api/admin/orders?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString()}`),
  order: (id) => adminApi.request(`/api/admin/orders/${id}`),
  bulkUpdateOrders: (body) => adminApi.request('/api/admin/orders/bulk', { method: 'PATCH', body: JSON.stringify(body) }),
  exportOrdersCsv: async (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString()
    const res = await fetch(apiUrl(`/api/admin/orders/export/csv?${qs}`), { credentials: 'include' })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ message: 'Export failed' }))
      throw new Error(payload.message || 'Export failed')
    }
    return res.blob()
  },
  updateOrder: (id, body) => adminApi.request(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteOrder: (id) => adminApi.request(`/api/admin/orders/${id}`, { method: 'DELETE' }),
  subscriptions: (params = {}) => adminApi.request(`/api/admin/subscriptions?${new URLSearchParams(params).toString()}`),
  createSubscription: (body) => adminApi.request('/api/admin/subscriptions', { method: 'POST', body: JSON.stringify(body) }),
  updateSubscription: (id, body) => adminApi.request(`/api/admin/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSubscription: (id) => adminApi.request(`/api/admin/subscriptions/${id}`, { method: 'DELETE' }),
  coupons: (params = {}) => adminApi.request(`/api/admin/coupons?${new URLSearchParams(params).toString()}`),
  createCoupon: (body) => adminApi.request('/api/admin/coupons', { method: 'POST', body: JSON.stringify(body) }),
  updateCoupon: (id, body) => adminApi.request(`/api/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCoupon: (id) => adminApi.request(`/api/admin/coupons/${id}`, { method: 'DELETE' }),
  uploadMedia: async (file, kind = 'image') => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(apiUrl(`/api/uploads/${kind === 'video' ? 'videos' : 'images'}`), {
      method: 'POST',
      credentials: 'include',
      body: form
    })
    const payload = await res.json().catch(() => ({ success: false, message: 'Invalid API response' }))
    if (!res.ok || payload.success === false) throw new Error(payload.message || 'Upload failed')
    return payload.data
  },
  settings: () => adminApi.request('/api/admin/settings'),
  updateFooterMarquee: (message) => adminApi.request('/api/admin/settings/footer-marquee', { method: 'PUT', body: JSON.stringify({ message }) }),
  updateAnnouncementBar: (messages) => adminApi.request('/api/admin/settings/announcement-bar', { method: 'PUT', body: JSON.stringify({ messages }) }),
  updateBranding: (branding) => adminApi.request('/api/admin/settings/branding', { method: 'PUT', body: JSON.stringify(branding) }),
  updateTheme: (theme) => adminApi.request('/api/admin/settings/theme', { method: 'PUT', body: JSON.stringify(theme) }),
  updateShipping: (shipping) => adminApi.request('/api/admin/settings/shipping', { method: 'PUT', body: JSON.stringify(shipping) }),
  updateContent: (content) => adminApi.request('/api/admin/settings/content', { method: 'PUT', body: JSON.stringify(content) }),
  shippingZones: () => adminApi.request('/api/admin/shipping-zones'),
  createShippingZone: (body) => adminApi.request('/api/admin/shipping-zones', { method: 'POST', body: JSON.stringify(body) }),
  updateShippingZone: (id, body) => adminApi.request(`/api/admin/shipping-zones/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteShippingZone: (id) => adminApi.request(`/api/admin/shipping-zones/${id}`, { method: 'DELETE' }),
  heights: () => adminApi.request('/api/admin/heights'),
  createHeight: (body) => adminApi.request('/api/admin/heights', { method: 'POST', body: JSON.stringify(body) }),
  updateHeight: (id, body) => adminApi.request(`/api/admin/heights/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteHeight: (id) => adminApi.request(`/api/admin/heights/${id}`, { method: 'DELETE' }),
  updateProductAvailability: (id, isInStock) => adminApi.request(`/api/admin/products/${id}/availability`, { method: 'PATCH', body: JSON.stringify({ isInStock }) }),
  returnExchangeRequests: (params={}) => adminApi.request(`/api/admin/return-exchange-requests?${new URLSearchParams(params).toString()}`),
  returnExchangeRequest: (id) => adminApi.request(`/api/admin/return-exchange-requests/${id}`),
  approveReturnExchange: (id, body) => adminApi.request(`/api/admin/return-exchange-requests/${id}/approve`, { method: 'POST', body: JSON.stringify(body||{}) }),
  rejectReturnExchange: (id, body) => adminApi.request(`/api/admin/return-exchange-requests/${id}/reject`, { method: 'POST', body: JSON.stringify(body||{}) }),
  refundReturnExchange: (id, body) => adminApi.request(`/api/admin/return-exchange-requests/${id}/refund`, { method: 'POST', body: JSON.stringify(body||{}) }),
  getReturnSettings: () => adminApi.request('/api/admin/settings/return-exchange'),
  updateReturnSettings: (body) => adminApi.request('/api/admin/settings/return-exchange', { method: 'PUT', body: JSON.stringify(body) }),
}

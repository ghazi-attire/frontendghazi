'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react'
import { useStore } from '@/context/StoreContext'

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Shop Now', href: '/plp', icon: ShoppingBag },
  { label: 'Cart', href: '/cart', icon: ShoppingCart, isCart: true },
  { label: 'Profile', href: '/profile', icon: User },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { cartCount } = useStore()

  // Hide on checkout flow or admin to avoid covering forms/modals
  const hideOnRoutes = ['/checkout', '/admin', '/confirm']
  if (hideOnRoutes.some(p => pathname?.startsWith(p))) return null

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-[180] flex h-[64px] items-center justify-around border-t border-line bg-white shadow-[0_-2px_16px_rgba(0,0,0,0.06)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] font-semibold tracking-wide transition-colors ${
              isActive ? 'text-primary' : 'text-ink-muted hover:text-primary'
            }`}
          >
            <span className={`relative flex h-6 w-6 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-primary' : 'text-ink-muted'} />
              {item.isCart && cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            <span className={`leading-none ${isActive ? 'text-primary' : 'text-ink-faint'}`}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

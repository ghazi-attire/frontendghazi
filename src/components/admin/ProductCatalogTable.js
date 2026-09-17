'use client'
import { useState, useEffect, useRef } from 'react'
import { formatPrice } from '@/lib/utils'

const DEFAULT_PRODUCT_COL_WIDTHS = {
  name: 340,
  sku: 160,
  brand: 130,
  category: 130,
  sellPrice: 110,
  stock: 100,
  actions: 260,
}

const MIN_PRODUCT_COL_WIDTHS = {
  name: 240,
  sku: 120,
  brand: 90,
  category: 90,
  sellPrice: 85,
  stock: 80,
  actions: 220,
}

export default function ProductCatalogTable({ rows, actions }) {
  const [widths, setWidths] = useState(DEFAULT_PRODUCT_COL_WIDTHS)
  const [resizingCol, setResizingCol] = useState(null)
  const resizeRef = useRef({ col: null, startX: 0, startWidth: 0 })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ghazi_admin_product_columns')
      if (saved) {
        const parsed = JSON.parse(saved)
        setWidths(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  const startResize = (col, e) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      col,
      startX: e.clientX,
      startWidth: widths[col] || DEFAULT_PRODUCT_COL_WIDTHS[col] || 120,
    }
    setResizingCol(col)

    const onMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - resizeRef.current.startX
      const min = MIN_PRODUCT_COL_WIDTHS[resizeRef.current.col] || 80
      const newWidth = Math.max(min, resizeRef.current.startWidth + diff)
      setWidths(prev => ({ ...prev, [resizeRef.current.col]: newWidth }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setResizingCol(null)
      setWidths(current => {
        try {
          localStorage.setItem('ghazi_admin_product_columns', JSON.stringify(current))
        } catch {}
        return current
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const resetWidths = () => {
    setWidths(DEFAULT_PRODUCT_COL_WIDTHS)
    try {
      localStorage.removeItem('ghazi_admin_product_columns')
    } catch {}
  }

  if (!rows?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-line rounded-xl bg-white">
        <p className="font-bold text-ink">No products found</p>
        <p className="text-xs text-ink-muted mt-1">Add your first product using the Add Product button above.</p>
      </div>
    )
  }

  const totalTableWidth = Object.values(widths).reduce((a, b) => a + b, 0)

  const columns = [
    { id: 'name', label: 'Product Name' },
    { id: 'sku', label: 'SKU' },
    { id: 'brand', label: 'Brand' },
    { id: 'category', label: 'Category' },
    { id: 'sellPrice', label: 'Sell Price' },
    { id: 'stock', label: 'Stock' },
    { id: 'actions', label: 'Actions' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
          Drag column borders to resize
        </span>
        <button
          type="button"
          onClick={resetWidths}
          className="text-[11px] font-semibold text-primary hover:underline transition"
          title="Reset column widths to default"
        >
          Reset column widths
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-xs">
        <table className="table-fixed text-left text-sm" style={{ width: totalTableWidth, minWidth: '100%' }}>
          <thead className="bg-[#f8f9fb] text-xs uppercase tracking-[0.12em] text-ink-muted select-none">
            <tr>
              {columns.map(col => (
                <th
                  key={col.id}
                  style={{ width: widths[col.id], minWidth: MIN_PRODUCT_COL_WIDTHS[col.id] }}
                  className={`relative px-3.5 py-3 font-black text-[11px] border-r border-line/40 last:border-r-0 ${resizingCol === col.id ? 'bg-primary/10 text-primary' : ''}`}
                >
                  <span className="truncate block pr-2">{col.label}</span>
                  <div
                    onMouseDown={(e) => startResize(col.id, e)}
                    className="absolute right-0 top-0 bottom-0 w-3 -mr-1.5 cursor-col-resize z-10 flex items-center justify-center hover:bg-primary/20 transition group"
                    title="Drag to resize column"
                  >
                    <div className="w-[2px] h-4 bg-line group-hover:bg-primary transition" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {rows.map(row => {
              const thumb = row.image || row.imageUrl || (Array.isArray(row.images) ? row.images[0] : null) || (typeof row.images === 'string' ? row.images : null)
              return (
              <tr key={row.id} className="hover:bg-surface-alt/70 transition-colors">
                {/* Name */}
                <td style={{ width: widths.name }} className="px-3.5 py-2.5 text-xs font-semibold text-ink border-r border-line/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-9 w-9 rounded-lg object-cover border border-line/60 flex-shrink-0 bg-white" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-surface-alt border border-line/60 flex items-center justify-center text-[10px] text-ink-faint flex-shrink-0 font-bold">
                        IMG
                      </div>
                    )}
                    <span className="font-bold text-ink truncate block" title={row.name}>{row.name}</span>
                  </div>
                </td>
                {/* SKU */}
                <td style={{ width: widths.sku }} className="px-3.5 py-2.5 text-xs font-mono text-ink-muted border-r border-line/30 truncate" title={row.sku || ''}>
                  {row.sku ? <span className="bg-surface-alt px-1.5 py-0.5 rounded border border-line/50 font-bold text-ink">{row.sku}</span> : '-'}
                </td>
                {/* Brand */}
                <td style={{ width: widths.brand }} className="px-3.5 py-2.5 text-xs font-medium text-ink-mid border-r border-line/30 truncate" title={row.brand || ''}>
                  {row.brand || '-'}
                </td>
                {/* Category */}
                <td style={{ width: widths.category }} className="px-3.5 py-2.5 text-xs font-medium text-ink-mid border-r border-line/30 truncate" title={row.category || ''}>
                  {row.category || '-'}
                </td>
                {/* Sell Price */}
                <td style={{ width: widths.sellPrice }} className="px-3.5 py-2.5 text-xs font-bold text-ink border-r border-line/30 truncate">
                  {formatPrice(row.sellPrice)}
                </td>
                {/* Stock */}
                <td style={{ width: widths.stock }} className="px-3.5 py-2.5 text-xs font-bold text-ink border-r border-line/30 truncate">
                  <span className={Number(row.stock || 0) > 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold'}>
                    {row.stock ?? 0}
                  </span>
                </td>
                {/* Actions */}
                <td style={{ width: widths.actions }} className="px-3.5 py-2.5 text-xs">
                  {actions(row)}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import Image from 'next/image'

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="%23f3f4f6"><rect width="400" height="400" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af">No Image</text></svg>'

export default function SafeImage({ src, alt = '', fallbackSrc = FALLBACK_IMAGE, ...props }) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc)
  const [hasError, setHasError] = useState(false)

  const validSrc = (!src || typeof src !== 'string' || !src.trim()) ? fallbackSrc : (hasError ? fallbackSrc : imgSrc)

  return (
    <Image
      {...props}
      src={validSrc}
      alt={alt || ''}
      onError={() => {
        setHasError(true)
        setImgSrc(fallbackSrc)
      }}
    />
  )
}

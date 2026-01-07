import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SafeAvatarProps {
  src?: string | null
  alt: string
  fallback: string // e.g. "JM"
  className?: string
}

export function SafeAvatar({ src, alt, fallback, className }: SafeAvatarProps) {
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [src])

  // If no src or error, show Fallback (Initials)
  if (!src || error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-cyan-500/20 text-cyan-500 font-bold rounded-full overflow-hidden',
          className,
        )}
      >
        {(fallback || 'U').slice(0, 2).toUpperCase()}
      </div>
    )
  }

  // Show Image
  return (
    <img
      src={src}
      alt={alt}
      className={cn('object-cover w-full h-full rounded-full', className)}
      onError={() => setError(true)} // 👈 Logic: Switch to fallback on error
    />
  )
}


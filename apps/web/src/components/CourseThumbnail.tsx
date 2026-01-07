import { useState } from 'react'
import { BookOpen } from 'lucide-react'

interface CourseThumbnailProps {
  src: string | null | undefined
  alt?: string
  className?: string
}

export function CourseThumbnail({ src, alt = 'Course thumbnail', className = '' }: CourseThumbnailProps) {
  const [imageError, setImageError] = useState(false)

  // If no src or error occurred, show placeholder
  if (!src || imageError) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center ${className}`}
      >
        <BookOpen className="w-12 h-12 text-cyan-500/50" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  )
}


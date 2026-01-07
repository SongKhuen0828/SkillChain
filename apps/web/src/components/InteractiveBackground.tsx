import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export function InteractiveBackground() {
  const [isHovering, setIsHovering] = useState(false)

  // Smooth spring animations for mouse position
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring configuration for smooth following
  const springConfig = { damping: 50, stiffness: 100 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      setIsHovering(true)
    }

    const handleMouseLeave = () => {
      setIsHovering(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [mouseX, mouseY])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base Grid Pattern */}
      <div className="absolute inset-0 opacity-40 dark:opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
              className="stroke-border"
            >
              <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Spotlight Layer */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: smoothX,
          top: smoothY,
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          opacity: isHovering ? 1 : 0,
          scale: isHovering ? 1 : 0.8,
        }}
        transition={{
          opacity: { duration: 0.3 },
          scale: { duration: 0.3 },
        }}
      >
        <div
          className="w-[600px] h-[600px] rounded-full blur-3xl opacity-60"
          style={{
            background: `radial-gradient(circle, 
              rgba(59, 130, 246, 0.6) 0%,
              rgba(147, 51, 234, 0.5) 30%,
              rgba(236, 72, 153, 0.4) 60%,
              transparent 100%
            )`,
          }}
        />
      </motion.div>

      {/* Additional subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10" />
    </div>
  )
}


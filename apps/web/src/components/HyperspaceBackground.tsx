import { useEffect, useRef } from 'react'
import { useTheme } from './theme-provider'

interface Star {
  x: number
  y: number
  z: number
}

interface HyperspaceBackgroundProps {
  starCount?: number
  speed?: number
  depth?: number
  parallaxStrength?: number
}

export function HyperspaceBackground({
  starCount = 400,
  speed = 0.5,
  depth = 2000,
  parallaxStrength = 0.3,
}: HyperspaceBackgroundProps = {}) {
  const { resolvedTheme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const mouseRef = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isDark = resolvedTheme === 'dark'

    // Theme-aware colors
    const starColors = isDark
      ? ['rgba(6, 182, 212, 1)', 'rgba(59, 130, 246, 1)', 'rgba(255, 255, 255, 1)'] // Cyan, Blue, White for dark mode
      : ['rgba(71, 85, 105, 1)', 'rgba(51, 65, 85, 1)', 'rgba(30, 41, 59, 1)'] // Dark slate/blue for light mode

    // Initialize canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    // Initialize stars
    const initStars = (): Star[] => {
      const stars: Star[] = []
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: (Math.random() - 0.5) * canvas.width * 2, // Random x position
          y: (Math.random() - 0.5) * canvas.height * 2, // Random y position
          z: Math.random() * depth, // Random z position (depth)
        })
      }
      return stars
    }

    starsRef.current = initStars()

    // Mouse event handlers
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', resizeCanvas)

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const stars = starsRef.current
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Calculate parallax offset based on mouse position
      const mouseNormalizedX = (mouseRef.current.x - centerX) / centerX // -1 to 1
      const mouseNormalizedY = (mouseRef.current.y - centerY) / centerY // -1 to 1
      const parallaxX = -mouseNormalizedX * parallaxStrength * canvas.width * 0.1
      const parallaxY = -mouseNormalizedY * parallaxStrength * canvas.height * 0.1

      // Update and draw stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]

        // Move star forward (decrease z)
        star.z -= speed

        // Reset star to back if it passes the camera
        if (star.z <= 0) {
          star.z = depth
          star.x = (Math.random() - 0.5) * canvas.width * 2
          star.y = (Math.random() - 0.5) * canvas.height * 2
        }

        // 3D Projection: Convert 3D coordinates to 2D screen coordinates
        // Formula: screenX = (x / z) * center + center
        const scale = 1 / star.z
        const screenX = (star.x * scale) * centerX + centerX + parallaxX
        const screenY = (star.y * scale) * centerY + centerY + parallaxY

        // Skip if star is off-screen
        if (
          screenX < -50 ||
          screenX > canvas.width + 50 ||
          screenY < -50 ||
          screenY > canvas.height + 50
        ) {
          continue
        }

        // Size scales with distance (closer = larger)
        // Use centerX for consistent scaling regardless of screen size
        const sizeScale = centerX / star.z
        const radius = Math.max(0.5, sizeScale * 2)

        // Brightness/intensity based on distance (closer = brighter)
        const brightness = Math.min(1, 1 - star.z / depth)

        // Choose color based on brightness/randomness
        const colorIndex = Math.floor(Math.random() * starColors.length)
        const baseColor = starColors[colorIndex]

        // Draw star
        ctx.beginPath()
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
        
        // Extract RGB values from color string for alpha manipulation
        const rgbaMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1])
          const g = parseInt(rgbaMatch[2])
          const b = parseInt(rgbaMatch[3])
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`
        } else {
          ctx.fillStyle = baseColor
        }
        
        ctx.fill()

        // Add subtle glow effect for closer stars
        if (brightness > 0.5) {
          ctx.shadowBlur = radius * 2
          ctx.shadowColor = baseColor
          ctx.beginPath()
          ctx.arc(screenX, screenY, radius * 0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [starCount, speed, depth, parallaxStrength, resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  )
}


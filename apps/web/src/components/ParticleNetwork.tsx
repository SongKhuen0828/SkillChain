import { useEffect, useRef } from 'react'
import { useTheme } from './theme-provider'

interface DataPacket {
  x: number
  y: number
  direction: 'horizontal' | 'vertical'
  progress: number // 0 to 1
  speed: number
  targetX: number
  targetY: number
  startX: number
  startY: number
  length: number
}

interface ParticleNetworkProps {
  gridSpacing?: number
  packetSpeed?: number
  packetSpawnRate?: number
  mouseInfluenceRadius?: number
}

export function ParticleNetwork({
  gridSpacing = 60,
  packetSpeed = 0.02,
  packetSpawnRate = 0.3, // Probability per frame
  mouseInfluenceRadius = 150,
}: ParticleNetworkProps = {}) {
  const { resolvedTheme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const packetsRef = useRef<DataPacket[]>([])
  const animationFrameRef = useRef<number>()
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isDark = resolvedTheme === 'dark'

    // Theme-aware colors
    const gridLineColor = isDark
      ? 'rgba(59, 130, 246, 0.1)' // Faint blue/purple for dark mode
      : 'rgba(0, 0, 0, 0.05)' // Very faint gray for light mode
    const packetColor = isDark
      ? 'rgba(6, 182, 212, ' // neon-cyan for dark mode
      : 'rgba(6, 182, 212, ' // cyan-500 for light mode (same color, different opacity)
    const packetBaseOpacity = isDark ? 0.6 : 0.3 // Lower opacity in light mode
    const packetGlowOpacity = isDark ? 0.8 : 0.5 // Maximum glow opacity

    // Initialize canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    // Calculate grid dimensions
    const getGridDimensions = () => {
      const cols = Math.ceil(canvas.width / gridSpacing)
      const rows = Math.ceil(canvas.height / gridSpacing)
      return { cols, rows }
    }

    // Get grid intersection points
    const getGridPoints = () => {
      const { cols, rows } = getGridDimensions()
      const points: { x: number; y: number }[] = []
      for (let col = 0; col <= cols; col++) {
        for (let row = 0; row <= rows; row++) {
          points.push({
            x: col * gridSpacing,
            y: row * gridSpacing,
          })
        }
      }
      return points
    }

    // Spawn a new data packet
    const spawnPacket = (): DataPacket | null => {
      const points = getGridPoints()
      if (points.length < 2) return null

      const startPoint = points[Math.floor(Math.random() * points.length)]
      const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical'

      let endPoint: { x: number; y: number } | null = null
      if (direction === 'horizontal') {
        // Find a point on the same row (same Y)
        const sameRowPoints = points.filter((p) => Math.abs(p.y - startPoint.y) < 1)
        if (sameRowPoints.length > 1) {
          const otherPoints = sameRowPoints.filter((p) => p.x !== startPoint.x)
          endPoint = otherPoints[Math.floor(Math.random() * otherPoints.length)]
        }
      } else {
        // Find a point on the same column (same X)
        const sameColPoints = points.filter((p) => Math.abs(p.x - startPoint.x) < 1)
        if (sameColPoints.length > 1) {
          const otherPoints = sameColPoints.filter((p) => p.y !== startPoint.y)
          endPoint = otherPoints[Math.floor(Math.random() * otherPoints.length)]
        }
      }

      if (!endPoint) return null

      const distance = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
      )

      return {
        x: startPoint.x,
        y: startPoint.y,
        direction,
        progress: 0,
        speed: packetSpeed + Math.random() * packetSpeed * 0.5, // Slight speed variation
        targetX: endPoint.x,
        targetY: endPoint.y,
        startX: startPoint.x,
        startY: startPoint.y,
        length: Math.min(distance * 0.2, 30), // Packet length relative to distance
      }
    }

    // Mouse event handlers
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      mouseRef.current.active = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', resizeCanvas)

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const packets = packetsRef.current
      const mouse = mouseRef.current

      // Draw static grid
      ctx.strokeStyle = gridLineColor
      ctx.lineWidth = 1

      const { cols, rows } = getGridDimensions()

      // Draw vertical lines
      for (let col = 0; col <= cols; col++) {
        const x = col * gridSpacing
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      // Draw horizontal lines
      for (let row = 0; row <= rows; row++) {
        const y = row * gridSpacing
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Spawn new packets randomly
      if (Math.random() < packetSpawnRate) {
        const newPacket = spawnPacket()
        if (newPacket) {
          packets.push(newPacket)
        }
      }

      // Update and draw packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const packet = packets[i]

        // Calculate mouse influence
        let mouseInfluence = 0
        let speedMultiplier = 1
        if (mouse.active) {
          const dx = mouse.x - packet.x
          const dy = mouse.y - packet.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < mouseInfluenceRadius) {
            mouseInfluence = 1 - distance / mouseInfluenceRadius
            speedMultiplier = 1 + mouseInfluence * 0.5 // Speed up by up to 50%
          }
        }

        // Update packet progress
        packet.progress += packet.speed * speedMultiplier

        // Calculate current position
        const currentX = packet.startX + (packet.targetX - packet.startX) * packet.progress
        const currentY = packet.startY + (packet.targetY - packet.startY) * packet.progress

        // Draw packet as a glowing line segment
        if (packet.direction === 'horizontal') {
          const lineLength = packet.length
          const startX = currentX - lineLength / 2
          const endX = currentX + lineLength / 2

          // Calculate opacity based on mouse influence
          const baseOpacity = packetBaseOpacity
          const glowOpacity = baseOpacity + mouseInfluence * (packetGlowOpacity - baseOpacity)

          // Draw glow (wider, more transparent)
          ctx.beginPath()
          ctx.moveTo(startX, currentY)
          ctx.lineTo(endX, currentY)
          ctx.strokeStyle = `${packetColor}${glowOpacity * 0.5})`
          ctx.lineWidth = 4
          ctx.stroke()

          // Draw main packet line
          ctx.beginPath()
          ctx.moveTo(startX, currentY)
          ctx.lineTo(endX, currentY)
          ctx.strokeStyle = `${packetColor}${glowOpacity})`
          ctx.lineWidth = 2
          ctx.stroke()

          // Draw bright center point
          ctx.beginPath()
          ctx.arc(currentX, currentY, 2, 0, Math.PI * 2)
          ctx.fillStyle = `${packetColor}${glowOpacity})`
          ctx.fill()
        } else {
          // Vertical packet
          const lineLength = packet.length
          const startY = currentY - lineLength / 2
          const endY = currentY + lineLength / 2

          // Calculate opacity based on mouse influence
          const baseOpacity = packetBaseOpacity
          const glowOpacity = baseOpacity + mouseInfluence * (packetGlowOpacity - baseOpacity)

          // Draw glow (wider, more transparent)
          ctx.beginPath()
          ctx.moveTo(currentX, startY)
          ctx.lineTo(currentX, endY)
          ctx.strokeStyle = `${packetColor}${glowOpacity * 0.5})`
          ctx.lineWidth = 4
          ctx.stroke()

          // Draw main packet line
          ctx.beginPath()
          ctx.moveTo(currentX, startY)
          ctx.lineTo(currentX, endY)
          ctx.strokeStyle = `${packetColor}${glowOpacity})`
          ctx.lineWidth = 2
          ctx.stroke()

          // Draw bright center point
          ctx.beginPath()
          ctx.arc(currentX, currentY, 2, 0, Math.PI * 2)
          ctx.fillStyle = `${packetColor}${glowOpacity})`
          ctx.fill()
        }

        // Remove completed packets
        if (packet.progress >= 1) {
          packets.splice(i, 1)
        } else {
          // Update packet position for next frame
          packet.x = currentX
          packet.y = currentY
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [gridSpacing, packetSpeed, packetSpawnRate, mouseInfluenceRadius, resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  )
}